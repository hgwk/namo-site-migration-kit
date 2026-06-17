import React, { useState, useRef, useEffect } from 'react';

/**
 * NextPOD chat widget — uses two tool-scripts:
 *   nextpodSendMessage, awaitWebhookEvent.
 *
 * The full conversation (channelId, threadId, message list, senderName) is
 * persisted in localStorage so the chat resumes across reloads. The live
 * loop calls awaitWebhookEvent repeatedly to surface unsolicited replies
 * in real time.
 */
const STORAGE_KEY = 'nextpod-chat-state-v1';
const NAME_STORAGE_KEY = 'nextpod-chat-name-v1';

function loadPersistedState() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && typeof s === 'object'
        && typeof s.channelId === 'string'
        && typeof s.threadId === 'string'
        && Array.isArray(s.messages))
      return s;
  } catch { /* ignore corrupt storage */ }
  return null;
}

function savePersistedState(channelId, threadId, messages) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!channelId || !threadId) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ channelId, threadId, messages }));
  } catch { /* quota / private mode — non-fatal */ }
}

// senderName resolution priority on first render:
//   1. localStorage override (user explicitly typed a name previously)
//   2. logged-in user's displayName (API.user, populated server-side from session)
//   3. empty — caller-supplied or omitted
function loadInitialSenderName() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(NAME_STORAGE_KEY);
      if (stored != null) return stored;
    }
  } catch { /* ignore */ }
  return (typeof API !== 'undefined' && API.user?.displayName) || '';
}

function saveSenderName(name) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (name) localStorage.setItem(NAME_STORAGE_KEY, name);
    else localStorage.removeItem(NAME_STORAGE_KEY);
  } catch { /* ignore */ }
}

// NextPOD's webhook payload shape:
//   { threadId, event, timestamp,
//     originalMessage: { id, text },
//     reply: { from: { name, photoUrl, id }, files: [], text } }
// Fall back to a few common alternates for robustness.
function extractReply(payload) {
  if (typeof payload === 'string') return { text: payload };
  if (!payload || typeof payload !== 'object') return { text: String(payload) };
  if (payload.reply && typeof payload.reply === 'object') {
    return {
      text: payload.reply.text || '',
      fromName: payload.reply.from?.name,
      fromPhoto: payload.reply.from?.photoUrl,
    };
  }
  return { text: payload.message || payload.text || JSON.stringify(payload) };
}

export default function NextpodChat() {
  const persisted = loadPersistedState();
  const [messages, setMessages] = useState(persisted?.messages || []);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState(persisted?.threadId || null);
  const [channelId, setChannelId] = useState(persisted?.channelId || null);
  const [senderName, setSenderName] = useState(loadInitialSenderName());
  const [listening, setListening] = useState(false);
  const listEndRef = useRef(null);
  const cancelLoopRef = useRef({ cancelled: false });
  // Track the latest receivedAt seen so the live loop can de-dupe events
  // already represented in `messages` (e.g. on remount with persisted state).
  const lastReplyAtRef = useRef(
    (persisted?.messages || [])
      .filter(m => m.from === 'bot' && m.receivedAt)
      .map(m => m.receivedAt)
      .sort()
      .pop() || null
  );

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist conversation (ids + full message list) on every change.
  useEffect(() => {
    savePersistedState(channelId, threadId, messages);
  }, [channelId, threadId, messages]);

  const append = (msg) => setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);

  // Background long-poll loop. Re-runs whenever channelId changes; the
  // cancellation token ensures the previous loop exits before a new one
  // starts so we don't have two waits competing on the same channel.
  useEffect(() => {
    if (!channelId) return;
    const token = { cancelled: false };
    cancelLoopRef.current = token;
    setListening(true);

    (async () => {
      while (!token.cancelled) {
        try {
          const res = await API.ToolCall('awaitWebhookEvent', {
            channelId,
            timeoutSeconds: 60, // browsers and proxies are happier with shorter holds
            // Cursor: pick up strictly after the last event we saw. Without
            // this, an event arriving between resolve and next-call would be
            // skipped (the helper would default to a fresh `now()` watermark).
            fromDate: lastReplyAtRef.current || undefined,
          });
          if (token.cancelled) return;

          const data = res?.result || res;
          if (data?.received) {
            const r = extractReply(data.payload);
            append({ from: 'bot', text: r.text, fromName: r.fromName, fromPhoto: r.fromPhoto, receivedAt: data.receivedAt });
            lastReplyAtRef.current = data.receivedAt;
          } else if (data?.reason === 'error') {
            append({ from: 'system', text: `Listener error: ${data.error || 'unknown'} — retrying in 5s`, error: true });
            await new Promise(r => setTimeout(r, 5000));
          }
          // reason === 'timeout' just means "no event in this window" — loop again immediately.
        } catch (err) {
          if (token.cancelled) return;
          append({ from: 'system', text: `Listen error: ${err.message} — retrying in 5s`, error: true });
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    })().finally(() => {
      if (cancelLoopRef.current === token) setListening(false);
    });

    return () => { token.cancelled = true; };
  }, [channelId]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');
    append({ from: 'user', text });

    try {
      const res = await API.ToolCall('nextpodSendMessage', {
        message: text,
        senderName: senderName.trim() || undefined,
        threadId: threadId || undefined,
        channelId: channelId || undefined,
      });
      const data = res?.result || res;

      if (data?.error) {
        append({ from: 'system', text: `Error: ${data.error}`, error: true });
        return;
      }

      // Persist conversation identifiers so follow-ups stay in the same thread.
      if (data.threadId) setThreadId(data.threadId);
      if (data.channelId) setChannelId(data.channelId);
    } catch (err) {
      append({ from: 'system', text: `Network error: ${err.message}`, error: true });
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setThreadId(null);
    setChannelId(null);
    lastReplyAtRef.current = null;
    savePersistedState(null, null, []);
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 max-w-2xl mx-auto flex flex-col h-[600px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h2 className="font-semibold text-gray-800">NextPOD Chat</h2>
          <p className="text-xs text-gray-500">
            {threadId ? `Thread: ${threadId.slice(0, 12)}…` : 'No active thread'}
            {listening && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                listening
              </span>
            )}
          </p>
        </div>
        <button
          onClick={reset}
          disabled={sending || messages.length === 0}
          className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Type a message to start a NextPOD thread.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`nextpod-msg-${m.from}`}
          >
            {m.from === 'bot' && m.fromPhoto && (
              <img
                src={m.fromPhoto}
                alt={m.fromName || ''}
                className="w-7 h-7 rounded-full flex-shrink-0 mt-1"
                referrerPolicy="no-referrer"
              />
            )}
            <div className={`max-w-[75%] ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
              {m.from === 'bot' && m.fromName && (
                <div className="text-xs text-gray-500 mb-0.5 px-1">{m.fromName}</div>
              )}
              <div
                className={`inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  m.from === 'user'
                    ? 'bg-blue-500 text-white'
                    : m.from === 'bot'
                      ? 'bg-white border border-gray-200 text-gray-800'
                      : m.error
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-gray-100 text-gray-600 italic text-xs'
                }`}
              >
                {m.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      <div className="flex flex-col gap-2 p-3 border-t border-gray-200">
        <input
          type="text"
          value={senderName}
          onChange={(e) => { setSenderName(e.target.value); saveSenderName(e.target.value); }}
          placeholder="Your name (optional — shown as the sender in NextPOD)"
          data-testid="nextpod-sender-name"
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={sending}
            placeholder={sending ? 'Sending…' : 'Type a message and press Enter'}
            data-testid="nextpod-input"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            data-testid="nextpod-send"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

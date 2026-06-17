import React, { useState } from 'react';

export default function UserDataTester() {
  const [idVal, setIdVal] = useState('profile');
  const [jsonVal, setJsonVal] = useState(JSON.stringify({
    displayName: '김철수',
    memberSince: '2024-03-15',
    tier: 'gold',
    points: 1250,
    isActive: true,
    interests: ['hiking', 'photography', 'coffee'],
    emergencyContact: { name: '홍길동', phone: '010-1234-5678' },
    notes: null,
  }, null, 2));
  const [lastMethod, setLastMethod] = useState(null);
  const [result, setResult] = useState(undefined);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState({});
  const [file, setFile] = useState(null);
  const user = API.user;

  const run = async (method, optionsOrFn) => {
    setLoading(prev => ({ ...prev, [method]: true }));
    setLastMethod(method);
    setError(null);
    setResult(undefined);
    try {
      const options = typeof optionsOrFn === 'function' ? await optionsOrFn() : optionsOrFn;
      const res = await API.Site_UserData(method, options);
      setResult(res);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(prev => ({ ...prev, [method]: false }));
    }
  };

  const readFileAsDataUri = () => new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Choose a file first'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const methods = [
    {
      name: 'write',
      label: 'Write',
      run: () => run('write', async () => {
        const payload = { id: idVal, json: jsonVal };
        if (file)
          payload.attachment = { data: await readFileAsDataUri(), name: file.name };
        return payload;
      }),
    },
    { name: 'read',   label: 'Read',   run: () => run('read',   { id: idVal }) },
    { name: 'clear-file', label: 'Clear File', run: () => run('write',  { id: idVal, attachment: null }) },
    { name: 'delete',     label: 'Delete',     run: () => run('delete', { id: idVal }) },
    { name: 'list',       label: 'List',       run: () => run('list',   {}) },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-3xl mx-auto min-w-0 overflow-hidden" data-testid="user-data-tester">
      <h2 className="text-xl font-bold mb-3">Site_UserData Tester</h2>

      {!user ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800" data-testid="not-logged-in">
          Please sign in to test Site_UserData. <a href="/login" className="underline">Log in</a>.
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500 mb-4" data-testid="signed-in-as">
            Signed in as <strong>{user.email || user.uid}</strong>
          </div>

          <div className="grid gap-3 mb-4">
            <label className="block">
              <span className="text-sm font-medium">id</span>
              <input
                type="text"
                value={idVal}
                onChange={(e) => setIdVal(e.target.value)}
                className="mt-1 block w-full border rounded px-2 py-1 font-mono text-sm"
                data-testid="user-data-id"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">json</span>
              <textarea
                value={jsonVal}
                onChange={(e) => setJsonVal(e.target.value)}
                rows={4}
                className="mt-1 block w-full border rounded px-2 py-1 font-mono text-xs"
                data-testid="user-data-json"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium block text-left">file attachment (≤10 MB, optional)</span>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm"
                data-testid="user-data-file"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {methods.map(m => (
              <button
                key={m.name}
                type="button"
                onClick={m.run}
                disabled={loading[m.name]}
                data-testid={`user-data-btn-${m.name}`}
                className={`px-3 py-1.5 rounded text-sm font-medium ${loading[m.name] ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {loading[m.name] ? '…' : m.label}
              </button>
            ))}
          </div>

          {lastMethod && (
            <div className="border rounded p-2 min-w-0" data-testid={`user-data-result-row-${lastMethod}`}>
              <div className="font-mono text-xs text-gray-500">{lastMethod}</div>
              {error && (
                <div className="mt-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-1 break-all" data-testid={`user-data-error-${lastMethod}`}>
                  {error}
                </div>
              )}
              {result !== undefined && !error && (
                <pre className="mt-1 text-xs text-left bg-green-50 border border-green-200 rounded p-1 overflow-auto max-h-40 whitespace-pre-wrap break-all" data-testid={`user-data-result-${lastMethod}`}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

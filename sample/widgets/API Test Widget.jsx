import React, { useState } from 'react';

export default function TestWidget() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [runAllActive, setRunAllActive] = useState(false);
  const [runAllDone, setRunAllDone] = useState(false);

  const sanitizeName = (name) => name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

  const executeAPI = async (apiName, apiFunction) => {
    setLoading(prev => ({ ...prev, [apiName]: true }));
    setErrors(prev => ({ ...prev, [apiName]: null }));

    try {
      const result = await apiFunction();
      setResults(prev => ({ ...prev, [apiName]: result }));
    } catch (error) {
      console.error(`${apiName} error:`, error);
      setErrors(prev => ({ ...prev, [apiName]: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, [apiName]: false }));
    }
  };

  const runAll = async () => {
    setRunAllActive(true);
    setRunAllDone(false);
    for (const test of apiTests) {
      await executeAPI(test.name, test.fn);
    }
    setRunAllActive(false);
    setRunAllDone(true);
  };

  const apiTests = [
    {
      name: 'ToolCall',
      description: 'Call a tool script (graceful error if no script exists)',
      fn: () => API.ToolCall('test-script', {})
    },
    {
      name: 'Docs_GetDocumentList',
      description: 'Get list of documents with optional filtering',
      fn: () => API.Docs_GetDocumentList({ limit: 5 })
    },
    {
      name: 'Docs_GetDocumentList (Articles)',
      description: 'Get articles only',
      fn: () => API.Docs_GetDocumentList({ type: 'ARTICLE', limit: 5 })
    },
    {
      name: 'Docs_GetDocument',
      description: 'Get a single document by ID (needs valid document id)',
      fn: () => API.Docs_GetDocument('invalid-document-id')
    },
    {
      name: 'Docs_SearchDocuments',
      description: 'Search documents using AI vector search',
      fn: () => API.Docs_SearchDocuments({ query: 'test search query', limit: 5 })
    },
    {
      name: 'Docs_GetCategories',
      description: 'Get visible categories for documents',
      fn: () => API.Docs_GetCategories()
    },
    {
      name: 'Site_GetMenuItems',
      description: 'Get site menu items',
      fn: () => API.Site_GetMenuItems()
    },
    {
      name: 'Site_SendEmailToAdmin',
      description: 'Send email to admin',
      fn: () => API.Site_SendEmailToAdmin('Test Subject', 'Test message from widget', 3000)
    },
    {
      name: 'Chat_Message',
      description: 'Send a chat message to the AI assistant',
      fn: () => API.Chat_Message('Hello! Can you help me?')
    }
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">API Endpoint Test Widget</h2>
      <p className="text-gray-600 mb-4">
        This widget tests all available API endpoints. Click each button to test the corresponding endpoint.
      </p>

      <div className="mb-4 flex items-center gap-3">
        <button
          data-testid="api-test-run-all"
          onClick={runAll}
          disabled={runAllActive}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            runAllActive
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {runAllActive ? 'Running All...' : 'Run All Tests'}
        </button>
        {runAllDone && (
          <span data-testid="api-test-run-all-done" className="text-sm text-green-700 font-medium">
            All tests completed
          </span>
        )}
      </div>

      <div className="grid gap-4">
        {apiTests.map((test) => (
          <div key={test.name} data-testid={`api-test-${sanitizeName(test.name)}`} className="border rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div>
                <h3 className="font-semibold text-lg">{test.name}</h3>
                <p className="text-sm text-gray-600">{test.description}</p>
              </div>
            </div>

            {errors[test.name] && (
              <div data-testid={`api-test-error-${sanitizeName(test.name)}`} className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                <strong>Error:</strong> {errors[test.name]}
              </div>
            )}

            {results[test.name] && !errors[test.name] && (
              <div data-testid={`api-test-result-${sanitizeName(test.name)}`} className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <strong className="text-green-700">Success!</strong>
                <pre className="mt-1 text-xs text-gray-600 overflow-auto text-wrap max-h-32">
                  {JSON.stringify(results[test.name], null, 2)}
                </pre>
              </div>
            )}
            <button
              data-testid={`api-test-btn-${sanitizeName(test.name)}`}
              onClick={() => executeAPI(test.name, test.fn)}
              disabled={loading[test.name]}
              className={`px-4 py-2 mt-2 rounded-md font-medium transition-colors ${
                loading[test.name]
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {loading[test.name] ? 'Testing...' : 'Test'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Each button tests a specific API endpoint</li>
          <li>• Green results indicate successful API calls</li>
          <li>• Red results indicate errors (check console for details)</li>
          <li>• Click "Run All Tests" to execute all endpoints sequentially</li>
        </ul>
      </div>
    </div>
  );
}
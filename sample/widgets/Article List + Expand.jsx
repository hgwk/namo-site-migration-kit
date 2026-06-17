import React, { useState, useEffect } from 'react';

export default function DocsExpand() {
  // CONFIGURABLE CONSTANTS
  const BATCH_SIZE = 10;

  // Color constants
  const PRIMARY_COLOR = 'blue-500';
  const PRIMARY_HOVER_COLOR = 'blue-600';
  const PRIMARY_TEXT = 'blue-600';
  const FALLBACK_THUMBNAIL = 'https://placehold.co/100x100/e2e8f0/64748b?text=Doc';

  // Text Constants
  const MAIN_TITLE = 'Documents';
  const SEARCH_PLACEHOLDER = 'Search documents...';
  const SEARCH_BUTTON_TEXT = 'Search';
  const ALL_CATEGORIES_TEXT = 'All';
  const LOAD_MORE_TEXT = 'Load More';
  const LOADING_TEXT = 'Loading documents...';
  const NO_DOCUMENTS_TEXT = 'No documents found.';

  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedContent, setExpandedContent] = useState({});
  const [loadingContent, setLoadingContent] = useState(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setOffset(0);
    loadDocuments(0);
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await API.Docs_GetCategories();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Categories Error:', error);
    }
  };

  const loadDocuments = async (currentOffset = offset) => {
    if (loading)
      return;

    setLoading(true);
    setError(null);

    try {
      const data = await API.Docs_GetDocumentList({
        categoryId: selectedCategory,
        limit: BATCH_SIZE,
        startOffset: currentOffset,
        contentLength: 150
      });

      const newDocuments = data.documents || [];

      if (currentOffset === 0) {
        setDocuments(newDocuments);
      } else {
        setDocuments(prev => [...prev, ...newDocuments]);
      }

      setHasMore(currentOffset + newDocuments.length < (data.total || 0));
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setOffset(0);
      loadDocuments(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await API.Docs_SearchDocuments({
        query: searchQuery.trim(),
        categoryId: selectedCategory,
        limit: 10
      });

      setDocuments(data.results || []);
      setHasMore(false);
    } catch (error) {
      console.error('Search Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (docId) => {
    if (expandedId === docId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(docId);

    // Load full content if not already loaded
    if (!expandedContent[docId]) {
      setLoadingContent(docId);
      try {
        const data = await API.Docs_GetDocument(docId);
        setExpandedContent(prev => ({
          ...prev,
          [docId]: data.document?.content || 'No content available.'
        }));
      } catch (error) {
        console.error('Content fetch error:', error);
        setExpandedContent(prev => ({
          ...prev,
          [docId]: 'Failed to load content.'
        }));
      } finally {
        setLoadingContent(null);
      }
    }
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
    setExpandedId(null);
  };

  const handleLoadMore = () => {
    const newOffset = offset + BATCH_SIZE;
    setOffset(newOffset);
    loadDocuments(newOffset);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{MAIN_TITLE}</h2>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder={SEARCH_PLACEHOLDER}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${PRIMARY_COLOR}`}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className={`bg-${PRIMARY_COLOR} hover:bg-${PRIMARY_HOVER_COLOR} text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50`}
          >
            {SEARCH_BUTTON_TEXT}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryFilter(null)}
            className={"px-3 py-1 rounded-full text-sm font-medium transition-colors " + (
              selectedCategory === null
                ? `bg-${PRIMARY_COLOR} text-white`
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            {ALL_CATEGORIES_TEXT}
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className={"px-3 py-1 rounded-full text-sm font-medium transition-colors " + (
                selectedCategory === category.id
                  ? `bg-${PRIMARY_COLOR} text-white`
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {loading && documents.length === 0 && (
        <div className="text-center py-8">
          <div className={`animate-spin rounded-full h-10 w-10 border-b-2 border-${PRIMARY_COLOR} mx-auto`}></div>
          <p className="mt-3 text-gray-600">{LOADING_TEXT}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {documents.map((doc) => {
          const isExpanded = expandedId === doc.id;
          const thumbUrl = doc.thumbUrl || FALLBACK_THUMBNAIL;

          return (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-200"
            >
              <div
                onClick={() => toggleExpand(doc.id)}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
              >
                <img
                  src={thumbUrl}
                  alt={doc.title}
                  className="w-16 h-16 rounded object-cover flex-shrink-0"
                  onError={(e) => { if (e.target.src !== FALLBACK_THUMBNAIL) e.target.src = FALLBACK_THUMBNAIL; }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-gray-900 truncate ${isExpanded ? `text-${PRIMARY_TEXT}` : ''}`}>
                    {doc.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(doc.created)} {doc.creator?.name && `by ${doc.creator.name}`}
                  </p>
                  {!isExpanded && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-1">{doc.content}</p>
                  )}
                </div>
                <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {loadingContent === doc.id ? (
                    <div className="flex justify-center py-6">
                      <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${PRIMARY_COLOR}`}></div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none pt-4"
                      dangerouslySetInnerHTML={{ __html: expandedContent[doc.id] || doc.content }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : LOAD_MORE_TEXT}
          </button>
        </div>
      )}

      {!loading && documents.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-600">{NO_DOCUMENTS_TEXT}</p>
        </div>
      )}
    </div>
  );
}

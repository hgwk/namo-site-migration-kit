import React, { useState, useEffect } from 'react';

export default function DocsList() {
  // CONFIGURABLE CONSTANTS
  const BATCH_SIZE = 10;

  // Color constants
  const PRIMARY_COLOR = 'blue-500';
  const PRIMARY_TEXT = 'text-gray-800';
  const SECONDARY_TEXT = 'text-gray-600';

  // Text Constants
  const MAIN_TITLE = 'Articles';
  const ALL_CATEGORIES_TEXT = 'All';
  const LOAD_MORE_TEXT = 'Load More';
  const LOADING_TEXT = 'Loading...';
  const NO_DOCUMENTS_TEXT = 'No documents found.';

  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hasMore, setHasMore] = useState(false);
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

    try {
      const data = await API.Docs_GetDocumentList({
        type: 'ARTICLE',
        categoryId: selectedCategory,        
        limit: BATCH_SIZE,
        startOffset: currentOffset,
        contentLength: 100
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
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleLoadMore = () => {
    const newOffset = offset + BATCH_SIZE;
    setOffset(newOffset);
    loadDocuments(newOffset);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">{MAIN_TITLE}</h2>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleCategoryFilter(null)}
            className={"px-3 py-1 rounded text-sm font-medium transition-colors " + (
              selectedCategory === null
                ? `bg-${PRIMARY_COLOR} text-white`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {ALL_CATEGORIES_TEXT}
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleCategoryFilter(category.id)}
              className={"px-3 py-1 rounded text-sm font-medium transition-colors " + (
                selectedCategory === category.id
                  ? `bg-${PRIMARY_COLOR} text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {loading && documents.length === 0 && (
        <div className="text-center py-6">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${PRIMARY_COLOR} mx-auto`}></div>
          <p className="mt-2 text-gray-500 text-sm">{LOADING_TEXT}</p>
        </div>
      )}

      <ul className="divide-y divide-gray-100">
        {documents.map((doc) => (
          <li key={doc.id} className="py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${PRIMARY_TEXT}`}>
                  <a href={`article?doc_id=${doc.id}`}>{doc.title}</a>
                </h3>
                <p className={`text-sm ${SECONDARY_TEXT} mt-0.5 line-clamp-2`}>{doc.content}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDate(doc.created)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
          >
            {loading ? LOADING_TEXT : LOAD_MORE_TEXT}
          </button>
        </div>
      )}

      {!loading && documents.length === 0 && (
        <p className="text-center text-gray-500 py-6">{NO_DOCUMENTS_TEXT}</p>
      )}
    </div>
  );
}

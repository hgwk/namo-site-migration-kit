import React, { useState, useEffect } from 'react';

export default function DocsModal() {
  // CONFIGURABLE CONSTANTS - Customize the widget appearance here
  const BATCH_SIZE = 6;

  // Card sizing constants - easily adjustable
  const MAX_CARD_WIDTH = 'max-w-sm'; // Options: max-w-xs, max-w-sm, max-w-md, max-w-lg, max-w-xl
  const CARD_HEIGHT = 'h-auto'; // Options: h-auto, h-96, h-80, etc.

  // Color constants - easily adjustable theme colors
  const PRIMARY_COLOR = 'blue-500'; // Main brand color
  const PRIMARY_HOVER_COLOR = 'blue-600'; // Hover state for primary elements
  const PRIMARY_TEXT = 'blue-600'; // Primary text color (dates, highlights)
  const FALLBACK_THUMBNAIL = 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image';

  // Text Constants
  const MAIN_TITLE = 'Documents';
  const SEARCH_PLACEHOLDER = 'Search documents...';
  const SEARCH_BUTTON_TEXT = 'Search';
  const ALL_CATEGORIES_TEXT = 'All';
  const LOAD_MORE_TEXT = 'Load More';
  const LOADING_TEXT = 'Loading documents...';
  const LOADING_MORE_TEXT = 'Loading...';
  const NO_DOCUMENTS_TEXT = 'No documents found. Try adjusting your search or filters.';
  const MODAL_LOADING_TEXT = 'Loading...';
  const MODAL_NO_CONTENT_TEXT = '<p>No content available.</p>';

  // Error Messages
  const LOAD_ERROR = 'Failed to load documents. Please try again.';

  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDocument, setModalDocument] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [offset, setOffset] = useState(0);

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  // Load documents when category changes
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
        contentLength: 120
      });

      const newDocuments = data.documents || [];

      if (currentOffset === 0) {
        setDocuments(newDocuments);
      } else {
        setDocuments(prev => [...prev, ...newDocuments]);
      }

      setTotal(data.total || 0);
      setHasMore(currentOffset + newDocuments.length < (data.total || 0));
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message || LOAD_ERROR);
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
      setTotal(data.count || 0);
      setHasMore(false); // Search results don't paginate
    } catch (error) {
      console.error('Search Error:', error);
      setError(error.message || LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (doc) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalDocument(null);

    try {
      const data = await API.Docs_GetDocument(doc.id);
      setModalDocument(data.document);
    } catch (error) {
      console.error('Document fetch error:', error);
      setModalDocument({ ...doc, content: MODAL_NO_CONTENT_TEXT });
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalDocument(null);
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
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

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape' && modalOpen) {
      closeModal();
    }
  };

  // Add escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [modalOpen]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{MAIN_TITLE}</h2>

          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder={SEARCH_PLACEHOLDER}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-${PRIMARY_COLOR} focus:border-${PRIMARY_COLOR}`}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className={`bg-${PRIMARY_COLOR} hover:bg-${PRIMARY_HOVER_COLOR} text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50`}
            >
              {SEARCH_BUTTON_TEXT}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={"px-4 py-2 rounded-full text-sm font-medium mr-2 mb-2 transition-colors " + (
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
                className={"px-4 py-2 rounded-full text-sm font-medium mr-2 mb-2 transition-colors " + (
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
          <div className="text-center py-12">
            <div className={`animate-spin rounded-full h-16 w-16 border-b-2 border-${PRIMARY_COLOR} mx-auto`}></div>
            <p className="mt-4 text-gray-600">{LOADING_TEXT}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const createdAt = doc.created ? formatDate(doc.created) : '';
            const thumbUrl = doc.thumbUrl || FALLBACK_THUMBNAIL;

            return (
              <div
                key={doc.id}
                onClick={() => openModal(doc)}
                className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group ${MAX_CARD_WIDTH} ${CARD_HEIGHT} mx-auto`}
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img
                    src={thumbUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      if (e.target.src !== FALLBACK_THUMBNAIL) e.target.src = FALLBACK_THUMBNAIL;
                    }}
                  />
                </div>
                <div className="p-6 space-y-4">
                  {createdAt && (
                    <div className={`text-sm text-${PRIMARY_TEXT} font-medium`}>{createdAt}</div>
                  )}
                  <h3 className={`text-xl font-bold text-gray-900 group-hover:text-${PRIMARY_TEXT} transition-colors duration-200`}>{doc.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{doc.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? LOADING_MORE_TEXT : LOAD_MORE_TEXT}
            </button>
          </div>
        )}

        {!loading && documents.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600">{NO_DOCUMENTS_TEXT}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                {modalLoading ? MODAL_LOADING_TEXT : modalDocument?.title || ''}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {modalLoading ? (
                <div className="flex justify-center py-12">
                  <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${PRIMARY_COLOR}`}></div>
                </div>
              ) : (
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: modalDocument?.content || MODAL_NO_CONTENT_TEXT }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

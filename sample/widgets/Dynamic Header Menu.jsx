import React, { useEffect, useState } from 'react';

const HeaderMenuWidget = () => {
  // Configuration is loaded from Widget.constants (the "Constants" tab in the editor).
  // Edit values there instead of changing this file.
  // Tailwind cannot generate classes from runtime-built strings, so colors/breakpoints
  // are mapped through lookup tables that only reference fully-spelled-out class names.
  const BREAKPOINT_CLASSES = {
    sm: { showDesktop: 'sm:flex', hideDesktop: 'sm:hidden' },
    md: { showDesktop: 'md:flex', hideDesktop: 'md:hidden' },
    lg: { showDesktop: 'lg:flex', hideDesktop: 'lg:hidden' },
    xl: { showDesktop: 'xl:flex', hideDesktop: 'xl:hidden' },
  };
  const COLOR_CLASSES = {
    'blue-600':    { text: 'text-blue-600',    hoverText: 'hover:text-blue-600',    bg: 'bg-blue-600',    activeText: 'text-blue-600',    activeBg: 'bg-blue-50' },
    'indigo-600':  { text: 'text-indigo-600',  hoverText: 'hover:text-indigo-600',  bg: 'bg-indigo-600',  activeText: 'text-indigo-600',  activeBg: 'bg-indigo-50' },
    'emerald-600': { text: 'text-emerald-600', hoverText: 'hover:text-emerald-600', bg: 'bg-emerald-600', activeText: 'text-emerald-600', activeBg: 'bg-emerald-50' },
    'red-600':     { text: 'text-red-600',     hoverText: 'hover:text-red-600',     bg: 'bg-red-600',     activeText: 'text-red-600',     activeBg: 'bg-red-50' },
    'amber-600':   { text: 'text-amber-600',   hoverText: 'hover:text-amber-600',   bg: 'bg-amber-600',   activeText: 'text-amber-600',   activeBg: 'bg-amber-50' },
  };
  const LIGHT_BG_CLASSES = {
    'blue-50':    'hover:bg-blue-50',
    'indigo-50':  'hover:bg-indigo-50',
    'emerald-50': 'hover:bg-emerald-50',
    'red-50':     'hover:bg-red-50',
    'amber-50':   'hover:bg-amber-50',
  };

  const BP = BREAKPOINT_CLASSES[Constants.mobileBreakpoint] || BREAKPOINT_CLASSES.sm;
  const COLOR = COLOR_CLASSES[Constants.primaryColor] || COLOR_CLASSES['blue-600'];
  const HOVER_BG = LIGHT_BG_CLASSES[Constants.primaryLightBg] || LIGHT_BG_CLASSES['blue-50'];
  const LOGO_TEXT = Constants.logoText || 'Logo';
  const LOADING_TEXT = Constants.loadingText || 'Loading...';
  const EMPTY_DESKTOP_TEXT = Constants.emptyDesktopText || 'No navigation items available';
  const LOAD_ERROR_TEXT = Constants.loadErrorText || 'Failed to load navigation menu';

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadMenuItems();
    
    // Update current path based on URL
    setCurrentPath(window.location.pathname);
    
    // Listen for navigation changes
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the API helper to load menu items
      const response = await API.Site_GetMenuItems();

      if (response && response.items) {
        setMenuItems(response.items);
      } else {
        setMenuItems([]);
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
      setError(LOAD_ERROR_TEXT);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };


  // Show menu structure even when loading, but with loading state for menu items
  const displayMenuItems = loading ? [] : menuItems;

  if (error) {
    return (
      <div className="w-full bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="py-4 text-red-500 text-center">{error}</div>
        </nav>
      </div>
    );
  }

  // Handle link clicks and close mobile menu
  const handleLinkClick = (path, e) => {
    // Close mobile menu when a link is clicked
    setIsMobileMenuOpen(false);
  };

  // Show menu structure even when there are no items, but with appropriate message
  const showEmptyState = !loading && displayMenuItems.length === 0;

  return (
    <div className="w-full bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop Menu */}
        <div className={`hidden ${BP.showDesktop} items-center justify-between py-4`}>
          {/* Logo/Icon */}
          <div className="flex items-center">
            <span className={`text-xl font-bold ${COLOR.text}`}>{LOGO_TEXT}</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            {loading ? (
              <div className="flex items-center space-x-8">
                <div className="px-3 py-2 text-sm text-gray-400">{LOADING_TEXT}</div>
              </div>
            ) : showEmptyState ? (
              <div className="flex items-center space-x-8">
                <div className="px-3 py-2 text-sm text-gray-500">{EMPTY_DESKTOP_TEXT}</div>
              </div>
            ) : (
              displayMenuItems.map((item) => (
                <a
                  key={item.pageId}
                  href={item.path}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-md ${COLOR.hoverText} ${HOVER_BG} ${
                    currentPath === item.path
                      ? `${COLOR.activeText} ${COLOR.activeBg}`
                      : 'text-gray-700'
                  }`}
                >
                  {item.title}
                  {currentPath === item.path && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${COLOR.bg} rounded-full`}></div>
                  )}
                </a>
              ))
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className={`${BP.hideDesktop} flex items-center justify-between py-4`}>
          {/* Same Logo/Icon as desktop */}
          <div className="flex items-center">
            <span className={`text-xl font-bold ${COLOR.text}`}>{LOGO_TEXT}</span>
          </div>
          
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {/* Hamburger/Close icon */}
            <span className="material-icons h-6 w-6">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Side Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 z-50 ${BP.hideDesktop}`}>
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Side menu */}
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="text-lg font-medium text-gray-900">Navigation</span>
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <span className="material-icons h-6 w-6">close</span>
              </button>
            </div>
            
            <div className="py-4">
              {loading ? (
                <div className="px-4 py-3 text-base text-gray-400">Loading...</div>
              ) : showEmptyState ? (
                <div className="px-4 py-3 text-base text-gray-500">No menu items available</div>
              ) : (
                displayMenuItems.map((item) => (
                  <a
                    key={item.pageId}
                    href={item.path}
                    className={`block px-4 py-3 text-base font-medium transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600 ${
                      currentPath === item.path 
                        ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-600' 
                        : 'text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleLinkClick(item.path, e);
                    }}
                  >
                    {item.title}
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderMenuWidget;
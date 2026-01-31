import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  hideSidebar?: boolean;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  hideSidebar = false,
  hideHeader = false,
  hideFooter = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {!hideSidebar && (
        <Sidebar isOpen={isMobileMenuOpen} onClose={toggleMobileMenu} />
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        {!hideHeader && (
          <Header onMenuClick={toggleMobileMenu} />
        )}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-gray-50/50 via-white/80 to-gray-100/50 backdrop-blur-sm ${!hideHeader && !hideFooter ? 'p-4 sm:p-6 lg:p-8' : 'p-0'}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        {!hideFooter && (
          <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 py-4 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-center items-center">
                <p className="text-sm text-gray-600 font-medium">
                  Powered by{" "}
                  <span className="text-blue-600 font-bold hover:text-blue-700 transition-colors duration-200">
                    Botivate
                  </span>
                </p>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default Layout;
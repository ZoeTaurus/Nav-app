import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  MapIcon, 
  PlayIcon, 
  BarChart3Icon, 
  UsersIcon, 
  SettingsIcon,
  MenuIcon,
  XIcon
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Routes', href: '/routes', icon: MapIcon },
    { name: 'Tracking', href: '/tracking', icon: PlayIcon },
    { name: 'Analytics', href: '/analytics', icon: BarChart3Icon },
    { name: 'Community', href: '/community', icon: UsersIcon },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white shadow-xl">
          <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MapIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Road Time</span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col px-4 pb-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(item.href);
                
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon 
                        className={`h-5 w-5 shrink-0 ${
                          active ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-700'
                        }`} 
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                  <MapIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">Road Time</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="relative z-50 lg:hidden">
            <div className="fixed inset-0 bg-gray-900/80" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed inset-0 flex">
              <div className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <XIcon className="h-6 w-6 text-white" />
                  </button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <Link to="/" className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <MapIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold text-gray-900">Road Time</span>
                    </Link>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-2">
                      {navigation.map((item) => {
                        const Icon = item.icon;
                        const active = isActiveRoute(item.href);
                        
                        return (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-colors ${
                                active
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                              }`}
                            >
                              <Icon 
                                className={`h-5 w-5 shrink-0 ${
                                  active ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-700'
                                }`} 
                              />
                              {item.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="py-6 lg:py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

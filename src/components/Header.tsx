import React from 'react';
import { Search, Plus, LogOut, User } from 'lucide-react';
//import { Staff } from '@/types/order';
import { AuthUser } from '@/hooks/useAuth';

interface HeaderProps {
  user: AuthUser | null;
  onOpenSearch: () => void;
  onOpenAddOrder: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onOpenSearch,
  onOpenAddOrder,
  onOpenLogin,
  onLogout,
}) => {
  return (
    <header className="
                        bg-gradient-to-r from-slate-800 to-slate-900 
                        text-white 
                        sticky top-0 z-40 
                        rounded-full
                        mx-2 md:mx-4 my-2 
                      ">
      <div className="max-w-7xl mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between h-24 md:h-28">
          <div className="flex items-center gap-3">
            <div className="
                            h-16 w-32
                            sm:h-20 sm:w-40
                            md:h-24 md:w-48
                            flex-shrink-0
                            overflow-hidden
                          ">
              <img
                src="/logo.png"
                alt="NotiFlo logo"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onOpenSearch}
              className="
                          flex items-center 
                          gap-2 px-4 py-2.5 
                          transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              <div className="
                              flex 
                              items-center 
                              gap-3 pl-4 
                              border-l border-slate-600
                            ">
                <div className="flex items-center gap-2">
                  <div className="
                                  w-9 h-9 
                                  bg-slate-600 
                                  rounded-full 
                                  flex 
                                  items-center justify-center
                                ">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{user.email}</p>
                    <p className="text-xs text-slate-400">{user.profile?.role || 'Staff'}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="
                            flex 
                            items-center 
                            gap-2 px-4 py-2.5 
                            bg-white text-slate-800 
                            hover:bg-slate-100 
                            rounded-full 
                            transition-colors 
                            font-semibold
                          "
              >
                <User className="w-5 h-5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          <div className="
                            flex flex-nowrap 
                            items-center 
                            gap-2 
                            min-w-0 
                            md:hidden
                          ">
            <button
              onClick={onOpenSearch}
              className="px-3 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenLogin}
              className="
                          flex items-center 
                          gap-2 
                          px-3 py-2 
                          rounded-2xl 
                          bg-slate-700 
                          hover:bg-slate-600 
                          transition-colors
                        "
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium truncate max-w-[4rem]">
                {user ? user.email.charAt(0).toUpperCase() : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {user && (
        <button
          onClick={onOpenAddOrder}
          className="
                      hidden md:flex 
                      fixed bottom-6 right-6 
                      z-50 
                      h-16 w-16 
                      items-center justify-center 
                      rounded-full 
                      bg-gradient-to-r from-amber-500 to-orange-500 
                      text-slate-900 
                      shadow-2xl 
                      transition 
                      hover:from-amber-600 hover:to-orange-600 
                      focus:outline-none focus:ring-2 focus:ring-amber-400
                    "
          title="Add Order"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </header>
  );
};

export default Header;
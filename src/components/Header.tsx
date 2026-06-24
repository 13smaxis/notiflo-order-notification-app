import React from 'react';
import { Search, Plus, LogOut, User } from 'lucide-react';
import { Staff } from '@/types/order';

interface HeaderProps {
  user: Staff | null;
  onOpenSearch: () => void;
  onOpenAddOrder: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  orderCount: number;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onOpenSearch,
  onOpenAddOrder,
  onOpenLogin,
  onLogout,
  orderCount
}) => {
  return (
    <header className="
                        bg-gradient-to-r from-slate-800 to-slate-900 
                        text-white 
                        sticky top-0 z-40 
                        rounded-full
                        mx-2 md:mx-4 my-2 
                      "
    >                                                                                                           {/* Header */}
      <div className="max-w-7xl mx-auto px-3 md:px-4">                                                          {/* Header Container */}
        <div className="flex items-center justify-between h-24 md:h-28">                                        {/* Header Content */}
         <div className="flex items-center gap-3">
          <div className="
                          h-14 w-28
                          sm:h-16 sm:w-32
                          md:h-20 md:w-40
                          flex-shrink-0
                          overflow-hidden
                          relative
                        "
          >
            <img
              src="/logo.png"
              alt="NotiFlo logo"
              className="
                          h-full w-full
                          object-contain
                        "
            />
          </div>
        </div>
          

          <div className="hidden md:flex items-center gap-4">                                                   {/* Desktop Navigation container*/}
            <div className="bg-slate-700/50 rounded-xl px-4 py-2 flex items-center gap-3">                    {/* Order Stats */}
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {orderCount}
                </p>
                <p className="text-xs text-slate-400">
                  Active Orders
                </p>
              </div>
            </div>
            
            <button
              onClick={onOpenSearch}
              className="
                          flex items-center 
                          gap-2 px-4 py-2.5 
                          bg-slate-700 
                          hover:bg-slate-600 
                          rounded-xl transition-colors"
            >                                                                                                   {/* Search Button */}
                <Search className="w-5 h-5" />
              <span className="font-medium">
                Search
              </span>
            </button>

            {user && (
              <button
                onClick={onOpenAddOrder}
                className="
                            flex items-center 
                            gap-2 px-4 py-2.5 
                            bg-gradient-to-r from-amber-500 to-orange-500 
                            hover:from-amber-600 hover:to-orange-600 
                            rounded-xl 
                            transition-all 
                            shadow-lg 
                            hover:shadow-xl 
                            font-semibold"
              >                                                                                                 {/* Add Order Button */}
                <Plus className="w-5 h-5" />
                <span>New Order</span>
              </button>
            )}

            {user ? (
              <div className="
                              flex 
                              items-center 
                              gap-3 pl-4 
                              border-l border-slate-600
                            "
              >                                                                                                 {/* User Section */}
                <div className="flex items-center gap-2">
                  <div className="
                                  w-9 h-9 
                                  bg-slate-600 
                                  rounded-full 
                                  flex 
                                  items-center justify-center
                                "
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-slate-400">{user.role}</p>
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
                            rounded-xl 
                            transition-colors 
                            font-semibold
                          "
              >                                                                                                 {/* Sign In Button */}
                <User className="w-5 h-5" />
                  <span>
                    Sign In
                  </span>
              </button>
            )}
          </div>

          <div className="flex flex-nowrap items-center gap-2 min-w-0 md:hidden">                                        {/* Mobile Navigation container*/}
            <div className="rounded-2xl bg-slate-700/50 px-3 py-2 text-amber-400 font-semibold text-sm">
              {orderCount}
            </div>

            <button
              onClick={onOpenSearch}
              className="p-3 rounded-2xl bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium truncate max-w-[4rem]">
                {user ? user.full_name.charAt(0).toUpperCase() : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React from 'react';
import { Search, Plus, LogOut, User, Beef, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
                          h-32 w-80          
                          sm:h-36 sm:w-88    
                          md:h-48 md:w-112   
                          flex-shrink-0
                          overflow-hidden
                          relative
                        "
          >
            <img
              src="/logo.png"
              alt="NotiFlo logo"
              className="
                          absolute
                          h-[240%] w-[240%]
                          -top-[65%] -left-[0%]
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

          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="
                        md:hidden p-2 
                        hover:bg-slate-700 
                        rounded-lg 
                        transition-colors
                      "
          >                                                                                                     {/* Mobile Menu Button */}
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700 space-y-3">
            
            <div className="bg-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">          {/* Order Stats */}
              <span className="text-slate-300">Active Orders</span>
              <span className="text-xl md:text-2xl font-bold text-amber-400">{orderCount}</span>
            </div>

            {/* Search Button */}
            <button
              onClick={() => {
                onOpenSearch();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Search Orders</span>
            </button>

            {/* Add Order Button */}
            {user && (
              <button
                onClick={() => {
                  onOpenAddOrder();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl transition-all shadow-lg font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>New Order</span>
              </button>
            )}

            {/* User Section */}
            {user ? (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-xs text-slate-400">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white text-slate-800 hover:bg-slate-100 rounded-xl transition-colors font-semibold"
              >
                <User className="w-5 h-5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

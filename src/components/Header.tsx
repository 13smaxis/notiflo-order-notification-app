import React from 'react';
import { ChevronDown, LayoutDashboard, LogOut, Plus, Search, User, Users } from 'lucide-react';
import { AuthUser } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  user: AuthUser | null;
  onOpenSearch: () => void;
  onOpenAddOrder: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenDashboard: () => void;
  onLogout: () => void;
}

function getInitials(user: AuthUser | null) {
  const displayName = user?.display_name?.trim() || user?.profile?.full_name?.trim() || '';
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  }

  const emailLocalPart = user?.email.split('@')[0] ?? '';
  const tokens = emailLocalPart.split(/[._\-\s]+/).filter(Boolean);
  if (tokens.length >= 2) {
    return tokens.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  }

  const phoneDigits = user?.phone?.replace(/\D/g, '') ?? '';
  return phoneDigits.slice(0, 2) || emailLocalPart.slice(0, 2).toUpperCase() || 'U';
}

const Header: React.FC<HeaderProps> = ({
  user,
  onOpenSearch,
  onOpenAddOrder,
  onOpenLogin,
  onOpenRegister,
  onOpenDashboard,
  onLogout,
}) => {
  const role = user?.profile?.role?.toLowerCase() ?? 'staff';
  const canAddEmployee = role === 'owner' || role === 'manager' || role === 'supervisor';
  const canViewDashboard = role === 'owner';

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

            {user && (
              <button
                onClick={onOpenAddOrder}
                className="
                            inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-slate-900 transition-colors hover:bg-slate-100
                          "
              >
                <Plus className="w-5 h-5" />
                <span className="whitespace-nowrap">Create Order</span>
              </button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="
                                  flex items-center gap-3 pl-4 border-l border-slate-600
                                  hover:opacity-90 transition-opacity
                                "
                    title="Account menu"
                  >
                    <div className="
                                    w-10 h-10 
                                    bg-slate-600 
                                    rounded-full 
                                    flex 
                                    items-center justify-center
                                    font-semibold text-sm tracking-wide
                                  ">
                      {getInitials(user)}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-300" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="min-w-56">
                  <div className="px-2 py-1.5 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {role}
                  </div>
                  {canViewDashboard && (
                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onOpenDashboard(); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                  )}
                  {canAddEmployee && (
                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onOpenRegister(); }}>
                      <Users className="mr-2 h-4 w-4" />
                      Register
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onLogout(); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
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
                <button
                  onClick={() => onOpenRegister()}
                  className="
                              flex 
                              items-center 
                              gap-2 px-4 py-2.5 
                              border border-white/30 
                              text-white 
                              hover:bg-white/10 
                              rounded-full 
                              transition-colors 
                              font-semibold
                            "
                >
                  <User className="w-5 h-5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>

          <div className="
                            flex flex-nowrap 
                            items-center 
                            gap-1.5 
                            min-w-0 
                            md:hidden
                          ">
            <button
              onClick={onOpenSearch}
              className="flex h-9 w-9 items-center justify-center rounded-2xl transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="
                                inline-flex items-center gap-1.5 rounded-2xl bg-slate-700 px-2.5 py-1.5 transition-colors hover:bg-slate-600
                              "
                  >
                    <span className="whitespace-nowrap text-xs font-semibold tracking-wide">{getInitials(user)}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <div className="px-2 py-1.5 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {role}
                  </div>
                  {canViewDashboard && (
                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onOpenDashboard(); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                  )}
                  {canAddEmployee && (
                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onOpenRegister(); }}>
                      <Users className="mr-2 h-4 w-4" />
                      Register
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onLogout(); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLogin}
                  className="
                              inline-flex items-center 
                              gap-1.5 
                              px-2.5 py-1.5 
                              rounded-2xl 
                              bg-slate-700 
                              hover:bg-slate-600 
                              transition-colors
                            "
                >
                  <User className="h-4 w-4" />
                  <span className="whitespace-nowrap text-xs font-medium">Sign In</span>
                </button>
                <button
                  onClick={() => onOpenRegister()}
                  className="
                              inline-flex items-center 
                              gap-1.5 
                              px-2.5 py-1.5 
                              rounded-2xl 
                              border border-white/30 
                              hover:bg-white/10 
                              transition-colors
                            "
                >
                  <User className="h-4 w-4" />
                  <span className="whitespace-nowrap text-xs font-medium">Register</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
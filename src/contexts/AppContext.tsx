// src/contexts/AppContext.tsx - Updated with user state

import React, { createContext, useContext, useState } from 'react';
import { Profile } from '@/types/order';

export interface AuthUser {
  auth_user_id: string;
  email: string;
  profile: Profile | null;
}

interface AppContextType {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Auth & User
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;

  // Derived state (convenience)
  storeId: string | null;
  userRole: string | null;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  setUser: () => {},
  storeId: null,
  userRole: null,
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Derived values
  const storeId = user?.profile?.store_id ?? null;
  const userRole = user?.profile?.role ?? null;

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        user,
        setUser,
        storeId,
        userRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/types/order';

function isLocalMode() {
  const flag = (import.meta as any).env?.VITE_USE_LOCAL_DB;
  if (typeof flag === 'string') {
    return flag.toLowerCase() === 'true';
  }
  const mode = (import.meta as any).env?.MODE || (import.meta as any).env?.DEV ? 'development' : 'production';
  return mode !== 'production';
}

export function useAuth() {
  const [user, setUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('notiflo_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (isLocalMode()) {
      try {
        if (password !== 'demo2024') throw new Error('Invalid credentials');
        const demoUser: Staff = {
          id: 'demo-user',
          email: email.toLowerCase(),
          full_name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          role: 'staff',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
        setUser(demoUser);
        localStorage.setItem('notiflo_user', JSON.stringify(demoUser));
        return { user: demoUser, error: null };
      } catch (err: any) {
        return { user: null, error: err.message };
      }
    }
    try {
      // Check if staff exists
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (staffError || !staffData) {
        // For demo purposes, create a new staff member if they don't exist
        // In production, you'd want proper authentication
        if (password === 'demo2024') {
          const { data: newStaff, error: createError } = await supabase
            .from('staff')
            .insert([{
              email: email.toLowerCase(),
              full_name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              role: 'staff'
            }])
            .select()
            .single();

          if (createError) throw createError;

          setUser(newStaff);
          localStorage.setItem('notiflo_user', JSON.stringify(newStaff));
          return { user: newStaff, error: null };
        }
        throw new Error('Invalid credentials');
      }

      // Simple password check for demo (in production, use proper auth)
      if (password !== 'demo2024') {
        throw new Error('Invalid password');
      }

      // Update last login
      await supabase
        .from('staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', staffData.id);

      setUser(staffData);
      localStorage.setItem('notiflo_user', JSON.stringify(staffData));
      return { user: staffData, error: null };
    } catch (err: any) {
      return { user: null, error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('notiflo_user');
  }, []);

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };
}

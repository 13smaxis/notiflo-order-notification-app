
import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/order';

export interface AuthUser {
  auth_user_id: string;
  email: string;
  profile: Profile | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (authUserId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    return profile || null;
  }, []);

  const hydrateUser = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setError(null);
      return;
    }

    try {
      const profile = await fetchProfile(session.user.id);

      setUser({
        auth_user_id: session.user.id,
        email: session.user.email || '',
        profile: profile || null
      });
      setError(null);
    } catch (err: any) {
      console.error('Profile hydration error:', err);
      setUser({
        auth_user_id: session.user.id,
        email: session.user.email || '',
        profile: null
      });
      setError(err.message || 'Failed to load profile');
    }
  }, [fetchProfile]);

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        setLoading(true);

        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        await hydrateUser(session);
      } catch (err: any) {
        console.error('Session check error:', err);
        setError(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (!session?.user) {
        setUser(null);
        setError(null);
        return;
      }

      void hydrateUser(session);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [hydrateUser]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthenticating(true);

    try {
      setError(null);

      // Sign in with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from auth');

      let profile: Profile | null = null;

      try {
        profile = await fetchProfile(authData.user.id);
      } catch (profileError: any) {
        console.error('Login profile hydration error:', profileError);
        setError(profileError.message || 'Failed to load profile');
      }

      const authUser: AuthUser = {
        auth_user_id: authData.user.id,
        email: authData.user.email || '',
        profile: profile || null
      };

      setUser(authUser);
      return { user: authUser, error: null };
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      setUser(null);
      return { user: null, error: errorMessage };
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return {
    user,
    loading,
    authenticating,
    error,
    login,
    logout,
    isAuthenticated: !!user                                                                                     //-Session-backed authentication state
  };
}

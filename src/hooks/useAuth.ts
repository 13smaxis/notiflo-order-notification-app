
import { useState, useEffect, useCallback } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Fetch user's profile
          const { data: profile, error: profileError } = await supabase
            .from('profile')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          setUser({
            auth_user_id: session.user.id,
            email: session.user.email || '',
            profile: profile || null
          });
        }
      } catch (err: any) {
        console.error('Session check error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profile')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();

        setUser({
          auth_user_id: session.user.id,
          email: session.user.email || '',
          profile: profile || null
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      // Sign in with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from auth');

      // Fetch the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profile')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
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
      return { user: null, error: errorMessage };
    } finally {
      setLoading(false);
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
    error,
    login,
    logout,
    isAuthenticated: !!user && !!user.profile                                                                                     //-Must have profile to be authenticated
  };
}

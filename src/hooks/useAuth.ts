import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, Store } from '@/types/order';

export interface AuthUser {
  auth_user_id: string;
  phone: string;
  email: string;
  display_name?: string | null;
  profile: Profile | null;
  profiles: Profile[];
  availableStores: Store[];
  selectedStoreId: string | null;
}

export interface RegisterInput {
  email?: string;
  phoneNumber: string;
  password: string;
  role: 'owner' | 'manager' | 'supervisor' | 'staff';
  storeName: string;
  storeNumber: string;
  ownerName: string;
  ownerSurname: string;
  employeeNumber?: string;
}

type UserMetadata = Record<string, unknown>;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function getMetadataString(metadata: UserMetadata | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return isString(value) ? value.trim() : undefined;
}

function joinName(parts: Array<string | undefined>): string | undefined {
  const filtered = parts.filter((part): part is string => Boolean(part && part.trim()));
  return filtered.length > 0 ? filtered.join(' ') : undefined;
}

function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.trim();
}

function isValidPhoneNumber(phoneNumber: string): boolean {
  return /^\+\d{9}$/.test(phoneNumber.trim());
}

function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value.trim());
}

function buildAuthEmailFromPhone(phoneNumber: string): string {
  const normalizedPhone = normalizePhoneNumber(phoneNumber).replace(/^\+/, '');
  return `${normalizedPhone}@phone.notiflo.local`;
}

function profileToStore(profile: Profile): Store {
  const storeNumber = typeof profile.store_number === 'number'
    ? profile.store_number
    : Number(profile.store_number ?? profile.shop_number ?? 1);

  return {
    store_id: profile.store_id || profile.auth_user_id,
    store_number: Number.isFinite(storeNumber) && storeNumber > 0 ? storeNumber : 1,
    store_name: profile.store_name?.trim() || profile.shop_name?.trim() || 'Store',
    store_phone: profile.store_phone?.trim() || '',
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

function fallbackStoreFromMetadata(authUserId: string, metadata: UserMetadata | undefined): Store {
  const now = new Date().toISOString();
  const rawStoreNumber = getMetadataString(metadata, 'store_number') || getMetadataString(metadata, 'shop_number') || '1';
  const parsedStoreNumber = Number(rawStoreNumber);

  return {
    store_id: authUserId,
    store_number: Number.isFinite(parsedStoreNumber) && parsedStoreNumber > 0 ? parsedStoreNumber : 1,
    store_name: getMetadataString(metadata, 'store_name') || getMetadataString(metadata, 'shop_name') || 'Store',
    store_phone: getMetadataString(metadata, 'store_phone') || getMetadataString(metadata, 'phone_number') || '',
    created_at: now,
    updated_at: now,
  };
}

function toDisplayName(metadata: UserMetadata | undefined, profile: Profile | null, email: string) {
  const profileName = profile?.full_name?.trim();
  const metadataName = getMetadataString(metadata, 'full_name');
  const fallbackName = joinName([getMetadataString(metadata, 'owner_name'), getMetadataString(metadata, 'owner_surname')]);

  return profileName || metadataName || fallbackName || email.split('@')[0] || email;
}

function createFallbackProfile(authUserId: string, metadata: UserMetadata | undefined): Profile {
  const now = new Date().toISOString();
  const rawStoreNumber = getMetadataString(metadata, 'store_number') || getMetadataString(metadata, 'shop_number') || '1';
  const parsedStoreNumber = Number(rawStoreNumber);

  return {
    auth_user_id: authUserId,
    store_id: authUserId,
    role: getMetadataString(metadata, 'role'),
    full_name: getMetadataString(metadata, 'full_name') ?? joinName([getMetadataString(metadata, 'owner_name'), getMetadataString(metadata, 'owner_surname')]),
    store_name: getMetadataString(metadata, 'store_name') ?? getMetadataString(metadata, 'shop_name'),
    store_number: Number.isFinite(parsedStoreNumber) && parsedStoreNumber > 0 ? parsedStoreNumber : 1,
    store_phone: getMetadataString(metadata, 'store_phone') ?? getMetadataString(metadata, 'phone_number'),
    shop_name: getMetadataString(metadata, 'shop_name'),
    shop_number: getMetadataString(metadata, 'shop_number'),
    created_at: now,
    updated_at: now,
  };
}

function mergeProfile(profile: Profile | null, metadata: UserMetadata | undefined, authUserId: string): Profile {
  if (!profile) {
    return createFallbackProfile(authUserId, metadata);
  }

  return {
    ...profile,
    role: profile.role ?? getMetadataString(metadata, 'role'),
    full_name: profile.full_name ?? getMetadataString(metadata, 'full_name') ?? joinName([getMetadataString(metadata, 'owner_name'), getMetadataString(metadata, 'owner_surname')]),
    store_name: profile.store_name ?? getMetadataString(metadata, 'store_name') ?? profile.shop_name ?? getMetadataString(metadata, 'shop_name'),
    store_number: profile.store_number ?? Number(getMetadataString(metadata, 'store_number') ?? getMetadataString(metadata, 'shop_number') ?? profile.shop_number ?? 1),
    store_phone: profile.store_phone ?? getMetadataString(metadata, 'store_phone') ?? getMetadataString(metadata, 'phone_number'),
    shop_name: profile.shop_name ?? getMetadataString(metadata, 'shop_name'),
    shop_number: profile.shop_number ?? getMetadataString(metadata, 'shop_number'),
  };
}

function buildAuthUser(user: User, profiles: Profile[], selectedStoreId: string | null): AuthUser {
  const metadata = user.user_metadata as UserMetadata | undefined;
  const availableStores = profiles.length > 0 ? profiles.map(profileToStore) : [fallbackStoreFromMetadata(user.id, metadata)];
  const mergedProfiles = profiles.length > 0 ? profiles.map((profile) => mergeProfile(profile, metadata, user.id)) : [createFallbackProfile(user.id, metadata)];
  const selectedProfile = selectedStoreId
    ? mergedProfiles.find((profile) => profile.store_id === selectedStoreId) ?? null
    : mergedProfiles.length === 1
      ? mergedProfiles[0]
      : null;

  return {
    auth_user_id: user.id,
    phone: getMetadataString(metadata, 'store_phone') || getMetadataString(metadata, 'phone_number') || availableStores[0]?.store_phone || '',
    email: user.email || '',
    display_name: toDisplayName(metadata, selectedProfile, user.email || ''),
    profile: selectedProfile,
    profiles: mergedProfiles,
    availableStores,
    selectedStoreId: selectedProfile?.store_id ?? null,
  };
}

function buildSelectedStoreId(userId: string, profiles: Profile[]): string | null {
  if (profiles.length === 1) {
    return profiles[0].store_id ?? null;
  }

  try {
    const stored = window.localStorage.getItem(`notiflo:selected-store:${userId}`);
    if (stored && profiles.some((profile) => profile.store_id === stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access issues.
  }

  return null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async (authUserId: string) => {
    const { data: profiles, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('auth_user_id', authUserId)
      .order('created_at', { ascending: true });

    if (profileError) {
      throw profileError;
    }

    return profiles || [];
  }, []);

  const hydrateUser = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setError(null);
      return;
    }

    try {
      const profiles = await fetchProfiles(session.user.id);
      const selectedStoreId = buildSelectedStoreId(session.user.id, profiles);
      setUser(buildAuthUser(session.user, profiles, selectedStoreId));
      setError(null);
    } catch (err: unknown) {
      console.error('Profile hydration error:', err);
      setUser(buildAuthUser(session.user, [], null));
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }
  }, [fetchProfiles]);

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
      } catch (err: unknown) {
        console.error('Session check error:', err);
        setError(err instanceof Error ? err.message : 'Session check failed');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const login = useCallback(async (phoneNumber: string, password: string) => {
    setAuthenticating(true);

    try {
      setError(null);
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
      if (!normalizedPhoneNumber) {
        throw new Error('Phone number is required');
      }

      if (!isValidPhoneNumber(normalizedPhoneNumber)) {
        throw new Error('Phone number must be + followed by nine digits');
      }

      const authEmail = buildAuthEmailFromPhone(normalizedPhoneNumber);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from auth');

      const profiles = await fetchProfiles(authData.user.id);
      const selectedStoreId = buildSelectedStoreId(authData.user.id, profiles);
      const authUser = buildAuthUser(authData.user, profiles, selectedStoreId);

      setUser(authUser);
      return { user: authUser, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setUser(null);
      return { user: null, error: errorMessage };
    } finally {
      setAuthenticating(false);
    }
  }, [fetchProfiles]);

  const logout = useCallback(async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setAuthenticating(true);

    try {
      setError(null);

      const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber);
      if (!normalizedPhoneNumber) {
        throw new Error('Phone number is required');
      }

      if (!isValidPhoneNumber(normalizedPhoneNumber)) {
        throw new Error('Phone number must be + followed by nine digits');
      }

      const normalizedStoreNumber = input.storeNumber.trim();
      if (!isPositiveInteger(normalizedStoreNumber)) {
        throw new Error('Store number must be a positive integer');
      }

      const fullName = `${input.ownerName.trim()} ${input.ownerSurname.trim()}`.trim();
      const authEmail = buildAuthEmailFromPhone(normalizedPhoneNumber);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authEmail,
        password: input.password,
        options: {
          data: {
            role: input.role,
            full_name: fullName,
            store_name: input.storeName.trim(),
            store_number: Number(normalizedStoreNumber),
            store_phone: normalizedPhoneNumber,
            owner_name: input.ownerName.trim(),
            owner_surname: input.ownerSurname.trim(),
            contact_email: input.email?.trim() || '',
            phone_number: normalizedPhoneNumber,
            employee_number: input.employeeNumber?.trim() || '',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from auth');

      const authUser = buildAuthUser(authData.user, [createFallbackProfile(authData.user.id, {
        role: input.role,
        full_name: fullName,
        store_name: input.storeName.trim(),
        store_number: normalizedStoreNumber,
        store_phone: normalizedPhoneNumber,
        owner_name: input.ownerName.trim(),
        owner_surname: input.ownerSurname.trim(),
      })], null);

      setUser(authUser);
      return { user: authUser, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return { user: null, error: errorMessage };
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const selectStore = useCallback((storeId: string) => {
    setUser((current) => {
      if (!current) {
        return current;
      }

      const selectedProfile = current.profiles.find((profile) => profile.store_id === storeId) ?? null;
      if (!selectedProfile) {
        return current;
      }

      try {
        window.localStorage.setItem(`notiflo:selected-store:${current.auth_user_id}`, storeId);
      } catch {
        // Ignore storage access issues.
      }

      return {
        ...current,
        profile: selectedProfile,
        selectedStoreId: storeId,
        display_name: toDisplayName(current as unknown as UserMetadata, selectedProfile, current.email),
      };
    });
  }, []);

  return {
    user,
    loading,
    authenticating,
    error,
    login,
    register,
    logout,
    selectStore,
    isAuthenticated: !!user,
  };
}
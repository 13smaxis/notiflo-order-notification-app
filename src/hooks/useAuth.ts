
import { useState, useEffect, useCallback } from 'react';
import { apiUrl, sendServerEvent } from '@/lib/api';
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
  accessToken: string | null;
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

const normalizePhoneNumber = (phoneNumber: string) => phoneNumber.trim();

function isValidPhoneNumber(phoneNumber: string): boolean {
  return /^0\d{9}$/.test(phoneNumber.trim());
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

type AuthApiUser = {
  id: string;
  email: string | null;
  user_metadata: UserMetadata;
};

function buildAuthUser(user: AuthApiUser, profiles: Profile[], selectedStoreId: string | null, accessToken: string | null): AuthUser {
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
    accessToken,
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
    const storedToken = window.localStorage.getItem('auth_token');
    const response = await fetch(apiUrl('/api/auth/session'), {
      headers: { Authorization: `Bearer ${storedToken || ''}` },
    });

    if (!response.ok) {
      throw new Error('Failed to load profile');
    }

    const sessionData = await response.json();
    if (sessionData.user?.id !== authUserId) {
      throw new Error('Session user does not match');
    }

    return sessionData.profiles || [];
  }, []);

  const hydrateUser = useCallback(async (accessToken: string | null) => {
    if (!accessToken) {
      setUser(null);
      setError(null);
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/auth/session'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sessionData = response.ok ? await response.json() : null;

      if (!response.ok || !sessionData?.user) {
        throw new Error('Invalid or expired session');
      }

      const profiles = sessionData.profiles || [];
      const selectedStoreId = buildSelectedStoreId(sessionData.user.id, profiles);
      setUser(buildAuthUser(sessionData.user, profiles, selectedStoreId, accessToken));
      setError(null);
    } catch (err: unknown) {
      console.error('Profile hydration error:', err);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        setLoading(true);
        const storedToken = window.localStorage.getItem('auth_token');
        if (!storedToken) {
          if (isMounted) setUser(null);
          return;
        }

        await hydrateUser(storedToken);
      } catch (err: unknown) {
        console.error('Session check error:', err);
        if (isMounted) setError(err instanceof Error ? err.message : 'Session check failed');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void checkSession();
    return () => { isMounted = false; };
  }, [hydrateUser]);

  const login = useCallback(async (phoneNumber: string, password: string, storeId?: string) => {
    setAuthenticating(true);

    try {
      setError(null);
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
      if (!normalizedPhoneNumber) {
        throw new Error('Phone number is required');
      }

      if (!isValidPhoneNumber(normalizedPhoneNumber)) {
        throw new Error('Phone number must be 0 followed by nine digits');
      }

      if (!storeId) {
        throw new Error('Store selection is required');
      }

      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhoneNumber, storeId, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const authUser = buildAuthUser(data.user, [data.profile], data.profile.storeId, data.session.access_token);
      localStorage.setItem('auth_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('selected_store', data.profile.storeId);
      setUser(authUser);
      void sendServerEvent(authUser.accessToken, 'auth.login.completed', {
        storeId: data.profile.storeId,
      });
      return { user: authUser, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setUser(null);
      return { user: null, error: errorMessage };
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('selected_store');
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
        throw new Error('Phone number must be 0 followed by nine digits');
      }

      const normalizedStoreNumber = input.storeNumber.trim();
      if (!isPositiveInteger(normalizedStoreNumber)) {
        throw new Error('Store number must be a positive integer');
      }

      const fullName = `${input.ownerName.trim()} ${input.ownerSurname.trim()}`.trim();
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizedPhoneNumber,
          password: input.password,
          ownerName: input.ownerName.trim(),
          ownerSurname: input.ownerSurname.trim(),
          storeName: input.storeName.trim(),
          storeNumber: normalizedStoreNumber,
          role: input.role,
          employeeNumber: input.employeeNumber?.trim() || '',
          contactEmail: input.email?.trim() || '',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const authUser = buildAuthUser(data.user, data.profiles || [], null, data.session?.access_token ?? null);
      localStorage.setItem('auth_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('selected_store', data.profiles?.[0]?.store_id || '');
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

  const refreshProfiles = useCallback(async () => {
    if (!user) return;
    
    try {
      const profiles = await fetchProfiles(user.auth_user_id);
      const selectedStoreId = user.selectedStoreId || buildSelectedStoreId(user.auth_user_id, profiles);
      
      setUser((current) => {
        if (!current) return current;
        return buildAuthUser(
          { id: current.auth_user_id, email: current.email, user_metadata: {} } as AuthApiUser,
          profiles,
          selectedStoreId,
          current.accessToken
        );
      });
    } catch (err) {
      console.error('Failed to refresh profiles:', err);
    }
  }, [user, fetchProfiles]);

  return {
    user,
    loading,
    authenticating,
    error,
    login,
    register,
    logout,
    selectStore,
    refreshProfiles,
    isAuthenticated: !!user,
  };
}
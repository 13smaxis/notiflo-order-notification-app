
import { createClient } from '@supabase/supabase-js';
import { logEvent } from './logger.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Look up user by phone number
 * Returns user ID + all stores linked to that phone
 * 
 * @param {string} phone - Phone number (0XXXXXXXXX format)
 * @returns {Promise<{userId: string, stores: Array}>}
 */
export const lookupPhoneNumber = async (phone, { requestId } = {}) => {
  try {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Invalid phone number');
    }

    const normalizedPhone = phone.replace(/[\s\-()]/g, '').trim();
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      throw new Error('Phone must be in format 0XXXXXXXXX');
    }

    // Step 1: Search for user by phone in auth metadata
    logEvent('info', 'auth.phone_lookup.started', { requestId });

    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Auth lookup failed: ${listError.message}`);
    }

    // listUsers returns { users: [...] }
    const users = data?.users || [];

    if (!Array.isArray(users)) {
      throw new Error('Invalid users response from auth');
    }

    // Find user(s) with matching phone
    const matchingUser = users.find((user) => {
      const userPhone = user.user_metadata?.phone_number || user.user_metadata?.store_phone;
      return userPhone === normalizedPhone;
    });

    if (!matchingUser) {
      logEvent('info', 'auth.phone_lookup.user_not_found', { requestId });
      return {
        found: false,
        message: 'Phone number not found',
      };
    }

    // Step 2: Get all stores linked to this user
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profile')
      .select('store_id, role')
      .eq('auth_user_id', matchingUser.id);

    if (profileError) {
      throw new Error(`Profile lookup failed: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      logEvent('info', 'auth.phone_lookup.no_stores', {
        requestId,
        userId: matchingUser.id,
      });
      return {
        found: false,
        message: 'No stores found for this phone number',
      };
    }

    // Fetch stores separately (bypass RLS issue)
    const storeIds = profiles.map(p => p.store_id);
    const { data: stores, error: storeError } = await supabaseAdmin
      .from('store')
      .select('store_id, store_number, store_name, store_phone')
      .in('store_id', storeIds);

    if (storeError) {
      throw new Error(`Store lookup failed: ${storeError.message}`);
    }

    logEvent('info', 'auth.phone_lookup.stores_loaded', {
      requestId,
      userId: matchingUser.id,
      storeCount: profiles.length,
    });

    return {
      found: true,
      userId: matchingUser.id,
      phone: normalizedPhone,
      stores: profiles.map((profile) => {
        const store = stores?.find(s => s.store_id === profile.store_id);
        return {
          storeId: profile.store_id,
          storeName: store?.store_name || 'Unknown Store',
          storeNumber: store?.store_number || 0,
          storePhone: store?.store_phone || '',
          role: profile.role,
        };
      }),
    };
  } catch (error) {
    logEvent('error', 'auth.phone_lookup.failed', {
      requestId,
      errorCode: error.code,
      errorType: error.name,
    });
    throw error;
  }
};

/**
 * Verify password for phone number
 * Must be called AFTER store selection
 * 
 * @param {string} phone - Phone number
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, session: Object}>}
 */
export const verifyPassword = async (phone, password, { requestId } = {}) => {
  try {
    if (!phone || !password) {
      throw new Error('Phone and password are required');
    }

    const normalizedPhone = phone.replace(/[\s\-()]/g, '').trim();
    const email = `${normalizedPhone}@phone.notiflo.local`;

    logEvent('info', 'auth.password_verification.started', { requestId });

    // Attempt login
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logEvent('warn', 'auth.password_verification.rejected', {
        requestId,
        errorCode: error.code,
      });
      return {
        success: false,
        error: 'Invalid password',
      };
    }

    if (!data.user || !data.session) {
      throw new Error('No session returned from auth');
    }

    logEvent('info', 'auth.password_verification.completed', {
      requestId,
      userId: data.user.id,
    });

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        phone: normalizedPhone,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
      },
    };
  } catch (error) {
    logEvent('error', 'auth.password_verification.failed', {
      requestId,
      errorCode: error.code,
      errorType: error.name,
    });
    throw error;
  }
};

/**
 * Create authenticated session with selected store
 * Called after password verification
 * 
 * @param {string} userId - User ID
 * @param {string} storeId - Selected store ID
 * @returns {Promise<{success: boolean, profile: Object}>}
 */
export const selectStore = async (userId, storeId, { requestId } = {}) => {
  try {
    if (!userId || !storeId) {
      throw new Error('User ID and Store ID are required');
    }

    logEvent('info', 'auth.store_selection.started', { requestId, userId, storeId });

    // Get profile for this user + store combination
    const { data: profile, error } = await supabaseAdmin
      .from('profile')
      .select(`
        auth_user_id,
        store_id,
        role,
        store:store_id (
          store_id,
          store_number,
          store_name,
          store_phone
        )
      `)
      .eq('auth_user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (error || !profile) {
      throw new Error('Store not found for this user');
    }

    logEvent('info', 'auth.store_selection.completed', { requestId, userId, storeId });

    return {
      success: true,
      profile: {
        authUserId: profile.auth_user_id,
        storeId: profile.store_id,
        storeName: profile.store?.store_name,
        storeNumber: profile.store?.store_number,
        storePhone: profile.store?.store_phone,
        role: profile.role,
      },
    };
  } catch (error) {
    logEvent('error', 'auth.store_selection.failed', {
      requestId,
      userId,
      storeId,
      errorCode: error.code,
      errorType: error.name,
    });
    throw error;
  }
};

export default {
  lookupPhoneNumber,
  verifyPassword,
  selectStore,
};
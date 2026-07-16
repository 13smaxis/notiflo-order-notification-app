
import { createClient } from '@supabase/supabase-js';

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
export const lookupPhoneNumber = async (phone) => {
  try {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Invalid phone number');
    }

    const normalizedPhone = phone.replace(/[\s\-()]/g, '').trim();
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      throw new Error('Phone must be in format 0XXXXXXXXX');
    }

    // Step 1: Search for user by phone in auth metadata
    console.log(`🔍 Looking up phone: ${normalizedPhone}`);

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
      return {
        found: false,
        message: 'Phone number not found',
      };
    }

    // Step 2: Get all stores linked to this user
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profile')
      .select(`
        store_id,
        role,
        store:store_id (
          store_id,
          store_number,
          store_name,
          store_phone
        )
      `)
      .eq('auth_user_id', matchingUser.id);

    if (profileError) {
      throw new Error(`Profile lookup failed: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return {
        found: false,
        message: 'No stores found for this phone number',
      };
    }

    console.log('🔍 Raw profiles:', JSON.stringify(profiles, null, 2));
    console.log(`✅ Found user ${matchingUser.id} with ${profiles.length} store(s)`);


    return {
      found: true,
      userId: matchingUser.id,
      phone: normalizedPhone,
      stores: profiles.map((profile) => ({
        storeId: profile.store_id,
        storeName: profile.store?.store_name || 'Unknown Store',
        storeNumber: profile.store?.store_number,
        storePhone: profile.store?.store_phone,
        role: profile.role,
      })),
    };
  } catch (error) {
    console.error('❌ Phone lookup error:', error.message);
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
export const verifyPassword = async (phone, password) => {
  try {
    if (!phone || !password) {
      throw new Error('Phone and password are required');
    }

    const normalizedPhone = phone.replace(/[\s\-()]/g, '').trim();
    const email = `${normalizedPhone}@phone.notiflo.local`;

    console.log(`🔐 Verifying password for ${normalizedPhone}`);

    // Attempt login
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`❌ Password verification failed: ${error.message}`);
      return {
        success: false,
        error: 'Invalid password',
      };
    }

    if (!data.user || !data.session) {
      throw new Error('No session returned from auth');
    }

    console.log(`✅ Password verified for user ${data.user.id}`);

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
    console.error('❌ Password verification error:', error.message);
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
export const selectStore = async (userId, storeId) => {
  try {
    if (!userId || !storeId) {
      throw new Error('User ID and Store ID are required');
    }

    console.log(`🏪 Selecting store ${storeId} for user ${userId}`);

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

    console.log(`✅ Store selected: ${profile.store?.store_name}`);

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
    console.error('❌ Store selection error:', error.message);
    throw error;
  }
};

export default {
  lookupPhoneNumber,
  verifyPassword,
  selectStore,
};
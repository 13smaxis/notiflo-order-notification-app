/*
 * Backend Server for NotiFlo Order Notification App - WITH SMS FALLBACK
    * ==================================================================================================
    * This server handles API requests for the NotiFlo application, 
    * including WhatsApp notifications with SMS fallback.
    * ==================================================================================================
    * Author: SM-AX
    * Date: 2026-07-08
    * Version: 2.0.0 (with SMS fallback)
    * ==================================================================================================
    * Environment Variables:
    * - SUPABASE_URL: Your Supabase project URL
    * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase Service Role Key
    * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
    * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
    * - TWILIO_PHONE_NUMBER: Your Twilio phone number for SMS
    * - TWILIO_WHATSAPP_NUMBER: Your Twilio WhatsApp number for WhatsApp messages
    * - PORT: The port on which the server will run (default: 3000)
    * ==================================================================================================
*/
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'
import { createClient } from '@supabase/supabase-js';
import { processPendingWhatsAppNotifications } from './services/whatsapp.js';
import { processPendingSMSNotifications } from './services/sms.js';
import { lookupPhoneNumber, verifyPassword, selectStore } from './services/auth.js';
import { logEvent } from './services/logger.js';
import { requestLogger } from './services/request-logger.js';
import { normalizeClientEvent } from './services/client-events.js';
import { ensureDefaultOrderStatuses } from './services/order-status.js';
import { getErrorMessage } from './services/error-utils.js';

dotenv.config();
const app = express();

app.use(requestLogger);

// CORS configuration for both local and production
const frontendOrigin = (
    process.env.FRONTEND_URL || 'https://notiflo-order-notification-app.vercel.app'
).replace(/\/+$/, '');
const corsOrigin = process.env.NODE_ENV === 'production'
    ? frontendOrigin
    : 'http://localhost:8080';

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);                                                                                                                               //- Create Supabase client with service role key for admin access

/*
 * Health check endpoint to verify server and Supabase connection status.
 * GET /health
 * Response: JSON object with server status and Supabase connection status.
 */
app.get('/health', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('order_status')                                                                                                 //- Checking the 'order_status' table to ensure Supabase connection is active
            .select('count', { count: 'exact' })                                                                                  //- Requesting an exact count of rows in the 'order_status' table
            .single();                                                                                                            //- .single() ensures we get a single row, which is useful for health checks.

        if (error) {
            logEvent('error', 'health.check.failed', {
                requestId: req.requestId,
                errorCode: error.code,
            });
            return res.status(500).json({
                status: 'error',
                message: 'Supabase connection failed',
                error: error.message
            });                                                                                                                   //- If there's an error connecting to Supabase, return a 500 status
        }

        logEvent('info', 'health.check.completed', {
            requestId: req.requestId,
            supabaseConnected: true,
        });
        res.json({
            status: 'ok',
            message: 'Server is running',
            supabaseAdmin: 'connected',
            timestamp: new Date().toISOString()
        });                                                                                                                       // - Else return server is running and Supabase is connected, along with a timestamp.

    } catch (err) {
        logEvent('error', 'health.check.failed', {
            requestId: req.requestId,
            errorCode: err.code,
        });
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: err.message
        });                                                                                                                       //- Catch any unexpected errors and return a 500 status
    }
});


/*
 * TEST ENDPOINT: Get pending notifications
 * GET /notifications/pending
 * Response: JSON object with pending notifications.
 */
app.get('/notifications/pending', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin                                                                               //- Query the 'notification' table in Supabase to fetch pending notifications
            .from('notification')
            .select(`
                        notification_id,
                        order_id,
                        channel,
                        message_text,
                        delivery_status,
                        created_at
                    `)
            .eq('delivery_status', 'pending')                                                                                     //- Filter to only include notifications with a delivery status of 'pending'
            .limit(10)                                                                                                            //- Limit the results to 10 notifications to avoid overwhelming the client
            .order('created_at', { ascending: true });                                                                            //- Order the results by creation date in ascending order to process older notifications first

        if (error) {
            logEvent('error', 'notifications.pending_lookup.failed', {
                requestId: req.requestId,
                errorCode: error.code,
            });
            return res.status(500).json({ error: error.message });                                                                //- If there's an error fetching pending notifications, return a 500 status
        }

        logEvent('info', 'notifications.pending_lookup.completed', {
            requestId: req.requestId,
            count: data.length,
        });
        res.json({
            count: data.length,
            notifications: data
        });                                                                                                                       //- Else return the count of pending notifications and the notification data itself in JSON format

    } catch (err) {
        logEvent('error', 'notifications.pending_lookup.failed', {
            requestId: req.requestId,
            errorCode: err.code,
        });
        res.status(500).json({ error: err.message });
    }
});


/*
 * AUTO-POLLING FUNCTIONS
 * Process notifications in the background every 30 seconds
 */

const startWhatsAppPoller = () => {
    logEvent('info', 'notifications.poller.started', { channel: 'whatsapp', intervalMs: 30000 });

    setInterval(async () => {
        try {
            const results = await processPendingWhatsAppNotifications(supabaseAdmin);
            logEvent(results.errors.length ? 'warn' : 'info', 'notifications.poller.completed', {
                channel: 'whatsapp',
                processed: results.processed,
                sent: results.sent,
                failed: results.failed,
                fallbacksCreated: results.fallbacks_created,
                errorCount: results.errors.length,
            });
        } catch (error) {
            logEvent('error', 'notifications.poller.failed', {
                channel: 'whatsapp',
                errorCode: error.code,
            });
        }
    }, 30000); // 30 seconds
};


const startSMSPoller = () => {
    logEvent('info', 'notifications.poller.started', { channel: 'sms', intervalMs: 30000 });

    setInterval(async () => {
        try {
            const results = await processPendingSMSNotifications(supabaseAdmin);
            logEvent(results.errors.length ? 'warn' : 'info', 'notifications.poller.completed', {
                channel: 'sms',
                processed: results.processed,
                sent: results.sent,
                failed: results.failed,
                errorCount: results.errors.length,
            });
        } catch (error) {
            logEvent('error', 'notifications.poller.failed', {
                channel: 'sms',
                errorCode: error.code,
            });
        }
    }, 30000); // 30 seconds
};


/*
 * AUTHENTICATION MIDDLEWARE
 * Verify JWT token from Authorization header
 */
const verifyAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer '))                                                                     //- Check if the Authorization header is present and starts with 'Bearer '
        {
            logEvent('warn', 'auth.token.missing', { requestId: req.requestId });
            return res.status(401).json({ error: 'Missing or invalid authorization header' });                                    //- If not, return a 401 Unauthorized status with an error message
        }

        const token = authHeader.replace('Bearer ', '');                                                                          //- Extract the token from the Authorization header by removing the 'Bearer ' prefix
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);                                                //- Use Supabase Admin client to verify the token and retrieve the user associated with it

        if (error || !user) {
            logEvent('warn', 'auth.token.invalid', {
                requestId: req.requestId,
                errorCode: error?.code,
            });
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = user;                                                                                                          //- Attach user to request object
        logEvent('info', 'auth.token.verified', {
            requestId: req.requestId,
            userId: user.id,
        });
        next();
    } catch (err) {
        logEvent('error', 'auth.token.verification_failed', {
            requestId: req.requestId,
            errorCode: err.code,
        });
        res.status(401).json({ error: 'Authentication failed', details: err.message });
    }
};

app.post('/api/events', verifyAuth, (req, res) => {
    const event = normalizeClientEvent({
        eventType: req.body?.eventType,
        metadata: req.body?.metadata,
        userId: req.user.id,
    });

    if (!event) {
        logEvent('warn', 'client_event.rejected', {
            requestId: req.requestId,
            userId: req.user.id,
            reason: 'unsupported_event',
        });
        return res.status(400).json({ error: 'Unsupported event' });
    }

    const { eventType, ...fields } = event;
    logEvent('info', eventType, { requestId: req.requestId, ...fields });
    res.status(202).json({ accepted: true });
});

app.post('/api/order-status/ensure-defaults', verifyAuth, async (req, res) => {
    try {
        const statuses = await ensureDefaultOrderStatuses(supabaseAdmin);
        logEvent('info', 'order_status.defaults.ensured', {
            requestId: req.requestId,
            userId: req.user.id,
            statusCount: statuses.length,
        });
        res.json({ statuses });
    } catch (error) {
        logEvent('error', 'order_status.defaults.ensure_failed', {
            requestId: req.requestId,
            userId: req.user.id,
            errorCode: error.code,
            errorType: error.name,
        });
        res.status(500).json({ error: 'Unable to prepare order statuses' });
    }
});

app.get('/api/dashboard/stores', verifyAuth, async (req, res) => {
    try {
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profile')
            .select('store_id, role')
            .eq('auth_user_id', req.user.id);

        if (profileError) throw profileError;

        if (!profiles?.some((profile) => profile.role?.toLowerCase() === 'owner')) {
            return res.status(403).json({ error: 'Owner access is required' });
        }

        const storeIds = [...new Set(profiles.map((profile) => profile.store_id).filter(Boolean))];
        if (storeIds.length === 0) {
            return res.json({ stores: [] });
        }

        const { data: stores, error: storeError } = await supabaseAdmin
            .from('store')
            .select('store_id, store_name')
            .in('store_id', storeIds);

        if (storeError) throw storeError;

        logEvent('info', 'dashboard.stores.loaded', {
            requestId: req.requestId,
            userId: req.user.id,
            storeCount: stores?.length || 0,
        });
        res.json({ stores: stores || [] });
    } catch (error) {
        logEvent('error', 'dashboard.stores.load_failed', {
            requestId: req.requestId,
            userId: req.user.id,
            errorCode: error.code,
            errorType: error.name,
        });
        res.status(500).json({ error: 'Unable to load store names' });
    }
});


/*
 * Start the server and listen on the specified port.
 * Logs server status, port, environment, and Supabase connection status to the console.
 */
const PORT = process.env.PORT || 3000;                                                                                            //- Use the PORT from environment variables or default to 3000

app.listen(PORT, () => {
    logEvent('info', 'server.started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    });

    startWhatsAppPoller();                                                                                                        //- Start the WhatsApp notification poller to process pending notifications every 30 seconds  
    startSMSPoller();                                                                                                             //- Start the SMS notification poller to send SMS fallback messages
});


/*
 * Process all pending WhatsApp notifications using this endpoint
 * POST /notifications/process-whatsapp
 */
app.post('/notifications/process-whatsapp', async (req, res) => {
    try {
        const results = await processPendingWhatsAppNotifications(supabaseAdmin);
        logEvent('info', 'notifications.manual_processing.completed', {
            requestId: req.requestId,
            channel: 'whatsapp',
            processed: results.processed,
            sent: results.sent,
            failed: results.failed,
            fallbacksCreated: results.fallbacks_created,
        });
        res.json({
            message: 'WhatsApp notifications processed',
            results
        });
    } catch (error) {
        logEvent('error', 'notifications.manual_processing.failed', {
            requestId: req.requestId,
            channel: 'whatsapp',
            errorCode: error.code,
        });
        res.status(500).json({ error: error.message });
    }
});


/*
 * Process all pending SMS notifications using this endpoint
 * POST /notifications/process-sms
 */
app.post('/notifications/process-sms', async (req, res) => {
    try {
        const results = await processPendingSMSNotifications(supabaseAdmin);
        logEvent('info', 'notifications.manual_processing.completed', {
            requestId: req.requestId,
            channel: 'sms',
            processed: results.processed,
            sent: results.sent,
            failed: results.failed,
        });
        res.json({
            message: 'SMS notifications processed',
            results
        });
    } catch (error) {
        logEvent('error', 'notifications.manual_processing.failed', {
            requestId: req.requestId,
            channel: 'sms',
            errorCode: error.code,
        });
        res.status(500).json({ error: error.message });
    }
});


/*
 * PHONE + PASSWORD LOGIN ENDPOINT
 * POST /api/auth/login-with-phone
 * Login using phone number and password
 */
app.post('/api/auth/login-with-phone', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        if (!phoneNumber || !password) {
            logEvent('warn', 'auth.phone_login.validation_failed', {
                requestId: req.requestId,
                reason: 'required_fields_missing',
            });
            return res.status(400).json({
                error: 'Phone number and password are required'
            });
        }

        // Normalize phone
        const normalizedPhone = String(phoneNumber).replace(/[\s\-()]/g, '').trim();
        const email = `${normalizedPhone}@phone.notiflo.local`;

        // Login with Supabase
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            logEvent('warn', 'auth.phone_login.rejected', {
                requestId: req.requestId,
                errorCode: error.code,
            });
            return res.status(401).json({
                error: 'Invalid phone or password'
            });
        }

        logEvent('info', 'auth.phone_login.completed', {
            requestId: req.requestId,
            userId: data.user.id,
        });
        res.json({
            success: true,
            user: data.user,
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in,
            },
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        logEvent('error', 'auth.phone_login.failed', {
            requestId: req.requestId,
            errorCode: err.code,
        });
        res.status(500).json({
            error: 'Login failed',
            details: err.message
        });
    }
});


/*
 * SESSION ENDPOINT
 * GET /api/auth/session
 * Returns the authenticated user and profile data from the server token.
 */
app.get('/api/auth/session', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            logEvent('warn', 'auth.session.invalid', {
                requestId: req.requestId,
                errorCode: userError?.code,
            });
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profile')
            .select('*')
            .eq('auth_user_id', user.id)
            .order('created_at', { ascending: true });

        if (profileError) {
            logEvent('error', 'auth.session.profile_load_failed', {
                requestId: req.requestId,
                userId: user.id,
                errorCode: profileError.code,
                errorMessage: profileError.message,
            });
            return res.status(500).json({ error: 'Failed to load profile' });
        }

        logEvent('info', 'auth.session.completed', {
            requestId: req.requestId,
            userId: user.id,
            profileCount: profiles?.length || 0,
        });

        res.json({
            user,
            profiles: profiles || [],
            session: {
                access_token: token,
                refresh_token: null,
                expires_in: null,
            },
        });
    } catch (error) {
        logEvent('error', 'auth.session.failed', {
            requestId: req.requestId,
            errorCode: error.code,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
        });
        res.status(500).json({ error: 'Session validation failed' });
    }
});

/*
 * REGISTER ENDPOINT
 * POST /api/auth/register
 * Register a new user with phone + password
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { phoneNumber, password, ownerName, ownerSurname, storeName, storeNumber } = req.body;

        logEvent('info', 'auth.registration.request_received', {
            requestId: req.requestId,
            hasPhoneNumber: Boolean(phoneNumber),
            hasPassword: Boolean(password),
            hasOwnerName: Boolean(ownerName),
            hasOwnerSurname: Boolean(ownerSurname),
            hasStoreName: Boolean(storeName),
            hasStoreNumber: Boolean(storeNumber),
        });

        if (!phoneNumber || !password) {
            logEvent('warn', 'auth.registration.validation_failed', {
                requestId: req.requestId,
                reason: 'required_fields_missing',
                hasPhoneNumber: Boolean(phoneNumber),
                hasPassword: Boolean(password),
            });
            return res.status(400).json({
                error: 'Phone number and password are required'
            });
        }

        // Normalize phone
        const normalizedPhone = String(phoneNumber).replace(/[\s\-()]/g, '').trim();
        const email = `${normalizedPhone}@phone.notiflo.local`;

        logEvent('info', 'auth.registration.phone_normalized', {
            requestId: req.requestId,
            phoneLength: normalizedPhone.length,
            isPhoneNormalized: normalizedPhone !== String(phoneNumber).trim(),
        });

        // Create user with metadata
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: {
                phone_number: normalizedPhone,
                owner_name: ownerName,
                owner_surname: ownerSurname,
                store_name: storeName,
                store_number: storeNumber,
                role: 'owner',
            },
            email_confirm: true, // Auto-confirm email
        });

        if (error) {
            const errorMessage = getErrorMessage(error, 'Registration failed');
            logEvent('error', 'auth.registration.supabase_rejected', {
                requestId: req.requestId,
                errorCode: error.code,
                errorMessage,
                errorStatus: error.status,
                errorName: error.name,
                emailDomain: email.split('@')[1],
            });
            return res.status(400).json({
                error: errorMessage
            });
        }

        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError || !signInData.user || !signInData.session) {
            logEvent('error', 'auth.registration.session_failed', {
                requestId: req.requestId,
                userId: data.user.id,
                errorCode: signInError?.code,
                errorMessage: signInError?.message,
            });
            return res.status(500).json({ error: 'Registration completed but session creation failed' });
        }

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profile')
            .select('*')
            .eq('auth_user_id', data.user.id)
            .order('created_at', { ascending: true });

        if (profileError) {
            logEvent('error', 'auth.registration.profile_load_failed', {
                requestId: req.requestId,
                userId: data.user.id,
                errorCode: profileError.code,
                errorMessage: profileError.message,
            });
            return res.status(500).json({ error: 'Registration completed but profile lookup failed' });
        }

        logEvent('info', 'auth.registration.completed', {
            requestId: req.requestId,
            userId: data.user.id,
            emailDomain: email.split('@')[1],
            profileCount: profiles?.length || 0,
        });
        res.status(201).json({
            success: true,
            user: signInData.user,
            session: {
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
                expires_in: signInData.session.expires_in,
            },
            profiles: profiles || [],
            message: 'User registered successfully',
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        const errorMessage = getErrorMessage(err, 'Registration failed');
        logEvent('error', 'auth.registration.failed', {
            requestId: req.requestId,
            errorCode: err?.code,
            errorName: err?.name,
            errorMessage,
            errorStack: err?.stack,
        });
        res.status(500).json({
            error: errorMessage,
            details: errorMessage
        });
    }
});


/*
 * ADD STORE ENDPOINT
 * POST /api/add-store
 * Allows existing authenticated users to add additional stores
 * Body: { storeNumber, storeName, storePhone, role? }
 */
app.post('/api/add-store', verifyAuth, async (req, res) => {
    try {
        const { storeNumber, storeName, storePhone, role } = req.body;

        if (!storeNumber || !storeName || !storePhone)                                                                            //- Check if required fields are missing
        {
            logEvent('warn', 'store.creation.validation_failed', {
                requestId: req.requestId,
                userId: req.user.id,
                reason: 'required_fields_missing',
            });
            return res.status(400).json({
                error: 'Missing required fields: storeNumber, storeName, storePhone'
            });
        }

        if (!/^[1-9]\d*$/.test(String(storeNumber).trim()))                                                                       //- Validate that storeNumber is a positive integer
        {
            logEvent('warn', 'store.creation.validation_failed', {
                requestId: req.requestId,
                userId: req.user.id,
                reason: 'invalid_store_number',
            });
            return res.status(400).json({
                error: 'Store number must be a positive integer'
            });
        }

        const { data, error } = await supabaseAdmin.rpc(
            'add_store_to_user',
            {
                p_auth_user_id: req.user.id,
                p_store_number: String(storeNumber).trim(),
                p_store_name: storeName.trim(),
                p_store_phone: storePhone.trim(),
                p_role: role || 'owner',
            });                                                                                                                       //- Call the Supabase RPC function to add the store to the authenticated user

        if (error) {
            logEvent('error', 'store.creation.failed', {
                requestId: req.requestId,
                userId: req.user.id,
                errorCode: error.code,
            });
            return res.status(400).json({
                error: error.message
            });
        }

        logEvent('info', 'store.creation.completed', {
            requestId: req.requestId,
            userId: req.user.id,
            storeId: data,
        });
        res.status(201).json({
            success: true,
            message: 'Store added successfully',
            storeId: data,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        logEvent('error', 'store.creation.failed', {
            requestId: req.requestId,
            userId: req.user?.id,
            errorCode: err.code,
        });
        res.status(500).json({
            error: 'Failed to add store',
            details: err.message
        });
    }
});

app.get('/api/stores/:storeId/discovery', verifyAuth, async (req, res) => {
    try {
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profile')
            .select('store_id, role')
            .eq('auth_user_id', req.user.id)
            .eq('store_id', req.params.storeId);

        if (profileError) throw profileError;
        if (!profiles?.some((profile) => profile.role?.toLowerCase() === 'owner')) {
            return res.status(403).json({ error: 'Owner access to this store is required' });
        }

        const { data: store, error: storeError } = await supabaseAdmin
            .from('store')
            .select('store_id, cuisine, estimated_delivery_minutes, latitude, longitude')
            .eq('store_id', req.params.storeId)
            .maybeSingle();

        if (storeError) throw storeError;
        if (!store) return res.status(404).json({ error: 'Store not found' });
        res.json({ store });
    } catch (error) {
        logEvent('error', 'store.discovery.load_failed', {
            requestId: req.requestId,
            userId: req.user.id,
            errorCode: error.code,
        });
        res.status(500).json({ error: 'Unable to load restaurant listing details' });
    }
});

app.put('/api/stores/:storeId/discovery', verifyAuth, async (req, res) => {
    try {
        const { cuisine, estimatedDeliveryMinutes, latitude, longitude } = req.body || {};
        const validOptionalNumber = (value) => value === null || (typeof value === 'number' && Number.isFinite(value));
        if (typeof cuisine !== 'string' || cuisine.trim().length > 80
            || !validOptionalNumber(estimatedDeliveryMinutes)
            || !validOptionalNumber(latitude)
            || !validOptionalNumber(longitude)
            || (estimatedDeliveryMinutes !== null && (estimatedDeliveryMinutes < 1 || estimatedDeliveryMinutes > 240 || !Number.isInteger(estimatedDeliveryMinutes)))
            || ((latitude === null) !== (longitude === null))
            || (latitude !== null && (latitude < -90 || latitude > 90))
            || (longitude !== null && (longitude < -180 || longitude > 180))) {
            return res.status(400).json({ error: 'Enter valid cuisine, delivery estimate, and paired coordinates.' });
        }

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profile')
            .select('store_id, role')
            .eq('auth_user_id', req.user.id)
            .eq('store_id', req.params.storeId);

        if (profileError) throw profileError;
        if (!profiles?.some((profile) => profile.role?.toLowerCase() === 'owner')) {
            return res.status(403).json({ error: 'Owner access to this store is required' });
        }

        const { data: store, error: storeError } = await supabaseAdmin
            .from('store')
            .update({
                cuisine: cuisine.trim() || null,
                estimated_delivery_minutes: estimatedDeliveryMinutes,
                latitude,
                longitude,
            })
            .eq('store_id', req.params.storeId)
            .select('store_id, cuisine, estimated_delivery_minutes, latitude, longitude')
            .single();

        if (storeError) throw storeError;
        res.json({ store });
    } catch (error) {
        logEvent('error', 'store.discovery.update_failed', {
            requestId: req.requestId,
            userId: req.user.id,
            errorCode: error.code,
        });
        res.status(500).json({ error: 'Unable to save restaurant listing details' });
    }
});


/*
 * STEP 1: Look up phone number and return available stores
 * POST /api/auth/lookup-phone
 * Body: { phoneNumber: "0627680710" }
 * Response: { found: true, userId: "xxx", stores: [...] }
 */
app.post('/api/auth/lookup-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
 
    if (!phoneNumber) {
            logEvent('warn', 'auth.phone_lookup.validation_failed', {
                requestId: req.requestId,
                reason: 'phone_number_missing',
            });
      return res.status(400).json({
        error: 'Phone number is required',
      });
    }
 
    const result = await lookupPhoneNumber(phoneNumber, { requestId: req.requestId });
 
    if (!result.found) {
            logEvent('info', 'auth.phone_lookup.not_found', {
                requestId: req.requestId,
            });
      return res.status(404).json({
        found: false,
        error: result.message,
      });
    }
 
        logEvent('info', 'auth.phone_lookup.completed', {
            requestId: req.requestId,
            userId: result.userId,
            storeCount: result.stores.length,
        });
        res.json({
      found: true,
      userId: result.userId,
      phone: result.phone,
      stores: result.stores,
    });
  } catch (error) {
        logEvent('error', 'auth.phone_lookup.failed', {
            requestId: req.requestId,
            errorCode: error.code,
        });
    res.status(500).json({
      error: 'Phone lookup failed',
      details: error.message,
    });
  }
});


/*
 * STEP 2: Verify password and return session
 * POST /api/auth/login
 * Body: { phoneNumber: "0627680710", storeId: "xxx", password: "pass" }
 * Response: { success: true, user: {...}, session: {...}, profile: {...} }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phoneNumber, storeId, password } = req.body;
 
    if (!phoneNumber || !storeId || !password) {
            logEvent('warn', 'auth.login.validation_failed', {
                requestId: req.requestId,
                reason: 'required_fields_missing',
            });
      return res.status(400).json({
        error: 'Phone number, store ID, and password are required',
      });
    }
 
    logEvent('info', 'auth.login.started', { requestId: req.requestId });
 
    // Step 1: Verify password
    const passwordResult = await verifyPassword(phoneNumber, password, { requestId: req.requestId });
 
    if (!passwordResult.success) {
            logEvent('warn', 'auth.login.rejected', {
                requestId: req.requestId,
                reason: 'password_verification_failed',
            });
      return res.status(401).json({
        success: false,
        error: passwordResult.error,
      });
    }
 
    // Step 2: Select store
    const storeResult = await selectStore(passwordResult.user.id, storeId, { requestId: req.requestId });
 
    if (!storeResult.success) {
            logEvent('warn', 'auth.login.rejected', {
                requestId: req.requestId,
                userId: passwordResult.user.id,
                reason: 'store_selection_failed',
            });
      return res.status(400).json({
        success: false,
        error: 'Store selection failed',
      });
    }
 
        logEvent('info', 'auth.login.completed', {
            requestId: req.requestId,
            userId: passwordResult.user.id,
            storeId: storeResult.profile.storeId,
        });
    res.json({
      success: true,
      user: passwordResult.user,
      session: passwordResult.session,
      profile: storeResult.profile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
        logEvent('error', 'auth.login.failed', {
            requestId: req.requestId,
            errorCode: error.code,
        });
    res.status(500).json({
      error: 'Login failed',
      details: error.message,
    });
  }
});

export { app, supabaseAdmin };                                                                                                    //- Export for testing
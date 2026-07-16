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

dotenv.config();                                                                                                                  //- Load environment variables
const app = express();                                                                                                            //- Initialize Express

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());                                                                                                          //- Middleware to parse JSON request bodies

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);                                                                                                                                //- Create Supabase client with service role key for admin access

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
            return res.status(500).json({
                status: 'error',
                message: 'Supabase connection failed',
                error: error.message
            });                                                                                                                   //- If there's an error connecting to Supabase, return a 500 status
        }

        res.json({
            status: 'ok',
            message: 'Server is running',
            supabaseAdmin: 'connected',
            timestamp: new Date().toISOString()
        });                                                                                                                       // - Else return server is running and Supabase is connected, along with a timestamp.

    } catch (err) {
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
            return res.status(500).json({ error: error.message });                                                                //- If there's an error fetching pending notifications, return a 500 status
        }

        res.json({
            count: data.length,
            notifications: data
        });                                                                                                                       //- Else return the count of pending notifications and the notification data itself in JSON format

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


/*
 * AUTO-POLLING FUNCTIONS
 * Process notifications in the background every 30 seconds
 */

const startWhatsAppPoller = () => {
    console.log('📱 Starting WhatsApp notification poller (every 30 seconds)...');

    setInterval(async () => {
        try {
            const results = await processPendingWhatsAppNotifications(supabaseAdmin);

            if (results.processed > 0) {
                console.log(`
📊 WhatsApp Poller Results:
   Processed: ${results.processed}
   Sent: ${results.sent}
   Failed: ${results.failed}
        `);
            }
        } catch (error) {
            console.error('❌ WhatsApp Poller error:', error.message);
        }
    }, 30000); // 30 seconds
};


const startSMSPoller = () => {
    console.log('💬 Starting SMS notification poller (every 30 seconds)...');

    setInterval(async () => {
        try {
            const results = await processPendingSMSNotifications(supabaseAdmin);

            if (results.processed > 0) {
                console.log(`
📊 SMS Poller Results:
   Processed: ${results.processed}
   Sent: ${results.sent}
   Failed: ${results.failed}
        `);
            }
        } catch (error) {
            console.error('❌ SMS Poller error:', error.message);
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
            return res.status(401).json({ error: 'Missing or invalid authorization header' });                                    //- If not, return a 401 Unauthorized status with an error message
        }

        const token = authHeader.replace('Bearer ', '');                                                                          //- Extract the token from the Authorization header by removing the 'Bearer ' prefix
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);                                                //- Use Supabase Admin client to verify the token and retrieve the user associated with it

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = user;                                                                                                          //- Attach user to request object
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed', details: err.message });
    }
};


/*
 * Start the server and listen on the specified port.
 * Logs server status, port, environment, and Supabase connection status to the console.
 */
const PORT = process.env.PORT || 3000;                                                                                            //- Use the PORT from environment variables or default to 3000

app.listen(PORT, () => {
    console.log(`
                ╔════════════════════════════════════════╗
                ║   NotiFlo Backend Server Running       ║
                ║   Port: ${PORT}                              ║
                ║   Environment: ${process.env.NODE_ENV || 'development'}        ║
                ║   Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}   ║
                ╚════════════════════════════════════════╝
                
                📍 Health Check: http://localhost:${PORT}/health
                📍 Pending Notifications: http://localhost:${PORT}/notifications/pending
                📍 Endpoints:
                                GET  /health                          → Check server status
                                GET  /notifications/pending           → View pending notifications
                                POST /notifications/process-whatsapp   → Process pending WhatsApp notifications
                                POST /notifications/process-sms        → Process pending SMS notifications

                🔄 Auto-Polling:
                   ✅ WhatsApp (every 30 seconds)
                   ✅ SMS Fallback (every 30 seconds)
    `);

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
        res.json({
            message: 'WhatsApp notifications processed',
            results
        });
    } catch (error) {
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
        res.json({
            message: 'SMS notifications processed',
            results
        });
    } catch (error) {
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
            return res.status(401).json({
                error: 'Invalid phone or password'
            });
        }

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
        console.error('Login error:', err);
        res.status(500).json({
            error: 'Login failed',
            details: err.message
        });
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

        if (!phoneNumber || !password) {
            return res.status(400).json({
                error: 'Phone number and password are required'
            });
        }

        // Normalize phone
        const normalizedPhone = String(phoneNumber).replace(/[\s\-()]/g, '').trim();
        const email = `${normalizedPhone}@phone.notiflo.local`;

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
            return res.status(400).json({
                error: error.message
            });
        }

        res.status(201).json({
            success: true,
            user: data.user,
            message: 'User registered successfully',
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({
            error: 'Registration failed',
            details: err.message
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
 console.log('🔍 /api/add-store called');
 console.log('🔍 User:', req.user?.id);
 console.log('🔍 Body:', req.body);

    try {
        const { storeNumber, storeName, storePhone, role } = req.body;

        if (!storeNumber || !storeName || !storePhone)                                                                            //- Check if required fields are missing
        {
            return res.status(400).json({
                error: 'Missing required fields: storeNumber, storeName, storePhone'
            });
        }

        if (!/^[1-9]\d*$/.test(String(storeNumber).trim()))                                                                       //- Validate that storeNumber is a positive integer
        {
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
            console.error('❌ Add store error:', error);
            return res.status(400).json({
                error: error.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Store added successfully',
            storeId: data,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('❌ Add store request error:', err);
        res.status(500).json({
            error: 'Failed to add store',
            details: err.message
        });
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
      return res.status(400).json({
        error: 'Phone number is required',
      });
    }
 
    console.log(`📱 /api/auth/lookup-phone called with: ${phoneNumber}`);
 
    const result = await lookupPhoneNumber(phoneNumber);
 
    if (!result.found) {
      return res.status(404).json({
        found: false,
        error: result.message,
      });
    }
 
    res.json({
      found: true,
      userId: result.userId,
      phone: result.phone,
      stores: result.stores,
    });
  } catch (error) {
    console.error('❌ Phone lookup endpoint error:', error.message);
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
      return res.status(400).json({
        error: 'Phone number, store ID, and password are required',
      });
    }
 
    console.log(`🔐 /api/auth/login called for phone: ${phoneNumber}`);
 
    // Step 1: Verify password
    const passwordResult = await verifyPassword(phoneNumber, password);
 
    if (!passwordResult.success) {
      return res.status(401).json({
        success: false,
        error: passwordResult.error,
      });
    }
 
    // Step 2: Select store
    const storeResult = await selectStore(passwordResult.user.id, storeId);
 
    if (!storeResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Store selection failed',
      });
    }
 
    console.log(`✅ Login successful for user ${passwordResult.user.id}`);
 
    res.json({
      success: true,
      user: passwordResult.user,
      session: passwordResult.session,
      profile: storeResult.profile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Login endpoint error:', error.message);
    res.status(500).json({
      error: 'Login failed',
      details: error.message,
    });
  }
});

export { app, supabaseAdmin };                                                                                                    //- Export for testing
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
import { createClient } from '@supabase/supabase-js';
import { processPendingWhatsAppNotifications } from './services/whatsapp.js';
import { processPendingSMSNotifications } from './services/sms.js';

dotenv.config();                                                                                                                  //- Load environment variables
const app = express();                                                                                                            //- Initialize Express
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

        if (error) 
        {
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
        const { data, error } = await supabaseAdmin                                                                                    //- Query the 'notification' table in Supabase to fetch pending notifications
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

        if (error) 
        {
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

export { app, supabaseAdmin };                                                                                                    //- Export for testing
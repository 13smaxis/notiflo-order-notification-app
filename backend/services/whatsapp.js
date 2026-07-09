
/*
 * This service handles sending WhatsApp messages using Twilio's API.
 * It provides functions to send a single message and to process all pending notifications.
 */
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();                                                                                                                  //- Load environment variables


const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);                                                                                                                                //- Initialize Twilio client


/**
 * Send a single WhatsApp message
 * @param {string} customerPhone - Customer phone number (format: +27XXXXXXXXX)
 * @param {string} message - Message text
 * @returns {Promise<object>} Twilio response
 */
export const sendWhatsAppMessage = async (customerPhone, message) => {
    try {
        const result = await twilioClient.messages.create({                                                                       //- Call Twilio API to send WhatsApp message
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,                                                               //- Same as "whatsapp:" + process.env.TWILIO_WHATSAPP_NUMBER
            to: `whatsapp:${customerPhone}`,
            body: message
        });

        return {
            success: true,                                                                                                        //- Indicate that the message was sent successfully
            sid: result.sid,                                                                                                      //- Twilio message SID for reference
            status: result.status,                                                                                                //- Twilio message status (e.g., queued, sent, delivered)
            timestamp: new Date().toISOString()                                                                                   //- Timestamp of when the message was sent
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};


/**
 * Process all pending WhatsApp notifications
 * - Fetch pending WhatsApp messages from database
 * - Send each one via Twilio
 * - Update notification status (sent/failed)
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} Processing results
 */
export const processPendingWhatsAppNotifications = async (supabase) => {
    const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: []
    };                                                                                                                            //- Initialize results object to track processing statistics

    try {
        const { data: pendingNotifications, error: fetchError } = await supabase                                                  //- STEP 1: Fetch pending WhatsApp notifications
            .from('notification')
            .select(`
                    notification_id,
                    order_id,
                    message_text,
                    delivery_attempt_number,
                    orders (
                            order_id,
                            customer_id,
                        customer (
                                  customer_phone
                        )
                    )
                `)                                                                                                                //- cunstomer phone access: notification.orders.customer.customer_phone
            .eq('delivery_status', 'pending')                                                                                     //- Filter to only include 'pending' notifications
            .eq('channel', 'whatsapp')                                                                                            //- Filter to only include notifications for the WhatsApp channel
            .order('created_at', { ascending: true })                                                                             //- Order by creation date to process older notifications first
            .limit(10);                                                                                                           //- Process 10 at a time

        if (fetchError) 
        {
            results.errors.push(`Database fetch error: ${fetchError.message}`);                                                   //- If there's an error fetching pending notifications, log it
            return results;                                                                                                       //- Return results with error information and stop
        }

        if (!pendingNotifications || pendingNotifications.length === 0)                                                           //- Check if there are no pending notifications to process
        {
            console.log('✅No pending WhatsApp notifications to process');                                                        //- If there aren't, log that there are no pending notifications
            return results;
        }

        console.log(`📱Processing ${pendingNotifications.length} WhatsApp notifications...`);                                     //- Else log count of WA notification in-progress 

        
        for (const notification of pendingNotifications)                                                                          //- STEP 2: Look for numbers in notification found in step 1
        {
            results.processed++;

            try {
                const customerPhone = notification.orders?.customer?.customer_phone;                                              //- If orders exists, check customer. If customer exists, return customer_phone
                const message = notification.message_text;
                const notificationId = notification.notification_id;

                if (!customerPhone)                                                                                               //- Check if customer phone number is missing
                {
                    console.log(`⚠️Notification ${notificationId}: No customer phone found`);                                    //- If it is, log a warning and mark the notification as failed
                    results.failed++;                                                                                             //- Increment failed count

                    await supabase                                                                                                //- Update notification as failed due to missing phone number
                        .from('notification')
                        .update({
                                    delivery_status: 'failed',
                                    delivery_error: 'No customer phone number',
                                    delivery_attempt_number: notification.delivery_attempt_number + 1,                            //- Increment delivery attempt number
                                    updated_at: new Date().toISOString()
                        })
                        .eq('notification_id', notificationId);                                                                   //- Update the notification record in the database

                    continue;                                                                                                     //- Skip to the next notification since this one cannot be sent
                }

                
                const sendResult = await sendWhatsAppMessage(customerPhone, message);                                             //- STEP 3: Send the WhatsApp messages to the numbers found in Step 2

                if (sendResult.success)                                                                                           //- Check if the message was sent successfully
                {
                    console.log(`✅WhatsApp sent to ${customerPhone} (SID: ${sendResult.sid})`);
                    results.sent++;

                    await supabase                                                                                                //- Update notification as sent
                        .from('notification')
                        .update({
                                    delivery_status: 'sent',
                                    sent_at: new Date().toISOString(),
                                    delivery_attempt_number: notification.delivery_attempt_number + 1,
                                    updated_at: new Date().toISOString()
                        })
                        .eq('notification_id', notificationId);

                } else {
                    console.log(`❌WhatsApp failed for ${customerPhone}: ${sendResult.error}`);
                    results.failed++;

                    
                    await supabase                                                                                                //-Update notification as failed
                        .from('notification')
                        .update({
                                    delivery_status: 'failed',
                                    delivery_error: sendResult.error,
                                    delivery_attempt_number: notification.delivery_attempt_number + 1,
                                    updated_at: new Date().toISOString()
                        })
                        .eq('notification_id', notificationId);
                }

            } catch (error) {
                results.failed++;
                results.errors.push(`Error processing notification: ${error.message}`);
                console.error('❌Error:', error.message);
            }
        }

    } catch (error) {
        results.errors.push(`Fatal error: ${error.message}`);                                                                     //- Catch any unexpected errors during the processing of notifications
        console.error('❌Fatal error:', error.message);
    }

    return results;
};

export default {
    sendWhatsAppMessage,
    processPendingWhatsAppNotifications
};
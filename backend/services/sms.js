// services/sms.js - Send SMS notifications via Twilio
// WITH PHONE NUMBER FORMAT CONVERSION (SA 0XXXXXXXXX → +27XXXXXXXXX)

import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Convert SA phone number format
 * 0627680710 → +27627680710
 * @param {string} phone - Phone number in format 0XXXXXXXXX
 * @returns {string} International format +27XXXXXXXXX
 */
const convertPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove any spaces or dashes
  const cleaned = phone.replace(/[\s\-]/g, '');
  
  // If already in international format, return as is
  if (cleaned.startsWith('+27')) {
    return cleaned;
  }
  
  // Convert from SA format (0XXXXXXXXX) to international (+27XXXXXXXXX)
  if (cleaned.startsWith('0')) {
    return '+27' + cleaned.slice(1);
  }
  
  // If no prefix, assume it's the 9-digit number
  return '+27' + cleaned;
};

/**
 * Send a single SMS message
 * @param {string} customerPhone - Customer phone number (format: 0XXXXXXXXX or +27XXXXXXXXX)
 * @param {string} message - Message text
 * @returns {Promise<object>} Twilio response
 */
export const sendSMSMessage = async (customerPhone, message) => {
  try {
    // Convert phone number to international format
    const internationalPhone = convertPhoneNumber(customerPhone);
    
    if (!internationalPhone) {
      return {
        success: false,
        error: 'Invalid phone number format',
        timestamp: new Date().toISOString()
      };
    }

    const result = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: internationalPhone,
      body: message
    });

    return {
      success: true,
      sid: result.sid,
      status: result.status,
      phone: internationalPhone,
      timestamp: new Date().toISOString()
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
 * Process all pending SMS notifications
 * - Fetch pending SMS messages from database
 * - Convert phone number format
 * - Send each one via Twilio
 * - Update notification status (sent/failed)
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} Processing results
 */
export const processPendingSMSNotifications = async (supabase) => {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: []
  };

  try {
    // Step 1: Fetch pending SMS notifications
    const { data: pendingNotifications, error: fetchError } = await supabase
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
      `)
      .eq('delivery_status', 'pending')
      .eq('channel', 'sms')
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (fetchError) {
      results.errors.push(`Database fetch error: ${fetchError.message}`);
      return results;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      // Silently return (no SMS to send)
      return results;
    }

    console.log(`💬 Processing ${pendingNotifications.length} SMS notifications...`);

    // Step 2: Send each notification
    for (const notification of pendingNotifications) {
      results.processed++;

      try {
        const rawPhone = notification.orders?.customer?.customer_phone;
        const message = notification.message_text;
        const notificationId = notification.notification_id;

        if (!rawPhone) {
          console.log(`⚠️  SMS Notification ${notificationId}: No customer phone found`);
          results.failed++;
          
          // Update as failed
          await supabase
            .from('notification')
            .update({
              delivery_status: 'failed',
              delivery_error: 'No customer phone number',
              delivery_attempt_number: notification.delivery_attempt_number + 1,
              updated_at: new Date().toISOString()
            })
            .eq('notification_id', notificationId);
          
          continue;
        }

        // Convert phone number to international format
        const internationalPhone = convertPhoneNumber(rawPhone);
        console.log(`💬 Sending SMS to ${rawPhone} (converted: ${internationalPhone})`);

        // Send via Twilio
        const sendResult = await sendSMSMessage(rawPhone, message);

        if (sendResult.success) {
          console.log(`✅ SMS sent to ${internationalPhone} (SID: ${sendResult.sid})`);
          results.sent++;

          // Update notification as sent
          await supabase
            .from('notification')
            .update({
              delivery_status: 'sent',
              sent_at: new Date().toISOString(),
              delivery_attempt_number: notification.delivery_attempt_number + 1,
              updated_at: new Date().toISOString()
            })
            .eq('notification_id', notificationId);

        } else {
          console.log(`❌ SMS failed for ${internationalPhone}: ${sendResult.error}`);
          results.failed++;

          // Update notification as failed
          await supabase
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
        results.errors.push(`Error processing SMS notification: ${error.message}`);
        console.error('❌ Error:', error.message);
      }
    }

  } catch (error) {
    results.errors.push(`Fatal error: ${error.message}`);
    console.error('❌ Fatal SMS error:', error.message);
  }

  return results;
};

export default {
  sendSMSMessage,
  processPendingSMSNotifications,
  convertPhoneNumber
};
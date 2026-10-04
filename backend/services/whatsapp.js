// services/whatsapp.js - Send WhatsApp notifications via Twilio
// WITH PHONE NUMBER FORMAT CONVERSION (SA 0XXXXXXXXX → +27XXXXXXXXX)

import twilio from 'twilio';
import dotenv from 'dotenv';
import { logEvent } from './logger.js';

dotenv.config();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Convert SA phone number format
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
 * Send a single WhatsApp message
 * @param {string} customerPhone - Customer phone number (format: 0XXXXXXXXX or +27XXXXXXXXX)
 * @param {string} message - Message text
 * @returns {Promise<object>} Twilio response
 */
export const sendWhatsAppMessage = async (customerPhone, message) => {
  try {
    // Convert phone number to international format
    const internationalPhone = convertPhoneNumber(customerPhone);
    
    if (!internationalPhone) {
      return {
        success: false,
        error: 'Invalid phone number format',
        errorCode: 'INVALID_PHONE',
        timestamp: new Date().toISOString()
      };
    }

    const result = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${internationalPhone}`,
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
      errorCode: error.code,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Create an SMS fallback notification
 * Called when WhatsApp fails - creates a pending SMS notification
 * @param {object} supabase - Supabase client
 * @param {string} orderId - Order ID
 * @param {string} statusHistoryId - Status history ID
 * @param {string} message - Message text
 * @returns {Promise<object>} Insert result
 */
const createSMSFallback = async (supabase, orderId, statusHistoryId, message) => {
  try {
    const { data, error } = await supabase
      .from('notification')
      .insert([
        {
          order_id: orderId,
          status_history_id: statusHistoryId,
          notification_type: 'status_update',
          channel: 'sms',  // ← SMS fallback
          message_text: message,
          delivery_status: 'pending',  // ← Will be processed by SMS poller
          delivery_attempt_number: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (error) {
      logEvent('error', 'notifications.fallback.creation_failed', {
        channel: 'sms',
        orderId,
        errorCode: error.code,
      });
      return { success: false, error: error.message };
    }

    logEvent('info', 'notifications.fallback.created', {
      channel: 'sms',
      orderId,
    });
    return { success: true, data };
  } catch (error) {
    logEvent('error', 'notifications.fallback.creation_failed', {
      channel: 'sms',
      orderId,
      errorCode: error.code,
      errorType: error.name,
    });
    return { success: false, error: error.message };
  }
};

/**
 * Process all pending WhatsApp notifications
 * - Fetch pending WhatsApp messages from database
 * - Convert phone number format
 * - Send each one via Twilio
 * - If WhatsApp fails → CREATE SMS fallback notification
 * - Update WhatsApp notification status
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} Processing results
 */
export const processPendingWhatsAppNotifications = async (supabase) => {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    fallbacks_created: 0,
    errors: []
  };

  try {
    // Step 1: Fetch pending WhatsApp notifications
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification')
      .select(`
        notification_id,
        order_id,
        status_history_id,
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
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: true })
      .limit(50); // Process 50 at a time

    if (fetchError) {
      logEvent('error', 'notifications.batch.fetch_failed', {
        channel: 'whatsapp',
        errorCode: fetchError.code,
      });
      results.errors.push(`Database fetch error: ${fetchError.message}`);
      return results;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      logEvent('info', 'notifications.batch.empty', { channel: 'whatsapp' });
      return results;
    }

    logEvent('info', 'notifications.batch.started', {
      channel: 'whatsapp',
      count: pendingNotifications.length,
    });

    // Step 2: Send each notification
    for (const notification of pendingNotifications) {
      results.processed++;

      try {
        const rawPhone = notification.orders?.customer?.customer_phone;
        const message = notification.message_text;
        const notificationId = notification.notification_id;
        const orderId = notification.order_id;
        const statusHistoryId = notification.status_history_id;

        if (!rawPhone) {
          logEvent('warn', 'notifications.delivery.destination_missing', {
            channel: 'whatsapp',
            notificationId,
          });
          results.failed++;
          
          // Update as failed (don't create SMS fallback if no phone)
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
        logEvent('info', 'notifications.delivery.started', {
          channel: 'whatsapp',
          notificationId,
        });

        // Send via Twilio
        const sendResult = await sendWhatsAppMessage(rawPhone, message);

        if (sendResult.success) {
          logEvent('info', 'notifications.delivery.succeeded', {
            channel: 'whatsapp',
            notificationId,
            providerSid: sendResult.sid,
          });
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
          // ❌ WhatsApp FAILED - Create SMS Fallback
          logEvent('error', 'notifications.delivery.failed', {
            channel: 'whatsapp',
            notificationId,
            errorCode: sendResult.errorCode,
          });
          results.failed++;

          // Update WhatsApp notification as failed
          await supabase
            .from('notification')
            .update({
              delivery_status: 'failed',
              delivery_error: sendResult.error,
              delivery_attempt_number: notification.delivery_attempt_number + 1,
              updated_at: new Date().toISOString()
            })
            .eq('notification_id', notificationId);

          // CREATE SMS Fallback notification
          const fallbackResult = await createSMSFallback(
            supabase,
            orderId,
            statusHistoryId,
            message
          );

          if (fallbackResult.success) {
            results.fallbacks_created++;
          }
        }

      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing notification: ${error.message}`);
        logEvent('error', 'notifications.delivery.failed', {
          channel: 'whatsapp',
          notificationId: notification.notification_id,
          errorCode: error.code,
          errorType: error.name,
        });
      }
    }

  } catch (error) {
    results.errors.push(`Fatal error: ${error.message}`);
    logEvent('error', 'notifications.batch.failed', {
      channel: 'whatsapp',
      errorCode: error.code,
      errorType: error.name,
    });
  }

  logEvent('info', 'notifications.batch.completed', {
    channel: 'whatsapp',
    processed: results.processed,
    sent: results.sent,
    failed: results.failed,
    fallbacksCreated: results.fallbacks_created,
  });
  return results;
};

export default {
  sendWhatsAppMessage,
  processPendingWhatsAppNotifications,
  convertPhoneNumber
};
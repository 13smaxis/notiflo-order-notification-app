import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeClientEvent } from '../services/client-events.js';

test('accepts only the event-specific metadata fields from authenticated users', () => {
  const event = normalizeClientEvent({
    eventType: 'kanban.order.moved',
    userId: 'user-123',
    metadata: {
      orderId: 'order-123',
      storeId: 'store-123',
      fromStage: 'queue',
      toStage: 'preparing',
      durationMs: 450,
      customerPhone: '0627680710',
      message: 'private content',
    },
  });

  assert.deepEqual(event, {
    eventType: 'kanban.order.moved',
    userId: 'user-123',
    orderId: 'order-123',
    storeId: 'store-123',
    fromStage: 'queue',
    toStage: 'preparing',
    durationMs: 450,
  });
});

test('rejects unknown event names and unauthenticated events', () => {
  assert.equal(normalizeClientEvent({ eventType: 'arbitrary.event', userId: 'user-123' }), null);
  assert.equal(normalizeClientEvent({ eventType: 'toString', userId: 'user-123' }), null);
  assert.equal(normalizeClientEvent({ eventType: 'auth.login.completed', userId: null }), null);
});

test('drops invalid stages and out-of-range durations', () => {
  const event = normalizeClientEvent({
    eventType: 'kanban.order.moved',
    userId: 'user-123',
    metadata: {
      fromStage: 'private-input',
      toStage: 'preparing',
      durationMs: -1,
    },
  });

  assert.equal('fromStage' in event, false);
  assert.equal(event.toStage, 'preparing');
  assert.equal('durationMs' in event, false);
});
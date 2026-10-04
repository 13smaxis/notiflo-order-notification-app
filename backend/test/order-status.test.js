import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureDefaultOrderStatuses } from '../services/order-status.js';

const fakeStatusStore = (initialStatuses = []) => {
  const statuses = [...initialStatuses];
  const insertedCodes = [];

  return {
    statuses,
    insertedCodes,
    from(table) {
      assert.equal(table, 'order_status');
      return {
        select() {
          return {
            in: async (column, codes) => {
              assert.equal(column, 'status_code');
              return {
                data: statuses.filter((status) => codes.includes(status.status_code)),
                error: null,
              };
            },
          };
        },
        insert(status) {
          insertedCodes.push(status.status_code);
          if (statuses.some((existing) => existing.status_code === status.status_code)) {
            return Promise.resolve({ error: { code: '23505' } });
          }
          statuses.push({ status_id: `id-${status.status_code}`, ...status });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
};

test('creates missing workflow statuses and returns the queue status for order creation', async () => {
  const store = fakeStatusStore([
    { status_id: 'existing-queue', status_code: 'queue', status_name: 'Custom Queue', sequence_order: 10 },
  ]);

  const statuses = await ensureDefaultOrderStatuses(store);

  assert.equal(statuses.length, 5);
  assert.equal(statuses[0].status_id, 'existing-queue');
  assert.equal(statuses[0].status_name, 'Custom Queue');
  assert.deepEqual(store.insertedCodes, ['preparing', 'ready', 'collected', 'cancelled']);
});

test('recovers from a concurrent status insert without overwriting existing rows', async () => {
  const store = fakeStatusStore();
  const insert = store.from.bind(store);
  let raced = false;
  store.from = (table) => {
    const query = insert(table);
    if (!raced) {
      const originalInsert = query.insert;
      query.insert = (status) => {
        if (!raced) {
          raced = true;
          store.statuses.push({ status_id: `raced-${status.status_code}`, ...status });
        }
        return originalInsert(status);
      };
    }
    return query;
  };

  const statuses = await ensureDefaultOrderStatuses(store);

  assert.equal(statuses.length, 5);
  assert.equal(statuses[0].status_id, 'raced-queue');
});
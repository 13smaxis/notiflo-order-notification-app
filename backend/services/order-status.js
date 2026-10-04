export const DEFAULT_ORDER_STATUSES = [
  { status_code: 'queue', status_name: 'Queue', sequence_order: 1 },
  { status_code: 'preparing', status_name: 'Preparing', sequence_order: 2 },
  { status_code: 'ready', status_name: 'Ready', sequence_order: 3 },
  { status_code: 'collected', status_name: 'Collected', sequence_order: 4 },
  { status_code: 'cancelled', status_name: 'Cancelled', sequence_order: 5 },
];

export const ensureDefaultOrderStatuses = async (supabase) => {
  const statusCodes = DEFAULT_ORDER_STATUSES.map(({ status_code }) => status_code);
  const { data: existingStatuses, error: lookupError } = await supabase
    .from('order_status')
    .select('*')
    .in('status_code', statusCodes);

  if (lookupError) throw lookupError;

  const existingCodes = new Set((existingStatuses || []).map(({ status_code }) => status_code));

  for (const status of DEFAULT_ORDER_STATUSES) {
    if (existingCodes.has(status.status_code)) continue;

    const { error: insertError } = await supabase
      .from('order_status')
      .insert(status);

    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }
  }

  const { data: statuses, error: finalLookupError } = await supabase
    .from('order_status')
    .select('*')
    .in('status_code', statusCodes);

  if (finalLookupError) throw finalLookupError;

  const statusesByCode = new Map((statuses || []).map((status) => [status.status_code, status]));
  const missingStatuses = statusCodes.filter((statusCode) => !statusesByCode.has(statusCode));
  if (missingStatuses.length > 0) {
    throw new Error(`Could not ensure order statuses: ${missingStatuses.join(', ')}`);
  }

  return statusCodes.map((statusCode) => statusesByCode.get(statusCode));
};
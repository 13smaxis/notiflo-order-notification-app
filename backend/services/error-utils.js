export const getErrorMessage = (error, fallback = 'Registration failed') => {
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' && error.trim() && error.trim() !== '{}' ? error.trim() : fallback;
  }

  const message = typeof error.message === 'string' ? error.message.trim() : '';
  if (message && message !== '{}' && message !== '[object Object]') {
    return message;
  }

  const status = error.status ? ` (${error.status})` : '';
  const name = typeof error.name === 'string' && error.name.trim() ? error.name : 'Unknown error';

  return status || name
    ? `Supabase Auth registration failed${status}: ${name}`
    : fallback;
};

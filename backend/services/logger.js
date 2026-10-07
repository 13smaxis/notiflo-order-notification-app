const sensitiveField = /(authorization|password|token|secret|email|phone|body|message|recipient|cookie|payload|raw)/i;

const sanitizeFields = (fields) => Object.fromEntries(
  Object.entries(fields || {}).flatMap(([key, value]) => {
    if (sensitiveField.test(key) || value === undefined) {
      return [];
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [[key, sanitizeFields(value)]];
    }

    if (Array.isArray(value)) {
      return [[key, value.map((item) => (
        item && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeFields(item)
          : item
      ))]];
    }

    return [[key, value]];
  })
);

export const serializeLogEntry = (level, event, fields = {}) => JSON.stringify({
  ...sanitizeFields(fields),
  timestamp: new Date().toISOString(),
  level,
  event,
});

export const logEvent = (level, event, fields = {}) => {
  const serializedEntry = serializeLogEntry(level, event, fields);
  const logLine = `[${level.toUpperCase()}] ${serializedEntry}`;

  if (level === 'error') {
    console.error(logLine);
  } else if (level === 'warn') {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }
};
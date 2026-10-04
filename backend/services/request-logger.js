import { randomUUID } from 'node:crypto';
import { logEvent } from './logger.js';

export const requestLogger = (req, res, next) => {
  const startedAt = Date.now();
  let requestLogged = false;
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);

  req.once('aborted', () => {
    requestLogged = true;
    logEvent('warn', 'http.request.aborted', {
      requestId: req.requestId,
      method: req.method,
      route: req.route?.path || 'unmatched',
      durationMs: Date.now() - startedAt,
    });
  });

  res.once('finish', () => {
    if (requestLogged) return;
    requestLogged = true;
    logEvent(res.statusCode >= 500 ? 'error' : 'info', 'http.request.completed', {
      requestId: req.requestId,
      method: req.method,
      route: req.route?.path || 'unmatched',
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  res.once('close', () => {
    if (requestLogged || res.writableFinished) return;
    requestLogged = true;
    logEvent('warn', 'http.response.closed_early', {
      requestId: req.requestId,
      method: req.method,
      route: req.route?.path || 'unmatched',
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { logEvent, serializeLogEntry } from '../services/logger.js';
import { requestLogger } from '../services/request-logger.js';

const parseLogLine = (line) => JSON.parse(line.slice(line.indexOf(' ') + 1));

test('serializes structured log entries with a timestamp and event metadata', () => {
  const entry = JSON.parse(serializeLogEntry('info', 'http.request.completed', {
    requestId: 'request-123',
    method: 'GET',
    route: '/health',
    statusCode: 200,
    durationMs: 12,
  }));

  assert.equal(entry.level, 'info');
  assert.equal(entry.event, 'http.request.completed');
  assert.equal(entry.requestId, 'request-123');
  assert.equal(entry.statusCode, 200);
  assert.ok(Number.isFinite(Date.parse(entry.timestamp)));
});

test('omits sensitive fields recursively and prevents metadata from overriding core fields', () => {
  const serialized = serializeLogEntry('info', 'auth.login.failed', {
    timestamp: 'overridden',
    level: 'error',
    event: 'overridden',
    phoneNumber: '+27600000000',
    password: 'not-a-real-password',
    authorization: 'Bearer not-a-real-token',
    details: {
      messageText: 'private message',
      safeCode: 'AUTH_FAILED',
    },
  });
  const entry = JSON.parse(serialized);

  assert.equal(entry.level, 'info');
  assert.equal(entry.event, 'auth.login.failed');
  assert.equal(entry.details.safeCode, 'AUTH_FAILED');
  assert.equal('phoneNumber' in entry, false);
  assert.equal('password' in entry, false);
  assert.equal('authorization' in entry, false);
  assert.equal('messageText' in entry.details, false);
  assert.doesNotMatch(serialized, /27600000000|not-a-real|private message/);
});

test('writes severity prefix before structured log data', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const output = [];
  console.log = (line) => output.push(line);
  console.warn = (line) => output.push(line);
  console.error = (line) => output.push(line);

  try {
    logEvent('info', 'test.info');
    logEvent('warn', 'test.warn');
    logEvent('error', 'test.error');

    assert.match(output[0], /^\[INFO\] \{/);
    assert.match(output[1], /^\[WARN\] \{/);
    assert.match(output[2], /^\[ERROR\] \{/);
    assert.equal(parseLogLine(output[0]).event, 'test.info');
    assert.equal(parseLogLine(output[1]).event, 'test.warn');
    assert.equal(parseLogLine(output[2]).event, 'test.error');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test('logs request ID, route, status, and duration exactly once on completion', () => {
  const req = new EventEmitter();
  req.method = 'GET';
  req.path = '/health';
  req.route = { path: '/health' };

  const res = new EventEmitter();
  res.statusCode = 200;
  res.writableFinished = false;
  res.headers = {};
  res.setHeader = (name, value) => { res.headers[name] = value; };

  const originalLog = console.log;
  const output = [];
  console.log = (line) => output.push(line);

  try {
    requestLogger(req, res, () => {});
    res.writableFinished = true;
    res.emit('finish');

    assert.ok(res.headers['X-Request-ID']);
    assert.equal(output.length, 1);
    assert.match(output[0], /^\[INFO\] \{/);
    const entry = parseLogLine(output[0]);
    assert.equal(entry.event, 'http.request.completed');
    assert.equal(entry.requestId, res.headers['X-Request-ID']);
    assert.equal(entry.route, '/health');
    assert.equal(entry.statusCode, 200);
    assert.ok(entry.durationMs >= 0);
  } finally {
    console.log = originalLog;
  }
});

test('does not duplicate an aborted request when the response closes', () => {
  const req = new EventEmitter();
  req.method = 'POST';
  req.path = '/api/auth/login';

  const res = new EventEmitter();
  res.statusCode = 400;
  res.writableFinished = false;
  res.setHeader = () => {};

  const originalWarn = console.warn;
  const output = [];
  console.warn = (line) => output.push(line);

  try {
    requestLogger(req, res, () => {});
    req.emit('aborted');
    res.emit('close');

    assert.equal(output.length, 1);
    assert.match(output[0], /^\[WARN\] \{/);
    assert.equal(parseLogLine(output[0]).event, 'http.request.aborted');
  } finally {
    console.warn = originalWarn;
  }
});
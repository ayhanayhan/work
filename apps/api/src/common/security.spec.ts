import assert from 'node:assert/strict';
import test from 'node:test';
import { requestIp, securityHash } from './security';

test('requestIp uses framework-resolved req.ip and ignores spoofable forwarding headers', () => {
  const req = {
    ip: '203.0.113.10',
    socket: { remoteAddress: '10.0.0.4' },
    headers: {
      'x-forwarded-for': '1.2.3.4',
      'cf-connecting-ip': '5.6.7.8',
    },
  };
  assert.equal(requestIp(req), '203.0.113.10');
});

test('requestIp falls back to socket address only when req.ip is unavailable', () => {
  assert.equal(requestIp({ socket: { remoteAddress: '10.0.0.9' }, headers: { 'x-forwarded-for': '1.1.1.1' } }), '10.0.0.9');
});

test('securityHash is deterministic and does not return plaintext', () => {
  const a = securityHash('secret-value');
  const b = securityHash('secret-value');
  assert.equal(a, b);
  assert.notEqual(a, 'secret-value');
  assert.equal(a?.length, 64);
});

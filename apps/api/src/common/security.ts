import { createHash } from 'crypto';

export function securityHash(value: unknown) {
  if (!value) return null;
  return createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Returns the client IP resolved by the HTTP framework.
 *
 * IMPORTANT: raw forwarding headers are deliberately not trusted here. Express/Nest
 * must be configured with the deployment's trusted proxy policy and `req.ip` is the
 * single source of truth. Reading x-forwarded-for/cf-connecting-ip directly allows a
 * client that can reach the service to spoof security/audit/risk IPs.
 */
export function requestIp(req: any) {
  const resolved = req?.ip || req?.socket?.remoteAddress || '';
  return String(resolved).trim();
}

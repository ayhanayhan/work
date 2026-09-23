import { createHash } from 'crypto';
export function securityHash(value: unknown) {
  if (!value) return null;
  return createHash('sha256').update(String(value)).digest('hex');
}
export function requestIp(req: any) {
  return String(req.headers?.['cf-connecting-ip'] || req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '').split(',')[0].trim();
}

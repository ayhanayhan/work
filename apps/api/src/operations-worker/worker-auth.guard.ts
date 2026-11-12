import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { EventOutboxService } from '../webhooks/event-outbox.service';

@Injectable()
export class WorkerAuthGuard implements CanActivate {
  private readonly google = new OAuth2Client();
  constructor(private readonly events: EventOutboxService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const auth = String(req.headers?.authorization || '');

    // Manual/internal fallback token. EventOutboxService performs timing-safe comparison.
    try {
      this.events.assertWorkerToken(auth);
      req.workerAuth = { type: 'static-token' };
      return true;
    } catch {}

    const audience = String(process.env.WORKER_OIDC_AUDIENCE || '').trim();
    const expectedEmail = String(process.env.WORKER_SERVICE_ACCOUNT_EMAIL || '').trim().toLowerCase();
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!audience || !expectedEmail || !token) throw new UnauthorizedException('Unauthorized worker request');

    try {
      const ticket = await this.google.verifyIdToken({ idToken: token, audience });
      const payload = ticket.getPayload();
      const email = String(payload?.email || '').toLowerCase();
      if (!payload?.email_verified || email !== expectedEmail) throw new Error('worker identity mismatch');
      req.workerAuth = { type: 'google-oidc', email };
      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized worker request');
    }
  }
}

/**
 * Ticarti subscription restriction policy.
 *
 * Pure, deterministic domain logic. The caller must load policy from trusted
 * PlatformSetting data, resolve the current tenant/subscription server-side,
 * and enforce the returned decision on API/checkout requests.
 *
 * This module by itself does NOT enforce access or authorize deletion.
 */
export type SubscriptionKind = 'trial' | 'paid';
export type RestrictionReason = 'none' | 'expired' | 'manually_suspended' | 'unknown';
export type SubscriptionRestrictionSettings = {
  trial: {
    warningDays: number;
    graceDays: number;
    retentionDays: number;
  };
  paid: {
    warningDays: number;
    graceDays: number;
    retentionDays: number;
  };
};

export const DEFAULT_RESTRICTION_SETTINGS: Readonly<SubscriptionRestrictionSettings> = {
  trial: {warningDays: 7, graceDays: 0, retentionDays: 14},
  paid: {warningDays: 30, graceDays: 0, retentionDays: 45},
};

export type SubscriptionRestrictionInput = {
  tenantStatus?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  now?: Date;
};

export type SubscriptionRestrictionDecision = {
  restricted: boolean;
  reason: RestrictionReason;
  kind: SubscriptionKind | null;
  warning: boolean;
  daysUntilEnd: number | null;
  isGracePeriod: boolean;
  accessUntil: string | null;
  recoveryUntil: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 3650;

export function validateRestrictionSettings(input: unknown): SubscriptionRestrictionSettings {
  if (!input || typeof input !== 'object') throw new Error('Restriction settings must be an object');
  const object = input as Record<string, any>;
  const read = (kind: SubscriptionKind, key: 'warningDays' | 'graceDays' | 'retentionDays') => {
    const number = object[kind]?.[key];
    if (!Number.isSafeInteger(number) || number < 0 || number > MAX_DAYS) {
      throw new Error(`Invalid ${kind}.${key}`);
    }
    return number as number;
  };
  return {
    trial: {
      warningDays: read('trial', 'warningDays'),
      graceDays: read('trial', 'graceDays'),
      retentionDays: read('trial', 'retentionDays'),
    },
    paid: {
      warningDays: read('paid', 'warningDays'),
      graceDays: read('paid', 'graceDays'),
      retentionDays: read('paid', 'retentionDays'),
    },
  };
}

function timestamp(value?: Date | string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function evaluateSubscriptionRestriction(
  input: SubscriptionRestrictionInput,
  settings: SubscriptionRestrictionSettings,
): SubscriptionRestrictionDecision {
  const now = input.now?.getTime() ?? Date.now();
  if (!Number.isFinite(now)) throw new Error('Invalid current time');

  const suspended = input.tenantStatus === 'SUSPENDED' || input.tenantStatus === 'CANCELLED';
  const trial = input.subscriptionStatus === 'TRIAL' ||
    (!input.subscriptionStatus && input.tenantStatus === 'TRIAL');
  const kind: SubscriptionKind = trial ? 'trial' : 'paid';
  const expiresAt = timestamp(trial ? input.trialEndsAt : input.currentPeriodEnd);

  if (suspended) {
    return {restricted: true, reason: 'manually_suspended', kind, warning: false,
      daysUntilEnd: null, isGracePeriod: false, accessUntil: null, recoveryUntil: null};
  }

  if (expiresAt === null) {
    return {restricted: false, reason: 'unknown', kind: null, warning: false,
      daysUntilEnd: null, isGracePeriod: false, accessUntil: null, recoveryUntil: null};
  }

  const options = settings[kind];
  const accessUntil = expiresAt + options.graceDays * DAY_MS;
  const recoveryUntil = accessUntil + options.retentionDays * DAY_MS;
  const restricted = now >= accessUntil;
  const daysUntilEnd = Math.max(0, Math.ceil((expiresAt - now) / DAY_MS));
  return {
    restricted,
    reason: restricted ? 'expired' : 'none',
    kind,
    warning: now < accessUntil && now >= expiresAt - options.warningDays * DAY_MS,
    daysUntilEnd,
    isGracePeriod: now >= expiresAt && now < accessUntil,
    accessUntil: new Date(accessUntil).toISOString(),
    recoveryUntil: new Date(recoveryUntil).toISOString(),
  };
}

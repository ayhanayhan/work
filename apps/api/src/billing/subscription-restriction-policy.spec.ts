import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  DEFAULT_RESTRICTION_SETTINGS as defaults,
  evaluateSubscriptionRestriction as evaluate,
  validateRestrictionSettings,
} from './subscription-restriction-policy';

const date = '2026-11-13T00:00:00.000Z';
const when = (days: number) => new Date(Date.parse(date) + days * 86400000);

test('trial is restricted immediately by default', () => {
  const before = evaluate({subscriptionStatus:'TRIAL',trialEndsAt:date,now:when(-1)},defaults);
  const after = evaluate({subscriptionStatus:'TRIAL',trialEndsAt:date,now:when(0)},defaults);
  assert.equal(before.restricted,false);
  assert.equal(after.restricted,true);
  assert.equal(after.recoveryUntil,'2026-11-27T00:00:00.000Z');
});

test('trial grace period can be any validated day value, not limited to 2', () => {
  const settings = {...defaults,trial:{...defaults.trial,graceDays:21}};
  const during = evaluate({subscriptionStatus:'TRIAL',trialEndsAt:date,now:when(20)},settings);
  const after = evaluate({subscriptionStatus:'TRIAL',trialEndsAt:date,now:when(21)},settings);
  assert.equal(during.restricted,false);
  assert.equal(during.isGracePeriod,true);
  assert.equal(after.restricted,true);
  assert.equal(after.recoveryUntil,'2026-12-18T00:00:00.000Z');
});

test('paid license uses paid grace and retention independent of trial', () => {
  const settings = {...defaults,paid:{warningDays:30,graceDays:7,retentionDays:45}};
  const during = evaluate({subscriptionStatus:'ACTIVE',currentPeriodEnd:date,now:when(3)},settings);
  const ended = evaluate({subscriptionStatus:'ACTIVE',currentPeriodEnd:date,now:when(7)},settings);
  assert.equal(during.isGracePeriod,true);
  assert.equal(ended.restricted,true);
  assert.equal(ended.recoveryUntil,'2027-01-04T00:00:00.000Z');
});

test('manual suspension overrides an otherwise active subscription', () => {
  const result = evaluate({tenantStatus:'SUSPENDED',subscriptionStatus:'ACTIVE',currentPeriodEnd:date,now:when(-10)},defaults);
  assert.equal(result.restricted,true);
  assert.equal(result.reason,'manually_suspended');
});

test('missing dates are not mistaken for an expired paid subscription', () => {
  const result = evaluate({tenantStatus:'ACTIVE',subscriptionStatus:'ACTIVE',now:when(0)},defaults);
  assert.equal(result.reason,'unknown');
  assert.equal(result.restricted,false);
});

test('reject invalid configuration', () => {
  assert.throws(()=>validateRestrictionSettings({trial:{warningDays:7,graceDays:-1,retentionDays:14},paid:defaults.paid}));
  assert.deepEqual(validateRestrictionSettings(defaults),defaults);
});

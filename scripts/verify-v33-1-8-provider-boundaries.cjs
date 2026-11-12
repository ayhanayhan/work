'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'apps/api/src/payment-providers');
const patterns = [
 ['Stripe API HTTP calls', /api\.stripe\.com/],
 ['Stripe webhook verifier', /verifyStripeSignature/],
 ['Stripe-specific service methods', /(?:startStripe|refundStripeOrder|captureStripeOrder|cancelStripeOrder|stripeWebhook)/],
 ['Stripe-specific connection secrets', /webhookSecret|publishableKey/],
];
const files = fs.existsSync(base) ? fs.readdirSync(base).filter(n => /\.(ts|tsx)$/.test(n)) : [];
if (!files.length) { console.error('BLOCKED: payment-providers source not found'); process.exit(2); }
let findings=0;
for(const file of files){const source=fs.readFileSync(path.join(base,file),'utf8');for(const [label,re] of patterns){if(re.test(source)){findings++;console.log('CORE_DEPENDENCY: '+label+' in '+file);}}}
if(findings){console.error(`REVIEW: ${findings} Stripe-specific core dependency categories found. Provider extraction incomplete.`);process.exitCode=1;}
else console.log('PASS: no listed Stripe-specific patterns in payment-providers source; broader scan and runtime contract tests still required');

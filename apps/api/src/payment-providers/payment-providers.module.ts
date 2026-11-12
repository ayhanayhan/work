import { Module } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Provider modules are installed at build time, not fetched from tenant-controlled paths.
// A missing optional module must never stop core API boot.
function optionalInstalledStripeModule(): any[] {
  const moduleFile = join(__dirname, '..', 'installed-modules', 'payment-stripe', 'stripe-payment.module.js');
  if (!existsSync(moduleFile)) return [];
  const plugin = require(moduleFile);
  if (!plugin.StripePaymentModule) throw new Error('Installed Stripe module has no StripePaymentModule');
  return [plugin.StripePaymentModule];
}

@Module({ imports: optionalInstalledStripeModule() })
export class PaymentProvidersModule {}

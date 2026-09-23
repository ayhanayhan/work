import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS = [
  'analytics.read',
  'products.read','products.manage',
  'orders.read','orders.manage',
  'customers.read','customers.manage',
  'promotions.read','promotions.manage',
  'marketing.read','marketing.manage',
  'content.read','content.manage',
  'reviews.read','reviews.manage',
  'returns.read','returns.manage',
  'settings.read','settings.manage',
  'team.read','team.manage',
  'support.read','support.manage',
  'privacy.read','privacy.manage',
  'media.read','media.manage',
] as const;

export type PermissionKey = typeof PERMISSIONS[number];
export const REQUIRE_PERMISSION = 'required-permission';
export const RequirePermission = (...permissions: PermissionKey[]) => SetMetadata(REQUIRE_PERMISSION, permissions);

export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['*'],
  ADMIN: PERMISSIONS.filter(x => x !== 'team.manage'),
  STAFF: ['analytics.read','products.read','orders.read','customers.read','support.read','media.read'],
};

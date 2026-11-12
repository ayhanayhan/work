'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAdminSession } from '@/app/components/AdminSession';
import { Demo1Layout } from '../components/layouts/demo1/layout';
import { SalesChannelProvider } from './components/sales-channel-context';
import { OnboardingGate } from './components/onboarding-gate';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { session, restoring } = useAdminSession();
  const router = useRouter();
  useEffect(() => {
    if (!restoring && !session) router.replace('/login');
  }, [restoring, session, router]);
  if (restoring) return <ScreenLoader />;
  return session ? <SalesChannelProvider><Demo1Layout><OnboardingGate>{children}</OnboardingGate></Demo1Layout></SalesChannelProvider> : null;
}

'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';
import { SalesChannelSwitcher } from './sales-channel-switcher';

export function Sidebar() {
  const { settings } = useSettings();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'sidebar bg-background lg:border-e lg:border-border lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0',
        (settings.layouts.demo1.sidebarTheme === 'dark' ||
          (pathname.includes('dark-sidebar'))) &&
          'dark',
      )}
    >
      <SidebarHeader />
      <div className="min-h-0 grow overflow-hidden">
        <div className="h-full w-(--sidebar-default-width)">
          <SidebarMenu />
        </div>
      </div>
      <div className="w-(--sidebar-default-width) shrink-0 border-t border-border bg-background">
        <SalesChannelSwitcher />
      </div>
    </div>
  );
}

'use client';

import { JSX, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { MenuConfig, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';

const ALERT_TITLES = new Set(['Siparişler', 'Yorumlar', 'Sorular']);

function AlertDot({ title }: { title?: string }) {
  if (!title || !ALERT_TITLES.has(title)) return null;
  return (
    <span className="relative ms-auto me-1 flex size-2.5" title="Yeni kayıt var">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
      <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
    </span>
  );
}

export function SidebarMenu() {
  const pathname = usePathname();
  const matchPath = useCallback((path: string): boolean => path === pathname || (path.length > 1 && pathname.startsWith(path)), [pathname]);

  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-3', group: 'gap-px',
    label: 'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px', separator: '',
    item: 'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    sub: '', subTrigger: 'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium',
    subContent: 'py-0', indicator: '',
  };

  const buildMenu = (items: MenuConfig): JSX.Element[] => items.map((item: MenuItem, index: number) => {
    if (item.heading) return <AccordionMenuLabel key={index}>{item.heading}</AccordionMenuLabel>;
    if (item.children) {
      return <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
        <AccordionMenuSubTrigger className="text-sm font-medium">
          {item.icon && <item.icon data-slot="accordion-menu-icon" />}
          <span data-slot="accordion-menu-title">{item.title}</span>
          <AlertDot title={item.title} />
        </AccordionMenuSubTrigger>
        <AccordionMenuSubContent type="single" collapsible parentValue={item.path || `root-${index}`} className="ps-6">
          <AccordionMenuGroup>{buildChildren(item.children, 1)}</AccordionMenuGroup>
        </AccordionMenuSubContent>
      </AccordionMenuSub>;
    }
    return <AccordionMenuItem key={index} value={item.path || ''} className="text-sm font-medium">
      <Link href={item.path || '#'} className="flex items-center grow gap-2">
        {item.icon && <item.icon data-slot="accordion-menu-icon" />}
        <span data-slot="accordion-menu-title">{item.title}</span>
        <AlertDot title={item.title} />
      </Link>
    </AccordionMenuItem>;
  });

  const buildChildren = (items: MenuConfig, level: number): JSX.Element[] => items.map((item: MenuItem, index: number) => {
    if (item.children) {
      return <AccordionMenuSub key={index} value={item.path || `child-${level}-${index}`}>
        <AccordionMenuSubTrigger className="text-[13px]">
          <span>{item.title}</span><AlertDot title={item.title} />
        </AccordionMenuSubTrigger>
        <AccordionMenuSubContent type="single" collapsible parentValue={item.path || `child-${level}-${index}`} className={cn('ps-4')}>
          <AccordionMenuGroup>{buildChildren(item.children, level + 1)}</AccordionMenuGroup>
        </AccordionMenuSubContent>
      </AccordionMenuSub>;
    }
    return <AccordionMenuItem key={index} value={item.path || ''} className="text-[13px]">
      <Link href={item.path || '#'} className="flex items-center grow gap-2">
        <span>{item.title}</span><AlertDot title={item.title} />
      </Link>
    </AccordionMenuItem>;
  });

  return (
    <div className="flex grow shrink-0 flex-col min-h-0">
      <div className="kt-scrollable-y-hover h-full grow py-5 px-5">
        <AccordionMenu selectedValue={pathname} matchPath={matchPath} type="single" collapsible classNames={classNames}>
          {buildMenu(MENU_SIDEBAR)}
        </AccordionMenu>
      </div>
    </div>
  );
}

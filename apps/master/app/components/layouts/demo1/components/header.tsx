'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LogOut, Menu, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Button } from '@/components/ui/button';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet';
import { Container } from '@/components/common/container';
import { SidebarMenu } from './sidebar-menu';
import { useMasterSession } from '@/app/components/MasterSession';
export function Header(){const[open,setOpen]=useState(false);const pathname=usePathname();const mobile=useIsMobile();const sticky=useScrollPosition()>0;const{logout}=useMasterSession();useEffect(()=>setOpen(false),[pathname]);return <header className={cn('header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',sticky&&'border-b border-border')}><Container className="flex justify-between items-stretch lg:gap-4"><div className="flex gap-2.5 lg:hidden items-center"><Link href="/dashboard" className="font-semibold">Ticarti Master</Link>{mobile&&<Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" mode="icon"><Menu className="text-muted-foreground/70"/></Button></SheetTrigger><SheetContent className="p-0 gap-0 w-[275px]" side="left" close={false}><SheetHeader className="p-0 space-y-0"/><SheetBody className="p-0 overflow-y-auto"><SidebarMenu/></SheetBody></SheetContent></Sheet>}</div><div className="hidden lg:flex items-center text-sm text-muted-foreground">Platform yönetimi</div><div className="flex items-center gap-2"><Button variant="ghost" mode="icon" shape="circle" asChild title="Canlı Denetim"><Link href="/live"><Activity className="size-4.5!"/></Link></Button><Button variant="ghost" mode="icon" shape="circle" asChild title="Ayarlar"><Link href="/settings"><Settings className="size-4.5!"/></Link></Button><Button variant="ghost" mode="icon" shape="circle" title="Çıkış" onClick={()=>void logout()}><LogOut className="size-4.5!"/></Button></div></Container></header>}

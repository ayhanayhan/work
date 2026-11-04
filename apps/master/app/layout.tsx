import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { SettingsProvider } from '@/providers/settings-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { TooltipsProvider } from '@/providers/tooltips-provider';
import { Toaster } from '@/components/ui/sonner';
import { MasterSessionProvider } from '@/app/components/MasterSession';
import '@/css/styles.css';
import '@/components/keenicons/assets/styles.css';

const inter=Inter({subsets:['latin']});
export const metadata:Metadata={title:{template:'%s | Ticarti Master',default:'Ticarti Master'},description:'Ticarti platform yönetimi'};
export default function RootLayout({children}:{children:ReactNode}){return <html className="h-full" lang="tr" suppressHydrationWarning><body className={cn('antialiased flex h-full text-base text-foreground bg-background',inter.className)}><MasterSessionProvider><SettingsProvider><ThemeProvider><TooltipsProvider>{children}<Toaster/></TooltipsProvider></ThemeProvider></SettingsProvider></MasterSessionProvider></body></html>}

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TicartiLanguageTabs({tr,en}:{tr:React.ReactNode;en:React.ReactNode}){
  return <Tabs defaultValue="tr" className="w-full">
    <TabsList className="mb-4">
      <TabsTrigger value="tr">Türkçe</TabsTrigger>
      <TabsTrigger value="en">English</TabsTrigger>
    </TabsList>
    <TabsContent value="tr" className="mt-0">{tr}</TabsContent>
    <TabsContent value="en" className="mt-0">{en}</TabsContent>
  </Tabs>;
}

'use client';
import { Search, Plus, EllipsisVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardHeading, CardTable } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';

type Row={name:string; detail:string; count:string; status?:string};
export function CatalogManager({title,description,buttonLabel='Yeni Ekle',rows}:{title:string;description:string;buttonLabel?:string;rows:Row[]}){
 return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">{title}</h1><ToolbarDescription>{description}</ToolbarDescription></ToolbarHeading><ToolbarActions><Button><Plus />{buttonLabel}</Button></ToolbarActions></Toolbar></Container>
 <Container><Card><CardHeader><CardHeading><div className="relative"><Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2"/><Input className="ps-9 w-64" placeholder={`${title} ara...`}/></div></CardHeading></CardHeader><CardTable><Table><TableHeader><TableRow><TableHead>Ad</TableHead><TableHead>Detay</TableHead><TableHead>Bağlı Kayıt</TableHead><TableHead>Durum</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{rows.map((r,i)=><TableRow key={i}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-muted-foreground">{r.detail}</TableCell><TableCell>{r.count}</TableCell><TableCell><Badge appearance="light" variant={r.status==='Pasif'?'secondary':'success'}>{r.status||'Aktif'}</Badge></TableCell><TableCell><Button mode="icon" variant="ghost"><EllipsisVertical/></Button></TableCell></TableRow>)}</TableBody></Table></CardTable></Card></Container></>;
}

'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,LoaderCircle,RefreshCw,Save} from 'lucide-react';
import {useAdminSession} from '@/app/components/AdminSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading,CardTable} from '@/components/ui/card';
import {Dialog,DialogContent,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Textarea} from '@/components/ui/textarea';

const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const statuses=['NEW','IN_REVIEW','QUOTED','ACCEPTED','REJECTED','CLOSED'];

export default function B2BQuotesPage(){
  const {session}=useAdminSession();
  const [rows,setRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [edit,setEdit]=useState<any|null>(null);
  const headers=useCallback((json=false)=>({...json?{'content-type':'application/json'}:{},authorization:`Bearer ${session?.accessToken||''}`,'x-tenant-id':session?.tenantId||''}),[session?.accessToken,session?.tenantId]);
  const load=useCallback(async()=>{if(!session?.storeId)return;setLoading(true);setError('');try{const r=await fetch(`${API}/admin/b2b/quotes?storeId=${encodeURIComponent(session.storeId)}`,{credentials:'include',headers:headers()});const j=await r.json().catch(()=>[]);if(!r.ok)throw new Error(j?.message||'Teklif talepleri alınamadı.');setRows(Array.isArray(j)?j:[])}catch(e:any){setError(e?.message||'Teklif talepleri alınamadı.')}finally{setLoading(false)}},[session?.storeId,headers]);
  useEffect(()=>{void load()},[load]);
  return <><Container><Toolbar><ToolbarHeading><div className="flex items-center gap-3"><Button mode="icon" variant="outline" asChild><Link href="/settings/b2b"><ArrowLeft/></Link></Button><div><h1 className="text-xl font-semibold">B2B Teklif Talepleri</h1><ToolbarDescription>Firma teklif taleplerini soru/cevap kuyruğundan bağımsız yönetin.</ToolbarDescription></div></div></ToolbarHeading><ToolbarActions><Button variant="outline" onClick={()=>void load()}><RefreshCw/>Yenile</Button></ToolbarActions></Toolbar></Container><Container>{error&&<div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}<Card><CardHeader><CardHeading>Teklifler</CardHeading></CardHeader><CardTable>{loading?<div className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin"/></div>:<Table><TableHeader><TableRow><TableHead>Firma</TableHead><TableHead>İletişim</TableHead><TableHead>Adet</TableHead><TableHead>Durum</TableHead><TableHead>Tarih</TableHead><TableHead/></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell><div className="font-medium">{r.companyName||'—'}</div><div className="text-xs text-muted-foreground">{r.subject||'Genel teklif'}</div></TableCell><TableCell><div>{r.email}</div><div className="text-xs text-muted-foreground">{r.phone||'—'}</div></TableCell><TableCell>{r.quantity||1}</TableCell><TableCell><Badge appearance="light">{r.status}</Badge></TableCell><TableCell>{new Date(r.createdAt).toLocaleString('tr-TR')}</TableCell><TableCell><Button size="sm" variant="outline" onClick={()=>setEdit(r)}>İncele</Button></TableCell></TableRow>)}{!rows.length&&<TableRow><TableCell colSpan={6}><div className="py-12 text-center text-sm text-muted-foreground">Henüz teklif talebi yok.</div></TableCell></TableRow>}</TableBody></Table>}</CardTable></Card></Container>{edit&&<QuoteDialog row={edit} storeId={session?.storeId||''} headers={headers} onClose={()=>setEdit(null)} onSaved={load}/>}</>
}

function QuoteDialog({row,storeId,headers,onClose,onSaved}:any){
  const [status,setStatus]=useState(String(row.status||'NEW'));
  const [response,setResponse]=useState(String(row.response||''));
  const [internalNote,setInternalNote]=useState(String(row.internalNote||''));
  const [saving,setSaving]=useState(false);
  const save=async()=>{setSaving(true);const r=await fetch(`${API}/admin/b2b/quotes/${row.id}`,{method:'PATCH',credentials:'include',headers:headers(true),body:JSON.stringify({storeId,status,response,internalNote})});setSaving(false);if(!r.ok){alert('Teklif talebi kaydedilemedi.');return}await onSaved();onClose()};
  return <Dialog open onOpenChange={(v)=>!v&&onClose()}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{row.subject||'B2B Teklif Talebi'}</DialogTitle></DialogHeader><div className="grid gap-4"><Card><CardContent className="pt-4 text-sm"><div><b>Firma:</b> {row.companyName||'—'}</div><div><b>E-posta:</b> {row.email}</div><div><b>Telefon:</b> {row.phone||'—'}</div><div><b>Adet:</b> {row.quantity||1}</div>{row.message&&<div className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3">{row.message}</div>}</CardContent></Card><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{statuses.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><Textarea rows={5} value={response} onChange={e=>setResponse(e.target.value)} placeholder="Müşteriye verilecek teklif/yanıt"/><Textarea rows={3} value={internalNote} onChange={e=>setInternalNote(e.target.value)} placeholder="Ekip içi not"/></div><DialogFooter><Button variant="outline" onClick={onClose}>Kapat</Button><Button onClick={()=>void save()} disabled={saving}>{saving?<LoaderCircle className="animate-spin"/>:<Save/>}Kaydet</Button></DialogFooter></DialogContent></Dialog>
}

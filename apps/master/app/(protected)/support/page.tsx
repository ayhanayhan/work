'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {useMasterSession} from '@/app/components/MasterSession';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarActions,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Dialog,DialogBody,DialogContent,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {LifeBuoy,LoaderCircle,MessageSquare,RefreshCw,Search} from 'lucide-react';

type TicketMessage={id:string;body:string;authorType:string;isInternal?:boolean;createdAt:string};
type Ticket={id:string;subject:string;ticketNumber?:string;category?:string;priority:string;status:string;assignedTo?:string|null;updatedAt:string;createdAt:string;tenant?:{id:string;name?:string;slug?:string};messages:TicketMessage[]};
const STATUSES:Record<string,string>={OPEN:'Açık',IN_PROGRESS:'İşlemde',WAITING_CUSTOMER:'Müşteri Yanıtı Bekleniyor',RESOLVED:'Çözüldü',CLOSED:'Kapalı'};
const PRIORITIES:Record<string,string>={LOW:'Düşük',NORMAL:'Normal',HIGH:'Yüksek',URGENT:'Acil'};
const fmt=(date?:string)=>date?new Date(date).toLocaleString('tr-TR'):'—';
const messageError=(e:unknown)=>e instanceof Error?e.message:'İşlem gerçekleştirilemedi.';

export default function Page(){
  const {request,restoring}=useMasterSession();
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('ALL');
  const [priority,setPriority]=useState('ALL');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [internal,setInternal]=useState(false);
  const [editStatus,setEditStatus]=useState('OPEN');
  const [editPriority,setEditPriority]=useState('NORMAL');
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{
      const result=await request('/superadmin/support/tickets');
      setTickets(Array.isArray(result)?result:[]);
    }catch(e){setError(messageError(e))}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);

  const selected=tickets.find(x=>x.id===selectedId)||null;
  const open=(ticket:Ticket)=>{
    setSelectedId(ticket.id);setEditStatus(ticket.status);setEditPriority(ticket.priority);
    setMessage('');setInternal(false);setError('');
  };
  const filtered=useMemo(()=>tickets.filter(ticket=>{
    if(status!=='ALL'&&ticket.status!==status)return false;
    if(priority!=='ALL'&&ticket.priority!==priority)return false;
    const needle=query.trim().toLocaleLowerCase('tr');
    if(!needle)return true;
    return [ticket.subject,ticket.ticketNumber,ticket.category,ticket.id,ticket.tenant?.name,ticket.tenant?.slug].some(v=>String(v||'').toLocaleLowerCase('tr').includes(needle));
  }),[tickets,query,status,priority]);
  const counts=useMemo(()=>({
    all:tickets.length,open:tickets.filter(x=>x.status==='OPEN').length,
    inProgress:tickets.filter(x=>x.status==='IN_PROGRESS').length,
    waiting:tickets.filter(x=>x.status==='WAITING_CUSTOMER').length,
    resolved:tickets.filter(x=>['RESOLVED','CLOSED'].includes(x.status)).length,
  }),[tickets]);

  const save=async()=>{
    if(!selected)return;
    if(!message.trim()&&editStatus===selected.status&&editPriority===selected.priority){setError('Yanıt yazın veya durum / öncelik değiştirin.');return;}
    if(message.length>10000){setError('Yanıt en fazla 10.000 karakter olabilir.');return;}
    setBusy(true);setError('');
    try{
      const updated=await request('/superadmin/support/tickets/'+encodeURIComponent(selected.id),{
        method:'PATCH',
        body:JSON.stringify({status:editStatus,priority:editPriority,...(message.trim()?{message:message.trim(),isInternal:internal}:{})}),
      });
      setTickets(current=>current.map(x=>x.id===updated.id?updated:x));
      setMessage('');setInternal(false);
    }catch(e){setError(messageError(e))}
    finally{setBusy(false)}
  };
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Mağaza Destek Talepleri</h1><ToolbarDescription>Mağazalardan gelen destek kayıtlarını ve yanıtlarını tek merkezden yönetin.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[[counts.all,'Toplam'],[counts.open,'Açık'],[counts.inProgress,'İşlemde'],[counts.waiting,'Yanıt Bekleyen'],[counts.resolved,'Çözülen']].map(([value,label])=><Card key={label}><CardContent className="p-5"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></CardContent></Card>)}
      </div>
      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_190px_170px]">
          <div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" placeholder="Talep numarası, mağaza veya konu ara" value={query} onChange={e=>setQuery(e.target.value)}/></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Durum"/></SelectTrigger><SelectContent><SelectItem value="ALL">Tüm durumlar</SelectItem>{Object.entries(STATUSES).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue placeholder="Öncelik"/></SelectTrigger><SelectContent><SelectItem value="ALL">Tüm öncelikler</SelectItem>{Object.entries(PRIORITIES).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>
      {error&&!selected?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
      <Card><CardHeader><CardHeading>Destek Listesi</CardHeading></CardHeader><CardContent className="overflow-x-auto p-0">
        {loading?<div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin"/></div>:
        <Table><TableHeader><TableRow><TableHead>Talep</TableHead><TableHead>Mağaza</TableHead><TableHead>Öncelik</TableHead><TableHead>Durum</TableHead><TableHead>Güncellendi</TableHead><TableHead className="text-end">İşlem</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(ticket=><TableRow key={ticket.id}>
          <TableCell><div className="font-medium">{ticket.subject}</div><div className="text-xs text-muted-foreground">{ticket.ticketNumber||ticket.id.slice(0,8)} · {ticket.category||'Genel'}</div></TableCell>
          <TableCell>{ticket.tenant?.name||ticket.tenant?.slug||ticket.tenant?.id||'—'}</TableCell>
          <TableCell><Badge appearance="light" variant={ticket.priority==='URGENT'?'destructive':ticket.priority==='HIGH'?'warning':'secondary'}>{PRIORITIES[ticket.priority]||ticket.priority}</Badge></TableCell>
          <TableCell><Badge appearance="light" variant={ticket.status==='RESOLVED'?'success':ticket.status==='CLOSED'?'secondary':'warning'}>{STATUSES[ticket.status]||ticket.status}</Badge></TableCell>
          <TableCell>{fmt(ticket.updatedAt)}</TableCell>
          <TableCell className="text-end"><Button size="sm" variant="outline" onClick={()=>open(ticket)}>Aç / Yanıtla</Button></TableCell>
        </TableRow>)}{!filtered.length?<TableRow><TableCell colSpan={6}><div className="grid justify-items-center gap-2 py-12 text-sm text-muted-foreground"><LifeBuoy className="size-7"/>Destek kaydı bulunamadı.</div></TableCell></TableRow>:null}</TableBody></Table>}
      </CardContent></Card>
    </Container>
    <Dialog open={!!selected} onOpenChange={visible=>{if(!visible){setSelectedId(null);setMessage('');setError('')}}}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader><DialogTitle>{selected?.ticketNumber||'Destek Talebi'} · {selected?.subject}</DialogTitle></DialogHeader>
        <DialogBody className="max-h-[76vh] overflow-y-auto">
          {selected?<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid content-start gap-4">
              <div className="grid min-h-64 gap-3 rounded-lg border bg-muted/20 p-4">
                {(selected.messages||[]).filter(x=>!!x.body).map(entry=><div key={entry.id} className={'rounded-lg border bg-background p-3 '+(entry.isInternal?'border-warning/50':'')}>
                  <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{entry.authorType==='merchant'?'Mağaza':entry.authorType==='support'?'Ticarti Destek':entry.authorType}{entry.isInternal?' · İç not':''}</span><span>{fmt(entry.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm">{entry.body}</div>
                </div>)}
                {!selected.messages?.length?<p className="text-sm text-muted-foreground">Henüz mesaj yok.</p>:null}
              </div>
              <label className="grid gap-2 text-sm font-medium">Yanıt / not<Textarea rows={5} maxLength={10000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Mağazaya yanıt yazın..."/></label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={internal} onCheckedChange={setInternal}/>Yalnızca ekip içi not (mağazaya gösterilmez)</label>
            </div>
            <div className="grid content-start gap-4">
              <Card><CardContent className="grid gap-4 p-4">
                <div><div className="text-xs text-muted-foreground">Mağaza</div><div className="font-medium">{selected.tenant?.name||selected.tenant?.slug||'—'}</div></div>
                <div><div className="text-xs text-muted-foreground">Kategori</div><div>{selected.category||'Genel'}</div></div>
                <label className="grid gap-2 text-sm">Durum<Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(STATUSES).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
                <label className="grid gap-2 text-sm">Öncelik<Select value={editPriority} onValueChange={setEditPriority}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(PRIORITIES).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
                <div className="text-xs text-muted-foreground">Oluşturuldu: {fmt(selected.createdAt)}</div>
              </CardContent></Card>
            </div>
          </div>:null}
          {error?<p className="mt-3 text-sm text-destructive">{error}</p>:null}
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={()=>setSelectedId(null)}>Kapat</Button><Button disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:<MessageSquare className="size-4"/>}Kaydet / Gönder</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

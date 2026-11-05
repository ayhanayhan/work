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
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {LoaderCircle,Mail,RefreshCw,Search} from 'lucide-react';

type Inquiry={id:string;fullName:string;email:string;phone?:string|null;subject:string;message:string;status:string;replyDraft?:string|null;internalNote?:string|null;createdAt:string;updatedAt:string};
const STATUS:Record<string,string>={NEW:'Yeni',IN_PROGRESS:'İşlemde',ANSWERED:'Yanıtlandı',CLOSED:'Kapalı'};
const fmt=(v:string)=>new Date(v).toLocaleString('tr-TR');
const errorText=(e:unknown)=>e instanceof Error?e.message:'İşlem başarısız.';

export default function ContactInboxPage(){
  const {request,restoring}=useMasterSession();
  const [rows,setRows]=useState<Inquiry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [q,setQ]=useState('');
  const [filter,setFilter]=useState('ALL');
  const [id,setId]=useState<string|null>(null);
  const [status,setStatus]=useState('NEW');
  const [reply,setReply]=useState('');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const load=useCallback(async()=>{
    if(restoring)return;
    setLoading(true);setError('');
    try{const data=await request('/superadmin/contact');setRows(Array.isArray(data)?data:[])}
    catch(e){setError(errorText(e))}
    finally{setLoading(false)}
  },[request,restoring]);
  useEffect(()=>{void load()},[load]);
  const selected=rows.find(x=>x.id===id)||null;
  const shown=useMemo(()=>rows.filter(x=>{
    if(filter!=='ALL'&&x.status!==filter)return false;
    const text=[x.fullName,x.email,x.subject,x.message].join(' ').toLocaleLowerCase('tr');
    return !q.trim()||text.includes(q.trim().toLocaleLowerCase('tr'));
  }),[rows,q,filter]);
  const open=(x:Inquiry)=>{setId(x.id);setStatus(x.status);setReply(x.replyDraft||'');setNote(x.internalNote||'');setNotice('');setError('')};
  const save=async()=>{
    if(!selected)return;
    setBusy(true);setError('');setNotice('');
    try{
      const updated=await request('/superadmin/contact/'+encodeURIComponent(selected.id),{
        method:'PATCH',body:JSON.stringify({status,replyDraft:reply,internalNote:note})
      });
      setRows(x=>x.map(row=>row.id===updated.id?updated:row));
      setNotice('Kayıt güncellendi. Yanıt taslağı e-posta olarak otomatik gönderilmez.');
    }catch(e){setError(errorText(e))}
    finally{setBusy(false)}
  };
  const mailto=selected?'mailto:'+encodeURIComponent(selected.email)+'?subject='+encodeURIComponent('Re: '+selected.subject)+'&body='+encodeURIComponent(reply):'';
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">İletişim Mesajları</h1><ToolbarDescription>Ticarti web sitesinden gelen iletişim formlarını görüntüleyin ve takip edin.</ToolbarDescription></ToolbarHeading><ToolbarActions><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw className="size-4"/>Yenile</Button></ToolbarActions></Toolbar></Container>
    <Container className="grid gap-5 pb-10">
      <div className="grid gap-4 sm:grid-cols-3">{[[rows.length,'Toplam mesaj'],[rows.filter(x=>x.status==='NEW').length,'Yeni mesaj'],[rows.filter(x=>x.status==='IN_PROGRESS').length,'İşlemde']].map(([number,label])=><Card key={label}><CardContent className="p-5"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{number}</div></CardContent></Card>)}</div>
      <Card><CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="ps-9" placeholder="İsim, e-posta, konu veya mesaj ara" value={q} onChange={e=>setQ(e.target.value)}/></div><Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Tüm durumlar</SelectItem>{Object.entries(STATUS).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></CardContent></Card>
      {error&&!selected?<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>:null}
      <Card><CardHeader><CardHeading>Gelen Kutusu</CardHeading></CardHeader><CardContent className="overflow-x-auto p-0">
        {loading?<div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin"/></div>:<Table>
          <TableHeader><TableRow><TableHead>Gönderen</TableHead><TableHead>Konu</TableHead><TableHead>Durum</TableHead><TableHead>Tarih</TableHead><TableHead className="text-end">İşlem</TableHead></TableRow></TableHeader>
          <TableBody>{shown.map(item=><TableRow key={item.id}>
            <TableCell><div className="font-medium">{item.fullName}</div><div className="text-xs text-muted-foreground">{item.email}</div></TableCell>
            <TableCell><div className="max-w-80 truncate">{item.subject}</div></TableCell>
            <TableCell><Badge appearance="light" variant={item.status==='NEW'?'warning':item.status==='ANSWERED'?'success':'secondary'}>{STATUS[item.status]||item.status}</Badge></TableCell>
            <TableCell>{fmt(item.createdAt)}</TableCell>
            <TableCell className="text-end"><Button variant="outline" size="sm" onClick={()=>open(item)}>Aç / İşlem Yap</Button></TableCell>
          </TableRow>)}{!shown.length?<TableRow><TableCell colSpan={5}><div className="py-12 text-center text-sm text-muted-foreground">İletişim mesajı bulunamadı.</div></TableCell></TableRow>:null}</TableBody>
        </Table>}
      </CardContent></Card>
    </Container>
    <Dialog open={!!selected} onOpenChange={v=>{if(!v){setId(null);setError('');setNotice('')}}}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader><DialogTitle>{selected?.subject||'İletişim mesajı'}</DialogTitle></DialogHeader>
        <DialogBody className="grid max-h-[76vh] gap-4 overflow-y-auto">
          {selected?<div className="grid gap-4">
            <div className="grid gap-1 rounded-lg border p-4 text-sm"><div className="font-medium">{selected.fullName}</div><div>{selected.email}{selected.phone?' · '+selected.phone:''}</div><div className="text-xs text-muted-foreground">{fmt(selected.createdAt)}</div><p className="mt-3 whitespace-pre-wrap break-words border-t pt-3">{selected.message}</p></div>
            <label className="grid gap-2 text-sm font-medium">Durum<Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(STATUS).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
            <label className="grid gap-2 text-sm font-medium">Yanıt taslağı<Textarea rows={5} maxLength={10000} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Yanıtınızı hazırlayın..."/></label>
            <label className="grid gap-2 text-sm font-medium">İç not<Textarea rows={3} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label>
            <p className="text-xs text-muted-foreground">Yanıt taslağı kaydedilir; otomatik e-posta gönderilmez. E-posta uygulamanızda yanıtlamak için aşağıdaki bağlantıyı kullanın.</p>
          </div>:null}
          {notice?<p className="text-sm text-success">{notice}</p>:null}
          {error?<p className="text-sm text-destructive">{error}</p>:null}
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={()=>setId(null)}>Kapat</Button><Button variant="outline" asChild><a href={mailto}><Mail className="size-4"/>E-postada Aç</a></Button><Button disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle className="size-4 animate-spin"/>:null}Kaydet</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

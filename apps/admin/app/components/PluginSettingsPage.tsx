'use client';

import Link from 'next/link';
import {FormEvent,useMemo,useState} from 'react';
import {Icon} from '@iconify/react';

type Props={
  data:any;
  slug:string;
  req:(path:string,options?:any)=>Promise<any>;
  reload:()=>Promise<void>;
  refreshInstalledApps:()=>Promise<any[]>;
};

type FieldDef={key:string;label:string;type?:string;placeholder?:string;required?:boolean;description?:string};

export default function PluginSettingsPage({data,slug,req,reload,refreshInstalledApps}:Props){
  const plugin=data?.plugin;
  const app=plugin?.app;
  const [tab,setTab]=useState<'general'|'connection'|'about'>('general');
  const [enabled,setEnabled]=useState(Boolean(plugin?.install?.enabled));
  const [busy,setBusy]=useState(false);
  const [savingState,setSavingState]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  const fields=useMemo<FieldDef[]>(()=>{
    const raw=app?.settingsSchema?.fields;
    if(!Array.isArray(raw))return [];
    return raw.filter((f:any)=>f&&typeof f.key==='string'&&/^[a-zA-Z][a-zA-Z0-9_.-]{0,100}$/.test(f.key)).map((f:any)=>({
      key:f.key,label:String(f.label||f.key),
      type:String(f.type||'text'),placeholder:String(f.placeholder||''),
      description:String(f.description||''),required:!!f.required
    }));
  },[app?.settingsSchema]);

  if(!plugin||!app)return <section className="card"><div className="card-body p-4">
    <h3>Uygulama bulunamadı</h3><p>Bu uygulama mağazanızda kurulu olmayabilir.</p>
    <Link href="/extensions/installed" className="btn btn-outline-secondary">Eklentilerime dön</Link>
  </div></section>;

  const config=plugin?.connection?.config||plugin?.install?.config||{};
  const isIntegration=!!app.provider&&!!app.integrationType&&app.kind!=='AI';
  const logo=String(app.marketplace?.logoUrl||'');
  const hasCredentials=!!plugin.connection;

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;
    const form=new FormData(e.currentTarget);
    const credentials:Record<string,string>={};
    for(const f of fields){
      const value=String(form.get(f.key)||'').trim();
      if(value)credentials[f.key]=value;
    }
    const note=String(form.get('note')||'');
    setBusy(true);setMessage('');setError('');
    try{
      await req('/admin/apps/installed/'+encodeURIComponent(slug)+'/settings',{
        method:'PATCH',body:JSON.stringify({credentials,config:{...config,note}})
      });
      setMessage('Uygulama ayarları kaydedildi.');
      await reload();
    }catch(e:any){setError(e?.message||'Ayarlar kaydedilemedi.')}
    finally{setBusy(false)}
  }
  async function toggle(){
    if(savingState)return;
    setSavingState(true);setError('');setMessage('');
    try{
      const next=!enabled;
      await req('/admin/apps/installed/'+encodeURIComponent(slug)+'/state',{
        method:'PATCH',body:JSON.stringify({enabled:next})
      });
      setEnabled(next);
      await refreshInstalledApps();
      setMessage(next?'Uygulama etkinleştirildi.':'Uygulama pasife alındı.');
    }catch(e:any){setError(e?.message||'Uygulama durumu güncellenemedi.')}
    finally{setSavingState(false)}
  }

  return <div className="plugin-settings-page">
    <div className="mb-4">
      <Link className="btn btn-sm btn-outline-secondary" href="/extensions/installed"><Icon icon="iconoir:arrow-left" className="me-1"/>Eklentilerime dön</Link>
    </div>
    <div className="card mb-4">
      <div className="card-body p-4 d-flex align-items-center flex-wrap gap-3">
        <div className="plugin-icon plugin-icon-lg plugin-logo">
          {logo?<img alt="" src={logo}/>:<Icon icon={app.icon||'iconoir:puzzle'} width="33"/>}
        </div>
        <div className="flex-grow-1">
          <div className="d-flex align-items-center flex-wrap gap-2 mb-1"><h2 className="mb-0">{app.name}</h2>
            <span className={'badge '+(enabled?'bg-success-subtle text-success':'bg-secondary-subtle text-secondary')}>{enabled?'Aktif':'Pasif'}</span>
          </div>
          <p className="text-muted mb-0">{app.summary||app.description||'Uygulama ayarlarını yönetin.'}</p>
          <small className="text-muted">Geliştirici: {app.developer||'Ticarti'} · {app.category}</small>
        </div>
        <button type="button" className={'btn '+(enabled?'btn-outline-secondary':'btn-primary')} disabled={savingState} onClick={()=>void toggle()}>
          <Icon icon={enabled?'iconoir:pause':'iconoir:play'} className="me-1"/>{savingState?'Güncelleniyor…':enabled?'Pasife al':'Etkinleştir'}
        </button>
      </div>
    </div>
    {message?<div className="alert alert-success" role="status">{message}</div>:null}
    {error?<div className="alert alert-danger" role="alert">{error}</div>:null}
    <div className="row g-4">
      <div className="col-12 col-xl-9">
        <div className="card">
          <div className="card-header border-bottom-0 pb-0">
            <div className="d-flex flex-wrap gap-2" role="tablist" aria-label="Uygulama ayar bölümleri">
              <button type="button" role="tab" aria-selected={tab==='general'} className={'btn btn-sm '+(tab==='general'?'btn-primary':'btn-outline-secondary')} onClick={()=>setTab('general')}>Genel Ayarlar</button>
              {isIntegration?<button type="button" role="tab" aria-selected={tab==='connection'} className={'btn btn-sm '+(tab==='connection'?'btn-primary':'btn-outline-secondary')} onClick={()=>setTab('connection')}>Bağlantı Bilgileri</button>:null}
              <button type="button" role="tab" aria-selected={tab==='about'} className={'btn btn-sm '+(tab==='about'?'btn-primary':'btn-outline-secondary')} onClick={()=>setTab('about')}>Uygulama Bilgileri</button>
            </div>
          </div>
          <div className="card-body p-4">
            {tab==='about'?<section>
              <h3 className="mb-3">Uygulama hakkında</h3>
              <p className="text-muted" style={{whiteSpace:'pre-wrap'}}>{app.description||app.summary||'Açıklama eklenmemiş.'}</p>
              {app.marketplace?.usageGuide?<><h4 className="mt-4">Nasıl kullanılır?</h4><p style={{whiteSpace:'pre-wrap'}}>{app.marketplace.usageGuide}</p></>:null}
            </section>:<form onSubmit={save}>
              <div className="mb-4"><h3 className="mb-1">{tab==='connection'?'Bağlantı Bilgileri':'Genel Ayarlar'}</h3>
              <p className="text-muted mb-0">{tab==='connection'?'Gerekli API ve entegrasyon bilgilerini girin. Gizli bilgiler tekrar gösterilmez.':'Bu uygulamanın mağazanızdaki yapılandırmasını düzenleyin.'}</p></div>
              {tab==='connection'?<div className="row g-3">
                {fields.length?fields.map(f=><div className="col-md-6" key={f.key}>
                  <label className="form-label" htmlFor={'plugin-'+f.key}>{f.label}</label>
                  <input id={'plugin-'+f.key} name={f.key} className="form-control"
                    type={f.type==='password'?'password':f.type==='url'?'url':f.type==='email'?'email':'text'}
                    placeholder={f.placeholder||(hasCredentials&&f.type==='password'?'Mevcut değer korunur; değiştirmek için yeni değer girin':'')}
                    autoComplete={f.type==='password'?'new-password':'off'}
                    required={f.required&&!hasCredentials}/>
                  {f.description?<small className="form-text text-muted">{f.description}</small>:null}
                </div>):<div className="col-12"><p className="text-muted">Bu uygulama için bağlantı alanı tanımlanmamış.</p></div>}
              </div>:<div className="row g-3">
                <div className="col-12">
                  <label className="form-label" htmlFor="plugin-note">Yönetim notu</label>
                  <textarea id="plugin-note" className="form-control" rows={5} name="note" defaultValue={String(config.note||'')} placeholder="Bu uygulama için dahili notlarınız"/>
                  <small className="form-text text-muted">Bu not yalnızca mağaza yönetiminde saklanır.</small>
                </div>
                {slug==='fixed-currency-prices'?<div className="col-12"><div className="alert alert-info">Sabit Döviz Fiyatları uygulaması etkin olduğunda ürün düzenleme ekranındaki fiyat alanları kullanılabilir.</div></div>:null}
              </div>}
              <div className="d-flex justify-content-end gap-2 border-top mt-4 pt-4">
                <Link href="/extensions/installed" className="btn btn-outline-secondary">Vazgeç</Link>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy?'Kaydediliyor…':'Değişiklikleri Kaydet'}</button>
              </div>
            </form>}
          </div>
        </div>
      </div>
      <aside className="col-12 col-xl-3">
        <div className="card"><div className="card-body p-4">
          <h4 className="mb-3">Uygulama Durumu</h4>
          <dl className="mb-0">
            <dt className="text-muted fs-12">Durum</dt><dd className="mb-3">{enabled?'Etkin':'Pasif'}</dd>
            <dt className="text-muted fs-12">Geliştirici</dt><dd className="mb-3">{app.developer||'Ticarti'}</dd>
            <dt className="text-muted fs-12">Kategori</dt><dd className="mb-3">{app.category||'Diğer'}</dd>
            <dt className="text-muted fs-12">Kurulum tarihi</dt><dd className="mb-3">{plugin.install?.installedAt?new Date(plugin.install.installedAt).toLocaleDateString('tr-TR'):'—'}</dd>
            {isIntegration?<><dt className="text-muted fs-12">Entegrasyon</dt><dd>{hasCredentials?'Bağlantı kaydı var':'Bağlantı bekleniyor'}</dd></>:null}
          </dl>
        </div></div>
      </aside>
    </div>
  </div>;
}

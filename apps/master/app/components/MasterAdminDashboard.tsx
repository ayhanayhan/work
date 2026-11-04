'use client';

import { Icon } from '@iconify/react';
import Link from 'next/link';

function number(v:any){return new Intl.NumberFormat('tr-TR').format(Number(v||0))}
function money(v:any){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(Number(v||0))}
function date(v:any){if(!v)return'-';return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}

export default function MasterAdminDashboard({data}:{data:any}){
  const m=data?.metrics||{};
  const tenants=Array.isArray(data?.recentTenants)?data.recentTenants:[];
  const stats=[
    {title:'Toplam Mağaza',value:number(m.tenants),sub:'Platformdaki tüm mağazalar',icon:'iconoir:shop',tone:'success',href:'/tenants'},
    {title:'Aktif Mağaza',value:number(m.activeTenants),sub:'Aktif durumdaki mağazalar',icon:'iconoir:check-circle',tone:'info',href:'/tenants'},
    {title:'Üyelikler',value:number(m.users),sub:'Kayıtlı mağaza kullanıcıları',icon:'iconoir:group',tone:'secondary',href:'/memberships'},
    {title:'Aktif Ürün',value:number(m.products),sub:'Tüm mağazalardaki aktif ürünler',icon:'iconoir:box-iso',tone:'warning',href:'/tenants'},
  ];

  return <div className="rizz-ecom-dashboard master-dashboard-clone">
    <div className="row g-3">
      <div className="col-xl-4">
        <div className="rizz-ecom-stat-stack">
          {stats.map((s,index)=><article className="card rizz-ecom-stat" key={s.title}>
            <div className="card-body">
              <div className="rizz-ecom-stat-top">
                <span className={'rizz-ecom-stat-icon '+s.tone}><Icon icon={s.icon}/></span>
                <div className="rizz-ecom-spark" aria-hidden="true">{[28,48,35,63,42,75,52,82,68,90].map((h,i)=><i key={i} style={{height:`${Math.max(18,Math.min(96,h+(index*4)))}%`}}/>)}</div>
              </div>
              <h6>{s.title}</h6>
              <div className="rizz-ecom-stat-bottom">
                <div><strong>{s.value}</strong><small>{s.sub}</small></div>
                <Link className="btn btn-sm btn-light" href={s.href}>Görüntüle</Link>
              </div>
            </div>
          </article>)}
        </div>
      </div>

      <div className="col-xl-8">
        <section className="card h-100 rizz-ecom-income">
          <div className="card-header">
            <div><h5 className="card-title mb-1">Platform Cirosu</h5><small className="text-muted">Ödenmiş siparişlerin toplam hacmi</small></div>
            <Link href="/tenants" className="btn btn-light btn-sm"><Icon icon="iconoir:stats-up-square" className="me-1"/>Mağazaları Aç</Link>
          </div>
          <div className="card-body pt-0">
            <div className="master-dashboard-gmv">
              <span>Toplam GMV</span>
              <strong>{money(m.gmV)}</strong>
              <small>{number(m.orders)} toplam sipariş</small>
            </div>
            <div className="row g-2 mt-2">
              <div className="col-md-4"><div className="rizz-ecom-mini"><span>Toplam Mağaza</span><strong>{number(m.tenants)}</strong></div></div>
              <div className="col-md-4"><div className="rizz-ecom-mini"><span>Aktif Mağaza</span><strong>{number(m.activeTenants)}</strong></div></div>
              <div className="col-md-4"><div className="rizz-ecom-mini"><span>Açık Destek</span><strong>{number(m.openTickets)}</strong></div></div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div className="row g-3 mt-0">
      <div className="col-xl-8">
        <section className="card rizz-ecom-orders">
          <div className="card-header">
            <div><h5 className="card-title mb-1">Son Mağazalar</h5><small className="text-muted">Yeni açılan mağazalar ve temel durumları</small></div>
            <Link href="/tenants" className="btn btn-light btn-sm">Tümünü Gör</Link>
          </div>
          <div className="card-body pt-0">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light"><tr><th>Mağaza</th><th>Plan</th><th>Durum</th><th>Ürün</th><th className="text-end">Sipariş</th></tr></thead>
                <tbody>
                  {tenants.length?tenants.map((t:any)=><tr key={t.id}>
                    <td><strong>{t.name||t.slug}</strong><small>{date(t.createdAt)}</small></td>
                    <td>{t.subscriptions?.[0]?.plan?.name||'—'}</td>
                    <td><span className={'badge '+(t.status==='ACTIVE'?'bg-success-subtle text-success':'bg-warning-subtle text-warning')}>{t.status||'—'}</span></td>
                    <td>{number(t._count?.products)}</td>
                    <td className="text-end"><strong>{number(t._count?.orders)}</strong></td>
                  </tr>):<tr><td colSpan={5} className="text-center text-muted py-5">Henüz mağaza yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className="col-xl-4">
        <section className="card h-100 rizz-ecom-customers">
          <div className="card-header"><h5 className="card-title mb-0">Platform Özeti</h5></div>
          <div className="card-body pt-0">
            <div className="rizz-ecom-donut" style={{background:`conic-gradient(var(--bs-primary) 0 ${m.tenants?Number(m.activeTenants||0)/Number(m.tenants)*100:0}%, #eef1f5 0)`}}>
              <div><strong>{number(m.activeTenants)}</strong><span>Aktif</span></div>
            </div>
            <div className="rizz-ecom-legend">
              <span><i className="primary"/>Aktif mağaza <b>{number(m.activeTenants)}</b></span>
              <span><i className="info"/>Toplam mağaza <b>{number(m.tenants)}</b></span>
            </div>
            <Link href="/tenants" className="btn btn-light w-100 mt-3">Mağazaları Yönet</Link>
          </div>
        </section>
      </div>
    </div>

    <div className="row g-3 mt-0">
      <div className="col-md-4"><section className="card rizz-ecom-bottom-card"><div className="card-header"><h5 className="card-title mb-0">Destek Durumu</h5></div><div className="card-body pt-0"><div className={'rizz-ecom-alert '+(Number(m.openTickets||0)>0?'danger':'success')}><span><Icon icon={Number(m.openTickets||0)>0?'iconoir:warning-triangle':'iconoir:check-circle'}/></span><div><strong>{Number(m.openTickets||0)>0?`${m.openTickets} açık destek kaydı`:'Destek kuyruğu temiz'}</strong><small>{Number(m.openTickets||0)>0?'Açık talepleri kontrol edin.':'Bekleyen destek talebi yok.'}</small></div></div><Link className="btn btn-light w-100" href="/support">Desteği Aç</Link></div></section></div>
      <div className="col-md-4"><section className="card rizz-ecom-bottom-card"><div className="card-header"><h5 className="card-title mb-0">Sipariş Özeti</h5></div><div className="card-body pt-0"><div className="master-dashboard-number"><span>Toplam Sipariş</span><strong>{number(m.orders)}</strong></div><div className="master-dashboard-number"><span>Toplam GMV</span><strong>{money(m.gmV)}</strong></div></div></section></div>
      <div className="col-md-4"><section className="card rizz-ecom-bottom-card"><div className="card-header"><h5 className="card-title mb-0">Hızlı İşlemler</h5></div><div className="card-body pt-0"><div className="rizz-ecom-quick"><Link href="/tenants"><span><Icon icon="iconoir:shop"/></span><div><b>Mağazaları yönet</b><small>Mağaza ve durumlar</small></div><Icon icon="iconoir:nav-arrow-right"/></Link><Link href="/memberships"><span><Icon icon="iconoir:group"/></span><div><b>Üyelikleri aç</b><small>Kullanıcı ve mağazalar</small></div><Icon icon="iconoir:nav-arrow-right"/></Link><Link href="/settings"><span><Icon icon="iconoir:settings"/></span><div><b>Ayarları aç</b><small>Platform ayarları</small></div><Icon icon="iconoir:nav-arrow-right"/></Link></div></div></section></div>
    </div>
  </div>;
}

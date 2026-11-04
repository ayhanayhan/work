import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function LocalizationPage(){
  return <div className="settings-v15-detail">
    <div className="settings-v15-detail-head">
      <div>
        <h4 className="mb-1">Dil / Para Birimi</h4>
        <p className="text-muted mb-0">Dil, para birimi ve bölgesel ayarlar.</p>
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link href="/dashboard">Commerce</Link></li>
          <li className="breadcrumb-item"><Link href="/settings">Ayarlar</Link></li>
          <li className="breadcrumb-item active">Dil / Para Birimi</li>
        </ol>
      </div>
    </div>
    <div className="admin-settings-grid">
      <Link href="/settings/languages" className="admin-settings-card">
        <span className="admin-settings-icon"><Icon icon="iconoir:language"/></span>
        <div className="admin-settings-card-copy"><h3>Diller</h3><p>Platform dillerini, varsayılan dili ve kullanım durumlarını yönetin.</p></div>
      </Link>
      <Link href="/settings/currencies" className="admin-settings-card">
        <span className="admin-settings-icon"><Icon icon="iconoir:coins"/></span>
        <div className="admin-settings-card-copy"><h3>Para Birimleri</h3><p>Platform para birimlerini ve varsayılan para birimini yönetin.</p></div>
      </Link>
    </div>
  </div>;
}

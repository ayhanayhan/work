import { Icon } from '@iconify/react';

export default function NotFound(){
  return <main className="commerce-auth-page commerce-error-page"><div className="commerce-auth-wrap"><div className="card commerce-auth-card border-0 shadow-sm">
    <div className="card-body p-0 commerce-auth-header rounded-top"><div className="text-center p-4"><a href="/" className="commerce-auth-brand"><span>C</span><b>Commerce</b></a></div></div>
    <div className="card-body commerce-auth-body text-center py-5"><div className="commerce-error-code">404</div><div className="commerce-error-icon"><Icon icon="iconoir:page"/></div><h4 className="mt-3">Sayfa bulunamadı</h4><p className="text-muted mb-4">Aradığınız sayfa taşınmış, silinmiş veya bağlantı hatalı olabilir.</p><a href="/dashboard" className="btn btn-primary"><Icon icon="iconoir:home-simple" className="me-1"/>Ana Sayfaya Dön</a></div>
  </div></div></main>;
}

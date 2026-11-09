import DevPage from '@/components/dev-page';
export const metadata={title:'Webhook rehberi | Ticarti Developer'};
export default function Page(){return <DevPage title="Webhook’lar" description="Mağaza olaylarını dış sistemlere iletmek için abonelik yönetimi ve güvenli işleme ilkeleri.">
 <h2>Webhook abonelikleri</h2><p>Mevcut mağaza yönetim API'sinde webhook abonelikleri <code>GET /v1/admin/webhooks</code> ile listelenir ve <code>POST /v1/admin/webhooks</code> ile oluşturulur. Her iki işlem de mağaza yetkisi gerektirir.</p>
 <h2>Abonelik isteği</h2><pre><code>{'POST /v1/admin/webhooks\nContent-Type: application/json\n\n{\n  "url": "https://example.com/webhooks/ticarti",\n  "events": ["..."]\n}'}</code></pre><p>Örnekteki olay listesi yer tutucudur; desteklenen olay adları backend ile doğrulanmadan kullanılmamalıdır.</p>
 <h2>Teslimat güvenliği</h2><ul><li>Bildirim kaynağını doğrulayın; yalnızca URL'ye güvenmeyin.</li><li>Yinelenen mesajları idempotent işleyin.</li><li>Hızlı yanıt verip ağır işlemleri kuyruğa alın.</li><li>Başarısız teslimatları izleyin ve gerektiğinde yeniden deneyin.</li></ul>
 </DevPage>}
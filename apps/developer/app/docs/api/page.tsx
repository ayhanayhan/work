import DevPage from '@/components/dev-page';
export const metadata={title:'API referansı | Ticarti Developer'};
const endpoints=[['GET','/v1/health','Sağlık kontrolü','Genel'],['GET','/v1/admin/apps/installed','Mağazadaki kurulu uygulamalar','Yetkili mağaza oturumu'],['GET','/v1/admin/webhooks','Mağaza webhook abonelikleri','Yetkili mağaza oturumu'],['POST','/v1/admin/webhooks','Mağaza webhook aboneliği oluşturma','Yetkili mağaza oturumu']];
export default function Page(){return <DevPage title="API referansı" description="Mevcut API kodunda doğrulanan temel uç noktalar, erişim şartları ve örnek bir HTTP isteği.">
 <h2>Temel adres</h2><p>Developer alan adında <code>/v1/*</code> yolları Ticarti API'ye yönlendirilir. Yetkili yönetim çağrıları için mağaza oturumu gereklidir.</p>
 <pre><code>{'curl -i https://dev.ticarti.com/v1/health'}</code></pre>
 <h2>Uç noktalar</h2><table className="dev-doc__table"><thead><tr><th>Yöntem</th><th>Yol</th><th>Açıklama</th><th>Erişim</th></tr></thead><tbody>{endpoints.map(x=><tr key={x[0]+x[1]}>{x.map((v,i)=><td key={i}>{i===1?<code>{v}</code>:v}</td>)}</tr>)}</tbody></table>
 <h2>Hatalar ve izinler</h2><p>4xx durumlarını istemci veya erişim hatası, 5xx durumlarını sunucu hatası olarak ele alın. Erişim belirteçlerini tarayıcıya açık kaynak dosyalarında tutmayın.</p><p>Uygulama oluşturma ve OAuth için eski geliştirici backend'i geri bağlanmadan doğrulanmamış uç noktalar burada listelenmez.</p>
 </DevPage>}
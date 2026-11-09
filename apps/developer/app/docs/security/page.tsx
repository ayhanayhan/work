import DevPage from '@/components/dev-page';
export const metadata={title:'Güvenlik | Ticarti Developer'};
export default function Page(){return <DevPage title="Güvenlik ve erişim" description="Mağaza verisi, yetkilendirme, kimlik bilgileri ve uygulama geliştirme sırasında korunması gereken sınırlar.">
 <h2>Yetkili mağaza erişimi</h2><p>Yönetim uç noktalarında mağaza oturumu, tenant koruması ve izin denetimi birlikte uygulanır. Farklı mağazaların verilerini aynı oturum veya yetki altında birleştirmeyin.</p>
 <h2>Gizli bilgiler</h2><ul><li>API kimlik bilgilerini sunucu tarafında saklayın.</li><li>Tarayıcıya uzun süreli erişim anahtarları göndermeyin.</li><li>Yetkileri yalnızca gerekli kapsamda kullanın.</li><li>İşlem günlüklerinde hassas değerleri maskeleyin.</li></ul>
 <h2>Üçüncü taraf uygulamalar</h2><p>Arbitrary Node/JavaScript kodunu Ticarti çekirdek sunucusunda çalıştırmayın. Entegrasyonları barındırılan uygulama veya güvenli deklaratif uzantı modelleriyle tasarlayın.</p>
 </DevPage>}
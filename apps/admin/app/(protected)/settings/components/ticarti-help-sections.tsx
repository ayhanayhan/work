'use client';

import Link from 'next/link';
import { BookCopy, CircleHelp, Compass, Headphones, LifeBuoy, PlugZap } from 'lucide-react';
import { HighlightedPosts, HighlightedPostsItems } from '@/partials/common/highlighted-posts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Engage } from '@/partials/common/engage';
import { toAbsoluteUrl } from '@/lib/helpers';

export type TicartiFaqItem = { title: string; text: string };

export function SettingsGuide({ topic, links }: { topic: string; links?: { title: string; summary: string; path: string }[] }) {
  const defaults = [
    { title: `${topic} kullanım rehberi`, summary: `${topic} ayarlarını doğru yapılandırmak için temel adımlar ve öneriler.`, path: '#' },
    { title: 'Kurulum ve kontrol listesi', summary: 'Yayına almadan önce kontrol edilmesi gereken önemli ayarları gözden geçirin.', path: '#' },
    { title: 'Sorun giderme', summary: 'Bağlantı, doğrulama ve yapılandırma sorunlarında izlenecek adımlar.', path: '/support' },
  ];
  const source = links?.length ? links : defaults;
  const icons = [BookCopy, Compass, PlugZap];
  const posts: HighlightedPostsItems = source.map((item, index) => ({ icon: icons[index % icons.length], ...item }));
  return <HighlightedPosts posts={posts} />;
}

export function SettingsFaq({ title='Sık Sorulan Sorular', items }: { title?: string; items: TicartiFaqItem[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="py-3">
        <Accordion type="single" collapsible>
          {items.map((item,index)=><AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>{item.text}</AccordionContent>
          </AccordionItem>)}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function SettingsSupport() {
  return (
    <div className="grid lg:grid-cols-2 gap-5 lg:gap-7.5">
      <Engage
        title="Yardıma mı ihtiyacınız var?"
        description="Kurulum, ödeme, kargo, entegrasyon ve mağaza ayarlarıyla ilgili yardım merkezi içeriklerine ulaşın."
        image={<><img src={toAbsoluteUrl('/media/illustrations/2.svg')} className="dark:hidden max-h-[150px]" alt="Yardım"/><img src={toAbsoluteUrl('/media/illustrations/2-dark.svg')} className="light:hidden max-h-[150px]" alt="Yardım"/></>}
        more={{ title:'Yardım Merkezine Git', url:'/support' }}
      />
      <Engage
        title="Destek Ekibi"
        description="Çözemediğiniz bir konu varsa destek talebi oluşturun ve mağazanızla ilgili teknik yardım alın."
        image={<><img src={toAbsoluteUrl('/media/illustrations/4.svg')} className="dark:hidden max-h-[150px]" alt="Destek"/><img src={toAbsoluteUrl('/media/illustrations/4-dark.svg')} className="light:hidden max-h-[150px]" alt="Destek"/></>}
        more={{ title:'Destek Talebi Oluştur', url:'/support' }}
      />
    </div>
  );
}

export function PaymentFaqSupport(){
  return <div className="grid gap-5 lg:gap-7.5">
    <SettingsFaq items={[
      {title:'Kart ödemeleri nereden yapılandırılır?',text:'Sanal POS sağlayıcısı, API bilgileri, komisyon ve taksit seçenekleri Entegrasyonlar ekranındaki ödeme sağlayıcısının kendi ayarlarından yönetilir.'},
      {title:'Başarılı ödeme sonrası sipariş durumu nasıl belirlenir?',text:'Ödeme Ayarları içindeki ödeme akışı bölümünden başarılı, başarısız, bekleyen ve zaman aşımına uğrayan ödemeler için sipariş durumları ayrı ayrı seçilir.'},
      {title:'Havale siparişleri nasıl takip edilir?',text:'Havale/EFT ödeme yöntemi için bekleyen sipariş durumu belirlenir. Ödeme onaylandığında sipariş manuel veya entegrasyon üzerinden bir sonraki duruma alınabilir.'},
      {title:'Taksit ayarları neden burada yok?',text:'Taksit kuralları ödeme sağlayıcısına göre değiştiği için ilgili ödeme entegrasyonunun ayarlarında yönetilir.'},
    ]}/>
    <SettingsSupport/>
  </div>;
}

export function DeliveryFaqSupport(){
  return <div className="grid gap-5 lg:gap-7.5">
    <SettingsFaq items={[
      {title:'Kargo firması bağlantıları nereden yapılır?',text:'API anahtarları, müşteri kodları, servis seçenekleri ve etiket ayarları Entegrasyonlar ekranındaki kargo sağlayıcısı üzerinden yönetilir.'},
      {title:'Ücretsiz kargo koşulu nasıl çalışır?',text:'Teslimat ayarlarında mağaza geneli varsayılan eşik belirlenir. Daha özel ürün, kategori veya kampanya koşulları promosyon kurallarıyla tanımlanabilir.'},
      {title:'Kargo hareketleri sipariş durumunu değiştirebilir mi?',text:'Otomatik durum güncellemesi açıksa entegrasyondan gelen kargoya verildi ve teslim edildi gibi hareketler sipariş durumuna yansıtılabilir.'},
      {title:'Birden fazla teslimat bölgesi kullanılabilir mi?',text:'Teslimat bölgeleri ve bölgeye özel ücret/kurallar ayrı tanımlanabilir; entegrasyon uygun servisleri sipariş adresine göre kullanır.'},
    ]}/>
    <SettingsSupport/>
  </div>;
}

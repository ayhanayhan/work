'use client';

import Link from 'next/link';
import {
  Bot,
  ChevronRight,
  FileText,
  Globe2,
  KeyRound,
  Languages,
  Mail,
  MessageCircle,
  MessageSquareText,
  Send,
  Settings,
  ShieldCheck,
  Variable,
  WalletCards,
  WandSparkles,
} from 'lucide-react';

import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
} from '@/partials/common/toolbar';

const groups = [
  {
    id: 'general',
    title: 'Genel Tanımlar',
    description: 'Ticarti platformunun temel sistem ve kurumsal tanımları.',
    items: [
      ['Genel Ayarlar', 'Firma bilgileri, marka görselleri ve platform varsayılanlarını yönetin.', '/settings/general', Settings],
      ['Dil Ayarları', 'Platformda kullanılabilecek dilleri, varsayılan dili ve aktiflik durumunu yönetin.', '/settings/languages', Languages],
      ['Para Birimleri', 'Desteklenen para birimleri, semboller, formatlar ve varsayılan para birimi.', '/settings/currencies', WalletCards],
      ['Ülkeler', 'Ülke, ISO kodu, telefon kodu ve aktif/pasif ülke tanımları.', '/settings/countries', Globe2],
      ['Harici Giriş Sağlayıcıları', 'Google, Facebook, Apple ve Microsoft ile giriş ayarlarını yönetin.', '/settings/auth-providers', KeyRound],
    ],
  },
  {
    id: 'legal',
    title: 'Sözleşmeler & Yasal',
    description: 'Ticarti kullanıcılarının onaylayacağı merkezi sözleşme ve metinler.',
    items: [
      ['Sözleşme Eşleştirmeleri', 'Yasal içerikleri Footer, Register, Checkout, Newsletter ve diğer kullanım alanlarıyla eşleştirin.', '/settings/contracts', FileText],
    ],
  },
  {
    id: 'email',
    title: 'E-posta',
    description: 'Ticarti tarafından gönderilen tüm sistem e-postalarını yönetin.',
    items: [
      ['AWS SES Ayarları', 'Region, sender domain, from/reply-to ve SES bağlantı durumunu yönetin.', '/settings/email/ses', Send],
      ['E-posta Ayarları', 'Varsayılan gönderici, kanal durumu, hata ve teslim politikaları.', '/settings/email', Mail],
      ['E-posta Şablonları', 'Kayıt, doğrulama, şifre, ödeme, destek ve sistem e-posta şablonları.', '/settings/email/templates', MessageSquareText],
    ],
  },
  {
    id: 'messaging',
    title: 'SMS & WhatsApp',
    description: 'Ticarti sistem mesajlaşma kanalları ve şablon tanımları.',
    items: [
      ['SMS Ayarları', 'SMS sağlayıcısı, sender ID, bağlantı bilgileri ve kanal durumu.', '/settings/sms', MessageSquareText],
      ['SMS Şablonları', 'OTP, doğrulama, güvenlik ve diğer sistem SMS şablonları.', '/settings/sms/templates', FileText],
      ['WhatsApp Ayarları', 'WhatsApp Business bağlantısı, phone number ID, webhook ve kanal durumu.', '/settings/whatsapp', MessageCircle],
      ['WhatsApp Şablonları', 'Meta onaylı template, dil, kategori ve değişken eşleştirmeleri.', '/settings/whatsapp/templates', FileText],
    ],
  },
  {
    id: 'automation',
    title: 'Bildirim & Şablon Sistemi',
    description: 'Olayların hangi kanaldan ve hangi içerikle gönderileceğini merkezi olarak tanımlayın.',
    items: [
      ['Bildirim Kuralları', 'Sistem olaylarını e-posta, SMS ve WhatsApp kanallarıyla eşleştirin.', '/settings/notifications', ShieldCheck],
      ['Şablon Değişkenleri', 'E-posta, SMS ve WhatsApp şablonlarında kullanılabilecek sistem değişkenleri.', '/settings/template-variables', Variable],
      ['Test Merkezi', 'Tanımlı kanallardan test e-posta, SMS ve WhatsApp mesajı gönderin.', '/settings/message-test', WandSparkles],
    ],
  },
  {
    id: 'ai',
    title: 'Yapay Zeka',
    description: 'TicAi ve platform genelindeki AI servislerinin merkezi model ve kullanım ayarları.',
    items: [
      ['AI Servisleri', 'Metin, görsel, embedding, vision, ses, moderasyon ve video modellerini yönetin.', '/settings/ai', Bot],
    ],
  },
] as const;

export default function Page() {
  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <h1 className="text-xl font-semibold">Ayarlar</h1>
            <ToolbarDescription>
              Ticarti platformuna ait merkezi tanımlamaları yönetin.
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>

      <Container className="grid gap-8 pb-10">
        {groups.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`settings-${group.id}`}
            className="grid gap-4"
          >
            <div className="grid gap-1">
              <h2
                id={`settings-${group.id}`}
                className="text-lg font-semibold text-foreground"
              >
                {group.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map(([title, description, path, Icon]) => (
                <Link
                  key={path}
                  href={path}
                  className="group flex min-h-[158px] flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:p-7"
                >
                  <div className="flex items-center justify-between">
                    <Icon aria-hidden="true" className="size-6 text-primary" />
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <h3 className="text-base font-medium leading-tight text-foreground group-hover:text-primary">
                      {title}
                    </h3>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}

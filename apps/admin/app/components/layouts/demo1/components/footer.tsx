'use client';

import Link from 'next/link';
import { Container } from '@/components/common/container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer mt-8 border-t border-border/60 bg-background">
      <Container>
        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-3 py-7">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{currentYear} &copy;</span>
            <span className="font-semibold text-foreground">Ticarti</span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-primary">Destek</Link>
            <Link href="/settings/security" className="hover:text-primary">Gizlilik & KVKK</Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

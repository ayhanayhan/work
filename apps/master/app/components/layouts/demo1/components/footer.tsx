'use client';
import { Container } from '@/components/common/container';
export function Footer(){return <footer className="footer mt-8 border-t border-border/60 bg-background"><Container><div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-3 py-7 text-sm"><span className="text-muted-foreground">© {new Date().getFullYear()} Ticarti</span><span className="text-muted-foreground">Master · Platform Yönetimi</span></div></Container></footer>}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
export default function MigrationPlaceholder(){const path=usePathname();return <Container><Card><CardHeader><div><CardTitle>Bu ekran yeni Master arayüzüne taşınıyor</CardTitle><CardDescription className="mt-1">Eski Super Admin verisi ve API mantığı korunacak; ekran JSON/array girişi olmadan kullanıcı dostu forma dönüştürülecek.</CardDescription></div></CardHeader><CardContent><div className="mb-5 rounded-lg border border-border bg-muted/30 p-4 text-sm"><b>Sayfa:</b> {path}</div><Button asChild><Link href="/settings">İlk taşınan ekran: Genel Ayarlar</Link></Button></CardContent></Card></Container>}

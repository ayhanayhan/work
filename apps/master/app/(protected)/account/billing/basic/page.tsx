'use client';

import { Container } from '@/components/common/container';
import { Toolbar, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';
import { AccountBasicContent } from './content';

export default function AccountBasicPage() {
  return <>
    <Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Hesabım</h1><ToolbarDescription>Paketinizi, fatura geçmişinizi, kayıtlı kartlarınızı ve hesap bilgilerinizi yönetin.</ToolbarDescription></ToolbarHeading></Toolbar></Container>
    <Container><AccountBasicContent /></Container>
  </>;
}

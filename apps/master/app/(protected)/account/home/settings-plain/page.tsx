'use client';

import { Container } from '@/components/common/container';
import { Toolbar, ToolbarDescription, ToolbarHeading } from '@/partials/common/toolbar';
import { AccountSettingsPlainContent } from './content';

export default function AccountSettingsPlainPage(){
  return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Hesap Düzenle</h1><ToolbarDescription>Kişisel bilgilerinizi, profil görselinizi ve güvenlik ayarlarınızı düzenleyin.</ToolbarDescription></ToolbarHeading></Toolbar></Container><Container><AccountSettingsPlainContent/></Container></>;
}

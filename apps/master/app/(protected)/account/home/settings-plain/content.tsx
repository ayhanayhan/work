'use client';

import { BasicSettings, Password, FilesUpload } from './components';

export function AccountSettingsPlainContent() {
  return (
    <div className="grid gap-5 lg:gap-7.5 xl:w-[42rem] mx-auto">
      <BasicSettings title="Hesap Bilgileri" />
      <FilesUpload />
      <Password />
    </div>
  );
}

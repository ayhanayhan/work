'use client';

import { Container } from '@/components/common/container';
import { useMasterSession } from '@/app/components/MasterSession';

export default function Page() {
  const { restoring } = useMasterSession();

  if (restoring) {
    return (
      <Container>
        <div className="min-h-[420px]" />
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-6">
        <h1 className="text-xl font-semibold">Ticarti Master</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform yönetim paneli
        </p>
      </div>
    </Container>
  );
}

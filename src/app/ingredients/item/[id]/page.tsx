'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import IngredientEditor from '@/app/ingredients/_components/IngredientEditor';

export default function IngredientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20, maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Link
            href="/ingredients"
            className="pill"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="chev-l" size={12} /> 목록
          </Link>
          <div style={{ flex: 1 }} />
        </div>

        <div className="card" style={{ padding: 18 }}>
          <IngredientEditor id={id} onCloseHref="/ingredients" />
        </div>
      </div>
    </AppShell>
  );
}


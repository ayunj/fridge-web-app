'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';

export default function Modal({
  title,
  children,
  maxWidth = 760,
  onClose,
}: {
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
  onClose?: () => void;
}) {
  const router = useRouter();
  const close = useMemo(() => onClose ?? (() => router.back()), [onClose, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '72px 16px 24px 16px',
      }}
    >
      <div
        onClick={() => close()}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
        }}
      />

      <div
        className="card"
        style={{
          position: 'relative',
          width: 'min(100%, 980px)',
          maxWidth,
          padding: 16,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{title ?? ''}</div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => close()}
            className="pill"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="close" size={12} /> 닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}


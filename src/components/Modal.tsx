'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';

export default function Modal({
  title,
  actions,
  children,
  maxWidth = 760,
  onClose,
  stripeHeader = false,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  onClose?: () => void;
  /** 헤더 하단 구분선 + 패딩 분리(본문 패딩은 스크롤 영역 안으로) */
  stripeHeader?: boolean;
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
          padding: stripeHeader ? 0 : 16,
          boxShadow: 'var(--shadow-lg)',
          maxHeight: 'calc(100vh - 96px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: stripeHeader ? 0 : 12,
            padding: stripeHeader ? '12px 20px' : undefined,
            borderBottom: stripeHeader ? '0.5px solid var(--border)' : undefined,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{title ?? ''}</div>
          <div style={{ flex: 1 }} />
          {actions ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{actions}</div> : null}
          <button
            type="button"
            onClick={() => close()}
            className="pill"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="close" size={12} /> 닫기
          </button>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            paddingRight: stripeHeader ? 20 : 6,
            paddingBottom: stripeHeader ? 18 : undefined,
            paddingLeft: stripeHeader ? 20 : undefined,
            paddingTop: stripeHeader ? 14 : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}


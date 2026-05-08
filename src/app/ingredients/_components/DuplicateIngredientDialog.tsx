'use client';

import Icon from '@/components/Icon';

type ExistingItem = {
  name: string;
  meta: string;
  metaTone?: 'danger' | 'normal';
};

export default function DuplicateIngredientDialog({
  open,
  titleName,
  description,
  existingItems,
  onSkip,
  onConfirm,
}: {
  open: boolean;
  titleName: string;
  description?: string;
  existingItems: ExistingItem[];
  onSkip: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="중복 재료 추가 확인"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 100,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSkip();
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(360px, 100%)',
          padding: 18,
          border: '0.5px solid var(--border)',
          borderRadius: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ color: 'var(--exp-amber)' }}>
            <Icon name="bell" size={18} />
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{titleName}가 이미 있어요</div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="pill"
            onClick={onSkip}
            style={{ cursor: 'pointer', padding: '6px 8px', lineHeight: 0 }}
            aria-label="닫기"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
          {description ?? '등록된 재료가 있어요. 그래도 추가할까요?'}
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 12,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {existingItems.map((it, idx) => (
            <div key={`${it.name}-${it.meta}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <div style={{ flex: 1, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.name}
              </div>
              <div
                style={{
                  color: it.metaTone === 'danger' ? 'var(--exp-red)' : 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {it.meta}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="pill" onClick={onSkip} style={{ cursor: 'pointer' }}>
            건너뛰기
          </button>
          <button type="button" className="btn" onClick={onConfirm} style={{ cursor: 'pointer' }}>
            그래도 추가
          </button>
        </div>
      </div>
    </div>
  );
}


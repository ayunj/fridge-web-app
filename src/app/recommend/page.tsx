'use client';
import { useState } from 'react';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { RECIPES } from '@/lib/data';

function RecommendCard({ r, expanded, onToggle }: {
  r: typeof RECIPES[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = r.missing === 0
    ? { text: '바로 가능', cls: 'ok' }
    : r.missing === 1 ? { text: '1개 부족', cls: 'warn' } : { text: `${r.missing}개 부족`, cls: 'light' };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: 14, display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer',
        background: expanded ? '#fbfaf7' : 'var(--surface)',
      }} onClick={onToggle}>
        <div className="placeholder-img" style={{ width: 88, height: 68, borderRadius: 8, flexShrink: 0 }}>thumb</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</span>
            {r.yt && <Icon name="youtube" size={13} style={{ color: '#c44' }} />}
            <span className={`badge ${status.cls}`} style={{ marginLeft: 4 }}>{status.text}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
            <span>보유 재료 {r.have.length}개</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={11} />{r.time}분</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="flame" size={11} />{r.kcal} kcal</span>
          </div>
        </div>
        <Icon name={expanded ? 'chev-u' : 'chev-d'} size={16} style={{ color: 'var(--text-tertiary)' }} />
      </div>

      {expanded && (
        <div style={{ padding: '4px 16px 16px 16px', background: '#fbfaf7', borderTop: '0.5px solid var(--border)' }}>
          {r.missing > 0 && (
            <>
              <div className="h-section" style={{ margin: '12px 0 8px 0' }}>부족한 재료 {r.missing}개</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {r.missingItems.map(name => (
                  <div key={name} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', background: 'var(--surface)',
                    border: '0.5px solid var(--border)', borderRadius: 8,
                  }}>
                    <Icon name="cart" size={13} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: 12.5, flex: 1 }}>{name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>예상가 약 2,400원</span>
                    <button className="btn ghost sm">+ 장보기 추가</button>
                  </div>
                ))}
              </div>
              <button className="btn" style={{ marginBottom: 16 }}>
                <Icon name="cart" size={13} /> 부족 재료 전체 장보기 추가 ({r.missing}개)
              </button>
            </>
          )}
          <div className="h-section" style={{ marginBottom: 8 }}>보유 재료</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {r.have.map(h => (
              <span key={h} className="tag"><Icon name="check" size={10} /> {h}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecommendPage() {
  const [expanded, setExpanded] = useState<string | null>('r4');
  const recipes = RECIPES.slice(0, 6);

  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>추천 레시피</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              내 냉장고 재료 기준으로 만들 수 있는 레시피를 추천해요.
            </div>
          </div>
          <button className="pill"><Icon name="sort" size={12} /> 저칼로리 순</button>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span className="pill">전체 12</span>
          <span className="pill active">바로 가능 5</span>
          <span className="pill">거의 가능 4</span>
          <span className="pill">재료 부족 3</span>
        </div>

        {/* Recipe list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recipes.map(r => (
            <RecommendCard
              key={r.id}
              r={r}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(prev => prev === r.id ? null : r.id)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

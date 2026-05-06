'use client';
import { useState } from 'react';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { SHOPPING as INITIAL_SHOPPING } from '@/lib/data';

export default function ShoppingPage() {
  const [items, setItems] = useState(INITIAL_SHOPPING);
  const [input, setInput] = useState('');

  const toggle = (id: string) =>
    setItems(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s));

  const addItem = () => {
    if (!input.trim()) return;
    setItems(prev => [...prev, { id: `s${Date.now()}`, name: input.trim(), from: '직접 추가', done: false }]);
    setInput('');
  };

  const todo = items.filter(s => !s.done);
  const done = items.filter(s => s.done);

  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>장보기 목록</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              레시피에서 추가했거나 직접 입력한 항목들. 체크하면 자동으로 재료에 추가돼요.
            </div>
          </div>
          <button className="btn ghost sm" onClick={() => setItems(prev => prev.filter(s => !s.done))}>
            <Icon name="trash" size={12} /> 완료 항목 삭제
          </button>
        </div>

        {/* Input */}
        <div className="card" style={{ padding: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={15} style={{ marginLeft: 10, color: 'var(--text-tertiary)' }} />
          <input
            placeholder="장보기 항목 직접 추가"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            style={{ flex: 1, height: 36, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
          />
          <button className="btn sm" style={{ marginRight: 4 }} onClick={addItem}>추가</button>
        </div>

        {/* Todo */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="h-section">구매 예정</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{todo.length}</span>
          </div>
          <div className="card" style={{ padding: '4px 0' }}>
            {todo.map((s, idx) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)',
              }}>
                <span className="chk" onClick={() => toggle(s.id)} />
                <span style={{ fontSize: 13, flex: 1 }}>{s.name}</span>
                <span className="tag" style={{ fontSize: 10.5 }}>
                  {s.from === '직접 추가' ? s.from : `← ${s.from}`}
                </span>
                <button
                  onClick={() => setItems(prev => prev.filter(x => x.id !== s.id))}
                  style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
            {todo.length === 0 && (
              <div style={{ padding: '20px 16px', color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center' }}>
                모든 항목을 구매했어요 🎉
              </div>
            )}
          </div>
        </div>

        {/* Done */}
        {done.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="h-section">완료</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{done.length}</span>
            </div>
            <div className="card" style={{ padding: '4px 0' }}>
              {done.map((s, idx) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)',
                  opacity: 0.5,
                }}>
                  <span className="chk on" onClick={() => toggle(s.id)}>
                    <Icon name="check" size={11} />
                  </span>
                  <span style={{ fontSize: 13, flex: 1, textDecoration: 'line-through' }}>{s.name}</span>
                  <span className="tag" style={{ fontSize: 10.5 }}>
                    {s.from === '직접 추가' ? s.from : `← ${s.from}`}
                  </span>
                  <button
                    onClick={() => setItems(prev => prev.filter(x => x.id !== s.id))}
                    style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="close" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

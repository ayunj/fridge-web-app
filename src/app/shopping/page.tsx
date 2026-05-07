'use client';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { SHOPPING as INITIAL_SHOPPING } from '@/lib/data';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type Loc = 'fridge' | 'freezer' | 'pantry';
type LocalIngredientAdd = {
  id: string;
  name: string;
  loc: Loc;
  qty: string;
  cat: string;
  d: number;
  expiresAt: null;
  createdAt: string;
};

const SHOPPING_KEY = 'shopping.items.v1';
const LOCAL_ING_ADDS_KEY = 'ingredients.localAdds.v1';

function loadShopping() {
  if (typeof window === 'undefined') return INITIAL_SHOPPING;
  try {
    const raw = window.localStorage.getItem(SHOPPING_KEY);
    if (!raw) return INITIAL_SHOPPING;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return INITIAL_SHOPPING;
    return parsed.filter((x): x is typeof INITIAL_SHOPPING[number] => {
      if (!x || typeof x !== 'object') return false;
      const r = x as Record<string, unknown>;
      return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.from === 'string' && typeof r.done === 'boolean';
    });
  } catch {
    return INITIAL_SHOPPING;
  }
}

function saveShopping(items: typeof INITIAL_SHOPPING) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHOPPING_KEY, JSON.stringify(items.slice(0, 500)));
  } catch {
    // ignore
  }
}

async function upsertDefAndInsertItem(nameRaw: string) {
  if (!isSupabaseEnabled || !supabase) return;
  const name = nameRaw.trim();
  if (!name) return;

  const existing = await supabase.from('ingredient_defs').select('id').eq('name', name).maybeSingle();
  if (existing.error) throw existing.error;

  const defId =
    existing.data?.id ??
    (
      await supabase
        .from('ingredient_defs')
        .insert({ name, category_id: null })
        .select('id')
        .single()
    ).data?.id;

  if (!defId) throw new Error('재료 정의를 만들지 못했어요.');

  const ins = await supabase.from('ingredient_items').insert({
    ingredient_def_id: defId,
    loc: 'fridge',
    qty_text: null,
    expires_at: null,
  });
  if (ins.error) throw ins.error;
}

export default function ShoppingPage() {
  const [items, setItems] = useState(loadShopping);
  const [input, setInput] = useState('');
  const [dbErr, setDbErr] = useState<string | null>(null);

  const sb = supabase;
  const usingDb = isSupabaseEnabled && sb !== null;

  type DbShoppingRow = {
    id: string;
    name: string;
    from: string;
    checked: boolean;
    created_at: string;
  };

  const fetchDb = async (client: SupabaseClient) => {
    const res = await client
      .from('shopping_items')
      .select('id,name,"from",checked,created_at')
      .order('checked', { ascending: true })
      .order('created_at', { ascending: false });
    if (res.error) {
      setDbErr(res.error.message);
      return;
    }
    setDbErr(null);

    const rows = (res.data ?? []) as unknown as DbShoppingRow[];
    const next = rows.map((r) => ({
      id: r.id,
      name: r.name,
      from: r.from,
      done: !!r.checked,
    }));
    setItems(next);
  };

  useEffect(() => {
    if (!usingDb || !sb) return;
    // eslint(react-hooks/set-state-in-effect): run async to avoid sync cascades
    Promise.resolve().then(() => fetchDb(sb));
  }, [usingDb, sb]);

  const toggle = (id: string) =>
    setItems(prev => {
      const cur = prev.find((x) => x.id === id);
      const nextDone = !(cur?.done ?? false);
      const next = prev.map(s => s.id === id ? { ...s, done: nextDone } : s);
      if (!usingDb) saveShopping(next);
      else {
        if (!sb) return next;
        Promise.resolve()
          .then(async () => {
            const u = await sb.from('shopping_items').update({ checked: nextDone }).eq('id', id);
            if (u.error) throw u.error;
          })
          .then(() => fetchDb(sb))
          .catch(() => {
            // best-effort
          });
      }

      // 체크(완료)로 바뀌는 순간에만 재료에 자동 추가
      if (cur && !cur.done && nextDone) {
        if (!isSupabaseEnabled || !supabase) {
          const now = Date.now();
          const add: LocalIngredientAdd = {
            id: `local-${now}-from-shopping-${cur.name}`,
            name: cur.name,
            loc: 'fridge',
            qty: '',
            cat: '기타',
            d: 999,
            expiresAt: null,
            createdAt: new Date().toISOString(),
          };
          try {
            const raw = window.localStorage.getItem(LOCAL_ING_ADDS_KEY);
            const parsed = raw ? (JSON.parse(raw) as unknown) : [];
            const arr = Array.isArray(parsed) ? parsed : [];
            const merged = [add, ...arr].slice(0, 500);
            window.localStorage.setItem(LOCAL_ING_ADDS_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }
          window.dispatchEvent(new Event('ingredients:changed'));
        } else {
          Promise.resolve()
            .then(() => upsertDefAndInsertItem(cur.name))
            .then(() => window.dispatchEvent(new Event('ingredients:changed')))
            .catch(() => {
              // 장보기 UX는 막지 않음(재료 추가는 best-effort)
            });
        }
      }

      return next;
    });

  const addItem = () => {
    if (!input.trim()) return;
    const name = input.trim();
    if (!usingDb) {
      setItems(prev => {
        const next = [...prev, { id: `s${Date.now()}`, name, from: '직접 추가', done: false }];
        saveShopping(next);
        return next;
      });
    } else {
      if (!sb) {
        setDbErr('Supabase 연결이 꺼져 있어요.');
        setInput('');
        return;
      }
      Promise.resolve()
        .then(async () => {
          const ins = await sb.from('shopping_items').insert({ name, from: '직접 추가', checked: false });
          if (ins.error) throw ins.error;
        })
        .then(() => fetchDb(sb))
        .catch((e: unknown) => {
          const msg =
            e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
              ? (e as { message: string }).message
              : '추가에 실패했어요.';
          setDbErr(msg);
        });
    }
    setInput('');
  };

  const todo = useMemo(() => items.filter(s => !s.done), [items]);
  const done = useMemo(() => items.filter(s => s.done), [items]);

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
          <button className="btn ghost sm" onClick={() => setItems(prev => {
            const next = prev.filter(s => !s.done);
            if (!usingDb) {
              saveShopping(next);
              return next;
            }
            if (!sb) return next;
            const doneIds = prev.filter((s) => s.done).map((s) => s.id);
            Promise.resolve()
              .then(async () => {
                if (doneIds.length === 0) return;
                const del = await sb.from('shopping_items').delete().in('id', doneIds);
                if (del.error) throw del.error;
              })
              .then(() => fetchDb(sb))
              .catch(() => {
                // best-effort
              });
            return next;
          })}>
            <Icon name="trash" size={12} /> 완료 항목 삭제
          </button>
        </div>
        {usingDb && dbErr ? (
          <div className="card" style={{ padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>DB 오류: {dbErr}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
              (지금은 화면 상태만 바뀌었을 수 있어요. 새로고침하면 DB 상태로 다시 맞춰집니다.)
            </div>
          </div>
        ) : null}

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
                  onClick={() => setItems(prev => {
                    const next = prev.filter(x => x.id !== s.id);
                    if (!usingDb) saveShopping(next);
                    else {
                      if (!sb) return next;
                      Promise.resolve()
                        .then(async () => {
                          const del = await sb.from('shopping_items').delete().eq('id', s.id);
                          if (del.error) throw del.error;
                        })
                        .then(() => fetchDb(sb))
                        .catch(() => {
                          // best-effort
                        });
                    }
                    return next;
                  })}
                  style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
            {todo.length === 0 && (
              <div style={{ padding: '20px 16px', color: 'var(--text-tertiary)', fontSize: 12, textAlign: 'center' }}>
                모든 항목을 구매했어요
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
                    onClick={() => setItems(prev => {
                      const next = prev.filter(x => x.id !== s.id);
                      if (!usingDb) saveShopping(next);
                      else {
                        if (!sb) return next;
                        Promise.resolve()
                          .then(async () => {
                            const del = await sb.from('shopping_items').delete().eq('id', s.id);
                            if (del.error) throw del.error;
                          })
                          .then(() => fetchDb(sb))
                          .catch(() => {
                            // best-effort
                          });
                      }
                      return next;
                    })}
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

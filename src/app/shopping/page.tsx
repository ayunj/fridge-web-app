'use client';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { shoppingSeedItems, SHOPPING_KEY } from '@/lib/shopping-local';
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

const LOCAL_ING_ADDS_KEY = 'ingredients.localAdds.v1';

type ShoppingViewItem = {
  id: string;
  name: string;
  from: string;
  done: boolean;
  memo?: string | null;
};

function norm(s: string) {
  return (s ?? '').trim();
}

function makeLocalId(prefix = 's') {
  return `${prefix}${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadShopping() {
  if (typeof window === 'undefined') return shoppingSeedItems();
  try {
    const raw = window.localStorage.getItem(SHOPPING_KEY);
    if (!raw) return shoppingSeedItems();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return shoppingSeedItems();
    return parsed.filter((x): x is ShoppingViewItem => {
      if (!x || typeof x !== 'object') return false;
      const r = x as Record<string, unknown>;
      return (
        typeof r.id === 'string' &&
        typeof r.name === 'string' &&
        typeof r.from === 'string' &&
        typeof r.done === 'boolean' &&
        (typeof r.memo === 'undefined' || r.memo === null || typeof r.memo === 'string')
      );
    });
  } catch {
    return shoppingSeedItems();
  }
}

function saveShopping(items: ShoppingViewItem[]) {
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
  const [input, setInput] = useState('');
  const [inputMemo, setInputMemo] = useState('');
  const [dbErr, setDbErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sb = supabase;
  const usingDb = isSupabaseEnabled && sb !== null;
  const [items, setItems] = useState<ShoppingViewItem[]>(() => (usingDb ? [] : loadShopping()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [doneOpen, setDoneOpen] = useState(false);

  type DbShoppingRow = {
    id: string;
    name: string;
    from: string;
    memo: string | null;
    checked: boolean;
    created_at: string;
  };

  const fetchDb = async (client: SupabaseClient) => {
    setLoading(true);
    const res = await client
      .from('shopping_items')
      .select('id,name,"from",memo,checked,created_at')
      .order('checked', { ascending: true })
      .order('created_at', { ascending: false });
    if (res.error) {
      setDbErr(res.error.message);
      setLoading(false);
      return;
    }
    setDbErr(null);

    const rows = (res.data ?? []) as unknown as DbShoppingRow[];
    const next = rows.map((r) => ({
      id: r.id,
      name: r.name,
      from: r.from,
      memo: r.memo ?? null,
      done: !!r.checked,
    }));
    setItems(next);
    setLoading(false);
  };

  useEffect(() => {
    if (!usingDb || !sb) return;
    // eslint(react-hooks/set-state-in-effect): run async to avoid sync cascades
    Promise.resolve().then(() => fetchDb(sb));
  }, [usingDb, sb]);

  const beginEdit = (id: string) => {
    setEditingId((prev) => {
      if (prev === id) {
        setEditName('');
        setEditMemo('');
        return null;
      }
      const cur = items.find((x) => x.id === id);
      setEditName(cur?.name ?? '');
      setEditMemo(cur?.memo ?? '');
      return id;
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditMemo('');
  };

  const saveEdit = (id: string) => {
    const nextName = norm(editName);
    const nextMemo = norm(editMemo) || null;
    if (!nextName) return;

    setItems((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, name: nextName, memo: nextMemo } : x));
      if (!usingDb) saveShopping(next);
      else {
        if (!sb) return next;
        Promise.resolve()
          .then(async () => {
            const u = await sb.from('shopping_items').update({ name: nextName, memo: nextMemo }).eq('id', id);
            if (u.error) throw u.error;
          })
          .then(() => fetchDb(sb))
          .catch(() => {
            // best-effort
          });
      }
      return next;
    });

    cancelEdit();
  };

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

  const deleteOne = (id: string) =>
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (!usingDb) saveShopping(next);
      else {
        if (!sb) return next;
        Promise.resolve()
          .then(async () => {
            const del = await sb.from('shopping_items').delete().eq('id', id);
            if (del.error) throw del.error;
          })
          .then(() => fetchDb(sb))
          .catch(() => {
            // best-effort
          });
      }
      if (editingId === id) cancelEdit();
      return next;
    });

  const deleteDone = () =>
    setItems((prev) => {
      const next = prev.filter((s) => !s.done);
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
    });

  const addItem = () => {
    const name = norm(input);
    const memo = norm(inputMemo) || null;
    if (!name) return;
    if (!usingDb) {
      setItems(prev => {
        const next = [...prev, { id: makeLocalId('s'), name, from: '직접 추가', done: false, memo }];
        saveShopping(next);
        return next;
      });
    } else {
      if (!sb) {
        setDbErr('Supabase 연결이 꺼져 있어요.');
        setInput('');
        setInputMemo('');
        return;
      }
      Promise.resolve()
        .then(async () => {
          const ins = await sb.from('shopping_items').insert({ name, from: '직접 추가', memo, checked: false });
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
    setInputMemo('');
  };

  const todo = useMemo(() => items.filter(s => !s.done), [items]);
  const done = useMemo(() => items.filter(s => s.done), [items]);

  return (
    <AppShell>
      <div className="shop-page">
        <h1 className="shop-title">장보기 목록</h1>
        <p className="shop-subtitle">레시피에서 추가됐거나 직접 입력한 항목들. 체크하면 자동으로 재료에 추가돼요.</p>
        {usingDb && dbErr ? (
          <div className="card" style={{ padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>DB 오류: {dbErr}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
              (지금은 화면 상태만 바뀌었을 수 있어요. 새로고침하면 DB 상태로 다시 맞춰집니다.)
            </div>
          </div>
        ) : null}
        {/* loading banner intentionally hidden (no flicker on mutations) */}

        {/* Input */}
        <div className="shop-addGrid">
          <div className="shop-addHead" aria-hidden="true">
            <span className="shop-addLabel">재료명</span>
            <div className="shop-addDiv" aria-hidden="true" />
            <span className="shop-addLabel">비고 (선택)</span>
          </div>
          <div aria-hidden="true" />

          <div className="shop-inputWrap">
            <input
              className="shop-inp"
              placeholder="두부"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <div className="shop-inpDiv" aria-hidden="true" />
            <input
              className="shop-inp"
              placeholder="단단한 걸로, 2모"
              value={inputMemo}
              onChange={(e) => setInputMemo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
          </div>
          <button className="shop-addBtn" type="button" onClick={addItem}>
            추가
          </button>
        </div>

        <div className="shop-countRow">
          <span className="shop-count">구매 예정 {todo.length}</span>
          <button className="shop-delBtn" type="button" onClick={deleteDone} disabled={done.length === 0}>
            <Icon name="trash" size={13} /> 완료 항목 삭제
          </button>
        </div>

        <div className="shop-list">
          {todo.map((s) => {
            const isEditing = editingId === s.id;
            return (
              <div
                key={s.id}
                className={`shop-item${isEditing ? ' editing' : ''}`}
                onClick={() => beginEdit(s.id)}
              >
                <div className="shop-itemRow">
                  <button
                    type="button"
                    className={`shop-cb${s.done ? ' on' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(s.id);
                    }}
                    aria-label={s.done ? '구매 취소' : '구매 완료'}
                  >
                    {s.done ? <Icon name="check" size={12} style={{ color: 'var(--btn-fg)' }} /> : null}
                  </button>

                  <div className="shop-itemText">
                    <div className="shop-itemName">{s.name}</div>
                    {s.memo ? <div className="shop-itemNote">{s.memo}</div> : null}
                  </div>

                  {s.from && s.from !== '직접 추가' ? <span className="shop-recipeTag">← {s.from}</span> : null}

                  <button
                    type="button"
                    className="shop-xBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOne(s.id);
                    }}
                    aria-label="삭제"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>

                <div className={`shop-editPanel${isEditing ? ' open' : ''}`}>
                  <div className="shop-editFields" onClick={(e) => e.stopPropagation()}>
                    <input
                      className="shop-editInp"
                      placeholder="재료명"
                      value={isEditing ? editName : s.name}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit();
                        if (e.key === 'Enter') saveEdit(s.id);
                      }}
                    />
                    <input
                      className="shop-editInp"
                      placeholder="비고"
                      value={isEditing ? editMemo : s.memo ?? ''}
                      onChange={(e) => setEditMemo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit();
                        if (e.key === 'Enter') saveEdit(s.id);
                      }}
                    />
                  </div>
                  <div className="shop-editActions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="shop-cancelBtn" onClick={cancelEdit}>
                      취소
                    </button>
                    <button type="button" className="shop-saveBtn" onClick={() => saveEdit(s.id)} disabled={!norm(editName)}>
                      저장
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {todo.length === 0 ? <div className="shop-empty">모든 항목을 구매했어요</div> : null}
        </div>

        {done.length > 0 ? (
          <>
            <button
              type="button"
              className="shop-doneToggle"
              onClick={() => setDoneOpen((p) => !p)}
              aria-expanded={doneOpen}
            >
              <span className="shop-count">완료 {done.length}</span>
              <span className="shop-doneToggleRight">
                <Icon name={doneOpen ? 'chev-u' : 'chev-d'} size={14} />
              </span>
            </button>

            {doneOpen ? (
              <div className="shop-list">
                {done.map((s) => {
                  const isEditing = editingId === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`shop-item done${isEditing ? ' editing' : ''}`}
                      onClick={() => beginEdit(s.id)}
                    >
                      <div className="shop-itemRow">
                        <button
                          type="button"
                          className={`shop-cb${s.done ? ' on' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(s.id);
                          }}
                          aria-label={s.done ? '구매 취소' : '구매 완료'}
                        >
                          {s.done ? <Icon name="check" size={12} style={{ color: 'var(--btn-fg)' }} /> : null}
                        </button>

                        <div className="shop-itemText">
                          <div className="shop-itemName">{s.name}</div>
                          {s.memo ? <div className="shop-itemNote">{s.memo}</div> : null}
                        </div>

                        {s.from && s.from !== '직접 추가' ? <span className="shop-recipeTag">← {s.from}</span> : null}

                        <button
                          type="button"
                          className="shop-xBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOne(s.id);
                          }}
                          aria-label="삭제"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>

                      <div className={`shop-editPanel${isEditing ? ' open' : ''}`}>
                        <div className="shop-editFields" onClick={(e) => e.stopPropagation()}>
                          <input
                            className="shop-editInp"
                            placeholder="재료명"
                            value={isEditing ? editName : s.name}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelEdit();
                              if (e.key === 'Enter') saveEdit(s.id);
                            }}
                          />
                          <input
                            className="shop-editInp"
                            placeholder="비고"
                            value={isEditing ? editMemo : s.memo ?? ''}
                            onChange={(e) => setEditMemo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelEdit();
                              if (e.key === 'Enter') saveEdit(s.id);
                            }}
                          />
                        </div>
                        <div className="shop-editActions" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="shop-cancelBtn" onClick={cancelEdit}>
                            취소
                          </button>
                          <button
                            type="button"
                            className="shop-saveBtn"
                            onClick={() => saveEdit(s.id)}
                            disabled={!norm(editName)}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { INGREDIENTS, LOC_LABEL, RECIPES, type Loc } from '@/lib/data';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

type DbIngredientRow = {
  id: string;
  name: string;
  loc: Loc;
  qty: string | null;
  category: string | null;
  expires_at: string | null;
  created_at?: string | null;
};

type IngredientHit = {
  id: string;
  name: string;
  loc: Loc;
  qty: string;
  cat: string;
};

function toIngredientHitsFromMock(q: string): IngredientHit[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return INGREDIENTS.filter((i) => i.name.toLowerCase().includes(t)).map((i) => ({
    id: `mock-${i.name}`,
    name: i.name,
    loc: i.loc,
    qty: i.qty ?? '',
    cat: i.cat ?? '기타',
  }));
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontSize: 12, color: 'var(--text-tertiary)' }}>검색 화면을 준비 중…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const qParam = sp.get('q') ?? '';

  const [q, setQ] = useState(qParam);
  const [ingLoading, setIngLoading] = useState(isSupabaseEnabled);
  const [ingErr, setIngErr] = useState<string | null>(null);
  const [ingHits, setIngHits] = useState<IngredientHit[]>([]);

  useEffect(() => {
    // eslint(react-hooks/set-state-in-effect): run async to avoid sync cascades
    Promise.resolve().then(() => setQ(qParam));
  }, [qParam]);

  useEffect(() => {
    let cancelled = false;
    // eslint(react-hooks/set-state-in-effect): run async to avoid sync cascades
    Promise.resolve()
      .then(async () => {
        const text = qParam.trim();
        if (!text) {
          setIngHits([]);
          setIngErr(null);
          setIngLoading(false);
          return;
        }

        if (!isSupabaseEnabled || !supabase) {
          setIngHits(toIngredientHitsFromMock(text));
          setIngErr(null);
          setIngLoading(false);
          return;
        }

        setIngLoading(true);
        try {
          const res = await supabase
            .from('v_ingredients')
            .select('id,name,loc,qty,category,expires_at,created_at')
            .ilike('name', `%${text}%`)
            .order('created_at', { ascending: false })
            .limit(50);
          if (cancelled) return;
          if (res.error) {
            setIngErr(res.error.message);
            setIngHits(toIngredientHitsFromMock(text));
            return;
          }
          setIngErr(null);
          const rows = (res.data ?? []) as DbIngredientRow[];
          setIngHits(
            rows.map((r) => ({
              id: r.id,
              name: r.name,
              loc: r.loc,
              qty: r.qty ?? '',
              cat: r.category ?? '기타',
            })),
          );
        } finally {
          if (!cancelled) setIngLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : '검색 중 오류가 발생했어요.';
        setIngErr(msg);
        setIngLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qParam]);

  const recipeHits = useMemo(() => {
    const t = qParam.trim().toLowerCase();
    if (!t) return [];
    return RECIPES.filter((r) => r.title.toLowerCase().includes(t)).slice(0, 50);
  }, [qParam]);

  const onSubmit = () => {
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20, maxWidth: 960 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>검색</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              재료와 레시피를 한 번에 검색해요.
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="search" size={15} style={{ marginLeft: 10, color: 'var(--text-tertiary)' }} />
          <input
            placeholder="예) 두부, 계란말이"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit();
            }}
            style={{ flex: 1, height: 38, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
          />
          <button className="btn sm" style={{ marginRight: 4 }} onClick={onSubmit}>
            검색
          </button>
        </div>

        {qParam.trim() ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Ingredients */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>재료</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {ingLoading ? '검색 중…' : `${ingHits.length}개`}
                </div>
              </div>
              {ingErr ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                  Supabase 검색이 실패했어요. (목업 결과로 대체) · {ingErr}
                </div>
              ) : null}
              {ingHits.length === 0 && !ingLoading ? (
                <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
                  검색 결과가 없어요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {ingHits.map((i, idx) => (
                    <Link
                      key={i.id}
                      href={`/ingredients/item/${encodeURIComponent(i.id)}`}
                      style={{
                        textDecoration: 'none',
                        color: 'inherit',
                        padding: '10px 0',
                        borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span className={`dot ${i.loc}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {i.name}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {LOC_LABEL[i.loc]}{i.cat ? ` · ${i.cat}` : ''}{i.qty ? ` · ${i.qty}` : ''}
                        </div>
                      </div>
                      <Icon name="chev-r" size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recipes */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>레시피</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{recipeHits.length}개</div>
              </div>
              {recipeHits.length === 0 ? (
                <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
                  검색 결과가 없어요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recipeHits.map((r, idx) => (
                    <Link
                      key={r.id}
                      href="/recipes"
                      style={{
                        textDecoration: 'none',
                        color: 'inherit',
                        padding: '10px 0',
                        borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title}
                          </div>
                          {r.yt ? <Icon name="youtube" size={13} style={{ color: '#c44' }} /> : null}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {r.time}분 · {r.kcal} kcal
                        </div>
                      </div>
                      <Icon name="chev-r" size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              검색어를 입력하면 재료/레시피 결과가 여기 표시돼요.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}


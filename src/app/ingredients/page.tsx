'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { INGREDIENTS as MOCK_INGREDIENTS, LOC_LABEL, type Loc, dCount, dSeverity } from '@/lib/data';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

type FilterKey = 'all' | Loc | 'soon';
type SortKey = 'expires_asc' | 'expires_desc' | 'created_desc' | 'name_asc';

type DbIngredientRow = {
  id: string;
  name: string;
  loc: Loc;
  qty: string | null;
  category: string | null;
  expires_at: string | null; // YYYY-MM-DD
  created_at?: string | null;
};

type ViewItem = {
  id: string;
  name: string;
  loc: Loc;
  qty: string;
  cat: string;
  d: number;
  expiresAt?: string | null;
  createdAt?: string | null;
};

function daysUntil(expiresAt: string | null): number {
  if (!expiresAt) return 999;
  const end = new Date(`${expiresAt}T00:00:00`);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function IngredientsPage() {
  const [rows, setRows] = useState<DbIngredientRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const FILTER_STORE_KEY = 'ingredients.filters.v1';
  const initialFilters = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        filterKey: 'all' as FilterKey,
        sortKey: 'expires_asc' as SortKey,
        hideNoExpiry: false,
        selectedCats: [] as string[],
      };
    }
    try {
      const raw = window.localStorage.getItem(FILTER_STORE_KEY);
      if (!raw) throw new Error('no saved');
      const parsed = JSON.parse(raw) as Partial<{
        filterKey: FilterKey;
        sortKey: SortKey;
        hideNoExpiry: boolean;
        selectedCats: string[];
      }>;
      return {
        filterKey: parsed.filterKey ?? ('all' as FilterKey),
        sortKey: parsed.sortKey ?? ('expires_asc' as SortKey),
        hideNoExpiry: parsed.hideNoExpiry ?? false,
        selectedCats: Array.isArray(parsed.selectedCats) ? parsed.selectedCats : [],
      };
    } catch {
      return {
        filterKey: 'all' as FilterKey,
        sortKey: 'expires_asc' as SortKey,
        hideNoExpiry: false,
        selectedCats: [] as string[],
      };
    }
  }, []);

  const [filterKey, setFilterKey] = useState<FilterKey>(initialFilters.filterKey);
  const [sortKey, setSortKey] = useState<SortKey>(initialFilters.sortKey);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(initialFilters.selectedCats));
  const [hideNoExpiry, setHideNoExpiry] = useState(initialFilters.hideNoExpiry);

  const selectedCatsKey = useMemo(() => Array.from(selectedCats).sort().join('|'), [selectedCats]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      filterKey,
      sortKey,
      hideNoExpiry,
      selectedCats: Array.from(selectedCats),
    };
    window.localStorage.setItem(FILTER_STORE_KEY, JSON.stringify(payload));
  }, [filterKey, sortKey, hideNoExpiry, selectedCatsKey]);

  const fetchRows = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    const { data, error } = await supabase
      .from('v_ingredients')
      .select('id,name,loc,qty,category,expires_at,created_at')
      .order('expires_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      setLoadErr(error.message);
      setRows([]);
      return;
    }
    setLoadErr(null);
    setRows((data ?? []) as DbIngredientRow[]);
  };

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;

    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchRows();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChanged = () => {
      fetchRows();
    };
    window.addEventListener('ingredients:changed', onChanged);
    return () => window.removeEventListener('ingredients:changed', onChanged);
  }, []);

  const mockItems: ViewItem[] = useMemo(
    () =>
      MOCK_INGREDIENTS.map((m) => ({
        id: `mock-${m.name}`,
        name: m.name,
        loc: m.loc,
        qty: m.qty,
        cat: m.cat,
        d: m.d,
        expiresAt: null,
        createdAt: null,
      })),
    [],
  );

  const viewItems: ViewItem[] = useMemo(() => {
    if (!isSupabaseEnabled) return mockItems;
    if (!rows) return [];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      loc: r.loc,
      qty: r.qty ?? '',
      cat: r.category ?? '기타',
      d: daysUntil(r.expires_at),
      expiresAt: r.expires_at,
      createdAt: r.created_at ?? null,
    }));
  }, [mockItems, rows]);

  const baseItems = useMemo(() => (loadErr ? mockItems : viewItems), [loadErr, mockItems, viewItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const i of baseItems) set.add(i.cat || '기타');
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [baseItems]);

  const counts = useMemo(() => {
    const base = { total: 0, fridge: 0, freezer: 0, pantry: 0, soon: 0 };
    for (const i of baseItems) {
      base.total += 1;
      base[i.loc] += 1;
      if (i.d <= 7) base.soon += 1;
    }
    return base;
  }, [baseItems]);

  const filterDefs = useMemo(
    () => [
      { key: 'all' as const, label: '전체', count: counts.total },
      { key: 'fridge' as const, label: '냉장', count: counts.fridge },
      { key: 'freezer' as const, label: '냉동', count: counts.freezer },
      { key: 'pantry' as const, label: '상온', count: counts.pantry },
      { key: 'soon' as const, label: '유통기한 임박', count: counts.soon },
    ],
    [counts],
  );

  const filteredItems = useMemo(() => {
    let list = baseItems;

    if (hideNoExpiry) list = list.filter((i) => i.d !== 999);
    if (selectedCats.size > 0) list = list.filter((i) => selectedCats.has(i.cat));

    if (filterKey === 'soon') list = list.filter((i) => i.d <= 7);
    else if (filterKey !== 'all') list = list.filter((i) => i.loc === filterKey);

    const getCreated = (i: { createdAt?: string | null }) => {
      const v = i.createdAt ?? null;
      return v ? new Date(v).getTime() : 0;
    };

    const sorted = [...list];
    switch (sortKey) {
      case 'expires_asc':
        sorted.sort((a, b) => a.d - b.d);
        break;
      case 'expires_desc':
        sorted.sort((a, b) => b.d - a.d);
        break;
      case 'created_desc':
        sorted.sort((a, b) => getCreated(b) - getCreated(a));
        break;
      case 'name_asc':
        sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ko'));
        break;
    }
    return sorted;
  }, [baseItems, filterKey, hideNoExpiry, selectedCats, sortKey]);

  const sortLabel = useMemo(() => {
    switch (sortKey) {
      case 'expires_asc':
        return '유통기한 빠른순';
      case 'expires_desc':
        return '유통기한 늦은순';
      case 'created_desc':
        return '최신 추가순';
      case 'name_asc':
        return '이름순';
    }
  }, [sortKey]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[data-sort-popover="1"]') || el.closest('[data-sort-button="1"]')) return;
      if (el.closest('[data-filter-popover="1"]') || el.closest('[data-filter-button="1"]')) return;
      setIsSortOpen(false);
      setIsFilterOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>전체 재료</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              냉장고에 보관 중인 모든 재료. 추가하면 자동으로 유통기한이 계산돼요.
            </div>
          </div>
        </div>

        {/* Quick add bar */}
        <div className="card" style={{ padding: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="plus" size={16} style={{ marginLeft: 10, color: 'var(--text-tertiary)' }} />
          <input
            placeholder="재료를 입력하세요. 예) 두부 1모, 계란 8개"
            style={{
              flex: 1, height: 38, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--text-primary)',
            }}
          />
          <div style={{ display: 'flex', gap: 4, padding: 4, background: '#f7f6f3', borderRadius: 8 }}>
            {[
              { l: '냉장', loc: 'fridge', on: true },
              { l: '냉동', loc: 'freezer', on: false },
              { l: '상온', loc: 'pantry', on: false },
            ].map(t => (
              <button key={t.l} style={{
                height: 30, padding: '0 12px', border: 'none', borderRadius: 6,
                background: t.on ? 'var(--surface)' : 'transparent',
                boxShadow: t.on ? 'var(--shadow-sm)' : 'none',
                fontSize: 11.5, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span className={`dot ${t.loc}`} style={{ width: 6, height: 6 }} />
                {t.l}
              </button>
            ))}
          </div>
          <button className="btn" style={{ marginRight: 4 }}>추가</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            {filterDefs.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterKey(f.key)}
                className={`pill ${filterKey === f.key ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                {f.label} {f.count}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <button
              className="pill"
              type="button"
              data-sort-button="1"
              onClick={() => {
                setIsSortOpen((v) => !v);
                setIsFilterOpen(false);
              }}
            >
              <Icon name="sort" size={12} /> {sortLabel}
            </button>
            {isSortOpen ? (
              <div
                data-sort-popover="1"
                className="card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  zIndex: 20,
                  padding: 10,
                  minWidth: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {(
                  [
                    { k: 'expires_asc', l: '유통기한 빠른순' },
                    { k: 'expires_desc', l: '유통기한 늦은순' },
                    { k: 'created_desc', l: '최신 추가순' },
                    { k: 'name_asc', l: '이름순' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.k}
                    type="button"
                    onClick={() => {
                      setSortKey(opt.k);
                      setIsSortOpen(false);
                    }}
                    className="pill"
                    style={{
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: sortKey === opt.k ? 'var(--surface)' : 'transparent',
                      boxShadow: sortKey === opt.k ? 'var(--shadow-sm)' : 'none',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span>{opt.l}</span>
                    {sortKey === opt.k ? <span style={{ fontSize: 11 }}>선택</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              className="pill"
              type="button"
              data-filter-button="1"
              onClick={() => {
                setIsFilterOpen((v) => !v);
                setIsSortOpen(false);
              }}
            >
              <Icon name="filter" size={12} /> 필터
            </button>
            {isFilterOpen ? (
              <div
                data-filter-popover="1"
                className="card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  zIndex: 20,
                  padding: 12,
                  width: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>카테고리</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {categories.map((c) => {
                    const on = selectedCats.has(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedCats((prev) => {
                            const next = new Set(prev);
                            if (next.has(c)) next.delete(c);
                            else next.add(c);
                            return next;
                          });
                        }}
                        className={`pill ${on ? 'active' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>유통기한 없는 항목 숨기기</div>
                  <button
                    type="button"
                    className={`pill ${hideNoExpiry ? 'active' : ''}`}
                    onClick={() => setHideNoExpiry((v) => !v)}
                    style={{ cursor: 'pointer' }}
                  >
                    {hideNoExpiry ? '켜짐' : '꺼짐'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => {
                      setSelectedCats(new Set());
                      setHideNoExpiry(false);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setIsFilterOpen(false)}
                    style={{ cursor: 'pointer' }}
                  >
                    적용
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Ingredient grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {!isSupabaseEnabled ? null : rows === null ? (
            <div className="card" style={{ padding: 14, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supabase에서 재료를 불러오는 중…</div>
            </div>
          ) : loadErr ? (
            <div className="card" style={{ padding: 14, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Supabase에서 재료를 불러오지 못했어요. (지금은 목업 데이터를 보여줄게요)
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>{loadErr}</div>
            </div>
          ) : null}

          {filteredItems.map(i => {
            const sev = dSeverity(i.d);
            return (
              <Link
                key={i.id}
                href={`/ingredients/item/${encodeURIComponent(i.id)}`}
                className="card"
                style={{
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`dot ${i.loc}`} />
                  <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{LOC_LABEL[i.loc]}</span>
                  <span className={`badge ${sev}`} style={{ marginLeft: 'auto' }}>{dCount(i.d)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', marginTop: 6 }}>{i.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[i.cat, i.qty].filter(Boolean).join(' · ')}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

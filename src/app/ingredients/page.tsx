'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { INGREDIENTS as MOCK_INGREDIENTS, LOC_LABEL, type Loc, dCount, dSeverity } from '@/lib/data';
import { withSubjectParticle } from '@/lib/korean';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';
import DuplicateIngredientDialog from './_components/DuplicateIngredientDialog';

type FilterKey = 'all' | Loc | 'soon';
type SortKey = 'expires_asc' | 'expires_desc' | 'created_desc' | 'name_asc';

type DbIngredientRow = {
  id: string;
  name: string;
  loc: Loc;
  qty: string | null;
  quantity?: number | null;
  unit?: string | null;
  qty_text?: string | null;
  category: string | null;
  expires_at: string | null; // YYYY-MM-DD
  note?: string | null;
  created_at?: string | null;
};

type ViewItem = {
  id: string;
  name: string;
  loc: Loc;
  qty: string;
  cat: string;
  note?: string | null;
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

function isMissingColumnError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const any = e as { code?: unknown; message?: unknown };
  if (any.code === '42703') return true;
  const msg = typeof any.message === 'string' ? any.message : '';
  return /column .* does not exist/i.test(msg) || /undefined column/i.test(msg);
}

export default function IngredientsPage() {
  const [rows, setRows] = useState<DbIngredientRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [quickText, setQuickText] = useState('');
  const [quickLoc, setQuickLoc] = useState<Loc>('fridge');
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickAddErr, setQuickAddErr] = useState<string | null>(null);
  const [localAdds, setLocalAdds] = useState<ViewItem[]>([]);
  const LOCAL_ADDS_KEY = 'ingredients.localAdds.v1';

  const [dupOpen, setDupOpen] = useState(false);
  const [dupName, setDupName] = useState<string>('');
  const [dupExistingItems, setDupExistingItems] = useState<{ name: string; meta: string; metaTone?: 'danger' | 'normal' }[]>([]);
  const [dupQueue, setDupQueue] = useState<{ name: string; qtyText: string; loc: Loc }[] | null>(null);
  const [dupAccepted, setDupAccepted] = useState<{ name: string; qtyText: string; loc: Loc }[] | null>(null);
  const [dupCurrent, setDupCurrent] = useState<{ name: string; qtyText: string; loc: Loc } | null>(null);

  const isViewItem = (x: unknown): x is ViewItem => {
    if (!x || typeof x !== 'object') return false;
    const r = x as Record<string, unknown>;
    return (
      typeof r.id === 'string' &&
      typeof r.name === 'string' &&
      (r.loc === 'fridge' || r.loc === 'freezer' || r.loc === 'pantry') &&
      typeof r.qty === 'string' &&
      typeof r.cat === 'string' &&
      typeof r.d === 'number'
    );
  };

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

  const selectedCatsArr = useMemo(() => Array.from(selectedCats), [selectedCats]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      filterKey,
      sortKey,
      hideNoExpiry,
      selectedCats: selectedCatsArr,
    };
    window.localStorage.setItem(FILTER_STORE_KEY, JSON.stringify(payload));
  }, [filterKey, sortKey, hideNoExpiry, selectedCatsArr]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LOCAL_ADDS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const next = parsed.filter(isViewItem).slice(0, 500);
      // eslint(react-hooks/set-state-in-effect): async to avoid sync cascades
      Promise.resolve().then(() => setLocalAdds(next));
    } catch {
      // ignore
    }
  }, []);

  const fetchRows = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    const tryWithNote = await supabase
      .from('v_ingredients')
      .select('id,name,loc,qty,category,expires_at,note,created_at')
      .order('expires_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const baseRes = !tryWithNote.error
      ? tryWithNote
      : isMissingColumnError(tryWithNote.error)
        ? await supabase
            .from('v_ingredients')
            .select('id,name,loc,qty,category,expires_at,created_at')
            .order('expires_at', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
        : tryWithNote;

    if (baseRes.error) {
      setLoadErr(baseRes.error.message);
      setRows([]);
      return;
    }
    setLoadErr(null);

    const baseRows = (baseRes.data ?? []) as DbIngredientRow[];

    try {
      const ids = baseRows.map((r) => r.id).filter(Boolean);
      if (ids.length === 0) {
        setRows(baseRows);
        return;
      }
      const itemsRes = await supabase.from('ingredient_items').select('id,note,qty_text,quantity,unit').in('id', ids);
      if (itemsRes.error) {
        // note/quantity/unit 컬럼이 없거나 RLS 등으로 못 가져와도 목록은 보여준다
        setRows(baseRows);
        return;
      }

      const map = new Map<string, { note?: string | null; qty_text?: string | null; quantity?: number | null; unit?: string | null }>();
      for (const it of (itemsRes.data ?? []) as { id: string; note?: string | null; qty_text?: string | null; quantity?: number | null; unit?: string | null }[]) {
        map.set(it.id, {
          note: typeof it.note === 'undefined' ? null : it.note ?? null,
          qty_text: typeof it.qty_text === 'undefined' ? null : it.qty_text ?? null,
          quantity: typeof it.quantity === 'number' ? it.quantity : null,
          unit: typeof it.unit === 'string' ? it.unit : it.unit ?? null,
        });
      }

      const toQty = (x: { qty: string | null; qty_text?: string | null; quantity?: number | null; unit?: string | null }) => {
        if (typeof x.quantity === 'number') return [String(x.quantity), x.unit ?? ''].filter(Boolean).join(' ');
        const qt = (x.qty_text ?? x.qty ?? '').trim();
        return qt;
      };

      setRows(
        baseRows.map((r) => {
          const extra = map.get(r.id);
          const merged = {
            ...r,
            note: extra?.note ?? r.note ?? null,
            qty_text: extra?.qty_text ?? null,
            quantity: typeof extra?.quantity === 'number' ? extra.quantity : null,
            unit: extra?.unit ?? null,
          };
          return {
            ...merged,
            qty: toQty(merged) || null,
          };
        }),
      );
    } catch {
      setRows(baseRows);
    }
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

  const parseQuickText = (raw: string): { name: string; qtyText: string }[] => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // 끝에서 "수량처럼 보이는 토큰"을 찾는다.
    // - 예: 8개, 300g, 1모, 2조각, 900ml, 1/2통, 1L, 12미
    const qtyTokenRe =
      /^(?=.*\d)\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?(?:개|g|kg|mg|ml|l|L|그램|밀리그램|킬로그램|키로그램|모|봉|팩|통|장|미|단|병|캔|조각|입|스푼|tsp|tbsp)?$/i;

    const out: { name: string; qtyText: string }[] = [];
    for (const p of parts) {
      const ws = p.split(/\s+/).filter(Boolean);
      if (ws.length <= 1) {
        out.push({ name: p, qtyText: '' });
        continue;
      }

      // 뒤에서부터 qty 후보를 찾고, 찾으면 그 앞은 전부 이름으로 묶는다.
      let splitIdx = -1;
      for (let i = ws.length - 1; i >= 1; i--) {
        if (qtyTokenRe.test(ws[i])) {
          splitIdx = i;
          break;
        }
      }

      if (splitIdx === -1) {
        // "3분 카레 매운맛"처럼 숫자가 이름에 포함될 수 있어
        // qty 패턴을 만족하지 않으면 전체를 이름으로 본다.
        out.push({ name: ws.join(' '), qtyText: '' });
        continue;
      }

      const name = ws.slice(0, splitIdx).join(' ');
      const qtyText = ws.slice(splitIdx).join(' ');
      out.push({ name, qtyText });
    }
    return out;
  };

  const normalizeName = (s: string) =>
    (s ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[()[\]{}'"`~!@#$%^&*+=|\\/:;,.?<>_-]/g, '');

  const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  };

  const isSimilarName = (inputName: string, existingName: string) => {
    const a = normalizeName(inputName);
    const b = normalizeName(existingName);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return true;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    const ratio = maxLen === 0 ? 1 : 1 - dist / maxLen;
    return ratio >= 0.82;
  };

  const upsertDefsAndInsertItems = async (items: { name: string; qtyText: string; loc: Loc }[]) => {
    if (!isSupabaseEnabled || !supabase) return;

    for (const it of items) {
      const name = it.name.trim();
      if (!name) continue;

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

      if (!defId) {
        throw new Error('재료 정의를 만들지 못했어요.');
      }

      const ins = await supabase.from('ingredient_items').insert({
        ingredient_def_id: defId,
        loc: it.loc,
        qty_text: it.qtyText || null,
        expires_at: null,
      });
      if (ins.error) throw ins.error;
    }
  };

  const doQuickAdd = async (items: { name: string; qtyText: string; loc: Loc }[]) => {
    setQuickAdding(true);
    setQuickAddErr(null);
    try {
      if (!isSupabaseEnabled || !supabase) {
        const now = Date.now();
        const adds = items.map((it, idx) => ({
          id: `local-${now}-${idx}-${it.name}`,
          name: it.name,
          loc: it.loc,
          qty: it.qtyText,
          cat: '기타',
          d: 999,
          expiresAt: null,
          createdAt: new Date().toISOString(),
        }));
        setLocalAdds((prev) => {
          const next = [...adds, ...prev];
          try {
            window.localStorage.setItem(LOCAL_ADDS_KEY, JSON.stringify(next.slice(0, 500)));
          } catch {
            // ignore
          }
          return next;
        });
      } else {
        await upsertDefsAndInsertItems(items);
        window.dispatchEvent(new Event('ingredients:changed'));
      }
      setQuickText('');
    } catch (e: unknown) {
      const any = e as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
      const msg = typeof any?.message === 'string' ? any.message : '추가 중 오류가 발생했어요.';
      const code = typeof any?.code === 'string' ? any.code : '';
      const details = typeof any?.details === 'string' ? any.details : '';
      const hint = typeof any?.hint === 'string' ? any.hint : '';
      const extra = [code ? `code=${code}` : '', details ? `details=${details}` : '', hint ? `hint=${hint}` : '']
        .filter(Boolean)
        .join(' · ');
      setQuickAddErr(extra ? `${msg} (${extra})` : msg);
    } finally {
      setQuickAdding(false);
    }
  };

  const openDupDialogFor = (it: { name: string; qtyText: string; loc: Loc }, matches: ViewItem[]) => {
    const name = it.name;
    const existingItems = matches.slice(0, 6).map((m) => {
      const sev = dSeverity(m.d);
      const metaTone: 'danger' | 'normal' = sev === 'danger' ? 'danger' : 'normal';
      const dLabel = m.d === 999 ? 'D-999' : `D-${m.d}`;
      const dText = m.d <= 0 && m.d !== 999 ? `${dLabel} 초과` : dLabel;
      return {
        name: [m.name, m.qty].filter(Boolean).join(' · '),
        meta: [m.cat, dText].filter(Boolean).join(' · '),
        metaTone,
      };
    });

    setDupName(name);
    setDupExistingItems(existingItems);
    setDupOpen(true);
  };

  const continueDupFlow = (queue: { name: string; qtyText: string; loc: Loc }[], accepted: { name: string; qtyText: string; loc: Loc }[]) => {
    // 가능한 한 즉시 처리하고, "중복/유사"가 발견되면 다이얼로그로 멈춘다.
    let rest = queue.slice();
    const acc = accepted.slice();

    while (rest.length > 0) {
      const cur = rest[0];
      const matches = baseItems.filter((e) => isSimilarName(cur.name, e.name));
      if (matches.length > 0) {
        setDupCurrent(cur);
        setDupQueue(rest.slice(1));
        setDupAccepted(acc);
        openDupDialogFor(cur, matches);
        return;
      }
      acc.push(cur);
      rest = rest.slice(1);
    }

    // 모두 통과 → 한 번에 저장
    setDupCurrent(null);
    setDupQueue(null);
    setDupAccepted(null);
    setDupOpen(false);
    if (acc.length > 0) {
      void doQuickAdd(acc);
    }
  };

  const onQuickAdd = async () => {
    if (quickAdding) return;

    const raw = quickText.trim();
    if (!raw) return;

    const parsed = parseQuickText(raw);
    if (parsed.length === 0) return;

    const items = parsed.map((p) => ({ ...p, loc: quickLoc }));
    continueDupFlow(items, []);
  };

  const viewItems: ViewItem[] = useMemo(() => {
    if (!isSupabaseEnabled) return mockItems;
    if (!rows) return [];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      loc: r.loc,
      qty: r.qty ?? '',
      cat: r.category ?? '기타',
      note: r.note ?? null,
      d: daysUntil(r.expires_at),
      expiresAt: r.expires_at,
      createdAt: r.created_at ?? null,
    }));
  }, [mockItems, rows]);

  const baseItems = (() => {
    const base = loadErr ? mockItems : viewItems;
    return localAdds.length > 0 ? [...localAdds, ...base] : base;
  })();

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
        <DuplicateIngredientDialog
          open={dupOpen}
          titleName={dupName || '재료'}
          description={dupName ? `등록된 ${withSubjectParticle(dupName)} 있어요. 그래도 추가할까요?` : '등록된 재료가 있어요. 그래도 추가할까요?'}
          existingItems={dupExistingItems}
          onSkip={async () => {
            setDupOpen(false);
            const cur = dupCurrent;
            const q = dupQueue ?? [];
            const acc = dupAccepted ?? [];
            setDupCurrent(null);
            setDupQueue(null);
            setDupAccepted(null);
            if (!cur) {
              // 안전장치: 상태가 꼬였으면 그냥 큐만 계속 진행
              continueDupFlow(q, acc);
              return;
            }
            // 현재 항목은 "건너뛰기" 처리하고, 다음 항목을 계속 검사한다.
            continueDupFlow(q, acc);
          }}
          onConfirm={async () => {
            setDupOpen(false);
            const cur = dupCurrent;
            const q = dupQueue ?? [];
            const acc = dupAccepted ?? [];
            setDupCurrent(null);
            setDupQueue(null);
            setDupAccepted(null);
            if (cur) acc.push(cur);
            continueDupFlow(q, acc);
          }}
        />

        {!isSupabaseEnabled ? (
          <div
            className="card"
            style={{
              padding: '10px 12px',
              marginBottom: 14,
              border: '0.5px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(211,209,199,0.86)',
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(211,209,199,0.60)', marginBottom: 2 }}>Supabase 비활성화</div>
            배포 환경에서 <b>NEXT_PUBLIC_SUPABASE_URL</b> / <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b>가 설정되지 않아 지금은 목업 데이터를 보여줘요.
            <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(211,209,199,0.62)' }}>
              Vercel에서 <b>Preview</b> 환경에도 동일하게 환경변수를 추가한 뒤 Redeploy 해주세요.
            </div>
          </div>
        ) : null}

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
        <div className="card ing-quickbar" style={{ padding: 6, marginBottom: 16 }}>
          <div className="ing-quickbar-row">
            <Icon name="plus" size={16} style={{ marginLeft: 10, color: 'var(--text-tertiary)' }} />
            <input
              className="ing-quickbar-input"
              placeholder="재료를 입력하세요. 예) 두부 1모, 계란 8개"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onQuickAdd();
              }}
              style={{
                flex: 1,
                height: 38,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 14,
                color: 'var(--text-primary)',
                minWidth: 0,
              }}
            />
            <div className="ing-quickbar-locs">
              {[
                { l: '냉장', loc: 'fridge' as const },
                { l: '냉동', loc: 'freezer' as const },
                { l: '상온', loc: 'pantry' as const },
              ].map((t) => {
                const on = quickLoc === t.loc;
                return (
                  <button
                    key={t.l}
                    type="button"
                    onClick={() => setQuickLoc(t.loc)}
                    className="ing-quickbar-locbtn"
                    data-on={on ? '1' : '0'}
                  >
                    <span className={`dot ${t.loc}`} style={{ width: 6, height: 6 }} />
                    {t.l}
                  </button>
                );
              })}
            </div>
            <button
              className="btn ing-quickbar-add"
              type="button"
              onClick={onQuickAdd}
              disabled={quickAdding}
              style={{ marginRight: 4, opacity: quickAdding ? 0.7 : 1 }}
            >
              {quickAdding ? '추가 중…' : '추가'}
            </button>
          </div>
        </div>
        {quickAddErr ? (
          <div className="card" style={{ padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>추가 실패: {quickAddErr}</div>
          </div>
        ) : null}

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
            const clamp1: React.CSSProperties = {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
            };
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
                  minWidth: 0,
                }}
              >
                <div className="ing-card-head">
                  <div className="ing-card-head-row">
                    <span className={`dot ${i.loc}`} />
                    <span className="ing-card-loc">{LOC_LABEL[i.loc]}</span>
                  </div>
                  <div className="ing-card-exp">
                    <span className={`badge ${sev}`}>{dCount(i.d)}</span>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    marginTop: 6,
                    ...clamp1,
                  }}
                  title={i.name}
                >
                  {i.name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text-secondary)',
                    ...clamp1,
                  }}
                  title={[i.cat, i.qty].filter(Boolean).join(' · ')}
                >
                  {[i.cat, i.qty].filter(Boolean).join(' · ')}
                </div>
                {i.note ? (
                  <div
                    title={i.note}
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                      ...clamp1,
                      marginTop: 2,
                    }}
                  >
                    {i.note}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

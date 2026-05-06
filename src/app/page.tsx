'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { INGREDIENTS, RECIPES, SHOPPING, LOC_LABEL, LOC_TEMP, type Loc, dCount, dSeverity } from '@/lib/data';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

type DbIngredientRow = {
  id: string;
  name: string;
  loc: Loc;
  qty: string | null;
  category: string | null;
  expires_at: string | null; // YYYY-MM-DD
  created_at?: string | null;
};

function daysUntil(expiresAt: string | null): number {
  if (!expiresAt) return 999;
  const end = new Date(`${expiresAt}T00:00:00`);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function RecipeCard({ r }: { r: typeof RECIPES[0] }) {
  const status = r.missing === 0
    ? { text: '바로 가능', cls: 'ok' }
    : { text: `${r.missing}개 부족`, cls: r.missing === 1 ? 'warn' : 'light' };
  return (
    <div className="card" style={{ overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ height: 100, background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border)', position: 'relative' }}>
        {r.yt && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(60,46,34,0.85)', color: 'var(--btn-fg)',
            borderRadius: 999, padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
          }}>
            <Icon name="youtube" size={12} /> YouTube
          </div>
        )}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span className={`badge ${status.cls}`}>{status.text}</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="clock" size={11} /> {r.time}분
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            <Icon name="flame" size={11} /> {r.kcal}kcal
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em' }}>{r.title}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const cookable = RECIPES.slice(0, 6);
  const [rows, setRows] = useState<DbIngredientRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

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
    // eslint(react-hooks/set-state-in-effect): run async to avoid sync cascades
    Promise.resolve().then(() => fetchRows());
    const onChanged = () => fetchRows();
    window.addEventListener('ingredients:changed', onChanged);
    return () => window.removeEventListener('ingredients:changed', onChanged);
  }, []);

  const ingredientItems = useMemo(() => {
    if (!isSupabaseEnabled) return INGREDIENTS;
    if (loadErr) return INGREDIENTS;
    if (!rows) return [];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      loc: r.loc,
      qty: r.qty ?? '',
      cat: r.category ?? '기타',
      d: daysUntil(r.expires_at),
    }));
  }, [rows, loadErr]);

  const expiring = useMemo(
    () => ingredientItems.filter((i) => i.d <= 7).sort((a, b) => a.d - b.d).slice(0, 7),
    [ingredientItems],
  );

  const totals = useMemo(() => {
    const base = { total: 0, soon7: 0 };
    for (const i of ingredientItems) {
      base.total += 1;
      if (i.d <= 7) base.soon7 += 1;
    }
    return base;
  }, [ingredientItems]);

  const stats = useMemo(() => {
    const locs: Loc[] = ['fridge', 'freezer', 'pantry'];
    return locs.map((loc) => {
      const list = ingredientItems.filter((i) => i.loc === loc);
      const byCat = new Map<string, number>();
      let danger = 0;
      for (const it of list) {
        byCat.set(it.cat, (byCat.get(it.cat) ?? 0) + 1);
        if (it.d <= 2) danger += 1;
      }
      const topCats = Array.from(byCat.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([c, n]) => `${c} ${n}`)
        .join(' · ');

      return {
        loc,
        label: `${LOC_LABEL[loc]} 재료`,
        count: list.length,
        danger,
        sub: `${LOC_TEMP[loc]} · ${topCats || '—'}`,
      };
    });
  }, [ingredientItems]);

  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20, maxWidth: 1280 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>안녕하세요, 지윤님</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              오늘 냉장고에 <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{totals.total}개</b>의 재료가 있어요.{' '}
              유통기한 임박 <b style={{ color: 'var(--status-danger)', fontWeight: 500 }}>{totals.soon7}개</b>를 먼저 사용해 보세요.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/calendar" className="btn ghost"><Icon name="cal" size={13} /> 식사 달력</Link>
            <Link href="/ingredients" className="btn"><Icon name="plus" size={13} /> 재료 추가</Link>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
          {stats.map(s => (
            <div key={s.loc} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className={`dot ${s.loc}`} style={{ width: 8, height: 8 }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{s.label}</span>
                {s.danger > 0 && <span className="badge danger" style={{ marginLeft: 'auto' }}>D-2 임박 {s.danger}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="num-display" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.count}</span>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>개</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Cookable recipes */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>지금 만들 수 있는 레시피</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 3 }}>내 재료 기준으로 추천된 12개 중 6개</div>
          </div>
          <Link href="/recommend"><span className="lnk" style={{ fontSize: 12 }}>전체 보기 →</span></Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
          {cookable.map(r => <RecipeCard key={r.id} r={r} />)}
        </div>

        {/* Two-column widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>유통기한 임박</div>
              <Link href="/ingredients"><span className="lnk" style={{ fontSize: 11.5 }}>전체</span></Link>
            </div>
            {expiring.map((i, idx) => (
              <div key={i.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0',
                borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)',
              }}>
                <span className={`dot ${dSeverity(i.d)}`} />
                <span style={{ fontSize: 12.5, flex: 1 }}>{i.name}</span>
                <span className="tag">{LOC_LABEL[i.loc]} · {i.qty}</span>
                <span className={`badge ${dSeverity(i.d)}`} style={{ minWidth: 38, justifyContent: 'center' }}>{dCount(i.d)}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>장보기 목록</div>
              <Link href="/shopping"><span className="lnk" style={{ fontSize: 11.5 }}>장보기 페이지로 →</span></Link>
            </div>
            {SHOPPING.slice(0, 6).map((s, idx) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0',
                borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)',
                opacity: s.done ? 0.45 : 1,
              }}>
                <span className={`chk ${s.done ? 'on' : ''}`}>
                  {s.done && <Icon name="check" size={11} />}
                </span>
                <span style={{ fontSize: 12.5, flex: 1, textDecoration: s.done ? 'line-through' : 'none' }}>{s.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  {s.from === '직접 추가' ? s.from : `← ${s.from}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

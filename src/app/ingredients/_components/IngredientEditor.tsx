'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { LOC_LABEL, type Loc, dCount, dSeverity } from '@/lib/data';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

type CategoryRow = { id: string; name: string };
type LocationRow = { code: Loc; label: string };

type DbItemRow = {
  id: string;
  loc: Loc;
  qty_text: string | null;
  expires_at: string | null; // YYYY-MM-DD
  ingredient_def_id: string;
  created_at: string | null;
};

type DbDefRow = {
  id: string;
  name: string;
  category_id: string | null;
};

type IngredientItemsUpdate = {
  loc: Loc;
  qty_text: string | null;
  expires_at: string | null;
};

type IngredientDefsUpdate = {
  name: string;
  category_id: string | null;
};

function getErrMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return '알 수 없는 에러가 발생했어요.';
}

function daysUntil(expiresAt: string | null): number {
  if (!expiresAt) return 999;
  const end = new Date(`${expiresAt}T00:00:00`);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function inputStyle(): React.CSSProperties {
  return {
    height: 38,
    border: '0.5px solid var(--border)',
    borderRadius: 10,
    padding: '0 12px',
    outline: 'none',
    background: 'var(--surface)',
    fontSize: 13,
    color: 'var(--text-primary)',
  };
}

export default function IngredientEditor({
  id,
  onCloseHref,
  closeOnSave,
}: {
  id: string;
  onCloseHref?: string;
  closeOnSave?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [catAdding, setCatAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [cats, setCats] = useState<(CategoryRow & { sort_order?: number | null })[]>([]);
  const [locs, setLocs] = useState<LocationRow[]>([
    { code: 'fridge', label: '냉장' },
    { code: 'freezer', label: '냉동' },
    { code: 'pantry', label: '상온' },
  ]);

  const [defId, setDefId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [loc, setLoc] = useState<Loc>('fridge');
  const [qtyText, setQtyText] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');

  const d = useMemo(() => daysUntil(expiresAt || null), [expiresAt]);
  const sev = dSeverity(d);

  const catsWithoutOther = useMemo(
    () =>
      cats
        .filter((c) => c.name !== '기타')
        .slice()
        .sort((a, b) => {
          const ao = a.sort_order ?? 0;
          const bo = b.sort_order ?? 0;
          if (ao !== bo) return ao - bo;
          return (a.name ?? '').localeCompare(b.name ?? '', 'ko');
        }),
    [cats],
  );

  const reloadCategories = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    const res = await supabase
      .from('categories')
      .select('id,name,sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (res.error) throw res.error;
    setCats((res.data ?? []) as (CategoryRow & { sort_order?: number | null })[]);
  };

  const addCategory = async () => {
    const nameTrimmed = newCatName.trim();
    if (!nameTrimmed) return;
    if (nameTrimmed === '기타') {
      setCategoryId('');
      setNewCatName('');
      return;
    }
    if (!isSupabaseEnabled || !supabase) return;

    setCatAdding(true);
    setErr(null);
    try {
      const ins = await supabase
        .from('categories')
        .upsert(
          { owner_id: null, name: nameTrimmed, sort_order: 0 },
          { onConflict: 'owner_id,name' },
        )
        .select('id')
        .single();
      if (ins.error) throw ins.error;

      await reloadCategories();
      setCategoryId(ins.data.id);
      setNewCatName('');
    } catch (e: unknown) {
      setErr(getErrMessage(e));
    } finally {
      setCatAdding(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    // mock: edit is local-only
    if (id.startsWith('mock-')) {
      const mockName = id.replace(/^mock-/, '');
      // eslint(react-hooks/set-state-in-effect): run async to avoid sync cascades
      Promise.resolve().then(() => {
        setName(mockName);
        setQtyText('');
        setExpiresAt('');
        setCategoryId('');
        setLoc('fridge');
        setDefId(null);
        setLoading(false);
      });
      return;
    }

    if (!isSupabaseEnabled || !supabase) {
      Promise.resolve().then(() => {
        setErr('Supabase 연결이 꺼져 있어요.');
        setLoading(false);
      });
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);

      const [catsRes, locRes, itemRes] = await Promise.all([
        supabase.from('categories').select('id,name,sort_order').order('sort_order', { ascending: true }).order('name', { ascending: true }),
        supabase.from('locations').select('code,label').order('code', { ascending: true }),
        supabase
          .from('ingredient_items')
          .select('id,loc,qty_text,expires_at,ingredient_def_id,created_at')
          .eq('id', id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      if (catsRes.error) throw catsRes.error;
      if (locRes.error) throw locRes.error;
      if (itemRes.error) throw itemRes.error;
      if (!itemRes.data) {
        setErr('재료를 찾을 수 없어요.');
        setLoading(false);
        return;
      }

      const item = itemRes.data as DbItemRow;

      const defRes = await supabase
        .from('ingredient_defs')
        .select('id,name,category_id')
        .eq('id', item.ingredient_def_id)
        .maybeSingle();

      if (cancelled) return;
      if (defRes.error) throw defRes.error;
      if (!defRes.data) {
        setErr('재료 정의(ingredient_defs)를 찾을 수 없어요.');
        setLoading(false);
        return;
      }

      const def = defRes.data as DbDefRow;
      setCats((catsRes.data ?? []) as (CategoryRow & { sort_order?: number | null })[]);
      setLocs((locRes.data ?? []) as unknown as LocationRow[]);

      setDefId(def.id);
      setName(def.name ?? '');
      setCategoryId(def.category_id ?? '');
      setLoc(item.loc);
      setQtyText(item.qty_text ?? '');
      setExpiresAt(item.expires_at ?? '');

      setLoading(false);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setErr(getErrMessage(e));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const onSave = async () => {
    if (id.startsWith('mock-')) return;
    if (!isSupabaseEnabled || !supabase) return;
    if (!defId) return;

    setSaving(true);
    setErr(null);

    try {
      const updatesItem: IngredientItemsUpdate = {
        loc,
        qty_text: qtyText || null,
        expires_at: expiresAt ? expiresAt : null,
      };

      const updatesDef: IngredientDefsUpdate = {
        name: name.trim(),
        category_id: categoryId || null,
      };

      const [uItem, uDef] = await Promise.all([
        supabase.from('ingredient_items').update(updatesItem).eq('id', id),
        supabase.from('ingredient_defs').update(updatesDef).eq('id', defId),
      ]);

      if (uItem.error) throw uItem.error;
      if (uDef.error) throw uDef.error;

      setSavedAt(Date.now());

      // 목록 화면(뒤에 깔린 화면) 갱신 트리거
      window.dispatchEvent(new Event('ingredients:changed'));

      // 모달이면 저장 후 닫기
      if (closeOnSave) router.back();
    } catch (e: unknown) {
      setErr(getErrMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>불러오는 중…</div>
      ) : err ? (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>에러: {err}</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className={`dot ${loc}`} />
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{LOC_LABEL[loc]}</div>
            <div style={{ flex: 1 }} />
            <span className={`badge ${sev}`}>{dCount(d)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>이름</div>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} />
            </div>

            {/* 이름 아래: 카테고리 -> 새 카테고리 추가 -> 수량 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>카테고리</div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    minWidth: 0,
                    paddingBottom: 2,
                  }}
                >
                  <button
                    type="button"
                    className={`pill ${categoryId === '' ? 'active' : ''}`}
                    onClick={() => setCategoryId('')}
                    style={{ cursor: 'pointer' }}
                  >
                    기타
                  </button>
                  {catsWithoutOther.map((c) => {
                    const on = categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`pill ${on ? 'active' : ''}`}
                        onClick={() => setCategoryId(c.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 새 카테고리 추가: 스크린샷처럼 아래에 배치 */}
              <div style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ ...inputStyle(), flex: 1 }}
                  placeholder="새 카테고리 추가…"
                />
                <button type="button" className="btn" onClick={addCategory} disabled={catAdding}>
                  <Icon name="plus" size={13} /> {catAdding ? '추가 중…' : '추가'}
                </button>
              </div>

              <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>수량</div>
                <input
                  value={qtyText}
                  onChange={(e) => setQtyText(e.target.value)}
                  style={inputStyle()}
                  placeholder="예) 8개, 300g"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>보관</div>
                <select value={loc} onChange={(e) => setLoc(e.target.value as Loc)} style={inputStyle()}>
                  {locs.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>유통기한</div>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={inputStyle()} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <button type="button" className="btn" onClick={onSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
              <Icon name="check" size={13} /> {saving ? '저장 중…' : '저장'}
            </button>
            {savedAt ? <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>저장됨</div> : null}
            <div style={{ flex: 1 }} />
            {onCloseHref ? (
              <a className="pill" href={onCloseHref} style={{ textDecoration: 'none' }}>
                닫기
              </a>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}


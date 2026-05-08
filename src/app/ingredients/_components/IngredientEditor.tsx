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
  quantity?: number | null;
  unit?: string | null;
  expires_at: string | null; // YYYY-MM-DD
  note?: string | null;
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
  quantity?: number | null;
  unit?: string | null;
  expires_at: string | null;
  note?: string | null;
};

type IngredientDefsUpdate = {
  name: string;
  category_id: string | null;
};

function getErrMessage(e: unknown): string {
  if (!e || typeof e !== 'object') return '알 수 없는 에러가 발생했어요.';
  const any = e as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const msg = typeof any.message === 'string' ? any.message : '알 수 없는 에러가 발생했어요.';
  const code = typeof any.code === 'string' ? any.code : '';
  const details = typeof any.details === 'string' ? any.details : '';
  const hint = typeof any.hint === 'string' ? any.hint : '';

  const extra = [code ? `code=${code}` : '', details ? `details=${details}` : '', hint ? `hint=${hint}` : '']
    .filter(Boolean)
    .join(' · ');

  return extra ? `${msg} (${extra})` : msg;
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
    width: '100%',
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

function isMissingColumnError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const any = e as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  // Postgres undefined_column
  if (any.code === '42703') return true;
  const msg = typeof any.message === 'string' ? any.message : '';
  return /column .* does not exist/i.test(msg) || /undefined column/i.test(msg);
}

export default function IngredientEditor({
  id,
  onCloseHref,
  closeOnSave,
}: {
  id?: string;
  onCloseHref?: string;
  closeOnSave?: boolean;
}) {
  const router = useRouter();
  const isCreate = !id || id === 'new';
  const isMock = !!id && id.startsWith('mock-');
  const isLocal = !!id && id.startsWith('local-');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [catAdding, setCatAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const LOCAL_ADDS_KEY = 'ingredients.localAdds.v1';

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
  const [quantityText, setQuantityText] = useState('');
  const [unit, setUnit] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [supportsNote, setSupportsNote] = useState<boolean | null>(null);
  const [supportsQtySplit, setSupportsQtySplit] = useState<boolean | null>(null);

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
    if (isCreate) {
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
        const [catsRes, locRes, probeQtySplit] = await Promise.all([
          supabase.from('categories').select('id,name,sort_order').order('sort_order', { ascending: true }).order('name', { ascending: true }),
          supabase.from('locations').select('code,label').order('code', { ascending: true }),
          (async () => {
            const probe = await supabase.from('ingredient_items').select('id,quantity,unit').limit(1);
            if (!probe.error) return true;
            if (isMissingColumnError(probe.error)) return false;
            // 알 수 없는 에러면 기존 UX 유지(분리 입력 숨김)
            return false;
          })(),
        ]);
        if (cancelled) return;
        if (catsRes.error) throw catsRes.error;
        if (locRes.error) throw locRes.error;

        setCats((catsRes.data ?? []) as (CategoryRow & { sort_order?: number | null })[]);
        setLocs((locRes.data ?? []) as unknown as LocationRow[]);
        setSupportsQtySplit(probeQtySplit);

        setDefId(null);
        setName('');
        setCategoryId('');
        setLoc('fridge');
        setQtyText('');
        setQuantityText('');
        setUnit('');
        setExpiresAt('');
        setNote('');
        setSavedAt(null);
        setLoading(false);
      })().catch((e: unknown) => {
        if (cancelled) return;
        setErr(getErrMessage(e));
        setLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }

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

    // local quick-add: read-only 화면(삭제는 가능)
    if (id.startsWith('local-')) {
      Promise.resolve().then(() => {
        setErr('로컬 추가 항목은 상세 편집을 지원하지 않아요. (삭제는 가능)');
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
        (async () => {
          // note / quantity / unit 컬럼이 있을 수도/없을 수도 있어서 단계적으로 안전하게 조회
          const withAll = await supabase
            .from('ingredient_items')
            .select('id,loc,qty_text,quantity,unit,expires_at,note,ingredient_def_id,created_at')
            .eq('id', id)
            .maybeSingle();
          if (!withAll.error) {
            setSupportsNote(true);
            setSupportsQtySplit(true);
            return withAll;
          }
          if (isMissingColumnError(withAll.error)) {
            // 어떤 컬럼이 없는지 모르니, note만 빼고 다시
            const withoutNote = await supabase
              .from('ingredient_items')
              .select('id,loc,qty_text,quantity,unit,expires_at,ingredient_def_id,created_at')
              .eq('id', id)
              .maybeSingle();
            if (!withoutNote.error) {
              setSupportsNote(false);
              setSupportsQtySplit(true);
              return withoutNote;
            }

            if (isMissingColumnError(withoutNote.error)) {
              // quantity/unit도 없을 수 있어 최후 fallback
              setSupportsNote(false);
              setSupportsQtySplit(false);
              return await supabase
                .from('ingredient_items')
                .select('id,loc,qty_text,expires_at,ingredient_def_id,created_at')
                .eq('id', id)
                .maybeSingle();
            }
            return withoutNote;
          }
          return withAll;
        })(),
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
      const qtyDerived =
        typeof item.quantity === 'number'
          ? String(item.quantity)
          : item.qty_text && /^[0-9]+(\.[0-9]+)?$/.test(item.qty_text.trim())
            ? item.qty_text.trim()
            : '';
      setQuantityText(qtyDerived);
      setUnit(item.unit ?? '');
      setExpiresAt(item.expires_at ?? '');
      setNote((item.note ?? '') || '');

      setLoading(false);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setErr(getErrMessage(e));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  const onSave = async () => {
    if (!id && !isCreate) return;
    if (id?.startsWith('mock-')) return;
    if (id?.startsWith('local-')) return;
    if (!isSupabaseEnabled || !supabase) return;
    if (!isCreate && !defId) return;
    if (isCreate && !name.trim()) {
      setErr('재료 이름을 입력해 주세요.');
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      if (isCreate) {
        const nameTrimmed = name.trim();
        const existing = await supabase.from('ingredient_defs').select('id').eq('name', nameTrimmed).maybeSingle();
        if (existing.error) throw existing.error;

        const newDefId =
          existing.data?.id ??
          (
            await supabase
              .from('ingredient_defs')
              .insert({ name: nameTrimmed, category_id: categoryId || null })
              .select('id')
              .single()
          ).data?.id;

        if (!newDefId) throw new Error('재료 정의를 만들지 못했어요.');

        const derivedQtyText = [quantityText.trim(), unit.trim()].filter(Boolean).join(' ');
        const baseItem = {
          ingredient_def_id: newDefId,
          loc,
          qty_text: supportsQtySplit ? (derivedQtyText || null) : qtyText || null,
          expires_at: expiresAt ? expiresAt : null,
        } as Record<string, unknown>;
        if (supportsNote !== false) baseItem.note = note.trim() || null;
        if (supportsQtySplit) {
          baseItem.quantity = quantityText.trim() === '' ? null : Number(quantityText);
          baseItem.unit = unit.trim() || null;
        }

        const ins = await supabase.from('ingredient_items').insert(baseItem);
        if (ins.error) {
          if (supportsNote !== false && isMissingColumnError(ins.error)) {
            setSupportsNote(false);
            const retry = await supabase.from('ingredient_items').insert({
              ingredient_def_id: newDefId,
              loc,
              qty_text: supportsQtySplit ? (derivedQtyText || null) : qtyText || null,
              expires_at: expiresAt ? expiresAt : null,
            });
            if (retry.error) throw retry.error;
          } else {
            throw ins.error;
          }
        }

        setSavedAt(Date.now());
        window.dispatchEvent(new Event('ingredients:changed'));
        if (closeOnSave) router.back();
        return;
      }

      const updatesItem: IngredientItemsUpdate = {
        loc,
        qty_text: (() => {
          if (!supportsQtySplit) return qtyText || null;
          const t = [quantityText.trim(), unit.trim()].filter(Boolean).join(' ');
          return t || null;
        })(),
        ...(supportsQtySplit
          ? {
              quantity: quantityText.trim() === '' ? null : Number(quantityText),
              unit: unit.trim() || null,
            }
          : {}),
        expires_at: expiresAt ? expiresAt : null,
      };
      if (supportsNote !== false) updatesItem.note = note.trim() || null;

      const updatesDef: IngredientDefsUpdate = {
        name: name.trim(),
        category_id: categoryId || null,
      };

      const [uItem, uDef] = await Promise.all([
        supabase.from('ingredient_items').update(updatesItem).eq('id', id),
        supabase.from('ingredient_defs').update(updatesDef).eq('id', defId),
      ]);

      if (uItem.error) {
        // note 컬럼이 없으면 update가 실패할 수 있어, 그때는 note 빼고 한 번 더 저장
        if (supportsNote !== false && isMissingColumnError(uItem.error)) {
          setSupportsNote(false);
          const fallback: IngredientItemsUpdate = {
            loc,
            qty_text: qtyText || null,
            expires_at: expiresAt ? expiresAt : null,
          };
          const retry = await supabase.from('ingredient_items').update(fallback).eq('id', id);
          if (retry.error) throw retry.error;
        } else {
          throw uItem.error;
        }
      }
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

  const onDelete = async () => {
    if (!id || isCreate) return;
    if (isMock) return;

    const ok = window.confirm('이 재료를 삭제할까요?');
    if (!ok) return;

    setDeleting(true);
    setErr(null);
    try {
      if (isLocal) {
        try {
          const raw = window.localStorage.getItem(LOCAL_ADDS_KEY);
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          const arr = Array.isArray(parsed) ? parsed : [];
          const next = arr.filter((x) => !x || typeof x !== 'object' || (x as { id?: unknown }).id !== id);
          window.localStorage.setItem(LOCAL_ADDS_KEY, JSON.stringify(next.slice(0, 500)));
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event('ingredients:changed'));
      } else {
        if (!isSupabaseEnabled || !supabase) {
          setErr('Supabase 연결이 꺼져 있어 삭제할 수 없어요.');
          return;
        }
        const del = await supabase.from('ingredient_items').delete().eq('id', id);
        if (del.error) throw del.error;
        window.dispatchEvent(new Event('ingredients:changed'));
      }

      if (closeOnSave) router.back();
      else if (onCloseHref) router.push(onCloseHref);
      else router.back();
    } catch (e: unknown) {
      setErr(getErrMessage(e));
    } finally {
      setDeleting(false);
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

              {supportsQtySplit ? (
                <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>수량 / 단위</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                    <input
                      value={quantityText}
                      onChange={(e) => setQuantityText(e.target.value)}
                      style={inputStyle()}
                      placeholder="예) 2"
                      inputMode="decimal"
                    />
                    <input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      style={inputStyle()}
                      placeholder="예) 개, g"
                    />
                  </div>
                </div>
              ) : (
                <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>수량</div>
                  <input
                    value={qtyText}
                    onChange={(e) => setQtyText(e.target.value)}
                    style={inputStyle()}
                    placeholder="예) 8개, 300g"
                  />
                </div>
              )}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>비고</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예) 개봉함, 반쪽 남음, 다음주까지 사용"
                style={{
                  border: '0.5px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  outline: 'none',
                  background: 'var(--surface)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  minHeight: 86,
                  resize: 'vertical',
                }}
              />
              {supportsNote === false ? (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  (현재 DB에 비고 컬럼이 없어 저장되진 않아요)
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <button type="button" className="btn" onClick={onSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
              <Icon name="check" size={13} /> {saving ? '저장 중…' : '저장'}
            </button>
            {savedAt ? <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>저장됨</div> : null}
            <div style={{ flex: 1 }} />
            {!isCreate && !isMock ? (
              <button
                type="button"
                className="pill"
                onClick={onDelete}
                disabled={deleting}
                style={{
                  cursor: deleting ? 'default' : 'pointer',
                  border: '1px solid rgba(244,63,94,0.45)',
                  color: '#e11d48',
                  background: 'transparent',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                <Icon name="trash" size={13} /> {deleting ? '삭제 중…' : '삭제'}
              </button>
            ) : null}
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


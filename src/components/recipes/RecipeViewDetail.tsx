'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { SHOPPING_KEY, shoppingSeedItems, type StoredShoppingRow } from '@/lib/shopping-local';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

import styles from './RecipeViewDetail.module.css';

export type RecipeViewIngredient = { name: string; qtyText: string; unit: string };

export type RecipeViewDetailLike = {
  id: string;
  title: string;
  youtubeUrl?: string | null;
  recipeType?: string | null;
  memo?: string | null;
  kcal?: number | null;
  servings?: number | null;
  ingredients: RecipeViewIngredient[];
  steps: { body: string }[];
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function formatQty(it: RecipeViewIngredient): string {
  return [it.qtyText, it.unit].filter((x) => (x ?? '').trim()).join(' ');
}

async function fetchInventoryNames(): Promise<Set<string>> {
  const next = new Set<string>();
  if (!isSupabaseEnabled || !supabase) return next;

  const res = await supabase.from('ingredient_items').select('ingredient_defs(name)');
  if (res.error) return next;
  type Row = { ingredient_defs: { name?: string | null } | { name?: string | null }[] | null };
  const rows = (res.data ?? []) as unknown as Row[];
  for (const r of rows) {
    const def = Array.isArray(r.ingredient_defs) ? r.ingredient_defs[0] : r.ingredient_defs;
    const nm = typeof def?.name === 'string' ? def.name : '';
    if (nm.trim()) next.add(norm(nm));
  }
  return next;
}

function dedupeShoppingNames(names: string[], existingUnchecked: Iterable<string>) {
  const have = new Set<string>();
  for (const e of existingUnchecked) have.add(norm(e));
  const out: string[] = [];
  for (const nm of names) {
    const t = nm.trim();
    if (!t) continue;
    const key = norm(t);
    if (have.has(key)) continue;
    have.add(key);
    out.push(t);
  }
  return out;
}

function loadShoppingLocal(): StoredShoppingRow[] {
  if (typeof window === 'undefined') return shoppingSeedItems();
  try {
    const raw = window.localStorage.getItem(SHOPPING_KEY);
    if (!raw) return shoppingSeedItems();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return shoppingSeedItems();
    return parsed.filter(Boolean) as StoredShoppingRow[];
  } catch {
    return shoppingSeedItems();
  }
}

function saveShoppingLocal(items: StoredShoppingRow[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHOPPING_KEY, JSON.stringify(items.slice(0, 500)));
  } catch {
    // ignore
  }
}

async function fetchUncheckedShoppingNames(client: NonNullable<typeof supabase>): Promise<Set<string>> {
  const s = new Set<string>();
  const res = await client.from('shopping_items').select('name,checked').eq('checked', false).limit(2000);
  if (res.error) return s;
  const rows = (res.data ?? []) as { name?: string | null }[];
  for (const r of rows) {
    const n = typeof r.name === 'string' ? r.name : '';
    if (n.trim()) s.add(norm(n));
  }
  return s;
}

export default function RecipeViewDetail({
  detail,
}: {
  detail: RecipeViewDetailLike;
}) {
  const [inv, setInv] = useState<Set<string>>(() => new Set());
  const [invBusy, setInvBusy] = useState(true);
  const [shopBusy, setShopBusy] = useState(false);
  const [shopMsg, setShopMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInvBusy(true);
    Promise.resolve()
      .then(() => fetchInventoryNames())
      .then((s) => {
        if (!cancelled) setInv(s);
      })
      .catch(() => {
        if (!cancelled) setInv(new Set());
      })
      .finally(() => {
        if (!cancelled) setInvBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ytUrl = useMemo(() => {
    const t = (detail.youtubeUrl ?? '').trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
  }, [detail.youtubeUrl]);

  const ings = useMemo(() => detail.ingredients.filter((x) => x.name.trim()), [detail.ingredients]);
  const steps = useMemo(() => detail.steps.map((x) => x.body.trim()).filter(Boolean), [detail.steps]);

  const invReady = useMemo(() => !invBusy, [invBusy]);
  const invMatchEnabled = isSupabaseEnabled;

  const misses = useMemo(() => {
    if (!invReady || !invMatchEnabled) return [] as typeof ings;
    return ings.filter((x) => !inv.has(norm(x.name)));
  }, [ings, inv, invReady, invMatchEnabled]);

  const ownedSorted = useMemo(() => {
    if (!invReady || !invMatchEnabled) return [] as string[];
    const names = ings.filter((x) => inv.has(norm(x.name))).map((x) => x.name.trim());
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [ings, inv, invReady, invMatchEnabled]);

  const shortageCount = misses.length;

  const metaLine = useMemo(() => {
    const bits: string[] = [];
    bits.push(detail.kcal != null ? `${detail.kcal} kcal` : '칼로리 미입력');
    if (detail.servings != null) bits.push(`${detail.servings}인분`);
    return bits.join(' · ');
  }, [detail.kcal, detail.servings]);

  async function appendShopping(forNames: string[]) {
    setShopMsg(null);
    const from = detail.title.trim() || '레시피';
    const uniq = [...new Map(forNames.map((n) => [norm(n), n.trim()])).values()].filter(Boolean);
    if (uniq.length === 0) return;

    setShopBusy(true);
    try {
      if (!isSupabaseEnabled || !supabase) {
        const cur = loadShoppingLocal();
        const existing = cur.filter((x) => !x.done).map((x) => x.name);
        const toInsert = dedupeShoppingNames(uniq, existing);

        let next = cur;
        for (const name of toInsert) {
          next = [...next, { id: `s${Date.now()}-${Math.random().toString(16).slice(2)}`, name, from, done: false, memo: null }];
        }

        saveShoppingLocal(next);
        setShopMsg(toInsert.length === 0 ? '이미 장보기에 있는 재료예요.' : `장보기에 ${toInsert.length}개를 추가했어요.`);
        return;
      }

      const have = await fetchUncheckedShoppingNames(supabase);
      const pending = uniq.filter((nm) => !have.has(norm(nm)));
      if (pending.length === 0) {
        setShopMsg('이미 장보기에 있는 재료예요.');
        return;
      }

      const rows = pending.map((name) => ({ name, from, checked: false as const }));

      const ins = await supabase.from('shopping_items').insert(rows);
      if (ins.error) throw ins.error;
      setShopMsg(`장보기에 ${pending.length}개를 추가했어요.`);
    } catch {
      setShopMsg('추가에 실패했어요. 네트워크/설정을 확인해 주세요.');
    } finally {
      setShopBusy(false);
    }
  }

  const showShortageHighlight = invMatchEnabled && invReady && shortageCount > 0;

  return (
    <div className={styles.root}>
      <div className={styles.heroRow}>
        <h2 className={`${styles.heroTitle} num-display`} style={{ fontSize: 18, fontWeight: 600 }}>
          {detail.title}
        </h2>
        {detail.recipeType ? <span className="badge light">{detail.recipeType}</span> : null}
        {ytUrl ? (
          <a href={ytUrl} target="_blank" rel="noreferrer" className="pill">
            <Icon name="link" size={13} style={{ color: 'var(--text-tertiary)' }} aria-hidden /> 링크 열기
          </a>
        ) : null}
      </div>

      <p className={`${styles.heroMeta} num-display`} style={{ fontSize: 12 }}>
        {metaLine}
      </p>

      {detail.memo?.trim() ? (
        <div className={`card ${styles.memoCard}`}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail.memo}</div>
        </div>
      ) : null}

      <div className={styles.ingPanel}>
        <p className={styles.ingPanelTitle} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          재료 {ings.length}개
        </p>
        <div className={styles.ingGrid}>
          {ings.map((it, idx) => {
            const shortage = invMatchEnabled && invReady && !inv.has(norm(it.name));
            const cell = shortage ? `${styles.ingCell} ${styles.ingCellMissing}` : styles.ingCell;
            return (
              <div key={`${norm(it.name)}-${idx}`} className={cell}>
                <span className={`${styles.ingCellName}`} style={{ fontSize: 12.5, fontWeight: 500 }}>
                  {it.name}
                </span>
                <span className={`${styles.ingCellQty} num-display`} style={{ fontSize: 11.5 }}>
                  {shortage ? '부족' : formatQty(it)}
                </span>
              </div>
            );
          })}
        </div>
        {!ings.length ? <div className={styles.emptyNote}>등록된 재료가 없어요.</div> : null}
      </div>

      <section className={styles.shopCard} aria-labelledby="recipe-shop-heading">
        <div className={styles.shopHead}>
          <p id="recipe-shop-heading" className={styles.shopHeadTitle} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            장보기 목록에 추가
          </p>
          {!invMatchEnabled ? (
            <span className="badge light">로컬 모드</span>
          ) : !invReady ? (
            <span className="badge light">확인 중…</span>
          ) : showShortageHighlight ? (
            <span className="badge danger">{`${shortageCount}개 부족`}</span>
          ) : (
            <span className="badge ok">충족</span>
          )}
        </div>

        {showShortageHighlight && misses.length > 0 ? (
          <div className={styles.shopAlertBanner} role="status">
            <div className={styles.shopAlertMain}>
              <Icon name="cart" size={15} aria-hidden />
              <strong className="num-display" style={{ fontSize: 12.5 }}>
                {[...new Map(misses.map((x) => [norm(x.name), x.name.trim()])).values()].slice(0, 2).join(', ')}
                {misses.length > 2 ? ` 외 ${misses.length - 2}` : ''}
              </strong>
              <span className={styles.shopAlertEyebrow}>· 부족한 재료</span>
            </div>
          </div>
        ) : null}

        <div className={styles.shopBtns}>
          <button
            type="button"
            className={`${styles.shopBtnSecondary} num-display`}
            disabled={shopBusy || misses.length === 0 || !invReady || !invMatchEnabled || !ings.length}
            onClick={() => appendShopping(misses.map((x) => x.name))}
          >
            <Icon name="cart" size={15} aria-hidden />
            부족한 재료만 추가
          </button>
          <button
            type="button"
            className={`${styles.shopBtnPrimary} num-display`}
            disabled={shopBusy || !ings.length}
            onClick={() => appendShopping(ings.map((x) => x.name))}
          >
            <Icon name="cart" size={15} aria-hidden />
            전체 재료 추가
          </button>
        </div>

        {invMatchEnabled && invReady && ownedSorted.length > 0 && showShortageHighlight ? (
          <p className={styles.shopHint}>
            보유 재료({ownedSorted.slice(0, 10).join(', ')}
            {ownedSorted.length > 10 ? ` 외 ${ownedSorted.length - 10}` : ''})는 제외됩니다
          </p>
        ) : invMatchEnabled && invReady && !showShortageHighlight && ownedSorted.length > 0 ? (
          <p className={styles.shopHint}>보유 재료가 충분해 보여요. 그래도 전체 재료를 장보기에 넣을 수 있어요.</p>
        ) : invMatchEnabled && invReady && shortageCount === 0 && ownedSorted.length === 0 && ings.length > 0 ? (
          <p className={styles.shopHint}>보유 재료를 확인했어요. 필요하면 전체 재료를 장보기에 추가할 수 있어요.</p>
        ) : !invMatchEnabled && ings.length > 0 ? (
          <p className={styles.shopHint}>로컬 모드에서는 보유 재료 매칭을 하지 않아요. 전체 재료 추가만 사용할 수 있어요.</p>
        ) : null}

        {shopMsg ? (
          <p className={styles.shopHint} role="status" style={{ color: 'var(--text-secondary)' }}>
            {shopMsg}
          </p>
        ) : null}
      </section>

      <div>
        <p className={styles.stepsTitle} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          레시피 단계 {steps.length}개
        </p>
        {!steps.length ? <div className={styles.emptyNote}>등록된 단계가 없어요.</div> : null}

        <div className={styles.stepsStack}>
          {steps.map((body, idx) => (
            <div key={`${idx}-${body.slice(0, 24)}`} className={styles.stepRow}>
              <span className={styles.stepIdx} style={{ fontSize: 12.5 }}>
                {idx + 1}
              </span>
              <span className={styles.stepBody} style={{ fontSize: 12.5 }}>
                {body}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

type DbRecipeRow = {
  id: string;
  title: string;
  youtube_url: string | null;
  memo: string | null;
  mode: 'light' | 'full' | string;
  kcal?: number | null;
  servings?: number | null;
  created_at: string | null;
};

type DbRecipeIngredientRow = {
  id: string;
  recipe_id: string;
  name: string;
  qty_text: string | null;
  unit: string | null;
  sort_order: number | null;
};

type DbRecipeStepRow = {
  id: string;
  recipe_id: string;
  step_no: number;
  body: string;
};

type RecipeSummary = {
  id: string;
  title: string;
  youtubeUrl: string | null;
  memo: string | null;
  mode: 'light' | 'full';
  kcal?: number | null;
  servings?: number | null;
  createdAt?: string | null;
};

type RecipeFormIngredient = { name: string; qtyText: string; unit: string };
type RecipeFormStep = { body: string };

type RecipeDetail = RecipeSummary & {
  ingredients: RecipeFormIngredient[];
  steps: RecipeFormStep[];
};

function isMissingColumnError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const any = e as { code?: unknown; message?: unknown };
  if (any.code === '42703') return true;
  const msg = typeof any.message === 'string' ? any.message : '';
  return /column .* does not exist/i.test(msg) || /undefined column/i.test(msg);
}

function getErrMessage(e: unknown): string {
  if (!e || typeof e !== 'object') return '알 수 없는 오류가 발생했어요.';
  const any = e as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
  const msg = typeof any.message === 'string' ? any.message : '알 수 없는 오류가 발생했어요.';
  const code = typeof any.code === 'string' ? any.code : '';
  const details = typeof any.details === 'string' ? any.details : '';
  const hint = typeof any.hint === 'string' ? any.hint : '';
  const extra = [code ? `code=${code}` : '', details ? `details=${details}` : '', hint ? `hint=${hint}` : '']
    .filter(Boolean)
    .join(' · ');
  return extra ? `${msg} (${extra})` : msg;
}

function emptyDetail(): RecipeDetail {
  return {
    id: '',
    title: '',
    youtubeUrl: null,
    memo: null,
    mode: 'full',
    kcal: null,
    servings: null,
    createdAt: null,
    ingredients: [{ name: '', qtyText: '', unit: '' }],
    steps: [{ body: '' }],
  };
}

export default function RecipesPage() {
  const [loading, setLoading] = useState(isSupabaseEnabled);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);

  const [isYoutubeOpen, setIsYoutubeOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewErr, setViewErr] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<RecipeDetail | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<RecipeDetail>(() => emptyDetail());
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const fetchRecipes = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    setLoading(true);
    try {
      const tryWithExtras = await supabase
        .from('recipes')
        .select('id,title,youtube_url,memo,mode,kcal,servings,created_at')
        .order('created_at', { ascending: false });

      const baseRes = !tryWithExtras.error
        ? tryWithExtras
        : isMissingColumnError(tryWithExtras.error)
          ? await supabase
              .from('recipes')
              .select('id,title,youtube_url,memo,mode,created_at')
              .order('created_at', { ascending: false })
          : tryWithExtras;

      if (baseRes.error) throw baseRes.error;
      const rows = (baseRes.data ?? []) as DbRecipeRow[];
      setRecipes(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          youtubeUrl: r.youtube_url ?? null,
          memo: r.memo ?? null,
          mode: (r.mode as 'light' | 'full') ?? 'light',
          kcal: typeof r.kcal === 'number' ? r.kcal : null,
          servings: typeof r.servings === 'number' ? r.servings : null,
          createdAt: r.created_at ?? null,
        })),
      );
      setLoadErr(null);
    } catch (e: unknown) {
      setLoadErr(getErrMessage(e));
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }
    Promise.resolve().then(() => fetchRecipes());
  }, []);

  const openCreate = () => {
    setSaveErr(null);
    setForm(emptyDetail());
    setIsCreateOpen(true);
  };

  const openView = async (id: string) => {
    setViewId(id);
    setIsEditMode(false);
    setViewErr(null);
    setViewDetail(null);
    setViewLoading(true);
    try {
      if (!isSupabaseEnabled || !supabase) {
        throw new Error('Supabase 연결이 꺼져 있어요.');
      }

      const recipeRes = await supabase
        .from('recipes')
        .select('id,title,youtube_url,memo,mode,kcal,servings,created_at')
        .eq('id', id)
        .maybeSingle();

      const recipeBase = !recipeRes.error
        ? recipeRes
        : isMissingColumnError(recipeRes.error)
          ? await supabase.from('recipes').select('id,title,youtube_url,memo,mode,created_at').eq('id', id).maybeSingle()
          : recipeRes;

      if (recipeBase.error) throw recipeBase.error;
      if (!recipeBase.data) throw new Error('레시피를 찾을 수 없어요.');
      const r = recipeBase.data as DbRecipeRow;

      const [ingRes, stepsRes] = await Promise.all([
        supabase
          .from('recipe_ingredients')
          .select('id,recipe_id,name,qty_text,unit,sort_order')
          .eq('recipe_id', id)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('recipe_steps')
          .select('id,recipe_id,step_no,body')
          .eq('recipe_id', id)
          .order('step_no', { ascending: true }),
      ]);
      if (ingRes.error) throw ingRes.error;
      if (stepsRes.error) throw stepsRes.error;

      const ingRows = (ingRes.data ?? []) as DbRecipeIngredientRow[];
      const stepRows = (stepsRes.data ?? []) as DbRecipeStepRow[];

      setViewDetail({
        id: r.id,
        title: r.title,
        youtubeUrl: r.youtube_url ?? null,
        memo: r.memo ?? null,
        mode: (r.mode as 'light' | 'full') ?? 'light',
        kcal: typeof r.kcal === 'number' ? r.kcal : null,
        servings: typeof r.servings === 'number' ? r.servings : null,
        createdAt: r.created_at ?? null,
        ingredients: ingRows.length
          ? ingRows.map((x) => ({ name: x.name, qtyText: x.qty_text ?? '', unit: x.unit ?? '' }))
          : [{ name: '', qtyText: '', unit: '' }],
        steps: stepRows.length ? stepRows.map((x) => ({ body: x.body })) : [{ body: '' }],
      });
    } catch (e: unknown) {
      setViewErr(getErrMessage(e));
    } finally {
      setViewLoading(false);
    }
  };

  const toInsertRecipePayload = (d: RecipeDetail) => {
    const base: Record<string, unknown> = {
      title: d.title.trim(),
      youtube_url: d.youtubeUrl?.trim() || null,
      memo: d.memo?.trim() || null,
      mode: d.mode,
      updated_at: new Date().toISOString(),
    };
    if (typeof d.kcal === 'number') base.kcal = d.kcal;
    if (typeof d.servings === 'number') base.servings = d.servings;
    return base;
  };

  const saveNewRecipe = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    if (!form.title.trim()) {
      setSaveErr('제목을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      const tryWithExtras = await supabase
        .from('recipes')
        .insert(toInsertRecipePayload(form))
        .select('id,title,youtube_url,memo,mode,kcal,servings,created_at')
        .single();

      const recipeRes = !tryWithExtras.error
        ? tryWithExtras
        : isMissingColumnError(tryWithExtras.error)
          ? await supabase
              .from('recipes')
              .insert({
                title: form.title.trim(),
                youtube_url: form.youtubeUrl?.trim() || null,
                memo: form.memo?.trim() || null,
                mode: form.mode,
                updated_at: new Date().toISOString(),
              })
              .select('id,title,youtube_url,memo,mode,created_at')
              .single()
          : tryWithExtras;

      if (recipeRes.error) throw recipeRes.error;
      const recipeId = (recipeRes.data as { id: string }).id;

      const ings = form.ingredients
        .map((x, idx) => ({
          recipe_id: recipeId,
          name: x.name.trim(),
          qty_text: x.qtyText.trim() || null,
          unit: x.unit.trim() || null,
          sort_order: idx,
        }))
        .filter((x) => x.name);
      const steps = form.steps
        .map((x, idx) => ({
          recipe_id: recipeId,
          step_no: idx + 1,
          body: x.body.trim(),
        }))
        .filter((x) => x.body);

      if (ings.length > 0) {
        const ins = await supabase.from('recipe_ingredients').insert(ings);
        if (ins.error) throw ins.error;
      }
      if (steps.length > 0) {
        const ins = await supabase.from('recipe_steps').insert(steps);
        if (ins.error) throw ins.error;
      }

      setIsCreateOpen(false);
      await fetchRecipes();
    } catch (e: unknown) {
      // 부분 실패 시 레시피 본문만 남는 걸 피하기 위해 가능하면 정리
      setSaveErr(getErrMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveEditRecipe = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    if (!form.id) return;
    if (!form.title.trim()) {
      setSaveErr('제목을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      const tryWithExtras = await supabase.from('recipes').update(toInsertRecipePayload(form)).eq('id', form.id);
      if (tryWithExtras.error && !isMissingColumnError(tryWithExtras.error)) throw tryWithExtras.error;
      if (tryWithExtras.error && isMissingColumnError(tryWithExtras.error)) {
        const fallback = await supabase
          .from('recipes')
          .update({
            title: form.title.trim(),
            youtube_url: form.youtubeUrl?.trim() || null,
            memo: form.memo?.trim() || null,
            mode: form.mode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', form.id);
        if (fallback.error) throw fallback.error;
      }

      // replace ingredients + steps
      const [delIng, delSteps] = await Promise.all([
        supabase.from('recipe_ingredients').delete().eq('recipe_id', form.id),
        supabase.from('recipe_steps').delete().eq('recipe_id', form.id),
      ]);
      if (delIng.error) throw delIng.error;
      if (delSteps.error) throw delSteps.error;

      const ings = form.ingredients
        .map((x, idx) => ({
          recipe_id: form.id,
          name: x.name.trim(),
          qty_text: x.qtyText.trim() || null,
          unit: x.unit.trim() || null,
          sort_order: idx,
        }))
        .filter((x) => x.name);
      const steps = form.steps
        .map((x, idx) => ({
          recipe_id: form.id,
          step_no: idx + 1,
          body: x.body.trim(),
        }))
        .filter((x) => x.body);

      if (ings.length > 0) {
        const ins = await supabase.from('recipe_ingredients').insert(ings);
        if (ins.error) throw ins.error;
      }
      if (steps.length > 0) {
        const ins = await supabase.from('recipe_steps').insert(steps);
        if (ins.error) throw ins.error;
      }

      setIsEditMode(false);
      setViewDetail(null);
      setViewId(null);
      await fetchRecipes();
    } catch (e: unknown) {
      setSaveErr(getErrMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const openEditFromView = () => {
    if (!viewDetail) return;
    setSaveErr(null);
    setForm({ ...viewDetail });
    setIsEditMode(true);
  };

  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>내 레시피</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              저장한 레시피 24개. YouTube 링크나 직접 입력으로 추가할 수 있어요.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={() => setIsYoutubeOpen(true)}><Icon name="youtube" size={13} /> YouTube 추가</button>
            <button className="btn" onClick={openCreate}><Icon name="plus" size={13} /> 레시피 추가</button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span className="pill active">전체 {recipes.length}</span>
          <div style={{ flex: 1 }} />
          <button className="pill"><Icon name="sort" size={12} /> 최근 추가 순</button>
        </div>

        {/* Recipe list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supabase에서 레시피를 불러오는 중…</div>
            </div>
          ) : loadErr ? (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>레시피를 불러오지 못했어요.</div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>{loadErr}</div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>아직 저장된 레시피가 없어요. “레시피 추가”를 눌러 시작해 보세요.</div>
            </div>
          ) : null}

          {recipes.map(r => {
            return (
              <div
                key={r.id}
                className="card"
                onClick={() => openView(r.id)}
                style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
              >
                <div className="placeholder-img" style={{ width: 84, height: 64, borderRadius: 8, flexShrink: 0 }}>thumb</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{r.title}</span>
                    {r.youtubeUrl ? <Icon name="youtube" size={13} style={{ color: '#c44' }} /> : null}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
                    <span>{r.kcal ? `${r.kcal} kcal` : '칼로리 미입력'}{r.servings ? ` · ${r.servings}인분` : ''}</span>
                  </div>
                </div>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); openView(r.id); }}>보기</button>
              </div>
            );
          })}
        </div>

        {/* YouTube CTA moved to header */}
      </div>

      {/* YouTube modal (UI only for now) */}
      {isYoutubeOpen ? (
        <Modal title="YouTube 링크로 레시피 추가" onClose={() => setIsYoutubeOpen(false)}>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 14 }}>
            아직 “분석” 기능은 UI만 있어요. (나중에 실제 추출 로직을 붙일게요)
          </div>
          <div className="card" style={{ padding: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="link" size={15} style={{ marginLeft: 10, color: 'var(--text-tertiary)' }} />
            <input
              placeholder="YouTube 링크를 붙여넣으세요"
              style={{ flex: 1, height: 38, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
            />
            <button className="btn sm" style={{ marginRight: 4 }}>분석</button>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              분석 결과 미리보기 영역(추후 구현).
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Create / Edit modal */}
      {isCreateOpen ? (
        <Modal title="레시피 추가" onClose={() => setIsCreateOpen(false)}>
          <RecipeForm
            form={form}
            setForm={setForm}
            saving={saving}
            error={saveErr}
            onCancel={() => setIsCreateOpen(false)}
            onSave={saveNewRecipe}
          />
        </Modal>
      ) : null}

      {/* View / Edit modal */}
      {viewId ? (
        <Modal title={isEditMode ? '레시피 수정' : '레시피 상세'} onClose={() => { setViewId(null); setViewDetail(null); setIsEditMode(false); }}>
          {viewLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>불러오는 중…</div>
          ) : viewErr ? (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>에러: {viewErr}</div>
            </div>
          ) : viewDetail ? (
            isEditMode ? (
              <RecipeForm
                form={form}
                setForm={setForm}
                saving={saving}
                error={saveErr}
                onCancel={() => setIsEditMode(false)}
                onSave={saveEditRecipe}
              />
            ) : (
              <RecipeView detail={viewDetail} onEdit={openEditFromView} />
            )
          ) : null}
        </Modal>
      ) : null}
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</div>
      {children}
    </div>
  );
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

function RecipeForm({
  form,
  setForm,
  saving,
  error,
  onCancel,
  onSave,
}: {
  form: RecipeDetail;
  setForm: React.Dispatch<React.SetStateAction<RecipeDetail>>;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const ingScroll = form.ingredients.length >= 5;
  const stepScroll = form.steps.length >= 5;

  const [isInvOpen, setIsInvOpen] = useState(false);
  const [invLoading, setInvLoading] = useState(false);
  const [invErr, setInvErr] = useState<string | null>(null);
  const [invItems, setInvItems] = useState<
    { id: string; name: string; loc: 'fridge' | 'freezer' | 'pantry'; qty: string; category: string }[]
  >([]);
  const [invQ, setInvQ] = useState('');
  const [invSelected, setInvSelected] = useState<Set<string>>(new Set());

  const openInventory = async () => {
    setIsInvOpen(true);
    setInvErr(null);
    setInvQ('');
    setInvSelected(new Set());

    if (!isSupabaseEnabled || !supabase) {
      setInvErr('Supabase 연결이 꺼져 있어요.');
      return;
    }

    setInvLoading(true);
    try {
      const res = await supabase
        .from('v_ingredients')
        .select('id,name,loc,qty,category,created_at')
        .order('created_at', { ascending: false })
        .limit(400);
      if (res.error) throw res.error;
      const rows = (res.data ?? []) as { id: string; name: string; loc: 'fridge' | 'freezer' | 'pantry'; qty: string | null; category: string | null }[];
      setInvItems(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          loc: r.loc,
          qty: r.qty ?? '',
          category: r.category ?? '기타',
        })),
      );
    } catch (e: unknown) {
      setInvErr(getErrMessage(e));
      setInvItems([]);
    } finally {
      setInvLoading(false);
    }
  };

  const applyInventory = () => {
    const sel = invItems.filter((x) => invSelected.has(x.id));
    if (sel.length === 0) {
      setIsInvOpen(false);
      return;
    }

    setForm((p) => {
      const existing = new Set(p.ingredients.map((x) => x.name.trim()).filter(Boolean));
      const toAdd = sel
        .map((s) => ({
          name: s.name,
          qtyText: s.qty,
          unit: '',
        }))
        .filter((x) => x.name.trim() && !existing.has(x.name.trim()));

      const base = p.ingredients.length === 1 && !p.ingredients[0].name.trim() && !p.ingredients[0].qtyText.trim() && !p.ingredients[0].unit.trim()
        ? []
        : p.ingredients;

      return {
        ...p,
        ingredients: [...base, ...toAdd, ...(toAdd.length === 0 ? [] : [])],
      };
    });

    setIsInvOpen(false);
  };

  const invFiltered = useMemo(() => {
    const t = invQ.trim().toLowerCase();
    if (!t) return invItems;
    return invItems.filter((x) => x.name.toLowerCase().includes(t) || x.category.toLowerCase().includes(t));
  }, [invItems, invQ]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 10 }}>
        <Field label="제목">
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} style={inputStyle()} />
        </Field>
        <Field label="예상 칼로리(kcal)">
          <input
            value={form.kcal ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim();
              setForm((p) => ({ ...p, kcal: v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : p.kcal ?? null }));
            }}
            placeholder="예) 420"
            style={inputStyle()}
          />
        </Field>
        <Field label="인분">
          <input
            value={form.servings ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim();
              setForm((p) => ({ ...p, servings: v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : p.servings ?? null }));
            }}
            placeholder="예) 1"
            style={inputStyle()}
          />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <Field label="YouTube 링크(옵션)">
          <input
            value={form.youtubeUrl ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, youtubeUrl: e.target.value }))}
            placeholder="https://youtube.com/..."
            style={inputStyle()}
          />
        </Field>
        <Field label="메모(옵션)">
          <input
            value={form.memo ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
            placeholder="예) 매운맛, 아이용으로 고춧가루 빼기"
            style={inputStyle()}
          />
        </Field>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="h-section">재료</span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="pill"
            onClick={openInventory}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="fridge" size={12} /> 나의 재료
          </button>
          <button
            type="button"
            className="pill"
            onClick={() => setForm((p) => ({ ...p, ingredients: [...p.ingredients, { name: '', qtyText: '', unit: '' }] }))}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="plus" size={12} /> 재료 추가
          </button>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div
            style={{
              maxHeight: ingScroll ? 38 * 5 + 8 * 4 : undefined,
              overflowY: ingScroll ? 'auto' : undefined,
              paddingRight: ingScroll ? 6 : undefined,
            }}
          >
            {form.ingredients.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 28px', gap: 8, marginTop: idx === 0 ? 0 : 8 }}>
                <input
                  value={it.name}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ingredients: p.ingredients.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                    }))
                  }
                  placeholder="재료명"
                  style={inputStyle()}
                />
                <input
                  value={it.qtyText}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ingredients: p.ingredients.map((x, i) => (i === idx ? { ...x, qtyText: e.target.value } : x)),
                    }))
                  }
                  placeholder="수량(텍스트)"
                  style={inputStyle()}
                />
                <input
                  value={it.unit}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ingredients: p.ingredients.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)),
                    }))
                  }
                  placeholder="단위"
                  style={inputStyle()}
                />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, ingredients: p.ingredients.filter((_, i) => i !== idx) }))}
                  style={{ width: 28, height: 38, border: 'none', background: 'transparent', color: 'var(--text-tertiary)' }}
                  title="삭제"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="h-section">레시피 단계</span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="pill"
            onClick={() => setForm((p) => ({ ...p, steps: [...p.steps, { body: '' }] }))}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="plus" size={12} /> 단계 추가
          </button>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div
            style={{
              maxHeight: stepScroll ? 380 : undefined,
              overflowY: stepScroll ? 'auto' : undefined,
              paddingRight: stepScroll ? 6 : undefined,
            }}
          >
            {form.steps.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginTop: idx === 0 ? 0 : 8, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--surface-2)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                  {idx + 1}
                </div>
                <textarea
                  value={st.body}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      steps: p.steps.map((x, i) => (i === idx ? { ...x, body: e.target.value } : x)),
                    }))
                  }
                  placeholder="단계 내용을 입력하세요"
                  style={{
                    flex: 1,
                    border: '0.5px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    outline: 'none',
                    background: 'var(--surface)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    minHeight: 44,
                    resize: 'vertical',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }))}
                  style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', marginTop: 6 }}
                  title="삭제"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>저장 실패: {error}</div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="btn ghost" type="button" onClick={onCancel}>
          취소
        </button>
        <button className="btn" type="button" onClick={onSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
          <Icon name="check" size={13} /> {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      {isInvOpen ? (
        <Modal title="나의 재료에서 가져오기" maxWidth={720} onClose={() => setIsInvOpen(false)}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
            냉장/냉동/상온에 저장된 재료를 선택해서 레시피 재료로 추가할 수 있어요. (같은 이름은 중복 추가하지 않아요)
          </div>

          <div className="card" style={{ padding: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="search" size={15} style={{ marginLeft: 10, color: 'var(--text-tertiary)' }} />
            <input
              placeholder="재료명/카테고리 검색…"
              value={invQ}
              onChange={(e) => setInvQ(e.target.value)}
              style={{ flex: 1, height: 38, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
            />
          </div>

          {invErr ? (
            <div className="card" style={{ padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>불러오기 실패: {invErr}</div>
            </div>
          ) : null}

          <div className="card" style={{ padding: '6px 0', maxHeight: 420, overflow: 'auto' }}>
            {invLoading ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>불러오는 중…</div>
            ) : invFiltered.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>표시할 재료가 없어요.</div>
            ) : (
              invFiltered.map((it, idx) => {
                const on = invSelected.has(it.id);
                return (
                  <div
                    key={it.id}
                    onClick={() => {
                      setInvSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(it.id)) next.delete(it.id);
                        else next.add(it.id);
                        return next;
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)',
                      cursor: 'pointer',
                      background: on ? 'rgba(44,44,42,0.04)' : 'transparent',
                    }}
                  >
                    <span className={`chk ${on ? 'on' : ''}`} style={{ flexShrink: 0 }}>
                      {on ? <Icon name="check" size={11} /> : null}
                    </span>
                    <span className={`dot ${it.loc}`} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.name}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.category}{it.qty ? ` · ${it.qty}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn ghost" type="button" onClick={() => setIsInvOpen(false)}>
              취소
            </button>
            <button className="btn" type="button" onClick={applyInventory} disabled={invSelected.size === 0}>
              <Icon name="plus" size={13} /> 선택 재료 추가 ({invSelected.size})
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function RecipeView({
  detail,
  onEdit,
}: {
  detail: RecipeDetail;
  onEdit: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{detail.title}</div>
        {detail.youtubeUrl ? <Icon name="youtube" size={15} style={{ color: '#c44' }} /> : null}
        <div style={{ flex: 1 }} />
        <button className="btn ghost sm" type="button" onClick={onEdit}>
          <Icon name="edit" size={12} /> 수정
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        {detail.kcal ? `${detail.kcal} kcal` : '칼로리 미입력'}{detail.servings ? ` · ${detail.servings}인분` : ''}
      </div>
      {detail.memo ? (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail.memo}</div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="h-section" style={{ marginBottom: 8 }}>재료 {detail.ingredients.filter((x) => x.name.trim()).length}개</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
          {detail.ingredients
            .filter((x) => x.name.trim())
            .map((x, idx) => (
              <div key={`${x.name}-${idx}`} style={{ padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: '#fbfaf7', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 12.5, flex: 1 }}>{x.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {[x.qtyText, x.unit].filter(Boolean).join(' ')}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="h-section" style={{ marginBottom: 8 }}>레시피 단계 {detail.steps.filter((x) => x.body.trim()).length}개</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {detail.steps
            .filter((x) => x.body.trim())
            .map((x, idx) => (
              <div key={idx} style={{ padding: '10px 0', borderTop: idx === 0 ? 'none' : '0.5px solid var(--border)', display: 'flex', gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--surface-2)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{x.body}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

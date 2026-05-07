'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import { isSupabaseEnabled, supabase } from '@/lib/supabase/client';

type IngredientSummary = {
  fridge: number;
  freezer: number;
  pantry: number;
  soon7: number;
};

function daysUntil(expiresAt: string | null): number {
  if (!expiresAt) return 999;
  const end = new Date(`${expiresAt}T00:00:00`);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const NAV_ITEMS = [
  { id: 'dash', label: '대시보드', href: '/', dropdown: null },
  {
    id: 'ing', label: '재료', href: '/ingredients',
    dropdown: [
      { label: '전체 재료', sub: '냉장 18 · 냉동 7 · 상온 12', href: '/ingredients' },
      { label: '유통기한 임박', sub: 'D-7 이내 6개', href: '/ingredients' },
    ],
  },
  {
    id: 'rec', label: '레시피', href: '/recipes',
    dropdown: [
      { label: '내 레시피', sub: '저장한 레시피 24개', href: '/recipes' },
      { label: '추천 레시피', sub: '내 재료 기반 12개', href: '/recommend' },
      { label: '식사 달력', sub: '오늘 480 kcal', href: '/calendar' },
      { label: '레시피 추가', sub: 'YouTube 링크 / 직접 입력', href: '/recipes' },
    ],
  },
  { id: 'shop', label: '장보기', href: '/shopping', dropdown: null },
];

function getActivePage(pathname: string) {
  if (pathname === '/') return 'dash';
  if (pathname.startsWith('/ingredients')) return 'ing';
  if (pathname.startsWith('/recipes') || pathname.startsWith('/recommend') || pathname.startsWith('/calendar')) return 'rec';
  if (pathname.startsWith('/shopping')) return 'shop';
  return 'dash';
}

const navBtnBase: React.CSSProperties = {
  height: 32, padding: '0 12px',
  border: 'none', borderRadius: 8,
  fontSize: 12.5, color: 'var(--text-primary)',
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
  textDecoration: 'none',
};

// ── Desktop Navbar ──────────────────────────────────────────
function DesktopNavbar({ active, open, onHover, items }: {
  active: string;
  open: string | null;
  onHover: (id: string | null) => void;
  items: typeof NAV_ITEMS;
}) {
  return (
    <header className="desktop-navbar" style={{
      position: 'sticky', top: 0, zIndex: 30,
      height: 56,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      borderBottom: '0.5px solid var(--border)',
      alignItems: 'center',
      padding: '0 24px',
    }}>
      {/* Logo */}
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, marginRight: 36, textDecoration: 'none',
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'var(--btn-bg)', color: 'var(--btn-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name="fridge" size={13} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>나의 냉장고</span>
      </Link>

      {/* Menu */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {items.map(item => {
          const isActive = active === item.id;
          const isOpen = open === item.id;
          return (
            <div key={item.id}
              onMouseEnter={() => onHover(item.id)}
              onMouseLeave={() => onHover(null)}
              style={{ position: 'relative' }}>
              {/* Link styled as button — no <a><button> nesting */}
              <Link href={item.href} style={{
                ...navBtnBase,
                background: isActive ? '#ece9e2' : 'transparent',
                fontWeight: isActive ? 500 : 400,
              }}>
                {item.label}
                {item.dropdown && <Icon name="chev-d" size={12} style={{ opacity: 0.5 }} />}
              </Link>

              {item.dropdown && isOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                  background: 'var(--surface)',
                  border: '0.5px solid var(--border-strong)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: 240,
                  padding: 6,
                  zIndex: 20,
                }}>
                  {item.dropdown.map((d, i) => (
                    <Link key={i} href={d.href} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{
                        padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                        background: i === 0 ? '#f7f6f3' : 'transparent',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                        <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{d.label}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{d.sub}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px',
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 8, width: 220,
          color: 'var(--text-tertiary)',
        }}>
          <Icon name="search" size={13} />
          <input placeholder="재료, 레시피 검색…" style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 12, flex: 1, color: 'var(--text-primary)',
          }} />
          <span style={{
            fontSize: 10, fontFamily: 'monospace', color: 'var(--text-tertiary)',
            border: '0.5px solid var(--border-strong)', borderRadius: 4, padding: '1px 5px',
          }}>⌘K</span>
        </div>
        {/* Link styled as .btn — no <a><button> */}
        <Link href="/ingredients" className="btn" style={{ textDecoration: 'none' }}>
          <Icon name="plus" size={13} /> 재료 추가
        </Link>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: '#d4cfc1', color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
          border: '0.5px solid var(--border-strong)',
        }}>지</div>
      </div>
    </header>
  );
}

// ── Mobile Top Bar ──────────────────────────────────────────
function MobileTopbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="mobile-topbar" style={{
      height: 52, padding: '0 14px',
      alignItems: 'center', gap: 8,
      borderBottom: '0.5px solid var(--border)',
      background: 'var(--bg)',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'var(--btn-bg)', color: 'var(--btn-fg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="fridge" size={13} />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>나의 냉장고</span>
      </Link>
      <div style={{ flex: 1 }} />
      <button style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: 'transparent', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="search" size={16} />
      </button>
      {/* Link styled as icon-button — no <a><button> */}
      <Link href="/ingredients" style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--btn-bg)', color: 'var(--btn-fg)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="plus" size={14} />
      </Link>
      <button onClick={onMenu} style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: 'transparent', color: 'var(--text-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="menu" size={16} />
      </button>
    </header>
  );
}

// ── Mobile Bottom Tab Bar ───────────────────────────────────
function MobileTabbar({ active }: { active: string }) {
  const tabs = [
    { id: 'dash', label: '홈',    icon: 'home'    as const, href: '/' },
    { id: 'ing',  label: '재료',  icon: 'leaf'    as const, href: '/ingredients' },
    { id: 'rec',  label: '추천',  icon: 'sparkle' as const, href: '/recommend' },
    { id: 'shop', label: '장보기', icon: 'cart'   as const, href: '/shopping' },
    { id: 'book', label: '레시피', icon: 'book'   as const, href: '/recipes' },
  ];
  return (
    <nav className="mobile-tabbar" style={{
      height: 64, padding: '0 4px 12px 4px',
      borderTop: '0.5px solid var(--border)',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      position: 'sticky', bottom: 0, zIndex: 5,
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <Link key={t.id} href={t.href} style={{
            flex: 1,
            display: 'inline-flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
            textDecoration: 'none',
          }}>
            <Icon name={t.icon} size={18} />
            <span style={{ fontSize: 9.5, letterSpacing: '-0.005em', fontWeight: on ? 500 : 400 }}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Mobile Sidebar ──────────────────────────────────────────
function MobileSidebar({
  open,
  onClose,
  ingSummary,
  recipeCount,
}: {
  open: boolean;
  onClose: () => void;
  ingSummary: IngredientSummary | null;
  recipeCount: number | null;
}) {
  const items = [
    { icon: 'home'    as const, label: '대시보드',    href: '/',            sub: '' },
    { icon: 'leaf'    as const, label: '전체 재료',   href: '/ingredients', sub: ingSummary ? `${ingSummary.fridge + ingSummary.freezer + ingSummary.pantry}개` : '—' },
    { icon: 'sparkle' as const, label: '추천 레시피', href: '/recommend',   sub: '12개' },
    { icon: 'book'    as const, label: '내 레시피',   href: '/recipes',     sub: recipeCount === null ? '—' : `${recipeCount}개` },
    { icon: 'cart'    as const, label: '장보기',      href: '/shopping',    sub: '5' },
    { icon: 'cal'     as const, label: '식사 달력',   href: '/calendar',    sub: '' },
  ];
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity .25s',
        zIndex: 40,
      }} />
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: 268,
        background: 'var(--surface-dark)',
        color: 'var(--text-on-dark)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .28s cubic-bezier(.2,.7,.3,1)',
        zIndex: 41,
        display: 'flex', flexDirection: 'column',
        padding: '18px 14px',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 18px 6px' }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(211,209,199,0.14)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="fridge" size={14} />
          </span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>나의 냉장고</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-on-dark-dim)' }}>지윤님 · 1인 가구</div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6,
          padding: 8, background: 'rgba(255,255,255,0.04)',
          borderRadius: 10, marginBottom: 16,
        }}>
          {[{ v: 18, l: '냉장', cls: 'fridge' }, { v: 7, l: '냉동', cls: 'freezer' }, { v: 12, l: '상온', cls: 'pantry' }].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span className={`dot ${s.cls}`} style={{ width: 5, height: 5 }} />
                <span style={{ fontSize: 9.5, color: 'var(--text-on-dark-dim)' }}>{s.l}</span>
              </div>
              <div className="num-display" style={{ fontSize: 18, fontWeight: 500, marginTop: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map(it => (
            <Link key={it.href + it.label} href={it.href} onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              color: 'rgba(211,209,199,0.78)', fontSize: 12.5,
              textDecoration: 'none',
            }}>
              <Icon name={it.icon} size={15} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.sub && <span style={{ fontSize: 10.5, color: 'var(--text-on-dark-dim)' }}>{it.sub}</span>}
            </Link>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 6px' }} />
        <div style={{ flex: 1 }} />

        <div style={{
          padding: 10, background: 'rgba(255,255,255,0.04)',
          borderRadius: 10, fontSize: 11.5,
          color: 'rgba(211,209,199,0.78)', lineHeight: 1.45,
        }}>
          <div style={{ fontSize: 10.5, color: 'rgba(211,209,199,0.55)', marginBottom: 3 }}>오늘의 한 줄</div>
          유통기한 임박 재료 <span style={{ color: 'var(--text-on-dark)' }}>3개</span> · 두부 김치찌개 어때요?
        </div>
      </aside>
    </>
  );
}

// ── AppShell ────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navHover, setNavHover] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = getActivePage(pathname);

  const [ingSummary, setIngSummary] = useState<IngredientSummary | null>(null);
  const [recipeCount, setRecipeCount] = useState<number | null>(null);

  const fetchSummary = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    const { data, error } = await supabase
      .from('v_ingredients')
      .select('loc,expires_at');
    if (error) return;

    const sum: IngredientSummary = { fridge: 0, freezer: 0, pantry: 0, soon7: 0 };
    for (const r of (data ?? []) as { loc: 'fridge' | 'freezer' | 'pantry'; expires_at: string | null }[]) {
      sum[r.loc] += 1;
      if (daysUntil(r.expires_at) <= 7) sum.soon7 += 1;
    }
    setIngSummary(sum);
  };

  const fetchRecipeCount = async () => {
    if (!isSupabaseEnabled || !supabase) return;
    try {
      const res = await supabase.from('recipes').select('id', { count: 'exact', head: true });
      if (!res.error && typeof res.count === 'number') {
        setRecipeCount(res.count);
        return;
      }

      const fallback = await supabase.from('recipes').select('id').limit(5000);
      if (!fallback.error) setRecipeCount((fallback.data ?? []).length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // eslint(react-hooks/set-state-in-effect): run async to avoid sync cascades
    Promise.resolve().then(() => fetchSummary());
    Promise.resolve().then(() => fetchRecipeCount());
    const onChanged = () => fetchSummary();
    window.addEventListener('ingredients:changed', onChanged);
    return () => window.removeEventListener('ingredients:changed', onChanged);
  }, []);

  const navItems = useMemo(() => {
    return NAV_ITEMS.map((it) => {
      if (!it.dropdown) return it;

      if (it.id === 'ing' && ingSummary) {
        const totalSub = `냉장 ${ingSummary.fridge} · 냉동 ${ingSummary.freezer} · 상온 ${ingSummary.pantry}`;
        const soonSub = `D-7 이내 ${ingSummary.soon7}개`;
        return {
          ...it,
          dropdown: [
            { ...it.dropdown[0], sub: totalSub },
            { ...it.dropdown[1], sub: soonSub },
          ],
        };
      }

      if (it.id === 'rec' && typeof recipeCount === 'number') {
        return {
          ...it,
          dropdown: it.dropdown.map((d) => (d.href === '/recipes' && d.label === '내 레시피' ? { ...d, sub: `저장한 레시피 ${recipeCount}개` } : d)),
        };
      }

      return it;
    });
  }, [ingSummary, recipeCount]);

  return (
    <div className="app-root">
      <DesktopNavbar active={active} open={navHover} onHover={setNavHover} items={navItems} />
      <MobileTopbar onMenu={() => setSidebarOpen(true)} />
      <main className="page-content">{children}</main>
      <MobileTabbar active={active} />
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} ingSummary={ingSummary} recipeCount={recipeCount} />
    </div>
  );
}

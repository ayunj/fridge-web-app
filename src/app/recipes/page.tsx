import AppShell from '@/components/AppShell';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { RECIPES } from '@/lib/data';

export default function RecipesPage() {
  const myRecipes = RECIPES.slice(0, 8);

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
            <button className="btn ghost"><Icon name="link" size={13} /> 링크로 추가</button>
            <button className="btn"><Icon name="plus" size={13} /> 레시피 추가</button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span className="pill active">전체 24</span>
          <span className="pill">YouTube 12</span>
          <span className="pill">직접 작성 12</span>
          <span className="pill">즐겨찾기 5</span>
          <div style={{ flex: 1 }} />
          <button className="pill"><Icon name="sort" size={12} /> 최근 추가 순</button>
        </div>

        {/* Recipe list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myRecipes.map(r => {
            const status = r.missing === 0
              ? { text: '바로 가능', cls: 'ok' }
              : r.missing === 1 ? { text: '1개 부족', cls: 'warn' } : { text: `${r.missing}개 부족`, cls: 'light' };
            return (
              <div key={r.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div className="placeholder-img" style={{ width: 84, height: 64, borderRadius: 8, flexShrink: 0 }}>thumb</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{r.title}</span>
                    {r.yt && <Icon name="youtube" size={13} style={{ color: '#c44' }} />}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
                    <span>재료 {r.have.length}개{r.missing > 0 ? ` · 부족 ${r.missing}` : ''}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={11} />{r.time}분</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="flame" size={11} />{r.kcal} kcal</span>
                  </div>
                </div>
                <span className={`badge ${status.cls}`}>{status.text}</span>
                <button className="btn ghost sm">요리하기</button>
              </div>
            );
          })}
        </div>

        {/* YouTube parse section */}
        <div style={{ marginTop: 40, maxWidth: 720 }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>YouTube 링크에서 레시피 가져오기</h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 18 }}>
            영상 설명과 자막을 분석해 제목 · 썸네일 · 재료를 자동으로 추출해요.
          </div>

          <div className="card" style={{ padding: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="link" size={15} style={{ marginLeft: 10, color: 'var(--text-tertiary)' }} />
            <input
              placeholder="YouTube 링크를 붙여넣으세요"
              style={{ flex: 1, height: 38, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
            />
            <button className="btn sm" style={{ marginRight: 4 }}>분석</button>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="placeholder-img" style={{ height: 200, position: 'relative' }}>
              youtube thumbnail · 16:9
              <div style={{
                position: 'absolute', bottom: 10, left: 10,
                background: 'rgba(60,46,34,0.9)', color: 'var(--btn-fg)',
                borderRadius: 999, padding: '4px 10px',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
              }}>
                <Icon name="youtube" size={13} /> 8:42 · 백종원
              </div>
            </div>
            <div style={{ padding: 18 }}>
              <div className="h-section" style={{ marginBottom: 6 }}>추출된 제목</div>
              <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 14 }}>
                백종원의 두부 김치찌개 (1인분 황금레시피)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div className="h-section" style={{ marginBottom: 6 }}>예상 칼로리</div>
                  <div style={{ fontSize: 16, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="num-display" style={{ fontWeight: 500 }}>420</span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>kcal · 1인분</span>
                  </div>
                </div>
                <div>
                  <div className="h-section" style={{ marginBottom: 6 }}>조리 시간</div>
                  <div style={{ fontSize: 16, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="num-display" style={{ fontWeight: 500 }}>25</span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>분</span>
                  </div>
                </div>
              </div>

              <div className="h-section" style={{ marginBottom: 8 }}>
                추출된 재료 8개 <span style={{ color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0 }}>· 클릭해서 수정</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: 18 }}>
                {[
                  { n: '두부', q: '1모', have: true },
                  { n: '김치', q: '1/4포기', have: true },
                  { n: '대파', q: '1/2대', have: true },
                  { n: '마늘', q: '2큰술', have: true },
                  { n: '고추장', q: '1큰술', have: true },
                  { n: '고춧가루', q: '1큰술', have: false },
                  { n: '멸치육수', q: '2컵', have: false },
                  { n: '참기름', q: '약간', have: true },
                ].map(it => (
                  <div key={it.n} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', background: '#fbfaf7',
                    borderRadius: 8, border: '0.5px solid var(--border)',
                  }}>
                    <span className="chk on"><Icon name="check" size={11} /></span>
                    <span style={{ fontSize: 12.5, flex: 1 }}>{it.n}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{it.q}</span>
                    <span className={`badge ${it.have ? 'ok' : 'warn'}`} style={{ fontSize: 9.5 }}>{it.have ? '보유' : '없음'}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn ghost">취소</button>
                <button className="btn ghost"><Icon name="edit" size={12} /> 수정 후 저장</button>
                <button className="btn"><Icon name="check" size={13} /> 레시피로 저장</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

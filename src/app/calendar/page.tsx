import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';

const mealsByDay: Record<number, { name: string; kcal: number }[]> = {
  27: [{ name: '두부 김치찌개', kcal: 420 }, { name: '계란말이', kcal: 280 }],
  28: [{ name: '닭가슴살 샐러드', kcal: 320 }],
  30: [{ name: '된장찌개', kcal: 310 }],
  1:  [{ name: '제육볶음', kcal: 540 }, { name: '시금치 무침', kcal: 110 }],
  2:  [{ name: '새우 볶음밥', kcal: 580 }],
  3:  [{ name: '감자조림', kcal: 230 }, { name: '계란말이', kcal: 280 }],
  5:  [{ name: '마파두부', kcal: 480 }],
  6:  [{ name: '두부 김치찌개', kcal: 420 }],
};

const days: { day: number; dim: boolean }[] = [];
for (let i = 27; i <= 30; i++) days.push({ day: i, dim: true });
for (let i = 1; i <= 31; i++) days.push({ day: i, dim: false });

const totalKcal = [27, 28, 30, 1, 2, 3, 5, 6].reduce((s, d) => s + (mealsByDay[d]?.reduce((a, b) => a + b.kcal, 0) ?? 0), 0);
const cookedDays = 7;

export default function CalendarPage() {
  return (
    <AppShell>
      <div style={{ padding: 24, paddingTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>식사 달력</h1>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              요리 완료한 레시피와 칼로리를 자동으로 기록해요.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pill"><Icon name="chev-l" size={11} /> 4월</button>
            <button className="pill active">2026년 5월</button>
            <button className="pill">6월 <Icon name="chev-r" size={11} /></button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { l: '이번 달 요리', v: cookedDays, u: '일' },
            { l: '총 섭취', v: totalKcal.toLocaleString(), u: 'kcal' },
            { l: '일 평균', v: Math.round(totalKcal / cookedDays), u: 'kcal' },
            { l: '가장 많이 만든', v: '계란말이', u: '2회' },
          ].map(s => (
            <div key={s.l} className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
                <span className="num-display" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}>{s.v}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{s.u}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '0.5px solid var(--border)', background: '#fbfaf7' }}>
            {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => (
              <div key={d} style={{
                padding: '10px 12px', fontSize: 10.5, color: 'var(--text-tertiary)',
                borderRight: i < 6 ? '0.5px solid var(--border)' : 'none',
              }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {days.map((d, idx) => {
              const meals = !d.dim ? mealsByDay[d.day] : (d.day >= 27 ? mealsByDay[d.day] : undefined);
              const totalK = meals ? meals.reduce((a, b) => a + b.kcal, 0) : 0;
              const isToday = d.day === 6 && !d.dim;
              return (
                <div key={idx} style={{
                  minHeight: 96, padding: 8,
                  borderRight: (idx % 7) < 6 ? '0.5px solid var(--border)' : 'none',
                  borderTop: idx >= 7 ? '0.5px solid var(--border)' : 'none',
                  opacity: d.dim ? 0.45 : 1,
                  background: isToday ? '#f7f6f3' : 'var(--surface)',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: isToday ? 600 : 400,
                    color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)',
                    marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {isToday && <span className="dot" style={{ background: 'var(--text-primary)', width: 5, height: 5 }} />}
                    {d.day}
                    {meals && <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--text-tertiary)' }}>{totalK}kcal</span>}
                  </div>
                  {meals && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {meals.map((m, mi) => (
                        <div key={mi} style={{
                          fontSize: 10.5, padding: '3px 6px', borderRadius: 4,
                          background: '#f1efe9', color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {m.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export type Loc = 'fridge' | 'freezer' | 'pantry';

export interface Ingredient {
  name: string;
  loc: Loc;
  qty: string;
  d: number;
  cat: string;
}

export interface Recipe {
  id: string;
  title: string;
  kcal: number;
  time: number;
  missing: number;
  missingItems: string[];
  have: string[];
  yt: boolean;
  thumb?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  from: string;
  done: boolean;
}

export interface MealEntry {
  day: number;
  meals: { name: string; kcal: number }[];
}

export const INGREDIENTS: Ingredient[] = [
  { name: '계란',        loc: 'fridge',  qty: '8개',     d: 2,   cat: '단백질' },
  { name: '두부',        loc: 'fridge',  qty: '1모',     d: 2,   cat: '단백질' },
  { name: '대파',        loc: 'fridge',  qty: '1단',     d: 4,   cat: '채소' },
  { name: '양파',        loc: 'pantry',  qty: '3개',     d: 18,  cat: '채소' },
  { name: '감자',        loc: 'pantry',  qty: '5개',     d: 22,  cat: '채소' },
  { name: '당근',        loc: 'fridge',  qty: '2개',     d: 9,   cat: '채소' },
  { name: '애호박',      loc: 'fridge',  qty: '1개',     d: 5,   cat: '채소' },
  { name: '청양고추',    loc: 'fridge',  qty: '6개',     d: 7,   cat: '채소' },
  { name: '마늘',        loc: 'fridge',  qty: '한줌',    d: 12,  cat: '채소' },
  { name: '돼지고기 앞다리', loc: 'freezer', qty: '300g', d: 35, cat: '단백질' },
  { name: '닭가슴살',    loc: 'freezer', qty: '2조각',   d: 28,  cat: '단백질' },
  { name: '소고기 다짐육', loc: 'freezer', qty: '200g',  d: 21,  cat: '단백질' },
  { name: '새우',        loc: 'freezer', qty: '12미',    d: 40,  cat: '단백질' },
  { name: '쌀',          loc: 'pantry',  qty: '4kg',     d: 60,  cat: '곡물' },
  { name: '참기름',      loc: 'pantry',  qty: '1병',     d: 90,  cat: '양념' },
  { name: '간장',        loc: 'pantry',  qty: '1병',     d: 120, cat: '양념' },
  { name: '고추장',      loc: 'fridge',  qty: '1통',     d: 45,  cat: '양념' },
  { name: '된장',        loc: 'fridge',  qty: '1통',     d: 50,  cat: '양념' },
  { name: '우유',        loc: 'fridge',  qty: '900ml',   d: 6,   cat: '유제품' },
  { name: '버터',        loc: 'fridge',  qty: '200g',    d: 30,  cat: '유제품' },
  { name: '치즈',        loc: 'fridge',  qty: '5장',     d: 14,  cat: '유제품' },
  { name: '양배추',      loc: 'fridge',  qty: '1/2통',   d: 8,   cat: '채소' },
  { name: '시금치',      loc: 'fridge',  qty: '1봉',     d: 3,   cat: '채소' },
  { name: '느타리버섯',  loc: 'fridge',  qty: '1팩',     d: 4,   cat: '채소' },
];

export const RECIPES: Recipe[] = [
  { id:'r1',  title:'두부 김치찌개',     kcal: 420, time: 25, missing: 0, missingItems: [], have: ['두부','김치','대파','마늘','고추장'], yt: true  },
  { id:'r2',  title:'계란말이',          kcal: 280, time: 10, missing: 0, missingItems: [], have: ['계란','대파','당근','참기름'], yt: true  },
  { id:'r3',  title:'된장찌개',          kcal: 310, time: 20, missing: 0, missingItems: [], have: ['두부','애호박','감자','대파','된장'], yt: false },
  { id:'r4',  title:'제육볶음',          kcal: 540, time: 25, missing: 1, missingItems: ['양배추'], have: ['돼지고기 앞다리','양파','대파','고추장','마늘'], yt: true  },
  { id:'r5',  title:'닭가슴살 샐러드',   kcal: 320, time: 15, missing: 1, missingItems: ['양상추'], have: ['닭가슴살','당근','양파','올리브유'], yt: false },
  { id:'r6',  title:'새우 볶음밥',       kcal: 580, time: 18, missing: 1, missingItems: ['완두콩'], have: ['새우','계란','쌀','대파','당근'], yt: true  },
  { id:'r7',  title:'감자조림',          kcal: 230, time: 30, missing: 0, missingItems: [], have: ['감자','당근','양파','간장'], yt: false },
  { id:'r8',  title:'시금치 무침',       kcal: 110, time: 8,  missing: 0, missingItems: [], have: ['시금치','마늘','참기름','간장'], yt: true  },
  { id:'r9',  title:'마파두부',          kcal: 480, time: 20, missing: 2, missingItems: ['두반장','산초가루'], have: ['두부','소고기 다짐육','대파','마늘'], yt: true  },
  { id:'r10', title:'버섯 크림 파스타',  kcal: 620, time: 22, missing: 2, missingItems: ['파스타면','생크림'], have: ['느타리버섯','마늘','버터','우유'], yt: false },
];

export const SHOPPING: ShoppingItem[] = [
  { id:'s1', name: '양배추',  from: '제육볶음',       done: false },
  { id:'s2', name: '양상추',  from: '닭가슴살 샐러드', done: false },
  { id:'s3', name: '완두콩',  from: '새우 볶음밥',    done: false },
  { id:'s4', name: '우유',    from: '직접 추가',      done: false },
  { id:'s5', name: '식빵',    from: '직접 추가',      done: true  },
  { id:'s6', name: '바나나',  from: '직접 추가',      done: true  },
  { id:'s7', name: '두반장',  from: '마파두부',       done: false },
];

export const MEAL_LOG: MealEntry[] = [
  { day: 27, meals: [{ name:'두부 김치찌개', kcal: 420 }, { name:'계란말이', kcal: 280 }] },
  { day: 28, meals: [{ name:'닭가슴살 샐러드', kcal: 320 }] },
  { day: 30, meals: [{ name:'된장찌개', kcal: 310 }] },
  { day: 1,  meals: [{ name:'제육볶음', kcal: 540 }, { name:'시금치 무침', kcal: 110 }] },
  { day: 2,  meals: [{ name:'새우 볶음밥', kcal: 580 }] },
  { day: 3,  meals: [{ name:'감자조림', kcal: 230 }, { name:'계란말이', kcal: 280 }] },
  { day: 5,  meals: [{ name:'마파두부', kcal: 480 }] },
  { day: 6,  meals: [{ name:'두부 김치찌개', kcal: 420 }] },
];

export const LOC_LABEL: Record<Loc, string> = { fridge: '냉장', freezer: '냉동', pantry: '상온' };
export const LOC_TEMP:  Record<Loc, string> = { fridge: '4°C', freezer: '-18°C', pantry: '실온' };

export function dCount(d: number) { return `D-${d}`; }
export function dSeverity(d: number): 'danger' | 'warn' | 'ok' {
  return d <= 2 ? 'danger' : d <= 7 ? 'warn' : 'ok';
}

import { SHOPPING } from '@/lib/data';

/** 장보기 로컬스토리지 키 (Shopping 페이지와 공유) */
export const SHOPPING_KEY = 'shopping.items.v1';

export type StoredShoppingRow = {
  id: string;
  name: string;
  from: string;
  done: boolean;
  memo?: string | null;
};

export function shoppingSeedItems(): StoredShoppingRow[] {
  return SHOPPING.map((s) => ({ ...s, memo: null }));
}

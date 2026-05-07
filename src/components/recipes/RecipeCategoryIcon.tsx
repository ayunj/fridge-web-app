'use client';

import React from 'react';

export type RecipeTypeKey = 'korean' | 'chinese' | 'japanese' | 'western' | 'dessert' | 'easy' | 'other';

export function recipeTypeKey(t: string | null): RecipeTypeKey {
  const v = (t ?? '').trim();
  switch (v) {
    case '한식':
      return 'korean';
    case '중식':
      return 'chinese';
    case '일식':
      return 'japanese';
    case '양식':
      return 'western';
    case '디저트':
      return 'dessert';
    case '간편식':
      return 'easy';
    case '기타':
      return 'other';
    default:
      return 'other';
  }
}

export default function RecipeCategoryIcon({ type, size = 44 }: { type: RecipeTypeKey; size?: number }) {
  const s = size;
  const wrap = (kids: React.ReactNode) => (
    <svg width={s} height={s} viewBox="0 0 44 44" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      {kids}
    </svg>
  );

  switch (type) {
    case 'korean':
      return wrap(
        <>
          <rect x="7" y="18" width="30" height="18" rx="6" fill="#D85A30" />
          <rect x="5" y="16" width="34" height="5" rx="2.5" fill="#993C1D" />
          <rect x="2" y="20" width="5" height="8" rx="2.5" fill="#993C1D" />
          <rect x="37" y="20" width="5" height="8" rx="2.5" fill="#993C1D" />
          <ellipse cx="22" cy="18" rx="13" ry="4" fill="#F0995A" />
          <circle cx="16" cy="17" r="2.5" fill="#C83A1A" />
          <circle cx="22" cy="16" r="3" fill="#E07040" />
          <circle cx="28" cy="17" r="2.5" fill="#C83A1A" />
          <rect x="20" y="10" width="4" height="5" rx="2" fill="#993C1D" />
          <ellipse cx="22" cy="10" rx="4" ry="2" fill="#D85A30" />
        </>,
      );
    case 'chinese':
      return wrap(
        <>
          <path d="M8 22 Q8 36 22 36 Q36 36 36 22 Z" fill="#EF9F27" />
          <ellipse cx="22" cy="22" rx="14" ry="5" fill="#FAC75A" />
          <path d="M14 20 Q18 17 22 20 Q26 23 30 20" stroke="#854F0B" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M13 23 Q17 20 22 23 Q27 26 31 23" stroke="#854F0B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <line x1="16" y1="8" x2="12" y2="28" stroke="#633806" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="22" y1="7" x2="18" y2="28" stroke="#633806" strokeWidth="2.5" strokeLinecap="round" />
        </>,
      );
    case 'japanese':
      return wrap(
        <>
          <rect x="8" y="24" width="13" height="9" rx="4" fill="#F5F0E8" />
          <rect x="23" y="24" width="13" height="9" rx="4" fill="#F5F0E8" />
          <rect x="7" y="21" width="15" height="6" rx="3" fill="#E8714A" />
          <path d="M9 21 Q14 19 20 21" stroke="#C85030" strokeWidth="1" fill="none" />
          <rect x="22" y="21" width="15" height="6" rx="3" fill="#C83050" />
          <path d="M24 21 Q29 19 35 21" stroke="#A02040" strokeWidth="1" fill="none" />
          <rect x="8" y="27" width="13" height="2.5" rx="1" fill="#2C2C2A" />
          <rect x="23" y="27" width="13" height="2.5" rx="1" fill="#2C2C2A" />
          <circle cx="16" cy="23" r="1.5" fill="#5DCAA5" />
          <circle cx="31" cy="23" r="1.5" fill="#5DCAA5" />
        </>,
      );
    case 'western':
      return wrap(
        <>
          <circle cx="22" cy="26" r="14" fill="#E6F1FB" />
          <circle cx="22" cy="26" r="10" fill="#B5D4F4" />
          <path d="M16 22 Q20 18 24 22 Q28 26 32 22" stroke="#BA7517" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M15 26 Q19 22 23 26 Q27 30 31 26" stroke="#BA7517" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M17 30 Q21 26 25 30 Q28 33 30 30" stroke="#BA7517" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <line x1="10" y1="10" x2="10" y2="22" stroke="#185FA5" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="8" y1="10" x2="8" y2="16" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="10" x2="12" y2="16" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
        </>,
      );
    case 'dessert':
      return wrap(
        <>
          <path d="M22 12 L8 36 L36 36 Z" fill="#ED93B1" />
          <path d="M10 32 L34 32 L36 36 L8 36 Z" fill="#D4537E" />
          <path d="M12 27 L32 27 L34 32 L10 32 Z" fill="#F4C0D1" />
          <path d="M22 12 Q25 9 28 12 Q25 10 22 12 Z" fill="white" />
          <ellipse cx="22" cy="13" rx="4" ry="3" fill="#E24B4A" />
          <path d="M20 11 Q22 9 24 11" stroke="#5DCAA5" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x="14" y="29" width="4" height="1.5" rx="0.75" fill="#FAC75A" transform="rotate(-20 14 29)" />
          <rect x="24" y="30" width="4" height="1.5" rx="0.75" fill="#85B7EB" transform="rotate(15 24 30)" />
          <rect x="19" y="34" width="4" height="1.5" rx="0.75" fill="#F4C0D1" transform="rotate(-10 19 34)" />
        </>,
      );
    case 'easy':
      return wrap(
        <>
          <path d="M22 8 L6 36 L38 36 Z" fill="#F5F0E8" />
          <path d="M10 32 L34 32 L38 36 L6 36 Z" fill="#1A1A18" />
          <path d="M12 27 L32 27 L34 32 L10 32 Z" fill="#2C2C20" />
          <ellipse cx="18" cy="22" rx="1.2" ry="0.8" fill="#D3C8A0" transform="rotate(-20 18 22)" />
          <ellipse cx="22" cy="18" rx="1.2" ry="0.8" fill="#D3C8A0" transform="rotate(10 22 18)" />
          <ellipse cx="26" cy="22" rx="1.2" ry="0.8" fill="#D3C8A0" transform="rotate(-15 26 22)" />
          <line x1="6" y1="36" x2="38" y2="36" stroke="#1A1A18" strokeWidth="2" />
          <ellipse cx="22" cy="24" rx="5" ry="3" fill="#F0A060" opacity="0.6" />
        </>,
      );
    case 'other':
    default:
      return wrap(
        <>
          <path d="M22 10 L12 26 L32 26 Z" fill="#EF9F27" />
          <circle cx="19" cy="19" r="2" fill="#E24B4A" />
          <circle cx="25" cy="17" r="2" fill="#E24B4A" />
          <ellipse cx="22" cy="32" rx="12" ry="4" fill="#D3D1C7" />
          <ellipse cx="22" cy="32" rx="8" ry="2.5" fill="#B4B2A9" />
          <rect x="20" y="5" width="4" height="12" rx="2" fill="#888780" opacity="0.4" />
          <rect x="15" y="9" width="14" height="4" rx="2" fill="#888780" opacity="0.4" />
        </>,
      );
  }
}


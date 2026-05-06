'use client';
import React from 'react';

type IconName =
  | 'fridge' | 'home' | 'leaf' | 'sparkle' | 'cart' | 'book'
  | 'search' | 'plus' | 'close' | 'menu' | 'chev-d' | 'chev-r'
  | 'chev-u' | 'chev-l' | 'check' | 'youtube' | 'flame' | 'clock'
  | 'cal' | 'trash' | 'edit' | 'link' | 'filter' | 'sort'
  | 'bell' | 'arrow-r';

interface IconProps {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function Icon({ name, size = 16, style, className }: IconProps) {
  const s = size;
  const stroke = {
    stroke: 'currentColor' as const,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  const svg = (kids: React.ReactNode) => (
    <svg
      width={s} height={s} viewBox="0 0 20 20"
      style={{ display: 'block', flexShrink: 0, ...style }}
      className={className}
      aria-hidden="true"
    >
      {kids}
    </svg>
  );

  switch (name) {
    case 'fridge':   return svg(<><rect x="5" y="2.5" width="10" height="15" rx="1.6" {...stroke}/><line x1="5" y1="8.5" x2="15" y2="8.5" {...stroke}/><line x1="7" y1="5.5" x2="7" y2="6.7" {...stroke}/><line x1="7" y1="11" x2="7" y2="12.5" {...stroke}/></>);
    case 'home':     return svg(<path d="M3.5 9 10 4l6.5 5v7a1.2 1.2 0 0 1-1.2 1.2H4.7A1.2 1.2 0 0 1 3.5 16Z" {...stroke}/>);
    case 'leaf':     return svg(<><path d="M4 16c0-7 4-12 12-12 0 8-5 12-12 12Z" {...stroke}/><path d="M5 15 13 7" {...stroke}/></>);
    case 'sparkle':  return svg(<path d="M10 3l1.4 4.1L15.5 8.5 11.4 9.9 10 14l-1.4-4.1L4.5 8.5 8.6 7.1Z" {...stroke}/>);
    case 'cart':     return svg(<><path d="M3 3.5h2l1.6 9.2a1.2 1.2 0 0 0 1.2 1H15" {...stroke}/><circle cx="8" cy="16.2" r="1.1" {...stroke}/><circle cx="14" cy="16.2" r="1.1" {...stroke}/><path d="M6.4 6h10l-1.2 5.5a1.1 1.1 0 0 1-1.1.9H7.5" {...stroke}/></>);
    case 'book':     return svg(<><path d="M4 4.5h5a2.5 2.5 0 0 1 2.5 2.5v9.5A2 2 0 0 0 9.5 14.5H4Z" {...stroke}/><path d="M16 4.5h-5a2.5 2.5 0 0 0-2.5 2.5v9.5A2 2 0 0 1 10.5 14.5H16Z" {...stroke}/></>);
    case 'search':   return svg(<><circle cx="9" cy="9" r="5" {...stroke}/><line x1="13" y1="13" x2="16.5" y2="16.5" {...stroke}/></>);
    case 'plus':     return svg(<><line x1="10" y1="4" x2="10" y2="16" {...stroke}/><line x1="4" y1="10" x2="16" y2="10" {...stroke}/></>);
    case 'close':    return svg(<><line x1="5" y1="5" x2="15" y2="15" {...stroke}/><line x1="15" y1="5" x2="5" y2="15" {...stroke}/></>);
    case 'menu':     return svg(<><line x1="4" y1="6" x2="16" y2="6" {...stroke}/><line x1="4" y1="10" x2="16" y2="10" {...stroke}/><line x1="4" y1="14" x2="13" y2="14" {...stroke}/></>);
    case 'chev-d':   return svg(<polyline points="5,8 10,12 15,8" {...stroke}/>);
    case 'chev-r':   return svg(<polyline points="8,5 12,10 8,15" {...stroke}/>);
    case 'chev-u':   return svg(<polyline points="5,12 10,8 15,12" {...stroke}/>);
    case 'chev-l':   return svg(<polyline points="12,5 8,10 12,15" {...stroke}/>);
    case 'check':    return svg(<polyline points="5,10 8.5,13.5 15,7" {...stroke}/>);
    case 'youtube':  return svg(<><rect x="2.5" y="5.5" width="15" height="9" rx="2.2" {...stroke}/><polygon points="8.5,8 13,10 8.5,12" fill="currentColor"/></>);
    case 'flame':    return svg(<path d="M10 17c-3 0-5-2-5-4.6 0-2 1.5-3 2.6-4 .8-.7 1-1.6 0-3 3 0 5 2.5 5 5 0 .7.4 1 .8.5.6-.7.6-1.7.6-2.4 1.6 1.2 3 3 3 5 0 2.6-2 4.5-5 4.5Z" {...stroke}/>);
    case 'clock':    return svg(<><circle cx="10" cy="10" r="6.5" {...stroke}/><polyline points="10,6 10,10 13,11.5" {...stroke}/></>);
    case 'cal':      return svg(<><rect x="3.5" y="4.5" width="13" height="12" rx="1.5" {...stroke}/><line x1="3.5" y1="8" x2="16.5" y2="8" {...stroke}/><line x1="7" y1="3" x2="7" y2="6" {...stroke}/><line x1="13" y1="3" x2="13" y2="6" {...stroke}/></>);
    case 'trash':    return svg(<><polyline points="4,6 16,6" {...stroke}/><path d="M6 6v9.5a1.2 1.2 0 0 0 1.2 1.2h5.6a1.2 1.2 0 0 0 1.2-1.2V6" {...stroke}/><path d="M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6" {...stroke}/></>);
    case 'edit':     return svg(<><path d="M4 16h2.5L15 7.5 12.5 5 4 13.5Z" {...stroke}/><line x1="11.5" y1="6" x2="14" y2="8.5" {...stroke}/></>);
    case 'link':     return svg(<><path d="M8.5 11.5a2.5 2.5 0 0 0 3.5 0l2.5-2.5a2.5 2.5 0 0 0-3.5-3.5L9.7 6.8" {...stroke}/><path d="M11.5 8.5a2.5 2.5 0 0 0-3.5 0L5.5 11a2.5 2.5 0 0 0 3.5 3.5l1.3-1.3" {...stroke}/></>);
    case 'filter':   return svg(<><line x1="4" y1="6" x2="16" y2="6" {...stroke}/><line x1="6" y1="10" x2="14" y2="10" {...stroke}/><line x1="8" y1="14" x2="12" y2="14" {...stroke}/></>);
    case 'sort':     return svg(<><line x1="5" y1="6" x2="15" y2="6" {...stroke}/><line x1="5" y1="10" x2="12" y2="10" {...stroke}/><line x1="5" y1="14" x2="9" y2="14" {...stroke}/></>);
    case 'bell':     return svg(<><path d="M5 13.5V9.5a5 5 0 0 1 10 0v4l1 1.5H4Z" {...stroke}/><path d="M8 16.5a2 2 0 0 0 4 0" {...stroke}/></>);
    case 'arrow-r':  return svg(<><line x1="4" y1="10" x2="16" y2="10" {...stroke}/><polyline points="12,6 16,10 12,14" {...stroke}/></>);
    default: return null;
  }
}

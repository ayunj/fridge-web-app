export function subjectParticle(word: string): '이' | '가' {
  const w = (word ?? '').trim();
  if (!w) return '가';

  const last = w.charCodeAt(w.length - 1);
  // Hangul syllables range: AC00–D7A3
  if (last >= 0xac00 && last <= 0xd7a3) {
    const jong = (last - 0xac00) % 28;
    return jong === 0 ? '가' : '이';
  }

  // Fallback for non-Hangul: prefer '이' (more natural after consonant-ending names)
  return '이';
}

export function withSubjectParticle(word: string): string {
  const w = (word ?? '').trim();
  if (!w) return w;
  return `${w}${subjectParticle(w)}`;
}


// Tipos para usar los módulos compartidos (.mjs) desde TypeScript.
declare module '*shared/phonetics.mjs' {
  export interface Phone { p: string; s: number; g?: boolean }
  export interface KeywordScore { score: number; whole: number; focus: number; focusText: string; verdict: 'good' | 'weak' | 'bad' }
  export const GOOD: number;
  export const WEAK: number;
  export function isVowel(p: string): boolean;
  export function arpabetPhones(arpabet: string | null | undefined): Phone[];
  export function ipaPhones(ipa: string | null | undefined): Phone[];
  export function spanishPhones(text: string): Phone[];
  export function stressedFocus(phones: Phone[]): Phone[];
  export function render(phones: Phone[]): string;
  export function scoreKeyword(en: Phone[], keyword: string): KeywordScore;
  export function verdictFor(score: number): 'good' | 'weak' | 'bad';
  export function englishPhones(word: { arpabet?: string | null; ipa?: string | null }): Phone[];
  export function spanishRespelling(phones: Phone[]): string;
  export function pronunciationEs(phones: Phone[]): string;
}

declare module '*shared/classify.mjs' {
  export type Kind = 'cognate' | 'easy' | 'keyword' | 'chunk' | 'phrasal' | 'irregular';
  export const KINDS: Kind[];
  export const KIND_LABEL: Record<Kind, string>;
  export const PARTICLES: Record<string, string>;
  export function translations(es: string): string[];
  export function cognateRule(en: string, es: string): string | null;
  export function classifyWord(
    word: { en: string; es: string },
    ctx?: { known?: Map<string, string>; irregular?: Map<string, { past: string; participle: string; family?: string }> },
  ): { kind: Kind; hint_es: string | null };
}
declare module '*shared/retention.mjs' {
  export interface Bucket { key: 'exam' | '1h' | '24h' | '7d' | '30d'; label: string; min?: number; max?: number }
  export const BUCKETS: Bucket[];
  export function bucketOf(a: { kind: string; hours_since_learned: number | null }): Bucket['key'] | null;
  export function resultValue(r: string): number;
  export function retentionBy<T>(
    attempts: { kind: string; hours_since_learned: number | null; result: string; word: number; user?: string; created_at?: string }[],
    groupFn: (a: any) => T,
  ): Map<T, Record<Bucket['key'], { n: number; rate: number | null }>>;
}

import first from '../../content/production/cognate-batch-001.json';
import second from '../../content/production/cognate-batch-002.json';
import mnemonicDrafts from '../../content/production/association-batch-002.json';
import { validateUnit, validateAssociationQuality, type AtomicWord, type AtomicUnit } from '../domain/unit';

/** Explicit editorial preview. Never imported into published unit summaries,
 * the learner catalogue, world counts or real progress without publication. */
export function makeVocabularyPacks(entries: unknown[]): AtomicUnit[] {
  const groups = new Map<string, AtomicWord[]>();
  const seen = new Set<string>();
  for (const raw of entries) {
    const word = raw as AtomicWord & { domain?: string };
    const key = word.en.toLowerCase();
    if (seen.has(key)) continue;
    if (validateAssociationQuality(word).automatedGate !== 'pass' || word.associationMode !== 'cognate' || !word.usageExample) throw new Error(`Corregir el cognado ${word.en} antes de mostrarlo en revisión.`);
    seen.add(key);
    const domain = word.domain || 'general';
    const group = groups.get(domain) || [];
    group.push({ ...word, id: group.length + 1 });
    groups.set(domain, group);
  }
  return [...groups].flatMap(([domain, words]) => {
    const packs: AtomicUnit[] = [];
    for (let offset = 0; offset < words.length; offset += 3) {
      const slice = words.slice(offset, offset + 3).map((word, index) => ({ ...word, id: index + 1 }));
      const example = slice[0].usageExample!;
      packs.push(validateUnit({ kind: 'vocabulary-pack', id: `editorial-cognates-${domain}-${offset / 3 + 1}`, title: `Cognados · ${domain} · ${offset / 3 + 1}`, contentVersion: '1', words: slice, grammar: [], sentence: { en: example.en, es: example.es, slots: [], pronunciationTip: 'Escucha la palabra inglesa; no deduzcas el sonido de la palabra española.' } }));
    }
    return packs;
  });
}
export function makeMnemonicVocabularyPacks(entries: typeof mnemonicDrafts.entries): AtomicUnit[] {
  const words: AtomicWord[] = entries.map((entry, index) => ({
    ...entry, id: index + 1, associationMode: 'acoustic_bridge', status: 'needs_review',
    emojis: entry.emojis as AtomicWord['emojis'],
    bridgeEvidence: { spanishCue: entry.bridge, familiarMeaning: entry.familiarMeaning, soundRelation: entry.soundRelation, cueType: 'spanish_word' },
    highlightTerms: [entry.bridge],
  }));
  if (new Set(words.map((word) => word.en.toLowerCase())).size !== words.length) throw new Error('Palabras duplicadas en el lote de asociaciones.');
  return Array.from({ length: Math.ceil(words.length / 3) }, (_, index) => {
    const slice = words.slice(index * 3, index * 3 + 3).map((word, offset) => ({ ...word, id: offset + 1 }));
    if (slice.some((word) => validateAssociationQuality(word).automatedGate !== 'pass')) throw new Error('Corrige las historias antes de cargarlas en revisión.');
    const context = slice[0].usageExample!;
    return validateUnit({ kind: 'vocabulary-pack', id: `editorial-mnemonics-002-${index + 1}`, title: `Asociaciones cotidianas · ${index + 1}`, activeRecall: true, contentVersion: '1', words: slice, grammar: [], sentence: { ...context, slots: [], pronunciationTip: 'El puente recuerda la palabra; el audio enseña su sonido inglés.' } });
  });
}
export const mnemonicPreviewPacks = makeMnemonicVocabularyPacks(mnemonicDrafts.entries);
export const vocabularyPreviewPacks = [...makeVocabularyPacks([...first.entries, ...second.entries]), ...mnemonicPreviewPacks];

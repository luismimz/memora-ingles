// Una asociación útil debe caber en una sola imagen mental. Las semillas curadas
// pueden tener matices propios; estas reglas protegen sobre todo la salida de IA.
export const mnemonicWordCount = (text) => (String(text || '').replace(/\*\*/g, '').match(/[\p{L}\p{N}]+/gu) || []).length;

export function mnemonicIssues(mnemonic) {
  const scene = String(mnemonic?.scene_es || '').trim();
  const story = String(mnemonic?.story_en || '').trim();
  const issues = [];
  if (!scene) issues.push('sin escena');
  if (mnemonicWordCount(scene) > 14) issues.push('escena larga');
  if (story && mnemonicWordCount(story) > 16) issues.push('inglés largo');
  if (/[()[\]]/.test(scene)) issues.push('explicación entre paréntesis');
  if (/\b(como el nombre|por ejemplo|significa que|te persigue|corres muy rápido|¡?cuidado)\b/i.test(scene)) issues.push('relleno narrativo');
  return issues;
}

export const isConciseMnemonic = (mnemonic) => mnemonicIssues(mnemonic).length === 0;

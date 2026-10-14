import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayingGrammarReview, playingReviewSteps } from './PlayingGrammarReview';
import { previewUnit, reviewUnits } from '../preview/previewUnit';
import { MirrorQuestion, MirrorRow } from './MirrorPieces';

describe('ficha reunida de Jugando para revisión', () => {
  it('colorea NO y NOT como negaciones, separadas del auxiliar', () => {
    const html = renderToStaticMarkup(<MirrorRow pieces={[{ text: 'no', role: 'negation' }, { text: 'estás', role: 'auxiliary' }, { text: 'not', role: 'negation' }]} label="Comparar" language="es" />);
    expect(html).toContain('mirror-negation">no</span>');
    expect(html).toContain('mirror-negation">not</span>');
    expect(html).toContain('mirror-auxiliary">estás</span>');
  });
  it('enseña la pregunta natural sin colores y luego revela TÚ en el espejo', () => {
    const lesson = reviewUnits.find((unit) => unit.mirror)!.mirror!;
    const html = renderToStaticMarkup(<MirrorQuestion lesson={lesson} spanishMirror={[{ text: '¿Qué', role: 'question' }, { text: 'estás', role: 'auxiliary' }, { text: 'TÚ', role: 'person' }, { text: 'haciendo?', role: 'action' }]} />);
    expect(html).toContain('lang="es">¿Qué estás haciendo?</p>');
    expect(html).toContain('¿Quién?');
    expect(html).toContain('mirror-person">TÚ</span>');
    expect(html).toContain('mirror-person">you</span>');
  });
  it('permite revisar todos los recursos sin registrar dominio ni publicar datos', () => {
    const html = renderToStaticMarkup(<PlayingGrammarReview unit={previewUnit} mirrorUnit={reviewUnits.find((unit) => unit.mirror)!} onExit={() => {}} />);
    expect(html).toContain('no guarda progreso ni desbloquea habilidades');
    expect(html).toContain('Estoy jugando.');
    expect(html).toContain('¿Quién está jugando?');
    expect(html).not.toContain('Persona escondida');
    expect(html).not.toContain('PLAYA → PLAY → JUGAR');
    expect(html).not.toContain('Antes de traducir, haz visible la persona');
    for (const step of playingReviewSteps) expect(html).toContain(step);
    expect(html).toContain('playing-review-step');
    expect(html).not.toContain('habilidad desbloqueada');
  });
  it('recupera el repertorio, no solo el examen escrito', () => {
    expect(playingReviewSteps).toHaveLength(9);
    expect(playingReviewSteps).toEqual(expect.arrayContaining(['Español espejo', 'Las dos pistas', 'Persona y contracción', 'Construir', 'Afirmar / negar / preguntar', 'Conversar con Emma', 'Recordar']));
    expect(previewUnit.grammar[0].subjects).toHaveLength(8);
  });
});

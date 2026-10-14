import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TypedChatMessage } from './TypedChatMessage';
import type { GrammarForm } from '../domain/unit';

describe('pista de audio en el chat', () => {
  it('ofrece escuchar la frase sin escribir la solución en la pista', () => {
    const html = renderToStaticMarkup(<TypedChatMessage
      message={{ id: 'hint', who: 'coach', text: 'Escucha la pregunta y vuelve a intentarlo.', audioHint: 'What are you cooking?', instant: true }}
      partner="Emma"
      form={{} as GrammarForm}
      autoSpeak={false}
    />);
    expect(html).toContain('Escuchar una ayuda');
    expect(html).not.toContain('What are you cooking?');
  });
});

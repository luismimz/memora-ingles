import { piece as p, validateGrammarLesson, type GrammarLessonData } from '../domain/grammarLesson';

/** Authored demonstrations. They do not unlock untaught vocabulary or enter a learner's queue. */
export const grammarExamples: GrammarLessonData[] = [
  {
    id: 'conditional-would', title: 'Lo haría, si…', language: 'en',
    steps: [
      { caption: '«Cocinaría, si tuviera tiempo» imagina una situación. En esa intención, cocinaría usa WOULD + COOK.', es: [p('Yo ', 'subject'), p('cocinaría', 'change')], en: [p('I ', 'subject'), p('would ', 'auxiliary'), p('cook', 'verb')] },
      { caption: 'La condición «si tuviera tiempo» se dice IF I HAD TIME. HAD corresponde a tener en este ejemplo.', es: [p('si ', 'context'), p('tuviera ', 'change'), p('tiempo')], en: [p('if I ', 'context'), p('had ', 'change'), p('time')] },
      { caption: 'Busca la intención completa, no solo las letras finales. «Tenía tiempo ayer» cuenta el pasado: I HAD TIME YESTERDAY.', es: [p('Tenía ', 'change'), p('tiempo ayer')], en: [p('I ', 'subject'), p('had ', 'change'), p('time yesterday')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Imaginas: cocinaría si tuviera tiempo.', choices: ['I would cook if I had time.', 'I would cooking if I had time.'], answers: ['I would cook if I had time.'], hint: 'WOULD + COOK. La condición completa es IF I HAD TIME.', success: 'Has relacionado una intención, no una terminación aislada.' },
      { id: 'explain', kind: 'explain', prompt: 'Alguien ve «tenía» y pone WOULD. ¿Qué le dirías?', choices: ['Mira si cuenta el pasado o imagina una situación.', 'Toda palabra acabada en -ía lleva WOULD.'], answers: ['Mira si cuenta el pasado o imagina una situación.'], hint: '«Tenía tiempo ayer» cuenta algo pasado; no es «tendría tiempo si…».', success: 'Sabes cuándo el truco sirve y cuándo no.' },
      { id: 'use', kind: 'write', prompt: 'Dilo: cocinaría si tuviera tiempo.', answers: ['I would cook if I had time.', "I'd cook if I had time."], hint: 'I WOULD COOK + IF I HAD TIME.', success: 'Has expresado una posibilidad imaginada.' },
    ],
  },
  {
    id: 'want-to-can', title: 'Quiero hacerlo · puedo hacerlo', language: 'en',
    steps: [
      { caption: '«Quiero cocinar»: WANT se une a la siguiente acción con TO.', es: [p('Quiero ', 'auxiliary'), p('cocinar', 'verb')], en: [p('I want ', 'auxiliary'), p('to ', 'change'), p('cook', 'verb')] },
      { caption: '«Puedo cocinar»: CAN ya conecta con la acción. Después de CAN, COOK va sin TO.', es: [p('Puedo ', 'auxiliary'), p('cocinar', 'verb')], en: [p('I can ', 'auxiliary'), p('cook', 'verb')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Di que puedes cocinar.', choices: ['I can to cook.', 'I can cook.'], answers: ['I can cook.'], hint: 'CAN + COOK. Aquí TO sobra.', success: 'Has elegido las piezas que encajan.' },
      { id: 'explain', kind: 'explain', prompt: '¿Basta ver «cocinar» para poner siempre TO?', choices: ['No: miro la pieza anterior. WANT TO, pero CAN sin TO.', 'Sí: todo infinitivo español lleva TO.'], answers: ['No: miro la pieza anterior. WANT TO, pero CAN sin TO.'], hint: 'I WANT TO COOK. I CAN COOK.', success: 'El contexto te dice si necesitas TO.' },
      { id: 'use', kind: 'write', prompt: 'Dilo: quiero cocinar.', answers: ['I want to cook.'], hint: 'I WANT + TO + COOK.', success: 'Ya puedes expresar lo que quieres hacer.' },
    ],
  },
  {
    id: 'look-for-question', title: 'Buscar: LOOK FOR viajan juntos', language: 'en',
    steps: [
      { caption: 'Para «buscar», aprende LOOK FOR como una pieza completa. FOR forma parte de esta expresión.', es: [p('Estoy ', 'auxiliary'), p('buscando ', 'verb'), p('mi móvil.')], en: [p("I'm ", 'auxiliary'), p('looking for ', 'verb'), p('my phone.')] },
      { caption: 'Para preguntar qué buscas, WHAT ocupa el inicio. ARE salta delante de YOU y FOR se queda al final.', es: [p('¿Qué ', 'change'), p('estás ', 'auxiliary'), p('buscando?', 'verb')], en: [p('What ', 'change'), p('are ', 'auxiliary'), p('you ', 'subject'), p('looking for?', 'verb')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Pregunta: ¿qué estás buscando?', choices: ['What are you looking?', 'What are you looking for?'], answers: ['What are you looking for?'], hint: 'Conserva LOOK FOR: aquí FOR queda al final.', success: 'La expresión conserva su significado.' },
      { id: 'explain', kind: 'explain', prompt: '¿Por qué no puedes borrar FOR en esta pregunta?', choices: ['Porque LOOK FOR expresa buscar.', 'Porque toda pregunta inglesa termina en FOR.'], answers: ['Porque LOOK FOR expresa buscar.'], hint: 'Es parte de esta expresión, no una regla para todas las preguntas.', success: 'Has explicado qué piezas pertenecen juntas.' },
      { id: 'use', kind: 'write', prompt: 'Pregúntalo: ¿qué estás buscando?', answers: ['What are you looking for?'], hint: 'WHAT + ARE YOU + LOOKING FOR?', success: 'Ya puedes preguntar por un objeto perdido.' },
    ],
  },
  {
    id: 'be-negative', title: 'Decir que no', language: 'en',
    steps: [
      { caption: 'Ya sabes decir que estás cocinando.', es: [p('Estoy ', 'auxiliary'), p('cocin', 'verb'), p('ando', 'change')], en: [p("I'm ", 'auxiliary'), p('cook', 'verb'), p('ing', 'change')] },
      { caption: 'Para decir que no, coloca NOT después de AM. La acción conserva ING.', es: [p('No ', 'change'), p('estoy ', 'auxiliary'), p('cocinando', 'verb')], en: [p('I ', 'subject'), p('am ', 'auxiliary'), p('not ', 'change'), p('cooking', 'verb')] },
      { caption: "Puedes juntar I AM en I'M. NOT se queda a su lado.", es: [p('No ', 'change'), p('estoy ', 'auxiliary'), p('cocinando', 'verb')], en: [p("I'm ", 'auxiliary'), p('not ', 'change'), p('cooking', 'verb')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'No estoy cocinando.', choices: ["I'm not cooking.", "I'm no cooking."], answers: ["I'm not cooking."], hint: 'En esta frase, «no» se convierte en NOT.', success: 'NOT cambia lo que estás diciendo.' },
      { id: 'explain', kind: 'explain', prompt: '¿Dónde le dirías a alguien que coloque NOT?', choices: ['Después de AM: I am not cooking.', 'Al final: I am cooking not.'], answers: ['Después de AM: I am not cooking.'], hint: 'AM y NOT quedan juntos, antes de cooking.', success: 'Ya sabes dónde colocar la pieza.' },
      { id: 'use', kind: 'write', prompt: 'Acláralo: no estoy cocinando.', answers: ["I'm not cooking", 'I am not cooking'], hint: "I'M + NOT + COOKING.", success: 'Ya puedes corregir un malentendido.' },
    ],
  },
  {
    id: 'be-question', title: 'Preguntar qué está pasando', language: 'en',
    steps: [
      { caption: 'Esta frase cuenta lo que hace otra persona.', es: [p('Tú ', 'subject'), p('estás ', 'auxiliary'), p('cocinando', 'verb')], en: [p('You ', 'subject'), p('are ', 'auxiliary'), p('cooking', 'verb')] },
      { caption: 'Para preguntar, ARE salta delante de YOU. El resto queda igual.', es: [p('¿Estás ', 'auxiliary'), p('cocinando?', 'verb')], en: [p('Are ', 'auxiliary'), p('you ', 'subject'), p('cooking?', 'verb')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Pregunta: ¿estás cocinando?', choices: ['Are you cooking?', 'Do you cooking?'], answers: ['Are you cooking?'], hint: 'Ya tienes ARE. Muévelo delante de YOU.', success: 'La misma frase se ha convertido en una pregunta.' },
      { id: 'explain', kind: 'explain', prompt: 'Explica el cambio a alguien: ¿qué pieza se mueve?', choices: ['ARE pasa delante de YOU.', 'ING pasa delante de COOK.'], answers: ['ARE pasa delante de YOU.'], hint: 'You ARE cooking → ARE you cooking?', success: 'Ya puedes explicar el truco del salto.' },
      { id: 'use', kind: 'write', prompt: 'Pregúntaselo a alguien de casa: ¿estás cocinando?', answers: ['Are you cooking?'], hint: 'ARE + YOU + COOKING?', success: 'Ya puedes iniciar un intercambio.' },
    ],
  },
  {
    id: 'imperative', title: 'Pedir una acción', language: 'en',
    steps: [
      { caption: 'Para pedir una acción, empieza directamente con el verbo.', es: [p('Cocina ', 'verb'), p('la cena.')], en: [p('Cook ', 'verb'), p('dinner.')] },
      { caption: 'PLEASE suaviza la petición. Aquí lo colocamos al principio.', es: [p('Por favor, ', 'change'), p('cocina ', 'verb'), p('la cena.')], en: [p('Please ', 'change'), p('cook ', 'verb'), p('dinner.')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Pide: cocina la cena, por favor.', choices: ['Please cooking dinner.', 'Please cook dinner.'], answers: ['Please cook dinner.'], hint: 'Pides la acción: usa COOK, sin ING.', success: 'Ya puedes pedir algo que necesitas.' },
      { id: 'explain', kind: 'explain', prompt: '¿Por qué usas COOK en esta petición?', choices: ['Porque pido que alguien haga la acción.', 'Porque cuento lo que estoy haciendo.'], answers: ['Porque pido que alguien haga la acción.'], hint: '«Cocina» pide una acción; «estoy cocinando» describe otra.', success: 'Has distinguido pedir de describir.' },
      { id: 'use', kind: 'write', prompt: 'Pide ayuda con la cena: cocina la cena, por favor.', answers: ['Please cook dinner.', 'Cook dinner, please.'], hint: 'PLEASE + COOK + DINNER.', success: 'Una petición real, lista para usar.' },
    ],
  },
  {
    id: 'will', title: 'Una decisión que tomas ahora', language: 'en',
    steps: [
      { caption: 'Decides encargarte de la cena. WILL va antes del verbo, que queda en su forma base.', es: [p('Yo ', 'subject'), p('cocinaré ', 'change'), p('la cena.')], en: [p('I ', 'subject'), p('will ', 'auxiliary'), p('cook ', 'verb'), p('dinner.')] },
      { caption: "Al hablar, I WILL se junta en I'LL. COOK no cambia.", es: [p('Cocinaré ', 'change'), p('la cena.')], en: [p("I'll ", 'auxiliary'), p('cook ', 'verb'), p('dinner.')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Te ofreces: yo cocinaré la cena.', choices: ["I'll cook dinner.", "I'll cooking dinner."], answers: ["I'll cook dinner."], hint: 'WILL usa la forma base: COOK.', success: 'Has elegido cómo ofrecerte.' },
      { id: 'explain', kind: 'explain', prompt: '¿Qué le enseñas a alguien sobre WILL?', choices: ['Después de WILL va COOK, sin ING.', 'Después de WILL siempre añado ING.'], answers: ['Después de WILL va COOK, sin ING.'], hint: 'La pieza WILL ya señala tu decisión. El verbo queda en forma base.', success: 'Has encontrado la pieza que cambia la intención.' },
      { id: 'use', kind: 'write', prompt: 'Ofrece tu ayuda: yo cocinaré la cena.', answers: ["I'll cook dinner.", 'I will cook dinner.'], hint: 'I WILL + COOK + DINNER.', success: 'Ya puedes ofrecerte a hacer algo.' },
    ],
  },
  {
    id: 'present-perfect', title: 'Ya está hecho', language: 'en',
    steps: [
      { caption: 'La cena ya está preparada. HAVE va con COOKED, la forma de «hecho» de este verbo regular.', es: [p('He ', 'auxiliary'), p('cocinado ', 'verb'), p('la cena.')], en: [p('I ', 'subject'), p('have ', 'auxiliary'), p('cook', 'verb'), p('ed ', 'change'), p('dinner.')] },
      { caption: "I HAVE se acorta a I'VE. Con otros verbos, la forma de «hecho» puede ser irregular: se enseña por separado.", es: [p('He ', 'auxiliary'), p('cocinado ', 'verb'), p('la cena.')], en: [p("I've ", 'auxiliary'), p('cooked ', 'verb'), p('dinner.')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Avisa: he cocinado la cena.', choices: ['I have cook dinner.', "I've cooked dinner."], answers: ["I've cooked dinner."], hint: 'HAVE necesita COOKED en esta frase, no COOK.', success: 'Ya puedes avisar de algo que has hecho.' },
      { id: 'explain', kind: 'explain', prompt: 'Alguien pone «I have cook». ¿Qué le explicas?', choices: ['Aquí necesita COOKED después de HAVE.', 'HAVE siempre lleva el verbo base.'], answers: ['Aquí necesita COOKED después de HAVE.'], hint: 'HAVE + COOKED. No generalices ED a los verbos irregulares.', success: 'Has evitado confundirlo con WILL + COOK.' },
      { id: 'use', kind: 'write', prompt: 'Dilo: he cocinado la cena.', answers: ["I've cooked dinner.", 'I have cooked dinner.'], hint: 'I HAVE + COOKED + DINNER.', success: 'Has comunicado un resultado.' },
    ],
  },
  {
    id: 'object-pronouns', title: 'Evitar repetir un nombre', language: 'en',
    steps: [
      { caption: 'María recibe la llamada. Su nombre va después de CALL.', es: [p('Yo ', 'subject'), p('llamo ', 'verb'), p('a María.', 'change')], en: [p('I ', 'subject'), p('call ', 'verb'), p('Maria.', 'change')] },
      { caption: 'Si ya sabes que hablamos de María, HER sustituye su nombre. SHE sería quien llama.', es: [p('Yo ', 'subject'), p('la ', 'change'), p('llamo.', 'verb')], en: [p('I ', 'subject'), p('call ', 'verb'), p('her.', 'change')] },
    ],
    checks: [
      { id: 'notice', kind: 'choose', prompt: 'Llamo a María → La llamo.', choices: ['I call she.', 'I call her.'], answers: ['I call her.'], hint: 'La persona que recibe la llamada se sustituye por HER.', success: 'Ya no necesitas repetir su nombre.' },
      { id: 'explain', kind: 'explain', prompt: '¿Por qué eliges HER?', choices: ['Porque ella recibe la llamada.', 'Porque ella es quien llama.'], answers: ['Porque ella recibe la llamada.'], hint: 'I hace la llamada; HER la recibe.', success: 'Has distinguido quién hace y quién recibe.' },
      { id: 'use', kind: 'write', prompt: 'Sin repetir María: la llamo.', answers: ['I call her.'], hint: 'I + CALL + HER.', success: 'Has reemplazado el nombre con sentido.' },
    ],
  },
];
grammarExamples.forEach(validateGrammarLesson);

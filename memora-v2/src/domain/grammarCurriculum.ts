import type { MirrorPiece } from './mirrorLesson';
import { normalizeSentenceAnswer } from './sentenceAnswer';

export interface CurriculumExample { natural: string; mirror: MirrorPiece[]; english: MirrorPiece[]; answers: string[] }
export interface CurriculumPattern {
  number: number; id: string; goal: string; rule: string; memoryCue: string; caution: string;
  vocabulary: string[]; prerequisites: string[]; examples: CurriculumExample[]; wrong: string;
  status: 'needs_review';
}
const roles = { S:'person', A:'auxiliary', V:'action', N:'negation', Q:'question', C:'context' } as const;
export function curriculumPieces(encoded: string): MirrorPiece[] {
  return encoded.split('|').map((item) => {
    const key = item[0] as keyof typeof roles;
    if (!roles[key] || item[1] !== ':' || !item.slice(2).trim()) throw new Error(`Pieza no revisada: ${item}`);
    return { role: roles[key], text: item.slice(2) };
  });
}
const example = (natural: string, mirror: string, english: string, alternatives: string[] = []): CurriculumExample => ({ natural, mirror: curriculumPieces(mirror), english: curriculumPieces(english), answers: [curriculumPieces(english).map((piece) => piece.text).join(' '), ...alternatives] });
const pattern = (number: number, id: string, goal: string, rule: string, memoryCue: string, caution: string, vocabulary: string, prerequisites: string[], examples: CurriculumExample[], wrong: string): CurriculumPattern => ({ number, id, goal, rule, memoryCue, caution, vocabulary: vocabulary.split(' '), prerequisites, examples, wrong, status: 'needs_review' });

/** Original sense-specific examples. Numbers cover the revised PDF, not CEFR
 * certification. Each entry is editorial until text, audio and use are reviewed. */
export const grammarCurriculum: CurriculumPattern[] = [
  pattern(1,'be','Decir quién eres y cómo estás','Di quién y conserva soy/estoy: I AM, YOU ARE, HE/SHE IS.','La persona lleva una pieza azul que dice cómo está.','La edad y el hambre usan BE: I am twenty; I am hungry. No se traduce tener palabra por palabra.','doctor tired hungry',['articles'],[
    example('Soy médico.','S:YO|A:soy|V:médico.','S:I|A:am|V:a doctor.',["I'm a doctor."]),
    example('Estoy cansado.','S:YO|A:estoy|V:cansado.','S:I|A:am|V:tired.',["I'm tired."]),
    example('Ella tiene hambre.','S:ELLA|A:está|V:hambrienta.','S:She|A:is|V:hungry.',["She's hungry."]),
  ],'I doctor.'),
  pattern(2,'simple-present','Contar lo que haces habitualmente','YO juego → I PLAY; ÉL/ELLA juega → HE/SHE PLAYS.','ÉL y ELLA ponen una S sobre la acción.','La S no se añade de la misma forma a todos los verbos: go → goes; have → has.','work play here',['be'],[
    example('Trabajo aquí.','S:YO|V:trabajo|C:aquí.','S:I|V:work|C:here.'),
    example('Ella trabaja aquí.','S:ELLA|V:trabaja|C:aquí.','S:She|V:works|C:here.'),
    example('Él juega.','S:ÉL|V:juega.','S:He|V:plays.'),
  ],'She work here.'),
  pattern(3,'do-does','Preguntar y negar sobre rutinas','DO/DOES van delante para preguntar; con DOES, el verbo vuelve a su base.','El portero DOES entra primero y recoge la S del verbo.','No añadas DO si ya hay BE o CAN. Si WHO hace de sujeto: Who lives here?, sin DO.','play work here',['simple-present'],[
    example('¿Juegas?','A:¿[DO]|S:TÚ|V:juegas?','A:Do|S:you|V:play?'),
    example('¿Trabaja ella aquí?','A:¿[DOES]|S:ELLA|V:trabaja|C:aquí?','A:Does|S:she|V:work|C:here?'),
    example('No juego.','S:YO|N:no|V:juego.','S:I|N:do not|V:play.',["I don't play."]),
  ],'Does she works here?'),
  pattern(4,'present-now','Contar qué estás haciendo ahora','ESTOY + ANDO/IENDO → I AM + acción con ING.','La pieza azul y el final naranja viajan con la persona.','Aquí hablamos de una acción en marcha; el continuo también sirve para ciertos planes futuros ya acordados.','play eat work',['be'],[
    example('Estoy jugando.','S:YO|A:estoy|V:jugando.','S:I|A:am|V:playing.',["I'm playing."]),
    example('Estoy comiendo.','S:YO|A:estoy|V:comiendo.','S:I|A:am|V:eating.',["I'm eating."]),
    example('Estoy trabajando.','S:YO|A:estoy|V:trabajando.','S:I|A:am|V:working.',["I'm working."]),
  ],'I playing.'),
  pattern(5,'can','Pedir permiso y decir lo que puedes hacer','CAN conecta directamente con el verbo base; para preguntar, va delante de la persona.','CAN abre la puerta de la acción: no necesita TO.','CAN no lleva S. Saber nadar se expresa con CAN SWIM, no con KNOW SWIM.','borrow phone cook swim',['be','possessives'],[
    example('¿Puedo pedir prestado tu móvil?','A:¿Puedo|S:YO|V:pedir prestado|C:tu móvil?','A:Can|S:I|V:borrow|C:your phone?'),
    example('Ella sabe cocinar.','S:ELLA|A:puede|V:cocinar.','S:She|A:can|V:cook.'),
    example('Sé nadar.','S:YO|A:puedo|V:nadar.','S:I|A:can|V:swim.'),
  ],'She cans cook.'),
  pattern(6,'going-to','Contar un plan que ya tienes','VOY A hacer algo → I AM GOING TO + verbo base.','El plan lleva un vagón completo: AM GOING TO.','Going to también sirve para predicciones con indicios. Going to the park expresa desplazamiento, no este patrón de plan.','study eat travel',['be'],[
    example('Voy a estudiar.','S:YO|A:voy a|V:estudiar.','S:I|A:am going to|V:study.',["I'm going to study."]),
    example('Ella va a comer.','S:ELLA|A:va a|V:comer.','S:She|A:is going to|V:eat.',["She's going to eat."]),
    example('Vamos a viajar.','S:NOSOTROS|A:vamos a|V:viajar.','S:We|A:are going to|V:travel.',["We're going to travel."]),
  ],'I going to study.'),
  pattern(7,'there-it','Decir qué hay y qué es algo','HAY → THERE IS/ARE; para identificar algo: IT IS.','THERE anuncia lo que hay; IT señala algo que ya miras.','THERE no significa allí en THERE IS. El plural usa ARE. IT también aparece en It is raining.','book car red',['be','articles'],[
    example('Hay un libro.','A:HAY|C:un libro.','A:There is|C:a book.',["There's a book."]),
    example('Hay dos libros.','A:HAY|C:dos libros.','A:There are|C:two books.'),
    example('Es un coche rojo.','S:ESO|A:es|C:un coche rojo.','S:It|A:is|C:a red car.',["It's a red car."]),
  ],'There is two books.'),
  pattern(8,'wh-questions','Preguntar dónde, cuándo y quién','La palabra de pregunta abre la frase; después usa el ayudante que corresponde.','El periodista pregunta primero; el ayudante abre paso a la persona.','Si WHO es la persona que hace la acción, no añadimos DO: Who lives here?','live work here',['do-does'],[
    example('¿Dónde vives?','Q:¿Dónde|S:TÚ|V:vives?','Q:Where|A:do|S:you|V:live?'),
    example('¿Cuándo trabajas?','Q:¿Cuándo|S:TÚ|V:trabajas?','Q:When|A:do|S:you|V:work?'),
    example('¿Quién vive aquí?','Q:¿Quién|V:vive|C:aquí?','Q:Who|V:lives|C:here?'),
  ],'Where you live?'),
  pattern(9,'final-preposition','Conservar la pieza que completa la expresión','LOOK FOR significa buscar: al preguntar, FOR puede quedarse al final.','La preposición tímida espera al final, sin abandonar su verbo.','No todas las preguntas terminan en FOR. Aprende LOOK FOR, TALK ABOUT y WITH según su significado.','look key talk',['present-now','wh-questions'],[
    example('¿Qué estás buscando?','Q:¿Qué|A:estás|S:TÚ|V:buscando?','Q:What|A:are|S:you|V:looking for?'),
    example('¿Con quién estás?','C:¿Con|Q:quién|A:estás|S:TÚ?','Q:Who|A:are|S:you|C:with?'),
    example('¿De qué estás hablando?','C:¿De|Q:qué|A:estás|S:TÚ|V:hablando?','Q:What|A:are|S:you|V:talking|C:about?'),
  ],'What are you looking?'),
  pattern(10,'adjective-order','Describir lo que quieres sin cambiar el orden','Las cualidades van antes del objeto: opinión, tamaño, color y, al final, el nombre.','Las cualidades hacen cola delante del coche del niño.','Los adjetivos no llevan plural: two red cars. La lista completa incluye más categorías; aquí practicamos tamaño y color.','car big red small blue house old green bike',['articles'],[
    example('Un coche grande y rojo.','C:UN|V:grande|V:rojo|C:coche.','C:A|V:big|V:red|C:car.'),
    example('Una casa pequeña y azul.','C:UNA|V:pequeña|V:azul|C:casa.','C:A|V:small|V:blue|C:house.'),
    example('Una bicicleta vieja y verde.','C:UNA|V:vieja|V:verde|C:bicicleta.','C:An|V:old|V:green|C:bike.'),
  ],'A car red big.'),
  pattern(11,'articles','Elegir un, una y expresar plural','A/AN significan un/una; AN aparece delante de un sonido vocálico.','La N de AN une dos sonidos sin tropezar.','Decide por sonido, no por letra: an hour, a university. El plural no lleva A/AN y algunos plurales son irregulares.','friend idea car red',['possessives'],[
    example('Un amigo.','C:UN|V:amigo.','C:A|V:friend.'),
    example('Una idea.','C:UNA|V:idea.','C:An|V:idea.'),
    example('Dos coches rojos.','C:DOS|V:rojos|C:coches.','C:Two|V:red|C:cars.'),
  ],'An friend.'),
  pattern(12,'possessives','Decir de quién es algo','MI → MY; TU → YOUR; SU depende de quién sea: HIS, HER o THEIR.','La persona dueña deja su etiqueta sobre el objeto.','Los posesivos no cambian por el género del objeto: HER PHONE y HER CAR. THIS/THAT señalan cercanía, no propiedad.','phone book house',[],[
    example('Mi móvil.','S:MI|C:móvil.','S:My|C:phone.'),
    example('Su casa, de ella.','S:DE ELLA|C:la casa.','S:Her|C:house.'),
    example('Su libro, de él.','S:DE ÉL|C:el libro.','S:His|C:book.'),
  ],'She phone.'),
  pattern(13,'imperatives','Pedir que alguien haga una acción',"Para una instrucción, empieza por el verbo base; para impedirla, DON'T + verbo.",'La acción se pone al frente: OPEN. Para frenarla: DON’T.','Esta construcción es una excepción al sujeto explícito: Open the door no necesita YOU. PLEASE suaviza la petición.','come here open door touch',['do-does','articles'],[
    example('Ven aquí.','V:VEN|C:aquí.','V:Come|C:here.'),
    example('Abre la puerta.','V:ABRE|C:la puerta.','V:Open|C:the door.'),
    example('No toques.','N:NO|V:toques.','N:Do not|V:touch.',["Don't touch."]),
  ],'Opening the door.'),
  pattern(14,'frequency','Decir con qué frecuencia haces algo','ALWAYS/USUALLY se colocan antes de la acción, pero después de BE.','La frecuencia espera antes del verbo; BE le guarda un lugar después.','Esta guía no cubre todos los adverbios. SOMETIMES puede ir en más posiciones.','work here late cook',['simple-present','be'],[
    example('Siempre trabajo aquí.','S:YO|C:siempre|V:trabajo|C:aquí.','S:I|C:always|V:work|C:here.'),
    example('Él siempre llega tarde.','S:ÉL|A:está|C:siempre|V:tarde.','S:He|A:is|C:always|V:late.',["He's always late."]),
    example('Ella suele cocinar.','S:ELLA|C:habitualmente|V:cocina.','S:She|C:usually|V:cooks.'),
  ],'He always late.'),
  pattern(15,'past-simple','Contar algo que pasó y terminó','Con AYER, cuenta una acción pasada: PLAYED; los irregulares tienen una forma propia.','La máquina del tiempo cambia la acción: PLAY → PLAYED; GO → WENT.','No todos reciben ED: GO → WENT, EAT → ATE. ED puede sonar /t/, /d/ o /ɪd/.','play yesterday go home eat breakfast',['simple-present'],[
    example('Jugué ayer.','S:YO|V:jugué|C:ayer.','S:I|V:played|C:yesterday.'),
    example('Fui a casa.','S:YO|V:fui|C:a casa.','S:I|V:went|C:home.'),
    example('Ella desayunó.','S:ELLA|V:comió|C:el desayuno.','S:She|V:ate|C:breakfast.'),
  ],'I go home yesterday.'),
  pattern(16,'did','Preguntar y negar sobre el pasado','DID lleva el pasado; la acción vuelve a su forma base.','El portero DID recoge el pasado para que PLAY entre sin ED.','También ocurre con irregulares: Did you go?, no Did you went? BE conserva WAS/WERE sin DID.','play work eat breakfast yesterday',['past-simple','do-does'],[
    example('¿Jugaste ayer?','A:¿[DID]|S:TÚ|V:jugaste|C:ayer?','A:Did|S:you|V:play|C:yesterday?'),
    example('No trabajé ayer.','S:YO|N:no|V:trabajé|C:ayer.','S:I|N:did not|V:work|C:yesterday.',["I didn't work yesterday."]),
    example('¿Desayunaste?','A:¿[DID]|S:TÚ|V:comiste|C:el desayuno?','A:Did|S:you|V:eat|C:breakfast?'),
  ],'Did you played yesterday?'),
  pattern(17,'was-were','Decir cómo estabas o dónde estabas','I/HE/SHE/IT llevan WAS; YOU/WE/THEY llevan WERE.','La pieza azul cambia de época: AM → WAS; ARE → WERE.','Para preguntar, WAS/WERE se ponen delante: Were you here? No añadas DID.','tired here home',['be','past-simple'],[
    example('Estaba cansado.','S:YO|A:estaba|V:cansado.','S:I|A:was|V:tired.'),
    example('Estaban aquí.','S:ELLOS|A:estaban|C:aquí.','S:They|A:were|C:here.'),
    example('¿Estabas en casa?','A:¿Estabas|S:TÚ|C:en casa?','A:Were|S:you|C:at home?'),
  ],'They was here.'),
  pattern(18,'past-continuous','Contar qué estaba pasando','ESTABA + ANDO/IENDO → WAS/WERE + acción con ING.','La película del pasado mantiene la acción en marcha.','Cocinaba puede ser WAS COOKING, COOKED o USED TO COOK según el contexto; no existe equivalencia universal por terminación.','cook call work play',['was-were','present-now'],[
    example('Estaba cocinando cuando llamaste.','S:YO|A:estaba|V:cocinando|C:cuando llamaste.','S:I|A:was|V:cooking|C:when you called.'),
    example('Ella estaba trabajando.','S:ELLA|A:estaba|V:trabajando.','S:She|A:was|V:working.'),
    example('Estaban jugando.','S:ELLOS|A:estaban|V:jugando.','S:They|A:were|V:playing.'),
  ],'I was cook.'),
  pattern(19,'obligation','Distinguir necesidad y consejo','HAVE TO expresa tengo que; SHOULD expresa deberías como consejo.','La obligación empuja la acción; el consejo solo señala un camino.',"MUST no significa siempre una obligación más fuerte: también expresa deducción. MUST NOT prohíbe; DON'T HAVE TO no obliga.",'go call leave',['can','do-does'],[
    example('Tengo que ir.','S:YO|A:tengo que|V:ir.','S:I|A:have to|V:go.'),
    example('Deberías llamar.','S:TÚ|A:deberías|V:llamar.','S:You|A:should|V:call.'),
    example('Debo marcharme.','S:YO|A:debo|V:marcharme.','S:I|A:must|V:leave.'),
  ],'You should to call.'),
  pattern(20,'will','Ofrecerte y prometer una acción',"Para ofrecerte ahora: I WILL + verbo base; al hablar, I'LL.",'La promesa firma con WILL y deja el verbo como estaba.','WILL también hace predicciones. GOING TO se usa para planes e indicios: no son una división universal de todo futuro.','help cook dinner call tomorrow',['can','going-to'],[
    example('Te ayudaré.','S:YO|C:te|V:ayudaré.','S:I|A:will|V:help|C:you.',["I'll help you."]),
    example('Yo cocinaré la cena.','S:YO|V:cocinaré|C:la cena.','S:I|A:will|V:cook|C:dinner.',["I'll cook dinner."]),
    example('Te llamaré mañana.','S:YO|C:te|V:llamaré|C:mañana.','S:I|A:will|V:call|C:you tomorrow.',["I'll call you tomorrow."]),
  ],'I will cooking dinner.'),
  pattern(21,'used-to','Contar algo que antes hacías o eras','ANTES, PERO AHORA NO → USED TO + verbo base.','El abuelo guarda su rutina antigua en USED TO.','No todo jugaba lleva USED TO. Aquí indica una costumbre o estado pasado que ya cambió. Con DID: Did you use to…?','live work here play soccer',['past-simple','did'],[
    example('Antes vivía aquí.','S:YO|A:antes solía|V:vivir|C:aquí.','S:I|A:used to|V:live|C:here.'),
    example('Antes trabajaba aquí.','S:YO|A:antes solía|V:trabajar|C:aquí.','S:I|A:used to|V:work|C:here.'),
    example('Antes jugaba al fútbol.','S:YO|A:antes solía|V:jugar|C:al fútbol.','S:I|A:used to|V:play|C:soccer.'),
  ],'I used to playing soccer.'),
  pattern(22,'prepositions','Situar acciones en tiempo y lugar','ON coloca un día; IN un mes o un espacio; AT un punto concreto.','ON pisa el día, IN entra en el mes y AT marca un punto.','Es una orientación, no el = ON y en = IN: AT NIGHT, ON THE BUS, IN THE CAR. Las expresiones se aprenden juntas.','monday may five room table station',['be'],[
    example('El lunes.','C:EL|V:lunes.','A:On|V:Monday.'),
    example('En mayo.','C:EN|V:mayo.','A:In|V:May.'),
    example('A las cinco.','C:A LAS|V:cinco.','A:At|V:five.'),
    example('En la habitación.','C:EN|V:la habitación.','A:In|V:the room.'),
    example('Sobre la mesa.','C:SOBRE|V:la mesa.','A:On|V:the table.'),
    example('En la estación.','C:EN|V:la estación.','A:At|V:the station.'),
  ],'In Monday.'),
  pattern(23,'comparisons','Comparar y elegir el más grande','MÁS GRANDE QUE → BIGGER THAN; EL MÁS GRANDE → THE BIGGEST.','La comparación añade ER; el ganador recibe EST.','Los adjetivos largos suelen usar MORE/MOST: more interesting. Hay irregulares: good → better → best.','car big small interesting',['adjective-order','be'],[
    example('Este coche es más grande que aquel.','S:ESTE coche|A:es|V:más grande que|C:aquel.','S:This car|A:is|V:bigger than|C:that one.'),
    example('Es el coche más pequeño.','S:ESO|A:es|V:el más pequeño|C:coche.','S:It|A:is|V:the smallest|C:car.',["It's the smallest car."]),
    example('Esto es más interesante.','S:ESTO|A:es|V:más interesante.','S:This|A:is|V:more interesting.'),
  ],'This car is more bigger.'),
  pattern(24,'intensity','Decir cuánto sin confundir mucho y demasiado','VERY intensifica; TOO señala exceso; QUITE suele matizar.','El volumen sube con VERY; TOO supera lo que necesitas.','TOO no significa muy: It is too hot implica calor excesivo. QUITE cambia de fuerza según adjetivo, contexto y variedad del inglés.','tired hot good',['be'],[
    example('Estoy muy cansado.','S:YO|A:estoy|C:muy|V:cansado.','S:I|A:am|C:very|V:tired.',["I'm very tired."]),
    example('Está demasiado caliente.','S:ESO|A:está|C:demasiado|V:caliente.','S:It|A:is|C:too|V:hot.',["It's too hot."]),
    example('Está bastante bien.','S:ESO|A:está|C:bastante|V:bien.','S:It|A:is|C:quite|V:good.',["It's quite good."]),
  ],'I am very too tired.'),
  pattern(25,'connectors','Unir lo que dices con una razón o contraste','AND añade, BUT contrasta, BECAUSE da una razón.','Los conectores enganchan vagones sin cambiar sus piezas.','ALTHOUGH ya marca contraste: Although it rains, I go out; no añadir BUT en esta misma estructura.','cook eat work tired hungry',['simple-present','be'],[
    example('Cocino y como.','S:YO|V:cocino|C:y|V:como.','S:I|V:cook|C:and|V:eat.'),
    example('Trabajo, pero estoy cansado.','S:YO|V:trabajo,|C:pero|S:YO|A:estoy|V:cansado.','S:I|V:work,|C:but|S:I|A:am|V:tired.'),
    example('Como porque tengo hambre.','S:YO|V:como|C:porque|S:YO|A:estoy|V:hambriento.','S:I|V:eat|C:because|S:I|A:am|V:hungry.'),
  ],'Although I am tired, but I work.'),
  pattern(26,'verb-partners','Saber qué pieza pide el verbo anterior','WANT pide TO + acción; ENJOY pide acción con ING.','Cada verbo elige compañero: WANT TO, ENJOY ING.','LIKE admite playing y to play con matices. Ver un infinitivo español no basta para añadir TO: CAN PLAY no lo lleva.','want enjoy like play',['can','simple-present'],[
    example('Quiero jugar.','S:YO|A:quiero|C:[TO]|V:jugar.','S:I|A:want|C:to|V:play.'),
    example('Disfruto jugando.','S:YO|A:disfruto|V:jugando.','S:I|A:enjoy|V:playing.'),
    example('Me gusta jugar.','S:A MÍ|A:me gusta|V:jugar.','S:I|A:like|V:playing.', ['I like to play.']),
  ],'I want playing.'),
  pattern(27,'quantity','Hablar de cosas que cuentas y cosas que mides','MANY cuenta elementos; MUCH mide una cantidad; SOME expresa algo de.','MANY cuenta vasos; MUCH mide el agua que contienen.','WATER e INFORMATION no llevan A ni plural en estos usos. En afirmaciones cotidianas es frecuente A LOT OF en lugar de MUCH.','water friend time',['articles','do-does'],[
    example('Tengo algo de agua.','S:YO|V:tengo|C:algo de|V:agua.','S:I|V:have|C:some|V:water.'),
    example('Tengo muchos amigos.','S:YO|V:tengo|C:muchos|V:amigos.','S:I|V:have|C:many|V:friends.'),
    example('No tengo mucho tiempo.','S:YO|N:no|V:tengo|C:mucho|V:tiempo.','S:I|N:do not|V:have|C:much|V:time.',["I don't have much time."]),
  ],'I have many water.'),
  pattern(28,'present-perfect','Conectar algo hecho con el presente','HE hecho → I HAVE + forma de hecho: FINISHED, EATEN.','HAVE trae al presente lo que ya has hecho.','Con un momento pasado cerrado como yesterday usa pasado simple. TODAY no obliga siempre a usar perfecto; depende del contexto y variedad.','finish eat travel already',['past-simple','did'],[
    example('He terminado.','S:YO|A:he|V:terminado.','S:I|A:have|V:finished.',["I've finished."]),
    example('Ya he comido.','S:YO|A:he|C:ya|V:comido.','S:I|A:have|C:already|V:eaten.',["I've already eaten."]),
    example('¿Has viajado alguna vez?','A:¿Has|S:TÚ|C:alguna vez|V:viajado?','A:Have|S:you|C:ever|V:travelled?', ['Have you ever traveled?']),
  ],'I have finished yesterday.'),
  pattern(29,'perfect-continuous','Decir cuánto llevas haciendo algo','LLEVO haciendo → I HAVE BEEN + acción con ING.','HAVE BEEN sostiene una acción que viene de antes.','FOR indica duración y SINCE el punto de inicio. No se usa el continuo con todos los verbos; la actividad puede seguir o acabar de parar.','wait hour work study monday',['present-perfect','present-now','prepositions'],[
    example('Llevo una hora esperando.','S:YO|A:he estado|V:esperando|C:durante una hora.','S:I|A:have been|V:waiting|C:for an hour.',["I've been waiting for an hour."]),
    example('Ella lleva dos horas trabajando.','S:ELLA|A:ha estado|V:trabajando|C:durante dos horas.','S:She|A:has been|V:working|C:for two hours.',["She's been working for two hours."]),
    example('Llevo estudiando desde el lunes.','S:YO|A:he estado|V:estudiando|C:desde el lunes.','S:I|A:have been|V:studying|C:since Monday.',["I've been studying since Monday."]),
  ],'I have been wait for an hour.'),
  pattern(30,'first-conditional','Decir qué harás si ocurre algo','SI pasa algo → IF + presente; después WILL + acción.','IF pone la condición; WILL espera el resultado al otro lado.','En este patrón básico no ponemos WILL tras IF. Hay otros usos especiales de IF y WILL que se enseñan después.','study pass rain stay home call answer',['will','simple-present'],[
    example('Si estudio, aprobaré.','C:SI|S:YO|V:estudio,|S:YO|V:aprobaré.','C:If|S:I|V:study,|S:I|A:will|V:pass.',["If I study, I'll pass."]),
    example('Si llueve, me quedaré en casa.','C:SI|V:llueve,|S:YO|V:me quedaré|C:en casa.','C:If|S:it|V:rains,|S:I|A:will|V:stay|C:home.',["If it rains, I'll stay home."]),
    example('Si llamas, responderé.','C:SI|S:TÚ|V:llamas,|S:YO|V:responderé.','C:If|S:you|V:call,|S:I|A:will|V:answer.',["If you call, I'll answer."]),
  ],'If I will study, I will pass.'),
  pattern(31,'second-conditional','Imaginar qué harías si las cosas fueran distintas','SI imaginario usa pasado; el resultado lleva WOULD + verbo base.','El burro imagina tener tiempo y el otro vagón dice WOULD.','Este pasado no cuenta algo pasado. Enseñamos If I were rich; If I was rich también se oye y se acepta en registro informal.','have time study rich buy house know help',['past-simple','was-were','will'],[
    example('Si tuviera tiempo, estudiaría.','C:SI|S:YO|V:tuviera tiempo,|S:YO|V:estudiaría.','C:If|S:I|V:had time,|S:I|A:would|V:study.',["If I had time, I'd study."]),
    example('Si fuera rico, compraría una casa.','C:SI|S:YO|A:fuera|C:rico,|S:YO|V:compraría|C:una casa.','C:If|S:I|A:were|C:rich,|S:I|A:would|V:buy|C:a house.', ['If I was rich, I would buy a house.',"If I were rich, I'd buy a house."]),
    example('Si ella lo supiera, ayudaría.','C:SI|S:ELLA|V:lo supiera,|S:ELLA|V:ayudaría.','C:If|S:she|V:knew,|S:she|A:would|V:help.',["If she knew, she'd help."]),
  ],'If I would have time, I would study.'),
  pattern(32,'third-conditional','Imaginar un resultado distinto de algo que ya pasó','SI HUBIERA hecho → IF + HAD + hecho; HABRÍA hecho → WOULD HAVE + hecho.','Dos vagones miran atrás: HAD preparado, WOULD HAVE terminado.','No es Si tuviera del presente imaginario. En este patrón, WOULD va en el resultado, no en la condición.','study pass leave early arrive time call answer',['second-conditional','present-perfect'],[
    example('Si hubiera estudiado, habría aprobado.','C:SI|S:YO|A:hubiera|V:estudiado,|S:YO|A:habría|V:aprobado.','C:If|S:I|A:had|V:studied,|S:I|A:would have|V:passed.',["If I had studied, I'd have passed."]),
    example('Si hubiéramos salido antes, habríamos llegado a tiempo.','C:SI|S:NOSOTROS|A:hubiéramos|V:salido antes,|S:NOSOTROS|A:habríamos|V:llegado a tiempo.','C:If|S:we|A:had|V:left earlier,|S:we|A:would have|V:arrived on time.'),
    example('Si ella hubiera llamado, yo habría contestado.','C:SI|S:ELLA|A:hubiera|V:llamado,|S:YO|A:habría|V:contestado.','C:If|S:she|A:had|V:called,|S:I|A:would have|V:answered.'),
  ],'If I would have studied, I would have passed.'),
  pattern(33,'passive','Contar qué le ocurrió a algo sin centrarte en quién lo hizo','El objeto que recibe la acción va delante: BE + forma de hecho.','El objeto se sienta en el lugar de la persona que actuó.','BY indica quién hizo la acción si importa. Muchos verbos tienen forma irregular: broken, no breaked.','car fix window break room clean day',['be','was-were','present-perfect'],[
    example('Se reparó el coche.','S:EL coche|A:fue|V:reparado.','S:The car|A:was|V:fixed.'),
    example('Se rompió la ventana.','S:LA ventana|A:fue|V:rota.','S:The window|A:was|V:broken.'),
    example('La habitación se limpia todos los días.','S:LA habitación|A:es|V:limpiada|C:todos los días.','S:The room|A:is|V:cleaned|C:every day.'),
  ],'The window was breaked.'),
  pattern(34,'relatives','Decir cuál persona u objeto quieres','WHO une una persona con lo que hace; THAT/WHICH ayudan a identificar cosas.','WHO y THAT pegan una descripción al nombre.','En las relativas de identificación, THAT puede sustituir a WHO. Con comas se aplican otras reglas; no borrar la pieza cuando es sujeto.','boy live here book want bike red',['simple-present','possessives'],[
    example('El chico que vive aquí.','C:EL chico|Q:que|V:vive|C:aquí.','C:The boy|Q:who|V:lives|C:here.', ['The boy that lives here.']),
    example('El libro que quiero.','C:EL libro|Q:que|S:YO|V:quiero.','C:The book|Q:that|S:I|V:want.', ['The book which I want.', 'The book I want.']),
    example('La bicicleta que es roja.','C:LA bicicleta|Q:que|A:es|V:roja.','C:The bike|Q:which|A:is|V:red.', ['The bike that is red.']),
  ],'The boy which lives here.'),
  pattern(35,'tags','Confirmar algo con un pequeño eco al final','Para confirmar, repite el ayudante y la persona, cambiando afirmación por negación o al revés.','El eco devuelve el ayudante con la intención invertida.',"Aquí practicamos confirmación básica. La entonación y otras clases de tag cambian el matiz; no todo verdad se traduce como ISN'T IT.",'cold work here swim',['do-does','can','be'],[
    example('Hace frío, ¿verdad?','A:HACE|V:frío,|Q:¿no es así?',"S:It|A:is|V:cold,|N:isn't|S:it?", ["It's cold, isn't it?"]),
    example('Trabajas aquí, ¿verdad?','S:TÚ|V:trabajas|C:aquí,|Q:¿no es así?',"S:You|V:work|C:here,|N:don't|S:you?"),
    example('Ella no sabe nadar, ¿verdad?','S:ELLA|N:no puede|V:nadar,|Q:¿puede?','S:She|N:cannot|V:swim,|A:can|S:she?', ["She can't swim, can she?"]),
  ],'You work here, is not it?'),
  pattern(36,'reported-speech','Contar lo que otra persona dijo','Al contar algo después, ajusta persona y momento: dijo voy → SHE SAID SHE WAS GOING.','El mensaje viaja y cambia las etiquetas de persona y tiempo.','El tiempo no retrocede siempre: puede mantenerse si lo dicho sigue vigente. Las preguntas indirectas no conservan la inversión.','say go work here call',['past-simple','was-were','going-to','will'],[
    example('Ella dijo que iba a estudiar.','S:ELLA|V:dijo|C:que|S:ELLA|A:iba a|V:estudiar.','S:She|V:said|C:that|S:she|A:was going to|V:study.', ['She said she was going to study.']),
    example('Él dijo que trabajaba aquí.','S:ÉL|V:dijo|C:que|S:ÉL|V:trabajaba|C:aquí.','S:He|V:said|C:that|S:he|V:worked|C:here.', ['He said he worked here.']),
    example('Ella dijo que llamaría.','S:ELLA|V:dijo|C:que|S:ELLA|V:llamaría.','S:She|V:said|C:that|S:she|A:would|V:call.', ['She said she would call.']),
  ],'She said that she will called.'),
];

export function curriculumAnswer(example: CurriculumExample, value: string): boolean {
  return example.answers.some((answer) => normalizeSentenceAnswer(answer) === normalizeSentenceAnswer(value));
}
export function validateGrammarCurriculum(patterns: CurriculumPattern[]): void {
  const byId = new Map(patterns.map((item) => [item.id, item]));
  if (byId.size !== patterns.length || new Set(patterns.map((item) => item.number)).size !== patterns.length) throw new Error('Fichas duplicadas.');
  for (const item of patterns) {
    if (!item.goal || !item.rule || !item.memoryCue || !item.caution || item.examples.length < 3 || !item.vocabulary.length || !item.wrong) throw new Error(`Ficha incompleta: ${item.id}`);
    if (item.rule.split(/\s+/).length > 35) throw new Error(`Truco demasiado largo: ${item.id}`);
    for (const sample of item.examples) {
      if (!sample.natural || !sample.mirror.length || !sample.english.length || !curriculumAnswer(sample, sample.english.map((piece) => piece.text).join(' '))) throw new Error(`Ejemplo incompleto: ${item.id}`);
    }
    if (item.prerequisites.some((id) => !byId.has(id) || id === item.id)) throw new Error(`Dependencia desconocida: ${item.id}`);
    const visit = (id: string, path: string[]) => {
      if (path.includes(id)) throw new Error(`Ciclo curricular: ${path.join(' → ')} → ${id}`);
      byId.get(id)!.prerequisites.forEach((parent) => visit(parent, [...path, id]));
    };
    visit(item.id, []);
  }
}

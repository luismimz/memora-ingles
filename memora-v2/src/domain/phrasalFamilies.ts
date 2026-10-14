import type { AtomicWord } from './unit';
export interface PhrasalDiscovery { particle: string; particleMeaning: string; meaning: string; association: string; sentence: string; translation: string; sense: 'literal' | 'idiomatic' }
export interface PhrasalFamily { base: string; word: AtomicWord; discoveries: PhrasalDiscovery[] }
const base = (en: string, es: string, ipa: string, bridge: string, scene: string, emojis: [string, string]): AtomicWord => ({ id: 1, en, es, ipa, bridge, scene, emojis, status: 'needs_review' });
/** Editorial lab: sense-specific stories, never a claim that a particle always
 * translates literally or that these expressions are already mastered. */
export const phrasalFamilies: PhrasalFamily[] = [
  { base: 'TURN', word: base('TURN', 'girar', '/tɜːrn/', 'TURNO', 'Esperas tu TURNO en el semáforo para GIRAR.', ['🚦', '🔄']), discoveries: [
    { particle: 'ON', particleMeaning: 'activación', meaning: 'encender', association: 'En tu TURNO, un giro ENCIENDE un semáforo del tamaño de una casa.', sentence: 'Turn on the light.', translation: 'Enciende la luz.', sense: 'literal' },
    { particle: 'OFF', particleMeaning: 'desactivación', meaning: 'apagar', association: 'En tu TURNO, giras un interruptor gigante y APAGAS el semáforo.', sentence: 'Turn off the light.', translation: 'Apaga la luz.', sense: 'literal' },
    { particle: 'UP', particleMeaning: 'aumento', meaning: 'subir el volumen', association: 'En tu TURNO, giras el mando hacia arriba: el VOLUMEN levanta el techo.', sentence: 'Turn up the music.', translation: 'Sube el volumen de la música.', sense: 'idiomatic' },
    { particle: 'DOWN', particleMeaning: 'disminución', meaning: 'bajar el volumen', association: 'En tu TURNO, giras el mando hacia abajo y BAJAS EL VOLUMEN hasta dormir al techo.', sentence: 'Turn down the music.', translation: 'Baja el volumen de la música.', sense: 'idiomatic' },
    { particle: 'BACK', particleMeaning: 'regreso', meaning: 'dar la vuelta / volver', association: 'En tu TURNO, el semáforo se da la vuelta y te obliga a VOLVER.', sentence: 'Turn back now.', translation: 'Da la vuelta ahora.', sense: 'literal' },
    { particle: 'INTO', particleMeaning: 'transformación, en este uso', meaning: 'convertirse en', association: 'En tu TURNO, giras dentro de un portal y te CONVIERTES EN mariposa.', sentence: 'Turn into a butterfly.', translation: 'Conviértete en una mariposa.', sense: 'idiomatic' },
    { particle: 'OUT', particleMeaning: 'resultado, en este uso', meaning: 'salir / resultar (bien)', association: 'Después de tu TURNO, sale una tarta del semáforo: todo RESULTA BIEN.', sentence: 'It turned out fine.', translation: 'Salió bien.', sense: 'idiomatic' },
    { particle: 'OVER', particleMeaning: 'giro al otro lado', meaning: 'dar la vuelta a algo', association: 'En tu TURNO, una carta gigante GIRA y muestra el otro lado.', sentence: 'Turn over the card.', translation: 'Dale la vuelta a la carta.', sense: 'literal' },
  ] },
  { base: 'GET', word: base('GET', 'conseguir', '/ɡet/', 'GUETO', 'Un GUETO volador baja para CONSEGUIR una llave gigante.', ['🏘️', '🔑']), discoveries: [
    { particle: 'UP', particleMeaning: 'arriba', meaning: 'levantarse', association: 'El GUETO levanta tu cama hacia arriba y te obliga a LEVANTARTE.', sentence: 'I get up early.', translation: 'Me levanto temprano.', sense: 'idiomatic' },
    { particle: 'IN', particleMeaning: 'dentro', meaning: 'entrar (en un coche)', association: 'El GUETO se encoge y ENTRA contigo en un coche de juguete.', sentence: 'Get in the car.', translation: 'Entra en el coche.', sense: 'literal' },
    { particle: 'OUT', particleMeaning: 'fuera', meaning: 'salir', association: 'El GUETO estornuda y te lanza fuera: necesitas SALIR.', sentence: 'Get out of the car.', translation: 'Sal del coche.', sense: 'literal' },
    { particle: 'BACK', particleMeaning: 'regreso', meaning: 'volver', association: 'El GUETO lleva tu casa a cuestas y VUELVE contigo al punto de partida.', sentence: 'I get back at six.', translation: 'Vuelvo a las seis.', sense: 'literal' },
  ] },
  { base: 'GO', word: base('GO', 'ir', '/ɡoʊ/', 'GOTA', 'Una GOTA gigante te lleva para IR a la calle.', ['💧', '🚶']), discoveries: [
    { particle: 'OUT', particleMeaning: 'fuera', meaning: 'salir', association: 'Una GOTA atraviesa la puerta y te arrastra para SALIR.', sentence: 'I go out at night.', translation: 'Salgo por la noche.', sense: 'literal' },
    { particle: 'BACK', particleMeaning: 'regreso', meaning: 'volver', association: 'La GOTA rebota hacia atrás y te hace VOLVER a casa.', sentence: 'Go back home.', translation: 'Vuelve a casa.', sense: 'literal' },
    { particle: 'ON', particleMeaning: 'continuación, en este uso', meaning: 'continuar', association: 'La GOTA cae sobre una cinta infinita que te obliga a CONTINUAR.', sentence: 'Go on, please.', translation: 'Continúa, por favor.', sense: 'idiomatic' },
    { particle: 'AWAY', particleMeaning: 'alejamiento', meaning: 'irse / alejarse', association: 'La GOTA se convierte en río y te hace ALEJARTE de la puerta.', sentence: 'Go away.', translation: 'Vete.', sense: 'literal' },
  ] },
  { base: 'TAKE', word: base('TAKE', 'tomar / coger', '/teɪk/', 'TECLA', 'Una TECLA salta para COGER tu abrigo con dientes.', ['⌨️', '🧥']), discoveries: [
    { particle: 'OFF', particleMeaning: 'retirada, en este uso', meaning: 'quitarse (ropa)', association: 'Una TECLA se engancha al abrigo y te ayuda a QUITÁRTELO.', sentence: 'Take off your coat.', translation: 'Quítate el abrigo.', sense: 'idiomatic' },
    { particle: 'AWAY', particleMeaning: 'alejamiento', meaning: 'llevarse', association: 'Una TECLA carga una taza y se la LLEVA corriendo.', sentence: 'Take this cup away.', translation: 'Llévate esta taza.', sense: 'literal' },
    { particle: 'BACK', particleMeaning: 'devolución', meaning: 'devolver', association: 'Una TECLA corre hacia atrás para DEVOLVER un libro gigante.', sentence: 'Take the book back.', translation: 'Devuelve el libro.', sense: 'literal' },
    { particle: 'OUT', particleMeaning: 'hacia fuera', meaning: 'sacar', association: 'Una TECLA atraviesa la bolsa y SACA todos los libros disparados.', sentence: 'Take out the book.', translation: 'Saca el libro.', sense: 'literal' },
  ] },
];

export function validatePhrasalFamilies(families: PhrasalFamily[]): void {
  const bases = new Set<string>();
  for (const family of families) {
    if (bases.has(family.base) || !family.word.bridge || !family.word.scene.includes(family.word.bridge) || !family.discoveries.length) throw new Error('Familia incompleta o repetida.');
    bases.add(family.base);
    const particles = new Set<string>();
    for (const item of family.discoveries) {
      if (particles.has(item.particle) || !item.association.includes(family.word.bridge) || !item.meaning || !item.translation || !item.sentence || !['literal', 'idiomatic'].includes(item.sense)) throw new Error(`Revisar ${family.base} ${item.particle}.`);
      particles.add(item.particle);
    }
  }
}

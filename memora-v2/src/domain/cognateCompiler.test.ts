import { describe, expect, it } from 'vitest';
// @ts-expect-error Editorial CLI is JavaScript and has no runtime side effects on import.
import { arpaToIPA, readCmu, compileCognates } from '../../scripts/compile-cognates.mjs';
describe('pronunciación documentada y candidatos no publicados', () => {
  it('usa fonemas CMU y conserva la reducción y el acento', () => {
    expect(arpaToIPA(['B','AE1','G'])).toBe('/bæɡ/');
    expect(arpaToIPA(['K','AH0','N','T','EH1','N','T'])).toBe('/kənˈtɛnt/');
    expect(arpaToIPA(['IH2','N','F','ER0','M','EY1','SH','AH0','N'])).toBe('/ˌɪnfɚˈmeɪʃən/');
    expect(() => arpaToIPA(['UNKNOWN','AE1'])).toThrow();
  });
  it('no convierte falsos amigos, duplicados ni palabras sin sonido en contenido listo', () => {
    const source = { entries: [['bag','bolsa','This bag is small.','Esta bolsa es pequeña.','casa','No cognado: excluir.'], ['idea','idea','It is an idea.','Es una idea.','casa','Concepto.'], ['actual','real','The actual cost is high.','El coste real es alto.','trabajo','Falso amigo: excluir.'], ['unknownword','algo','Unknownword is here.','Algo está aquí.','casa','Candidato.']] };
    const dictionary = readCmu('idea AY0 D IY1 AH0\nactual AE1 K CH AH0 W AH0 L');
    const result = compileCognates(source, dictionary);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].status).toBe('needs_review');
    expect(result.held).toHaveLength(3);
    expect(compileCognates(source, dictionary, [{ en: 'IDEA' }]).entries).toHaveLength(0);
  });
});

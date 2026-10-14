import examples from '../../content/review-examples.json';
import keys from '../../content/keys-mission.json';
import mirror from '../../content/mirror-now.json';
import world1Extra from '../../content/world1-extra.json';
import kitchenExtra from '../../content/world1-kitchen-extra.json';
import bedroomExtra from '../../content/world1-bedroom-extra.json';
import { validateUnit } from '../domain/unit';

/** Borradores revisables por el administrador; el alumno solo recibe unidades publicadas desde Directus. */
// La ficha que enseña a reconocer la pregunta va antes de las escenas que la reutilizan.
export const reviewUnits = [examples[0], mirror, examples[1], keys, bedroomExtra, kitchenExtra, ...world1Extra].map(validateUnit);
export const previewUnit = reviewUnits[0];

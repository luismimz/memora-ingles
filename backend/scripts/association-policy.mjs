export function assertApprovedAssociation(word, item) {
  const fail = (reason) => { throw new Error(`${word}: ${reason}`); };
  if (!item || item.status !== 'approved') fail('asociación pendiente de revisión editorial');
  const modes = ['acoustic_bridge', 'cognate'];
  if (!modes.includes(item.associationMode)) fail('la ruta de asociación no es válida');
  if (item.associationMode === 'acoustic_bridge') {
    if (!item.bridge?.trim()) fail('falta un puente acústico');
    const evidence = item.bridgeEvidence;
    if (!evidence || evidence.spanishCue !== item.bridge || !evidence.familiarMeaning?.trim() || !evidence.soundRelation?.trim()) fail('falta documentar el referente español real y su relación sonora');
    if (evidence.cueType !== 'spanish_word' && evidence.cueType !== 'spanish_expression') fail('el puente debe ser una palabra o expresión española real');
  } else if (item.bridge?.trim() || item.bridgeEvidence) {
    fail('una ruta alternativa no puede declarar un puente acústico');
  }
  if (item.associationMode === 'cognate') {
    if (item.cognateEvidence?.sameMeaning !== true || !item.cognateEvidence?.note?.trim() || !item.usageExample?.en?.trim() || !item.usageExample?.es?.trim()) fail('el cognado necesita equivalencia semántica revisada y un ejemplo bilingüe');
  }
  if (!item.editorialReview || item.editorialReview.verdict !== 'approved' || !item.editorialReview.reviewedBy?.trim() || !item.editorialReview.reason?.trim()) fail('falta la revisión editorial del puente y de la historia');
  if (item.associationMode === 'cognate') return;
  if (!item.anchor?.trim()) fail('falta el ancla de la asociación');
  if (item.associationMode === 'acoustic_bridge' && !item.anchor.includes(item.bridge)) fail('la historia no contiene el puente');
  if (!item.meaningTerms?.length || !item.meaningTerms.every((term) => item.anchor.includes(term))) fail('la historia no muestra el significado');
}

const KEYWORDS = [
  'cv',
  'curriculum',
  'currículum',
  'postulacion',
  'postulación',
  'empleo',
  'búsqueda laboral',
  'busqueda laboral',
  'me postulo',
  'postularme',
  'adjunto mi cv',
  'envío mi cv',
  'envio mi cv',
  'rrhh',
  'recursos humanos',
  'diseñador',
  'diseñadora',
  'community manager',
  'analista'
];

function isCvEmail({ subject = '', text = '', attachments = [] }) {

  const content = `${subject} ${text}`.toLowerCase();

  // ¿El asunto o mensaje contiene palabras relacionadas
  // con una postulación?
  const keywordMatch = KEYWORDS.some((word) =>
    content.includes(word)
  );

  // ¿Tiene un documento que podría ser un CV?
  const documentAttachment = attachments.some((attachment) => {

    const filename = (attachment.filename || '').toLowerCase();

    return /\.(pdf|doc|docx)$/.test(filename);

  });

  // Si dice claramente CV/postulación, lo consideramos CV.
  if (keywordMatch) {
    return true;
  }

  // Si solamente tiene un documento pero no hay ninguna
  // referencia laboral, todavía NO respondemos automáticamente.
  if (documentAttachment) {
    return false;
  }

  return false;
}

module.exports = { isCvEmail };
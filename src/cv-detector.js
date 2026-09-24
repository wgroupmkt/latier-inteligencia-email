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

function isCvEmail({
  subject = '',
  text = '',
  attachments = []
}) {
  const normalizedSubject =
    subject.toLowerCase().trim();

  // Evitar que una respuesta a nuestra confirmación
  // sea detectada nuevamente como una postulación.
  if (
    normalizedSubject.includes(
      'hemos recibido tu cv - lantier business group'
    )
  ) {
    return false;
  }

  const content =
    `${subject} ${text}`.toLowerCase();

  const keywordMatch =
    KEYWORDS.some((word) =>
      content.includes(word)
    );

  const documentAttachment =
    attachments.some((attachment) => {
      const filename = (
        attachment.filename || ''
      ).toLowerCase();

      return /\.(pdf|doc|docx)$/.test(
        filename
      );
    });

  if (keywordMatch) {
    return true;
  }

  if (documentAttachment) {
    return false;
  }

  return false;
}

module.exports = {
  isCvEmail
};
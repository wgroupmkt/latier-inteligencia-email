function classifyCv({ subject = '', text = '', attachments = [] }) {
  const attachmentNames = attachments
    .map((a) => a.filename || '')
    .join(' ');

  const content = `${subject} ${text} ${attachmentNames}`.toLowerCase();

  const categories = [
    {
      category: 'Community Manager',
      keywords: [
        'community manager',
        'community',
        'social media',
        'redes sociales',
        'content creator'
      ]
    },
    {
      category: 'Diseño',
      keywords: [
        'diseñador',
        'diseñadora',
        'diseño gráfico',
        'diseño grafico',
        'graphic designer',
        'diseño'
      ]
    },
    {
      category: 'RRHH',
      keywords: [
        'rrhh',
        'recursos humanos',
        'recursos humanos',
        'selección de personal',
        'seleccion de personal',
        'recruiter'
      ]
    },
    {
      category: 'Administración',
      keywords: [
        'administrativo',
        'administrativa',
        'administración',
        'administracion',
        'auxiliar administrativo',
        'secretaria'
      ]
    },
    {
      category: 'Comercial / Ventas',
      keywords: [
        'ventas',
        'vendedor',
        'vendedora',
        'comercial',
        'asesor comercial',
        'ejecutivo comercial'
      ]
    },
    {
      category: 'Analista',
      keywords: [
        'analista',
        'analyst'
      ]
    }
  ];

  for (const item of categories) {
    const found = item.keywords.some((keyword) =>
      content.includes(keyword)
    );

    if (found) {
      return item.category;
    }
  }

  return 'Otro';
}

module.exports = {
  classifyCv
};
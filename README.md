# Lantier Email Automation

Primera versión del sistema para detectar postulaciones/CV recibidos en `capitalhumano@lantier.com.ar` y posteriormente responder automáticamente.

## 1. Instalar

```bash
npm install
```

## 2. Configurar credenciales

Copiar `.env.example` como `.env` y reemplazar únicamente la contraseña:

```env
EMAIL_USER=capitalhumano@lantier.com.ar
EMAIL_PASSWORD=TU_CONTRASEÑA
IMAP_HOST=mail.lantier.com.ar
IMAP_PORT=993
SMTP_HOST=mail.lantier.com.ar
SMTP_PORT=465
```

No compartas `.env` ni lo subas a GitHub.

## 3. Probar IMAP

```bash
npm run test:imap
```

Si funciona verás un mensaje similar a:

`✅ Conexión IMAP correcta. Correos en Entrada: ...`

Esta primera prueba NO envía respuestas ni modifica correos.

## Próxima etapa

Una vez confirmada la conexión, se agrega el procesamiento de mensajes nuevos, detección de CV, prevención de respuestas duplicadas y respuesta SMTP automática.

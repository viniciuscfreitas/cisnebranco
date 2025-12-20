// Leads Routes - Public webhook for lead generation
// Grug Rule: Separated from tasks.js for better organization

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_PATTERN = /^[@]?[\w\-\.]+$/;

function getClientIp(req) {
  if (req.ip) return req.ip;

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const trimmed = forwarded.trim();
    if (trimmed) {
      const firstIp = trimmed.split(',')[0];
      return firstIp.trim();
    }
  }

  return req.connection?.remoteAddress || 'unknown';
}

function createLeadsRoutes(db, NODE_ENV, sanitizeString, checkLeadRateLimit) {
  const router = require('express').Router();

  // Public webhook for leads (no authentication, but with rate limiting)
  router.post('/', (req, res) => {
    try {
      const clientIp = getClientIp(req);

      // Rate limiting: 10 requests per hour per IP (separado do login)
      if (!checkLeadRateLimit(clientIp)) {
        return res.status(429).json({
          success: false,
          error: 'Muitas requisições. Tente novamente em 1 hora.'
        });
      }

      // Validate request body exists
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ success: false, error: 'Corpo da requisição inválido' });
      }

      const { client, contact, description, source } = req.body;

      // Validate and sanitize all fields
      const clientSanitized = sanitizeString(client, 255);
      const contactSanitized = contact ? sanitizeString(contact, 255) : null;
      const descriptionSanitized = description ? sanitizeString(description, 5000) : null;
      const sourceSanitized = source ? sanitizeString(source, 100) : null;

      // Validate required fields
      if (!clientSanitized || clientSanitized.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Campo client é obrigatório' });
      }
      if (!contactSanitized || contactSanitized.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Campo contact é obrigatório' });
      }

      // Validate sizes
      if (clientSanitized.length > 255 || contactSanitized.length > 255 || (descriptionSanitized && descriptionSanitized.length > 5000)) {
        return res.status(400).json({ success: false, error: 'Campos excedem tamanho máximo permitido' });
      }

      // Validate contact format
      if (!EMAIL_PATTERN.test(contactSanitized) && !CONTACT_PATTERN.test(contactSanitized)) {
        return res.status(400).json({ success: false, error: 'Formato de contato inválido. Use email ou @username' });
      }

      // Get first user ID (or use user_id = 1 as default)
      db.get('SELECT id FROM users ORDER BY id LIMIT 1', [], (err, user) => {
        if (err) {
          console.error('[CreateLead] Error fetching user:', err);
          return res.status(500).json({
            success: false,
            error: NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message
          });
        }

        const userId = user ? user.id : 1;

        // Create task automatically in column 0 (Descoberta)
        db.run(
          `INSERT INTO tasks (
            user_id, client, contact, description, price, payment_status,
            col_id, order_position, type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            clientSanitized,
            contactSanitized,
            descriptionSanitized,
            0, // Default price
            'Pendente',
            0, // Descoberta column
            0, // Order position
            sourceSanitized || 'Lead Externo'
          ],
          function (err) {
            if (err) {
              console.error('[CreateLead] Error creating task:', err);
              // Return generic error, don't expose database details
              return res.status(500).json({
                success: false,
                error: 'Erro ao processar lead. Tente novamente mais tarde.'
              });
            }

            res.json({
              success: true,
              data: {
                message: 'Lead criado com sucesso',
                taskId: this.lastID
              }
            });
          }
        );
      });
    } catch (error) {
      console.error('[CreateLead] Unexpected error:', {
        error: error.message,
        stack: NODE_ENV === 'development' ? error.stack : undefined
      });
      res.status(500).json({
        success: false,
        error: NODE_ENV === 'production' ? 'Erro interno do servidor' : error.message
      });
    }
  });

  return router;
}

module.exports = createLeadsRoutes;

// Connexion à Upstash Redis. Les variables sont ajoutées automatiquement
// par Vercel quand on connecte la base au projet (deux noms possibles).
const { Redis } = require('@upstash/redis');

module.exports =
  globalThis.__redis || // utilisé uniquement par les tests locaux
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  });

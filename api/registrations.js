const redis = require('../lib/redis');
const { isAdmin } = require('../lib/auth');
const { send, query } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    // Les coordonnées des bénéficiaires ne sont visibles que par l'organisateur.
    if (!isAdmin(req)) return send(res, 401, { error: 'Connexion requise.' });

    if (req.method === 'GET') {
      const all = (await redis.hgetall('regs')) || {};
      return send(res, 200, { registrations: Object.values(all) });
    }

    if (req.method === 'DELETE') {
      const id = query(req).id;
      const r = id ? await redis.hget('regs', id) : null;
      if (!r) return send(res, 404, { error: 'Inscription introuvable.' });
      await redis.hdel('regs', id);
      const n = await redis.decr('count:' + r.activityId);
      if (n < 0) await redis.set('count:' + r.activityId, 0);
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Méthode non autorisée.' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Erreur du serveur.' });
  }
};

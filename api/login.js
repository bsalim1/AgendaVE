const { send, readBody, ip, limit } = require('../lib/http');
const { isAdmin, makeToken, setSession, safeEqual } = require('../lib/auth');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return send(res, 200, { admin: isAdmin(req) });

    if (req.method === 'DELETE') {
      setSession(res, '', 0);
      return send(res, 200, { admin: false });
    }

    if (req.method === 'POST') {
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected) return send(res, 500, { error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." });
      if (!(await limit('login:' + ip(req), 10, 900))) {
        return send(res, 429, { error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      }
      const { password } = readBody(req);
      if (typeof password !== 'string' || !safeEqual(password, expected)) {
        return send(res, 401, { error: 'Mot de passe incorrect.' });
      }
      setSession(res, makeToken(), 12 * 60 * 60);
      return send(res, 200, { admin: true });
    }

    return send(res, 405, { error: 'Méthode non autorisée.' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Erreur du serveur.' });
  }
};

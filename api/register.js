const crypto = require('crypto');
const redis = require('../lib/redis');
const { send, readBody, today, ip, limit } = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée.' });
  try {
    const b = readBody(req);

    // Champ piège invisible : seuls les robots le remplissent.
    if (b.website) return send(res, 200, { ok: true });

    if (!(await limit('reg:' + ip(req), 30, 3600))) {
      return send(res, 429, { error: 'Trop de demandes. Réessayez plus tard.' });
    }

    const lastName = String(b.lastName || '').trim().slice(0, 60);
    const firstName = String(b.firstName || '').trim().slice(0, 60);
    const phone = String(b.phone || '').trim().slice(0, 30);
    const referent = String(b.referent || '').trim().slice(0, 80);
    if (!lastName || !firstName || !referent) return send(res, 400, { error: 'Complétez tous les champs.' });
    if (phone.replace(/\D/g, '').length < 8 || !/^[+\d\s().\-]+$/.test(phone)) {
      return send(res, 400, { error: 'Le numéro de téléphone est invalide.' });
    }

    const ids = [...new Set(Array.isArray(b.activityIds) ? b.activityIds.map(String) : [])].slice(0, 10);
    if (!ids.length) return send(res, 400, { error: 'Sélectionnez au moins une activité.' });

    const acts = [];
    for (const id of ids) {
      const a = await redis.hget('activities', id);
      if (!a || a.date < today()) return send(res, 400, { error: "Une des activités n'est plus disponible.", gone: [id] });
      acts.push(a);
    }

    // Réservation atomique : on incrémente le compteur, puis on annule si c'est complet.
    const reserved = [];
    const full = [];
    for (const a of acts) {
      const n = await redis.incr('count:' + a.id);
      if (n + (a.taken0 || 0) > a.capacity) {
        await redis.decr('count:' + a.id);
        full.push(a.id);
      } else {
        reserved.push(a);
      }
    }
    if (full.length) {
      for (const a of reserved) await redis.decr('count:' + a.id);
      return send(res, 409, { error: 'Une activité vient d\'être complétée.', full });
    }

    const now = new Date().toISOString();
    for (const a of reserved) {
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await redis.hset('regs', {
        [id]: { id, activityId: a.id, activityTitle: a.title, activityDate: a.date, activityTime: a.time || '', lastName, firstName, phone, referent, createdAt: now },
      });
    }
    return send(res, 200, { ok: true, count: reserved.length });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "L'inscription n'a pas pu être enregistrée." });
  }
};

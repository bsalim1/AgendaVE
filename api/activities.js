const crypto = require('crypto');
const redis = require('../lib/redis');
const { isAdmin } = require('../lib/auth');
const { send, readBody, query } = require('../lib/http');

function clean(b) {
  const title = String(b.title || '').trim().slice(0, 80);
  const date = String(b.date || '');
  const time = String(b.time || '');
  const place = String(b.place || '').trim().slice(0, 100);
  const description = String(b.description || '').trim().slice(0, 400);
  const capacity = parseInt(b.capacity, 10);
  let taken0 = parseInt(b.taken0 || 0, 10);
  if (!title) return { error: "Indiquez le titre de l'activité." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Indiquez une date valide.' };
  if (time && !/^\d{2}:\d{2}$/.test(time)) return { error: "L'heure n'est pas valide." };
  if (!(capacity >= 1 && capacity <= 500)) return { error: 'Indiquez un nombre de places entre 1 et 500.' };
  if (!(taken0 >= 0 && taken0 <= 500)) taken0 = 0;
  return { value: { title, date, time, place, description, capacity, taken0 } };
}

// Les images arrivent déjà réduites par la page (JPEG, environ 1100 px).
async function saveImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: "Le format de l'image n'est pas pris en charge." };
  if (m[2].length > 900000) return { error: "L'image est trop lourde. Choisissez-en une plus légère." };
  const id = crypto.randomUUID().replace(/-/g, '');
  await redis.set('img:' + id, { t: m[1], d: m[2] });
  return { id };
}

module.exports = async (req, res) => {
  try {
    // Lecture publique : liste des activités avec le nombre de places prises.
    if (req.method === 'GET') {
      const all = (await redis.hgetall('activities')) || {};
      const list = Object.values(all);
      const counts = list.length ? await redis.mget(...list.map((a) => 'count:' + a.id)) : [];
      const out = list
        .map((a, i) => ({ ...a, taken: (a.taken0 || 0) + (Number(counts[i]) || 0) }))
        .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
      return send(res, 200, { activities: out });
    }

    if (!isAdmin(req)) return send(res, 401, { error: 'Connexion requise.' });
    const b = readBody(req);

    if (req.method === 'POST' || req.method === 'PUT') {
      const c = clean(b);
      if (c.error) return send(res, 400, { error: c.error });
      let existing = null;
      let id;
      if (req.method === 'PUT') {
        id = query(req).id;
        existing = id ? await redis.hget('activities', id) : null;
        if (!existing) return send(res, 404, { error: 'Activité introuvable.' });
      } else {
        id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      }
      let image = existing ? existing.image || '' : '';
      if (b.imageData) {
        const r = await saveImage(b.imageData);
        if (r.error) return send(res, 400, { error: r.error });
        if (image) await redis.del('img:' + image);
        image = r.id;
      }
      const activity = { ...(existing || {}), ...c.value, id, image, createdAt: existing ? existing.createdAt : Date.now() };
      await redis.hset('activities', { [id]: activity });
      return send(res, 200, { activity });
    }

    if (req.method === 'DELETE') {
      const id = query(req).id;
      const a = id ? await redis.hget('activities', id) : null;
      if (!a) return send(res, 404, { error: 'Activité introuvable.' });
      await redis.hdel('activities', id);
      await redis.del('count:' + id);
      if (a.image) await redis.del('img:' + a.image);
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Méthode non autorisée.' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Erreur du serveur.' });
  }
};

const redis = require('./redis');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch (e) { return {}; }
  }
  return typeof b === 'object' ? b : {};
}

// Date du jour à Bruxelles, au format AAAA-MM-JJ.
function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
}

function ip(req) {
  const f = req.headers['x-forwarded-for'];
  return (f ? String(f).split(',')[0] : (req.socket && req.socket.remoteAddress) || 'inconnue').trim();
}

// Limite le nombre d'appels par adresse sur une fenêtre de temps.
async function limit(key, max, windowSec) {
  const n = await redis.incr('rl:' + key);
  if (n === 1) await redis.expire('rl:' + key, windowSec);
  return n <= max;
}

function query(req) {
  const u = new URL(req.url, 'http://x');
  return Object.fromEntries(u.searchParams.entries());
}

module.exports = { send, readBody, today, ip, limit, query };

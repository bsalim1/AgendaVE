const redis = require('../lib/redis');
const { query } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    const id = query(req).id;
    if (!/^[a-f0-9]{32}$/.test(id || '')) { res.statusCode = 400; return res.end(); }
    const img = await redis.get('img:' + id);
    if (!img || !img.d) { res.statusCode = 404; return res.end(); }
    res.statusCode = 200;
    res.setHeader('Content-Type', img.t);
    // L'identifiant change à chaque nouvelle image : on peut la garder en cache longtemps.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(Buffer.from(img.d, 'base64'));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end();
  }
};

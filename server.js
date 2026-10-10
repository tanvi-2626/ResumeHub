require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express'), mysql = require('mysql2/promise'), bcrypt = require('bcryptjs');
const crypto = require('crypto'), path = require('path'), fs = require('fs');

const app = express();
const env = process.env;
app.disable('x-powered-by');
// Hosting platforms (Render, Railway, Fly, Heroku...) put one proxy in front of the app.
app.set('trust proxy', env.TRUST_PROXY === undefined ? 1 : Number(env.TRUST_PROXY) || false);

let SECRET = env.SESSION_SECRET;
if (!SECRET || SECRET === 'replace-with-a-long-random-string') {
  SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: SESSION_SECRET is not set. Using a temporary random secret (everyone is signed out whenever the server restarts). Set a long random SESSION_SECRET in your environment.');
}

/* ---------- database configuration (works locally and on cloud hosts) ---------- */
function dbConfig() {
  const url = env.DATABASE_URL || env.MYSQL_URL;
  let c;
  if (url) {
    const u = new URL(url);
    c = { host: u.hostname, port: Number(u.port) || 3306, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: decodeURIComponent(u.pathname.replace(/^\//, '')) || env.DB_NAME || 'resumeflow' };
  } else {
    c = { host: env.DB_HOST || env.MYSQLHOST || 'localhost', port: Number(env.DB_PORT || env.MYSQLPORT) || 3306, user: env.DB_USER || env.MYSQLUSER || 'root', password: env.DB_PASSWORD ?? env.MYSQLPASSWORD ?? '', database: env.DB_NAME || env.MYSQLDATABASE || 'resumeflow' };
  }
  if (!/^[A-Za-z0-9_$-]+$/.test(c.database)) throw new Error('Database name may only contain letters, numbers, _ $ and -');
  if (env.DB_SSL === 'true') c.ssl = { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  return c;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'PROTOCOL_CONNECTION_LOST'];
let pool, server;

async function ensureDatabase(cfg) {
  // Managed databases usually already exist and often forbid CREATE DATABASE, so this is best-effort only.
  try {
    const { database, ...rest } = cfg;
    const c = await mysql.createConnection(rest);
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
    await c.end();
  } catch (e) { console.warn('Skipped automatic database creation (' + e.message + '). Continuing with the existing database.'); }
}
async function connect(cfg, tries = 6, delay = 3000) {
  for (let i = 1; ; i++) {
    const p = mysql.createPool({ ...cfg, waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4', enableKeepAlive: true });
    try { await p.query('SELECT 1'); return p; }
    catch (e) {
      try { await p.end(); } catch (_) {}
      if (i >= tries || !TRANSIENT.includes(e.code)) throw e;
      console.warn(`Database not reachable yet (attempt ${i}/${tries}): ${e.message}. Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

/* ---------- tokens ---------- */
const mac = (p) => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const sign = (id) => { const p = Buffer.from(JSON.stringify({ id, exp: Date.now() + 6048e5 })).toString('base64url'); return p + '.' + mac(p); };
function verify(t = '') {
  try {
    const [p, s] = t.split('.'); const a = Buffer.from(s || ''), b = Buffer.from(mac(p));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(p, 'base64url')); return d.exp > Date.now() ? d.id : null;
  } catch { return null; }
}
const auth = (req, res, next) => {
  const id = verify((req.headers.authorization || '').replace('Bearer ', ''));
  if (!id) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = id; next();
};
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That email already has an account. Try signing in.' });
  if (e && e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(401).json({ error: 'Unauthorized' });
  console.error(e); res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

/* ---------- simple in-memory brute-force protection ---------- */
const buckets = new Map();
const bucket = (key, windowMs) => { const now = Date.now(); let b = buckets.get(key); if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); } return b; };
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 600000).unref();
const ip = (req) => req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
const tooMany = (res) => res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });

const starter = {
  basics: { name: 'Alex Morgan', headline: 'Product designer crafting calm, useful digital experiences', email: 'alex.morgan@email.com', phone: '+1 (415) 555-0198', location: 'San Francisco, CA', summary: 'Product designer with 6+ years of experience turning complex workflows into clear, human-centered products. I partner closely with engineering and research teams to ship experiences that feel simple, thoughtful, and useful.', website: 'alexmorgan.design' },
  experience: [
    { id: 'exp-1', role: 'Senior Product Designer', company: 'Northstar Labs', location: 'San Francisco, CA', startDate: '2022', endDate: 'Present', description: 'Led the end-to-end design of a workflow platform used by 18k+ teams. Built a research practice that improved activation by 24% and partnered with engineering to establish a scalable design system.' },
    { id: 'exp-2', role: 'Product Designer', company: 'Arc & Co.', location: 'New York, NY', startDate: '2019', endDate: '2022', description: 'Designed mobile and web products across fintech and commerce. Simplified onboarding, launched a new visual language, and mentored two early-career designers.' }],
  education: [{ id: 'edu-1', school: 'California College of the Arts', degree: 'BFA, Interaction Design', location: 'San Francisco, CA', startDate: '2015', endDate: '2019' }],
  skills: [{ id: 'skill-1', name: 'Product strategy', level: 'expert' }, { id: 'skill-2', name: 'Interaction design', level: 'expert' }, { id: 'skill-3', name: 'Prototyping', level: 'advanced' }, { id: 'skill-4', name: 'Design systems', level: 'advanced' }],
  projects: [{ id: 'project-1', name: 'Field Notes', description: 'A lightweight research repository that helps teams turn scattered observations into shared product insight.', link: 'fieldnotes.design', technologies: ['Research', 'UX strategy', 'Prototyping'] }],
};
const validResume = (d) => d && typeof d === 'object' && d.basics && typeof d.basics === 'object' && !Array.isArray(d.basics) && ['experience', 'education', 'skills', 'projects'].every((k) => Array.isArray(d[k]));
const validPhoto = (p) => p === undefined || (typeof p === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) && p.length <= 400000);
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const str = (v) => typeof v === 'string';

/* ---------- middleware ---------- */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP);
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  if (req.url.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- routes ---------- */
app.get('/api/healthz', (_q, r) => r.json({ status: 'ok' }));

app.post('/api/auth/sign-up', wrap(async (req, res) => {
  const { name, email, password } = req.body || {};
  const b = bucket('up:' + ip(req), 3600000);
  if (b.n >= 20) return tooMany(res);
  if (!str(name) || !str(email) || !str(password)) return res.status(400).json({ error: 'Please fill in every field.' });
  const n = name.trim(), e = email.trim().toLowerCase();
  if (!n || n.length > 120 || e.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: 'Please enter your name and a valid email.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8 to 128 characters.' });
  b.n++;
  const [dup] = await pool.query('SELECT id FROM users WHERE email=?', [e]);
  if (dup.length) return res.status(409).json({ error: 'That email already has an account. Try signing in.' });
  const [r] = await pool.query('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)', [n, e, await bcrypt.hash(password, 10)]);
  res.json({ token: sign(r.insertId), user: { id: r.insertId, name: n, email: e } });
}));
app.post('/api/auth/sign-in', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const key = 'in:' + ip(req), b = bucket(key, 900000);
  if (b.n >= 20) return tooMany(res);
  const fail = () => { b.n++; return res.status(401).json({ error: 'Email or password is incorrect.' }); };
  if (!str(email) || !str(password) || password.length > 128) return fail();
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email.trim().toLowerCase()]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return fail();
  buckets.delete(key);
  res.json({ token: sign(rows[0].id), user: { id: rows[0].id, name: rows[0].name, email: rows[0].email } });
}));
app.get('/api/auth/me', auth, wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id,name,email FROM users WHERE id=?', [req.userId]);
  if (!rows.length) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: rows[0] });
}));

async function getResume(uid) {
  const [rows] = await pool.query('SELECT data, updated_at FROM user_resumes WHERE user_id=?', [uid]);
  if (rows.length) return { data: parse(rows[0].data), updatedAt: rows[0].updated_at };
  await pool.query('INSERT INTO user_resumes (user_id,data) VALUES (?,?)', [uid, JSON.stringify(starter)]);
  return { data: starter, updatedAt: new Date() };
}
app.get('/api/resume', auth, wrap(async (req, res) => { const r = await getResume(req.userId); res.json({ id: 1, ...r }); }));
app.put('/api/resume', auth, wrap(async (req, res) => {
  if (!validResume(req.body)) return res.status(400).json({ error: 'Resume data is invalid' });
  if (!validPhoto(req.body.basics.photo)) return res.status(400).json({ error: 'The profile photo is invalid or too large' });
  const json = JSON.stringify(req.body);
  await pool.query('INSERT INTO user_resumes (user_id,data) VALUES (?,?) ON DUPLICATE KEY UPDATE data=?, updated_at=CURRENT_TIMESTAMP', [req.userId, json, json]);
  const r = await getResume(req.userId); res.json({ id: 1, ...r });
}));
app.get('/api/resume/summary', auth, wrap(async (req, res) => {
  const { data, updatedAt } = await getResume(req.userId);
  const s = [data.basics, data.experience, data.education, data.skills, data.projects];
  const done = s.filter((x) => (Array.isArray(x) ? x.length : Object.values(x).some(Boolean))).length;
  res.json({ completion: Math.round((done / s.length) * 100), completedSections: done, totalSections: s.length, lastSaved: updatedAt });
}));
app.use('/api', (_q, r) => r.status(404).json({ error: 'Not found' }));
app.get('*', (_q, r) => r.sendFile(path.join(__dirname, 'public', 'index.html')));

// JSON error responses (oversized or malformed request bodies, anything unexpected)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const s = err.status || err.statusCode || 500;
  if (s >= 500) console.error(err);
  res.status(s).json({ error: s === 413 ? 'That request is too large.' : s < 500 ? 'Invalid request.' : 'Something went wrong. Please try again.' });
});

/* ---------- start ---------- */
async function start() {
  const cfg = dbConfig();
  await ensureDatabase(cfg);
  pool = await connect(cfg);
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8').split(';').map((s) => s.trim()).filter((s) => /^CREATE TABLE/i.test(s));
  for (const q of sql) await pool.query(q);
  const port = Number(env.PORT) || 5000;
  server = app.listen(port, () => console.log(`ResumeFlow running on port ${port}`));
}
function shutdown() {
  console.log('Shutting down...');
  const done = () => (pool ? pool.end().catch(() => {}).finally(() => process.exit(0)) : process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
  server ? server.close(done) : done();
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
start().catch((e) => { console.error('Could not start the server.\n' + (e && e.message) + '\nCheck your database settings (DATABASE_URL or DB_HOST / DB_USER / DB_PASSWORD / DB_NAME).'); process.exit(1); });

(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const ACC = { teal: ['Sea glass', '#247c73', '#dcece6'], coral: ['Terracotta', '#c76152', '#f3dfd6'], ochre: ['Golden hour', '#a8732e', '#f1e6c9'], ink: ['Deep ink', '#315568', '#dce7eb'] };
const TPL = {
  editorial: ['Editorial', 'The thoughtful classic', 'A generous, literary layout with a strong opening and an easy reading rhythm.'],
  folio: ['Margin', 'The quiet specialist', 'A compact, considered format that lets your work speak with calm authority.'],
  signal: ['Signal', 'The confident modern', 'A clear hierarchy and crisp details for roles where clarity is a superpower.'],
  meridian: ['Meridian', 'The structured executive', 'A bold side column keeps contact details and skills close while your story leads.'],
  horizon: ['Horizon', 'The polished presenter', 'A full-width banner opens the page, with a balanced two-column body below.'],
  chronicle: ['Chronicle', 'The clear storyteller', 'A centered header and a quiet timeline that makes your career path easy to follow.'],
};
const SAMPLE = { basics: { name: 'Mara Chen', headline: 'Product designer shaping useful, human software', email: 'mara.chen@email.com', phone: '+1 415 555 0188', location: 'San Francisco, CA', summary: 'Product designer with 7 years of experience turning complex systems into clear, trusted tools. I work across research, interaction, and visual design to help teams make meaningful things feel inevitable.', website: 'marachen.design' },
  experience: [{ id: 'experience-1', role: 'Senior Product Designer', company: 'Northstar Health', location: 'San Francisco, CA', startDate: '2021', endDate: 'Present', description: 'Led the redesign of a care coordination platform used by 12,000+ clinicians. Partnered with product and engineering to reduce task time by 34% and establish a scalable design system.' }, { id: 'experience-2', role: 'Product Designer', company: 'Kindred Studio', location: 'Oakland, CA', startDate: '2018', endDate: '2021', description: 'Designed digital products for mission-driven teams, from early product strategy through launch. Built research practice and mentored two emerging designers.' }],
  education: [{ id: 'education-1', school: 'California College of the Arts', degree: 'BFA, Interaction Design', location: 'San Francisco, CA', startDate: '2014', endDate: '2018' }],
  skills: [{ id: 'skill-1', name: 'Product strategy', level: 'expert' }, { id: 'skill-2', name: 'Interaction design', level: 'expert' }, { id: 'skill-3', name: 'Design systems', level: 'advanced' }, { id: 'skill-4', name: 'User research', level: 'advanced' }],
  projects: [{ id: 'project-1', name: 'Care notes', description: 'A calmer way for care teams to share context across a patient journey.', link: 'marachen.design/care-notes', technologies: ['Figma', 'Prototyping'] }] };

const S = { token: store.get('resumeflow-token', ''), user: null, template: store.get('resumeflow-template', 'editorial'), accent: store.get('resumeflow-accent', 'teal'), dark: store.get('resumeflow-night-reading') === 'true',
  compact: store.get('resumeflow-compact-editor') === 'true', tips: store.get('resumeflow-writing-prompts') !== 'false', resume: JSON.parse(JSON.stringify(SAMPLE)), section: 'basics', savedAt: '', completion: null, status: 'idle', saveErr: false, menu: false, mob: false, accOpen: false, authErr: '', busy: false };
if (!TPL[S.template]) S.template = 'editorial'; if (!ACC[S.accent]) S.accent = 'teal';

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { method: opts.method || 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, S.token ? { Authorization: 'Bearer ' + S.token } : {}), body: opts.body ? JSON.stringify(opts.body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && S.token && !path.startsWith('/auth/sign-in')) { signOut(true); }
  if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), { status: r.status });
  return j;
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }
const id = (p) => p + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
const go = (p) => { if (location.hash !== '#' + p) location.hash = p; else route(); };
const IC = { pen: '✎', arrow: '→', check: '✓', down: '⌄', plus: '+', lock: '🔒︎', user: '☺', brief: '▤', grad: '♜', spark: '✦', wand: '✧', file: '▭', tpl: '▦', set: '⚙', print: '⎙', dl: '⤓', save: '▣', x: '×', trash: '🗑︎', help: '?', pal: '◐', ref: '↻', menu: '☰' };
const brand = () => `<a href="#/" class="brand" data-testid="link-brand"><i>${IC.pen}</i><b>resumeflow</b></a>`;
const initials = (n) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/* ---------- views ---------- */
function mini(t, l) { return `<div><div style="margin-bottom:8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;color:#247c73">${t}</div>${l.map((x, i) => `<div style="font-size:9px;line-height:16px;${i ? 'color:#78807e' : 'font-weight:600'}">${x}</div>`).join('')}</div>`; }
function welcome() {
  return `<main style="overflow:hidden"><div class="wrap"><header class="nav">${brand()}<nav><a class="pill" href="#/templates" data-testid="link-templates">Templates</a><a class="pill" href="#/settings" data-testid="link-settings">Preferences</a></nav><div style="display:flex;gap:8px;align-items:center">${S.token ? `<a class="pill" style="border:1px solid hsl(var(--bd));background:hsl(var(--card)/.72)" href="#/builder" data-testid="link-nav-builder">Open workspace ${IC.arrow}</a>` : `<a class="pill link hide-s" href="#/sign-in">Sign in</a><a class="btn sm" href="#/sign-up" data-testid="link-nav-sign-up">Create account ${IC.arrow}</a>`}</div></header>
<section class="hero"><div style="max-width:650px"><div class="rise pri" style="display:flex;align-items:center;gap:12px;font-size:14px;font-weight:600"><span class="av" style="width:28px;height:28px;background:hsl(var(--acc)/.18)">${IC.spark}</span>Your next chapter, edited well.</div>
<h1 class="rise d1">A resume<br><em>worth</em> sending.</h1><p class="lead muted rise d2">ResumeFlow gives your experience a clear point of view. Write with focus, shape the story, and leave with a document that feels unmistakably yours.</p>
<div class="rise d3" style="margin-top:36px;display:flex;flex-wrap:wrap;align-items:center;gap:16px"><a class="btn" href="#/builder" data-testid="link-start-building">Start building ${IC.arrow}</a><a class="link" href="#/templates" data-testid="link-browse-templates">Browse templates ›</a></div>
<div class="muted" style="margin-top:56px;display:flex;align-items:center;gap:16px;font-size:12px"><div style="display:flex">${['MC', 'RA', 'JL'].map((x) => `<span class="av" style="width:32px;height:32px;font-size:10px;border:2px solid hsl(var(--bg));margin-right:-8px">${x}</span>`).join('')}</div><span style="margin-left:8px">Made for the work between jobs.</span></div></div>
<div class="stack"><div class="tilt"><div><div style="display:flex;justify-content:space-between;border-bottom:1px solid #d8d0c1;padding-bottom:24px"><div><div class="display" style="font-size:36px">Mara Chen</div><div style="margin-top:4px;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:#247c73">Product designer</div></div><div class="mono" style="text-align:right;font-size:8px;line-height:16px;color:#78807e">SAN FRANCISCO<br>mara@email.com</div></div>
<div style="margin-top:24px;display:grid;grid-template-columns:.34fr 1fr;gap:24px"><div style="display:grid;gap:20px;align-content:start">${mini('Selected skills', ['Product strategy', 'Interaction design', 'Research'])}${mini('Education', ['BFA · CCA', '2014 — 2018'])}</div><div><div style="margin-bottom:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#247c73">Experience</div><div style="display:grid;gap:20px">${mini('Northstar Health', ['Senior Product Designer', '2021 — Present', 'Led the redesign of a care'])}${mini('Kindred Studio', ['Product Designer', '2018 — 2021', 'Designed digital products'])}</div></div></div>
<div style="margin-top:32px;height:8px;width:66%;border-radius:9px;background:#dbeae5"></div><div style="margin-top:8px;height:8px;width:50%;border-radius:9px;background:#ebe5d9"></div></div></div>
<div class="badge"><span class="av" style="background:hsl(var(--acc)/.2);color:hsl(var(--acc))">${IC.check}</span><div><div style="font-size:12px;font-weight:700">Your story, clearer</div><div class="muted" style="font-size:10px;margin-top:2px">Ready when you are</div></div></div></div></section></div>
<section class="band"><div class="wrap">${[['01', 'Bring the raw material', 'Start with what you have. ResumeFlow gives every detail a considered place.'], ['02', 'Find your throughline', 'Edit in one calm workspace while the finished page takes shape beside you.'], ['03', 'Send it with ease', 'Choose your voice, save a polished PDF, and make a good first impression.']].map((s) => `<div class="step"><span class="mono accent" style="font-size:12px">${s[0]}</span><div><h2>${s[1]}</h2><p class="muted">${s[2]}</p></div></div>`).join('')}</div></section>
<footer class="wrap muted" style="display:flex;justify-content:space-between;align-items:center;padding-block:32px;font-size:12px">${brand()}<span>Thoughtful tools for meaningful work.</span></footer></main>`;
}
function authPage(type) {
  const up = type === 'sign-up';
  return `<main class="auth"><div style="width:100%;max-width:470px"><div style="margin-bottom:28px;text-align:center"><div style="display:flex;justify-content:center">${brand()}</div><p class="muted" style="margin:16px auto 0;max-width:310px;font-size:14px;line-height:24px">${up ? 'Create a private workspace for the career story you want to tell.' : 'A calm place to keep your best work ready.'}</p></div>
<div class="authc"><h2>${up ? 'Create your ResumeFlow' : 'Welcome back'}</h2><p style="margin:6px 0 0;font-size:14px;color:#687772">${up ? 'Keep your work ready wherever you go.' : 'Your next chapter is waiting.'}</p>
<form id="authform" novalidate>${up ? '<label class="f"><span>Full name</span><input name="name" autocomplete="name" required data-testid="input-auth-name"></label>' : ''}<label class="f"><span>Email address</span><input name="email" type="email" autocomplete="email" required data-testid="input-auth-email"></label><label class="f"><span>Password</span><input name="password" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" required minlength="8" data-testid="input-auth-password"></label>
${S.authErr ? `<div class="err" data-testid="status-auth-error">${esc(S.authErr)}</div>` : ''}<button class="btn" type="submit" ${S.busy ? 'disabled' : ''} data-testid="button-auth-submit">${S.busy ? 'Please wait…' : up ? 'Create account' : 'Sign in'}</button></form>
<div class="foot">${up ? 'Already have an account? <a href="#/sign-in">Sign in</a>' : 'Don’t have an account? <a href="#/sign-up">Sign up</a>'}</div></div></div></main>`;
}
function shell(active, body) {
  const u = S.user, link = (h, l, ic, k) => `<a class="pill ${active === k ? 'on' : ''}" href="#/${h}" data-testid="link-shell-${l.toLowerCase()}">${ic} ${l}</a>`;
  return `<div><header class="shell-h"><div><div style="display:flex;align-items:center;gap:16px"><button class="mob" data-act="mob" aria-label="Open navigation" data-testid="button-open-menu" style="font-size:20px">${IC.menu}</button>${brand()}</div><nav class="nav" style="padding:0;display:flex">${link('builder', 'Workspace', IC.file, 'builder')}${link('templates', 'Templates', IC.tpl, 'templates')}${link('settings', 'Preferences', IC.set, 'settings')}</nav>
<div class="muted" style="display:flex;align-items:center;gap:12px;font-size:12px"><span class="hide-s" style="display:flex;gap:6px">${IC.lock} Private workspace</span><div class="menu"><button data-act="menu" data-testid="button-account-menu" style="display:flex;align-items:center;gap:8px;padding:4px"><span class="av">${u ? esc(initials(u.name)) : '…'}</span><span>${IC.down}</span></button>${S.menu && u ? `<div class="pop"><div style="border-radius:12px;background:hsl(var(--sec)/.55);padding:12px"><p style="margin:0;font-size:14px;font-weight:700;color:hsl(var(--fg));overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</p><p style="margin:4px 0 0;font-size:12px;overflow:hidden;text-overflow:ellipsis">${esc(u.email)}</p></div><button data-act="signout" data-testid="button-sign-out" style="margin-top:8px;display:flex;gap:8px;width:100%;padding:10px 12px;font-size:12px;font-weight:700">${IC.user} Sign out</button></div>` : ''}</div></div></div></header>${S.mob ? `<div class="mobm" data-act="mobx"><aside data-stop><div style="display:flex;justify-content:space-between;align-items:center">${brand()}<button data-act="mobx" data-testid="button-close-menu" style="color:#f5f0e6;font-size:20px">${IC.x}</button></div><nav style="margin-top:48px;display:grid;gap:8px"><a class="pill" href="#/builder" data-testid="link-mobile-builder">${IC.file} Workspace</a><a class="pill" href="#/templates" data-testid="link-mobile-templates">${IC.tpl} Templates</a><a class="pill" href="#/settings" data-testid="link-mobile-settings">${IC.set} Preferences</a></nav></aside></div>` : ''}${body}</div>`;
}
const tid = (key) => { const p = key.split('.'); if (p.length === 2) return 'input-' + p[0] + '-' + p[1]; const sing = { experience: 'experience', education: 'education', skills: 'skill', projects: 'project' }[p[0]]; const it = S.resume[p[0]][+p[1]]; return esc('input-' + sing + '-' + p[2] + '-' + (it ? it.id : p[1])); };
const fld = (label, key, val, ph, o = {}) => `<label class="f ${o.span ? 'span2' : ''}"><span>${label}</span>${o.ml ? `<textarea rows="4" data-k="${key}" placeholder="${esc(ph)}" data-testid="${tid(key)}">${esc(val)}</textarea>` : `<input type="${o.type || 'text'}" data-k="${key}" value="${esc(val)}" placeholder="${esc(ph)}" data-testid="${tid(key)}">`}</label>`;
const rmBtn = (sec, i, tid) => `<button class="rm" data-act="rm" data-sec="${sec}" data-i="${i}" data-testid="button-remove-${esc(tid)}">${IC.trash} Remove</button>`;
const empty = (ic, t, c) => `<div class="empty" data-testid="empty-editor-section"><span class="ic" style="background:hsl(var(--card))">${ic}</span><div><h3 style="margin:0;font-size:14px">${t}</h3><p class="muted" style="margin:4px 0 0;font-size:12px;line-height:20px">${c}</p></div></div>`;
function forms() {
  const r = S.resume, b = r.basics;
  const bf = [['name', 'Name', 'Your name', 1], ['headline', 'Headline', 'The work you want to be known for', 1], ['email', 'Email', 'you@example.com'], ['phone', 'Phone', '+1 000 000 0000'], ['location', 'Location', 'City, Country'], ['website', 'Website', 'yoursite.com']];
  const photoUi = `<div class="span2 photo-box" data-testid="photo-upload"><div class="photo-thumb">${okPhoto(b.photo) ? `<img src="${esc(b.photo)}" alt="Profile photo" data-testid="img-photo-thumb">` : '<span>35 × 45</span>'}</div><div style="min-width:0"><span class="photo-label">Profile photo</span><div style="display:flex;flex-wrap:wrap;gap:8px"><label class="btn ghost sm" style="cursor:pointer">${okPhoto(b.photo) ? 'Change photo' : 'Upload photo'}<input type="file" accept="image/*" data-photo="1" hidden data-testid="input-photo"></label>${okPhoto(b.photo) ? '<button type="button" class="btn ghost sm" data-act="rmphoto" data-testid="button-remove-photo">Remove</button>' : ''}</div><p class="muted" style="margin:8px 0 0;font-size:11px;line-height:18px">Passport-size (35 × 45 mm). Shown in the Meridian, Horizon and Chronicle layouts.</p></div></div>`;
  const basics = `<div class="grid2">${photoUi}${bf.map((f) => fld(f[1], 'basics.' + f[0], b[f[0]], f[2], { span: f[3], type: f[0] === 'email' ? 'email' : 'text' })).join('')}${fld('Summary', 'basics.summary', b.summary, 'A few lines that make someone want to keep reading…', { span: 1, ml: 1 })}</div>`;
  const item = (sec, i, label, tid, inner) => `<div class="item"><div style="margin-bottom:16px;display:flex;justify-content:space-between"><span class="mono accent" style="font-size:10px">0${i + 1} / ${label}</span>${rmBtn(sec, i, tid + '-' + r[sec][i].id)}</div>${inner}</div>`;
  const P = (sec, i, k) => `${sec}.${i}.${k}`;
  const exp = r.experience.length ? r.experience.map((x, i) => item('experience', i, 'ROLE', 'experience', `<div class="grid2">${fld('Role', P('experience', i, 'role'), x.role, 'Senior Product Designer')}${fld('Company', P('experience', i, 'company'), x.company, 'Company name')}${fld('Location', P('experience', i, 'location'), x.location, 'City, Country')}<div class="grid2" style="gap:12px">${fld('Start', P('experience', i, 'startDate'), x.startDate, '2021')}${fld('End', P('experience', i, 'endDate'), x.endDate, 'Present')}</div>${fld('What changed because of you?', P('experience', i, 'description'), x.description, 'Describe your contribution, impact, and the work you’re proud of.', { span: 1, ml: 1 })}</div>`)).join('') : empty(IC.brief, 'No roles yet', 'Add the work that shaped how you think and make.');
  const edu = r.education.length ? r.education.map((x, i) => item('education', i, 'FOUNDATION', 'education', `<div class="grid2">${fld('School or program', P('education', i, 'school'), x.school, 'School, program, or mentor')}${fld('Degree or focus', P('education', i, 'degree'), x.degree, 'BFA, Interaction Design')}${fld('Location', P('education', i, 'location'), x.location, 'City, Country')}<div class="grid2" style="gap:12px">${fld('Start', P('education', i, 'startDate'), x.startDate, '2014')}${fld('End', P('education', i, 'endDate'), x.endDate, '2018')}</div></div>`)).join('') : empty(IC.grad, 'No education yet', 'Add the places, people, or practices that taught you.');
  const sk = r.skills.length ? r.skills.map((x, i) => `<div style="display:flex;align-items:flex-end;gap:12px;margin-bottom:12px"><div style="flex:1">${fld('Skill', P('skills', i, 'name'), x.name, 'A skill you use often')}</div><label class="f" style="width:145px"><span>Level</span><select data-k="${P('skills', i, 'level')}" data-testid="select-skill-level-${esc(x.id)}">${['beginner', 'intermediate', 'advanced', 'expert'].map((l) => `<option value="${l}" ${x.level === l ? 'selected' : ''}>${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select></label>${rmBtn('skills', i, 'skill-' + x.id)}</div>`).join('') : empty(IC.spark, 'Make your strengths visible', 'A short, honest list is more useful than a wall of keywords.');
  const pr = r.projects.length ? r.projects.map((x, i) => item('projects', i, 'PROJECT', 'project', `<div class="grid2">${fld('Project name', P('projects', i, 'name'), x.name, 'A project worth remembering')}${fld('Link', P('projects', i, 'link'), x.link, 'yoursite.com/project')}${fld('The short version', P('projects', i, 'description'), x.description, 'What did you make, and why did it matter?', { span: 1, ml: 1 })}${fld('Tools or technologies', P('projects', i, 'technologies'), x.technologies.join(', '), 'Figma, React, Notion')}</div>`)).join('') : empty(IC.wand, 'Give your side work a stage', 'Projects reveal curiosity, range, and the way you turn ideas into something real.');
  const sec = (k, t, cap, ic, add, addL, body) => { const o = S.section === k; return `<section class="card sec ${o ? 'open' : ''}"><div class="sec-h"><button class="t" data-act="toggle" data-sec="${k}" data-testid="button-toggle-section-${k}"><span class="ic">${ic}</span><span style="min-width:0"><span style="display:block;font-size:14px;font-weight:700">${t}</span><span class="muted" style="display:block;font-size:12px;margin-top:2px">${cap}</span></span></button>${add ? `<button class="pri" data-act="add" data-sec="${k}" data-testid="button-add-${k === 'experience' ? 'experience' : k === 'education' ? 'education' : k === 'skills' ? 'skill' : 'project'}" style="font-size:12px;font-weight:700;padding:6px 10px">${IC.plus} ${addL}</button>` : ''}<button class="muted" data-act="toggle" data-sec="${k}" data-testid="button-chevron-section-${k}" style="width:32px;height:32px;${o ? 'transform:rotate(180deg)' : ''}">${IC.down}</button></div>${o ? `<div class="sec-b">${body}</div>` : ''}</section>`; };
  return sec('basics', 'Basics', 'The first hello', IC.user, 0, '', basics) + sec('experience', 'Experience', 'Where you made things happen', IC.brief, 1, 'Add role', exp) + sec('education', 'Education', 'The foundations', IC.grad, 1, 'Add school', edu) + sec('skills', 'Skills', 'What you bring to the room', IC.spark, 1, 'Add skill', sk) + sec('projects', 'Projects', 'The work that stays with you', IC.wand, 1, 'Add project', pr);
}
const okPhoto = (p) => typeof p === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(p);
const calc = (r) => Math.round(([r.basics.name, r.basics.headline, r.basics.email, r.basics.summary, r.experience.length, r.education.length, r.skills.length, r.projects.length].filter(Boolean).length / 8) * 100);
function builder() {
  const r = S.resume, comp = S.completion == null ? calc(r) : S.completion, side = (k, l, ic, n) => `<button class="sbtn ${S.section === k ? 'on' : ''}" data-act="toggle" data-force="1" data-sec="${k}" data-testid="button-section-${l.toLowerCase()}">${ic}<span>${l}</span>${n != null ? `<span class="mono" style="margin-left:auto;font-size:10px;opacity:.65">${n}</span>` : ''}</button>`;
  const saveBtn = `<button class="chipb" data-act="save" ${S.status === 'saving' ? 'disabled' : ''} data-testid="button-save-resume" style="display:flex;align-items:center;gap:8px;border-radius:999px;border:1px solid hsl(var(--bd));background:hsl(var(--card));padding:8px 16px;font-size:12px;font-weight:700">${S.status === 'saving' ? `<span class="spin">${IC.ref}</span> Saving` : `${IC.save} Save`}</button>`;
  return shell('builder', `<div class="bld ${S.compact ? 'compact' : ''}"><aside class="side"><div style="margin-bottom:32px;padding:0 12px"><p class="eyebrow" style="margin:0">My resume</p><h2 class="display" style="margin:8px 0 0;font-size:24px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.basics.name || 'Untitled resume')}</h2><p class="muted" style="margin:4px 0 0;font-size:12px">${S.savedAt ? 'Saved ' + S.savedAt : 'A draft worth shaping'}</p></div>
<div style="margin-bottom:32px;border-radius:16px;background:hsl(var(--sec)/.55);padding:16px"><div style="display:flex;justify-content:space-between;align-items:flex-end"><span style="font-size:12px;font-weight:600">Profile strength</span><span class="mono pri" style="font-size:14px" id="comp">${comp}%</span></div><div class="bar"><i id="compbar" style="width:${comp}%"></i></div><p class="muted" style="margin:12px 0 0;font-size:11px;line-height:16px">A few thoughtful details go a long way.</p></div>
<div style="display:grid;gap:4px">${side('basics', 'Basics', IC.user)}${side('experience', 'Experience', IC.brief, r.experience.length)}${side('education', 'Education', IC.grad, r.education.length)}${side('skills', 'Skills', IC.spark, r.skills.length)}${side('projects', 'Projects', IC.wand, r.projects.length)}</div>
<div style="margin-top:40px;border-top:1px solid hsl(var(--bd));padding-top:20px"><a class="link" href="#/templates" data-testid="link-sidebar-templates" style="display:flex;gap:8px;padding:8px 12px;font-size:12px">${IC.tpl} Change template <span style="margin-left:auto">›</span></a><a class="link" href="#/settings" data-testid="link-sidebar-settings" style="display:flex;gap:8px;padding:8px 12px;font-size:12px">${IC.set} Preferences <span style="margin-left:auto">›</span></a></div></aside>
<main class="edit"><div style="margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px"><div><p class="eyebrow" style="margin:0">Working draft</p><h1 class="display" style="margin:8px 0 0;font-size:clamp(2.2rem,4vw,3rem);letter-spacing:-.02em">Shape your story.</h1><p class="muted" style="margin:8px 0 0;font-size:14px">The good stuff is already in there. Let’s give it a home.</p></div><div class="hide-s" style="display:flex;gap:8px;align-items:center;padding-top:8px">${S.savedAt ? `<span class="muted" style="font-size:12px" data-testid="status-saved">Saved ${S.savedAt}</span>` : ''}${saveBtn}</div></div>
${S.status === 'loading' ? '<div style="margin-bottom:16px" data-testid="status-editor-loading"><div class="card" style="height:80px;background:hsl(var(--mut))"></div></div>' : ''}${S.status === 'loaderr' ? `<div class="alert" data-testid="status-resume-error"><span class="accent">${IC.help}</span><div><b>Working offline with a fresh draft.</b><p class="muted" style="margin:2px 0 0;font-size:12px">We couldn’t reach your saved resume, but your edits are safe here until you save.</p></div><button class="pri" data-act="retry" data-testid="button-retry-resume" style="margin-left:auto;font-size:12px;font-weight:700">${IC.ref} Retry</button></div>` : ''}${S.saveErr ? `<div class="alert" data-testid="status-save-error"><span class="accent">${IC.help}</span><div><b>That save did not land.</b><p class="muted" style="margin:2px 0 0;font-size:12px">Your draft is still here. Check your connection and try again.</p></div><button class="pri" data-act="save" data-testid="button-retry-save" style="margin-left:auto;font-size:12px;font-weight:700">${IC.ref} Try again</button></div>` : ''}
<div id="forms">${forms()}</div><div class="msave" style="margin-top:28px;align-items:center;justify-content:space-between"><span class="muted" style="font-size:12px">${S.savedAt ? 'Saved ' + S.savedAt : 'Changes are saved when you choose Save'}</span><button class="btn sm" data-act="save" data-testid="button-save-resume-mobile">${IC.save} Save</button></div></main>
<aside class="prev"><div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center"><div><p class="eyebrow" style="margin:0">Live preview</p><h2 class="display" style="margin:4px 0 0;font-size:24px">Your finished page</h2></div><div style="display:flex;gap:4px"><button class="ibtn" data-act="print" title="Print resume" data-testid="button-print-resume">${IC.print}</button><button class="ibtn" data-act="print" title="Download as PDF" data-testid="button-download-resume">${IC.dl}</button><button class="ibtn" data-act="save" title="Save resume" data-testid="button-save-preview">${IC.save}</button></div></div>
<div style="margin-bottom:20px;display:flex;flex-wrap:wrap;gap:8px"><a class="chip" href="#/templates" data-testid="link-preview-template">${IC.tpl} ${TPL[S.template][0]}</a><div style="position:relative"><button class="chip" data-act="acc" data-testid="button-open-accent-picker"><span style="color:${ACC[S.accent][1]}">${IC.pal}</span> ${ACC[S.accent][0]} ${IC.down}</button>${S.accOpen ? `<div class="drop">${Object.keys(ACC).map((k) => `<button class="${S.accent === k ? 'on' : ''}" data-act="setacc" data-v="${k}" data-testid="button-accent-${k}"><span class="dot" style="background:${ACC[k][1]}"></span>${ACC[k][0]}${S.accent === k ? '<span class="pri" style="margin-left:auto">' + IC.check + '</span>' : ''}</button>`).join('')}</div>` : ''}</div></div>
<div id="preview">${paper(r, S.template, S.accent, true)}</div><div class="muted" style="margin-top:20px;display:flex;gap:8px;font-size:11px;line-height:20px"><span class="pri">${IC.lock}</span> Private by default. Your resume is only visible to you.</div></aside></div>`);
}
/* ---------- resume paper ---------- */
function paper(r, t, a, live) {
  const { basics: b, experience: ex, education: ed, skills: sk, projects: pj } = r, st = `--ra:${ACC[a][1]};--rs:${ACC[a][2]}`;
  const sec = (title, inner) => `<section class="rs"><h2 class="st">${title}</h2>${inner}</section>`;
  const contact = `<div class="ct"><span>${esc(b.email || 'email@example.com')}</span><span>${esc(b.phone || 'phone')}</span><span>${esc(b.location || 'City, Country')}</span>${b.website ? `<span>${esc(b.website)}</span>` : ''}</div>`;
  const prof = b.summary ? sec('Profile', `<p class="rp">${esc(b.summary)}</p>`) : '';
  const exH = ex.length ? sec('Experience', `<div class="${t === 'chronicle' ? 'tl' : ''}">${ex.map((x) => `<div class="rj"><div class="l1"><h3>${esc(x.role || 'Role')}</h3><span class="dt">${esc(x.startDate || 'Start')} — ${esc(x.endDate || 'End')}</span></div><div class="l2 ra"><span>${esc(x.company || 'Company')}</span><small>${esc(x.location)}</small></div>${x.description ? `<p>${esc(x.description)}</p>` : ''}</div>`).join('')}</div>`) : '';
  const edH = ed.length ? sec('Education', ed.map((x) => `<div class="rj" style="margin-bottom:12px"><h3 style="font-size:11px">${esc(x.school || 'School')}</h3><p class="ra" style="margin-top:4px;font-size:9px">${esc(x.degree || 'Degree or focus')}</p><p class="mono" style="margin-top:4px;font-size:8px;color:#73807d">${esc(x.startDate)} — ${esc(x.endDate)}</p></div>`).join('')) : '';
  const skH = sk.length ? sec('Skills', `<div class="sk">${sk.map((x) => `<span>${esc(x.name || 'Skill')}</span>`).join('')}</div>`) : '';
  const pjH = pj.length ? sec('Selected projects', pj.map((x) => `<div class="rj" style="margin-bottom:12px"><div class="l1"><h3 style="font-size:11px">${esc(x.name || 'Project name')}</h3>${x.link ? `<span class="dt ra">${esc(x.link)}</span>` : ''}</div>${x.description ? `<p style="margin-top:4px">${esc(x.description)}</p>` : ''}</div>`).join('')) : '';
  const ph = okPhoto(b.photo) ? `<img class="rph" src="${esc(b.photo)}" alt="${esc(b.name || 'Profile photo')}" data-testid="img-resume-photo">` : '';
  const cls = `resume-paper t-${t}`, wid = live ? ' id="resume-print" data-testid="resume-live-preview"' : '', h1 = esc(b.name || 'Your name'), hl = esc(b.headline || 'Your professional headline');
  if (t === 'meridian') return `<article class="${cls}"${wid} style="${st}"><div class="rl">${ph}<h1>${h1}</h1><p class="hl">${hl}</p>${contact}${edH}${skH}</div><div class="rm2">${prof}${exH}${pjH}</div></article>`;
  if (t === 'horizon') return `<article class="${cls}"${wid} style="${st}">${ph ? `<div class="rb hasph"><div style="min-width:0"><h1>${h1}</h1><p class="hl">${hl}</p>${contact}</div>${ph}</div>` : `<div class="rb"><h1>${h1}</h1><p class="hl">${hl}</p>${contact}</div>`}<div class="rc"><div>${prof}${exH}${pjH}</div><div>${edH}${skH}</div></div></article>`;
  const head = `<header class="rh rr">${t === 'chronicle' ? ph : ''}<h1>${h1}</h1><p class="hl">${hl}</p>${contact}</header>`;
  const body = t === 'chronicle' ? `${prof}${exH}${edH}${skH}${pjH}` : `${prof}${exH}<div class="rg">${edH}${skH}</div>${pjH}`;
  return `<article class="${cls}"${wid} style="${st}">${t === 'signal' ? '<div class="bar0 rab"></div>' : ''}${t === 'folio' ? `<div class="rw rr">${head}${body}</div>` : head + body}</article>`;
}
function templates() {
  const cards = Object.keys(TPL).map((k, i) => `<button class="tc ${S.template === k ? 'on' : ''}" data-act="settpl" data-v="${k}" data-testid="button-template-${k}"><div class="pv">${paper(SAMPLE, k, S.accent, false)}</div><div class="tb" style="display:flex;justify-content:space-between;gap:12px"><div><p class="mono accent" style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:.14em">0${i + 1} / ${TPL[k][1]}</p><h2 class="display" style="margin:8px 0 0;font-size:30px">${TPL[k][0]}</h2><p class="muted" style="margin:8px 0 0;font-size:12px;line-height:20px">${TPL[k][2]}</p></div>${S.template === k ? '<span class="pri" style="height:fit-content;border-radius:999px;background:hsl(var(--sec));padding:4px 8px;font-size:9px;font-weight:700">Selected</span>' : ''}</div></button>`).join('');
  return shell('templates', `<main class="wrap" style="padding-block:64px"><div style="max-width:700px"><p class="eyebrow" style="margin:0">The gallery</p><h1 class="display" style="margin:12px 0 0;font-size:clamp(3.4rem,6vw,4.5rem);line-height:.9;letter-spacing:-.02em">Choose a point<br><em class="pri">of view.</em></h1><p class="muted" style="margin:24px 0 0;font-size:16px;line-height:28px">A template should feel like a good editor: present, useful, and never louder than your work. Pick the rhythm that feels like you.</p></div><div class="gal">${cards}</div>
<div style="margin-top:56px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;border:1px solid hsl(var(--bd));background:hsl(var(--sec)/.4);border-radius:16px;padding:24px"><div><p style="margin:0;font-size:14px;font-weight:700">Make it yours</p><p class="muted" style="margin:4px 0 0;font-size:12px">Every template works with every accent. Your content stays at the center.</p></div><div style="display:flex;flex-wrap:wrap;gap:8px">${Object.keys(ACC).map((k) => `<button data-act="setacc" data-gal="1" data-v="${k}" data-testid="button-gallery-accent-${k}" style="display:flex;align-items:center;gap:8px;border-radius:999px;border:1px solid ${S.accent === k ? 'hsl(var(--pri)/.35)' : 'transparent'};${S.accent === k ? 'background:hsl(var(--card))' : ''};padding:8px 12px;font-size:12px;font-weight:600"><span class="dot" style="background:${ACC[k][1]}"></span>${ACC[k][0]}${S.accent === k ? `<span class="pri">${IC.check}</span>` : ''}</button>`).join('')}</div></div></main>`);
}
function settings() {
  const tg = (on, act, tid) => `<button class="tg ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="${act}" data-testid="${tid}"><i></i></button>`;
  const row = (ic, t, c, ctl) => `<div class="pref"><span class="ic">${ic}</span><div style="flex:1;min-width:0"><h3 style="margin:0;font-size:14px">${t}</h3><p class="muted" style="margin:4px 0 0;font-size:12px;line-height:20px">${c}</p></div>${ctl}</div>`;
  const grp = (t, c, b) => `<section class="card"><div style="border-bottom:1px solid hsl(var(--bd));padding:16px 20px"><h2 style="margin:0;font-size:14px">${t}</h2><p class="muted" style="margin:4px 0 0;font-size:12px">${c}</p></div>${b}</section>`;
  return shell('settings', `<main class="wrap" style="max-width:900px;padding-block:64px"><div style="max-width:630px"><p class="eyebrow" style="margin:0">Your preferences</p><h1 class="display" style="margin:12px 0 0;font-size:clamp(3.4rem,6vw,3.75rem);line-height:.9;letter-spacing:-.02em">A workspace<br><em class="pri">that fits.</em></h1><p class="muted" style="margin:24px 0 0;font-size:16px;line-height:28px">Small choices for a more comfortable editing ritual. These settings stay on this device.</p></div>
<div style="margin-top:48px;display:grid;gap:16px">${grp('Workspace', 'How ResumeFlow feels while you work.', row(IC.pal, 'Night reading', 'Use a darker workspace when the light gets low.', tg(S.dark, 'dark', 'toggle-night-reading')) + row(IC.file, 'Compact editor', 'Show more of your resume at once.', tg(S.compact, 'compact', 'toggle-compact-editor')))}${grp('Guidance', 'A little help, never in the way.', row(IC.help, 'Writing prompts', 'Keep the tiny prompts that help you find the sharper sentence.', tg(S.tips, 'tips', 'toggle-writing-prompts')))}
<div style="display:flex;gap:16px;border-radius:16px;background:hsl(var(--sec)/.5);padding:20px"><span class="ic" style="background:hsl(var(--card))">${IC.lock}</span><div><h2 style="margin:0;font-size:14px">Your work stays yours</h2><p class="muted" style="margin:4px 0 0;max-width:530px;font-size:12px;line-height:20px">ResumeFlow is a private workspace. We only use your details to keep your resume ready when you return.</p></div></div></div></main>`);
}
const notFound = () => `<main class="auth"><div style="text-align:center"><div style="display:flex;justify-content:center">${brand()}</div><p class="eyebrow" style="margin:48px 0 0">404 / missing page</p><h1 class="display" style="margin:12px 0 0;font-size:3.75rem">This page wandered off.</h1><p class="muted" style="margin:16px auto 0;max-width:390px;font-size:14px;line-height:24px">The good news: your resume is still exactly where you left it.</p><a class="btn" href="#/builder" data-testid="link-return-builder" style="margin-top:28px">Back to workspace ${IC.arrow}</a></div></main>`;

/* ---------- logic ---------- */
function render(html) { $('#root').innerHTML = html; }
function applyTheme() { document.documentElement.classList.toggle('dark', S.dark); document.body.classList.toggle('dark', S.dark); }
async function loadResume() {
  S.status = 'loading'; draw();
  try { const [r, s] = await Promise.all([api('/resume'), api('/resume/summary')]); S.resume = r.data; S.completion = s.completion; S.status = 'idle'; }
  catch (e) { if (e.status === 401) return; S.status = 'loaderr'; }
  draw();
}
async function save() {
  if (S.status === 'saving') return; S.status = 'saving'; S.saveErr = false; draw();
  try { await api('/resume', { method: 'PUT', body: S.resume }); S.savedAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); S.status = 'idle'; try { S.completion = (await api('/resume/summary')).completion; } catch (e) {} toast('Resume saved'); }
  catch (e) { S.status = 'idle'; S.saveErr = e.status !== 401; }
  draw();
}
function signOut(silent) { S.token = ''; S.user = null; S.menu = false; store.set('resumeflow-token', ''); S.resume = JSON.parse(JSON.stringify(SAMPLE)); S.completion = null; S.savedAt = ''; S.section = 'basics'; S.loaded = false; S.status = 'idle'; go('/'); }
async function ensureUser() {
  if (!S.token) return false;
  if (S.user) return true;
  try { S.user = (await api('/auth/me')).user; return true; } catch (e) { return false; }
}
let current = '';
async function route() {
  const p = (location.hash.replace(/^#/, '') || '/').replace(/\/+$/, '') || '/';
  S.menu = false; S.mob = false; S.accOpen = false; S.authErr = ''; current = p; applyTheme();
  if (p === '/') { if (S.token && (await ensureUser())) return go('/builder'); return render(welcome()); }
  if (p.startsWith('/sign-in') || p.startsWith('/sign-up')) { if (S.token && (await ensureUser())) return go('/builder'); return render(authPage(p.startsWith('/sign-up') ? 'sign-up' : 'sign-in')); }
  if (['/builder', '/templates', '/settings'].includes(p)) {
    if (!(await ensureUser())) return go('/sign-in');
    if (p === '/builder') { if (!S.loaded) { S.loaded = true; return loadResume(); } return draw(); }
    return draw();
  }
  render(notFound());
}
function draw() { if (current === '/builder') render(builder()); else if (current === '/templates') render(templates()); else if (current === '/settings') render(settings()); }
function refreshPreview() {
  $('#preview').innerHTML = paper(S.resume, S.template, S.accent, true);
  const c = S.completion == null ? calc(S.resume) : S.completion; const e = $('#comp'); if (e) e.textContent = c + '%'; const b = $('#compbar'); if (b) b.style.width = c + '%';
}
function setPath(path, v) {
  const [a, b, c] = path.split('.');
  if (!c) { S.resume[a][b] = v; return; }
  const o = S.resume[a][+b]; o[c] = c === 'technologies' ? v.split(',').map((x) => x.trim()).filter(Boolean) : v;
}
const blank = { experience: () => ({ id: id('experience'), role: '', company: '', location: '', startDate: '', endDate: '', description: '' }), education: () => ({ id: id('education'), school: '', degree: '', location: '', startDate: '', endDate: '' }), skills: () => ({ id: id('skill'), name: '', level: 'intermediate' }), projects: () => ({ id: id('project'), name: '', description: '', link: '', technologies: [] }) };

document.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; setPath(k, e.target.value); S.completion = null; refreshPreview(); });
document.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.k; if (k && e.target.tagName === 'SELECT') { setPath(k, e.target.value); refreshPreview(); } });
function processPhoto(file) {
  if (!file || !/^image\//.test(file.type)) return toast('Please choose an image file');
  if (file.size > 10 * 1024 * 1024) return toast('Image is too large (max 10 MB)');
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const W = 280, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), sc = Math.max(W / img.width, H / img.height), w = img.width * sc, h = img.height * sc;
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - h) / 3, w, h);
    S.resume.basics.photo = c.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(url); toast('Photo added — remember to Save'); draw();
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('That image could not be read'); };
  img.src = url;
}
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.photo) processPhoto(e.target.files[0]); });
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'authform') return; e.preventDefault();
  const up = current.startsWith('/sign-up'), fd = Object.fromEntries(new FormData(e.target));
  if (!fd.email || !fd.password || (up && !fd.name)) { S.authErr = 'Please fill in every field.'; return render(authPage(up ? 'sign-up' : 'sign-in')); }
  S.busy = true; S.authErr = ''; render(authPage(up ? 'sign-up' : 'sign-in'));
  try { const r = await api(up ? '/auth/sign-up' : '/auth/sign-in', { method: 'POST', body: fd }); S.token = r.token; S.user = r.user; S.loaded = false; store.set('resumeflow-token', r.token); S.busy = false; go('/builder'); }
  catch (err) { S.busy = false; S.authErr = err.message; render(authPage(up ? 'sign-up' : 'sign-in')); const f = $('#authform'); if (f) { f.email.value = fd.email || ''; if (f.name) f.name.value = fd.name || ''; } }
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]'); if (!t) { if (S.menu || S.accOpen) { S.menu = false; S.accOpen = false; draw(); } return; }
  if (e.target.closest('[data-stop]') && t.dataset.act === 'mobx' && !e.target.closest('button')) return;
  const a = t.dataset.act, d = t.dataset;
  if (a === 'menu') { S.menu = !S.menu; draw(); }
  else if (a === 'signout') signOut();
  else if (a === 'mob') { S.mob = !S.mob; draw(); } else if (a === 'mobx') { S.mob = false; draw(); }
  else if (a === 'toggle') { S.section = d.force ? d.sec : S.section === d.sec ? '' : d.sec; draw(); }
  else if (a === 'add') { S.resume[d.sec].push(blank[d.sec]()); S.section = d.sec; S.completion = null; draw(); }
  else if (a === 'rm') { S.resume[d.sec].splice(+d.i, 1); S.completion = null; draw(); }
  else if (a === 'rmphoto') { delete S.resume.basics.photo; draw(); }
  else if (a === 'save') save(); else if (a === 'retry') loadResume(); else if (a === 'print') window.print();
  else if (a === 'acc') { S.accOpen = !S.accOpen; draw(); }
  else if (a === 'setacc') { S.accent = d.v; S.accOpen = false; store.set('resumeflow-accent', S.accent); draw(); }
  else if (a === 'settpl') { S.template = d.v; store.set('resumeflow-template', d.v); go('/builder'); }
  else if (a === 'dark') { S.dark = !S.dark; store.set('resumeflow-night-reading', String(S.dark)); applyTheme(); draw(); }
  else if (a === 'compact') { S.compact = !S.compact; store.set('resumeflow-compact-editor', String(S.compact)); draw(); }
  else if (a === 'tips') { S.tips = !S.tips; store.set('resumeflow-writing-prompts', String(S.tips)); draw(); }
});
window.addEventListener('hashchange', route);
route();
})();

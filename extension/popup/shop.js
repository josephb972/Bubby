// The shop view: buy clothes (one size per growth stage) and garden decor with Petals, try things on, wear and place them.
// Logic lives in core/shop.js; this file is only the screen.
import * as Shop from '../core/shop.js';
import { petSprite } from '../art/sprites.js';
import { decorThumb } from '../art/decor.js';
import { sprite, E, P } from '../art/pixel.js';
import { drawScene } from './scene.js';

const CONFIRM_MS = 4000;
let PETAL_URL = null;
export function petalIcon() {
  if (!PETAL_URL) {
    PETAL_URL = sprite(9, 9, x => { E(x, 4.5, 4.5, 3.4, 4, '#ff8fc0', .6); E(x, 3.8, 3.6, 1.6, 2, '#ffc2dc', .6); P(x, [5, 6, 6, 5], '#e9679f'); }).toDataURL();
  }
  return PETAL_URL;
}
const petals = n => `<img class="pt" src="${petalIcon()}" alt="">${n}`;

export function createShop(env) {
  // env: { $, S(), meta(), save(), toast(msg), beep(f, d), close() }
  const { $ } = env;
  let tab = 'wear', preview = null, confirm = null, snackT = 0;
  const sel = {};
  const view = $('#viewShop'), list = $('#shopList'), scene = $('#shopScene'), sctx = scene.getContext('2d');
  sctx.imageSmoothingEnabled = false;

  const curStage = () => { const S = env.S(); return S.ended || S.stage === 'seed' ? 'baby' : S.stage; };
  const curSize = () => Shop.SIZE_OF[curStage()];
  const knowsForm = () => !!env.S().variant;

  /* ---------- Preview ---------- */
  function previewState() {
    const S = env.S(), m = env.meta();
    let stage = curStage();
    const equip = { ...m.equip }, home = { ...m.home };
    if (preview) {
      const it = Shop.ITEM[preview.id];
      if (it.kind === 'wear') { equip[it.slot] = it.id; stage = Shop.SIZE_STAGE[preview.size] || stage; }
      else home[it.slot] = it.id;
    }
    const wear = st => {
      const f = {};
      for (const k of Shop.WEAR_SLOTS) {
        const id = equip[k];
        if (id && Shop.ITEM[id] && ((preview && preview.id === id) || Shop.owns(m, id, Shop.SIZE_OF[st]))) f[k] = id;
      }
      return f;
    };
    return { S, stage, wear, home };
  }
  function drawPreview(time) {
    if (view.hidden) return;
    const { S, stage, wear, home } = previewState();
    const forms = (stage === 'adult' || stage === 'senior') && !knowsForm();
    $('#shopForms').hidden = !forms; scene.hidden = forms;
    if (forms) return;
    const fake = { ...S, stage, ended: null, asleep: false, lights: true, call: null, sick: false, poops: [], paused: false };
    drawScene(sctx, fake, null, null, { x: 50, moving: false, dir: 1 }, time, { home, wear, still: env.still });
  }
  function renderForms() {
    const { stage, wear } = previewState();
    $('#shopForms').querySelectorAll('canvas').forEach(c => {
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
      x.drawImage(petSprite(stage, { variant: c.dataset.form, mood: 'happy', outfit: wear(stage) }), 0, 0);
    });
  }
  function caption() {
    const m = env.meta();
    if (!preview) return tab === 'home' ? 'Your garden. Tap an item to try it.' : 'Tap an item to try it on.';
    const it = Shop.ITEM[preview.id];
    if (it.kind === 'home') return `Trying: ${it.name}${Shop.owns(m, it.id) ? '' : ' (not bought yet)'}`;
    const st = Shop.SIZE_STAGE[preview.size];
    const forms = (st === 'adult' || st === 'senior') && !knowsForm();
    return `${it.name}, ${Shop.SIZE_NAME[preview.size]} size${st !== curStage() ? ` · shown on a ${Shop.SIZE_NAME[preview.size]}` : ''}${forms ? '. Fits every form' : ''}`;
  }

  /* ---------- Lists ---------- */
  function actionFor(it, size) {
    const m = env.meta();
    const owned = it.kind === 'wear' ? Shop.owns(m, it.id, size) : Shop.owns(m, it.id);
    if (owned) {
      if (it.kind === 'wear') return m.equip[it.slot] === it.id ? { act: 'off', label: 'Take off' } : { act: 'wear', label: 'Wear' };
      if (m.home[it.slot] === it.id) return Shop.FREE_HOME[it.slot] === it.id ? { act: null, label: 'In the garden' } : { act: 'remove', label: 'Remove' };
      return { act: 'place', label: 'Place' };
    }
    const c = Shop.canBuy(m, it.id, size), price = Shop.priceOf(m, it.id, size);
    if (!c.ok) return { act: null, label: `Need ${c.short} more`, poor: true };
    if (confirm && confirm.id === it.id && confirm.size === size && Date.now() < confirm.until) return { act: 'confirm', label: `Buy for ${price}? Leaves ${m.petals - price}`, hot: true };
    const sz = it.kind === 'wear' ? ` ${Shop.SIZE_NAME[size]}` : '';
    return { act: 'buy', label: `Buy${sz} · ${petals(price)}`, html: true };
  }
  function wearCard(it) {
    const m = env.meta(), S = env.S();
    const size = sel[it.id] || curSize();
    const a = actionFor(it, size);
    const chips = Shop.SIZES.map(sz => {
      const own = Shop.owns(m, it.id, sz), st = Shop.SIZE_STAGE[sz];
      const label = `${Shop.SIZE_NAME[sz]} size${own ? ', owned' : `, ${Shop.priceOf(m, it.id, sz)} Petals`}${sz === curSize() ? ', Bubby’s size now' : ''}`;
      return `<button class="size${sz === curSize() ? ' now' : ''}${own ? ' own' : ''}" data-id="${it.id}" data-size="${sz}" aria-pressed="${sz === size}" aria-label="${label}">
        <canvas width="48" height="56" data-st="${st}" data-id="${it.id}"></canvas><span>${Shop.SIZE_NAME[sz]}</span><em>${own ? '✓' : petals(Shop.priceOf(m, it.id, sz))}</em></button>`;
    }).join('');
    const worn = m.equip[it.slot] === it.id;
    return `<article class="item${worn ? ' worn' : ''}" data-id="${it.id}">
      <div class="item-top"><div class="item-name"><b>${it.name}</b> <span class="tag ${it.rarity}">${Shop.RARITY[it.rarity].label}</span>${worn ? ' <span class="tag on">Worn</span>' : ''}<small>${it.blurb} · ${Shop.SLOT_NAME[it.slot]}</small></div>
      <button class="buy${a.hot ? ' hot' : ''}${a.poor ? ' poor' : ''}" data-act="${a.act || ''}" data-id="${it.id}" data-size="${size}" ${a.act ? '' : 'disabled'}>${a.html ? a.label : esc(a.label)}</button></div>
      <div class="sizes" role="group" aria-label="Sizes">${chips}</div></article>`;
  }
  function homeCard(it) {
    const m = env.meta(), a = actionFor(it, '*'), placed = m.home[it.slot] === it.id;
    return `<article class="item home${placed ? ' worn' : ''}" data-id="${it.id}">
      <canvas class="thumb" width="32" height="32" data-thumb="${it.id}"></canvas>
      <div class="item-name"><b>${it.name}</b>${placed ? ' <span class="tag on">Placed</span>' : ''}<small>${it.blurb} · ${Shop.SLOT_NAME[it.slot]}</small></div>
      <button class="buy${a.hot ? ' hot' : ''}${a.poor ? ' poor' : ''}" data-act="${a.act || ''}" data-id="${it.id}" data-size="*" ${a.act ? '' : 'disabled'}>${a.html ? a.label : esc(a.label)}</button></article>`;
  }
  function closet() {
    const m = env.meta(), stage = curStage(), size = curSize();
    const rows = Shop.WEAR_SLOTS.map(k => {
      const id = m.equip[k], it = id && Shop.ITEM[id];
      if (!it) return `<li><b>${Shop.SLOT_NAME[k]}</b><span class="dim">Nothing</span></li>`;
      const fits = Shop.owns(m, id, size);
      return `<li><b>${Shop.SLOT_NAME[k]}</b><span>${it.name}${fits ? '' : ` <em class="warn">needs ${Shop.SIZE_NAME[size]} size</em>`}</span>
        ${fits ? '' : `<button class="chip small" data-goto="${id}">Get it</button>`}<button class="chip small" data-off="${k}">Take off</button></li>`;
    }).join('');
    const homeRows = Shop.HOME_SLOTS.map(k => {
      const id = m.home[k], it = id && Shop.ITEM[id];
      const free = Shop.FREE_HOME[k] === id;
      return `<li><b>${Shop.SLOT_NAME[k]}</b><span class="${it ? '' : 'dim'}">${it ? it.name : 'Empty'}</span>${it && !free ? `<button class="chip small" data-clear="${k}">Remove</button>` : ''}</li>`;
    }).join('');
    const owned = Shop.CATALOG.filter(i => i.kind === 'wear' && Shop.ownsAny(m, i.id))
      .map(i => `${i.name} (${Shop.SIZES.filter(s => Shop.owns(m, i.id, s)).map(s => Shop.SIZE_NAME[s]).join(', ')})`).join(' · ');
    return `<section class="closet"><h3>Bubby is wearing${stage === 'baby' && env.S().stage === 'seed' ? ' (once it sprouts)' : ''}</h3><ul>${rows}</ul>
      <button class="chip" id="btnUndress">Take everything off</button>
      <h3>In the garden</h3><ul>${homeRows}</ul>
      <h3>Your clothes</h3><p class="note">${owned || 'Nothing yet.'}</p></section>`;
  }
  function earnNote() {
    const e = Shop.EARN;
    return `<details class="earn"><summary>How to earn Petals</summary><p>Seed catch: up to ${e.catchMax} · Which way? win: ${e.guessWin} (first ${e.paidGamesPerDay} games each day) · New best: +${e.newBest} · First care of the day: +${e.firstCare} · Growing up: +${e.evolve} · A full life: +${e.garden}</p></details>`;
  }

  function render() {
    if (view.hidden) return;
    const m = env.meta();
    $('#wallet').innerHTML = petals(m.petals);
    $('#wallet').setAttribute('aria-label', `${m.petals} Petals`);
    view.querySelectorAll('[role="tab"]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === tab)));
    $('#shopCaption').textContent = caption();
    const scrollTop = list.scrollTop;
    // Re-rendering replaces the list: remember which control had keyboard focus, to put it back.
    const f = document.activeElement, fkey = f && list.contains(f) ? [f.className.split(' ')[0], f.dataset.id, f.dataset.size, f.dataset.off, f.dataset.clear, f.dataset.goto, f.id].join('|') : null;
    let html = '';
    if (tab === 'wear') {
      const miss = Shop.missingFor(m, curStage()).map(id => Shop.ITEM[id].name);
      if (miss.length && env.S().stage !== 'seed') html += `<p class="banner">Bubby has outgrown its ${miss.join(' and ')}. Get the ${Shop.SIZE_NAME[curSize()]} size to wear it again.</p>`;
      html += earnNote();
      for (const slot of Shop.WEAR_SLOTS) html += `<h3>${Shop.SLOT_NAME[slot]}</h3>` + Shop.CATALOG.filter(i => i.kind === 'wear' && i.slot === slot).map(wearCard).join('');
    } else if (tab === 'home') {
      html += earnNote();
      for (const slot of Shop.HOME_SLOTS) html += `<h3>${Shop.SLOT_NAME[slot]}</h3>` + Shop.CATALOG.filter(i => i.kind === 'home' && i.slot === slot).map(homeCard).join('');
    } else html = closet();
    list.innerHTML = html;
    list.scrollTop = scrollTop;
    if (fkey) {
      const back = [...list.querySelectorAll('button, summary')].find(b => [b.className.split(' ')[0], b.dataset.id, b.dataset.size, b.dataset.off, b.dataset.clear, b.dataset.goto, b.id].join('|') === fkey);
      if (back) back.focus({ preventScroll: true });
    }
    const S = env.S();
    list.querySelectorAll('canvas[data-st]').forEach(c => {
      const st = c.dataset.st, x = c.getContext('2d');
      x.drawImage(petSprite(st, { variant: S.variant || 'radiant', chubby: S.variant ? S.chubby : false, mood: 'normal', outfit: { [Shop.ITEM[c.dataset.id].slot]: c.dataset.id } }), 0, 0);
    });
    list.querySelectorAll('canvas[data-thumb]').forEach(c => c.getContext('2d').drawImage(decorThumb(c.dataset.thumb, 32), 0, 0));
    renderForms();
  }
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  /* ---------- Actions ---------- */
  function snack(msg, undo) {
    $('#snackText').textContent = msg;
    $('#btnUndo').hidden = !undo;
    $('#shopSnack').hidden = false;
    snackT = undo ? Shop.UNDO_MS / 1000 : 2.5;
  }
  function act(a, id, size) {
    const m = env.meta(), it = Shop.ITEM[id];
    if (!it) return;
    preview = { id, size };
    if (a === 'buy') { confirm = { id, size, until: Date.now() + CONFIRM_MS }; env.beep(880, .03); }
    else if (a === 'confirm') {
      const r = Shop.buy(m, id, size, Date.now());
      confirm = null;
      if (r.ok) {
        if (it.kind === 'wear') Shop.wear(m, id); else Shop.place(m, id);
        env.save(); env.beep(1046, .06); setTimeout(() => env.beep(1318, .1), 90);
        snack(`${r.msg}. ${it.kind === 'wear' ? 'Wearing it' : 'Placed'}!`, true);
      } else snack(r.msg);
    } else if (a === 'wear') { Shop.wear(m, id); env.save(); env.beep(880, .04); }
    else if (a === 'off') { Shop.takeOff(m, it.slot); env.save(); preview = null; }
    else if (a === 'place') { Shop.place(m, id); env.save(); env.beep(880, .04); }
    else if (a === 'remove') { Shop.clearSlot(m, it.slot); env.save(); preview = null; }
    render();
  }

  list.addEventListener('click', e => {
    const t = e.target;
    const b = t.closest('button.buy'); if (b && b.dataset.act) return act(b.dataset.act, b.dataset.id, b.dataset.size);
    const s = t.closest('button.size');
    if (s) { sel[s.dataset.id] = s.dataset.size; preview = { id: s.dataset.id, size: s.dataset.size }; confirm = null; env.beep(660, .02); return render(); }
    const g = t.closest('[data-goto]');
    if (g) { tab = 'wear'; sel[g.dataset.goto] = curSize(); preview = { id: g.dataset.goto, size: curSize() }; render(); const card = list.querySelector(`article[data-id="${g.dataset.goto}"]`); if (card) card.scrollIntoView({ block: 'center' }); return; }
    const off = t.closest('[data-off]'); if (off) { Shop.takeOff(env.meta(), off.dataset.off); env.save(); return render(); }
    const cl = t.closest('[data-clear]'); if (cl) { Shop.clearSlot(env.meta(), cl.dataset.clear); env.save(); return render(); }
    if (t.id === 'btnUndress') { for (const k of Shop.WEAR_SLOTS) Shop.takeOff(env.meta(), k); env.save(); preview = null; return render(); }
    const card = t.closest('article.item');
    if (card && !t.closest('summary')) {
      const it = Shop.ITEM[card.dataset.id];
      preview = { id: it.id, size: it.kind === 'wear' ? sel[it.id] || curSize() : '*' };
      render();
    }
  });
  view.querySelector('.tabs').addEventListener('click', e => {
    const t = e.target.closest('[role="tab"]'); if (!t) return;
    tab = t.dataset.tab; preview = null; confirm = null; list.scrollTop = 0; render();
  });
  view.querySelector('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tabs = [...view.querySelectorAll('[role="tab"]')], i = tabs.findIndex(t => t.dataset.tab === tab);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    tab = n.dataset.tab; preview = null; render(); n.focus();
  });
  $('#btnUndo').addEventListener('click', () => {
    const r = Shop.undoBuy(env.meta(), Date.now());
    if (r.ok) env.save();
    snack(r.msg); preview = null; render();
  });
  $('#btnShopBack').addEventListener('click', () => env.close());

  return {
    open(goto) {
      tab = 'wear'; preview = null; confirm = null;
      if (goto) { sel[goto] = curSize(); preview = { id: goto, size: curSize() }; }
      $('#shopSnack').hidden = true;
      render();
      if (goto) { const card = list.querySelector(`article[data-id="${goto}"]`); if (card) card.scrollIntoView({ block: 'center' }); }
      else list.scrollTop = 0;
      $('#btnShopBack').focus();
    },
    render,
    tick(dt, time) {
      if (view.hidden) return;
      if (snackT > 0) { snackT -= dt; if (snackT <= 0) { $('#shopSnack').hidden = true; if (env.meta().undo) { env.meta().undo = null; } render(); } }
      if (confirm && Date.now() > confirm.until) { confirm = null; render(); }
      drawPreview(time);
    },
  };
}

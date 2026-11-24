// The Shop's Clothes and Garden sections (1.3.0): try things on, buy them with points (one size per stage), wear and
// place them. Logic: core/shop.js. Art: art/wardrobe.js and art/decor.js. Rendered inside the Shop tab (#shopBody).
import * as Shop from '../core/shop.js';
import { wornSprite } from '../art/sprites.js';
import { decorThumb } from '../art/decor.js';
import { drawScene } from './scene.js';

const CONFIRM_MS = 4000;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function createCloset(env) {
  // env: { S(), save(), beep(f, d), toast(msg) }
  let preview = null, confirm = null, snackT = 0, snackMsg = '', canUndo = false, root = null, view = 'clothes';
  const sel = {};
  const S = () => env.S();
  const W = () => (S().wardrobe = S().wardrobe && S().wardrobe.owned ? S().wardrobe : Shop.fixWardrobe(S().wardrobe));
  const curStage = () => { const s = S(); return s.ended || s.stage === 'seed' ? 'baby' : s.stage; };
  const curSize = () => Shop.SIZE_OF[curStage()];
  // Which race to show a size on: the Bulb wears the seed's colours; Bud and up show Bubby's race once it has one
  const raceAt = st => { const s = S(); return st === 'baby' ? s.seedRace : (s.race || s.seedRace); };
  const formKnown = () => !!S().variant;

  /* ---------- Preview (the real garden with Bubby, trying on) ---------- */
  function previewState() {
    const s = S(), w = W();
    let stage = curStage();
    const equip = { ...w.equip }, home = { ...w.home };
    if (preview) {
      const it = Shop.ITEM[preview.id];
      if (it.kind === 'wear') { equip[it.slot] = it.id; stage = Shop.SIZE_STAGE[preview.size] || stage; }
      else home[it.slot] = it.id;
    }
    // Trying on: the previewed item shows even before it's bought
    const owned = { ...w.owned };
    if (preview && Shop.ITEM[preview.id].kind === 'wear') owned[preview.id] = [...new Set([...(owned[preview.id] || []), preview.size])];
    return { s, stage, wardrobe: { owned, equip, home, news: {} } };
  }
  function drawPreview(time) {
    if (!root || !root.isConnected) return;
    const sc = root.querySelector('#clScene'), forms = root.querySelector('#clForms');
    if (!sc) return;
    const { s, stage, wardrobe } = previewState();
    const many = (stage === 'adult' || stage === 'senior') && !formKnown() && view === 'clothes';
    forms.hidden = !many; sc.hidden = many;
    if (many) {
      forms.querySelectorAll('canvas').forEach(c => {
        const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
        x.drawImage(wornSprite(stage, { race: raceAt(stage), variant: c.dataset.form, mood: 'happy', outfit: Shop.outfitFor(wardrobe, stage) }), 0, 0);
      });
      return;
    }
    const fake = { ...s, stage, wardrobe, ended: null, asleep: false, lights: true, call: null, sick: false, disease: null, poops: [], paused: false,
      race: stage === 'baby' ? s.race : (s.race || s.seedRace), variant: stage === 'adult' || stage === 'senior' ? (s.variant || 'daisy') : s.variant };
    drawScene(sc.getContext('2d'), fake, null, null, { x: 50, moving: false, dir: 1 }, time);
  }
  function caption() {
    if (!preview) return view === 'garden' ? 'Your garden. Tap something to try it.' : 'Tap anything to try it on.';
    const it = Shop.ITEM[preview.id];
    if (it.kind === 'home') return `Trying: ${it.name}${Shop.owns(S(), it.id) ? '' : ' (not bought yet)'}`;
    const st = Shop.SIZE_STAGE[preview.size], many = (st === 'adult' || st === 'senior') && !formKnown();
    return `${it.name}, ${Shop.SIZE_NAME[preview.size]} size${st !== curStage() ? ` · shown on a ${Shop.SIZE_NAME[preview.size]}` : ''}${many ? ' · fits every form' : ''}`;
  }

  /* ---------- Cards ---------- */
  function action(it, size) {
    const s = S(), w = W();
    const owned = it.kind === 'wear' ? Shop.owns(s, it.id, size) : Shop.owns(s, it.id);
    if (owned) {
      if (it.kind === 'wear') return w.equip[it.slot] === it.id ? { act: 'off', label: 'Take off' } : { act: 'wear', label: 'Wear' };
      if (w.home[it.slot] === it.id) return Shop.FREE_HOME[it.slot] === it.id ? { act: null, label: 'In the garden' } : { act: 'remove', label: 'Remove' };
      return { act: 'place', label: 'Place' };
    }
    const c = Shop.canBuy(s, it.id, size), price = Shop.priceOf(s, it.id, size);
    if (!c.ok) return { act: null, label: `Need ${c.short} more`, poor: true };
    if (confirm && confirm.id === it.id && confirm.size === size && Date.now() < confirm.until) return { act: 'confirm', label: `Buy for ★${price}? Leaves ${s.points - price}`, confirming: true };
    return { act: 'buy', label: `Buy${it.kind === 'wear' ? ' ' + Shop.SIZE_NAME[size] : ''} · ★${price}` };
  }
  const btn = (a, id, size) => `<button class="cl-buy${a.confirming ? ' confirming' : ''}${a.poor ? ' poor' : ''}" data-cl="${a.act || ''}" data-id="${id}" data-size="${size}" ${a.act ? '' : 'disabled'}>${esc(a.label)}</button>`;
  function wearCard(it) {
    const s = S(), w = W(), size = sel[it.id] || curSize(), worn = w.equip[it.slot] === it.id;
    const chips = Shop.SIZES.map(sz => {
      const own = Shop.owns(s, it.id, sz), price = Shop.priceOf(s, it.id, sz);
      const label = `${Shop.SIZE_NAME[sz]} size${own ? ', owned' : `, ${price} points`}${sz === curSize() ? ', Bubby’s size now' : ''}`;
      return `<button class="cl-size${sz === curSize() ? ' now' : ''}${own ? ' own' : ''}" data-id="${it.id}" data-size="${sz}" aria-pressed="${sz === size}" aria-label="${label}">
        <canvas width="48" height="56" data-st="${Shop.SIZE_STAGE[sz]}" data-id="${it.id}"></canvas><span>${Shop.SIZE_NAME[sz]}</span><em>${own ? '✓' : '★' + price}</em></button>`;
    }).join('');
    return `<article class="cl-item${worn ? ' worn' : ''}" data-id="${it.id}">
      <div class="cl-top"><div class="cl-name"><b>${it.name}</b> <span class="cl-tag ${it.rarity}">${Shop.RARITY[it.rarity].label}</span>${worn ? ' <span class="cl-tag on">Worn</span>' : ''}<small>${it.blurb}</small></div>
      ${btn(action(it, size), it.id, size)}</div>
      <div class="cl-sizes" role="group" aria-label="Sizes">${chips}</div></article>`;
  }
  function homeCard(it) {
    const placed = W().home[it.slot] === it.id;
    return `<article class="cl-item home${placed ? ' worn' : ''}" data-id="${it.id}">
      <canvas class="cl-thumb" width="32" height="32" data-thumb="${it.id}"></canvas>
      <div class="cl-name"><b>${it.name}</b>${placed ? ' <span class="cl-tag on">Placed</span>' : ''}<small>${it.blurb}</small></div>
      ${btn(action(it, '*'), it.id, '*')}</article>`;
  }
  function wearing() {
    const w = W(), size = curSize();
    const rows = Shop.WEAR_SLOTS.map(k => {
      const id = w.equip[k], it = id && Shop.ITEM[id];
      if (!it) return `<li><b>${Shop.SLOT_NAME[k]}</b><span class="dim">Nothing</span></li>`;
      const fits = Shop.owns(S(), id, size);
      return `<li><b>${Shop.SLOT_NAME[k]}</b><span>${it.name}${fits ? '' : ` <em class="warn">needs the ${Shop.SIZE_NAME[size]} size</em>`}</span>
        ${fits ? '' : `<button class="chip small" data-goto="${id}">Get it</button>`}<button class="chip small" data-off="${k}">Take off</button></li>`;
    }).join('');
    return `<section class="shop-sec cl-closet"><h3>Wearing now</h3><ul>${rows}</ul><button class="chip small" data-undress>Take everything off</button></section>`;
  }

  function render(body, which) {
    view = which;
    const s = S(), w = W();
    const st = document.createElement('div');
    st.className = 'cl-stage';
    st.innerHTML = `<canvas id="clScene" width="100" height="75" role="img" aria-label="Preview of Bubby and its garden"></canvas>
      <div class="cl-forms" id="clForms" hidden>${['radiant', 'daisy', 'thistle'].map(f => `<canvas width="48" height="56" data-form="${f}" role="img" aria-label="${f}"></canvas>`).join('')}</div>
      <p class="cl-cap" aria-live="polite">${esc(caption())}</p>
      <div class="cl-snack"${snackT > 0 ? '' : ' hidden'} role="status"><span>${esc(snackMsg)}</span>${canUndo ? '<button class="chip small" data-undo>Undo</button>' : ''}</div>`;
    body.appendChild(st);
    let html = '';
    if (which === 'clothes') {
      const miss = Shop.missingFor(w, curStage()).map(id => Shop.ITEM[id].name);
      if (miss.length && s.stage !== 'seed' && !s.ended) html += `<p class="cl-banner">${esc(s.name || 'Bubby')} has outgrown its ${miss.join(' and ')}. Get the ${Shop.SIZE_NAME[curSize()]} size to wear it again.</p>`;
      html += `<p class="note">Clothes come in four sizes, one for each stage: Bulb, Bud, Blossom and Elder. Buy a size once and every future Bubby wears it at that stage. Pick something once and Bubby wears the size that fits as it grows.</p>`;
      for (const slot of Shop.WEAR_SLOTS) html += `<section class="shop-sec"><h3>${Shop.SLOT_NAME[slot]}</h3>${Shop.CATALOG.filter(i => i.kind === 'wear' && i.slot === slot).map(wearCard).join('')}</section>`;
      html += wearing();
    } else {
      html += `<p class="note">Decorations sit in fixed spots, so they never hide the poop, the falling seeds or Bubby. The lantern and fireflies glow when the lights are off.</p>`;
      for (const slot of Shop.HOME_SLOTS) html += `<section class="shop-sec"><h3>${Shop.SLOT_NAME[slot]}</h3>${Shop.CATALOG.filter(i => i.kind === 'home' && i.slot === slot).map(homeCard).join('')}</section>`;
    }
    const list = document.createElement('div'); list.className = 'cl-list'; list.innerHTML = html;
    body.appendChild(list);
    list.querySelectorAll('canvas[data-st]').forEach(c => {
      const stg = c.dataset.st, adultish = stg === 'adult' || stg === 'senior';
      c.getContext('2d').drawImage(wornSprite(stg, { race: raceAt(stg), variant: adultish ? (s.variant || 'daisy') : undefined, chubby: adultish && s.variant ? s.chubby : false,
        mood: 'normal', outfit: { [Shop.ITEM[c.dataset.id].slot]: c.dataset.id } }), 0, 0);
    });
    list.querySelectorAll('canvas[data-thumb]').forEach(c => c.getContext('2d').drawImage(decorThumb(c.dataset.thumb, 32), 0, 0));
    root = body;
    drawPreview(performance.now() / 1000);
  }

  function snack(msg, undo) { snackMsg = msg; canUndo = !!undo; snackT = undo ? Shop.UNDO_MS / 1000 : 2.5; }
  function act(a, id, size) {
    const s = S(), it = Shop.ITEM[id];
    if (!it) return;
    preview = { id, size };
    if (a === 'buy') { confirm = { id, size, until: Date.now() + CONFIRM_MS }; env.beep(880, .03); }
    else if (a === 'confirm') {
      const r = Shop.buyCosmetic(s, id, size, Date.now());
      confirm = null;
      if (r.ok) {
        if (it.kind === 'wear') Shop.wear(s, id); else Shop.place(s, id);
        env.bought && env.bought();
        env.save(); env.beep(1046, .06); setTimeout(() => env.beep(1318, .1), 90);
        snack(`${r.msg}. ${it.kind === 'wear' ? 'Wearing it' : 'Placed'}!`, true);
      } else snack(r.msg);
    } else if (a === 'wear') { Shop.wear(s, id); env.save(); env.beep(880, .04); }
    else if (a === 'off') { Shop.takeOff(s, it.slot); env.save(); preview = null; }
    else if (a === 'place') { Shop.place(s, id); env.save(); env.beep(880, .04); }
    else if (a === 'remove') { Shop.clearSlot(s, it.slot); env.save(); preview = null; }
  }

  return {
    render,
    // Clicks inside #shopBody. Returns true when it was the closet's (then the Shop re-renders).
    click(e) {
      const t = e.target;
      const b = t.closest('button.cl-buy'); if (b) { if (b.dataset.cl) act(b.dataset.cl, b.dataset.id, b.dataset.size); return true; }
      const z = t.closest('button.cl-size');
      if (z) { sel[z.dataset.id] = z.dataset.size; preview = { id: z.dataset.id, size: z.dataset.size }; confirm = null; env.beep(660, .02); return true; }
      if (t.closest('[data-undo]')) { const r = Shop.undoBuy(S(), Date.now()); if (r.ok) env.save(); snack(r.msg); preview = null; return true; }
      const g = t.closest('[data-goto]'); if (g) { sel[g.dataset.goto] = curSize(); preview = { id: g.dataset.goto, size: curSize() }; return 'scroll:' + g.dataset.goto; }
      const off = t.closest('[data-off]'); if (off) { Shop.takeOff(S(), off.dataset.off); env.save(); return true; }
      if (t.closest('[data-undress]')) { for (const k of Shop.WEAR_SLOTS) Shop.takeOff(S(), k); env.save(); preview = null; return true; }
      const card = t.closest('article.cl-item');
      if (card) { const it = Shop.ITEM[card.dataset.id]; preview = { id: it.id, size: it.kind === 'wear' ? sel[it.id] || curSize() : '*' }; return true; }
      return false;
    },
    // Opening the shop at an item Bubby outgrew
    focus(id) { if (Shop.ITEM[id]) { sel[id] = curSize(); preview = { id, size: curSize() }; } },
    reset() { preview = null; confirm = null; },
    // Every frame while the section is open. Returns true when the list needs a re-render (the confirm or undo ran out).
    tick(dt, time) {
      let again = false;
      if (snackT > 0) { snackT -= dt; if (snackT <= 0) { canUndo = false; if (W().undo) W().undo = null; again = true; } }
      if (confirm && Date.now() > confirm.until) { confirm = null; again = true; }
      drawPreview(time);
      return again;
    },
  };
}

// Welcome page: wobbling seed, plus the one-time bedtime question (extension pages can't run inline scripts).
import { petSprite } from '../art/sprites.js';
import { loadState } from '../core/store.js';

const c = document.getElementById('pet').getContext('2d');
let t = 0;
(function loop() {
  t++;
  c.clearRect(0, 0, 48, 48);
  c.drawImage(petSprite('seed', { wobble: (t >> 4) % 2 ? 1 : -1, crack: true }), 0, 0);
  setTimeout(() => requestAnimationFrame(loop), 30);
})();

/* ---------- Bedtime ---------- */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const hhmm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const toMin = v => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
const msg = (text, err) => { $('bedMsg').textContent = text; $('bedMsg').classList.toggle('err', !!err); };

loadState().then(S => {
  $('inBed').value = hhmm(S.cfg.bed);
  $('inWake').value = hhmm(S.cfg.wake);
  if (S.cfg.bedAsked) msg('Bedtime saved. You can change it any time under ⚙ Settings.');
});

$('bedForm').addEventListener('submit', async e => {
  e.preventDefault();
  const bed = toMin($('inBed').value), wake = toMin($('inWake').value);
  if (!(bed >= 0) || !(wake >= 0)) return msg('Please pick both times.', true);
  if (bed === wake) return msg('Bedtime and wake-up time need to be different.', true);
  try {
    const r = await chrome.runtime.sendMessage({ type: 'set-bedtime', bed, wake });
    if (!r || !r.ok) throw new Error('not saved');
    msg(`Saved! Bubby sleeps from ${hhmm(bed)} to ${hhmm(wake)}. You can change it any time under ⚙ Settings.`);
  } catch (err) {
    msg('Could not save. Please try again, or set it under ⚙ Settings in the popup.', true);
  }
});

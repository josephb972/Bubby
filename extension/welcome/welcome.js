// Welcome page: wobbling seed, and the bedtime fields in step 4 (extension pages can't run inline scripts).
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

/* ---------- Bedtime: saved as soon as a time changes, like the popup's settings ---------- */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const hhmm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const toMin = v => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
const say = text => { $('bedMsg').textContent = text; };

loadState().then(S => { $('inBed').value = hhmm(S.cfg.bed); $('inWake').value = hhmm(S.cfg.wake); });

async function save() {
  if (!$('inBed').value || !$('inWake').value) return;
  const bed = toMin($('inBed').value), wake = toMin($('inWake').value);
  if (bed === wake) return say('Pick two different times.');
  try {
    const r = await chrome.runtime.sendMessage({ type: 'set-bedtime', bed, wake });
    say(r && r.ok ? 'Saved ✓' : 'Not saved. Try again, or use the ⚙ gear in the popup.');
  } catch (e) {
    say('Not saved. Try again, or use the ⚙ gear in the popup.');
  }
}
$('inBed').addEventListener('change', save);
$('inWake').addEventListener('change', save);

// Wobbling seed on the welcome page (extension pages can't run inline scripts).
import { petSprite } from '../art/sprites.js';
const c = document.getElementById('pet').getContext('2d');
let t = 0;
(function loop() {
  t++;
  c.clearRect(0, 0, 48, 48);
  c.drawImage(petSprite('seed', { wobble: (t >> 4) % 2 ? 1 : -1, crack: true }), 0, 0);
  setTimeout(() => requestAnimationFrame(loop), 30);
})();

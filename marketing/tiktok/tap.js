// Recording harness only (injected into a temporary copy of the popup by tools/tiktok-videos.mjs).
// 1. Records Bubby's own sound effects (its square-wave beeps) so the video can replay them exactly.
// 2. Lets the stage stop an old popup from saving while the next scene loads (window.__frozen).
(() => {
  const post = m => { try { parent.postMessage(m, '*'); } catch (e) {} };
  class FakeParam { constructor(v) { this.value = v; } setValueAtTime(v) { this.value = v; } exponentialRampToValueAtTime() {} }
  class FakeNode { connect() {} }
  class FakeOsc extends FakeNode {
    constructor() { super(); this.frequency = new FakeParam(440); this.type = 'square'; }
    start() { this.t0 = Date.now(); }
    stop(at) { post({ beep: true, t: this.t0, f: this.frequency.value, d: Math.max(.03, at - this._ctx.currentTime - .02), v: this._gain ? this._gain.gain.value : .05 }); }
    connect(g) { this._gain = g; }
  }
  class FakeGain extends FakeNode { constructor() { super(); this.gain = new FakeParam(1); } }
  class FakeAC {
    get currentTime() { return performance.now() / 1000; }
    get destination() { return {}; }
    createOscillator() { const o = new FakeOsc(); o._ctx = this; return o; }
    createGain() { return new FakeGain(); }
  }
  window.AudioContext = FakeAC;
  const local = chrome.storage.local, set = local.set.bind(local);
  try { local.set = o => (window.__frozen ? Promise.resolve() : set(o)); } catch (e) {}
})();

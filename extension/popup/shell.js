// Builds the scalloped shell, bezel and key-chain of the original Bubby toy (ported from index.html).
export function buildShell(root = document) {
  const $ = s => root.querySelector(s);
  const ring = (cx, cy, ax, ay, r, n, crx, cry) => {
    let s = `<ellipse cx="${cx}" cy="${cy}" rx="${crx}" ry="${cry}"/>`;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; s += `<circle cx="${(cx + ax * Math.cos(a)).toFixed(1)}" cy="${(cy + ay * Math.sin(a)).toFixed(1)}" r="${r}"/>`; }
    return s;
  };
  const body = ring(180, 349, 112, 180, 61, 16, 152, 220);
  ['#bodySh', '#bodyLn', '#bodyFl'].forEach(id => { $(id).innerHTML = body; });
  const bc = [180, 290];
  let bez = `<rect x="${bc[0] - 120}" y="${bc[1] - 134}" width="240" height="268" rx="40"/>`;
  const lobes = [[94, 110, 36], [-94, 110, 36], [94, -110, 36], [-94, -110, 36], [34, 124, 32], [-34, 124, 32], [34, -124, 32], [-34, -124, 32], [106, 40, 30], [-106, 40, 30], [106, -40, 30], [-106, -40, 30]];
  lobes.forEach(([dx, dy, r]) => { bez += `<circle cx="${bc[0] + dx}" cy="${bc[1] + dy}" r="${r}"/>`; });
  ['#bezSh', '#bezLn', '#bezFl'].forEach(id => { $(id).innerHTML = bez; });
  let ch = '';
  const N = 22, a0 = 170 * Math.PI / 180, a1 = 370 * Math.PI / 180, cx = 168, cy = 92, r = 64;
  for (let i = 0; i <= N; i++) {
    const a = a0 + (a1 - a0) * i / N, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, rot = (a * 180 / Math.PI + 90).toFixed(1);
    ch += i % 2 ? `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="1.6" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" stroke-width="2.6"/>`
                : `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="4" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  $('#chain').innerHTML = `<g stroke="#7f8894" stroke-width="5.4">${ch}</g>${ch}`;
}

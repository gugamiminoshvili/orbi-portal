export function ph(seed, w = 600, h = 400) {
  const hues = [[26, 138, 78], [54, 153, 255], [255, 168, 0], [241, 65, 108], [124, 77, 255], [120, 160, 210]];
  const c = hues[seed % hues.length], c2 = hues[(seed + 2) % hues.length];
  return `data:image/svg+xml;utf8,` + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='rgb(${c.join(',')})'/><stop offset='1' stop-color='rgb(${c2.join(',')})'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/><circle cx='${w * 0.8}' cy='${h * 0.25}' r='${h * 0.4}' fill='rgba(255,255,255,0.12)'/><circle cx='${w * 0.2}' cy='${h * 0.9}' r='${h * 0.5}' fill='rgba(0,0,0,0.06)'/></svg>`);
}

export function qrSvg(text) {
  const N = 25, q = 2, sz = N + q * 2; let h = 0; for (let i = 0; i < text.length; i++) h = (h * 131 + text.charCodeAt(i)) >>> 0;
  const rnd = () => { h = (h * 1103515245 + 12345) >>> 0; return (h >>> 16) / 65536; };
  const finder = (r, c) => { let s = ''; for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) { const edge = dy === 0 || dy === 6 || dx === 0 || dx === 6; const core = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4; if (edge || core) s += `<rect x='${c + dx}' y='${r + dy}' width='1' height='1'/>`; } return s; };
  const inFinder = (x, y) => ((x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7));
  let mods = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (inFinder(x, y)) continue; if (rnd() > 0.52) mods += `<rect x='${x + q}' y='${y + q}' width='1' height='1'/>`; }
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${sz} ${sz}' shape-rendering='crispEdges'><rect width='${sz}' height='${sz}' fill='#fff'/><g fill='#15152e'>${mods}<g transform='translate(${q},${q})'>${finder(0, 0)}${finder(0, N - 7)}${finder(N - 7, 0)}</g></g></svg>`;
}

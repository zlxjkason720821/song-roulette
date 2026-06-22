window.SongRoulette = (() => {
  const STORE_KEY = "songRoulette_v1";
  const SOUND_KEY = "songRoulette_sound";

  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = t => (t || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtSub = s => {
    const p = [];
    if (s.singer) p.push(s.singer);
    if (s.note) p.push(s.note);
    return p.join(" · ");
  };

  function loadPool() {
    let pool = [], sung = [];
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (d) { pool = d.pool || []; sung = d.sung || []; }
    } catch (_) {}
    return { pool, sung };
  }
  function savePool(pool, sung) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ pool, sung, _stamp: Date.now() })); } catch (_) {}
  }
  function loadSound() {
    let soundOn = true, type = "celestial";
    try {
      const s = JSON.parse(localStorage.getItem(SOUND_KEY));
      if (s) { soundOn = s.on !== false; type = s.type || "celestial"; }
    } catch (_) {}
    return { soundOn, type };
  }
  function saveSound(soundOn, type) {
    try { localStorage.setItem(SOUND_KEY, JSON.stringify({ on: soundOn, type })); } catch (_) {}
  }

  let _ac = null, _reverb = null;
  function ensureAudio() {
    if (_ac) return;
    _ac = new (window.AudioContext || window.webkitAudioContext)();
    const len = _ac.sampleRate * 2.6, buf = _ac.createBuffer(2, len, _ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    _reverb = _ac.createConvolver(); _reverb.buffer = buf;
    const wet = _ac.createGain(); wet.gain.value = .55; _reverb.connect(wet); wet.connect(_ac.destination);
  }
  function tone(f, start, dur, vol, type, toReverb) {
    const o = _ac.createOscillator(), g = _ac.createGain();
    o.type = type || "sine"; o.frequency.value = f; o.connect(g); g.connect(_ac.destination);
    if (toReverb !== false) g.connect(_reverb);
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + .006);
    g.gain.exponentialRampToValueAtTime(.0001, start + dur); o.start(start); o.stop(start + dur + .05);
  }
  const SOUNDS = {
    celestial(now) { [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, now + i * .07, 2.6 - i * .18, .16 - i * .012, "sine")); tone(523.25, now, 3.2, .05, "sine"); },
    crystal(now) { [2093, 2637, 3136].forEach((f, i) => tone(f, now, 1.8 - i * .25, .13 * (1 - i * .22), "sine")); tone(4186, now, .5, .06, "triangle"); },
    windchime(now) { const bank = [1568, 1864.7, 2093, 2349.3, 2637, 3136]; const n = 4 + Math.floor(Math.random() * 2); for (let i = 0; i < n; i++) tone(bank[Math.floor(Math.random() * bank.length)], now + Math.random() * .35, 1.4 + Math.random() * .8, .09, "sine"); },
    bowl(now) { tone(196, now, 4, .16, "sine"); tone(392, now, 3.6, .09, "sine"); tone(587.33, now, 3.2, .05, "sine"); tone(198.5, now, 4, .06, "sine"); },
    bell(now) {
      [1318.5, 1975.5, 2637].forEach((f, i) => tone(f, now, 1.6, .22 * [1, .4, .18][i], "sine"));
      const o2 = _ac.createOscillator(), g2 = _ac.createGain(); o2.type = "triangle";
      o2.frequency.setValueAtTime(3520, now); o2.frequency.exponentialRampToValueAtTime(2637, now + .12);
      o2.connect(g2); g2.connect(_ac.destination); g2.connect(_reverb);
      g2.gain.setValueAtTime(.12, now); g2.gain.exponentialRampToValueAtTime(.0001, now + .45); o2.start(now); o2.stop(now + .5);
    }
  };
  function playSound(type) {
    try { ensureAudio(); if (_ac.state === "suspended") _ac.resume(); (SOUNDS[type] || SOUNDS.celestial)(_ac.currentTime); } catch (_) {}
  }
  function resumeAudio() { if (_ac && _ac.state === "suspended") _ac.resume(); }

  function parseText(raw) {
    return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(name => ({ name }));
  }
  function parseCsv(raw) {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const split = l => l.includes("\t") ? l.split("\t") : l.split(",");
    let start = 0;
    const first = split(lines[0]).map(c => c.trim());
    if (/歌名|name|title/i.test(first[0])) start = 1;
    const out = [];
    for (let i = start; i < lines.length; i++) {
      const c = split(lines[i]).map(x => x.trim());
      if (c[0]) out.push({ name: c[0], singer: c[1] || "", note: c[2] || "" });
    }
    return out;
  }

  return { STORE_KEY, SOUND_KEY, uid, esc, fmtSub, loadPool, savePool, loadSound, saveSound, playSound, resumeAudio, parseText, parseCsv };
})();

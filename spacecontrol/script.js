'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const state = {
  view: 'overview',
  missionStart: Date.now() - 1000 * 60 * 60 * 3,
  alerts: [],
  logs: [],
  muted: false,
  planetAngle: 0,
  radarAngle: 0,
  signalData: [],
  telemetry: { altitude: [], velocity: [], temp: [] },
  booted: false
};

/* =========================================================
   UTILS
   ========================================================= */
const pad2 = n => String(n).padStart(2, '0');
const fmtHM = d => {
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor(d % 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
};
const rnd = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rnd(a, b + 1));

/* =========================================================
   STARFIELD
   ========================================================= */
(function starfield() {
  const c = $('#starfield');
  const ctx = c.getContext('2d');
  let stars = [];
  let W, H, dpr;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.floor((W * H) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + .2,
      a: Math.random() * .6 + .2,
      speed: Math.random() * .04 + .01,
      twinkle: Math.random() * Math.PI * 2
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now() / 1000;
    for (const s of stars) {
      s.y += s.speed;
      if (s.y > H + 2) s.y = -2;
      const alpha = s.a * (0.6 + Math.sin(t * 2 + s.twinkle) * 0.4);
      ctx.fillStyle = `rgba(180,220,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  resize();
  draw();
})();

/* =========================================================
   BOOT SEQUENCE
   ========================================================= */
const BOOT_LINES = [
  { t: 'NEXUS-7 BIOS v3.2.1', cls: 'info' },
  { t: 'POST memory check............ OK', cls: 'ok' },
  { t: 'Initializing quantum core... OK', cls: 'ok' },
  { t: 'Loading star catalog........ 47,281 objects', cls: 'info' },
  { t: 'Mounting data arrays........ OK', cls: 'ok' },
  { t: 'Linking orbital telemetry... OK', cls: 'ok' },
  { t: 'Calibrating radar array..... OK', cls: 'ok' },
  { t: 'Establishing uplink......... 182 ms', cls: 'info' },
  { t: 'Verifying crew manifests.... 6 personnel', cls: 'ok' },
  { t: 'Running diagnostics......... 3 minor warnings', cls: 'warn' },
  { t: 'All primary systems......... NOMINAL', cls: 'ok' },
  { t: 'Launching control interface...', cls: 'info' }
];

function runBoot() {
  const logEl = $('#bootLog');
  const fillEl = $('#bootFill');
  const pctEl = $('#bootPct');

  let i = 0;
  const total = BOOT_LINES.length;

  const step = () => {
    if (i >= total) {
      fillEl.style.width = '100%';
      pctEl.textContent = '100%';
      setTimeout(finishBoot, 500);
      return;
    }
    const line = BOOT_LINES[i];
    const span = document.createElement('span');
    span.className = `line ${line.cls}`;
    span.textContent = `> ${line.t}`;
    logEl.appendChild(span);
    logEl.scrollTop = logEl.scrollHeight;

    const pct = Math.round(((i + 1) / total) * 100);
    fillEl.style.width = pct + '%';
    pctEl.textContent = pct + '%';

    i++;
    setTimeout(step, 160 + Math.random() * 120);
  };

  step();
}

function finishBoot() {
  if (state.booted) return;
  state.booted = true;
  const boot = $('#boot');
  boot.classList.add('exit');
  $('#app').classList.add('ready');
  setTimeout(() => boot.remove(), 900);
  toast('NEXUS-7 online', 'ok');
}

/* =========================================================
   TOAST
   ========================================================= */
function toast(msg, level = 'INFO') {
  pushAlert(msg, level.toLowerCase());
}

/* =========================================================
   ALERTS
   ========================================================= */
function pushAlert(msg, type = 'info') {
  const t = new Date();
  const alert = {
    type,
    msg,
    time: `${pad2(t.getHours())}:${pad2(t.getMinutes())}:${pad2(t.getSeconds())}`
  };
  state.alerts.unshift(alert);
  if (state.alerts.length > 20) state.alerts.pop();
  renderAlerts();
}

function renderAlerts() {
  const el = $('#alertList');
  if (!el) return;
  if (!state.alerts.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-family:var(--mono);font-size:.7rem">NO ACTIVE ALERTS</div>';
    $('#alertCount').textContent = '0';
    return;
  }
  const typeCls = { info: '', ok: 'ok', warn: 'warn', crit: 'crit' };
  el.innerHTML = state.alerts.map(a => `
    <div class="alert-item ${typeCls[a.type] || ''}">
      <time>${a.time}</time>
      <span class="msg">${a.msg}</span>
    </div>
  `).join('');
  $('#alertCount').textContent = state.alerts.length;
}

/* =========================================================
   LOGS
   ========================================================= */
function pushLog(msg, lvl = 'INFO') {
  const t = new Date();
  state.logs.unshift({
    time: `${pad2(t.getHours())}:${pad2(t.getMinutes())}:${pad2(t.getSeconds())}`,
    lvl, msg
  });
  if (state.logs.length > 200) state.logs.pop();
  renderLogs();
}

function renderLogs() {
  const el = $('#logList');
  if (!el) return;
  $('#logCount').textContent = `${state.logs.length} EVENTS`;
  el.innerHTML = state.logs.map(l => `
    <div class="log-entry">
      <span class="t">${l.time}</span>
      <span class="lvl ${l.lvl}">${l.lvl}</span>
      <span class="msg">${l.msg}</span>
    </div>
  `).join('');
}

/* =========================================================
   PLANET (wireframe globe)
   ========================================================= */
function initPlanet() {
  const c = $('#planetCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, dpr;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(x, y, z, cx, cy, R) {
    const s = R / (R + z * 0.001);
    return { x: cx + x * s, y: cy + y * s, z };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.36;
    const rotY = state.planetAngle;

    // Glow
    const g = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.6);
    g.addColorStop(0, 'rgba(0,217,255,0.15)');
    g.addColorStop(1, 'rgba(0,217,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Latitude lines
    for (let lat = -75; lat <= 75; lat += 15) {
      const latR = lat * Math.PI / 180;
      ctx.beginPath();
      let first = true;
      for (let lon = 0; lon <= 360; lon += 4) {
        const lonR = lon * Math.PI / 180 + rotY;
        const x3 = R * Math.cos(latR) * Math.cos(lonR);
        const y3 = R * Math.sin(latR);
        const z3 = R * Math.cos(latR) * Math.sin(lonR);
        const p = project(x3, y3, z3, cx, cy, R);
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(0,217,255,0.18)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Longitude lines
    for (let lon = 0; lon < 360; lon += 15) {
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 4) {
        const latR = lat * Math.PI / 180;
        const lonR = lon * Math.PI / 180 + rotY;
        const x3 = R * Math.cos(latR) * Math.cos(lonR);
        const y3 = R * Math.sin(latR);
        const z3 = R * Math.cos(latR) * Math.sin(lonR);
        const p = project(x3, y3, z3, cx, cy, R);
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(0,217,255,0.13)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Equator brighter
    ctx.beginPath();
    for (let lon = 0; lon <= 360; lon += 4) {
      const lonR = lon * Math.PI / 180 + rotY;
      const x3 = R * Math.cos(lonR);
      const z3 = R * Math.sin(lonR);
      const p = project(x3, 0, z3, cx, cy, R);
      if (lon === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(0,217,255,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Orbit ring
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * 1.5, R * 0.4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,217,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Satellite on orbit
    const satAngle = state.planetAngle * 2;
    const satX = cx + Math.cos(satAngle) * R * 1.5;
    const satY = cy + Math.sin(satAngle) * R * 0.4;
    ctx.fillStyle = 'var(--primary)';
    ctx.shadowColor = 'rgba(0,217,255,0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(satX, satY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Center glow dot
    ctx.fillStyle = 'rgba(0,217,255,0.9)';
    ctx.shadowColor = 'rgba(0,217,255,1)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    state.planetAngle += 0.006;
    requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  resize();
  draw();
}

/* =========================================================
   RADAR
   ========================================================= */
function initRadar() {
  const c = $('#radarCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, dpr;
  const blips = [];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.42;

    // Concentric circles
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * (i / 4), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,217,255,0.18)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Crosshairs
    ctx.strokeStyle = 'rgba(0,217,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // Sweep gradient
    const sweep = state.radarAngle;
    const grad = ctx.createConicGradient(sweep, cx, cy);
    grad.addColorStop(0, 'rgba(0,217,255,0.35)');
    grad.addColorStop(0.15, 'rgba(0,217,255,0.05)');
    grad.addColorStop(1, 'rgba(0,217,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Sweep line
    ctx.strokeStyle = 'rgba(0,217,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,217,255,0.9)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Spawn blips randomly
    if (Math.random() < 0.03 && blips.length < 8) {
      blips.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.2 + Math.random() * 0.75,
        life: 1
      });
    }

    // Draw blips
    for (let i = blips.length - 1; i >= 0; i--) {
      const b = blips[i];
      b.life -= 0.004;
      if (b.life <= 0) { blips.splice(i, 1); continue; }
      const x = cx + Math.cos(b.angle) * R * b.dist;
      const y = cy + Math.sin(b.angle) * R * b.dist;
      const intensity = 0.5 + 0.5 * Math.sin(Date.now() / 200 + i);
      ctx.fillStyle = `rgba(0,255,136,${b.life * intensity})`;
      ctx.shadowColor = 'rgba(0,255,136,0.9)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Center dot
    ctx.fillStyle = 'rgba(0,217,255,1)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    state.radarAngle += 0.025;
    requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  resize();
  draw();
}

/* =========================================================
   SIGNAL WAVEFORM
   ========================================================= */
function initSignal() {
  const c = $('#signalCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, dpr;

  const N = 120;
  for (let i = 0; i < N; i++) state.signalData.push(0.5);

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const midY = H / 2;

    // Baseline
    ctx.strokeStyle = 'rgba(0,217,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(W, midY);
    ctx.stroke();

    // Push new sample
    const last = state.signalData[N - 1];
    const next = Math.max(0.1, Math.min(0.9,
      last + rnd(-0.15, 0.15) + (Math.random() < 0.05 ? rnd(-0.4, 0.4) : 0)
    ));
    state.signalData.push(next);
    state.signalData.shift();

    // Draw waveform
    ctx.beginPath();
    const stepX = W / (N - 1);
    state.signalData.forEach((v, i) => {
      const x = i * stepX;
      const y = midY - (v - 0.5) * H * 1.5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,217,255,0.7)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Signal tag
    const avg = state.signalData.reduce((a, b) => a + b, 0) / N;
    const tag = $('#signalTag');
    if (tag) {
      if (avg > 0.65) { tag.textContent = 'STRONG'; tag.style.color = 'var(--ok)'; }
      else if (avg > 0.4) { tag.textContent = 'FAIR'; tag.style.color = 'var(--warn)'; }
      else { tag.textContent = 'WEAK'; tag.style.color = 'var(--crit)'; }
    }

    requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  resize();
  draw();
}

/* =========================================================
   TELEMETRY MULTI-LINE CHART
   ========================================================= */
function initTelemetry() {
  const c = $('#telemetryCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, dpr;

  const N = 200;
  state.telemetry.altitude = Array(N).fill(0.5);
  state.telemetry.velocity = Array(N).fill(0.5);
  state.telemetry.temp = Array(N).fill(0.5);

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function push(arr, drift = 0) {
    const last = arr[N - 1];
    const next = Math.max(0.1, Math.min(0.9, last + rnd(-0.08, 0.08) + drift));
    arr.push(next); arr.shift();
  }

  function drawLine(arr, color, label) {
    const stepX = W / (N - 1);
    ctx.beginPath();
    arr.forEach((v, i) => {
      const x = i * stepX;
      const y = H - v * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0,217,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const x = (W / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
      ctx.stroke();
    }

    push(state.telemetry.altitude, 0.001);
    push(state.telemetry.velocity, -0.001);
    push(state.telemetry.temp, 0);

    drawLine(state.telemetry.altitude, '#00d9ff');
    drawLine(state.telemetry.velocity, '#00ff88');
    drawLine(state.telemetry.temp, '#ff9a3c');

    // Legend
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#00d9ff';
    ctx.fillText('● ALTITUDE', 10, 16);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('● VELOCITY', 10, 30);
    ctx.fillStyle = '#ff9a3c';
    ctx.fillText('● TEMP', 10, 44);

    requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  resize();
  draw();
}

/* =========================================================
   STAR MAP
   ========================================================= */
function initStarMap() {
  const c = $('#starMapCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, dpr;
  let stars = [];
  const ship = { x: 0.5, y: 0.5 };
  const planets = [
    { x: 0.2, y: 0.3, r: 6, color: '#ff9a3c', name: 'KEPLER-442b' },
    { x: 0.75, y: 0.65, r: 8, color: '#00d9ff', name: 'PROXIMA-B' },
    { x: 0.45, y: 0.75, r: 5, color: '#ff2d55', name: 'TRAPPIST-1e' },
    { x: 0.85, y: 0.2, r: 7, color: '#00ff88', name: 'WOLF-1061c' }
  ];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = c.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + .2,
      a: Math.random() * 0.7 + 0.2
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background stars
    const t = Date.now() / 1000;
    stars.forEach(s => {
      const alpha = s.a * (0.6 + Math.sin(t * 2 + s.x) * 0.4);
      ctx.fillStyle = `rgba(180,220,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Grid overlay
    ctx.strokeStyle = 'rgba(0,217,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo((W / 10) * i, 0);
      ctx.lineTo((W / 10) * i, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (H / 10) * i);
      ctx.lineTo(W, (H / 10) * i);
      ctx.stroke();
    }

    // Planets
    planets.forEach(p => {
      const px = p.x * W, py = p.y * H;

      // Halo
      const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 4);
      g.addColorStop(0, p.color + '60');
      g.addColorStop(1, p.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, p.r * 4, 0, Math.PI * 2);
      ctx.fill();

      // Planet
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = p.color;
      ctx.fillText(p.name, px + p.r + 6, py + 3);
    });

    // Ship (pulsing)
    const sx = ship.x * W, sy = ship.y * H;
    const pulse = 8 + Math.sin(t * 3) * 4;
    ctx.strokeStyle = 'rgba(0,217,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, pulse / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,217,255,1)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Route to nearest planet
    const target = planets[1];
    ctx.strokeStyle = 'rgba(0,217,255,0.4)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(target.x * W, target.y * H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Slow drift
    ship.x += Math.sin(t * 0.5) * 0.0002;
    ship.y += Math.cos(t * 0.4) * 0.0002;

    requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  resize();
  draw();
}

/* =========================================================
   WAYPOINTS
   ========================================================= */
const WAYPOINTS = [
  { name: 'KEPLER-442b', coords: 'RA 19h 12m 34s / DEC +41° 12′', dist: '1,206 ly' },
  { name: 'PROXIMA-B',   coords: 'RA 14h 29m 42s / DEC -62° 40′', dist: '4.24 ly' },
  { name: 'TRAPPIST-1e', coords: 'RA 23h 06m 29s / DEC -05° 02′', dist: '39.6 ly' },
  { name: 'WOLF-1061c',  coords: 'RA 16h 30m 18s / DEC -12° 39′', dist: '13.8 ly' },
  { name: 'GLIESE-667Cc',coords: 'RA 17h 19m 21s / DEC -34° 59′', dist: '23.6 ly' },
  { name: 'HD-40307g',   coords: 'RA 05h 54m 04s / DEC -60° 01′', dist: '42.0 ly' }
];

function renderWaypoints() {
  const el = $('#waypointList');
  if (!el) return;
  el.innerHTML = WAYPOINTS.map((w, i) => `
    <div class="waypoint-item" data-idx="${i}">
      <div class="wp-info">
        <span class="wp-name">${w.name}</span>
        <span class="wp-coords">${w.coords}</span>
      </div>
      <span class="wp-dist">${w.dist}</span>
    </div>
  `).join('');

  el.querySelectorAll('.waypoint-item').forEach(item => {
    item.addEventListener('click', () => {
      const wp = WAYPOINTS[+item.dataset.idx];
      pushAlert(`Course locked: ${wp.name} (${wp.dist})`, 'ok');
      pushLog(`Waypoint selected: ${wp.name}`, 'INFO');
    });
  });
}

/* =========================================================
   SYSTEMS
   ========================================================= */
const SYSTEMS = [
  { name: 'LIFE SUPPORT',      unit: '%',    min: 96, max: 100 },
  { name: 'OXYGEN RESERVE',    unit: '%',    min: 78, max: 92 },
  { name: 'FUEL CELLS',        unit: '%',    min: 65, max: 82 },
  { name: 'SOLAR ARRAY',       unit: 'kW',   min: 12, max: 18 },
  { name: 'SHIELD INTEGRITY',  unit: '%',    min: 88, max: 99 },
  { name: 'THRUSTER ARRAY',    unit: '%',    min: 92, max: 100 },
  { name: 'COMM ARRAY',        unit: 'dB',   min: 42, max: 58 },
  { name: 'CORE TEMP',         unit: '°C',   min: 12, max: 28 },
  { name: 'RADIATION',         unit: 'mSv',  min: 0.8, max: 2.4 },
  { name: 'NAV COMPUTER',      unit: '%',    min: 94, max: 100 },
  { name: 'GYROSCOPE',         unit: '%',    min: 88, max: 100 },
  { name: 'COOLANT PRESSURE',  unit: 'kPa',  min: 210, max: 260 }
];

function renderSystems() {
  const el = $('#systemsGrid');
  if (!el) return;
  el.innerHTML = SYSTEMS.map((s, i) => {
    const val = rnd(s.min, s.max);
    const pct = ((val - s.min) / (s.max - s.min)) * 100;
    let cls = 'ok', stateTxt = 'OK';
    if (pct < 20) { cls = 'crit'; stateTxt = 'CRITICAL'; }
    else if (pct < 40) { cls = 'warn'; stateTxt = 'WARN'; }
    return `
      <div class="sys-card ${cls}" style="animation-delay:${i * 40}ms">
        <div class="sys-head">
          <span class="sys-name">${s.name}</span>
          <span class="sys-state ${cls}">${stateTxt}</span>
        </div>
        <div class="sys-value">${val.toFixed(1)}<span class="unit">${s.unit}</span></div>
        <div class="sys-bar"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join('');
}

/* =========================================================
   CREW
   ========================================================= */
const CREW = [
  { name: 'CMDR. SARAH CHEN',   role: 'Mission Commander',    color: '#00d9ff', hrs: 4820, missions: 12, status: 'ACTIVE' },
  { name: 'LT. MARCUS VEGA',    role: 'Flight Engineer',      color: '#00ff88', hrs: 3910, missions: 8,  status: 'ACTIVE' },
  { name: 'DR. YUKI TANAKA',    role: 'Chief Medical Officer',color: '#ff9a3c', hrs: 5240, missions: 14, status: 'ACTIVE' },
  { name: 'SPC. ALEX RIVERA',   role: 'Systems Specialist',   color: '#ff2d55', hrs: 2180, missions: 5,  status: 'SLEEP' },
  { name: 'DR. OMAR HASSAN',    role: 'Astrophysicist',       color: '#a855f7', hrs: 4050, missions: 9,  status: 'ACTIVE' },
  { name: 'LT. EMMA LARSSON',   role: 'Navigation Officer',   color: '#00d9ff', hrs: 3120, missions: 7,  status: 'ACTIVE' }
];

function renderCrew() {
  const el = $('#crewGrid');
  if (!el) return;
  el.innerHTML = CREW.map((c, i) => {
    const initials = c.name.split(' ').filter(w => !w.endsWith('.')).map(w => w[0]).join('').slice(0, 2);
    return `
      <div class="crew-card" style="animation-delay:${i * 60}ms">
        <div class="crew-avatar" style="background:${c.color}">${initials}</div>
        <div class="crew-name">${c.name}</div>
        <div class="crew-role">${c.role}</div>
        <div class="crew-stats">
          <div><label>FLIGHT HRS</label><span>${c.hrs.toLocaleString()}</span></div>
          <div><label>MISSIONS</label><span>${c.missions}</span></div>
          <div><label>STATUS</label><span style="color:${c.status === 'ACTIVE' ? 'var(--ok)' : 'var(--warn)'}">${c.status}</span></div>
          <div><label>CLEARANCE</label><span>LEVEL 4</span></div>
        </div>
      </div>
    `;
  }).join('');
}

/* =========================================================
   VIEW SWITCHING
   ========================================================= */
function switchView(view) {
  state.view = view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  $$('.rail-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#hudBreadcrumb').textContent = view.toUpperCase();

  if (view === 'navigation') {
    setTimeout(() => {
      const c = $('#starMapCanvas');
      if (c) c.dispatchEvent(new Event('resize'));
    }, 50);
  }
}

/* =========================================================
   CLOCK / MISSION TIME
   ========================================================= */
function tick() {
  const now = new Date();
  const clock = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  $('#hudClock').textContent = clock;

  const missionElapsed = Math.floor((Date.now() - state.missionStart) / 1000);
  $('#hudMissionTime').textContent = fmtHM(missionElapsed);
  $('#statusRight').textContent = `UPTIME ${fmtHM(missionElapsed)}`;

  // Live telemetry values
  const alt = 420.7 + rnd(-0.3, 0.3);
  const vel = 7.66 + rnd(-0.01, 0.01);
  const lat = 182 + Math.floor(rnd(-5, 5));
  const inc = 51.6 + rnd(-0.05, 0.05);
  const orb = 92.4 + rnd(-0.2, 0.2);

  $('#alt').textContent = `${alt.toFixed(1)} km`;
  $('#vel').textContent = `${vel.toFixed(2)} km/s`;
  $('#inc').textContent = `${inc.toFixed(2)}°`;
  $('#orb').textContent = `${orb.toFixed(1)} min`;
  $('#latency').textContent = `${lat} ms`;
}

/* =========================================================
   RANDOM EVENT GENERATOR
   ========================================================= */
const EVENTS = [
  { lvl: 'INFO', msg: () => `Telemetry packet received (seq ${randInt(1000, 9999)})` },
  { lvl: 'INFO', msg: () => `Star catalog sync: ${randInt(200, 500)} new objects` },
  { lvl: 'OK',   msg: () => `System check passed: ${['GYRO', 'NAV', 'COMM', 'PWR'][randInt(0,3)]}` },
  { lvl: 'WARN', msg: () => `Solar flare detected — Class ${['C', 'M', 'X'][randInt(0,2)]}` },
  { lvl: 'WARN', msg: () => `Radiation spike: ${rnd(2, 5).toFixed(2)} mSv/h` },
  { lvl: 'OK',   msg: () => `Orbital burn complete — Δv ${rnd(0.1, 1.2).toFixed(2)} m/s` },
  { lvl: 'INFO', msg: () => `Signal acquired from ${['KEPLER-442b','PROXIMA-B','TRAPPIST-1e'][randInt(0,2)]}` }
];

function randomEvent() {
  const ev = EVENTS[randInt(0, EVENTS.length - 1)];
  const msg = ev.msg();
  pushLog(msg, ev.lvl);
  if (ev.lvl === 'WARN' || ev.lvl === 'OK') pushAlert(msg, ev.lvl.toLowerCase());
}

/* =========================================================
   INIT
   ========================================================= */
function init() {
  renderAlerts();
  renderLogs();
  renderWaypoints();
  renderSystems();
  renderCrew();

  initPlanet();
  initRadar();
  initSignal();
  initTelemetry();
  initStarMap();

  // Bind nav
  $$('.rail-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Mute button
  $('#muteBtn')?.addEventListener('click', () => {
    state.muted = !state.muted;
    $('#muteBtn').style.color = state.muted ? 'var(--crit)' : '';
    toast(state.muted ? 'Audio muted' : 'Audio active', state.muted ? 'warn' : 'ok');
  });

  // Initial alerts
  pushAlert('NEXUS-7 operating system online', 'ok');
  pushAlert('All primary systems nominal', 'ok');
  pushLog('Boot sequence complete', 'OK');

  // Clocks
  tick();
  setInterval(tick, 1000);

  // Random events
  setInterval(() => { if (Math.random() < 0.4) randomEvent(); }, 5000);
  setInterval(() => {
    if (state.view === 'systems') renderSystems();
  }, 8000);

  // Kick off boot
  runBoot();
}

document.addEventListener('DOMContentLoaded', init);
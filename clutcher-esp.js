// ==UserScript==
// @name         clutcher.io — ESP + Chams
// @namespace    https://clutcher.io/
// @version      2.7.2
// @description  ESP / glowing chams / silent aim / sky / wings / aura particles / client-side FPV drone / client-side attack helicopter / custom helicopter GLB / mouse-aimed downward missile camera / crash preview / config save-load / misc / custom GLB third-person model
// @author       OUTCOME
// @match        https://clutcher.io/*
// @match        http://clutcher.io/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  /* ---------------- config ---------------- */
  const CFG = {
    esp: true,
    chams: true,
    box: true,
    boxStyle: 'full',
    boxWidth: 1.5,
    boxGlow: 8,
    boxFill: true,
    boxOutline: true,
    headDot: true,
    name: true,
    nameSize: 12,
    hp: true,
    hpWidth: 4,
    snap: false,
    maxDist: 250,
    showTeam: false,
    distance: true,
    distanceSize: 10,
    chamsTeam: false,
    states: ['playing', 'freeze'],
    colBoxEnemy: '#ff3b30',
    colBoxTeam: '#3ec6ff',
    colChamEnemy: '#ff2323',
    colChamTeam: '#28c1ff',
    chamOpacity: 0.9,
    chamOrder: 9999,
    chamGlow: true,
    chamGlowStrength: 0.55,
    chamPulse: true,
    chamThroughWalls: true,
    sa: {
      on: false,
      fov: 15,
      fovCircle: true,
      hitPart: 'chest',
      wallCheck: true,
      wallbang: false,
      line: true,
      colLine: '#ffe600'
    },
    world: {
      enabled: false,
      color: '#78a9ff',
      stars: true,
      starDensity: 90,
      starSize: 1.5,
      twinkle: 0.65,
      preset: 'dusk'
    },
    wings: {
      enabled: false,
      style: 'feather',
      color: '#8cecff',
      glowColor: '#b56cff',
      opacity: 0.82,
      size: 1,
      span: 1,
      height: 1.38,
      forward: 0.08,
      yaw: 0,
      roll: 0,
      leftX: -0.12,
      rightX: 0.12,
      leftY: 0,
      rightY: 0,
      leftZ: 0,
      rightZ: 0,
      leftYaw: 0,
      rightYaw: 0,
      leftRoll: 0,
      rightRoll: 0,
      flap: true,
      flapSpeed: 1.2,
      flapAmount: 0.45,
      glow: true,
      glowScale: 1.08
    },
    aura: {
      enabled: false,
      style: 'orbit',
      color: '#83d7ff',
      glowColor: '#b78cff',
      count: 42,
      radius: 1.25,
      height: 1.8,
      size: 0.035,
      speed: 1.2,
      rise: 0,
      orbit: 2.4,
      opacity: 0.5,
      glow: true,
      glowScale: 1.15
    },
    drone: {
      enabled: false,
      speed: 18,
      life: 4.5,
      previewTime: 2,
      blastRadius: 4.5,
      fov: 78,
      feed: true,
      feedEffects: true,
      fpv: true,
      sound: true,
      volume: 0.35
    },
    helicopter: {
      enabled: false,
      fov: 74,
      speed: 14,
      boostSpeed: 23,
      verticalSpeed: 8,
      turnRate: 1.65,
      missileSpeed: 34,
      blastRadius: 6,
      range: 140,
      ammo: 10,
      fireCooldown: 0.32,
      reloadTime: 1.8,
      autoReload: true,
      effects: true,
      sound: true,
      volume: 0.28,
      modelHeight: 3.4,
      modelYaw: 0,
      rotorSpeed: 14
    },
    misc: {
      noRecoil: false,
      noSpread: false,
      infAmmo: false,
      rapid: false,
      autoFire: false,
      bhop: false,
      speed: false,
      speedMult: 1.8,
      tp: false,
      tpDist: 3,
      tpShoulder: 0.35,
      tpModelHeight: 2.2,
      tpModelYaw: 180,
      tpModelBob: true,
      tpModelWalk: 1
    },
    status: true
  };

  const tpCustom = {
    asset: null,
    generation: 0,
    busy: false,
    name: ''
  };
  const helicopterCustom = {
    asset: null,
    generation: 0,
    busy: false,
    name: ''
  };
  const HELICOPTER_CUSTOM_SIZE_BOOST = 1.105;
  const HELICOPTER_CUSTOM_YAW_OFFSET = -Math.PI / 2;
  let tpModelPhase = 0;
  const droneState = {
    active: false,
    group: null,
    camera: null,
    rotors: [],
    pos: { x: 0, y: 0, z: 0 },
    prev: { x: 0, y: 0, z: 0 },
    dir: { x: 0, y: 0, z: -1 },
    vel: { x: 0, y: 0, z: 0 },
    speed: 18,
    bank: 0,
    boost: 0,
    airBrake: false,
    battery: 1,
    age: 0,
    previewTime: 0,
    previewPoint: { x: 0, y: 0, z: 0 },
    previewTarget: null,
    sound: null
  };
  let droneCooldown = 0;
  let helicopterCooldown = 0;
  const helicopterState = {
    active: false,
    occupied: false,
    gunnerMode: false,
    group: null,
    effectsGroup: null,
    camera: null,
    gunCamera: null,
    mainRotor: null,
    tailRotor: null,
    gunMount: null,
    launchFlash: null,
    hull: null,
    customRoot: null,
    worldMaterials: [],
    worldFixTimer: 0,
    gunYaw: 0,
    gunPitch: -1.15,
    cameraOrbitYaw: 0,
    cameraOrbitPitch: 0,
    cameraLastYaw: 0,
    cameraLastPitch: 0,
    tracers: [],
    particles: [],
    missiles: [],
    rings: [],
    x: 0,
    y: 0,
    z: 0,
    hullYaw: 0,
    hullPitch: 0,
    speed: 0,
    verticalSpeed: 0,
    bank: 0,
    collective: 0,
    ammo: 10,
    fireCooldown: 0,
    reload: 0,
    recoil: 0,
    flashTime: 0,
    impactTime: 0,
    sound: null,
    proto: null,
    fxGeometry: null,
    ringGeometry: null,
    fxMaterials: []
  };

  /* ---------------- overlay canvas ---------------- */
  const cv = document.createElement('canvas');
  cv.style.cssText =
    'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;';
  document.documentElement.appendChild(cv);
  const ctx = cv.getContext('2d');
  let vw = 0, vh = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    vw = window.innerWidth;
    vh = window.innerHeight;
    cv.width = Math.round(vw * dpr);
    cv.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------------- status chip ---------------- */
  const st = document.createElement('div');
  st.id = 'o-status';
  document.documentElement.appendChild(st);

  function paintStatus() {
    st.style.display = CFG.status ? 'flex' : 'none';
    const state = v => v ? '<b class="on">ON</b>' : '<b class="off">OFF</b>';
    st.innerHTML = 'ESP ' + state(CFG.esp) +
      ' CHAMS ' + state(CFG.chams) +
      ' AIM ' + state(CFG.sa.on) +
      ' SKY ' + state(CFG.world.enabled) +
      ' WINGS ' + state(CFG.wings.enabled) +
      ' AURA ' + state(CFG.aura.enabled) +
      ' DRONE ' + state(CFG.drone.enabled) +
      ' HELICOPTER ' + state(CFG.helicopter.enabled) +
      ' <span class="keys">RSHIFT&nbsp; F2 / F3 / F4 / F / T / E / C / X</span>';
    syncAll();
  }

  /* ---------------- menu (Right Shift) ---------------- */
  let menuOpen = false;
  const syncs = [];

  function syncAll() {
    for (const r of syncs) if (r.sync) r.sync();
  }

  const CONFIG_KEY = 'outcome-clutcher-config-v1';
  let configStatus = null;
  let helicopterStatus = null;
  function setHelicopterStatus(text, kind) {
    if (!helicopterStatus) return;
    helicopterStatus.textContent = text;
    helicopterStatus.style.color = kind === 'ok' ? '#72e6a6' : kind === 'error' ? '#ff6b70' : '';
  }
  function setConfigStatus(text, kind) {
    if (!configStatus) return;
    configStatus.textContent = text;
    configStatus.style.color = kind === 'ok' ? '#72e6a6' : kind === 'error' ? '#ff6b70' : '';
  }
  function mergeConfig(target, source, depth) {
    if (!source || typeof source !== 'object' || depth > 5) return;
    for (const key of Object.keys(target)) {
      const value = source[key];
      if (value === undefined || value === null) continue;
      const expected = target[key];
      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          mergeConfig(expected, value, depth + 1);
        }
      } else if (Array.isArray(expected)) {
        if (Array.isArray(value)) target[key] = value.filter(v => typeof v === 'string');
      } else if (typeof expected === typeof value) {
        target[key] = value;
      }
    }
  }
  function saveConfig() {
    try {
      const payload = {
        version: 1,
        savedAt: Date.now(),
        config: JSON.parse(JSON.stringify(CFG))
      };
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(payload));
      setConfigStatus('Config saved locally.', 'ok');
    } catch (e) {
      setConfigStatus('Could not save config in this browser.', 'error');
    }
  }
  function loadConfig(quiet) {
    try {
      const raw = window.localStorage.getItem(CONFIG_KEY);
      if (!raw) {
        if (!quiet) setConfigStatus('No saved config found.', '');
        return false;
      }
      const payload = JSON.parse(raw);
      const incoming = payload && payload.config ? payload.config : payload;
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('Invalid config payload');
      mergeConfig(CFG, incoming, 0);
      paintStatus();
      if (!quiet) setConfigStatus('Config loaded.', 'ok');
      return true;
    } catch (e) {
      if (!quiet) setConfigStatus('Saved config is invalid or unavailable.', 'error');
      return false;
    }
  }

  const styleEl = document.createElement('style');
  styleEl.textContent = `
  *{box-sizing:border-box}
  #o-status{position:fixed;left:12px;bottom:12px;z-index:2147483647;pointer-events:none;display:flex;flex-wrap:wrap;max-width:calc(100vw - 24px);gap:10px;
    padding:7px 10px;border:1px solid #ffffff1f;border-radius:6px;background:#080a0cd9;color:#a7adb7;
    font:600 10px/1.2 Consolas,monospace;backdrop-filter:blur(12px)}
  #o-status .on{color:#67e8a7}#o-status .off{color:#ff6b70}
  #o-status .keys{color:#69717d;border-left:1px solid #ffffff1f;padding-left:10px}
  #o-menu{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 24px));
    height:min(620px,calc(100vh - 24px));z-index:2147483647;display:none;overflow:hidden;color:#e8ebf0;
    background:#0c0e10fa;border:1px solid #343941;border-radius:8px;box-shadow:0 24px 80px #000b;
    font:12px/1.45 Inter,"Segoe UI",Arial,sans-serif;user-select:none;letter-spacing:0}
  #o-menu:before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:#72e6a6;z-index:4}
  #o-menu .o-head{height:62px;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 18px;
    background:#15181c;border-bottom:1px solid #2b3037;cursor:move}
  #o-menu .o-brand{display:flex;align-items:center;gap:12px;min-width:0}
  #o-menu .o-brand-mark{width:31px;height:31px;display:grid;place-items:center;flex:0 0 auto;
    border:1px solid #48515c;background:#1d2228;color:#fff;font:800 12px/1 Consolas,monospace}
  #o-menu .o-brand strong{display:block;color:#f5f7fa;font:800 14px/1.15 Consolas,monospace;letter-spacing:0}
  #o-menu .o-brand small{display:block;margin-top:4px;color:#6f7884;font:600 9px/1 Consolas,monospace;letter-spacing:0}
  #o-menu .o-head-actions{display:flex;align-items:center;gap:10px}
  #o-menu .o-runtime{display:flex;align-items:center;gap:7px;color:#8e98a5;font:700 9px/1 Consolas,monospace}
  #o-menu .o-runtime i{width:7px;height:7px;border-radius:50%;background:#67e8a7;box-shadow:0 0 10px #67e6a6}
  #o-menu .o-head-btn{width:32px;height:28px;border:1px solid #363c44;background:#1b1f24;color:#aab1bb;
    font:700 9px/1 Consolas,monospace;cursor:pointer}#o-menu .o-head-btn:hover{border-color:#626c78;color:#fff}
  #o-menu .o-body{display:grid;grid-template-columns:164px minmax(0,1fr);height:calc(100% - 92px)}
  #o-menu .o-nav{display:flex;flex-direction:column;padding:10px 8px;background:#101215;border-right:1px solid #292e34;overflow-y:auto;scrollbar-width:thin}
  #o-menu .o-navbtn{height:46px;min-height:46px;display:flex;align-items:center;gap:11px;padding:0 11px;border:0;
    border-left:2px solid transparent;background:transparent;color:#808894;font:700 10px/1 Consolas,monospace;
    letter-spacing:0;text-align:left;cursor:pointer;transition:background .13s,color .13s,border-color .13s}
  #o-menu .o-navbtn:hover{color:#d8dde3;background:#181c20}
  #o-menu .o-navbtn.on{color:#f4f7fa;background:#1b2025;border-left-color:#72e6a6}
  #o-menu .o-nav-code{width:25px;height:22px;display:grid;place-items:center;flex:0 0 auto;border:1px solid #343a42;
    color:#77818d;background:#14171a;font-size:9px}#o-menu .o-navbtn.on .o-nav-code{border-color:#4a8068;color:#72e6a6;background:#17241e}
  #o-menu .o-panes{min-width:0;min-height:0;background:#14171a}#o-menu .o-pane{display:none;height:100%;overflow-y:auto;padding-bottom:12px}
  #o-menu .o-pane.on{display:block}#o-menu .o-pane::-webkit-scrollbar{width:7px}
  #o-menu .o-pane::-webkit-scrollbar-thumb{background:#343a42;border:2px solid #14171a;border-radius:4px}
  #o-menu .o-pane-title{height:49px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;
    border-bottom:1px solid #292e34;color:#f3f5f7;font:800 12px/1 Consolas,monospace;letter-spacing:0}
  #o-menu .o-pane-title span{color:#68727e;font:600 9px/1 Consolas,monospace}
  #o-menu .o-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:22px;padding:4px 16px 0}
  #o-menu .o-grid.o-single{grid-template-columns:1fr}#o-menu .o-sec{grid-column:1/-1;display:flex;align-items:center;gap:8px;
    margin:14px 0 4px;color:#7d8793;font:800 9px/1 Consolas,monospace;letter-spacing:0}
  #o-menu .o-sec:after{content:"";height:1px;flex:1;background:#292e34}
  #o-menu .o-row{min-width:0;min-height:37px;display:flex;align-items:center;justify-content:space-between;gap:10px;
    border-bottom:1px solid #2b303a9e;padding:5px 1px}#o-menu .o-row.o-stack{display:block;padding:8px 1px 10px}
  #o-menu .o-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px}
  #o-menu .o-val{color:#72e6a6;font:700 10px/1 Consolas,monospace;white-space:nowrap}
  #o-menu input[type=checkbox]{appearance:none;width:30px;height:17px;position:relative;flex:0 0 auto;border:1px solid #424952;
    background:#20252a;cursor:pointer;transition:background .14s,border-color .14s}
  #o-menu input[type=checkbox]:after{content:"";position:absolute;left:2px;top:2px;width:11px;height:11px;background:#707985;
    transition:transform .14s,background .14s}#o-menu input[type=checkbox]:checked{border-color:#4f9d76;background:#1d3a2c}
  #o-menu input[type=checkbox]:checked:after{transform:translateX(13px);background:#72e6a6}
  #o-menu input[type=range]{width:100%;height:14px;margin:6px 0 0;accent-color:#72e6a6;cursor:pointer}
  #o-menu input[type=color]{width:38px;height:24px;padding:2px;border:1px solid #424952;background:#0e1012;cursor:pointer}
  #o-menu select{min-width:112px;max-width:160px;height:27px;padding:0 24px 0 8px;background:#20252a;color:#d8dde3;
    border:1px solid #3a4149;border-radius:3px;font:600 10px/1 Consolas,monospace;letter-spacing:0;cursor:pointer}
  #o-menu button.o-btn{min-height:27px;padding:0 10px;background:#20252a;color:#c9cfd7;border:1px solid #3a4149;
    border-radius:3px;font:700 9px/1 Consolas,monospace;letter-spacing:0;cursor:pointer}
  #o-menu button.o-btn:hover{border-color:#65707c;color:#fff;background:#282e35}#o-menu button.o-btn:disabled{opacity:.38;cursor:default}
  #o-menu .o-button-row{grid-column:1/-1;display:flex;align-items:center;gap:7px;padding:10px 0 2px}
  #o-menu .o-note{grid-column:1/-1;color:#727c88;font:500 10px/1.45 Consolas,monospace;word-break:break-word}
  #o-menu .o-model{grid-column:1/-1;display:block;padding:10px 0}
  #o-menu .o-model .o-top{align-items:center}#o-menu .o-model .o-actions{display:flex;gap:7px;align-items:center;min-width:0}
  #o-menu .o-model .o-file-name{font-size:10px;color:#8b95a1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  #o-menu .o-model .o-file{display:block;width:100%;height:29px;margin-top:8px;color:#c9cfd7;background:#101215;
    border:1px dashed #3d444d;border-radius:3px;font:10px Consolas,monospace;padding:3px;cursor:pointer}
  #o-menu .o-model .o-file::file-selector-button{background:#252a30;color:#fff;border:1px solid #454c55;border-radius:2px;
    font:700 9px Consolas,monospace;padding:5px 8px;margin-right:7px;cursor:pointer}
  #o-menu .o-foot{height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;
    border-top:1px solid #292e34;background:#101215;color:#68727e;font:600 9px/1 Consolas,monospace}
  #o-menu .o-foot b{color:#a8b0ba}@media(max-width:680px){#o-menu{width:calc(100vw - 12px);height:calc(100vh - 12px)}
    #o-menu .o-body{grid-template-columns:62px minmax(0,1fr)}#o-menu .o-nav{padding:8px 5px}
    #o-menu .o-navbtn{justify-content:center;padding:0}#o-menu .o-navbtn span:last-child,#o-menu .o-runtime{display:none}
    #o-menu .o-grid{grid-template-columns:1fr;padding-left:12px;padding-right:12px}#o-menu .o-pane-title{padding:0 12px}}
  `;
  document.documentElement.appendChild(styleEl);

  const menu = document.createElement('div');
  menu.id = 'o-menu';
  document.documentElement.appendChild(menu);

  const head = document.createElement('div');
  head.className = 'o-head';
  head.innerHTML = '<div class="o-brand"><div class="o-brand-mark">O</div><div><strong>OUTCOME</strong>' +
    '<small>CLUTCHER // VISUAL SYSTEMS</small></div></div>' +
    '<div class="o-head-actions"><div class="o-runtime"><i></i> LIVE RUNTIME</div>' +
    '<button type="button" class="o-head-btn" data-close="1">CLOSE</button></div>';
  menu.appendChild(head);

  const body = document.createElement('div');
  body.className = 'o-body';
  menu.appendChild(body);
  const nav = document.createElement('div');
  nav.className = 'o-nav';
  body.appendChild(nav);
  const panesEl = document.createElement('div');
  panesEl.className = 'o-panes';
  body.appendChild(panesEl);

  let curPane = null;
  const paneCodes = { esp: 'ES', chams: 'CH', aim: 'AI', wings: 'WN', aura: 'AU', sky: 'SK', drone: 'DR', helicopter: 'HC', misc: 'MS' };
  const paneMeta = {
    esp: 'TARGET VISUALS', chams: 'SURFACE TREATMENT', aim: 'TARGETING',
    wings: 'LOCAL BODY RIG', aura: 'LOCAL BODY FX', sky: 'WORLD BACKDROP',
    drone: 'FPV IMPACT SYSTEM', helicopter: 'CLIENT VEHICLE SYSTEM', misc: 'GAME SYSTEMS'
  };
  function mkPane(id, label) {
    const p = document.createElement('div');
    p.className = 'o-pane';
    p.dataset.p = id;
    const title = document.createElement('div');
    title.className = 'o-pane-title';
    title.innerHTML = label + '<span>' + (paneMeta[id] || '') + '</span>';
    p.appendChild(title);
    panesEl.appendChild(p);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'o-navbtn';
    b.innerHTML = '<span class="o-nav-code">' + (paneCodes[id] || '--') + '</span><span>' + label + '</span>';
    b.dataset.p = id;
    nav.appendChild(b);
    return p;
  }
  function showPane(id) {
    for (const p of panesEl.children) p.classList.toggle('on', p.dataset.p === id);
    for (const b of nav.children) b.classList.toggle('on', b.dataset.p === id);
  }

  function mkGrid(single) {
    const g = document.createElement('div');
    g.className = 'o-grid' + (single ? ' o-single' : '');
    curPane.appendChild(g);
    return g;
  }
  function mkRow(cls, parent) {
    const r = document.createElement('div');
    r.className = 'o-row' + (cls ? ' ' + cls : '');
    (parent || curPane).appendChild(r);
    return r;
  }
  function mkSec(t, parent) {
    const s = document.createElement('div');
    s.className = 'o-sec';
    s.textContent = t;
    (parent || curPane).appendChild(s);
    return s;
  }
  function mkToggle(label, get, set, parent) {
    const r = mkRow('', parent);
    const l = document.createElement('span'); l.textContent = label;
    const c = document.createElement('input'); c.type = 'checkbox';
    c.checked = get();
    c.addEventListener('change', () => set(c.checked));
    r.appendChild(l); r.appendChild(c);
    r.sync = () => { c.checked = get(); };
    syncs.push(r);
    return r;
  }
  function mkSlider(label, min, max, step, get, set, fmt, parent) {
    const r = mkRow('o-stack', parent);
    const top = document.createElement('div'); top.className = 'o-top';
    const l = document.createElement('span'); l.textContent = label;
    const v = document.createElement('span'); v.className = 'o-val';
    v.textContent = fmt(get());
    top.appendChild(l); top.appendChild(v);
    const inp = document.createElement('input'); inp.type = 'range';
    inp.min = min; inp.max = max; inp.step = step; inp.value = get();
    inp.addEventListener('input', () => { set(parseFloat(inp.value)); v.textContent = fmt(get()); });
    r.appendChild(top); r.appendChild(inp);
    r.sync = () => { inp.value = get(); v.textContent = fmt(get()); };
    syncs.push(r);
    return r;
  }
  function mkColor(label, get, set, parent) {
    const r = mkRow('', parent);
    const l = document.createElement('span'); l.textContent = label;
    const c = document.createElement('input'); c.type = 'color'; c.value = get();
    c.addEventListener('input', () => set(c.value));
    r.appendChild(l); r.appendChild(c);
    r.sync = () => { c.value = get(); };
    syncs.push(r);
    return r;
  }
  function mkSelect(label, opts, get, set, parent) {
    const r = mkRow('', parent);
    const l = document.createElement('span'); l.textContent = label;
    const s = document.createElement('select');
    for (const o of opts) {
      const op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      s.appendChild(op);
    }
    s.value = get();
    s.addEventListener('change', () => set(s.value));
    r.appendChild(l); r.appendChild(s);
    r.sync = () => { s.value = get(); };
    syncs.push(r);
    return r;
  }
  function mkButtons(items, parent) {
    const r = mkRow('o-button-row', parent);
    for (const item of items) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'o-btn'; b.textContent = item[0];
      b.__oClick = item[1];
      r.appendChild(b);
    }
    return r;
  }
  function mkNote(text, parent) {
    const n = document.createElement('div');
    n.className = 'o-note'; n.textContent = text;
    (parent || curPane).appendChild(n);
    return n;
  }

  curPane = mkPane('esp', 'ESP');
  const espGrid = mkGrid();
  mkSec('TARGET BOXES', espGrid);
  mkToggle('Enabled (F2)', () => CFG.esp, v => { CFG.esp = v; paintStatus(); }, espGrid);
  mkToggle('Box', () => CFG.box, v => { CFG.box = v; }, espGrid);
  mkSelect('Box style', [['full', 'Full'], ['corner', 'Corner'], ['soft', 'Soft']],
    () => CFG.boxStyle, v => { CFG.boxStyle = v; }, espGrid);
  mkSlider('Box width', 1, 4, 0.5, () => CFG.boxWidth, v => { CFG.boxWidth = v; }, v => v.toFixed(1), espGrid);
  mkSlider('Glow', 0, 20, 1, () => CFG.boxGlow, v => { CFG.boxGlow = v; }, v => v.toFixed(0), espGrid);
  mkToggle('Outline', () => CFG.boxOutline, v => { CFG.boxOutline = v; }, espGrid);
  mkToggle('Fill', () => CFG.boxFill, v => { CFG.boxFill = v; }, espGrid);
  mkToggle('Head dot', () => CFG.headDot, v => { CFG.headDot = v; }, espGrid);
  mkSec('LABELS', espGrid);
  mkToggle('Name', () => CFG.name, v => { CFG.name = v; }, espGrid);
  mkSlider('Name size', 8, 22, 1, () => CFG.nameSize, v => { CFG.nameSize = v; }, v => v + 'px', espGrid);
  mkToggle('Health bar', () => CFG.hp, v => { CFG.hp = v; }, espGrid);
  mkSlider('Bar width', 2, 10, 1, () => CFG.hpWidth, v => { CFG.hpWidth = v; }, v => v + 'px', espGrid);
  mkToggle('Distance', () => CFG.distance, v => { CFG.distance = v; }, espGrid);
  mkSlider('Distance size', 8, 16, 1, () => CFG.distanceSize, v => { CFG.distanceSize = v; }, v => v + 'px', espGrid);
  mkToggle('Snaplines', () => CFG.snap, v => { CFG.snap = v; }, espGrid);
  mkSlider('Max distance', 20, 300, 10, () => CFG.maxDist, v => { CFG.maxDist = v; }, v => v + 'm', espGrid);
  mkToggle('Team ESP', () => CFG.showTeam, v => { CFG.showTeam = v; }, espGrid);
  mkColor('Enemy box', () => CFG.colBoxEnemy, v => { CFG.colBoxEnemy = v; }, espGrid);
  mkColor('Team box', () => CFG.colBoxTeam, v => { CFG.colBoxTeam = v; }, espGrid);

  curPane = mkPane('chams', 'CHAMS');
  const chamsGrid = mkGrid();
  mkSec('SURFACE', chamsGrid);
  mkToggle('Enabled (F3)', () => CFG.chams, v => { CFG.chams = v; if (!v) restoreAll(); paintStatus(); }, chamsGrid);
  mkToggle('Team chams', () => CFG.chamsTeam, v => { CFG.chamsTeam = v; }, chamsGrid);
  mkToggle('Through walls', () => CFG.chamThroughWalls, v => { CFG.chamThroughWalls = v; }, chamsGrid);
  mkToggle('Glow shell', () => CFG.chamGlow, v => { CFG.chamGlow = v; }, chamsGrid);
  mkToggle('Pulse', () => CFG.chamPulse, v => { CFG.chamPulse = v; }, chamsGrid);
  mkSlider('Opacity', 0.1, 1, 0.05, () => CFG.chamOpacity, v => { CFG.chamOpacity = v; }, v => v.toFixed(2), chamsGrid);
  mkSlider('Glow strength', 0, 1, 0.05, () => CFG.chamGlowStrength, v => { CFG.chamGlowStrength = v; }, v => v.toFixed(2), chamsGrid);
  mkColor('Enemy color', () => CFG.colChamEnemy, v => { CFG.colChamEnemy = v; }, chamsGrid);
  mkColor('Team color', () => CFG.colChamTeam, v => { CFG.colChamTeam = v; }, chamsGrid);
  mkNote('Glow shell adds a second additive pass around the visible body mesh.', chamsGrid);

  curPane = mkPane('aim', 'AIM');
  const aimGrid = mkGrid();
  mkSec('TARGETING', aimGrid);
  mkToggle('Enabled (F4)', () => CFG.sa.on, v => { CFG.sa.on = v; paintStatus(); }, aimGrid);
  mkSelect('Hit part', [['head', 'Head'], ['chest', 'Chest'], ['stomach', 'Stomach'], ['legs', 'Legs']],
    () => CFG.sa.hitPart, v => { CFG.sa.hitPart = v; }, aimGrid);
  mkSlider('FOV', 1, 90, 1, () => CFG.sa.fov, v => { CFG.sa.fov = v; }, v => v + '\u00b0', aimGrid);
  mkToggle('FOV circle', () => CFG.sa.fovCircle, v => { CFG.sa.fovCircle = v; }, aimGrid);
  mkToggle('Wall check', () => CFG.sa.wallCheck, v => { CFG.sa.wallCheck = v; }, aimGrid);
  mkToggle('Wallbang', () => CFG.sa.wallbang, v => { CFG.sa.wallbang = v; }, aimGrid);
  mkToggle('Line to target', () => CFG.sa.line, v => { CFG.sa.line = v; }, aimGrid);
  mkColor('Line color', () => CFG.sa.colLine, v => { CFG.sa.colLine = v; }, aimGrid);

  curPane = mkPane('wings', 'WINGS');
  const wingsGrid = mkGrid();
  mkSec('LOCAL BODY RIG', wingsGrid);
  mkToggle('Enabled', () => CFG.wings.enabled, v => { CFG.wings.enabled = v; paintStatus(); }, wingsGrid);
  mkSelect('Style', [['feather', 'Feather'], ['energy', 'Energy'], ['crystal', 'Crystal']],
    () => CFG.wings.style, v => { CFG.wings.style = v; }, wingsGrid);
  mkSlider('Opacity', 0.15, 1, 0.05, () => CFG.wings.opacity, v => { CFG.wings.opacity = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Size', 0.5, 2.2, 0.05, () => CFG.wings.size, v => { CFG.wings.size = v; }, v => v.toFixed(2) + 'x', wingsGrid);
  mkSlider('Span', 0.5, 1.8, 0.05, () => CFG.wings.span, v => { CFG.wings.span = v; }, v => v.toFixed(2), wingsGrid);
  mkSec('TRANSFORM', wingsGrid);
  mkSlider('Height', 0.5, 2.4, 0.05, () => CFG.wings.height, v => { CFG.wings.height = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Forward offset', -0.6, 0.8, 0.05, () => CFG.wings.forward, v => { CFG.wings.forward = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Yaw', -45, 45, 1, () => CFG.wings.yaw, v => { CFG.wings.yaw = v; }, v => v.toFixed(0) + '\u00b0', wingsGrid);
  mkSlider('Roll', -20, 20, 1, () => CFG.wings.roll, v => { CFG.wings.roll = v; }, v => v.toFixed(0) + '\u00b0', wingsGrid);
  mkSec('LEFT WING', wingsGrid);
  mkSlider('Left X', -1.5, 1.5, 0.05, () => CFG.wings.leftX, v => { CFG.wings.leftX = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Left Y', -1, 1.5, 0.05, () => CFG.wings.leftY, v => { CFG.wings.leftY = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Left Z', -1, 1, 0.05, () => CFG.wings.leftZ, v => { CFG.wings.leftZ = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Left yaw', -60, 60, 1, () => CFG.wings.leftYaw, v => { CFG.wings.leftYaw = v; }, v => v.toFixed(0) + '\u00b0', wingsGrid);
  mkSlider('Left roll', -45, 45, 1, () => CFG.wings.leftRoll, v => { CFG.wings.leftRoll = v; }, v => v.toFixed(0) + '\u00b0', wingsGrid);
  mkSec('RIGHT WING', wingsGrid);
  mkSlider('Right X', -1.5, 1.5, 0.05, () => CFG.wings.rightX, v => { CFG.wings.rightX = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Right Y', -1, 1.5, 0.05, () => CFG.wings.rightY, v => { CFG.wings.rightY = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Right Z', -1, 1, 0.05, () => CFG.wings.rightZ, v => { CFG.wings.rightZ = v; }, v => v.toFixed(2), wingsGrid);
  mkSlider('Right yaw', -60, 60, 1, () => CFG.wings.rightYaw, v => { CFG.wings.rightYaw = v; }, v => v.toFixed(0) + '\u00b0', wingsGrid);
  mkSlider('Right roll', -45, 45, 1, () => CFG.wings.rightRoll, v => { CFG.wings.rightRoll = v; }, v => v.toFixed(0) + '\u00b0', wingsGrid);
  mkSec('MOTION', wingsGrid);
  mkToggle('Flap animation', () => CFG.wings.flap, v => { CFG.wings.flap = v; }, wingsGrid);
  mkSlider('Flap speed', 0, 4, 0.1, () => CFG.wings.flapSpeed, v => { CFG.wings.flapSpeed = v; }, v => v.toFixed(1), wingsGrid);
  mkSlider('Flap amount', 0, 1, 0.05, () => CFG.wings.flapAmount, v => { CFG.wings.flapAmount = v; }, v => v.toFixed(2), wingsGrid);
  mkToggle('Additive glow', () => CFG.wings.glow, v => { CFG.wings.glow = v; }, wingsGrid);
  mkSlider('Glow spread', 1.02, 1.2, 0.01, () => CFG.wings.glowScale, v => { CFG.wings.glowScale = v; }, v => v.toFixed(2) + 'x', wingsGrid);
  mkColor('Wing color', () => CFG.wings.color, v => { CFG.wings.color = v; }, wingsGrid);
  mkColor('Glow color', () => CFG.wings.glowColor, v => { CFG.wings.glowColor = v; }, wingsGrid);
  mkButtons([['FEATHER', () => setWingPreset('feather')], ['ENERGY', () => setWingPreset('energy')], ['CRYSTAL', () => setWingPreset('crystal')]], wingsGrid);
  mkNote('Wings attach to the local third-person body and follow its transform.', wingsGrid);

  curPane = mkPane('aura', 'AURA');
  const auraGrid = mkGrid();
  mkSec('PARTICLE FIELD', auraGrid);
  mkToggle('Enabled', () => CFG.aura.enabled, v => { CFG.aura.enabled = v; paintStatus(); }, auraGrid);
  mkSelect('Style', [['ember', 'Ember'], ['orbit', 'Orbit'], ['halo', 'Halo']],
    () => CFG.aura.style, v => { CFG.aura.style = v; }, auraGrid);
  mkSlider('Particle count', 12, 120, 2, () => CFG.aura.count, v => { CFG.aura.count = v; }, v => v.toFixed(0), auraGrid);
  mkSlider('Radius', 0.25, 3, 0.05, () => CFG.aura.radius, v => { CFG.aura.radius = v; }, v => v.toFixed(2) + 'm', auraGrid);
  mkSlider('Height', 0.5, 4, 0.05, () => CFG.aura.height, v => { CFG.aura.height = v; }, v => v.toFixed(2) + 'm', auraGrid);
  mkSlider('Particle size', 0.01, 0.15, 0.005, () => CFG.aura.size, v => { CFG.aura.size = v; }, v => v.toFixed(3), auraGrid);
  mkSec('MOTION', auraGrid);
  mkSlider('Speed', 0, 4, 0.05, () => CFG.aura.speed, v => { CFG.aura.speed = v; }, v => v.toFixed(2), auraGrid);
  mkSlider('Rise', -2, 3, 0.05, () => CFG.aura.rise, v => { CFG.aura.rise = v; }, v => v.toFixed(2), auraGrid);
  mkSlider('Orbit', -3, 3, 0.05, () => CFG.aura.orbit, v => { CFG.aura.orbit = v; }, v => v.toFixed(2), auraGrid);
  mkToggle('Additive glow', () => CFG.aura.glow, v => { CFG.aura.glow = v; }, auraGrid);
  mkSlider('Glow spread', 1.05, 1.6, 0.01, () => CFG.aura.glowScale, v => { CFG.aura.glowScale = v; }, v => v.toFixed(2) + 'x', auraGrid);
  mkSlider('Opacity', 0.1, 1, 0.05, () => CFG.aura.opacity, v => { CFG.aura.opacity = v; }, v => v.toFixed(2), auraGrid);
  mkColor('Particle color', () => CFG.aura.color, v => { CFG.aura.color = v; }, auraGrid);
  mkColor('Glow color', () => CFG.aura.glowColor, v => { CFG.aura.glowColor = v; }, auraGrid);
  mkButtons([['EMBER', () => setAuraPreset('ember')], ['ORBIT', () => setAuraPreset('orbit')], ['HALO', () => setAuraPreset('halo')]], auraGrid);
  mkNote('Aura particles attach to the local third-person body.', auraGrid);

  curPane = mkPane('sky', 'SKY');
  const skyGrid = mkGrid();
  mkSec('WORLD BACKDROP', skyGrid);
  mkToggle('Enabled', () => CFG.world.enabled, v => { CFG.world.enabled = v; paintStatus(); }, skyGrid);
  mkColor('Sky color', () => CFG.world.color, v => { CFG.world.color = v; CFG.world.preset = 'custom'; }, skyGrid);
  mkToggle('Stars', () => CFG.world.stars, v => { CFG.world.stars = v; }, skyGrid);
  mkSlider('Star density', 0, 220, 5, () => CFG.world.starDensity, v => { CFG.world.starDensity = v; }, v => v.toFixed(0), skyGrid);
  mkSlider('Star size', 0.5, 4, 0.1, () => CFG.world.starSize, v => { CFG.world.starSize = v; }, v => v.toFixed(1), skyGrid);
  mkSlider('Twinkle', 0, 1, 0.05, () => CFG.world.twinkle, v => { CFG.world.twinkle = v; }, v => v.toFixed(2), skyGrid);
  mkButtons([['DUSK', () => setSkyPreset('dusk')], ['ARCTIC', () => setSkyPreset('arctic')], ['VOID', () => setSkyPreset('void')]], skyGrid);
  mkNote('Sky replaces the scene backdrop and restores the original when disabled.', skyGrid);

  curPane = mkPane('drone', 'DRONE');
  const droneGrid = mkGrid();
  mkSec('FPV DRONE', droneGrid);
  mkToggle('Enabled (F)', () => CFG.drone.enabled, v => {
    CFG.drone.enabled = v;
    if (!v) stopDrone();
    paintStatus();
  }, droneGrid);
  mkSlider('Launch speed', 8, 35, 0.5, () => CFG.drone.speed, v => { CFG.drone.speed = v; }, v => v.toFixed(1) + 'm/s', droneGrid);
  mkSlider('Flight time', 1.5, 8, 0.1, () => CFG.drone.life, v => { CFG.drone.life = v; }, v => v.toFixed(1) + 's', droneGrid);
  mkSlider('Crash preview', 0, 5, 0.1, () => CFG.drone.previewTime, v => { CFG.drone.previewTime = v; }, v => v.toFixed(1) + 's', droneGrid);
  mkSec('IMPACT', droneGrid);
  mkSlider('Blast radius', 1, 10, 0.1, () => CFG.drone.blastRadius, v => { CFG.drone.blastRadius = v; }, v => v.toFixed(1) + 'm', droneGrid);
  mkSec('FPV FEED', droneGrid);
  mkToggle('Main FPV camera', () => CFG.drone.fpv, v => { CFG.drone.fpv = v; }, droneGrid);
  mkToggle('Show feed', () => CFG.drone.feed, v => { CFG.drone.feed = v; }, droneGrid);
  mkToggle('Feed effects', () => CFG.drone.feedEffects, v => { CFG.drone.feedEffects = v; }, droneGrid);
  mkSec('SOUND', droneGrid);
  mkToggle('Buzz sound', () => CFG.drone.sound, v => {
    CFG.drone.sound = v;
    if (!v) stopDroneSound();
  }, droneGrid);
  mkSlider('Buzz volume', 0, 1, 0.01, () => CFG.drone.volume, v => {
    CFG.drone.volume = v;
    if (droneState.sound && droneState.sound.master) droneState.sound.master.gain.value = v;
  }, v => Math.round(v * 100) + '%', droneGrid);
  mkNote('Client-side FPV. F launches; WASD follows the camera axis, Space climbs, Shift descends, Alt boosts, and C or Ctrl air-brakes. The nose camera keeps only part of the drone at the lower edge and adds optical noise, lens fringe, vignette, brackets, warnings, and low-battery effects.', droneGrid);

  curPane = mkPane('helicopter', 'HELICOPTER');
  const helicopterGrid = mkGrid();
  mkSec('ATTACK HELICOPTER', helicopterGrid);
  mkToggle('Enabled (T)', () => CFG.helicopter.enabled, v => {
    CFG.helicopter.enabled = v;
    if (!v) stopHelicopter(window.game);
    paintStatus();
  }, helicopterGrid);
  mkSlider('Cruise speed', 5, 28, 0.5, () => CFG.helicopter.speed, v => { CFG.helicopter.speed = v; }, v => v.toFixed(1) + 'm/s', helicopterGrid);
  mkSlider('Boost speed', 8, 42, 0.5, () => CFG.helicopter.boostSpeed, v => { CFG.helicopter.boostSpeed = v; }, v => v.toFixed(1) + 'm/s', helicopterGrid);
  mkSlider('Vertical speed', 3, 18, 0.5, () => CFG.helicopter.verticalSpeed, v => { CFG.helicopter.verticalSpeed = v; }, v => v.toFixed(1) + 'm/s', helicopterGrid);
  mkSlider('Turn rate', 0.5, 4, 0.1, () => CFG.helicopter.turnRate, v => { CFG.helicopter.turnRate = v; }, v => v.toFixed(1) + 'x', helicopterGrid);
  mkSlider('Camera FOV', 50, 100, 1, () => CFG.helicopter.fov, v => { CFG.helicopter.fov = v; }, v => v.toFixed(0) + '\u00b0', helicopterGrid);
  mkSec('DOWNWARD MISSILES', helicopterGrid);
  mkSlider('Missile speed', 18, 70, 1, () => CFG.helicopter.missileSpeed, v => { CFG.helicopter.missileSpeed = v; }, v => v.toFixed(0) + 'm/s', helicopterGrid);
  mkSlider('Blast radius', 1, 12, 0.1, () => CFG.helicopter.blastRadius, v => { CFG.helicopter.blastRadius = v; }, v => v.toFixed(1) + 'm', helicopterGrid);
  mkSlider('Missile range', 40, 260, 10, () => CFG.helicopter.range, v => { CFG.helicopter.range = v; }, v => v.toFixed(0) + 'm', helicopterGrid);
  mkSlider('Missiles', 1, 40, 1, () => CFG.helicopter.ammo, v => { CFG.helicopter.ammo = v; }, v => v.toFixed(0), helicopterGrid);
  mkSlider('Reload time', 0.5, 5, 0.1, () => CFG.helicopter.reloadTime, v => { CFG.helicopter.reloadTime = v; }, v => v.toFixed(1) + 's', helicopterGrid);
  mkSlider('Fire cooldown', 0.1, 2, 0.02, () => CFG.helicopter.fireCooldown, v => { CFG.helicopter.fireCooldown = v; }, v => v.toFixed(2) + 's', helicopterGrid);
  mkToggle('Auto reload', () => CFG.helicopter.autoReload, v => { CFG.helicopter.autoReload = v; }, helicopterGrid);
  mkSec('EFFECTS', helicopterGrid);
  mkToggle('Flight effects', () => CFG.helicopter.effects, v => { CFG.helicopter.effects = v; }, helicopterGrid);
  mkToggle('Rotor sound', () => CFG.helicopter.sound, v => {
    CFG.helicopter.sound = v;
    if (!v) stopHelicopterSound();
  }, helicopterGrid);
  mkSlider('Rotor volume', 0, 1, 0.01, () => CFG.helicopter.volume, v => {
    CFG.helicopter.volume = v;
    if (helicopterState.sound && helicopterState.sound.master) helicopterState.sound.master.gain.value = v;
  }, v => Math.round(v * 100) + '%', helicopterGrid);
  helicopterStatus = mkNote('Helicopter is idle. Enable it, then press T or deploy.', helicopterGrid);
  mkButtons([['SPAWN HELICOPTER', () => requestHelicopterSpawn()]], helicopterGrid);
  mkNote('T deploys, E enters or exits, W/S tilts the rotor, A/D yaws, Shift climbs, Ctrl descends, Alt boosts, and Space brakes. C toggles the downward missile camera; X fires. R reloads.', helicopterGrid);

  mkSec('CUSTOM GLB MODEL', helicopterGrid);
  const heliModelRow = mkRow('o-model', helicopterGrid);
  const heliModelTop = document.createElement('div');
  heliModelTop.className = 'o-top';
  const heliModelActions = document.createElement('div');
  heliModelActions.className = 'o-actions';
  const heliModelFileName = document.createElement('span');
  heliModelFileName.className = 'o-file-name';
  heliModelFileName.textContent = 'No helicopter model selected';
  const heliModelPick = document.createElement('button');
  heliModelPick.type = 'button';
  heliModelPick.className = 'o-btn';
  heliModelPick.textContent = 'Load helicopter GLB';
  const heliModelClear = document.createElement('button');
  heliModelClear.type = 'button';
  heliModelClear.className = 'o-btn';
  heliModelClear.textContent = 'Clear';
  heliModelClear.disabled = true;
  const heliModelFile = document.createElement('input');
  heliModelFile.type = 'file';
  heliModelFile.accept = '.glb,model/gltf-binary';
  heliModelFile.className = 'o-file';
  heliModelActions.appendChild(heliModelFileName);
  heliModelActions.appendChild(heliModelPick);
  heliModelActions.appendChild(heliModelClear);
  heliModelTop.appendChild(heliModelActions);
  heliModelRow.appendChild(heliModelTop);
  heliModelRow.appendChild(heliModelFile);
  const heliModelStatus = document.createElement('div');
  heliModelStatus.className = 'o-note';
  heliModelStatus.textContent = 'Optional static GLB. The procedural helicopter remains the fallback.';
  heliModelRow.appendChild(heliModelStatus);
  heliModelFile.addEventListener('change', () => {
    const file = heliModelFile.files && heliModelFile.files[0];
    heliModelFile.value = '';
    if (file) loadHelicopterModelFile(file);
  });
  mkSlider('Custom model height', 1, 8, 0.1, () => CFG.helicopter.modelHeight, v => {
    CFG.helicopter.modelHeight = v;
    if (helicopterCustom.asset) applyHelicopterAssetTransform(helicopterCustom.asset);
  }, v => v.toFixed(1) + 'm', helicopterGrid);
  mkSlider('Custom model yaw', -180, 180, 1, () => CFG.helicopter.modelYaw, v => {
    CFG.helicopter.modelYaw = v;
    if (helicopterCustom.asset) applyHelicopterAssetTransform(helicopterCustom.asset);
  }, v => v.toFixed(0) + '°', helicopterGrid);
  mkSlider('Rotor spin speed', 0, 30, 0.5, () => CFG.helicopter.rotorSpeed, v => { CFG.helicopter.rotorSpeed = v; }, v => v.toFixed(1), helicopterGrid);
  mkNote('Load a static glTF 2.0 binary helicopter model here. Separate rotor/propeller nodes are auto-spun when present. C still toggles the mouse-aimed downward camera; X fires along the current camera aim.', helicopterGrid);


  curPane = mkPane('misc', 'MISC');
  const miscGrid = mkGrid();
  mkSec('CONFIG', miscGrid);
  configStatus = mkNote('Config is kept in this browser.', miscGrid);
  mkButtons([['SAVE CONFIG', () => saveConfig()], ['LOAD CONFIG', () => loadConfig(false)]], miscGrid);
  mkSec('WEAPON', miscGrid);
  mkToggle('No recoil', () => CFG.misc.noRecoil, v => { CFG.misc.noRecoil = v; }, miscGrid);
  mkToggle('No spread', () => CFG.misc.noSpread, v => { CFG.misc.noSpread = v; }, miscGrid);
  mkToggle('Infinite ammo', () => CFG.misc.infAmmo, v => { CFG.misc.infAmmo = v; }, miscGrid);
  mkToggle('Rapid fire', () => CFG.misc.rapid, v => { CFG.misc.rapid = v; }, miscGrid);
  mkToggle('Force automatic', () => CFG.misc.autoFire, v => { CFG.misc.autoFire = v; }, miscGrid);
  mkSec('MOVEMENT', miscGrid);
  mkToggle('Bhop (hold Space)', () => CFG.misc.bhop, v => { CFG.misc.bhop = v; }, miscGrid);
  mkToggle('Speed', () => CFG.misc.speed, v => { CFG.misc.speed = v; }, miscGrid);
  mkSlider('Speed mult', 1, 4, 0.1, () => CFG.misc.speedMult, v => { CFG.misc.speedMult = v; }, v => v.toFixed(1) + 'x', miscGrid);
  mkSec('CAMERA', miscGrid);
  mkToggle('Third person', () => CFG.misc.tp, v => { CFG.misc.tp = v; }, miscGrid);
  mkSlider('Distance', 1.5, 8, 0.5, () => CFG.misc.tpDist, v => { CFG.misc.tpDist = v; }, v => v.toFixed(1) + 'm', miscGrid);
  mkSlider('Shoulder', -1, 1, 0.05, () => CFG.misc.tpShoulder, v => { CFG.misc.tpShoulder = v; }, v => v.toFixed(2), miscGrid);
  mkSec('TP MODEL', miscGrid);
  const modelRow = mkRow('o-model', miscGrid);
  const modelTop = document.createElement('div');
  modelTop.className = 'o-top';
  const modelActions = document.createElement('div');
  modelActions.className = 'o-actions';
  const modelFileName = document.createElement('span');
  modelFileName.className = 'o-file-name';
  modelFileName.textContent = 'No file selected';
  const modelPick = document.createElement('button');
  modelPick.type = 'button';
  modelPick.className = 'o-btn';
  modelPick.textContent = 'Load GLB';
  const modelClear = document.createElement('button');
  modelClear.type = 'button';
  modelClear.className = 'o-btn';
  modelClear.textContent = 'Clear';
  modelClear.disabled = true;
  const modelFile = document.createElement('input');
  modelFile.type = 'file';
  modelFile.accept = '.glb,model/gltf-binary';
  modelFile.className = 'o-file';
  modelActions.appendChild(modelFileName);
  modelActions.appendChild(modelPick);
  modelActions.appendChild(modelClear);
  modelTop.appendChild(modelActions);
  const modelStatus = document.createElement('div');
  modelStatus.className = 'o-note';
  modelStatus.textContent = 'Static GLB: indexed geometry, embedded PNG textures.';
  modelRow.appendChild(modelTop);
  modelRow.appendChild(modelFile);
  modelRow.appendChild(modelStatus);
  modelFile.addEventListener('change', () => {
    const file = modelFile.files && modelFile.files[0];
    modelFile.value = '';
    if (file) loadTpModelFile(file);
  });
  mkSlider('Model height', 1, 3.5, 0.05, () => CFG.misc.tpModelHeight, v => { CFG.misc.tpModelHeight = v; }, v => v.toFixed(2) + 'm', miscGrid);
  mkSlider('Model yaw', -180, 180, 1, () => CFG.misc.tpModelYaw, v => { CFG.misc.tpModelYaw = v; }, v => v.toFixed(0) + '\u00b0', miscGrid);
  mkToggle('Walk / idle motion', () => CFG.misc.tpModelBob, v => { CFG.misc.tpModelBob = v; }, miscGrid);
  mkSlider('Walk amount', 0, 2, 0.05, () => CFG.misc.tpModelWalk, v => { CFG.misc.tpModelWalk = v; }, v => v.toFixed(2) + 'x', miscGrid);
  mkToggle('Status chip', () => CFG.status, v => { CFG.status = v; paintStatus(); }, miscGrid);

  const foot = document.createElement('div');
  foot.className = 'o-foot';
  foot.innerHTML = '<span><b>OUTCOME</b> // visual systems online // v2.7.2</span>' +
    '<span>RSHIFT close &nbsp; F2 / F3 / F4 / F / T / E / C / X</span>';
  menu.appendChild(foot);

  showPane('esp');


  /* drag + input isolation — all capture-phase on the menu so the game
     never sees panel events, but our own handlers run first */
  let drag = null;
  menu.addEventListener('mousedown', ev => {
    const t = ev.target;
    if (t.closest && t.closest('[data-close]')) {
      ev.preventDefault();
    } else if (head.contains(t)) {
      ev.preventDefault();
      const r = menu.getBoundingClientRect();
      drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    } else if (t.closest && t.closest('.o-navbtn')) {
      showPane(t.closest('.o-navbtn').dataset.p);
    }
    ev.stopPropagation();
  }, true);
  menu.addEventListener('mouseup', ev => {
    drag = null;
    ev.stopPropagation();
  }, true);
  menu.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest && t.closest('[data-close]')) {
      ev.preventDefault();
      if (menuOpen) toggleMenu();
    } else if (t === modelPick) {
      ev.preventDefault();
      modelFile.click();
    } else if (t.classList && t.classList.contains('o-btn') && typeof t.__oClick === 'function') {
      ev.preventDefault();
      t.__oClick();
    } else if (t === modelClear) {
      ev.preventDefault();
      clearTpModel();
    } else if (t === heliModelPick) {
      ev.preventDefault();
      heliModelFile.click();
    } else if (t === heliModelClear) {
      ev.preventDefault();
      clearHelicopterModel();
    }
    ev.stopPropagation();
  }, true);
  for (const evName of ['dblclick', 'contextmenu']) {
    menu.addEventListener(evName, ev => { ev.stopPropagation(); }, true);
  }
  window.addEventListener('mousemove', ev => {
    if (!drag) return;
    menu.style.transform = 'none';
    menu.style.left = (ev.clientX - drag.dx) + 'px';
    menu.style.top = (ev.clientY - drag.dy) + 'px';
  });
  window.addEventListener('mouseup', () => { drag = null; });

  function toggleMenu() {
    menuOpen = !menuOpen;
    menu.style.display = menuOpen ? 'block' : 'none';
    if (menuOpen) {
      syncAll();
      try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
    } else {
      const g = window.game;
      const cv2 = g && g.renderer && g.renderer.domElement;
      if (cv2 && cv2.requestPointerLock) {
        try {
          const pr = cv2.requestPointerLock();
          if (pr && pr.catch) pr.catch(() => {});
        } catch (e) {}
      }
    }
  }

  function requestHelicopterSpawn() {
    const g = window.game;
    if (!g || !g.player || !g.scene || !g.camera) {
      setHelicopterStatus('Game runtime is not ready.', 'error');
      return false;
    }
    if (menuOpen) toggleMenu();
    const previousStatus = helicopterStatus ? helicopterStatus.textContent : '';
    const spawned = spawnHelicopter(g);
    if (spawned) setHelicopterStatus('Helicopter deployed. Press E to enter.', 'ok');
    else if (!helicopterStatus || helicopterStatus.textContent === previousStatus) {
      setHelicopterStatus('Spawn blocked: enter a live match and try again.', 'error');
    }
    return spawned;
  }

  paintStatus();
  loadConfig(true);

  /* ---------------- keys ---------------- */
  const heldCodes = new Set();
  window.addEventListener('keyup', ev => { heldCodes.delete(ev.code); });
  window.addEventListener('blur', () => { heldCodes.clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) heldCodes.clear(); });
  window.addEventListener('keydown', ev => {
    heldCodes.add(ev.code);
    if (ev.code === 'KeyT' && CFG.helicopter.enabled && !ev.repeat) {
      ev.preventDefault();
      requestHelicopterSpawn();
    } else if (ev.code === 'KeyE' && CFG.helicopter.enabled && helicopterState.active && !ev.repeat) {
      ev.preventDefault();
      if (helicopterState.occupied) exitHelicopter(window.game);
      else enterHelicopter(window.game);
    } else if (ev.code === 'KeyC' && helicopterState.occupied && !ev.repeat) {
      ev.preventDefault();
      helicopterState.gunnerMode = !helicopterState.gunnerMode;
      if (helicopterState.gunnerMode) {
        helicopterState.gunYaw = window.game && window.game.player ? window.game.player.yaw || 0 : helicopterState.hullYaw;
        helicopterState.gunPitch = -1.15;
        if (window.game && window.game.player) window.game.player.pitch = helicopterState.gunPitch;
      } else if (window.game && window.game.player) {
        helicopterState.cameraLastYaw = window.game.player.yaw || 0;
        helicopterState.cameraLastPitch = window.game.player.pitch || 0;
      }
    } else if (ev.code === 'KeyX' && helicopterState.occupied && !ev.repeat) {
      ev.preventDefault();
      fireHelicopterMissile(window.game);
    } else if (ev.code === 'KeyR' && helicopterState.occupied && !ev.repeat) {
      ev.preventDefault();
      beginHelicopterReload();
    } else if (ev.code === 'KeyF' && CFG.drone.enabled && !ev.repeat) {
      ev.preventDefault();
      launchDrone(window.game);
    } else if (ev.code === 'F2') {
      ev.preventDefault();
      CFG.esp = !CFG.esp;
      paintStatus();
    } else if (ev.code === 'F3') {
      ev.preventDefault();
      CFG.chams = !CFG.chams;
      if (!CFG.chams) restoreAll();
      paintStatus();
    } else if (ev.code === 'F4') {
      ev.preventDefault();
      CFG.sa.on = !CFG.sa.on;
      paintStatus();
    } else if (ev.code === 'ShiftRight') {
      ev.preventDefault();
      toggleMenu();
    }
  });

  /* ---------------- world -> screen ---------------- */
  const mulBuf = new Float64Array(16);
  function combo(P, V) {
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += P[k * 4 + r] * V[c * 4 + k];
        mulBuf[c * 4 + r] = s;
      }
    return mulBuf;
  }
  function project(C, x, y, z) {
    const w = C[3] * x + C[7] * y + C[11] * z + C[15];
    if (w <= 1e-4) return null;
    const sx = (C[0] * x + C[4] * y + C[8] * z + C[12]) / w;
    const sy = (C[1] * x + C[5] * y + C[9] * z + C[13]) / w;
    return [(sx * 0.5 + 0.5) * vw, (1 - (sy * 0.5 + 0.5)) * vh];
  }

  function hpColor(t) {
    const mix = (a, b, k) => Math.round(a + (b - a) * k);
    if (t > 0.5) {
      const k = (t - 0.5) * 2;
      return 'rgb(' + mix(255, 60, k) + ',' + mix(210, 255, k) + ',' + mix(63, 110, k) + ')';
    }
    const k = t * 2;
    return 'rgb(' + mix(255, 255, k) + ',' + mix(60, 210, k) + ',' + mix(48, 63, k) + ')';
  }

  /* ---------------- chams ---------------- */
  const chammed = new Set();
  const isOurCham = m => !!(m && m.userData && m.userData.__espCham);
  const matList = m => (Array.isArray(m) ? m : [m]);

  function buildCham(orig, color, glow) {
    const make = src => {
      const m = src.clone();
      if (m.color) m.color.set(color);
      if (m.emissive) { m.emissive.set(color); m.emissiveIntensity = glow ? 1.35 : 1; }
      m.map = null; m.emissiveMap = null; m.normalMap = null;
      m.roughnessMap = null; m.metalnessMap = null; m.aoMap = null;
      m.alphaMap = null; m.bumpMap = null; m.displacementMap = null;
      if ('roughness' in m) m.roughness = 1;
      if ('metalness' in m) m.metalness = 0;
      if ('side' in m) m.side = glow ? 1 : 2;
      m.depthTest = glow ? !CFG.chamThroughWalls : !CFG.chamThroughWalls;
      m.depthWrite = false;
      m.transparent = true;
      m.opacity = glow ? CFG.chamGlowStrength * 0.8 : CFG.chamOpacity;
      m.blending = glow ? 2 : 1;
      m.toneMapped = false;
      m.userData.__espCham = true;
      m.userData.__espGlow = !!glow;
      m.userData.__espColor = color;
      m.needsUpdate = true;
      return m;
    };
    return Array.isArray(orig) ? orig.map(make) : make(orig);
  }

  function disposeChamMaterial(value) {
    const list = matList(value);
    for (const m of list) if (m && m.userData && m.userData.__espCham && m.dispose) m.dispose();
  }
  function removeGlowShell(mesh) {
    const shell = mesh.userData && mesh.userData.__espGlow;
    if (!shell) return;
    if (shell.parent) shell.parent.remove(shell);
    if (shell.material) disposeChamMaterial(shell.material);
    mesh.userData.__espGlow = null;
  }
  function makeGlowShell(mesh, color) {
    if (!CFG.chamGlow || !mesh.parent || mesh.userData.__espGlow) return;
    const source = mesh.userData.__espOrig || mesh.material;
    const first = Array.isArray(source) ? source[0] : source;
    if (!first) return;
    let shell = null;
    try {
      shell = new mesh.constructor(mesh.geometry, buildCham(first, color, true));
      if (mesh.isSkinnedMesh && mesh.skeleton && shell.bind) shell.bind(mesh.skeleton, mesh.bindMatrix);
      shell.position.copy(mesh.position);
      shell.quaternion.copy(mesh.quaternion);
      shell.scale.copy(mesh.scale).multiplyScalar(1.055);
      shell.renderOrder = CFG.chamOrder - 1;
      shell.frustumCulled = false;
      shell.userData.__espGlowShell = true;
      mesh.parent.add(shell);
      mesh.userData.__espGlow = shell;
    } catch (e) {
      if (shell) { if (shell.material) disposeChamMaterial(shell.material); }
    }
  }
  function updateGlowShells() {
    const pulse = CFG.chamPulse ? 1 + Math.sin(performance.now() / 170) * 0.12 : 1;
    for (const mesh of chammed) {
      const shell = mesh.userData.__espGlow;
      if (!shell) continue;
      shell.position.copy(mesh.position);
      shell.quaternion.copy(mesh.quaternion);
      shell.scale.copy(mesh.scale).multiplyScalar(1.055 * pulse);
      const mats = matList(shell.material);
      for (const m of mats) {
        m.opacity = Math.max(0, Math.min(1, CFG.chamGlowStrength * 0.8 * pulse));
        m.depthTest = !CFG.chamThroughWalls;
        m.emissiveIntensity = 1.35 * pulse;
      }
    }
  }

  function applyCham(mesh, color) {
    const u = mesh.userData;
    const list = matList(mesh.material);
    const oursN = list.filter(isOurCham).length;
    if (oursN === list.length) {
      if (list[0].userData.__espColor === color) {
        if (u.__espRoSaved === undefined) u.__espRoSaved = mesh.renderOrder || 0;
        if (mesh.renderOrder !== CFG.chamOrder) mesh.renderOrder = CFG.chamOrder;
        if (CFG.chamGlow) makeGlowShell(mesh, color); else removeGlowShell(mesh);
        chammed.add(mesh);
        return;
      }
      removeGlowShell(mesh);
      disposeChamMaterial(u.__espCham);
      u.__espCham = null;
    } else if (oursN === 0) {
      u.__espOrig = mesh.material;
      if (u.__espRoSaved === undefined) u.__espRoSaved = mesh.renderOrder || 0;
    }
    const orig = u.__espOrig;
    if (!orig) return;
    let ch = (u.__espCham && u.__espChamColor === color) ? u.__espCham : null;
    if (!ch) {
      ch = buildCham(orig, color, false);
      u.__espCham = ch;
      u.__espChamColor = color;
    }
    mesh.material = ch;
    mesh.renderOrder = CFG.chamOrder;
    if (CFG.chamGlow) makeGlowShell(mesh, color);
    chammed.add(mesh);
  }

  function restoreOne(mesh) {
    const u = mesh.userData;
    removeGlowShell(mesh);
    if (u.__espCham) {
      disposeChamMaterial(u.__espCham);
      u.__espCham = null;
    }
    if (u.__espOrig) mesh.material = u.__espOrig;
    if (u.__espRoSaved !== undefined) mesh.renderOrder = u.__espRoSaved;
  }
  function restoreAll() {
    for (const m of chammed) restoreOne(m);
    chammed.clear();
  }

  function tickChams(g) {
    if (!CFG.chams || CFG.states.indexOf(g.state) === -1) {
      if (chammed.size) restoreAll();
      return;
    }
    const bots = (g.botMgr && g.botMgr.bots) || [];
    const me = g.player;
    const desired = new Map();
    for (const b of bots) {
      if (!b.alive) continue;
      const enemy = b.team !== me.team;
      if (!enemy && !CFG.chamsTeam) continue;
      const root = b.cs2Agent && b.cs2Agent.root;
      if (!root) continue;
      const color = enemy ? CFG.colChamEnemy : CFG.colChamTeam;
      root.traverse(o => {
        if (o.isMesh && o.material && !o.userData.__espGlowShell) desired.set(o, color);
      });
    }
    if (chammed.size) {
      for (const m of chammed) {
        if (!desired.has(m)) {
          restoreOne(m);
          chammed.delete(m);
        }
      }
    }
    for (const [m, color] of desired) applyCham(m, color);
    const pulse = CFG.chamPulse ? 0.86 + Math.sin(performance.now() / 170) * 0.14 : 1;
    for (const mesh of chammed) {
      for (const m of matList(mesh.material)) {
        m.opacity = Math.max(0, Math.min(1, CFG.chamOpacity * pulse));
        m.depthTest = !CFG.chamThroughWalls;
        if (m.emissive) m.emissiveIntensity = 0.85 + pulse * 0.35;
      }
    }
    updateGlowShells();
  }

  /* ---------------- esp draw ---------------- */
  function withAlpha(col, alpha) {
    const value = String(col || '#ffffff').replace('#', '');
    const hex = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
    const n = parseInt(hex.slice(0, 6), 16);
    if (!Number.isFinite(n)) return 'rgba(255,255,255,' + alpha + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }
  function roundedPath(x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
  function boxPath(x, y, w, h) {
    ctx.beginPath();
    if (CFG.boxStyle === 'corner') {
      const L = Math.max(6, Math.min(w, h) * 0.25);
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
    } else if (CFG.boxStyle === 'soft') {
      roundedPath(x, y, w, h, Math.min(10, w * 0.08));
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function drawBox(x, y, w, h, col) {
    ctx.save();
    if (CFG.boxFill) {
      boxPath(x, y, w, h);
      ctx.fillStyle = withAlpha(col, 0.075);
      ctx.fill();
    }
    if (CFG.boxOutline) {
      boxPath(x, y, w, h);
      ctx.lineWidth = CFG.boxWidth + 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.82)';
      ctx.stroke();
    }
    boxPath(x, y, w, h);
    ctx.lineWidth = CFG.boxWidth;
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = CFG.boxGlow;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawESP(g) {
    ctx.clearRect(0, 0, vw, vh);
    if (CFG.world.enabled && skyState.texture == null) drawSkyOverlay(g);
    if (CFG.states.indexOf(g.state) === -1) return;

    let cam = g._topCam || g.camera;
    const droneCamera = droneState.active && (CFG.drone.fpv || droneState.previewTime > 0) && droneState.camera;
    const helicopterCamera = helicopterState.active && helicopterState.occupied &&
      (helicopterState.gunnerMode ? helicopterState.gunCamera : helicopterState.camera);
    if (droneCamera || helicopterCamera) {
      cam = droneCamera ? droneState.camera : helicopterCamera;
      cam.aspect = vw / Math.max(1, vh);
      if (cam.updateProjectionMatrix) cam.updateProjectionMatrix();
      if (cam.updateMatrixWorld) cam.updateMatrixWorld();
    }
    if (!cam) return;
    // Read the renderer-owned matrices; updating camera matrices here can
    // race the game camera update and show as a one-frame view flicker.
    const C = combo(cam.projectionMatrix.elements, cam.matrixWorldInverse.elements);
    const me = g.player;

    /* silent-aim line: crosshair -> locked target */
    if (CFG.sa.on && CFG.sa.line && saLock && saLock.ent && saLock.ent.alive) {
      const sp = project(C, saLock.tx, saLock.ty, saLock.tz);
      if (sp) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.moveTo(vw / 2, vh / 2); ctx.lineTo(sp[0], sp[1]); ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = CFG.sa.colLine;
        ctx.shadowColor = CFG.sa.colLine;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(vw / 2, vh / 2); ctx.lineTo(sp[0], sp[1]); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = CFG.sa.colLine;
        ctx.beginPath(); ctx.arc(sp[0], sp[1], 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* silent-aim FOV circle — radius derived from projection matrix so it
       matches the real dot-product gate at any aspect ratio / fov */
    if (CFG.sa.on && CFG.sa.fovCircle) {
      const proj5 = cam.projectionMatrix.elements[5];
      const rad = Math.tan(CFG.sa.fov * Math.PI / 360) * proj5 * (vh / 2);
      if (rad > 2 && rad < vh) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.arc(vw / 2, vh / 2, rad + 1, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = CFG.sa.colLine;
        ctx.shadowColor = CFG.sa.colLine;
        ctx.shadowBlur = 7;
        ctx.beginPath(); ctx.arc(vw / 2, vh / 2, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (!CFG.esp) return;

    for (const e of g.allEntities()) {
      if (e === me || !e.alive) continue;
      const enemy = e.team !== me.team;
      if (!enemy && !CFG.showTeam) continue;
      if (Math.hypot(e.x - me.x, e.y - me.y, e.z - me.z) > CFG.maxDist) continue;

      const r = e.radius || 0.4064;
      const h = e.height || 1.8288;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let ok = true;
      for (let i = 0; i < 8; i++) {
        const p = project(
          C,
          e.x + ((i & 1) ? r : -r),
          e.y + ((i & 4) ? h : 0),
          e.z + ((i & 2) ? r : -r)
        );
        if (!p) { ok = false; break; }
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }
      if (!ok) continue;
      const bw = maxX - minX, bh = maxY - minY;
      if (bw <= 0 || bh <= 0) continue;
      const col = enemy ? CFG.colBoxEnemy : CFG.colBoxTeam;
      const cx = (minX + maxX) / 2;
      const targetDist = Math.hypot(e.x - me.x, e.y - me.y, e.z - me.z);

      if (CFG.box) drawBox(minX, minY, bw, bh, col);
      if (CFG.headDot) {
        const head = project(C, e.x, e.y + h - 0.1, e.z);
        if (head) {
          ctx.save();
          ctx.fillStyle = col;
          ctx.shadowColor = col; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(head[0], head[1], 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      if (CFG.snap) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(vw / 2 + 1, vh); ctx.lineTo(cx + 1, maxY + 1); ctx.stroke();
        ctx.strokeStyle = withAlpha(col, 0.82);
        ctx.shadowColor = col; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.moveTo(vw / 2, vh); ctx.lineTo(cx, maxY); ctx.stroke();
        ctx.restore();
      }

      if (CFG.hp) {
        const t = Math.max(0, Math.min(1, (e.health || 0) / 100));
        const barW = CFG.hpWidth, gap = 4;
        const bx = minX - gap - barW;
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(bx - 1, minY - 1, barW + 2, bh + 2);
        const fh = bh * t;
        if (fh > 0) {
          const grad = ctx.createLinearGradient(0, minY + bh, 0, minY);
          grad.addColorStop(0, hpColor(Math.max(0, t - 0.12)));
          grad.addColorStop(1, hpColor(t));
          ctx.fillStyle = grad;
          ctx.shadowColor = hpColor(t); ctx.shadowBlur = 5;
          ctx.fillRect(bx, minY + bh - fh, barW, fh);
          ctx.shadowBlur = 0;
        }
      }

      if (CFG.name && e.name) {
        ctx.font = '700 ' + CFG.nameSize + 'px Consolas, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        const label = e.name;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(5,7,9,0.78)';
        ctx.fillRect(cx - tw / 2 - 5, minY - CFG.nameSize - 8, tw + 10, CFG.nameSize + 6);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = col; ctx.shadowBlur = 5;
        ctx.fillText(label, cx, minY - 5);
        ctx.shadowBlur = 0;
      }
      if (CFG.distance) {
        ctx.font = '600 ' + CFG.distanceSize + 'px Consolas, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = withAlpha(col, 0.9);
        ctx.shadowColor = col; ctx.shadowBlur = 4;
        ctx.fillText(Math.round(targetDist) + 'm', cx, maxY + 14);
        ctx.shadowBlur = 0;
      }
    }
  }

  /* ---------------- sky / world backdrop ---------------- */
  const skyState = {
    texture: null,
    canvas: null,
    context: null,
    original: undefined,
    clear: null,
    clearAlpha: 1,
    prototypes: null,
    applied: false
  };
  const SKY_PRESETS = {
    dusk: '#78a9ff',
    arctic: '#bcecff',
    void: '#160f2d'
  };
  function setSkyPreset(name) {
    const color = SKY_PRESETS[name];
    if (!color) return;
    CFG.world.preset = name;
    CFG.world.color = color;
    syncAll();
  }
  function skyShade(hex, amount) {
    const value = String(hex || '#ffffff').replace('#', '');
    const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
    const n = parseInt(full.slice(0, 6), 16);
    if (!Number.isFinite(n)) return '#ffffff';
    const parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v =>
      Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount)))));
    return 'rgb(' + parts.join(',') + ')';
  }
  function drawSkyTexture() {
    const s = skyState;
    if (!s.context) return;
    const c = s.context, w = s.canvas.width, h = s.canvas.height;
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, skyShade(CFG.world.color, CFG.world.color === SKY_PRESETS.void ? -0.15 : -0.48));
    grad.addColorStop(0.56, skyShade(CFG.world.color, 0.08));
    grad.addColorStop(1, skyShade(CFG.world.color, 0.38));
    c.fillStyle = grad; c.fillRect(0, 0, w, h);
    if (!CFG.world.stars) return;
    const count = Math.floor(CFG.world.starDensity);
    const now = performance.now() / 1000;
    for (let i = 0; i < count; i++) {
      const x = (i * 97.31 + 19.7) % w;
      const baseY = (i * 47.77 + 11.3) % h;
      const y = (baseY + Math.sin(now * (0.08 + (i % 7) * 0.01) + i) * 1.8 + h) % h;
      const twinkle = CFG.world.twinkle > 0 ? 0.62 + Math.sin(now * (1.1 + (i % 9) * 0.17) + i * 1.7) * 0.38 * CFG.world.twinkle : 0.8;
      const size = CFG.world.starSize * (0.45 + (i % 5) * 0.18);
      c.fillStyle = 'rgba(255,255,255,' + Math.max(0.12, twinkle).toFixed(3) + ')';
      c.fillRect(x, y, size, size);
      if (i % 17 === 0) {
        c.fillStyle = 'rgba(166,220,255,' + (twinkle * 0.34).toFixed(3) + ')';
        c.fillRect(x - size * 2, y + size * 0.5, size * 5, 1);
      }
    }
  }
  function skyPrototypes(g) {
    let colorCtor = null, textureCtor = null;
    const roots = [g.scene, g.previewScene, g.viewmodel && g.viewmodel.scene];
    for (const root of roots) {
      if (!root || !root.traverse) continue;
      root.traverse(o => {
        if (!colorCtor && o.isColor && o.constructor) colorCtor = o.constructor;
        if (!colorCtor && o.color && o.color.isColor && o.color.constructor) colorCtor = o.color.constructor;
        if (!textureCtor && o.isTexture && o.constructor) textureCtor = o.constructor;
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of mats) {
          if (!colorCtor && m.color && m.color.isColor && m.color.constructor) colorCtor = m.color.constructor;
          if (!textureCtor && m.map && m.map.constructor) textureCtor = m.map.constructor;
          if (!textureCtor && m.emissiveMap && m.emissiveMap.constructor) textureCtor = m.emissiveMap.constructor;
        }
      });
    }
    return { colorCtor, textureCtor };
  }
  function tickSky(g) {
    if (!g.scene) return;
    const s = skyState;
    if (!CFG.world.enabled) {
      if (s.applied) {
        g.scene.background = s.original;
        if (s.clear && g.renderer && g.renderer.setClearColor) g.renderer.setClearColor(s.clear, s.clearAlpha);
        s.applied = false;
        s.original = undefined;
        s.clear = null;
        s.clearAlpha = 1;
      }
      return;
    }
    if (!s.prototypes || (!s.prototypes.colorCtor && !s.prototypes.textureCtor)) {
      s.prototypes = skyPrototypes(g);
    }
    const proto = s.prototypes;
    const colorCtor = proto.colorCtor;
    if (s.original === undefined) {
      s.original = g.scene.background || null;
      if (colorCtor && g.renderer && g.renderer.getClearColor) {
        try {
          s.clear = new colorCtor();
          g.renderer.getClearColor(s.clear);
          s.clearAlpha = g.renderer.getClearAlpha ? g.renderer.getClearAlpha() : 1;
        } catch (e) {}
      }
    }
    if (colorCtor) {
      if (!s.skyColor) s.skyColor = new colorCtor();
      s.skyColor.set(CFG.world.color);
      if (g.renderer && g.renderer.setClearColor) g.renderer.setClearColor(s.skyColor, 1);
    }
    if (CFG.world.stars && proto.textureCtor) {
      if (!s.texture) {
        try {
          s.canvas = document.createElement('canvas');
          s.canvas.width = 512; s.canvas.height = 256;
          s.context = s.canvas.getContext('2d');
          s.texture = new proto.textureCtor(s.canvas);
          s.texture.minFilter = 1006;
          s.texture.magFilter = 1006;
          s.texture.generateMipmaps = false;
          s.texture.colorSpace = 'srgb';
        } catch (e) { s.texture = null; }
      }
      if (s.texture) {
        drawSkyTexture();
        s.texture.needsUpdate = true;
        g.scene.background = s.texture;
        s.applied = true;
        return;
      }
    }
    if (colorCtor) {
      try { g.scene.background = new colorCtor(CFG.world.color); } catch (e) {}
    }
    s.applied = true;
  }
  function drawSkyOverlay(g) {
    if (!CFG.world.stars) return;
    const p = g.player;
    const yaw = p && p.yaw || 0, pitch = p && p.pitch || 0;
    const ox = (yaw * 260) % vw, oy = (pitch * 190) % vh;
    const count = Math.min(260, Math.floor(CFG.world.starDensity * 0.55));
    for (let i = 0; i < count; i++) {
      const x = ((i * 83.17 + ox) % vw + vw) % vw;
      const y = ((i * 47.71 + oy) % vh + vh) % vh;
      const a = 0.18 + (i % 9) / 18;
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      ctx.fillRect(x, y, CFG.world.starSize, CFG.world.starSize);
    }
  }

  /* ---------------- local wings ---------------- */
  const wingState = { group: null, parent: null, left: null, right: null, phase: 0, style: '', glow: false, span: 1, glowScale: 1.08 };
  const WING_PRESETS = {
    feather: { color: '#8cecff', glowColor: '#b56cff', flapSpeed: 1.2, flapAmount: 0.45 },
    energy: { color: '#ffb35c', glowColor: '#ff4d9d', flapSpeed: 2.1, flapAmount: 0.3 },
    crystal: { color: '#a6a0ff', glowColor: '#6df0ff', flapSpeed: 0.8, flapAmount: 0.22 }
  };
  function setWingPreset(name) {
    const preset = WING_PRESETS[name];
    if (!preset) return;
    Object.assign(CFG.wings, preset);
    CFG.wings.style = name;
    syncAll();
  }
  function wingMaterial(proto, color, glow) {
    const m = new proto.materialCtor();
    if (m.color) m.color.set(color);
    if (m.emissive) { m.emissive.set(glow ? CFG.wings.glowColor : color); m.emissiveIntensity = glow ? 1.7 : 0.8; }
    m.map = null; m.normalMap = null; m.roughnessMap = null; m.metalnessMap = null;
    if ('roughness' in m) m.roughness = 0.32;
    if ('metalness' in m) m.metalness = 0.05;
    if ('side' in m) m.side = 2;
    m.transparent = true; m.opacity = glow ? 0.45 : CFG.wings.opacity;
    m.depthTest = true; m.depthWrite = false; m.toneMapped = false;
    m.blending = glow ? 2 : 1;
    m.userData.__outcomeWing = true;
    m.userData.__outcomeGlow = !!glow;
    return m;
  }
  function wingGeometry(proto, side) {
    const values = [];
    const tri = (a, b, c) => {
      values.push(a[0] * side, a[1], a[2], b[0] * side, b[1], b[2], c[0] * side, c[1], c[2]);
    };
    const count = CFG.wings.style === 'crystal' ? 5 : CFG.wings.style === 'energy' ? 4 : 7;
    const span = CFG.wings.span;
    for (let i = 0; i < count; i++) {
      const t = i / count, u = (i + 1) / count;
      const inner = [0.08, 0.38 - t * 0.22, -0.04 + t * 0.05];
      const outer = [1.16 * span, 0.28 - u * 0.18, 0.03 + u * 0.12];
      const lower = [0.92 * span, -0.08 - u * 0.09, 0.02 + u * 0.1];
      const featherTip = CFG.wings.style === 'crystal'
        ? [(0.88 + u * 0.42) * span, 0.12 - u * 0.1, 0.16 + u * 0.1]
        : [(1.08 + u * 0.18) * span, 0.05 - u * 0.1, 0.02 + u * 0.12];
      tri(inner, outer, featherTip);
      if (CFG.wings.style !== 'energy') tri(inner, featherTip, lower);
    }
    const geometry = new proto.geometryCtor();
    geometry.setAttribute('position', new proto.attributeCtor(new Float32Array(values), 3));
    if (geometry.computeVertexNormals) geometry.computeVertexNormals();
    return geometry;
  }
  function disposeWings() {
    if (!wingState.group) return;
    wingState.group.traverse(o => {
      if (o.geometry && o.geometry.dispose) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) if (m && m.dispose) m.dispose();
    });
    if (wingState.group.parent) wingState.group.parent.remove(wingState.group);
    wingState.group = null; wingState.parent = null; wingState.left = null; wingState.right = null; wingState.style = ''; wingState.glow = false; wingState.span = 1; wingState.glowScale = 1.08;
  }
  function wingParent(g) {
    if (tpCustom.asset && tpCustom.asset.root) return tpCustom.asset.root;
    if (g.__tpAg && g.__tpAg.root) return g.__tpAg.root;
    return null;
  }
  function buildWings(g, parent) {
    disposeWings();
    const proto = getTpPrototypes(g);
    const group = new proto.groupCtor();
    group.name = 'OUTCOME wings';
    group.userData.__outcomeWings = true;
    for (const side of [-1, 1]) {
      const pivot = new proto.groupCtor();
      pivot.name = side < 0 ? 'left wing' : 'right wing';
      const geometry = wingGeometry(proto, side);
      const mesh = new proto.meshCtor(geometry, wingMaterial(proto, CFG.wings.color, false));
      mesh.frustumCulled = false; mesh.renderOrder = CFG.chamOrder + 2;
      pivot.add(mesh);
      if (CFG.wings.glow) {
        const glow = new proto.meshCtor(geometry, wingMaterial(proto, CFG.wings.glowColor, true));
        glow.scale.setScalar(CFG.wings.glowScale);
        glow.frustumCulled = false; glow.renderOrder = CFG.chamOrder + 1;
        pivot.add(glow);
      }
      group.add(pivot);
      if (side < 0) wingState.left = pivot; else wingState.right = pivot;
    }
    parent.add(group);
    wingState.group = group;
    wingState.parent = parent;
    wingState.style = CFG.wings.style;
    wingState.glow = CFG.wings.glow;
    wingState.span = CFG.wings.span;
    wingState.glowScale = CFG.wings.glowScale;
  }
  function tickWings(g, dt) {
    const parent = wingParent(g);
    const active = !!(CFG.wings.enabled && parent && (CFG.misc.tp || tpActive(g)));
    if (!parent) { if (wingState.group) wingState.group.visible = false; return; }
    if (!wingState.group || wingState.parent !== parent || wingState.style !== CFG.wings.style ||
        wingState.glow !== CFG.wings.glow || wingState.span !== CFG.wings.span || wingState.glowScale !== CFG.wings.glowScale) {
      try { buildWings(g, parent); } catch (e) { return; }
    }
    const group = wingState.group;
    group.visible = active;
    if (!active) return;
    group.position.set(0, CFG.wings.height, CFG.wings.forward);
    group.rotation.set(0, CFG.wings.yaw * Math.PI / 180, CFG.wings.roll * Math.PI / 180);
    group.scale.setScalar(CFG.wings.size);
    wingState.phase += dt * Math.max(0, CFG.wings.flapSpeed);
    const flap = CFG.wings.flap ? Math.sin(wingState.phase) * CFG.wings.flapAmount : 0;
    if (wingState.left) {
      wingState.left.position.set(CFG.wings.leftX, CFG.wings.leftY, CFG.wings.leftZ);
      wingState.left.rotation.set(0, CFG.wings.leftYaw * Math.PI / 180,
        CFG.wings.leftRoll * Math.PI / 180 + flap);
    }
    if (wingState.right) {
      wingState.right.position.set(CFG.wings.rightX, CFG.wings.rightY, CFG.wings.rightZ);
      wingState.right.rotation.set(0, CFG.wings.rightYaw * Math.PI / 180,
        CFG.wings.rightRoll * Math.PI / 180 - flap);
    }
    group.traverse(o => {
      if (!o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.color) m.color.set(m.userData.__outcomeGlow ? CFG.wings.glowColor : CFG.wings.color);
        if (m.emissive) m.emissive.set(m.userData.__outcomeGlow ? CFG.wings.glowColor : CFG.wings.color);
        if (!m.userData.__outcomeGlow) m.opacity = CFG.wings.opacity;
      }
    });
  }

  /* ---------------- local aura particles ---------------- */
  const auraState = {
    group: null, parent: null, primary: null, glow: null, geometry: null,
    materials: [], shaders: [], style: '', count: 0, glowEnabled: false, phase: 0
  };
  const AURA_PRESETS = {
    ember: { color: '#ffb36b', glowColor: '#ff5c9d', radius: 1.1, height: 2.1, size: 0.035, speed: 1.1, rise: 0.8, orbit: 0.7, opacity: 0.46 },
    orbit: { color: '#83d7ff', glowColor: '#b78cff', radius: 1.25, height: 1.8, size: 0.035, speed: 1.2, rise: 0, orbit: 2.4, opacity: 0.5 },
    halo: { color: '#aaa4ff', glowColor: '#6df0ff', radius: 1.4, height: 1.65, size: 0.03, speed: 0.8, rise: 0, orbit: 1.4, opacity: 0.44 }
  };
  function setAuraPreset(name) {
    const preset = AURA_PRESETS[name];
    if (!preset) return;
    Object.assign(CFG.aura, preset);
    CFG.aura.style = name;
    syncAll();
  }
  function auraMaterial(proto, color, glow) {
    const m = new proto.materialCtor();
    if (m.color) m.color.set(color);
    if (m.emissive) { m.emissive.set(glow ? CFG.aura.glowColor : color); m.emissiveIntensity = glow ? 0.75 : 0.28; }
    m.map = null; m.normalMap = null; m.roughnessMap = null; m.metalnessMap = null;
    if ('roughness' in m) m.roughness = 0.25;
    if ('metalness' in m) m.metalness = 0;
    if ('fog' in m) m.fog = false;
    if ('side' in m) m.side = 2;
    m.transparent = true;
    m.opacity = glow ? Math.min(0.22, CFG.aura.opacity * 0.28) : CFG.aura.opacity;
    m.depthTest = true; m.depthWrite = false; m.toneMapped = false;
    m.blending = glow ? 2 : 1;
    m.userData.__outcomeAura = true;
    m.userData.__outcomeAuraGlow = !!glow;
    m.onBeforeCompile = shader => {
      shader.__auraGlow = !!glow;
      shader.uniforms.uAuraTime = { value: 0 };
      shader.uniforms.uAuraRadius = { value: CFG.aura.radius };
      shader.uniforms.uAuraHeight = { value: CFG.aura.height };
      shader.uniforms.uAuraSize = { value: CFG.aura.size * (glow ? CFG.aura.glowScale : 1) };
      shader.uniforms.uAuraSpeed = { value: CFG.aura.speed };
      shader.uniforms.uAuraRise = { value: CFG.aura.rise };
      shader.uniforms.uAuraOrbit = { value: CFG.aura.orbit };
      shader.uniforms.uAuraMode = { value: CFG.aura.style === 'ember' ? 0 : CFG.aura.style === 'orbit' ? 1 : 2 };
      shader.vertexShader = shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec2 vAuraCorner;\nattribute vec2 aCorner;\nattribute vec4 aParticle;\n' +
        'uniform float uAuraTime;\nuniform float uAuraRadius;\nuniform float uAuraHeight;\nuniform float uAuraSize;\n' +
        'uniform float uAuraSpeed;\nuniform float uAuraRise;\nuniform float uAuraOrbit;\nuniform float uAuraMode;');
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', [
        'float auraSize = 0.55 + aParticle.y * 1.15;',
        'float auraAngle = aParticle.x * 6.2831853 + uAuraTime * uAuraSpeed * uAuraOrbit * (0.35 + auraSize * 0.2);',
        'float cycle = max(uAuraHeight, 0.001);',
        'float auraRise = mod(uAuraTime * uAuraRise + aParticle.z * cycle, cycle);',
        'if (auraRise < 0.0) auraRise += cycle;',
        'vec3 auraPosition = position;',
        'if (uAuraMode < 0.5) auraPosition.y = auraRise;',
        'float auraRadius = uAuraRadius * (0.35 + aParticle.y * 0.85);',
        'auraPosition.x += cos(auraAngle) * auraRadius;',
        'auraPosition.z += sin(auraAngle) * auraRadius;',
        'vec4 mvPosition = modelViewMatrix * vec4(auraPosition, 1.0);',
        'mvPosition.xy += aCorner * uAuraSize * auraSize;',
        'vAuraCorner = aCorner;',
        'gl_Position = projectionMatrix * mvPosition;'
      ].join('\n'));
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
        '#include <common>\nvarying vec2 vAuraCorner;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\nfloat auraShape = 1.0 - smoothstep(0.58, 1.0, length(vAuraCorner));\ndiffuseColor.a *= auraShape;');
      auraState.shaders.push(shader);
    };
    if (m.customProgramCacheKey) m.customProgramCacheKey = () => 'outcome-aura-' + (glow ? 'glow' : 'core');
    return m;
  }
  function auraGeometry(proto, count) {
    const positions = [], corners = [], particles = [];
    const quads = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < count; i++) {
      const angle = (i * 0.61803398875) % 1;
      const sizeSeed = (i * 0.754877666) % 1;
      const heightSeed = (i * 0.56984029) % 1;
      const baseY = CFG.aura.style === 'ember' ? 0.06 : 0.9 + (heightSeed - 0.5) * CFG.aura.height;
      for (const corner of quads) {
        positions.push(0, baseY, 0);
        corners.push(corner[0], corner[1]);
        particles.push(angle, sizeSeed, heightSeed, 0);
      }
    }
    const geometry = new proto.geometryCtor();
    geometry.setAttribute('position', new proto.attributeCtor(new Float32Array(positions), 3));
    geometry.setAttribute('aCorner', new proto.attributeCtor(new Float32Array(corners), 2));
    geometry.setAttribute('aParticle', new proto.attributeCtor(new Float32Array(particles), 4));
    if (geometry.computeVertexNormals) geometry.computeVertexNormals();
    return geometry;
  }
  function disposeAura() {
    if (auraState.group && auraState.group.parent) auraState.group.parent.remove(auraState.group);
    if (auraState.geometry && auraState.geometry.dispose) auraState.geometry.dispose();
    for (const m of auraState.materials) if (m && m.dispose) m.dispose();
    auraState.group = null; auraState.parent = null; auraState.primary = null; auraState.glow = null;
    auraState.geometry = null; auraState.materials = []; auraState.shaders = [];
    auraState.style = ''; auraState.count = 0; auraState.glowEnabled = false;
  }
  function buildAura(g, parent) {
    disposeAura();
    const proto = getTpPrototypes(g);
    const geometry = auraGeometry(proto, Math.floor(CFG.aura.count));
    const group = new proto.groupCtor();
    group.name = 'OUTCOME aura';
    group.userData.__outcomeAura = true;
    const primary = new proto.meshCtor(geometry, auraMaterial(proto, CFG.aura.color, false));
    primary.frustumCulled = false; primary.renderOrder = CFG.chamOrder - 2;
    group.add(primary);
    let glow = null;
    if (CFG.aura.glow) {
      glow = new proto.meshCtor(geometry, auraMaterial(proto, CFG.aura.glowColor, true));
      glow.frustumCulled = false; glow.renderOrder = CFG.chamOrder - 3;
      group.add(glow);
    }
    parent.add(group);
    auraState.group = group; auraState.parent = parent; auraState.primary = primary; auraState.glow = glow;
    auraState.geometry = geometry; auraState.materials = [primary.material, glow && glow.material].filter(Boolean);
    auraState.style = CFG.aura.style; auraState.count = Math.floor(CFG.aura.count); auraState.glowEnabled = CFG.aura.glow;
  }
  function tickAura(g, dt) {
    const parent = wingParent(g);
    const active = !!(CFG.aura.enabled && parent && (CFG.misc.tp || tpActive(g)));
    if (!parent) { if (auraState.group) auraState.group.visible = false; return; }
    if (!auraState.group || auraState.parent !== parent || auraState.style !== CFG.aura.style ||
        auraState.count !== Math.floor(CFG.aura.count) || auraState.glowEnabled !== CFG.aura.glow) {
      try { buildAura(g, parent); } catch (e) { return; }
    }
    const group = auraState.group;
    group.visible = active;
    if (!active) return;
    auraState.phase += dt * 4;
    const mode = CFG.aura.style === 'ember' ? 0 : CFG.aura.style === 'orbit' ? 1 : 2;
    for (const shader of auraState.shaders) {
      shader.uniforms.uAuraTime.value = auraState.phase;
      shader.uniforms.uAuraRadius.value = CFG.aura.radius;
      shader.uniforms.uAuraHeight.value = CFG.aura.height;
      shader.uniforms.uAuraSize.value = CFG.aura.size * (shader.__auraGlow ? CFG.aura.glowScale : 1);
      shader.uniforms.uAuraSpeed.value = CFG.aura.speed;
      shader.uniforms.uAuraRise.value = CFG.aura.rise;
      shader.uniforms.uAuraOrbit.value = CFG.aura.orbit;
      shader.uniforms.uAuraMode.value = mode;
    }
    for (const m of auraState.materials) {
      m.opacity = m.userData.__outcomeAuraGlow ? Math.min(0.22, CFG.aura.opacity * 0.28) : CFG.aura.opacity;
      if (m.color) m.color.set(m.userData.__outcomeAuraGlow ? CFG.aura.glowColor : CFG.aura.color);
      if (m.emissive) m.emissive.set(m.userData.__outcomeAuraGlow ? CFG.aura.glowColor : CFG.aura.color);
    }
  }

  /* ---------------- silent aim ---------------- */
  let saLock = null;

  const NO_AIM_CLASSES = { grenade: 1, knife: 1, zeus: 1, c4: 1 };

  /* aim point on the target capsule for the selected hit part */
  function aimY(e) {
    const h = e.height || 1.8288;
    switch (CFG.sa.hitPart) {
      case 'head':    return e.y + h - 0.1;
      case 'stomach': return e.y + h * 0.5;
      case 'legs':    return e.y + h * 0.25;
      default:        return e.y + h * 0.72;   // chest
    }
  }

  /* pick best enemy inside FOV cone. returns null if none / gated. */
  function pickTarget(g, ox, oy, oz, rx, ry, rz) {
    if (!CFG.sa.on) return null;
    const me = g.player;
    const fov = CFG.sa.fov;
    let best = null, bestAng = fov;
    for (const e of g.allEntities()) {
      if (e === me || !e.alive || e.team === me.team) continue;
      if (e.isPlayer && e.spawnProt > 0) continue;
      const tx = e.x, tz = e.z;
      const ty = aimY(e);
      let dx = tx - ox, dy = ty - oy, dz = tz - oz;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 250 || dist < 0.5) continue;
      let dot = (dx * rx + dy * ry + dz * rz) / dist;
      if (dot > 1) dot = 1;
      if (dot <= 0) continue;
      const ang = Math.acos(dot) * 180 / Math.PI;
      if (ang > bestAng) continue;
      const los = !!g.physics.lineClear(ox, oy, oz, tx, ty, tz);
      if (!los && CFG.sa.wallCheck && !CFG.sa.wallbang) continue;
      bestAng = ang;
      best = { ent: e, ang: ang, los: los, tx: tx, ty: ty, tz: tz, dist: dist };
    }
    return best;
  }

  /* per-frame lock used for the target line */
  function frameAim(g) {
    saLock = null;
    if (!CFG.sa.on || !g.player || !g.player.alive) return;
    const p = g.player;
    const cp = Math.cos(p.pitch);
    saLock = pickTarget(
      g,
      p.x, p.y + p.eyeH, p.z,
      -Math.sin(p.yaw) * cp, Math.sin(p.pitch), -Math.cos(p.yaw) * cp
    );
  }

  /* wrap fireBullet: redirect the shot vector at the locked target.
     wallbang: raises penetration, blinds physics.raycast for the shot so
     the entity sweep runs through the wall — and counts dealDamage calls
     on the locked target; if the engine path failed to land, damage is
     applied directly (stat dmg * falloff * head mult) with hitmarker,
     blood and hit sound. damage always lands. */
  function hookFire(g) {
    if (g.__oFBHooked) return;
    const orig = g.fireBullet;
    if (typeof orig !== 'function') return;
    g.__oFBHooked = true;
    g.fireBullet = function (shooter, t, n, r, i, a, o, s) {
      let penSet = false, pen = null;
      let blind = false;
      let wbEnt = null, wbHead = false, wbRegion = 'chest', wbDist = 0;
      let wbHits = 0;
      const ddOrig = this.dealDamage;
      if (shooter === this.player && CFG.sa.on && s &&
          !NO_AIM_CLASSES[s.class || '']) {
        const lock = pickTarget(this, t, n, r, i, a, o);
        if (lock) {
          i = (lock.tx - t) / lock.dist;
          a = (lock.ty - n) / lock.dist;
          o = (lock.tz - r) / lock.dist;
          if (CFG.sa.wallbang) {
            pen = s.penetration;
            penSet = true;
            s.penetration = 1;
            blind = !lock.los;
            if (blind) {
              wbEnt = lock.ent;
              wbHead = CFG.sa.hitPart === 'head';
              wbRegion = wbHead ? 'head'
                : CFG.sa.hitPart === 'stomach' ? 'stomach'
                : CFG.sa.hitPart === 'legs' ? 'legs' : 'chest';
              wbDist = lock.dist;
              this.dealDamage = function (ent) {
                if (ent === wbEnt) wbHits++;
                return ddOrig.apply(this, arguments);
              };
            }
          }
        }
      }
      const phys = this.physics;
      let raySaved = false, rayOrig = null;
      if (blind && phys && phys.raycast) {
        rayOrig = phys.raycast;
        phys.raycast = function () { return null; };
        raySaved = true;
      }
      let ret;
      try {
        ret = orig.call(this, shooter, t, n, r, i, a, o, s);
      } finally {
        if (penSet) s.penetration = pen;
        if (raySaved) phys.raycast = rayOrig;
        if (wbEnt) this.dealDamage = ddOrig;
      }
      if (wbEnt && wbHits === 0 && wbEnt.alive) {
        const fall = Math.pow(s.rangeMod != null ? s.rangeMod : 1, wbDist / 500);
        let dmg = (s.dmg != null ? s.dmg : 20) * fall;
        if (wbHead) dmg *= s.hs != null ? s.hs : 4;
        wbEnt._hitDir = { x: i, y: a, z: o };
        try {
          this.dealDamage(wbEnt, dmg, shooter, wbHead, s, wbRegion, 0, true);
          const bh = wbEnt.height || 1.8288;
          const by = (wbEnt._visY != null ? wbEnt._visY : wbEnt.y) +
            (wbHead ? bh - 0.1
              : bh * (wbRegion === 'legs' ? 0.25
                : wbRegion === 'stomach' ? 0.5 : 0.72));
          if (shooter === this.player && this.hud && this.hud.hitmarker)
            this.hud.hitmarker(wbHead);
          if (shooter === this.player && this.audio && this.audio.play) {
            const snd = wbHead
              ? (wbEnt.helmet ? 'hit_head_dink' : 'hit_head')
              : (wbEnt.armor > 0 ? 'hit_armor_fb' : 'hit_body_fb');
            this.audio.play(snd);
          }
          if (this.effects && this.effects.blood)
            this.effects.blood(wbEnt.x, by, wbEnt.z, i, a, o, wbHead);
        } catch (e) {}
      }
      return ret;
    };
  }

  /* ---------------- FPV drone ---------------- */
  function droneBoxGeometry(proto, sx, sy, sz) {
    const x = sx / 2, y = sy / 2, z = sz / 2;
    const faces = [
      [[0, 0, -1], [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z]]],
      [[0, 0, 1], [[x, -y, z], [-x, -y, z], [-x, y, z], [x, y, z]]],
      [[0, 1, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]],
      [[0, -1, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]],
      [[1, 0, 0], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]],
      [[-1, 0, 0], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]]
    ];
    const positions = [], normals = [], uvs = [], indices = [];
    faces.forEach((face, faceIndex) => {
      face[1].forEach((vertex, i) => {
        positions.push(vertex[0], vertex[1], vertex[2]);
        normals.push(face[0][0], face[0][1], face[0][2]);
        uvs.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
      });
      const base = faceIndex * 4;
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    const geometry = new proto.geometryCtor();
    geometry.setAttribute('position', new proto.attributeCtor(new Float32Array(positions), 3));
    geometry.setAttribute('normal', new proto.attributeCtor(new Float32Array(normals), 3));
    geometry.setAttribute('uv', new proto.attributeCtor(new Float32Array(uvs), 2));
    if (geometry.setIndex) geometry.setIndex(indices);
    if (geometry.computeBoundingSphere) geometry.computeBoundingSphere();
    return geometry;
  }
  function droneMaterial(proto, color, emissive, intensity, roughness, metalness) {
    const material = new proto.materialCtor();
    if (material.color) material.color.set(color);
    if (material.emissive) {
      material.emissive.set(emissive || color);
      material.emissiveIntensity = intensity == null ? 1 : intensity;
    }
    if ('roughness' in material) material.roughness = roughness == null ? 0.48 : roughness;
    if ('metalness' in material) material.metalness = metalness == null ? 0.25 : metalness;
    if ('toneMapped' in material) material.toneMapped = false;
    return material;
  }
  function buildDrone(g) {
    const proto = getTpPrototypes(g);

    if (!g.camera || !g.camera.isPerspectiveCamera) {
      throw new Error('FPV camera unavailable');
    }

    const root = new proto.groupCtor();
    root.name = 'OUTCOME FPV drone';

    const carbonMat = droneMaterial(proto, '#1a1a1a', '#000000', 0.0, 0.8, 0.2);
    const tpuMat = droneMaterial(proto, '#00e5ff', '#004455', 0.2, 0.6, 0.1);
    const motorMat = droneMaterial(proto, '#333333', '#000000', 0.0, 0.4, 0.8);
    const propMat = droneMaterial(proto, '#ff0055', '#ff0055', 1.2, 0.3, 0.1);
    const lensMat = droneMaterial(proto, '#111111', '#00aaff', 2.0, 0.1, 0.9);
    const batteryMat = droneMaterial(proto, '#0a0a0a', '#000000', 0.0, 0.7, 0.1);

    const addBox = (sx, sy, sz, x, y, z, material) => {
      const mesh = new proto.meshCtor(
        droneBoxGeometry(proto, sx, sy, sz),
        material
      );
      mesh.position.set(x, y, z);
      mesh.frustumCulled = false;
      root.add(mesh);
      return mesh;
    };

    const bottomPlate = addBox(0.14, 0.01, 0.35, 0, -0.02, 0, carbonMat);
    bottomPlate.castShadow = true;
    addBox(0.12, 0.01, 0.25, 0, 0.04, -0.02, carbonMat);

    addBox(0.015, 0.05, 0.015, 0.05, 0.01, -0.12, tpuMat);
    addBox(0.015, 0.05, 0.015, -0.05, 0.01, -0.12, tpuMat);
    addBox(0.015, 0.05, 0.015, 0.05, 0.01, 0.08, tpuMat);
    addBox(0.015, 0.05, 0.015, -0.05, 0.01, 0.08, tpuMat);

    addBox(0.38, 0.012, 0.04, 0, -0.02, -0.18, carbonMat);
    addBox(0.38, 0.012, 0.04, 0, -0.02, 0.18, carbonMat);
    addBox(0.07, 0.05, 0.14, 0, 0.07, 0.02, batteryMat);

    addBox(0.05, 0.05, 0.04, 0, 0.015, -0.16, tpuMat);
    addBox(0.025, 0.025, 0.01, 0, 0.015, -0.185, lensMat);

    const gopro = addBox(0.08, 0.06, 0.04, 0, 0.09, -0.10, tpuMat);
    gopro.rotation.x = -0.25;

    const rotors = [];
    const bladeGeo = droneBoxGeometry(proto, 0.32, 0.005, 0.025);
    const motorPositions = [
      { x: 0.17, z: -0.18, spin: -1 },
      { x: -0.17, z: -0.18, spin: 1 },
      { x: 0.17, z: 0.18, spin: 1 },
      { x: -0.17, z: 0.18, spin: -1 }
    ];

    motorPositions.forEach(pos => {
      addBox(0.05, 0.035, 0.05, pos.x, 0.005, pos.z, motorMat);

      const rotor = new proto.groupCtor();
      rotor.userData.spin = pos.spin;
      rotor.position.set(pos.x, 0.03, pos.z);

      const bladeA = new proto.meshCtor(bladeGeo, propMat);
      const bladeB = new proto.meshCtor(bladeGeo, propMat);
      bladeB.rotation.y = Math.PI / 2;
      bladeA.frustumCulled = false;
      bladeB.frustumCulled = false;

      rotor.add(bladeA);
      rotor.add(bladeB);
      root.add(rotor);
      rotors.push(rotor);
    });

    g.scene.add(root);
    droneState.group = root;
    droneState.rotors = rotors;

    droneState.camera = new g.camera.constructor(
      CFG.drone.fov,
      16 / 9,
      0.03,
      500
    );
    droneState.camera.name = 'OUTCOME FPV camera';
    return root;
  }

  function disposeDroneGroup(group) {
    if (!group) return;
    const geometries = new Set(), materials = new Set();
    group.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const material of list) materials.add(material);
      }
    });
    if (group.parent) group.parent.remove(group);
    for (const geometry of geometries) if (geometry.dispose) geometry.dispose();
    for (const material of materials) if (material.dispose) material.dispose();
  }
  function stopDroneSound() {
    const sound = droneState.sound;
    droneState.sound = null;
    if (!sound) return;
    try {
      const now = sound.ctx.currentTime;
      sound.master.gain.cancelScheduledValues(now);
      sound.master.gain.setValueAtTime(sound.master.gain.value, now);
      sound.master.gain.linearRampToValueAtTime(0, now + 0.08);
      for (const oscillator of sound.oscillators) oscillator.stop(now + 0.1);
    } catch (e) {}
  }
  function startDroneSound(g) {
    if (!CFG.drone.sound || CFG.drone.volume <= 0) return;
    const begin = () => {
      if (!droneState.active || !CFG.drone.sound || droneState.sound) return;
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      const ctx = g.audio && g.audio.ctx || (AudioCtor ? new AudioCtor() : null);
      if (!ctx) return;
      const master = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const a = ctx.createOscillator();
      const b = ctx.createOscillator();
      const now = ctx.currentTime;
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(CFG.drone.volume, now + 0.06);
      filter.type = 'lowpass'; filter.frequency.value = 1250; filter.Q.value = 0.7;
      a.type = 'sawtooth'; a.frequency.value = 92 + droneState.speed * 1.7;
      b.type = 'square'; b.frequency.value = 46 + droneState.speed * 0.8; b.detune.value = 7;
      lfo.type = 'sine'; lfo.frequency.value = 18; lfoGain.gain.value = 260;
      lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
      a.connect(filter); b.connect(filter); filter.connect(master); master.connect(ctx.destination);
      a.start(now); b.start(now); lfo.start(now);
      if (ctx.resume) ctx.resume().catch(() => {});
      droneState.sound = { ctx, master, oscillators: [a, b, lfo] };
    };
    if (g.audio && g.audio.ctx) begin();
    else if (g.audio && typeof g.audio.init === 'function') g.audio.init().then(begin).catch(() => {});
    else begin();
  }
  function stopDrone() {
    stopDroneSound();
    droneState.active = false;
    disposeDroneGroup(droneState.group);
    droneState.group = null;
    droneState.camera = null;
    droneState.rotors = [];
    droneState.previewTime = 0;
    droneState.previewTarget = null;
    droneState.vel.x = 0; droneState.vel.y = 0; droneState.vel.z = 0;
    droneState.speed = 0;
    droneState.bank = 0;
    droneState.boost = 0;
    droneState.airBrake = false;
    droneState.battery = 1;
  }

  function findDroneBodyHit(g, ox, oy, oz, dx, dy, dz, distance) {
    let best = null, bestT = Infinity;
    for (const entity of g.allEntities()) {
      if (entity === g.player || !entity.alive || entity.team === g.player.team) continue;
      const height = entity.height || 1.8288;
      const baseY = entity._visY != null ? entity._visY : entity.y;
      const cx = entity.x, cy = baseY + height * 0.55, cz = entity.z;
      const t = Math.max(0, Math.min(1,
        ((cx - ox) * dx + (cy - oy) * dy + (cz - oz) * dz) / Math.max(1e-8, distance * distance)));
      const px = ox + dx * distance * t, py = oy + dy * distance * t, pz = oz + dz * distance * t;
      const radius = (entity.radius || 0.4064) + 0.34;
      const missX = px - cx, missY = py - cy, missZ = pz - cz;
      if (missX * missX + missY * missY + missZ * missZ <= radius * radius && t < bestT) {
        bestT = t;
        best = { entity, t };
      }
    }
    return best;
  }
  function detonateExplosive(g, point, directTarget, blastRadius) {
    stopDroneSound();
    const player = g.player;
    const weapon = g.weapons && g.weapons.def && g.weapons.def() || { class: 'rifle', armorPen: 0.6 };
    let previewTarget = null, previewDistance = Infinity;
    try { if (g.effects && g.effects.explosion) g.effects.explosion(point.x, point.y, point.z); } catch (e) {}
    try { if (g.effects && g.effects.flashLight) g.effects.flashLight(point.x, point.y + 0.8, point.z, 0xffa040, 40, 0.35); } catch (e) {}
    try { if (g.audio && g.audio.play) g.audio.play('explosion', { pos: point }); } catch (e) {}
    try { if (g.noise) g.noise(60, point.x, point.z); } catch (e) {}
    const radius = Math.max(0.5, blastRadius == null ? CFG.drone.blastRadius : blastRadius);
    for (const entity of g.allEntities()) {
      if (!entity.alive || entity === player || entity.team === player.team) continue;
      const height = entity.height || 1.8288;
      const baseY = entity._visY != null ? entity._visY : entity.y;
      const ex = entity.x, ey = baseY + height * 0.5, ez = entity.z;
      const distance = Math.hypot(ex - point.x, ey - point.y, ez - point.z);
      if (distance > radius) continue;
      if (entity === directTarget || distance < previewDistance) {
        previewTarget = entity;
        previewDistance = distance;
      }
      if (entity.isPlayer) entity.spawnProt = 0;
      try {
        g.dealDamage(entity, 100000, player, false, weapon, 'chest', 0, true);
      } catch (e) {}
      if (entity.alive) {
        entity.health = 0;
        if (typeof g.killEntity === 'function') {
          try { g.killEntity(entity, player, weapon, false, 'chest', true); } catch (e) { entity.alive = false; }
        } else {
          entity.alive = false;
        }
      }
    }
    if (g.hud && g.hud.hitmarker) g.hud.hitmarker(false);
    return previewTarget;
  }

  function updateDroneCamera() {
    const camera = droneState.camera;
    const group = droneState.group;
    if (!camera || !group) return;

    const targetFov =
      CFG.drone.fov +
      Math.min(7, Math.max(0, droneState.speed - CFG.drone.speed) * 0.8) +
      droneState.boost * 3;

    camera.fov += (targetFov - camera.fov) * 0.12;
    camera.near = 0.01;
    camera.far = 500;

    group.updateMatrixWorld(true);
    camera.position.set(0, 0.14, -0.05);
    group.localToWorld(camera.position);
    camera.quaternion.copy(group.quaternion);
    camera.rotateX(-0.15);

    if (camera.updateProjectionMatrix) camera.updateProjectionMatrix();
  }
  function startDronePreview(g, point, target) {
    const duration = Math.max(0, CFG.drone.previewTime);
    if (duration <= 0 || !droneState.camera) { stopDrone(); return; }
    droneState.previewTime = duration;
    droneState.previewTarget = target || null;
    droneState.previewPoint.x = point.x;
    droneState.previewPoint.y = point.y;
    droneState.previewPoint.z = point.z;
    if (droneState.group) droneState.group.visible = false;
    updateDronePreview(0);
  }
  function updateDronePreview(dt) {
    const target = droneState.previewTarget;
    const point = droneState.previewPoint;
    if (target) {
      const h = target.height || 1.8288;
      const baseY = target._visY != null ? target._visY : target.y;
      point.x = target.x; point.y = baseY + h * 0.52; point.z = target.z;
    }
    const camera = droneState.camera;
    if (!camera) return;
    const elapsed = Math.max(0, CFG.drone.previewTime - droneState.previewTime);
    const angle = 0.65 + elapsed * 0.8;
    const distance = 3.15;
    camera.position.set(
      point.x + Math.cos(angle) * distance,
      point.y + 1.05,
      point.z + Math.sin(angle) * distance
    );
    camera.lookAt(point.x, point.y, point.z);
    if (droneState.group) droneState.group.visible = false;
  }
  function launchDrone(g) {
    if (!CFG.drone.enabled || menuOpen || droneState.active || droneCooldown > 0 ||
        !g || g.state !== 'playing' || !g.player || !g.player.alive || !g.scene || !g.camera) return;
    if (helicopterState.active) stopHelicopter(g);
    const p = g.player;
    const cp = Math.cos(p.pitch || 0);
    const dx = -Math.sin(p.yaw) * cp, dy = Math.sin(p.pitch || 0), dz = -Math.cos(p.yaw) * cp;
    stopDrone();
    try { buildDrone(g); } catch (e) { stopDrone(); return; }
    droneState.active = true;
    droneState.speed = CFG.drone.speed;
    droneState.age = 0;
    droneState.bank = 0;
    droneState.boost = 0;
    droneState.airBrake = false;
    droneState.battery = 1;
    droneState.dir.x = dx; droneState.dir.y = dy; droneState.dir.z = dz;
    droneState.vel.x = dx * CFG.drone.speed;
    droneState.vel.y = dy * CFG.drone.speed;
    droneState.vel.z = dz * CFG.drone.speed;
    droneState.pos.x = p.x + dx * 0.65;
    droneState.pos.y = p.y + p.eyeH + dy * 0.65;
    droneState.pos.z = p.z + dz * 0.65;
    Object.assign(droneState.prev, droneState.pos);
    droneState.group.position.set(droneState.pos.x, droneState.pos.y, droneState.pos.z);
    droneState.group.lookAt(droneState.pos.x - dx, droneState.pos.y - dy, droneState.pos.z - dz);
    updateDroneCamera();
    droneCooldown = 0.25;
    startDroneSound(g);
  }
  function tickDrone(g, dt) {
    if (droneCooldown > 0) droneCooldown = Math.max(0, droneCooldown - dt);
    if (!droneState.active) return;
    if (droneState.previewTime > 0) {
      if (!CFG.drone.enabled || !g.player || !g.player.alive) { stopDrone(); return; }
      droneState.previewTime = Math.max(0, droneState.previewTime - dt);
      updateDronePreview(dt);
      if (droneState.previewTime <= 0) stopDrone();
      return;
    }
    if (!CFG.drone.enabled || g.state !== 'playing' || !g.player || !g.player.alive) {
      stopDrone();
      return;
    }

    const step = Math.min(0.05, Math.max(0, dt));
    droneState.age += step;
    const life = Math.max(0.1, CFG.drone.life);
    if (droneState.age >= life) {
      const point = { x: droneState.pos.x, y: droneState.pos.y, z: droneState.pos.z };
      const target = detonateExplosive(g, point, null, CFG.drone.blastRadius);
      if (target) startDronePreview(g, point, target);
      else stopDrone();
      return;
    }

    const p = g.player;
    const d = droneState.dir;
    const yaw = p.yaw || 0;
    const pitch = p.pitch || 0;
    const cp = Math.cos(pitch);
    const aimX = -Math.sin(yaw) * cp;
    const aimY = Math.sin(pitch);
    const aimZ = -Math.cos(yaw) * cp;
    const aimAlpha = 1 - Math.exp(-step * 18);
    d.x += (aimX - d.x) * aimAlpha;
    d.y += (aimY - d.y) * aimAlpha;
    d.z += (aimZ - d.z) * aimAlpha;
    const aimLength = Math.hypot(d.x, d.y, d.z) || 1;
    d.x /= aimLength; d.y /= aimLength; d.z /= aimLength;

    const forwardInput = (heldCodes.has('KeyW') ? 1 : 0) - (heldCodes.has('KeyS') ? 1 : 0);
    const strafeInput = (heldCodes.has('KeyD') ? 1 : 0) - (heldCodes.has('KeyA') ? 1 : 0);
    const liftInput = (heldCodes.has('Space') ? 1 : 0) - (heldCodes.has('ShiftLeft') ? 1 : 0);
    const boostInput = heldCodes.has('AltLeft') || heldCodes.has('AltRight') || heldCodes.has('KeyV');
    const airBrake = heldCodes.has('KeyC') || heldCodes.has('ControlLeft');
    droneState.airBrake = airBrake;
    droneState.boost += ((boostInput ? 1 : 0) - droneState.boost) *
      (1 - Math.exp(-step * (boostInput ? 5 : 3)));

    const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
    let moveX = 0, moveY = 0, moveZ = 0;
    if (forwardInput || strafeInput || liftInput) {
      moveX = d.x * forwardInput + rightX * strafeInput;
      moveY = d.y * forwardInput + liftInput;
      moveZ = d.z * forwardInput + rightZ * strafeInput;
      const inputLength = Math.hypot(moveX, moveY, moveZ);
      if (inputLength > 1e-6) { moveX /= inputLength; moveY /= inputLength; moveZ /= inputLength; }
    } else if (boostInput) {
      moveX = d.x;
      moveY = d.y;
      moveZ = d.z;
    }

    const batteryFactor = droneState.battery < 0.4
      ? 0.55 + 0.45 * Math.max(0, droneState.battery / 0.4)
      : 1;
    const targetSpeed = airBrake ? 0 :
      CFG.drone.speed * (1 + droneState.boost * 0.85) * batteryFactor;
    const targetVelX = moveX * targetSpeed;
    const targetVelY = moveY * targetSpeed;
    const targetVelZ = moveZ * targetSpeed;
    const hasInput = !!(forwardInput || strafeInput || liftInput || boostInput);
    const response = airBrake ? 10 : hasInput ? (boostInput ? 4.5 : 5.8) : 2.8;
    const velocityAlpha = 1 - Math.exp(-step * response);
    droneState.vel.x += (targetVelX - droneState.vel.x) * velocityAlpha;
    droneState.vel.y += (targetVelY - droneState.vel.y) * velocityAlpha;
    droneState.vel.z += (targetVelZ - droneState.vel.z) * velocityAlpha;
    droneState.speed = Math.hypot(droneState.vel.x, droneState.vel.y, droneState.vel.z);

    const lateralSpeed = droneState.vel.x * rightX + droneState.vel.z * rightZ;
    const bankTarget = Math.max(-0.42, Math.min(0.42,
      -lateralSpeed / Math.max(1, CFG.drone.speed) * 0.34));
    droneState.bank += (bankTarget - droneState.bank) * (1 - Math.exp(-step * 6));

    const effort = (forwardInput || strafeInput || liftInput ? 0.04 : 0) +
      (boostInput ? 0.22 : 0) + (airBrake ? 0.02 : 0);
    droneState.battery = Math.max(0, droneState.battery - step * (0.14 + effort));

    Object.assign(droneState.prev, droneState.pos);
    droneState.pos.x += droneState.vel.x * step;
    droneState.pos.y += droneState.vel.y * step;
    droneState.pos.z += droneState.vel.z * step;
    const moveDistance = Math.hypot(droneState.vel.x, droneState.vel.y, droneState.vel.z) * step;
    const moveXFrame = moveDistance > 1e-6 ? droneState.vel.x / droneState.speed : 0;
    const moveYFrame = moveDistance > 1e-6 ? droneState.vel.y / droneState.speed : 0;
    const moveZFrame = moveDistance > 1e-6 ? droneState.vel.z / droneState.speed : 0;
    if (moveDistance > 1e-6) {
      const bodyHit = findDroneBodyHit(g, droneState.prev.x, droneState.prev.y, droneState.prev.z,
        moveXFrame, moveYFrame, moveZFrame, moveDistance);
      let wallT = Infinity;
      if (g.physics && g.physics.raycast) {
        try {
          const wall = g.physics.raycast(droneState.prev.x, droneState.prev.y, droneState.prev.z,
            moveXFrame, moveYFrame, moveZFrame, moveDistance);
          if (wall && wall.t != null) wallT = Math.max(0, wall.t);
        } catch (e) {}
      }
      const hit = bodyHit && (!isFinite(wallT) || bodyHit.t <= wallT) ? bodyHit : null;
      const travel = hit ? hit.t * moveDistance : (isFinite(wallT) ? wallT * moveDistance : moveDistance);
      const point = {
        x: droneState.prev.x + moveXFrame * travel,
        y: droneState.prev.y + moveYFrame * travel,
        z: droneState.prev.z + moveZFrame * travel
      };
      if (hit || isFinite(wallT)) {
        droneState.group.position.set(point.x, point.y, point.z);
        const directTarget = hit && hit.entity;
        const target = detonateExplosive(g, point, directTarget, CFG.drone.blastRadius);
        if (target) startDronePreview(g, point, target);
        else stopDrone();
        return;
      }
    }
    droneState.group.position.set(droneState.pos.x, droneState.pos.y, droneState.pos.z);
    droneState.group.lookAt(droneState.pos.x - d.x, droneState.pos.y - d.y, droneState.pos.z - d.z);
    if (droneState.group.rotateZ) droneState.group.rotateZ(droneState.bank);
    updateDroneCamera();
    for (const rotor of droneState.rotors) {
      rotor.rotation.y += step * (42 + droneState.speed * 3.2 + droneState.boost * 44) *
        (rotor.userData.spin || 1);
    }
  }

  /* ---------------- client-side tactical helicopter ---------------- */
  function helicopterMaterial(proto, color, emissive, intensity, roughness, metalness) {
    return droneMaterial(proto, color, emissive || color, intensity == null ? 1 : intensity, roughness, metalness);
  }

  function helicopterFxMaterial(proto, color, opacity) {
    const material = helicopterMaterial(proto, color, color, 1.4, 0.42, 0.15);
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
    material.blending = 2;
    if ('side' in material) material.side = 2;
    return material;
  }

  function helicopterRingGeometry(proto, segments) {
    const positions = [], normals = [], uvs = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const c = Math.cos(angle), s = Math.sin(angle);
      positions.push(c * 0.76, 0, s * 0.76, c, 0, s);
      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(i / segments, 0, i / segments, 1);
      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 3, base, base + 3, base + 2);
      }
    }
    const geometry = new proto.geometryCtor();
    geometry.setAttribute('position', new proto.attributeCtor(new Float32Array(positions), 3));
    geometry.setAttribute('normal', new proto.attributeCtor(new Float32Array(normals), 3));
    geometry.setAttribute('uv', new proto.attributeCtor(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    if (geometry.computeBoundingSphere) geometry.computeBoundingSphere();
    return geometry;
  }


  function buildHelicopter(g) {
    const proto = getTpPrototypes(g);
    if (!g.camera || !g.camera.isPerspectiveCamera) throw new Error('Helicopter camera unavailable');
    const root = new proto.groupCtor();
    root.name = 'OUTCOME attack helicopter';
    root.visible = true;
    root.userData.__outcomeHelicopter = true;
    if ('rotation' in root && root.rotation && 'order' in root.rotation) root.rotation.order = 'YXZ';
    const hull = new proto.groupCtor();
    root.add(hull);
    helicopterState.hull = hull;

    const armorMat = helicopterMaterial(proto, '#344652', '#071016', 0.2, 0.72, 0.68);
    const darkMat = helicopterMaterial(proto, '#10171b', '#020304', 0.05, 0.9, 0.3);
    const steelMat = helicopterMaterial(proto, '#91a3aa', '#0a1013', 0.1, 0.38, 0.88);
    const canopyMat = helicopterMaterial(proto, '#173b4a', '#0a9cb8', 0.42, 0.12, 0.55);
    const accentMat = helicopterMaterial(proto, '#25e0ed', '#0a8894', 1.8, 0.28, 0.35);
    const warningMat = helicopterMaterial(proto, '#ffb229', '#ff5a00', 0.9, 0.4, 0.25);
    const lensMat = helicopterMaterial(proto, '#d8fbff', '#00d9ff', 2.8, 0.1, 0.3);
    const flashMat = helicopterMaterial(proto, '#fff0b0', '#ff6a00', 4.2, 0.08, 0.05);

    const addBox = (parent, sx, sy, sz, x, y, z, material) => {
      const mesh = new proto.meshCtor(droneBoxGeometry(proto, sx, sy, sz), material);
      mesh.position.set(x, y, z);
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    addBox(hull, 1.82, 0.82, 2.45, 0, 0, -0.1, armorMat);
    addBox(hull, 1.46, 0.62, 1.1, 0, -0.03, -1.65, armorMat);
    addBox(hull, 1.5, 0.08, 0.82, 0, 0.43, -0.76, steelMat);
    addBox(hull, 1.34, 0.42, 0.72, 0, 0.25, -0.82, canopyMat);
    addBox(hull, 0.09, 0.46, 0.74, 0, 0.25, -0.82, steelMat);
    addBox(hull, 1.82, 0.18, 0.7, 0, -0.3, -0.35, darkMat);
    addBox(hull, 0.46, 0.4, 2.85, 0, 0.13, 2.08, armorMat);
    addBox(hull, 0.7, 0.18, 0.7, 0, 0.29, 3.18, armorMat);
    addBox(hull, 0.14, 1.18, 0.72, 0, 0.66, 3.36, darkMat);
    addBox(hull, 1.82, 0.1, 0.54, 0, 0.32, 2.76, steelMat);
    addBox(hull, 0.5, 0.08, 0.16, 0, 1.25, 3.22, accentMat);

    for (const side of [-1, 1]) {
      addBox(hull, 0.09, 0.09, 2.75, side * 0.88, -0.67, 0.12, steelMat);
      addBox(hull, 0.08, 0.58, 0.08, side * 0.88, -0.43, -0.75, steelMat);
      addBox(hull, 0.08, 0.58, 0.08, side * 0.88, -0.43, 0.82, steelMat);
      addBox(hull, 0.12, 0.15, 0.32, side * 1.01, 0.03, -0.86, warningMat);
      addBox(hull, 0.1, 0.1, 0.26, side * 1.01, 0.03, 0.7, accentMat);
      addBox(hull, 0.28, 0.42, 0.44, side * 0.97, 0.12, 0.15, darkMat);
    }

    const rotorMast = addBox(hull, 0.24, 0.58, 0.24, 0, 1.05, -0.02, steelMat);
    rotorMast.rotation.x = 0.06;
    const mainRotor = new proto.groupCtor();
    mainRotor.position.set(0, 1.38, -0.02);
    mainRotor.userData.spin = 1;
    hull.add(mainRotor);
    helicopterState.mainRotor = mainRotor;
    addBox(mainRotor, 9.2, 0.045, 0.2, 0, 0, 0, darkMat);
    addBox(mainRotor, 0.2, 0.045, 9.2, 0, 0.01, 0, darkMat);
    addBox(mainRotor, 0.5, 0.12, 0.5, 0, 0.02, 0, steelMat);
    const counterRotor = new proto.groupCtor();
    counterRotor.position.y = 0.18;
    counterRotor.userData.spin = -1.35;
    mainRotor.add(counterRotor);
    addBox(counterRotor, 7.6, 0.04, 0.16, 0, 0, 0, steelMat);
    addBox(counterRotor, 0.16, 0.04, 7.6, 0, 0, 0, steelMat);

    const tailRotor = new proto.groupCtor();
    tailRotor.position.set(0.28, 0.7, 3.38);
    hull.add(tailRotor);
    helicopterState.tailRotor = tailRotor;
    addBox(tailRotor, 0.08, 1.32, 0.16, 0, 0, 0, accentMat);
    addBox(tailRotor, 0.08, 0.16, 1.32, 0, 0, 0, accentMat);
    addBox(tailRotor, 0.16, 0.28, 0.28, 0, 0, 0, steelMat);

    const gunMount = new proto.groupCtor();
    gunMount.position.set(0, -0.68, -0.3);
    hull.add(gunMount);
    helicopterState.gunMount = gunMount;
    addBox(gunMount, 0.72, 0.18, 0.76, 0, 0, 0, darkMat);
    for (const x of [-0.22, 0.22]) {
      for (const z of [-0.22, 0.22]) addBox(gunMount, 0.19, 0.22, 0.19, x, -0.13, z, steelMat);
    }
    addBox(gunMount, 0.16, 0.16, 0.16, 0, -0.28, 0, lensMat);
    const launchFlash = addBox(gunMount, 0.58, 0.12, 0.58, 0, -0.28, 0, flashMat);
    launchFlash.visible = false;
    helicopterState.launchFlash = launchFlash;

    const effectsGroup = new proto.groupCtor();
    effectsGroup.name = 'OUTCOME helicopter effects';
    g.scene.add(effectsGroup);
    const tracerMat = helicopterFxMaterial(proto, '#ffc36b', 0.9);
    const sparkMat = helicopterFxMaterial(proto, '#ff702d', 0.96);
    const smokeMat = helicopterFxMaterial(proto, '#9ba8b0', 0.24);
    const ringMat = helicopterFxMaterial(proto, '#ffb347', 0.78);
    const missileMat = helicopterMaterial(proto, '#d7e0e3', '#233038', 0.08, 0.46, 0.7);
    const flameMat = helicopterFxMaterial(proto, '#ff9c35', 0.92);
    helicopterState.tracerMat = tracerMat;
    helicopterState.sparkMat = sparkMat;
    helicopterState.smokeMat = smokeMat;
    helicopterState.ringMat = ringMat;
    helicopterState.missileMat = missileMat;
    helicopterState.flameMat = flameMat;
    helicopterState.fxGeometry = droneBoxGeometry(proto, 0.1, 0.1, 0.1);
    helicopterState.ringGeometry = helicopterRingGeometry(proto, 40);
    helicopterState.fxMaterials = [tracerMat, sparkMat, smokeMat, ringMat, missileMat, flameMat];
    helicopterState.effectsGroup = effectsGroup;
    helicopterState.group = root;
    helicopterState.proto = proto;
    g.scene.add(root);
    if (helicopterCustom.asset) attachHelicopterCustomModel(g);
    helicopterState.camera = new g.camera.constructor(CFG.helicopter.fov, 16 / 9, 0.05, 500);
    helicopterState.camera.name = 'OUTCOME helicopter chase camera';
    helicopterState.gunCamera = new g.camera.constructor(CFG.helicopter.fov, 16 / 9, 0.03, 500);
    helicopterState.gunCamera.name = 'OUTCOME helicopter downward camera';
    return root;
  }


  function disposeHelicopterObject(root) {
    if (!root) return;
    const geometries = new Set(), materials = new Set();
    root.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const material of list) materials.add(material);
      }
    });
    if (root.parent) root.parent.remove(root);
    for (const geometry of geometries) if (geometry.dispose) geometry.dispose();
    for (const material of materials) if (material.dispose) material.dispose();
  }

  function stopHelicopterSound() {
    const sound = helicopterState.sound;
    helicopterState.sound = null;
    if (!sound) return;
    try {
      const now = sound.ctx.currentTime;
      sound.master.gain.cancelScheduledValues(now);
      sound.master.gain.setValueAtTime(sound.master.gain.value, now);
      sound.master.gain.linearRampToValueAtTime(0, now + 0.12);
      for (const oscillator of sound.oscillators) oscillator.stop(now + 0.14);
    } catch (e) {}
  }

  function startHelicopterSound(g) {
    if (!CFG.helicopter.sound || CFG.helicopter.volume <= 0 || helicopterState.sound) return;
    const begin = () => {
      if (!helicopterState.active || !helicopterState.occupied || !CFG.helicopter.sound || helicopterState.sound) return;
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      const ctx = g.audio && g.audio.ctx || (AudioCtor ? new AudioCtor() : null);
      if (!ctx) return;
      const master = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const engine = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const now = ctx.currentTime;
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(CFG.helicopter.volume, now + 0.08);
      filter.type = 'lowpass';
      filter.frequency.value = 460;
      filter.Q.value = 0.8;
      engine.type = 'sawtooth';
      sub.type = 'square';
      engine.frequency.value = 48;
      sub.frequency.value = 24;
      engine.connect(filter);
      sub.connect(filter);
      filter.connect(master);
      master.connect(ctx.destination);
      engine.start(now);
      sub.start(now);
      if (ctx.resume) ctx.resume().catch(() => {});
      helicopterState.sound = { ctx, master, oscillators: [engine, sub], engine, sub };
    };
    if (g.audio && g.audio.ctx) begin();
    else if (g.audio && typeof g.audio.init === 'function') g.audio.init().then(begin).catch(() => {});
    else begin();
  }


  function spawnHelicopterTracer(from, to) {
    if (!CFG.helicopter.effects || !helicopterState.effectsGroup ||
        !helicopterState.proto || !helicopterState.fxGeometry) return;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 0.01) return;
    const mesh = new helicopterState.proto.meshCtor(helicopterState.fxGeometry, helicopterState.tracerMat);
    mesh.position.set((from.x + to.x) * 0.5, (from.y + to.y) * 0.5, (from.z + to.z) * 0.5);
    mesh.scale.set(0.45, 0.45, distance);
    mesh.lookAt(to.x, to.y, to.z);
    mesh.frustumCulled = false;
    mesh.renderOrder = 10001;
    helicopterState.effectsGroup.add(mesh);
    helicopterState.tracers.push({ mesh, life: 0.12, maxLife: 0.12 });
  }

  function spawnHelicopterSparks(point, normalX, normalY, normalZ, count) {
    if (!CFG.helicopter.effects || !helicopterState.effectsGroup || !helicopterState.proto) return;
    for (let i = 0; i < count; i++) {
      const mesh = new helicopterState.proto.meshCtor(helicopterState.fxGeometry, helicopterState.sparkMat);
      mesh.position.set(point.x, point.y, point.z);
      mesh.scale.setScalar(0.45 + Math.random() * 1.15);
      mesh.frustumCulled = false;
      mesh.renderOrder = 10002;
      helicopterState.effectsGroup.add(mesh);
      const spread = 3.5 + Math.random() * 9;
      helicopterState.particles.push({
        mesh, life: 0.34 + Math.random() * 0.58, maxLife: 0.92,
        vx: normalX * spread + (Math.random() - 0.5) * 9,
        vy: normalY * spread + (Math.random() - 0.5) * 9,
        vz: normalZ * spread + (Math.random() - 0.5) * 9,
        gravity: 13
      });
    }
  }

  function spawnHelicopterSmoke(point, size, velocity) {
    if (!CFG.helicopter.effects || !helicopterState.effectsGroup || !helicopterState.proto) return;
    const mesh = new helicopterState.proto.meshCtor(helicopterState.fxGeometry, helicopterState.smokeMat);
    mesh.position.set(point.x, point.y, point.z);
    mesh.scale.setScalar(size || 0.6 + Math.random() * 0.6);
    mesh.frustumCulled = false;
    mesh.renderOrder = 9999;
    helicopterState.effectsGroup.add(mesh);
    helicopterState.particles.push({
      mesh, life: 0.7 + Math.random() * 0.8, maxLife: 1.5,
      vx: (velocity ? velocity.x * 0.08 : 0) + (Math.random() - 0.5) * 1.4,
      vy: (velocity ? velocity.y * 0.08 : 0) + 0.45 + Math.random() * 1.1,
      vz: (velocity ? velocity.z * 0.08 : 0) + (Math.random() - 0.5) * 1.4,
      gravity: -0.15, smoke: true
    });
  }

  function spawnHelicopterRing(point, delay, scale) {
    if (!CFG.helicopter.effects || !helicopterState.ringGeometry) return;
    const mesh = new helicopterState.proto.meshCtor(helicopterState.ringGeometry, helicopterState.ringMat);
    mesh.position.set(point.x, point.y + 0.08, point.z);
    mesh.scale.setScalar(scale || 0.22);
    mesh.frustumCulled = false;
    mesh.renderOrder = 10003;
    helicopterState.effectsGroup.add(mesh);
    helicopterState.rings.push({ mesh, life: 0.48, maxLife: 0.48, delay: delay || 0, rate: 9 + Math.random() * 3 });
  }

  function helicopterExplosion(point) {
    spawnHelicopterSparks(point, 0, 0.35, 0, 34);
    for (let i = 0; i < 9; i++) {
      spawnHelicopterSmoke({
        x: point.x + (Math.random() - 0.5) * 1.5,
        y: point.y + Math.random() * 1.1,
        z: point.z + (Math.random() - 0.5) * 1.5
      }, 0.8 + Math.random() * 1.4);
    }
    spawnHelicopterRing(point, 0, 0.2);
    spawnHelicopterRing(point, 0.09, 0.12);
  }

  function updateHelicopterEffects(dt) {
    for (let i = helicopterState.tracers.length - 1; i >= 0; i--) {
      const tracer = helicopterState.tracers[i];
      tracer.life -= dt;
      if (tracer.life <= 0) {
        if (tracer.mesh.parent) tracer.mesh.parent.remove(tracer.mesh);
        helicopterState.tracers.splice(i, 1);
      }
    }
    for (let i = helicopterState.rings.length - 1; i >= 0; i--) {
      const ring = helicopterState.rings[i];
      ring.life -= dt;
      if (ring.delay > 0) {
        ring.delay -= dt;
        continue;
      }
      const age = ring.maxLife - Math.max(0, ring.life);
      const scale = 0.18 + age * ring.rate;
      ring.mesh.scale.set(scale, 1, scale);
      if (ring.life <= 0) {
        if (ring.mesh.parent) ring.mesh.parent.remove(ring.mesh);
        helicopterState.rings.splice(i, 1);
      }
    }
    for (let i = helicopterState.particles.length - 1; i >= 0; i--) {
      const particle = helicopterState.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        if (particle.mesh.parent) particle.mesh.parent.remove(particle.mesh);
        helicopterState.particles.splice(i, 1);
        continue;
      }
      particle.vy -= (particle.gravity || 0) * dt;
      particle.mesh.position.x += particle.vx * dt;
      particle.mesh.position.y += particle.vy * dt;
      particle.mesh.position.z += particle.vz * dt;
      const ratio = particle.life / particle.maxLife;
      particle.mesh.scale.multiplyScalar(particle.smoke ? 1 + dt * 2.4 : 1 - dt * 0.72);
      if (particle.mesh.material) particle.mesh.material.opacity = ratio * (particle.smoke ? 0.22 : 0.95);
    }
  }


  function findHelicopterBodyHit(g, ox, oy, oz, dx, dy, dz, distance) {
    let best = null, bestT = Infinity;
    for (const entity of g.allEntities()) {
      if (entity === g.player || !entity.alive || entity.team === g.player.team) continue;
      const height = entity.height || 1.8288;
      const baseY = entity._visY != null ? entity._visY : entity.y;
      const cx = entity.x, cy = baseY + height * 0.5, cz = entity.z;
      const t = Math.max(0, Math.min(1,
        ((cx - ox) * dx + (cy - oy) * dy + (cz - oz) * dz) / Math.max(1e-8, distance * distance)));
      const px = ox + dx * distance * t, py = oy + dy * distance * t, pz = oz + dz * distance * t;
      const radius = (entity.radius || 0.4064) + 0.42;
      const missX = px - cx, missY = py - cy, missZ = pz - cz;
      if (missX * missX + missY * missY + missZ * missZ <= radius * radius && t < bestT) {
        bestT = t;
        best = { entity, t };
      }
    }
    return best;
  }

  function beginHelicopterReload() {
    if (helicopterState.reload > 0 || helicopterState.ammo >= Math.floor(CFG.helicopter.ammo)) return;
    helicopterState.reload = Math.max(0.1, CFG.helicopter.reloadTime);
  }

  function createHelicopterMissile(g) {
    if (!helicopterState.gunMount || !helicopterState.effectsGroup ||
        !helicopterState.proto || !helicopterState.fxGeometry) return null;
    const origin = { x: helicopterState.x, y: helicopterState.y - 0.92, z: helicopterState.z };
    try {
      if (helicopterState.gunMount.getWorldPosition) {
        const world = helicopterState.gunMount.getWorldPosition(new g.camera.position.constructor());
        origin.x = world.x;
        origin.y = world.y - 0.18;
        origin.z = world.z;
      }
    } catch (e) {}
    const direction = { x: 0, y: -1, z: 0 };
    try {
      updateHelicopterCamera(0.016);
      if (helicopterState.gunCamera && helicopterState.gunCamera.getWorldDirection) {
        const aim = helicopterState.gunCamera.getWorldDirection(new g.camera.position.constructor());
        const length = Math.hypot(aim.x, aim.y, aim.z);
        if (length > 1e-6) {
          direction.x = aim.x / length;
          direction.y = aim.y / length;
          direction.z = aim.z / length;
        }
      }
    } catch (e) {}
    const mesh = new helicopterState.proto.groupCtor();
    mesh.name = 'OUTCOME downward missile';
    const body = new helicopterState.proto.meshCtor(helicopterState.fxGeometry, helicopterState.missileMat);
    body.scale.set(0.2, 0.2, 0.9);
    body.frustumCulled = false;
    mesh.add(body);
    const nose = new helicopterState.proto.meshCtor(helicopterState.fxGeometry, helicopterState.missileMat);
    nose.scale.set(0.15, 0.15, 0.3);
    nose.position.z = 0.56;
    nose.frustumCulled = false;
    mesh.add(nose);
    const flame = new helicopterState.proto.meshCtor(helicopterState.fxGeometry, helicopterState.flameMat);
    flame.scale.set(0.24, 0.24, 0.8 + Math.random() * 0.55);
    flame.position.z = -0.8;
    flame.frustumCulled = false;
    mesh.add(flame);
    mesh.position.set(origin.x, origin.y, origin.z);
    mesh.lookAt(origin.x + direction.x * 10, origin.y + direction.y * 10, origin.z + direction.z * 10);
    helicopterState.effectsGroup.add(mesh);
    const speed = Math.max(8, CFG.helicopter.missileSpeed);
    const missile = {
      mesh, flame, origin,
      velocity: { x: direction.x * speed, y: direction.y * speed, z: direction.z * speed },
      life: Math.max(0.2, CFG.helicopter.range / speed),
      trail: 0
    };
    helicopterState.missiles.push(missile);
    spawnHelicopterSmoke(origin, 0.42);
    spawnHelicopterTracer(origin, {
      x: origin.x - direction.x * 1.2,
      y: origin.y - direction.y * 1.2,
      z: origin.z - direction.z * 1.2
    });
    return missile;
  }

  function fireHelicopterMissile(g) {
    if (!g || !helicopterState.active || !helicopterState.occupied || !helicopterState.gunnerMode ||
        menuOpen || helicopterState.fireCooldown > 0 || helicopterState.reload > 0) return false;
    if (helicopterState.ammo <= 0) {
      if (CFG.helicopter.autoReload) beginHelicopterReload();
      return false;
    }
    if (!createHelicopterMissile(g)) return false;
    helicopterState.ammo--;
    helicopterState.fireCooldown = Math.max(0.08, CFG.helicopter.fireCooldown);
    helicopterState.recoil = 1;
    helicopterState.flashTime = 0.09;
    if (helicopterState.launchFlash) helicopterState.launchFlash.visible = true;
    if (helicopterState.ammo <= 0 && CFG.helicopter.autoReload) beginHelicopterReload();
    return true;
  }

  function missileWallPassable(wall, point) {
    if (!wall) return false;
    const mat = String(wall.mat || '').toLowerCase();
    const boundaryMaterial = /invisible|sky|void|outside|boundary|limit|kill|clip|world/.test(mat);
    const box = wall.b;
    if (boundaryMaterial) return true;
    if (!box) return false;
    const sx = Math.abs((box.maxX || 0) - (box.minX || 0));
    const sy = Math.abs((box.maxY || 0) - (box.minY || 0));
    const sz = Math.abs((box.maxZ || 0) - (box.minZ || 0));
    const extent = Math.max(sx, sy, sz);
    const thickness = Math.min(sx, sy, sz);
    const verticalSide = Math.abs(wall.nx || 0) + Math.abs(wall.nz || 0) > 0.55;
    const ceiling = Math.abs(wall.ny || 0) > 0.55;
    const largeBoundary = extent >= 80 && thickness <= 4 && (verticalSide || ceiling);
    return point.y > 18 && (boundaryMaterial || largeBoundary);
  }

  function updateHelicopterMissiles(g, dt) {
    for (let i = helicopterState.missiles.length - 1; i >= 0; i--) {
      const missile = helicopterState.missiles[i];
      missile.life -= dt;
      const px = missile.mesh.position.x;
      const py = missile.mesh.position.y;
      const pz = missile.mesh.position.z;
      const speed = Math.max(1e-6, Math.hypot(missile.velocity.x, missile.velocity.y, missile.velocity.z));
      const distance = speed * dt;
      const dir = { x: missile.velocity.x / speed, y: missile.velocity.y / speed, z: missile.velocity.z / speed };
      const bodyHit = distance > 1e-6
        ? findHelicopterBodyHit(g, px, py, pz, dir.x, dir.y, dir.z, distance)
        : null;
      let wallT = Infinity;
      if (distance > 1e-6 && g.physics && g.physics.raycast) {
        try {
          const wall = g.physics.raycast(px, py, pz, dir.x, dir.y, dir.z, distance, 1);
          if (wall && wall.t != null && isFinite(wall.t)) {
            const hitT = Math.max(0, Math.min(1, wall.t));
            const wallPoint = {
              x: px + dir.x * distance * hitT,
              y: py + dir.y * distance * hitT,
              z: pz + dir.z * distance * hitT
            };
            if (!missileWallPassable(wall, wallPoint)) wallT = hitT;
          }
        } catch (e) {}
      }
      const bodyDistance = bodyHit ? bodyHit.t * distance : Infinity;
      const wallDistance = isFinite(wallT) ? wallT * distance : Infinity;
      const travel = Math.min(distance, bodyDistance, wallDistance);
      const point = { x: px + dir.x * travel, y: py + dir.y * travel, z: pz + dir.z * travel };
      missile.mesh.position.set(point.x, point.y, point.z);
      missile.flame.scale.z = 0.8 + Math.random() * 0.7;
      missile.trail -= dt;
      if (missile.trail <= 0) {
        missile.trail = 0.018 + Math.random() * 0.012;
        spawnHelicopterSmoke(point, 0.28 + Math.random() * 0.22, missile.velocity);
        if (Math.random() < 0.55) spawnHelicopterSparks(point, -dir.x, -dir.y, -dir.z, 1);
      }
      const groundY = helicopterGroundHeight(g, point.x, point.z, point.y);
      const hitBody = bodyHit && bodyDistance <= wallDistance;
      const hitWall = isFinite(wallDistance) && wallDistance <= bodyDistance;
      const hitGround = point.y <= groundY + 0.06 && dir.y < 0;
      if (hitBody || hitWall || hitGround || missile.life <= 0) {
        if (hitGround && !hitWall) point.y = groundY + 0.05;
        if (missile.mesh.parent) missile.mesh.parent.remove(missile.mesh);
        helicopterState.missiles.splice(i, 1);
        helicopterExplosion(point);
        detonateExplosive(g, point, hitBody ? bodyHit.entity : null, CFG.helicopter.blastRadius);
      }
    }
  }


  function fixHelicopterWorldMaterials(g) {
    if (!g || !g.scene) return;
    const wallPattern = /wall|ceiling|roof|slab|concrete|structure|surface|level|room|panel/i;
    const skipPattern = /glass|window|sky|door|decoration|trim/i;
    g.scene.traverse(object => {
      if (!object || !object.isMesh || !object.material) return;
      const objectName = object.name || '';
      const parentName = object.parent && object.parent.name || '';
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        const label = (objectName + ' ' + parentName + ' ' + (material.name || '')).toLowerCase();
        if (!wallPattern.test(label) || skipPattern.test(label)) continue;
        if (!material.userData) material.userData = {};
        if (material.userData.__outcomeHelicopterOpaque) continue;
        const original = {
          transparent: material.transparent,
          opacity: material.opacity == null ? 1 : material.opacity,
          depthWrite: material.depthWrite,
          depthTest: material.depthTest
        };
        if (original.transparent === false && original.opacity >= 0.99 && original.depthWrite !== false) continue;
        material.userData.__outcomeHelicopterOpaque = true;
        material.userData.__outcomeHelicopterOriginal = original;
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        material.depthTest = true;
        material.needsUpdate = true;
        helicopterState.worldMaterials.push(material);
      }
    });
  }

  function restoreHelicopterWorldMaterials() {
    for (const material of helicopterState.worldMaterials || []) {
      if (!material || !material.userData) continue;
      const original = material.userData.__outcomeHelicopterOriginal;
      if (original) {
        material.transparent = original.transparent;
        material.opacity = original.opacity;
        material.depthWrite = original.depthWrite;
        material.depthTest = original.depthTest;
        material.needsUpdate = true;
      }
      delete material.userData.__outcomeHelicopterOpaque;
      delete material.userData.__outcomeHelicopterOriginal;
    }
    helicopterState.worldMaterials = [];
  }


  function helicopterGroundHeight(g, x, z, fallback) {
    if (g.physics && typeof g.physics.groundHeight === 'function') {
      try {
        const y = g.physics.groundHeight(x, fallback + 1.2, z);
        if (Number.isFinite(y) && y > -50) return y;
      } catch (e) {}
    }
    return fallback;
  }

  function helicopterSpawnClear(g, x, y, z) {
    if (g.physics && g.physics.pointSolid) {
      try { if (g.physics.pointSolid(x, y + 0.7, z)) return false; } catch (e) {}
    }
    return true;
  }

  function spawnHelicopter(g) {
    if (!CFG.helicopter.enabled) {
      setHelicopterStatus('Enable HELICOPTER first.', 'error');
      return false;
    }
    if (menuOpen) {
      setHelicopterStatus('Close the menu before deploying.', 'error');
      return false;
    }
    if (helicopterState.active) {
      setHelicopterStatus('Helicopter is already deployed. Press E to enter.', 'error');
      return false;
    }
    if (helicopterCooldown > 0) {
      setHelicopterStatus('Helicopter deploy cooldown is still active.', 'error');
      return false;
    }
    if (!g || g.state !== 'playing' || !g.player || !g.player.alive || !g.scene || !g.camera) {
      setHelicopterStatus('Enter a live match before deploying.', 'error');
      return false;
    }
    if (droneState.active) stopDrone();
    const p = g.player;
    const yaw = p.yaw || 0;
    const forwardX = -Math.sin(yaw), forwardZ = -Math.cos(yaw);
    let x = p.x + forwardX * 4.8, z = p.z + forwardZ * 4.8;
    let ground = helicopterGroundHeight(g, x, z, p.y);
    let y = ground + 1.25;
    if (!helicopterSpawnClear(g, x, y, z)) {
      const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
      x = p.x + rightX * 4.8;
      z = p.z + rightZ * 4.8;
      ground = helicopterGroundHeight(g, x, z, p.y);
      y = ground + 1.25;
    }
    try {
      buildHelicopter(g);
      fixHelicopterWorldMaterials(g);
      Object.assign(helicopterState, {
        active: true, occupied: false, gunnerMode: false, x, y, z,
        hullYaw: yaw, hullPitch: 0, speed: 0, verticalSpeed: 0, bank: 0, collective: 0,
        ammo: Math.floor(CFG.helicopter.ammo), fireCooldown: 0, reload: 0,
        recoil: 0, flashTime: 0, impactTime: 0
      });
      helicopterState.group.position.set(x, y, z);
      helicopterState.group.rotation.y = yaw;
      if (helicopterState.customRoot) helicopterState.customRoot.rotation.y = yaw;
      helicopterState.camera.fov = CFG.helicopter.fov;
      helicopterState.gunCamera.fov = CFG.helicopter.fov;
      if (helicopterState.camera.updateProjectionMatrix) helicopterState.camera.updateProjectionMatrix();
      if (helicopterState.gunCamera.updateProjectionMatrix) helicopterState.gunCamera.updateProjectionMatrix();
      for (let i = 0; i < 6; i++) {
        spawnHelicopterSmoke({ x: x + (Math.random() - 0.5) * 1.8, y: y - 0.2, z: z + (Math.random() - 0.5) * 2.4 });
      }
      helicopterCooldown = 1.2;
      return true;
    } catch (e) {
      const reason = e && e.message ? e.message : String(e);
      console.error('[OUTCOME] helicopter build failed:', e);
      setHelicopterStatus('Helicopter build failed: ' + reason, 'error');
      stopHelicopter(g);
      return false;
    }
  }

  function enterHelicopter(g) {
    if (!helicopterState.active || helicopterState.occupied || !g || g.state !== 'playing' ||
        !g.player || !g.player.alive || !helicopterState.group) return false;
    const p = g.player;
    if (Math.hypot(p.x - helicopterState.x, p.z - helicopterState.z) > 5.5) return false;
    const yaw = p.yaw || 0;
    p.x = helicopterState.x;
    p.y = helicopterState.y;
    p.z = helicopterState.z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.onGround = false;
    helicopterState.occupied = true;
    helicopterState.gunnerMode = false;
    helicopterState.hullYaw = yaw;
    helicopterState.hullPitch = 0;
    helicopterState.speed = 0;
    helicopterState.verticalSpeed = 0;
    helicopterState.cameraOrbitYaw = 0;
    helicopterState.cameraOrbitPitch = 0;
    helicopterState.cameraLastYaw = p.yaw || 0;
    helicopterState.cameraLastPitch = p.pitch || 0;
    if (helicopterState.camera) {
      helicopterState.camera.position.set(helicopterState.x + Math.sin(yaw) * 9.5, helicopterState.y + 4.56, helicopterState.z + Math.cos(yaw) * 9.5);
      helicopterState.camera.lookAt(helicopterState.x, helicopterState.y + 0.4, helicopterState.z);
    }
    if (helicopterState.gunCamera) {
      const mountDrop = helicopterCustom.asset ?
        Math.min(2.4, 1.05 + CFG.helicopter.modelHeight * 0.22) : 0.92;
      const mountY = helicopterState.y - mountDrop;
      helicopterState.gunCamera.position.set(helicopterState.x, mountY, helicopterState.z);
      helicopterState.gunCamera.lookAt(helicopterState.x, mountY - 30, helicopterState.z);
    }
    startHelicopterSound(g);
    return true;
  }

  function exitHelicopter(g) {
    if (!helicopterState.active || !helicopterState.occupied || !g || !g.player) return false;
    const p = g.player;
    const yaw = helicopterState.hullYaw, rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
    let x = helicopterState.x + rightX * 2.4, z = helicopterState.z + rightZ * 2.4;
    const y = helicopterGroundHeight(g, x, z, helicopterState.y) + 0.05;
    if (!helicopterSpawnClear(g, x, y, z)) {
      x = helicopterState.x - rightX * 2.4;
      z = helicopterState.z - rightZ * 2.4;
    }
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.onGround = true;
    helicopterState.occupied = false;
    helicopterState.gunnerMode = false;
    helicopterState.speed = 0;
    helicopterState.verticalSpeed = 0;
    stopHelicopterSound();
    return true;
  }

  function stopHelicopter(g) {
    const wasOccupied = helicopterState.occupied;
    const x = helicopterState.x, y = helicopterState.y, z = helicopterState.z, yaw = helicopterState.hullYaw;
    stopHelicopterSound();
    detachHelicopterCustomModel();
    restoreHelicopterWorldMaterials();
    disposeHelicopterObject(helicopterState.group);
    disposeHelicopterObject(helicopterState.effectsGroup);
    if (helicopterState.fxGeometry && helicopterState.fxGeometry.dispose) helicopterState.fxGeometry.dispose();
    if (helicopterState.ringGeometry && helicopterState.ringGeometry.dispose) helicopterState.ringGeometry.dispose();
    for (const material of helicopterState.fxMaterials || []) if (material && material.dispose) material.dispose();
    helicopterState.active = false;
    helicopterState.occupied = false;
    helicopterState.gunnerMode = false;
    helicopterState.group = null;
    helicopterState.effectsGroup = null;
    helicopterState.camera = null;
    helicopterState.gunCamera = null;
    helicopterState.mainRotor = null;
    helicopterState.tailRotor = null;
    helicopterState.gunMount = null;
    helicopterState.launchFlash = null;
    helicopterState.hull = null;
    helicopterState.customRoot = null;
    helicopterState.worldMaterials = [];
    helicopterState.worldFixTimer = 0;
    helicopterState.gunYaw = 0;
    helicopterState.gunPitch = -1.15;
    helicopterState.tracers = [];
    helicopterState.particles = [];
    helicopterState.missiles = [];
    helicopterState.rings = [];
    helicopterState.proto = null;
    helicopterState.fxGeometry = null;
    helicopterState.ringGeometry = null;
    helicopterState.fxMaterials = [];
    helicopterState.tracerMat = null;
    helicopterState.sparkMat = null;
    helicopterState.smokeMat = null;
    helicopterState.ringMat = null;
    helicopterState.missileMat = null;
    helicopterState.flameMat = null;
    helicopterState.hullPitch = 0;
    helicopterState.speed = 0;
    helicopterState.verticalSpeed = 0;
    helicopterState.bank = 0;
    helicopterState.collective = 0;
    helicopterState.ammo = Math.floor(CFG.helicopter.ammo);
    helicopterState.fireCooldown = 0;
    helicopterState.reload = 0;
    helicopterState.recoil = 0;
    helicopterState.flashTime = 0;
    helicopterState.impactTime = 0;
    if (wasOccupied && g && g.player && g.player.alive) {
      const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
      const ground = helicopterGroundHeight(g, x, z, y);
      g.player.x = x + rightX * 2.4;
      g.player.y = ground + 0.05;
      g.player.z = z + rightZ * 2.4;
      g.player.vx = 0;
      g.player.vy = 0;
      g.player.vz = 0;
      g.player.onGround = true;
      setViewmodelVisible(g, true);
      if (g.__vmHid) g.__vmHid = false;
    }
  }


  function wrapHelicopterAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function updateHelicopterCamera(dt) {
    const g = window.game, p = g && g.player;
    if (!g || !p || !helicopterState.group) return;
    const step = Math.min(0.1, Math.max(0.016, dt || 0.016));
    const speed = Math.hypot(helicopterState.speed, helicopterState.verticalSpeed);
    const camera = helicopterState.gunnerMode ? helicopterState.gunCamera : helicopterState.camera;
    if (!camera) return;
    if (helicopterState.gunnerMode) {
      const aimYaw = helicopterState.gunYaw || 0;
      const aimPitch = helicopterState.gunPitch == null ? -1.15 : helicopterState.gunPitch;
      const cp = Math.cos(aimPitch);
      const aimX = -Math.sin(aimYaw) * cp;
      const aimY = Math.sin(aimPitch);
      const aimZ = -Math.cos(aimYaw) * cp;
      const mountDrop = helicopterCustom.asset ?
        Math.min(2.4, 1.05 + CFG.helicopter.modelHeight * 0.22) : 0.92;
      const mountY = helicopterState.y - mountDrop;
      camera.fov += (CFG.helicopter.fov - camera.fov) * (1 - Math.exp(-step * 10));
      camera.position.set(helicopterState.x, mountY, helicopterState.z);
      camera.lookAt(helicopterState.x + aimX * 30, mountY + aimY * 30, helicopterState.z + aimZ * 30);
    } else {
      const lookYaw = p.yaw || 0;
      const lookPitch = p.pitch || 0;
      const yawDelta = wrapHelicopterAngle(lookYaw - helicopterState.cameraLastYaw);
      const pitchDelta = lookPitch - helicopterState.cameraLastPitch;
      helicopterState.cameraLastYaw = lookYaw;
      helicopterState.cameraLastPitch = lookPitch;
      helicopterState.cameraOrbitYaw = wrapHelicopterAngle(helicopterState.cameraOrbitYaw + yawDelta);
      helicopterState.cameraOrbitPitch = Math.max(-0.55, Math.min(0.85,
        helicopterState.cameraOrbitPitch + pitchDelta * 0.85));
      const viewYaw = helicopterState.hullYaw + helicopterState.cameraOrbitYaw;
      const elevation = helicopterState.cameraOrbitPitch + helicopterState.hullPitch * 0.12;
      const desiredFov = CFG.helicopter.fov + Math.min(7, speed * 0.18) + helicopterState.recoil * 2.2;
      camera.fov += (desiredFov - camera.fov) * (1 - Math.exp(-step * 8));
      camera.near = 0.05;
      camera.far = 500;
      const behind = 9.5 + speed * 0.08;
      const horizontal = behind * Math.cos(elevation);
      const targetX = helicopterState.x + Math.sin(viewYaw) * horizontal;
      const targetY = helicopterState.y + 4.56 + Math.sin(elevation) * behind;
      const targetZ = helicopterState.z + Math.cos(viewYaw) * horizontal;
      const follow = 1 - Math.exp(-step * 9);
      camera.position.x += (targetX - camera.position.x) * follow;
      camera.position.y += (targetY - camera.position.y) * follow;
      camera.position.z += (targetZ - camera.position.z) * follow;
      camera.lookAt(helicopterState.x, helicopterState.y + 1.05, helicopterState.z);
    }
    const shake = helicopterState.recoil * 0.04 + helicopterState.impactTime * 0.05;
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;

      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
    }
    if (camera.updateProjectionMatrix) camera.updateProjectionMatrix();
    if (camera.updateMatrixWorld) camera.updateMatrixWorld();
  }

  function updateHelicopterCustomRotors(dt) {
    const asset = helicopterCustom.asset;
    if (!asset || !asset.rotorNodes || !asset.rotorNodes.length) return;
    const speed = Math.max(0, Number(CFG.helicopter.rotorSpeed) || 0);
    if (speed <= 0) return;
    for (const rotor of asset.rotorNodes) {
      const amount = speed * rotor.direction * dt;
      if (rotor.axis === 'x') rotor.node.rotation.x += amount;
      else if (rotor.axis === 'z') rotor.node.rotation.z += amount;
      else rotor.node.rotation.y += amount;
    }
  }


  function updateHelicopterModel(g, step) {
    helicopterState.group.position.set(helicopterState.x, helicopterState.y, helicopterState.z);
    helicopterState.group.rotation.y = helicopterState.hullYaw;
    helicopterState.group.rotation.x = helicopterState.hullPitch;
    helicopterState.group.rotation.z = helicopterState.bank;
    const hideForGunner = helicopterState.gunnerMode;
    const hasCustomModel = !!helicopterState.customRoot;
    if (helicopterState.hull) helicopterState.hull.visible = !hasCustomModel && !hideForGunner;
    if (helicopterState.customRoot) helicopterState.customRoot.visible = !hideForGunner;
    if (!hideForGunner && helicopterState.customRoot) {
      helicopterState.customRoot.position.copy(helicopterState.group.position);
      helicopterState.customRoot.rotation.copy(helicopterState.group.rotation);
    }
    updateHelicopterCustomRotors(step);
    if (helicopterState.mainRotor) helicopterState.mainRotor.rotation.y += step * (32 + Math.abs(helicopterState.speed) * 1.8);
    if (helicopterState.tailRotor) helicopterState.tailRotor.rotation.x += step * (58 + Math.abs(helicopterState.speed) * 2.2);
    if (helicopterState.launchFlash) helicopterState.launchFlash.visible = helicopterState.flashTime > 0;
    if (helicopterState.sound) {
      const now = helicopterState.sound.ctx.currentTime;
      helicopterState.sound.engine.frequency.setTargetAtTime(48 + Math.abs(helicopterState.speed) * 1.9 + helicopterState.collective * 12, now, 0.05);
      helicopterState.sound.sub.frequency.setTargetAtTime(24 + Math.abs(helicopterState.verticalSpeed) * 2.2, now, 0.05);
    }
    updateHelicopterCamera(step);
  }


  function updateHelicopterFlight(g, step) {
    const p = g.player;
    const live = !menuOpen;
    const pitchInput = live ? (heldCodes.has('KeyS') ? 1 : 0) - (heldCodes.has('KeyW') ? 1 : 0) : 0;
    const steerInput = live ? (heldCodes.has('KeyA') ? 1 : 0) - (heldCodes.has('KeyD') ? 1 : 0) : 0;
    const collectiveInput = live ? (heldCodes.has('ShiftLeft') || heldCodes.has('ShiftRight') ? 1 : 0) -
      (heldCodes.has('ControlLeft') || heldCodes.has('ControlRight') ? 1 : 0) : 0;
    const boost = live && (heldCodes.has('AltLeft') || heldCodes.has('AltRight'));
    const brake = !live || heldCodes.has('Space');
    const hasPitchInput = pitchInput !== 0;
    helicopterState.hullPitch += ((hasPitchInput ? pitchInput * 0.42 : 0) - helicopterState.hullPitch) * (1 - Math.exp(-step * 4.8));
    helicopterState.collective += (collectiveInput - helicopterState.collective) * (1 - Math.exp(-step * 5.5));
    const pitchDirection = pitchInput < 0 ? 1 : pitchInput > 0 ? -1 : 0;
    const targetSpeed = brake ? 0 : pitchDirection * (boost ? CFG.helicopter.boostSpeed : CFG.helicopter.speed);
    const speedResponse = brake ? 10 : hasPitchInput ? (boost ? 3.8 : 4.8) : 2.6;
    helicopterState.speed += (targetSpeed - helicopterState.speed) * (1 - Math.exp(-step * speedResponse));
    if (Math.abs(helicopterState.speed) < 0.025 && !hasPitchInput) helicopterState.speed = 0;
    const turnAuthority = 0.4 + Math.min(1, Math.abs(helicopterState.speed) / Math.max(1, CFG.helicopter.speed)) * 0.9;
    helicopterState.hullYaw = wrapHelicopterAngle(helicopterState.hullYaw + steerInput * CFG.helicopter.turnRate * turnAuthority * step);
    helicopterState.gunYaw = p.yaw || 0;
    helicopterState.gunPitch = Math.max(-1.45, Math.min(1.45, p.pitch || 0));
    const targetVertical = helicopterState.collective * CFG.helicopter.verticalSpeed +
      Math.sin(helicopterState.hullPitch) * Math.abs(helicopterState.speed);
    helicopterState.verticalSpeed += (targetVertical - helicopterState.verticalSpeed) * (1 - Math.exp(-step * 5));
    helicopterState.bank += (-steerInput * 0.24 - helicopterState.bank) * (1 - Math.exp(-step * 6));
    const fx = -Math.sin(helicopterState.hullYaw), fz = -Math.cos(helicopterState.hullYaw);
    const moveX = fx * helicopterState.speed * step, moveZ = fz * helicopterState.speed * step;
    const distance = Math.hypot(moveX, moveZ);
    let nextX = helicopterState.x + moveX, nextZ = helicopterState.z + moveZ;
    if (distance > 1e-5 && g.physics && g.physics.raycast) {
      const dirX = moveX / distance, dirZ = moveZ / distance;
      try {
        const wall = g.physics.raycast(helicopterState.x, helicopterState.y, helicopterState.z, dirX, 0, dirZ, distance);
        if (wall && wall.t != null && isFinite(wall.t)) {
          const travel = Math.max(0, Math.min(1, wall.t)) * distance;
          nextX = helicopterState.x + dirX * travel;
          nextZ = helicopterState.z + dirZ * travel;
          if (travel < distance) {
            helicopterState.speed *= -0.14;
            helicopterState.impactTime = 0.25;
            spawnHelicopterSmoke({ x: nextX, y: helicopterState.y - 0.1, z: nextZ }, 0.8);
          }
        }
      } catch (e) {}
    }
    helicopterState.x = nextX;
    helicopterState.z = nextZ;
    helicopterState.y += helicopterState.verticalSpeed * step;
    const groundY = helicopterGroundHeight(g, helicopterState.x, helicopterState.z, helicopterState.y);
    const floorY = groundY + 1.05;
    if (helicopterState.y < floorY) {
      helicopterState.y += (floorY - helicopterState.y) * (1 - Math.exp(-step * 15));
      helicopterState.verticalSpeed = Math.max(0, helicopterState.verticalSpeed);
    }
    if (helicopterState.y > 70) {
      helicopterState.y = 70;
      helicopterState.verticalSpeed = Math.min(0, helicopterState.verticalSpeed);
    }
    p.x = helicopterState.x; p.y = helicopterState.y; p.z = helicopterState.z;
    p.vx = helicopterState.speed * fx; p.vy = helicopterState.verticalSpeed; p.vz = helicopterState.speed * fz;
    p.onGround = false;
  }


  function tickHelicopter(g, dt) {
    if (helicopterCooldown > 0) helicopterCooldown = Math.max(0, helicopterCooldown - dt);
    if (!helicopterState.active) return;
    if (!CFG.helicopter.enabled || !g || g.state !== 'playing' || !g.player || !g.player.alive) {
      stopHelicopter(g);
      return;
    }
    const step = Math.min(0.05, Math.max(0, dt));
    helicopterState.worldFixTimer -= step;
    if (helicopterState.worldFixTimer <= 0) {
      fixHelicopterWorldMaterials(g);
      helicopterState.worldFixTimer = 0.5;
    }
    helicopterState.fireCooldown = Math.max(0, helicopterState.fireCooldown - step);
    helicopterState.recoil = Math.max(0, helicopterState.recoil - step * 7.5);
    helicopterState.flashTime = Math.max(0, helicopterState.flashTime - step);
    helicopterState.impactTime = Math.max(0, helicopterState.impactTime - step);
    if (helicopterState.reload > 0) {
      helicopterState.reload = Math.max(0, helicopterState.reload - step);
      if (helicopterState.reload <= 0) helicopterState.ammo = Math.floor(CFG.helicopter.ammo);
    }
    updateHelicopterEffects(step);
    updateHelicopterMissiles(g, step);
    if (!helicopterState.occupied) {
      if (helicopterState.group) helicopterState.group.position.set(helicopterState.x, helicopterState.y, helicopterState.z);
      if (helicopterState.customRoot) helicopterState.customRoot.position.set(helicopterState.x, helicopterState.y, helicopterState.z);
      updateHelicopterCustomRotors(step);
      if (helicopterState.mainRotor) helicopterState.mainRotor.rotation.y += step * 16;
      if (helicopterState.tailRotor) helicopterState.tailRotor.rotation.x += step * 32;
      return;
    }
    updateHelicopterFlight(g, step);
    updateHelicopterModel(g, step);

  }


  function renderDroneFeed(renderer, scene, camera) {
    const g = window.game;
    if (!droneState.active || !CFG.drone.feed || !droneState.camera || !g ||
        scene !== g.scene || camera !== g.camera || !renderer) return;
    const size = { width: vw, height: vh, set(w, h) { this.width = w; this.height = h; return this; } };
    if (renderer.getSize) renderer.getSize(size);
    const width = size.width, height = size.height, x = 0, y = 0;
    const previousAutoClear = renderer.autoClear;
    try {
      renderer.autoClear = false;
      renderer.setScissorTest(true);
      renderer.setScissor(x, y, width, height);
      renderer.setViewport(x, y, width, height);
      if (renderer.clearDepth) renderer.clearDepth();
      droneState.camera.aspect = width / Math.max(1, height);
      if (droneState.camera.updateProjectionMatrix) droneState.camera.updateProjectionMatrix();
      renderer.render(scene, droneState.camera);
    } catch (e) {
    } finally {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, size.width, size.height);
      renderer.autoClear = previousAutoClear;
    }
  }
  function drawDroneHud() {
    if (!droneState.active || (!CFG.drone.feed && !CFG.drone.fpv)) return;
    const inCamera = !!(CFG.drone.fpv && droneState.camera);
    const showEffects = !!CFG.drone.feedEffects && (CFG.drone.feed || inCamera);
    const width = vw, height = vh, x = 0, y = 0;
    const battery = Math.max(0, Math.min(1, droneState.battery));
    const lowBattery = Math.max(0, Math.min(1, (0.4 - battery) / 0.4));
    const criticalBattery = battery <= 0.2;
    const now = performance.now() / 1000;
    const pulse = 0.72 + 0.28 * Math.sin(now * 7.5);
    ctx.save();

    if (showEffects) {
      for (let i = 0; i < 96; i++) {
        const noiseX = ((i * 97.13 + now * (31 + (i % 7) * 11)) % width + width) % width;
        const noiseY = ((i * 53.71 + now * (17 + (i % 5) * 7)) % height + height) % height;
        const alpha = 0.012 + ((i * 13) % 11) / 230;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        ctx.fillRect(Math.floor(noiseX), Math.floor(noiseY), i % 9 === 0 ? 2 : 1, 1);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.045)';
      for (let scanY = 0; scanY < height; scanY += 4) ctx.fillRect(0, scanY, width, 1);
      const bandY = (now * 42 % (height + 80)) - 40;
      const band = ctx.createLinearGradient(0, bandY - 24, 0, bandY + 24);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(255,255,255,0.035)');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, bandY - 24, width, 48);
      if (inCamera) {
        const fringe = ctx.createLinearGradient(0, 0, width, 0);
        const fringeAlpha = 0.045 + droneState.boost * 0.045;
        fringe.addColorStop(0, 'rgba(255,35,30,' + fringeAlpha.toFixed(3) + ')');
        fringe.addColorStop(0.08, 'rgba(255,35,30,0)');
        fringe.addColorStop(0.92, 'rgba(35,110,255,0)');
        fringe.addColorStop(1, 'rgba(35,110,255,' + fringeAlpha.toFixed(3) + ')');
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = fringe;
        ctx.fillRect(0, 0, width, height);
        const reflection = ctx.createLinearGradient(0, height, width, 0);
        reflection.addColorStop(0, 'rgba(255,255,255,0)');
        reflection.addColorStop(0.42, 'rgba(255,255,255,0)');
        reflection.addColorStop(0.5, 'rgba(180,235,255,0.055)');
        reflection.addColorStop(0.58, 'rgba(255,255,255,0)');
        reflection.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = reflection;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        const opticalVignette = ctx.createRadialGradient(
          width / 2, height / 2, Math.min(width, height) * 0.34,
          width / 2, height / 2, Math.max(width, height) * 0.72
        );
        opticalVignette.addColorStop(0, 'rgba(0,0,0,0)');
        opticalVignette.addColorStop(0.68, 'rgba(0,0,0,0.035)');
        opticalVignette.addColorStop(1, 'rgba(0,0,0,0.34)');
        ctx.fillStyle = opticalVignette;
        ctx.fillRect(0, 0, width, height);

        const corner = Math.min(46, Math.min(width, height) * 0.1);
        const accent = 0.34 + pulse * 0.16;
        ctx.strokeStyle = 'rgba(91,214,255,' + accent.toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 16, y + 16 + corner); ctx.lineTo(x + 16, y + 16); ctx.lineTo(x + 16 + corner, y + 16);
        ctx.moveTo(x + width - 16 - corner, y + 16); ctx.lineTo(x + width - 16, y + 16); ctx.lineTo(x + width - 16, y + 16 + corner);
        ctx.moveTo(x + 16, y + height - 16 - corner); ctx.lineTo(x + 16, y + height - 16); ctx.lineTo(x + 16 + corner, y + height - 16);
        ctx.moveTo(x + width - 16 - corner, y + height - 16); ctx.lineTo(x + width - 16, y + height - 16); ctx.lineTo(x + width - 16, y + height - 16 - corner);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(91,214,255,' + (accent * 0.62).toFixed(3) + ')';
        for (let i = 0; i < 4; i++) {
          const angle = now * (2.2 + droneState.speed * 0.08) + i * Math.PI / 2;
          ctx.beginPath();
          ctx.arc(x + width / 2, y + height / 2, 30 + i * 8, angle, angle + 0.36);
          ctx.stroke();
        }
      }
    }

    if (lowBattery > 0) {
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.22,
        width / 2, height / 2, Math.max(width, height) * 0.72
      );
      const alpha = Math.min(0.62, lowBattery * (criticalBattery ? 0.95 : 0.58) * pulse);
      vignette.addColorStop(0, 'rgba(255,20,12,0)');
      vignette.addColorStop(0.62, 'rgba(255,20,12,' + (alpha * 0.28).toFixed(3) + ')');
      vignette.addColorStop(1, 'rgba(255,20,12,' + alpha.toFixed(3) + ')');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.strokeStyle = lowBattery > 0 ? 'rgba(255,70,52,0.95)' : 'rgba(255, 140, 54, 0.9)';
    ctx.lineWidth = lowBattery > 0 ? 2 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.fillStyle = criticalBattery ? '#ff4e42' : '#ffb347';
    ctx.font = '600 10px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(droneState.previewTime > 0 ? 'CRASH PREVIEW // TARGET' : 'FPV // DRONE LIVE', x + 10, y + 16);

    ctx.strokeStyle = lowBattery > 0 ? 'rgba(255,90,70,0.9)' : 'rgba(255, 179, 71, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 8, y + height / 2);
    ctx.lineTo(x + width / 2 + 8, y + height / 2);
    ctx.moveTo(x + width / 2, y + height / 2 - 8);
    ctx.lineTo(x + width / 2, y + height / 2 + 8);
    ctx.stroke();

    ctx.font = '600 9px Consolas, monospace';
    ctx.fillStyle = 'rgba(255,179,71,0.86)';
    ctx.fillText('BATT ' + Math.round(battery * 100) + '%', x + 10, y + height - 26);
    ctx.fillText('VEL ' + droneState.speed.toFixed(1) + ' m/s', x + 10, y + height - 12);

    if (showEffects) {
      const warnings = [];
      if (criticalBattery) warnings.push('CRITICAL BATTERY // RETURN');
      else if (lowBattery > 0) warnings.push('LOW BATTERY // ' + Math.round(battery * 100) + '%');
      if (droneState.boost > 0.15) warnings.push('BOOST // BATTERY DRAIN');
      if (droneState.airBrake) warnings.push('AIR BRAKE // HOLD');
      if (droneState.age >= Math.max(0, CFG.drone.life - 0.8)) {
        warnings.push('IMPACT WINDOW // ' + Math.max(0, CFG.drone.life - droneState.age).toFixed(1) + 's');
      }
      ctx.textAlign = 'right';
      ctx.font = '700 10px Consolas, monospace';
      for (let i = 0; i < warnings.length; i++) {
        const warning = warnings[i];
        const tw = ctx.measureText(warning).width;
        const wy = y + 16 + i * 15;
        ctx.fillStyle = 'rgba(8,10,12,0.78)';
        ctx.fillRect(x + width - tw - 18, wy - 11, tw + 10, 14);
        ctx.fillStyle = criticalBattery ? '#ff6255' : '#ffae4a';
        ctx.fillText(warning, x + width - 10, wy);
      }
    }
    ctx.restore();
  }

  function drawHelicopterHud() {
    if (!helicopterState.active) return;
    const width = vw, height = vh, now = performance.now() / 1000;
    const maxAmmo = Math.max(1, Math.floor(CFG.helicopter.ammo));
    const speed = Math.hypot(helicopterState.speed, helicopterState.verticalSpeed);
    const g = window.game;
    const altitude = g && g.physics ? helicopterState.y - helicopterGroundHeight(g, helicopterState.x, helicopterState.z, helicopterState.y) : 0;
    const gunner = helicopterState.gunnerMode;
    ctx.save();
    if (helicopterState.occupied) {
      if (CFG.helicopter.effects) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1);
        const sweep = (now * 58 % (height + 120)) - 60;
        const band = ctx.createLinearGradient(0, sweep - 32, 0, sweep + 32);
        band.addColorStop(0, 'rgba(0,0,0,0)');
        band.addColorStop(0.5, gunner ? 'rgba(255,181,72,0.06)' : 'rgba(37,224,237,0.045)');
        band.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, sweep - 32, width, 64);
      }
      const cx = width / 2, cy = height / 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.76)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, gunner ? 27 : 20, 0, Math.PI * 2);
      ctx.moveTo(cx - 39, cy); ctx.lineTo(cx - 11, cy);
      ctx.moveTo(cx + 11, cy); ctx.lineTo(cx + 39, cy);
      ctx.moveTo(cx, cy - 39); ctx.lineTo(cx, cy - 11);
      ctx.moveTo(cx, cy + 11); ctx.lineTo(cx, cy + 39);
      ctx.stroke();
      ctx.strokeStyle = gunner ? '#ffb54b' : '#59e5ee';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = gunner ? 13 : 7;
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (gunner) {
        ctx.strokeStyle = 'rgba(255,181,75,0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 48, cy - 48, 96, 96);
        ctx.fillStyle = '#ffca76';
        ctx.font = '700 10px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOWNWARD MISSILE CAMERA', cx, cy + 68);
      }
      ctx.fillStyle = '#f4fbff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
      ctx.fill();

      const panelW = Math.min(500, width - 28), panelH = 70;
      const px = (width - panelW) / 2, py = height - panelH - 17;
      ctx.fillStyle = 'rgba(5,8,10,0.86)';
      ctx.fillRect(px, py, panelW, panelH);
      ctx.strokeStyle = gunner ? 'rgba(255,181,75,0.62)' : 'rgba(37,224,237,0.56)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, panelW - 1, panelH - 1);
      ctx.fillStyle = gunner ? '#ffbd61' : '#5ce7ee';
      ctx.font = '700 10px Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('OUTCOME // ATTACK HELICOPTER', px + 12, py + 17);
      ctx.fillStyle = '#d9e5e8';
      ctx.font = '600 11px Consolas, monospace';
      ctx.fillText('MISSILES ' + helicopterState.ammo + ' / ' + maxAmmo, px + 12, py + 38);
      ctx.fillText('SPD ' + speed.toFixed(1) + ' m/s', px + 150, py + 38);
      ctx.fillText('ALT ' + altitude.toFixed(1) + 'm', px + 260, py + 38);
      ctx.textAlign = 'right';
      ctx.fillText(gunner ? 'GUNNER // X FIRE' : 'C // GUNNER VIEW', px + panelW - 12, py + 17);
      if (helicopterState.reload > 0) {
        const progress = 1 - helicopterState.reload / Math.max(0.1, CFG.helicopter.reloadTime);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(px + 12, py + 49, panelW - 24, 4);
        ctx.fillStyle = '#ffb54b';
        ctx.fillRect(px + 12, py + 49, (panelW - 24) * Math.max(0, Math.min(1, progress)), 4);
        ctx.fillStyle = '#ffcf65';
        ctx.fillText('RELOADING', px + panelW - 12, py + 38);
      }
      if (menuOpen) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcf65';
        ctx.font = '700 12px Consolas, monospace';
        ctx.fillText('HELICOPTER PAUSED // MENU OPEN', width / 2, py - 12);
      }
    } else {
      const p = g && g.player;
      const distance = p ? Math.hypot(p.x - helicopterState.x, p.z - helicopterState.z) : Infinity;
      const prompt = distance <= 5.5 ? 'E  //  ENTER HELICOPTER' : 'APPROACH HELICOPTER  //  ' + distance.toFixed(1) + 'm';
      ctx.font = '700 11px Consolas, monospace';
      const tw = ctx.measureText(prompt).width;
      ctx.fillStyle = 'rgba(4,7,9,0.82)';
      ctx.fillRect(width / 2 - tw / 2 - 12, height - 56, tw + 24, 28);
      ctx.strokeStyle = 'rgba(37,224,237,0.58)';
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - tw / 2 - 11.5, height - 55.5, tw + 23, 27);
      ctx.fillStyle = distance <= 5.5 ? '#65e9ef' : '#9caeb5';
      ctx.textAlign = 'center';
      ctx.fillText(prompt, width / 2, height - 38);
    }
    ctx.restore();
  }


  /* ---------------- misc (recoil / spread / ammo / bhop / speed / tp) ---------------- */
  function zeroRecoil(g) {
    const w = g.weapons;
    if (!w) return;
    w.punchP = 0; w.punchY = 0;
    w.shkP = 0; w.shkY = 0; w.shkR = 0;
    w.shkPV = 0; w.shkRV = 0;
    const z = o => {
      if (!o) return;
      for (const k in o) {
        const v = o[k];
        if (typeof v === 'number' && k !== 'index' && k !== 'lastShot') o[k] = 0;
      }
    };
    z(w.punch); z(w._punch);
  }

  /* unified bhop hold-test: engine bind, our key set, or plain Space */
  function jumpHeld(g) {
    if (!CFG.misc.bhop || menuOpen) return false;
    if (!g || !g.player || !g.player.alive || g.state !== 'playing') return false;
    const inp = g.input;
    if (!inp || inp.locked === false) return false;
    if (inp.downA && inp.downA('jump')) return true;
    const jb = inp.binds && inp.binds.jump;
    if (jb && heldCodes.has(jb)) return true;
    return heldCodes.has('Space');
  }

  function discoverHelicopterRotors(asset) {
    if (!asset || !asset.root) return [];
    const found = [];
    asset.root.traverse(object => {
      const explicit = object.userData && object.userData.__outcomeHelicopterRotor;
      if (explicit) {
        if (!found.some(entry => entry.node === object)) {
          found.push({ node: object, axis: explicit.axis || 'y', direction: explicit.direction || 1 });
        }
        return;
      }
      const name = String(object.name || '');
      if (!name || !/rotor|propeller|blade|screw/i.test(name)) return;
      if (/_end(?:_\d+)?$/i.test(name)) return;
      if (found.some(entry => entry.node === object)) return;
      const marsRotor = /^rotors?_0[12]$/i.test(name);
      const axis = marsRotor ? 'x' : /screw|tail|rear|vertical/i.test(name) ? 'z' : 'y';
      const direction = /rotors?_02|screw|right|tail/i.test(name) ? -1 : 1;
      found.push({ node: object, axis, direction });
    });
    asset.rotorNodes = found;
    return found;
  }

  function helicopterAssetBounds(asset) {
    const b = asset && asset.bounds;
    if (!b) return null;
    const angle = Number(asset.modelUpCorrection) || 0;
    if (Math.abs(angle) < 1e-6) return b;
    const c = Math.cos(angle), s = Math.sin(angle);
    const out = { minX: Infinity, minY: Infinity, minZ: Infinity,
      maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
    for (const x of [b.minX, b.maxX]) {
      for (const y of [b.minY, b.maxY]) {
        for (const z of [b.minZ, b.maxZ]) {
          const ry = y * c - z * s;
          const rz = y * s + z * c;
          out.minX = Math.min(out.minX, x);
          out.minY = Math.min(out.minY, ry);
          out.minZ = Math.min(out.minZ, rz);
          out.maxX = Math.max(out.maxX, x);
          out.maxY = Math.max(out.maxY, ry);
          out.maxZ = Math.max(out.maxZ, rz);
        }
      }
    }
    return out;
  }

  function applyHelicopterAssetTransform(asset) {
    if (!asset || !asset.centering || !asset.orientation || !asset.bounds) return;
    const b = helicopterAssetBounds(asset);
    const height = b.maxY - b.minY;
    const scale = Math.max(0.05, CFG.helicopter.modelHeight / Math.max(0.001, height)) * HELICOPTER_CUSTOM_SIZE_BOOST;
    const yawOffset = Number(asset.modelYawOffset) || 0;
    asset.pivot.rotation.y = CFG.helicopter.modelYaw * Math.PI / 180 + yawOffset;
    asset.orientation.rotation.x = Number(asset.modelUpCorrection) || 0;
    asset.centering.scale.setScalar(scale);
    asset.centering.position.set(
      -(b.minX + b.maxX) * 0.5 * scale,
      -b.minY * scale,
      -(b.minZ + b.maxZ) * 0.5 * scale
    );
    asset.scale = scale;
  }

  function attachHelicopterCustomModel(g) {
    const asset = helicopterCustom.asset;
    if (!asset || !asset.root) return false;
    if (asset.root.parent !== g.scene) g.scene.add(asset.root);
    if (asset.root.rotation && asset.root.rotation.order) asset.root.rotation.order = 'YXZ';
    asset.root.visible = !helicopterState.gunnerMode;
    helicopterState.customRoot = asset.root;
    if (helicopterState.hull) helicopterState.hull.visible = false;
    if (!asset.rotorNodes) discoverHelicopterRotors(asset);
    applyHelicopterAssetTransform(asset);
    return true;
  }

  function detachHelicopterCustomModel() {
    const root = helicopterState.customRoot;
    if (root && root.parent) root.parent.remove(root);
    if (root) root.visible = false;
    helicopterState.customRoot = null;
    if (helicopterState.hull) helicopterState.hull.visible = true;
  }

  async function loadHelicopterModelFile(file) {
    const gen = ++helicopterCustom.generation;
    const g = window.game;
    helicopterCustom.busy = true;
    heliModelPick.disabled = true;
    heliModelFileName.textContent = file.name;
    heliModelStatus.textContent = 'Loading ' + file.name + '...';
    try {
      if (!g || !g.scene) throw new Error('Game is not ready');
      const buffer = await file.arrayBuffer();
      if (gen !== helicopterCustom.generation) return;
      const asset = await buildTpAsset(g, buffer);
      if (gen !== helicopterCustom.generation) {
        disposeTpAsset(asset);
        return;
      }
      discoverHelicopterRotors(asset);
      applyHelicopterAssetTransform(asset);
      const old = helicopterCustom.asset;
      if (old && old.root === helicopterState.customRoot) detachHelicopterCustomModel();
      helicopterCustom.asset = asset;
      helicopterCustom.name = file.name;
      if (old) disposeTpAsset(old);
      if (helicopterState.active) attachHelicopterCustomModel(g);
      heliModelFileName.textContent = file.name;
      heliModelClear.disabled = false;
      heliModelStatus.textContent = 'Loaded ' + file.name + ' - ' + Math.round(asset.triangles).toLocaleString() + ' triangles';
    } catch (e) {
      console.error('[OUTCOME] custom helicopter model failed:', e);
      heliModelStatus.textContent = 'Load failed: ' + (e && e.message ? e.message : String(e));
    } finally {
      if (gen === helicopterCustom.generation) {
        helicopterCustom.busy = false;
        heliModelPick.disabled = false;
      }
    }
  }

  function clearHelicopterModel() {
    helicopterCustom.generation++;
    helicopterCustom.busy = false;
    heliModelPick.disabled = false;
    if (helicopterState.active) detachHelicopterCustomModel();
    const old = helicopterCustom.asset;
    helicopterCustom.asset = null;
    helicopterCustom.name = '';
    if (old) disposeTpAsset(old);
    heliModelFileName.textContent = 'No helicopter model selected';
    heliModelStatus.textContent = 'Optional static GLB. The procedural helicopter remains the fallback.';
    heliModelClear.disabled = true;
  }


  function setTpModelStatus(text) {
    if (modelStatus) modelStatus.textContent = text;
  }

  function parseGlb(buffer) {
    const dv = new DataView(buffer);
    if (buffer.byteLength < 20 || dv.getUint32(0, true) !== 0x46546c67) {
      throw new Error('Invalid GLB header');
    }
    if (dv.getUint32(4, true) !== 2) throw new Error('Only GLB 2.0 is supported');
    if (dv.getUint32(8, true) > buffer.byteLength) throw new Error('Truncated GLB');
    let json = null, bin = null;
    for (let off = 12; off + 8 <= buffer.byteLength;) {
      const len = dv.getUint32(off, true);
      const type = dv.getUint32(off + 4, true);
      const start = off + 8;
      if (start + len > buffer.byteLength) throw new Error('Truncated GLB chunk');
      if (type === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, len)));
      } else if (type === 0x004e4942) {
        bin = new Uint8Array(buffer, start, len);
      }
      off = start + len;
    }
    if (!json || !bin || !json.meshes || !json.nodes) {
      throw new Error('GLB needs a BIN chunk, nodes, and meshes');
    }
    return { json, bin };
  }

  function getTpPrototypes(g) {
    let groupCtor = null, meshCtor = null, geometryCtor = null, attributeCtor = null;
    let attributeTemplate = null, materialCtor = null, textureCtor = null, textureSource = null;
    g.scene.traverse(o => {
      if (!groupCtor && o.isGroup && !o.isScene && o.matrix && o.add) groupCtor = o.constructor;
      if (!meshCtor && o.isMesh && o.geometry && o.geometry.attributes &&
          o.geometry.attributes.position) {
        meshCtor = o.constructor;
        geometryCtor = o.geometry.constructor;
        const attrs = o.geometry.attributes;
        const candidates = [attrs.position].concat(Object.values(attrs));
        const candidate = candidates.find(a => a && a.array && a.isBufferAttribute &&
          !a.isGLBufferAttribute && !a.isInstancedBufferAttribute);
        if (!attributeCtor && candidate) {
          attributeCtor = candidate.constructor;
          attributeTemplate = candidate;
        }
      }
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) {
        if (!materialCtor && m.color && 'roughness' in m && 'metalness' in m) {
          materialCtor = m.constructor;
        }
        if (!materialCtor && m.isMaterial) materialCtor = m.constructor;
        if (!textureCtor && m.map) {
          textureCtor = m.map.constructor;
          textureSource = m.map;
        }
      }
    });
    if (!groupCtor && g.previewAgent && g.previewAgent.root &&
        g.previewAgent.root.matrix && g.previewAgent.root.add) {
      groupCtor = g.previewAgent.root.constructor;
    }
    if (!groupCtor || !meshCtor || !geometryCtor || !attributeCtor || !materialCtor) {
      throw new Error('Could not capture Three.js constructors from the game');
    }
    return {
      groupCtor, meshCtor, geometryCtor, attributeCtor, attributeTemplate,
      materialCtor, textureCtor, textureSource
    };
  }

  function makeGlbAttribute(proto, array, itemSize) {
    let attribute = null;
    try { attribute = new proto.attributeCtor(array, itemSize); } catch (e) {}
    if (attribute && attribute.isBufferAttribute && attribute.array === array &&
        attribute.count === array.length / itemSize) return attribute;
    if (proto.attributeTemplate && proto.attributeTemplate.clone) {
      attribute = proto.attributeTemplate.clone();
      attribute.array = array;
      attribute.itemSize = itemSize;
      attribute.count = array.length / itemSize;
      attribute.normalized = false;
      attribute.needsUpdate = true;
      return attribute;
    }
    throw new Error('Could not create a usable Three.js buffer attribute');
  }

  function accessorShape(type) {
    if (type === 'SCALAR') return 1;
    if (type === 'VEC2') return 2;
    if (type === 'VEC3') return 3;
    if (type === 'VEC4') return 4;
    if (type === 'MAT4') return 16;
    throw new Error('Unsupported accessor type: ' + type);
  }

  function readAccessor(json, bin, accessorIndex) {
    const a = json.accessors && json.accessors[accessorIndex];
    if (!a) throw new Error('Missing accessor ' + accessorIndex);
    const view = json.bufferViews && json.bufferViews[a.bufferView];
    if (!view) throw new Error('Missing buffer view ' + a.bufferView);
    const comps = accessorShape(a.type);
    const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
    const compSize = sizes[a.componentType];
    if (!compSize) throw new Error('Unsupported component type: ' + a.componentType);
    const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const base = (view.byteOffset || 0) + (a.byteOffset || 0);
    const stride = view.byteStride || compSize * comps;
    const read = (off, type) => {
      if (type === 5120) return dv.getInt8(off);
      if (type === 5121) return dv.getUint8(off);
      if (type === 5122) return dv.getInt16(off, true);
      if (type === 5123) return dv.getUint16(off, true);
      if (type === 5125) return dv.getUint32(off, true);
      return dv.getFloat32(off, true);
    };
    const normalized = !!a.normalized && a.componentType !== 5126 &&
      a.componentType !== 5125;
    const Ctor = normalized ? Float32Array :
      ({ 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
         5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array })[a.componentType];
    const out = new Ctor(a.count * comps);
    for (let i = 0; i < a.count; i++) {
      for (let c = 0; c < comps; c++) {
        const src = base + i * stride + c * compSize;
        if (src + compSize > bin.byteLength) throw new Error('Accessor exceeds BIN chunk');
        let value = read(src, a.componentType);
        if (normalized) {
          if (a.componentType === 5120) value = Math.max(value / 127, -1);
          else value /= a.componentType === 5121 ? 255 : 65535;
        }
        out[i * comps + c] = value;
      }
    }
    return { array: out, itemSize: comps, componentType: a.componentType, normalized };
  }

  function decodeImageBlob(blob) {
    if (window.createImageBitmap) {
      return createImageBitmap(blob).catch(() => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
      }));
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  async function loadGlbTexture(json, bin, imageIndex, proto) {
    const def = json.images && json.images[imageIndex];
    if (!def) throw new Error('Missing image ' + imageIndex);
    let blob;
    if (def.bufferView != null) {
      const view = json.bufferViews && json.bufferViews[def.bufferView];
      if (!view) throw new Error('Missing image buffer view');
      const start = view.byteOffset || 0;
      blob = new Blob([bin.subarray(start, start + view.byteLength)],
        { type: def.mimeType || 'application/octet-stream' });
    } else if (def.uri) {
      if (def.uri.startsWith('data:')) {
        blob = await (await fetch(def.uri)).blob();
      } else {
        blob = await (await fetch(def.uri)).blob();
      }
    } else {
      throw new Error('GLB image has no data source');
    }
    if (!proto.textureCtor) throw new Error('Embedded image found, but no Texture constructor');
    const image = await decodeImageBlob(blob);
    const texture = new proto.textureCtor(image);
    const sampler = json.samplers && json.samplers[def.sampler] || {};
    texture.flipY = false;
    texture.colorSpace = proto.textureSource && proto.textureSource.colorSpace || 'srgb';
    texture.wrapS = sampler.wrapS || 10497;
    texture.wrapT = sampler.wrapT || 10497;
    texture.magFilter = sampler.magFilter || 9729;
    texture.minFilter = sampler.minFilter || 9729;
    texture.anisotropy = 1;
    texture.name = (json.textures && json.textures[0] && json.textures[0].name) || 'glb-texture';
    texture.needsUpdate = true;
    return { texture, image };
  }

  function makeGlbMaterial(proto, def, texture) {
    if (!def) def = {};
    const m = new proto.materialCtor();
    const pbr = def.pbrMetallicRoughness || {};
    const color = pbr.baseColorFactor || [1, 1, 1, 1];
    if (m.color && m.color.setRGB) m.color.setRGB(color[0], color[1], color[2]);
    if ('vertexColors' in m) m.vertexColors = false;
    if ('map' in m) m.map = texture || null;
    if ('metalness' in m) m.metalness = pbr.metallicFactor == null ? 0 : pbr.metallicFactor;
    if ('roughness' in m) m.roughness = pbr.roughnessFactor == null ? 1 : pbr.roughnessFactor;
    if ('emissive' in m && m.emissive && m.emissive.setRGB && def.emissiveFactor) {
      m.emissive.setRGB(def.emissiveFactor[0], def.emissiveFactor[1], def.emissiveFactor[2]);
    }
    if ('side' in m) m.side = def.doubleSided ? 2 : 0;
    const alpha = def.alphaMode || 'OPAQUE';
    if ('transparent' in m) m.transparent = alpha === 'BLEND';
    if ('alphaTest' in m) m.alphaTest = alpha === 'MASK' ? (pbr.alphaCutoff || 0.5) : 0;
    m.needsUpdate = true;
    return m;
  }

  function makeGlbGeometry(proto, json, bin, primitive) {
    if (primitive.mode != null && primitive.mode !== 4) {
      throw new Error('Only triangle GLB primitives are supported');
    }
    const attrs = primitive.attributes || {};
    if (attrs.POSITION == null) throw new Error('GLB primitive is missing POSITION');
    const pos = readAccessor(json, bin, attrs.POSITION);
    if (pos.itemSize !== 3) throw new Error('POSITION must be VEC3');
    const geom = new proto.geometryCtor();
    geom.__oGlbPosition = pos.array;
    const threeNames = {
      POSITION: 'position', NORMAL: 'normal', TANGENT: 'tangent',
      TEXCOORD_0: 'uv', TEXCOORD_1: 'uv1', TEXCOORD_2: 'uv2',
      TEXCOORD_3: 'uv3', COLOR_0: 'color'
    };
    const setAttr = (name, index, expectedSize) => {
      if (index == null) return;
      const data = readAccessor(json, bin, index);
      if (data.itemSize !== expectedSize) throw new Error(name + ' has the wrong item size');
      geom.setAttribute(threeNames[name] || name, makeGlbAttribute(proto, data.array, data.itemSize));
    };
    setAttr('POSITION', attrs.POSITION, 3);
    setAttr('NORMAL', attrs.NORMAL, 3);
    setAttr('TANGENT', attrs.TANGENT, 4);
    setAttr('TEXCOORD_0', attrs.TEXCOORD_0, 2);
    setAttr('TEXCOORD_1', attrs.TEXCOORD_1, 2);
    if (attrs.TEXCOORD_2 != null) setAttr('TEXCOORD_2', attrs.TEXCOORD_2, 2);
    if (attrs.TEXCOORD_3 != null) setAttr('TEXCOORD_3', attrs.TEXCOORD_3, 2);
    if (attrs.COLOR_0 != null) {
      const color = readAccessor(json, bin, attrs.COLOR_0);
      if (color.itemSize !== 3 && color.itemSize !== 4) {
        throw new Error('COLOR_0 must be VEC3 or VEC4');
      }
      geom.setAttribute('color', makeGlbAttribute(proto, color.array, color.itemSize));
    }
    if (primitive.indices != null) {
      const index = readAccessor(json, bin, primitive.indices);
      if (index.itemSize !== 1 || ![5121, 5123, 5125].includes(index.componentType)) {
        throw new Error('Primitive indices must be u8, u16, or u32');
      }
      geom.setIndex(makeGlbAttribute(proto, index.array, 1));
    } else {
      const count = pos.array.length / 3;
      const index = count > 65535 ? new Uint32Array(count) : new Uint16Array(count);
      for (let i = 0; i < count; i++) index[i] = i;
      geom.setIndex(makeGlbAttribute(proto, index, 1));
    }
    for (const name in geom.attributes) {
      const attr = geom.attributes[name];
      if (!attr || !attr.array || typeof attr.array.byteLength !== 'number') {
        throw new Error('Invalid GLB ' + name + ' buffer attribute');
      }
    }
    if (geom.index && (!geom.index.array || typeof geom.index.array.byteLength !== 'number')) {
      throw new Error('Invalid GLB index buffer attribute');
    }
    if (!geom.attributes.normal && geom.computeVertexNormals) geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    return geom;
  }

  function glbComposeMatrix(def) {
    if (def.matrix) return Array.from(def.matrix);
    const p = def.translation || [0, 0, 0];
    const q = def.rotation || [0, 0, 0, 1];
    const s = def.scale || [1, 1, 1];
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return [
      (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
      (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
      (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
      p[0], p[1], p[2], 1
    ];
  }

  function multiplyGlbMatrices(a, b) {
    const out = new Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] = a[row] * b[col * 4] +
          a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] +
          a[12 + row] * b[col * 4 + 3];
      }
    }
    return out;
  }

  function computeGlbWorldMatrices(json, roots) {
    const worlds = new Array(json.nodes.length);
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const visit = (index, parent) => {
      if (index < 0 || index >= json.nodes.length) return;
      worlds[index] = multiplyGlbMatrices(parent, glbComposeMatrix(json.nodes[index]));
      for (const child of json.nodes[index].children || []) visit(child, worlds[index]);
    };
    for (const root of roots) visit(root, identity);
    return worlds;
  }

  function expandGlbBounds(bounds, geom, matrix) {
    const position = geom && geom.attributes && geom.attributes.position;
    const values = geom && geom.__oGlbPosition ||
      geom && geom.attributes && geom.attributes.position.array;
    const itemSize = position && position.itemSize || 3;
    const e = matrix && (matrix.elements || matrix);
    if (!values || !e || itemSize < 3) return 0;
    let valid = 0;
    for (let i = 0; i + 2 < values.length; i += itemSize) {
      const x = values[i], y = values[i + 1], z = values[i + 2];
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) ||
          !Number.isFinite(e[0]) || !Number.isFinite(e[4]) || !Number.isFinite(e[8]) ||
          !Number.isFinite(e[1]) || !Number.isFinite(e[5]) || !Number.isFinite(e[9]) ||
          !Number.isFinite(e[2]) || !Number.isFinite(e[6]) || !Number.isFinite(e[10]) ||
          !Number.isFinite(e[12]) || !Number.isFinite(e[13]) || !Number.isFinite(e[14])) continue;
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
      const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      if (!Number.isFinite(wx) || !Number.isFinite(wy) || !Number.isFinite(wz)) continue;
      bounds.minX = Math.min(bounds.minX, wx);
      bounds.minY = Math.min(bounds.minY, wy);
      bounds.minZ = Math.min(bounds.minZ, wz);
      bounds.maxX = Math.max(bounds.maxX, wx);
      bounds.maxY = Math.max(bounds.maxY, wy);
      bounds.maxZ = Math.max(bounds.maxZ, wz);
      valid++;
    }
    return valid;
  }

  function glbModelUpCorrection(json) {
    const extras = json && json.asset && json.asset.extras;
    const source = String(extras && (extras.source || extras.title) || '').toLowerCase();
    return source.includes('animated-civilian-helicopter') ? Math.PI / 2 : 0;
  }

  async function buildTpAsset(g, buffer) {
    const parsed = parseGlb(buffer);
    const json = parsed.json, bin = parsed.bin;
    if ((json.extensionsRequired || []).includes('KHR_draco_mesh_compression') ||
        (json.extensionsUsed || []).includes('KHR_draco_mesh_compression')) {
      throw new Error('Draco-compressed GLB is not supported. Use an uncompressed GLB with regular bufferViews.');
    }
    const proto = getTpPrototypes(g);
    const textures = [], images = [], materials = [], geometries = [], meshes = [];
    const asset = { textures, images, materials, geometries, meshes, root: null, walkBlend: 0 };
    try {
      for (let i = 0; i < (json.materials || []).length; i++) {
        const def = json.materials[i];
        const pbr = def.pbrMetallicRoughness || {};
        const imageIndex = pbr.baseColorTexture && pbr.baseColorTexture.index;
        let texture = null;
        if (imageIndex != null) {
          const loaded = await loadGlbTexture(json, bin, imageIndex, proto);
          texture = loaded.texture;
          textures.push(texture);
          images.push(loaded.image);
        }
        materials.push(makeGlbMaterial(proto, def, texture));
      }
      if (!materials.length) materials.push(makeGlbMaterial(proto, null, null));
      const content = new proto.groupCtor();
      content.name = 'GLB content';
      const nodes = json.nodes.map((def, index) => {
        const node = new proto.groupCtor();
        node.name = def.name || ('node-' + index);
        if (def.matrix) {
          node.matrix.fromArray(def.matrix);
          node.matrix.decompose(node.position, node.quaternion, node.scale);
        } else {
          if (def.translation) node.position.fromArray(def.translation);
          if (def.rotation) node.quaternion.fromArray(def.rotation).normalize();
          if (def.scale) node.scale.fromArray(def.scale);
        }
        return node;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (const child of json.nodes[i].children || []) {
          if (nodes[child]) nodes[i].add(nodes[child]);
        }
      }
      const sceneDef = json.scenes && json.scenes[json.scene || 0];
      const roots = sceneDef && sceneDef.nodes ? sceneDef.nodes :
        nodes.map((_, i) => i).filter(i =>
          !nodes.some((_, j) => (json.nodes[j].children || []).includes(i)));
      const worldNodeMatrices = computeGlbWorldMatrices(json, roots);
      for (let i = 0; i < nodes.length; i++) {
        const nodeDef = json.nodes[i];
        const meshDef = json.meshes[nodeDef.mesh];
        if (!meshDef) continue;
        for (const primitive of meshDef.primitives || []) {
          const geometry = makeGlbGeometry(proto, json, bin, primitive);
          const material = materials[primitive.material == null ? 0 : primitive.material];
          const mesh = new proto.meshCtor(geometry, material);
          const meshLabel = meshDef.name || nodeDef.name || 'GLB mesh';
          mesh.name = meshLabel + '-' + geometries.length;
          const rotorMatch = /^(Cube\.003|Cube\.006|Cube\.009)_/i.test(meshLabel);
          let rotorOffset = null;
          if (rotorMatch) {
            const box = geometry.boundingBox;
            const cx = box ? (box.min.x + box.max.x) * 0.5 : 0;
            const cy = box ? (box.min.y + box.max.y) * 0.5 : 0;
            const cz = box ? (box.min.z + box.max.z) * 0.5 : 0;
            rotorOffset = [cx, cy, cz];
            if (geometry.translate) geometry.translate(-cx, -cy, -cz);
            mesh.position.set(cx, cy, cz);
            mesh.userData.__outcomeHelicopterRotor = {
              axis: 'y',
              direction: /Cube\.009/i.test(meshLabel) ? -1 : 1
            };
          }
          mesh.__oGlbWorld = rotorOffset ? multiplyGlbMatrices(worldNodeMatrices[i], [
            1, 0, 0, rotorOffset[0], 0, 1, 0, rotorOffset[1], 0, 0, 1, rotorOffset[2], 0, 0, 0, 1
          ]) : worldNodeMatrices[i];
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          geometries.push(geometry);
          meshes.push(mesh);
          nodes[i].add(mesh);
        }
      }
      if (!meshes.length) throw new Error('GLB contains no mesh primitives');
      if (geometries.some(geometry => geometry.attributes.color)) {
        for (const material of materials) {
          if ('vertexColors' in material) material.vertexColors = true;
        }
      }
      for (const index of roots) if (nodes[index]) content.add(nodes[index]);
      content.updateMatrixWorld(true);
      const bounds = { minX: Infinity, minY: Infinity, minZ: Infinity,
        maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
      let validVertices = 0;
      for (const mesh of meshes) {
        validVertices += expandGlbBounds(bounds, mesh.geometry, mesh.__oGlbWorld || mesh.matrixWorld);
      }
      const rawHeight = bounds.maxY - bounds.minY;
      if (!(rawHeight > 0) || !Number.isFinite(rawHeight)) {
        const diagnostic = {
          bounds: bounds,
          rawHeight: rawHeight,
          validVertices: validVertices,
          roots: roots,
          constructors: {
            group: proto.groupCtor && proto.groupCtor.name,
            mesh: proto.meshCtor && proto.meshCtor.name,
            geometry: proto.geometryCtor && proto.geometryCtor.name
          },
          meshes: meshes.slice(0, 4).map(mesh => {
            const p = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
            const b = mesh.geometry && mesh.geometry.boundingBox;
            const w = mesh.__oGlbWorld || mesh.matrixWorld;
            const e = w && (w.elements || w);
            return {
              name: mesh.name,
              count: p && p.count,
              itemSize: p && p.itemSize,
              arrayLength: p && p.array && p.array.length,
              box: b && { min: b.min, max: b.max },
              world: e && Array.from(e)
            };
          })
        };
        const detail = JSON.stringify(diagnostic);
        console.error('[OUTCOME] custom TP bounds diagnostic:', diagnostic);
        throw new Error('GLB has an invalid world bounding box; ' + detail);
      }
      const root = new proto.groupCtor();
      const pivot = new proto.groupCtor();
      const orientation = new proto.groupCtor();
      const centering = new proto.groupCtor();
      root.name = 'Custom TP model';
      pivot.name = 'Model yaw';
      orientation.name = 'Model axis correction';
      centering.name = 'Model normalization';
      root.add(pivot);
      pivot.add(orientation);
      orientation.add(centering);
      centering.add(content);
      asset.root = root;
      asset.pivot = pivot;
      asset.orientation = orientation;
      asset.centering = centering;
      asset.content = content;
      asset.bounds = bounds;
      asset.rawHeight = rawHeight;
      asset.modelUpCorrection = glbModelUpCorrection(json);
      asset.modelYawOffset = asset.modelUpCorrection ? HELICOPTER_CUSTOM_YAW_OFFSET : 0;
      asset.triangles = geometries.reduce((n, g) => n + (g.index ? g.index.count : 0) / 3, 0);
      applyTpAssetTransform(asset);
      return asset;
    } catch (e) {
      disposeTpAsset(asset);
      throw e;
    }
  }

  function applyTpAssetTransform(asset) {
    if (!asset || !asset.centering) return;
    if (asset.orientation) asset.orientation.rotation.x = 0;
    const b = asset.bounds;
    const scale = CFG.misc.tpModelHeight / asset.rawHeight;
    asset.pivot.rotation.y = CFG.misc.tpModelYaw * Math.PI / 180;
    asset.centering.scale.setScalar(scale);
    asset.centering.position.set(
      -(b.minX + b.maxX) * 0.5 * scale,
      -b.minY * scale,
      -(b.minZ + b.maxZ) * 0.5 * scale
    );
    asset.scale = scale;
  }

  function disposeTpAsset(asset) {
    if (!asset) return;
    if (asset.root && asset.root.parent) asset.root.parent.remove(asset.root);
    const seenGeo = new Set(), seenMat = new Set(), seenTex = new Set();
    for (const g of asset.geometries || []) {
      if (!g || seenGeo.has(g)) continue;
      seenGeo.add(g);
      g.dispose();
    }
    for (const m of asset.materials || []) {
      if (!m || seenMat.has(m)) continue;
      seenMat.add(m);
      for (const t of [m.map, m.normalMap, m.aoMap, m.emissiveMap, m.metalnessMap, m.roughnessMap]) {
        if (t && !seenTex.has(t)) { seenTex.add(t); t.dispose(); }
      }
      m.dispose();
    }
    for (const t of asset.textures || []) {
      if (t && !seenTex.has(t)) { seenTex.add(t); t.dispose(); }
    }
    for (const image of asset.images || []) {
      if (image && typeof image.close === 'function') image.close();
    }
  }

  async function loadTpModelFile(file) {
    const gen = ++tpCustom.generation;
    const g = window.game;
    tpCustom.busy = true;
    modelPick.disabled = true;
    modelFileName.textContent = file.name;
    setTpModelStatus('Loading ' + file.name + '...');
    try {
      if (!g || !g.scene) throw new Error('Game is not ready');
      const buffer = await file.arrayBuffer();
      if (gen !== tpCustom.generation) return;
      const asset = await buildTpAsset(g, buffer);
      if (gen !== tpCustom.generation) { disposeTpAsset(asset); return; }
      const old = tpCustom.asset;
      tpCustom.asset = asset;
      tpCustom.name = file.name;
      if (old) disposeTpAsset(old);
      asset.root.visible = false;
      CFG.misc.tp = true;
      syncAll();
      modelClear.disabled = false;
      setTpModelStatus('Loaded ' + file.name + ' - ' +
        Math.round(asset.triangles).toLocaleString() + ' triangles - ' +
        CFG.misc.tpModelHeight.toFixed(2) + 'm');
    } catch (e) {
      console.error('[OUTCOME] custom TP model failed:', e);
      const reason = e && e.message ? e.message : String(e);
      if (tpCustom.asset) {
        modelFileName.textContent = tpCustom.name;
        setTpModelStatus('Load failed: ' + reason + ' - keeping ' + tpCustom.name);
      } else {
        modelFileName.textContent = 'No file selected';
        setTpModelStatus('Load failed: ' + reason);
      }
    } finally {
      if (gen === tpCustom.generation) {
        tpCustom.busy = false;
        modelPick.disabled = false;
      }
    }
  }

  function clearTpModel() {
    tpCustom.generation++;
    tpCustom.busy = false;
    modelPick.disabled = false;
    const old = tpCustom.asset;
    tpCustom.asset = null;
    tpCustom.name = '';
    if (old) disposeTpAsset(old);
    modelFileName.textContent = 'No file selected';
    modelClear.disabled = true;
    setTpModelStatus('Static GLB: indexed geometry, embedded PNG textures.');
  }

  /* third-person body: adopt game.previewAgent (same Nm rig bots use) */
  let tpLast = 0;
  function tpActive(g) {
    return !!(CFG.misc.tp && g && g.player && g.player.alive &&
      CFG.states.indexOf(g.state) !== -1 && !g._topCam && !helicopterState.occupied);
  }

  function releasePreviewBody(g) {
    if (!g.__tpAg) return;
    const a = g.__tpAg;
    g.__tpAg = null;
    g.__tpAgW = null;
    tpLast = 0;
    try {
      if (a.root) {
        a.root.visible = false;
        if (g.previewScene && a.root.parent !== g.previewScene) g.previewScene.add(a.root);
      }
    } catch (e) {}
  }

  function tpBody(g, on) {
    const custom = tpCustom.asset;
    if (on && custom) {
      releasePreviewBody(g);
      try {
        if (custom.root.parent !== g.scene) g.scene.add(custom.root);
        custom.root.visible = true;
      } catch (e) {}
      return;
    }
    if (on) {
      const ag = g.previewAgent;
      if (!ag) {
        if (!g._previewAgentPending && typeof g._loadPreviewAgent === 'function') {
          try { g._loadPreviewAgent(g.player.team); } catch (e) {}
        }
        return;
      }
      if (g.__tpAg !== ag) {
        g.__tpAg = ag;
        g.__tpAgW = null;
        tpLast = 0;
        try { if (ag.root && ag.root.parent !== g.scene) g.scene.add(ag.root); } catch (e) {}
      }
      try { if (ag.root) ag.root.visible = true; } catch (e) {}
      const wid = g.weapons && g.weapons.current;
      if (wid && g.__tpAgW !== wid && typeof ag.setWeapon === 'function') {
        g.__tpAgW = wid;
        try { ag.setWeapon(wid); } catch (e) {}
      }
    } else {
      releasePreviewBody(g);
      if (custom) {
        try {
          custom.root.visible = false;
          if (custom.root.parent) custom.root.parent.remove(custom.root);
        } catch (e) {}
      }
    }
  }

  function driveTpBody(g) {
    const p = g.player;
    if (!p) return;
    try {
      const now = performance.now();
      let dt = (now - tpLast) / 1000;
      tpLast = now;
      if (!(dt > 0)) return;
      if (dt > 0.1) dt = 0.1;
      const custom = tpCustom.asset;
      if (custom) {
        applyTpAssetTransform(custom);
        const speed = Math.hypot(p.vx || 0, p.vz || 0);
        const targetWalk = speed > 0.2 ? Math.min(1, speed / 5.5) : 0;
        const currentWalk = custom.walkBlend || 0;
        const response = 1 - Math.exp(-dt * (targetWalk > currentWalk ? 10 : 14));
        const walk = currentWalk + (targetWalk - currentWalk) * response;
        custom.walkBlend = walk;
        if (CFG.misc.tpModelBob) {
          const amount = Math.max(0, CFG.misc.tpModelWalk);
          tpModelPhase += dt * (3 + speed * 1.15);
          const step = tpModelPhase * 2;
          const bob = Math.sin(step) * (0.004 + walk * 0.028) * amount;
          const roll = Math.sin(tpModelPhase) * walk * 0.035 * amount;
          const lean = walk * 0.045 * amount;
          custom.root.position.y = p.y + bob;
          custom.pivot.rotation.z = roll;
          custom.centering.rotation.x = -lean;
        } else {
          custom.root.position.y = p.y;
          custom.pivot.rotation.z = 0;
          custom.centering.rotation.x = 0;
        }
        custom.root.position.x = p.x;
        custom.root.position.z = p.z;
        custom.root.rotation.y = p.yaw;
        return;
      }
      const a = g.__tpAg;
      if (!a) return;
      a.setTransform(p.x, p.y, p.z, p.yaw);
      if (a.update) a.update(dt, {
        vx: p.vx || 0, vz: p.vz || 0, airborne: !p.onGround,
        crouch: p.crouching ? 1 : 0, pitch: p.pitch || 0,
        flashed: 0, defusing: false, planting: false
      });
    } catch (e) {}
  }

  function applyThirdPerson(g) {
    const p = g.player, cam = g.camera;
    if (!p || !cam) return;
    const cp = Math.cos(p.pitch);
    const fx = -Math.sin(p.yaw) * cp;
    const fy = Math.sin(p.pitch);
    const fz = -Math.cos(p.yaw) * cp;
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const ex = p.x, ey = p.y + p.eyeH, ez = p.z;
    let d = CFG.misc.tpDist;
    const phys = g.physics;
    if (phys && phys.raycast) {
      try {
        const hit = phys.raycast(ex, ey, ez, -fx, -fy, -fz, d + 0.3);
        if (hit && hit.t != null) d = Math.max(0.4, hit.t - 0.25);
      } catch (e) {}
    }
    cam.position.set(
      ex - fx * d + rx * CFG.misc.tpShoulder,
      ey - fy * d + 0.1,
      ez - fz * d + rz * CFG.misc.tpShoulder
    );
  }

  function setViewmodelVisible(g, vis) {
    try {
      const vm = g.viewmodel;
      if (!vm) return;
      if (vm.scene) vm.scene.visible = vis;
      const root = vm.root || vm.clonesRoot || vm.group;
      if (root) root.visible = vis;
    } catch (e) {}
  }

  function hookMisc(g) {
    const inp0 = g.input;
    if (inp0 && !inp0.__oWPA && typeof inp0.wasPressedA === 'function') {
      inp0.__oWPA = true;
      const ow = inp0.wasPressedA;
      inp0.wasPressedA = function (a) {
        if (a === 'jump' && jumpHeld(g)) {
          return true;
        }
        return ow.call(this, a);
      };
    }
    const w = g.weapons;
    if (w && !w.__oMisc && w.maxSpeed && w.spread) {
      w.__oMisc = true;
      const om = w.maxSpeed, os = w.spread;
      w.maxSpeed = function () {
        const b = om.call(this);
        return CFG.misc.speed ? b * CFG.misc.speedMult : b;
      };
      w.spread = function () {
        return CFG.misc.noSpread ? 0 : os.call(this);
      };
    }
    const vm = g.viewmodel;
    if (vm && !vm.__oKick && vm.kick) {
      vm.__oKick = true;
      const ok = vm.kick;
      vm.kick = function (a) {
        if (CFG.misc.noRecoil) return;
        return ok.call(this, a);
      };
    }
    if (!g.__oPSHooked && typeof g.playerShoot === 'function') {
      g.__oPSHooked = true;
      const ops = g.playerShoot;
      g.playerShoot = function (ent, sx, sz) {
        if (CFG.misc.noSpread) { sx = 0; sz = 0; }
        return ops.call(this, ent, sx, sz);
      };
    }
    if (!g.__oRendHooked && g.renderer && g.renderer.render) {
      g.__oRendHooked = true;
      const rend = g.renderer.render;
      g.renderer.render = function (scene, camera) {
        const droneFpv = !!(droneState.active && (CFG.drone.fpv || droneState.previewTime > 0) && droneState.camera);
        const droneView = droneFpv && scene === g.scene && camera === g.camera;
        const helicopterCamera = helicopterState.active && helicopterState.occupied &&
          (helicopterState.gunnerMode ? helicopterState.gunCamera : helicopterState.camera);
        const helicopterView = !!helicopterCamera;
        const helicopterSceneView = helicopterView && scene === g.scene && camera === g.camera;
        const vehicleView = droneFpv || helicopterView;
        try {
          if (CFG.misc.noRecoil) zeroRecoil(g);
          const tpOn = tpActive(g) && !vehicleView;
          if (vehicleView && g.viewmodel && scene === g.viewmodel.scene) return;
          if (g.viewmodel && scene === g.viewmodel.scene) {
            if (tpOn) return; // TP on: never draw the arms pass
            if (g.__vmHid) { setViewmodelVisible(g, true); g.__vmHid = false; }
          } else if (droneView || helicopterSceneView) {
            if (!g.__vmHid) { setViewmodelVisible(g, false); g.__vmHid = true; }
          } else if (tpOn && camera === g.camera) {
            applyThirdPerson(g);
            tpBody(g, true);
            driveTpBody(g);
            if (!g.__vmHid) { setViewmodelVisible(g, false); g.__vmHid = true; }
          } else if (!tpOn && !vehicleView && g.__vmHid) {
            setViewmodelVisible(g, true);
            g.__vmHid = false;
          }
        } catch (e) {}
        if (droneView) {
          const size = { width: vw, height: vh, set(w, h) { this.width = w; this.height = h; return this; } };
          if (this.getSize) this.getSize(size);
          droneState.camera.aspect = size.width / size.height;
          if (droneState.camera.updateProjectionMatrix) droneState.camera.updateProjectionMatrix();
          const rendered = rend.call(this, scene, droneState.camera);
          return rendered;
        }
        if (helicopterSceneView) {
          const size = { width: vw, height: vh, set(w, h) { this.width = w; this.height = h; return this; } };
          if (this.getSize) this.getSize(size);
          helicopterCamera.aspect = size.width / Math.max(1, size.height);
          if (helicopterCamera.updateProjectionMatrix) helicopterCamera.updateProjectionMatrix();
          const rendered = rend.call(this, scene, helicopterCamera);
          return rendered;
        }
        const rendered = rend.call(this, scene, camera);
        try { if (!helicopterState.occupied) renderDroneFeed(this, scene, camera); } catch (e) {}
        return rendered;
      };
    }
  }

  function tickMisc(g) {
    const w = g.weapons, p = g.player;
    if (CFG.misc.noRecoil) zeroRecoil(g);
    if (CFG.misc.infAmmo && w) {
      try {
        const def = w.def && w.def();
        const st = w.state && w.state();
        if (def && st && def.mag != null && st.ammo !== def.mag) {
          st.ammo = def.mag;
          if (g.hud && g.hud.updateWeapon) g.hud.updateWeapon();
        }
        if (def && st && def.reserve != null) st.reserve = def.reserve;
        if (w.reloading) { w.reloading = false; w.reloadT = 0; w._reloadQueued = false; }
      } catch (e) {}
    }
    if (CFG.misc.bhop && p && p.alive && jumpHeld(g)) {
      p.stamina = 0;
      p.jumpBuffer = 0.12; // arm every tick while held ? chain on landing
    } else if (CFG.misc.bhop && p && p.jumpBuffer > 0) {
      p.jumpBuffer = 0;    // released: bleed the buffer ? no surprise hops
    }
    if (droneState.active || helicopterState.occupied) tpBody(g, false);
    else if (!tpActive(g)) tpBody(g, false);
    if ((CFG.misc.autoFire || CFG.misc.rapid) && !menuOpen &&
        g.state === 'playing' && w) {
      const inp = g.input;
      const def = w.def && w.def();
      if (inp && inp.mouse1 && (!def || def.class !== 'grenade')) {
        if (CFG.misc.autoFire) {
          inp.mouse1Pressed = true;
          if (inp.pressed && inp.pressed.add) inp.pressed.add('Mouse1');
        }
        if (CFG.misc.rapid && w.nextFire > g.time) w.nextFire = g.time;
      }
    }
  }

  /* ---------------- loop ---------------- */
  let visualLast = 0;
  function frame() {
    requestAnimationFrame(frame);
    const g = window.game;
    if (!g || !g.player || !g.camera) return;
    const now = performance.now();
    const dt = visualLast ? Math.min(0.1, (now - visualLast) / 1000) : 0;
    visualLast = now;
    hookFire(g);
    hookMisc(g);
    if (menuOpen && g.input) {
      g.input.swallowLook(2);
      g.input.mouse1Pressed = false;
      g.input.mouse2Pressed = false;
    }
    if (g.scene) tickChams(g);
    else if (chammed.size) restoreAll();
    tickSky(g);
    frameAim(g);
    tickMisc(g);
    tickDrone(g, dt);
    tickHelicopter(g, dt);
    tickWings(g, dt);
    tickAura(g, dt);
    drawESP(g);
    drawDroneHud();
    drawHelicopterHud();
  }

  const boot = setInterval(() => {
    const g = window.game;
    if (g && g.player && g.camera) {
      clearInterval(boot);
      requestAnimationFrame(frame);
    }
  }, 250);


})();

(function () {
  'use strict';

  const SERVER_PRESETS = [
    { room: 'oasis-01', map: 'oasis', label: 'OASIS 01' },
    { room: 'oasis-02', map: 'oasis', label: 'OASIS 02' },
    { room: 'dune-01', map: 'dusker', label: 'DUNE 01' },
  ];
  const BOT_COUNT = 9; // Player + 9 bots = 5 players per team.
  const installed = { menu: null, originalPlay: null, unsubRoomStatus: null };

  function selected(menu, id, value) {
    const row = menu.querySelector('#' + id);
    if (!row) return;
    for (const button of row.querySelectorAll('button[data-v]')) {
      button.classList.toggle('sel', button.dataset.v === String(value));
    }
    if (id === 'opt-botson') {
      const on = String(value) === '1';
      try { localStorage.setItem('clutcher_bots', on ? '1' : '0'); } catch {}
      menu.classList.toggle('nobots', !on);
    }
  }

  function installStyles() {
    if (document.getElementById('lobby-ui-style')) return;
    const style = document.createElement('style');
    style.id = 'lobby-ui-style';
    style.textContent = `
      #playbottom .qrow { margin-bottom: 0; }
      #playbottom #opt-outfit, #playbottom #playsub { display: none !important; }
      #playbottom #opt-map { display: none !important; }
      #btn-play { min-height: 58px; }
      #bot-map-picker, #mp-server-picker { display: none; margin-top: 8px; }
      #bot-map-picker.show, #mp-server-picker.show { display: block; }
      .lobby-picker-title { margin: 0 0 6px; color: rgba(235,242,247,.72); font-size: 11px;
        font-weight: 800; letter-spacing: 1.8px; text-align: left; }
      .lobby-picker { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
      .lobby-picker button, .mp-server { min-width: 0; border: 1px solid rgba(255,255,255,.16);
        background: rgba(14,20,25,.88); color: #e8eff4; cursor: pointer; text-align: left;
        transition: background .15s, border-color .15s, transform .15s; }
      .lobby-picker button { padding: 10px 11px; font-size: 12px; font-weight: 800; letter-spacing: 1px; }
      .lobby-picker button:hover, .lobby-picker button:focus-visible,
      .mp-server:hover, .mp-server:focus-visible { background: rgba(61,101,128,.45); border-color: rgba(183,225,255,.72); }
      .lobby-picker button:active, .mp-server:active { transform: translateY(1px); }
      #btn-multiplayer { width: 100%; min-height: 52px; margin-top: 9px; border: 1px solid rgba(139,197,63,.62);
        background: linear-gradient(180deg, #3c6d91, #244964); color: #f3f8fb; cursor: pointer;
        font-size: 18px; font-weight: 900; letter-spacing: 2px; text-align: left; padding: 13px 16px;
        box-shadow: 0 7px 20px rgba(0,0,0,.24); }
      #btn-multiplayer:hover, #btn-multiplayer:focus-visible { background: linear-gradient(180deg, #4b82aa, #2a5878); }
      #btn-multiplayer .mp-caption { display: block; margin-top: 3px; color: rgba(235,246,255,.72);
        font-size: 10px; font-weight: 600; letter-spacing: 1.2px; }
      .mp-server { display: block; width: 100%; padding: 10px 12px; }
      .mp-server strong { display: block; color: #fff; font-size: 14px; letter-spacing: 1.4px; }
      .mp-server span { display: block; margin-top: 3px; color: #b5c4ce; font-size: 11px; letter-spacing: .6px; }
      .mp-server .mp-counts { display: block; margin-top: 2px; color: #7fd0a2; font-size: 11px;
        font-weight: 800; letter-spacing: .8px; }
      .mp-server.mp-full { opacity: .55; }
      .mp-server.mp-full .mp-counts { color: #ff9d7a; }
      .mp-server.mp-live .mp-counts { color: #ffd166; }
      @media (max-width: 520px) {
        #playbottom { width: min(92vw, 460px); }
        #btn-play { font-size: 26px; }
        .lobby-picker button { padding: 9px 7px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
  }


  function buildPickers(playbottom, menu) {
    let mapPicker = playbottom.querySelector('#bot-map-picker');
    if (!mapPicker) {
      mapPicker = document.createElement('div');
      mapPicker.id = 'bot-map-picker';
      mapPicker.innerHTML = '<div class="lobby-picker-title">SELECT MAP</div><div class="lobby-picker">' +
        '<button type="button" data-bot-map="oasis">OASIS</button>' +
        '<button type="button" data-bot-map="dusker">DUNE</button></div>';
      playbottom.appendChild(mapPicker);
    }
    mapPicker.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-bot-map]');
      if (!button || !installed.originalPlay) return;
      event.preventDefault();
      event.stopPropagation();
      selected(menu, 'opt-map', button.dataset.botMap);
      selected(menu, 'opt-botson', 1);
      selected(menu, 'opt-bots', BOT_COUNT);
      installed.originalPlay.call(playbottom.querySelector('#btn-play'));
    });

    let multiplayer = playbottom.querySelector('#btn-multiplayer');
    let serverPicker = playbottom.querySelector('#mp-server-picker');
    if (!multiplayer) {
      multiplayer = document.createElement('button');
      multiplayer.id = 'btn-multiplayer';
      multiplayer.type = 'button';
      multiplayer.innerHTML = 'MULTIPLAYER<span class="mp-caption">BOMB DEFUSE · 2V2 · CHOOSE A SERVER</span>';
      playbottom.appendChild(multiplayer);
    }
    if (!serverPicker) {
      serverPicker = document.createElement('div');
      serverPicker.id = 'mp-server-picker';
      serverPicker.innerHTML = '<div class="lobby-picker-title">MULTIPLAYER SERVERS</div>' +
        SERVER_PRESETS.map((server) => `<button class="mp-server" type="button" data-server-room="${server.room}" data-server-map="${server.map}"><strong>${server.label}</strong><span>Bomb Defuse · 2v2 · ${server.map === 'dusker' ? 'Dune' : 'Oasis'}</span><em class="mp-counts">…</em></button>`).join('');
      playbottom.appendChild(serverPicker);
    }
    multiplayer.addEventListener('click', () => {
      serverPicker.classList.toggle('show');
      mapPicker.classList.remove('show');
      refreshServerCards();
      if (window.game && window.game.audio) window.game.audio.play('uiclick');
    });
    serverPicker.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-server-room]');
      if (!button || !installed.originalPlay) return;
      event.preventDefault();
      event.stopPropagation();
      const map = button.dataset.serverMap;
      if (window.ClutcherMultiplayer && typeof window.ClutcherMultiplayer.setRoom === 'function') {
        window.ClutcherMultiplayer.setRoom(button.dataset.serverRoom);
      }
      selected(menu, 'opt-map', map);
      selected(menu, 'opt-mode', 'defusal');
      selected(menu, 'opt-botson', 0);
      selected(menu, 'opt-bots', 0);
      installed.originalPlay.call(playbottom.querySelector('#btn-play'));
    });
  }

  function renderServerCard(button, summary) {
    const counts = summary && summary.teamCounts ? summary.teamCounts : { CT: 0, T: 0 };
    const teamLimit = (summary && summary.teamLimit) || 2;
    const roomLimit = (summary && summary.roomLimit) || 4;
    const players = summary ? summary.players : 0;
    const countsEl = button.querySelector('.mp-counts');
    if (countsEl) countsEl.textContent = `${players}/${roomLimit} · CT ${counts.CT}/${teamLimit} · T ${counts.T}/${teamLimit}`;
    const full = counts.CT >= teamLimit && counts.T >= teamLimit;
    button.classList.toggle('mp-full', !!summary && full);
    button.classList.toggle('mp-live', !!summary && players > 0 && !full);
  }

  function refreshServerCards() {
    const mp = window.ClutcherMultiplayer;
    const picker = document.getElementById('mp-server-picker');
    if (!picker) return;
    for (const server of SERVER_PRESETS) {
      const button = picker.querySelector(`button[data-server-room="${server.room}"]`);
      if (button) renderServerCard(button, mp && mp.getRoomStatus ? mp.getRoomStatus(server.room) : null);
    }
  }


  function install() {
    if (installed.menu) return true;
    const game = window.game;
    const menu = game && game.hud && game.hud.menuEl;
    const playbottom = menu && menu.querySelector('#playbottom');
    const play = playbottom && playbottom.querySelector('#btn-play');
    if (!menu || !playbottom || !play || typeof play.onclick !== 'function') return false;
    installStyles();
    buildPickers(playbottom, menu);
    const label = play.querySelector('.pl-label');
    if (label) label.textContent = 'PLAY WITH BOTS';
    const outfit = playbottom.querySelector('#opt-outfit');
    if (outfit) outfit.remove();
    const playsub = playbottom.querySelector('#playsub');
    if (playsub) playsub.remove();
    const originalPlay = play.onclick;
    installed.menu = menu;
    installed.originalPlay = originalPlay;
    play.onclick = function () {
      const mapPicker = playbottom.querySelector('#bot-map-picker');
      const serverPicker = playbottom.querySelector('#mp-server-picker');
      mapPicker.classList.add('show');
      serverPicker.classList.remove('show');
      if (game.audio) game.audio.play('uiclick');
    };
    if (window.ClutcherMultiplayer) {
      const rooms = SERVER_PRESETS.map((server) => server.room);
      if (typeof window.ClutcherMultiplayer.watchRooms === 'function') window.ClutcherMultiplayer.watchRooms(rooms);
      else if (typeof window.ClutcherMultiplayer.requestRoomStatus === 'function') window.ClutcherMultiplayer.requestRoomStatus(rooms);
    }
    if (window.ClutcherMultiplayer && typeof window.ClutcherMultiplayer.onRoomStatus === 'function') {
      installed.unsubRoomStatus = window.ClutcherMultiplayer.onRoomStatus(() => refreshServerCards());
    }
    refreshServerCards();
    return true;
  }

  function syncLabel() {
    const game = window.game;
    const menu = game && game.hud && game.hud.menuEl;
    const play = menu && menu.querySelector('#btn-play');
    if (!play || play.classList.contains('loading')) return;
    const label = play.querySelector('.pl-label');
    if (label && label.textContent === 'PLAY') label.textContent = 'PLAY WITH BOTS';
  }

  const timer = setInterval(() => {
    if (install()) {
      clearInterval(timer);
      setInterval(syncLabel, 400);
    }
  }, 50);
})();

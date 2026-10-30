(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #gh-mod-panel{position:fixed;top:16px;right:16px;z-index:2147483647;width:310px;max-width:calc(100vw - 24px);max-height:calc(100vh - 32px);overflow:auto;display:none;color:#f5f3ff;background:rgba(15,10,27,.97);border:1px solid #8b5cf6;border-radius:14px;box-shadow:0 16px 55px #000a;padding:16px;font:14px/1.4 system-ui,sans-serif}
    #gh-mod-panel.open{display:block}
    #gh-mod-panel h2{font-size:17px;margin:0 0 5px;color:#c4b5fd}
    #gh-mod-panel p{font-size:12px;color:#c4bdd3;margin:5px 0 13px}
    #gh-mod-panel .gh-row{display:grid;grid-template-columns:1fr 105px;gap:12px;align-items:center;margin:10px 0}
    #gh-mod-panel label{font-weight:650}
    #gh-mod-panel input{width:100%;min-width:0;border:1px solid #51416e;border-radius:8px;background:#090611;color:white;padding:8px}
    #gh-mod-panel button{border:1px solid #a78bfa;border-radius:9px;background:#6d28d9;color:white;padding:9px 12px;font-weight:750;cursor:pointer}
    #gh-mod-panel button:hover{filter:brightness(1.15)}
    #gh-mod-panel .gh-actions{display:flex;gap:8px;margin-top:14px}
    #gh-mod-panel .gh-actions button{flex:1}
    #gh-mod-panel #gh-status{margin:12px 0 0;padding:9px;border-radius:8px;background:#ffffff0c;color:#ddd6fe;min-height:36px}
    #gh-mod-panel .gh-hotkey{color:#a78bfa;font-weight:800}
  `;
  document.head.append(style);

  const panel = document.createElement('section');
  panel.id = 'gh-mod-panel';
  panel.setAttribute('aria-label', 'Gladihoppers mod menu');
  panel.innerHTML = `
    <h2>GLADIHOPPERS MOD MENU</h2>
    <p>Single-player stat editor · Toggle with <span class="gh-hotkey">Ctrl + F3</span></p>
    <div class="gh-row"><label for="gh-health">Add health</label><input id="gh-health" type="number" min="0" max="100000" step="10" value="100"></div>
    <div class="gh-row"><label for="gh-damage">Add melee damage</label><input id="gh-damage" type="number" min="0" max="5000" step="1" value="5"></div>
    <div class="gh-row"><label for="gh-speed">Add movement speed</label><input id="gh-speed" type="number" min="0" max="100" step="0.1" value="1"></div>
    <div class="gh-row"><label for="gh-reach">Add weapon reach</label><input id="gh-reach" type="number" min="0" max="50" step="0.1" value="0.5"></div>
    <div class="gh-actions"><button id="gh-apply" type="button">APPLY STATS</button><button id="gh-reset" type="button">RESET</button></div>
    <div id="gh-status" role="status">Waiting for a single-player fight…</div>
  `;
  document.body.append(panel);

  const status = panel.querySelector('#gh-status');
  const originals = new Map();
  let classes = null;
  let lastScan = 0;
  let player = null;

  function textAt(m, ptr) {
    if (!ptr || ptr >= m.HEAPU8.length) return '';
    let out = '';
    for (let i = 0; i < 64 && m.HEAPU8[ptr + i]; i++) out += String.fromCharCode(m.HEAPU8[ptr + i]);
    return out;
  }

  function findClass(m, name, required) {
    const u = m.HEAPU32, bytes = m.HEAPU8, first = name.charCodeAt(0);
    for (let i = 2; i < u.length - 32; i++) {
      const ptr = u[i];
      if (!ptr || ptr >= bytes.length || bytes[ptr] !== first || textAt(m, ptr) !== name) continue;
      const klass = i * 4 - 8;
      const fields = u[(klass + 64) >>> 2];
      if (!fields || fields > bytes.length - 20) continue;
      const offsets = {};
      for (let j = 0; j < 100; j++) {
        const f = fields + j * 20;
        if (f + 20 > bytes.length || u[(f + 8) >>> 2] !== klass) break;
        offsets[textAt(m, u[f >>> 2])] = u[(f + 12) >>> 2];
      }
      if (required.every(key => Number.isInteger(offsets[key]))) return { klass, offsets };
    }
    return null;
  }

  function resolveClasses(m) {
    const definitions = {
      CharacterStats: ['cMaster', 'health', 'maxHealth', 'melee'],
      CharacterMaster: ['isMultiplayer', 'cStats', 'cMotor', 'battleInput'],
      BattleInput: ['cMaster', 'isP1'],
      CharacterMotor: ['cMaster', 'alive', 'maxVel', 'weaponRange']
    };
    const found = {};
    for (const [name, fields] of Object.entries(definitions)) {
      found[name] = findClass(m, name, fields);
      if (!found[name]) return null;
    }
    return found;
  }

  function isObject(m, address, type) {
    return Number.isInteger(address) && address > 0 && address + 16 < m.HEAPU8.length &&
      address % 4 === 0 && m.HEAPU32[address >>> 2] === classes[type].klass &&
      m.HEAPU32[(address + 8) >>> 2] !== 0;
  }

  function field(m, address, type, name) {
    return address + classes[type].offsets[name];
  }

  function findPlayer(m) {
    const u = m.HEAPU32;
    for (let i = 0; i < u.length; i++) {
      if (u[i] !== classes.CharacterStats.klass) continue;
      const stats = i * 4;
      const master = u[field(m, stats, 'CharacterStats', 'cMaster') >>> 2];
      if (!isObject(m, master, 'CharacterMaster')) continue;
      const input = u[field(m, master, 'CharacterMaster', 'battleInput') >>> 2];
      const motor = u[field(m, master, 'CharacterMaster', 'cMotor') >>> 2];
      if (!isObject(m, input, 'BattleInput') || !isObject(m, motor, 'CharacterMotor')) continue;
      if (u[field(m, master, 'CharacterMaster', 'cStats') >>> 2] !== stats) continue;
      if (u[field(m, input, 'BattleInput', 'cMaster') >>> 2] !== master) continue;
      if (u[field(m, motor, 'CharacterMotor', 'cMaster') >>> 2] !== master) continue;
      if (m.HEAPU8[field(m, master, 'CharacterMaster', 'isMultiplayer')] !== 0) continue;
      if (m.HEAPU8[field(m, input, 'BattleInput', 'isP1')] !== 1) continue;
      return { stats, master, input, motor };
    }
    return null;
  }

  function getRuntime() {
    const runtime = window.unityGame || window.gameInstance;
    const m = runtime && runtime.Module;
    return m && m.HEAPU32 && m.HEAPU8 && m.HEAP32 && m.HEAPF32 ? m : null;
  }

  function saveAndAdd(m, address, type, amount, cap) {
    const index = address >>> 2;
    const heap = type === 'float' ? m.HEAPF32 : m.HEAP32;
    const current = heap[index];
    if (!Number.isFinite(current)) return false;
    if (!originals.has(address)) originals.set(address, { type, value: current });
    heap[index] = Math.max(0, Math.min(cap, current + amount));
    return true;
  }

  function applyStats() {
    const m = getRuntime();
    if (!m) { status.textContent = 'The game is still loading. Try again after the fight starts.'; return; }
    const now = Date.now();
    if (!classes || now - lastScan > 3000) {
      classes = resolveClasses(m);
      lastScan = now;
    }
    if (!classes) { status.textContent = 'This game build did not expose the expected player stats.'; return; }
    player = findPlayer(m);
    if (!player) { status.textContent = 'No single-player fighter found. Start a single-player fight first.'; return; }

    const health = Math.max(0, Number(panel.querySelector('#gh-health').value) || 0);
    const damage = Math.max(0, Number(panel.querySelector('#gh-damage').value) || 0);
    const speed = Math.max(0, Number(panel.querySelector('#gh-speed').value) || 0);
    const reach = Math.max(0, Number(panel.querySelector('#gh-reach').value) || 0);

    const changes = [
      [field(m, player.stats, 'CharacterStats', 'maxHealth'), 'int', health, 100000],
      [field(m, player.stats, 'CharacterStats', 'health'), 'int', health, 100000],
      [field(m, player.stats, 'CharacterStats', 'melee'), 'int', damage, 50000],
      [field(m, player.motor, 'CharacterMotor', 'maxVel'), 'float', speed, 1000],
      [field(m, player.motor, 'CharacterMotor', 'weaponRange'), 'float', reach, 1000]
    ];
    let applied = 0;
    for (const [address, type, amount, cap] of changes) {
      if (amount > 0 && saveAndAdd(m, address, type, amount, cap)) applied++;
    }
    status.textContent = applied ? 'Stats added to your single-player fighter. Apply again to add more.' : 'Enter an amount greater than zero.';
  }

  function resetStats() {
    const m = getRuntime();
    if (!m) { status.textContent = 'Game runtime is not ready.'; return; }
    let restored = 0;
    for (const [address, saved] of originals) {
      const heap = saved.type === 'float' ? m.HEAPF32 : m.HEAP32;
      if (address + 4 <= m.HEAPU8.length) {
        heap[address >>> 2] = saved.value;
        restored++;
      }
    }
    originals.clear();
    status.textContent = restored ? 'Your original stats have been restored.' : 'No modified stats to reset.';
  }

  panel.querySelector('#gh-apply').addEventListener('click', applyStats);
  panel.querySelector('#gh-reset').addEventListener('click', resetStats);

  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      panel.classList.toggle('open');
    }
    if (event.key === 'Escape' && panel.classList.contains('open')) panel.classList.remove('open');
  }, true);

  setInterval(() => {
    if (panel.classList.contains('open')) {
      const m = getRuntime();
      if (!m) { status.textContent = 'Loading Gladihoppers…'; return; }
      const now = Date.now();
      if (!classes || now - lastScan > 3000) {
        classes = resolveClasses(m);
        lastScan = now;
      }
      if (classes) {
        player = findPlayer(m);
        if (player) status.textContent = 'Single-player fighter detected. Ready to apply stats.';
        else status.textContent = 'Start a single-player fight to enable stat editing.';
      } else status.textContent = 'Connecting to the game…';
    }
  }, 1200);
})();
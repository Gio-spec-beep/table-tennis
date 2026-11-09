// Gladihoppers career mod menu.
// Edits your saved career gladiator (GameMaster.cPlayerStats) and saves it with
// the game's own GameMaster.SaveCurrentCareer(), so upgrades last between fights
// and page reloads. Toggle with "/" or the site's MOD MENU button.
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #gh-mod-panel,#gh-mod-panel *{box-sizing:border-box}
    #gh-mod-panel{position:fixed;top:12px;right:12px;z-index:2147483647;width:360px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;display:none;color:#f5f3ff;background:rgba(15,10,27,.97);border:1px solid #8b5cf6;border-radius:14px;box-shadow:0 16px 55px #000a;padding:14px 16px;font:13px/1.35 system-ui,sans-serif}
    #gh-mod-panel.open{display:block}
    #gh-mod-panel h2{font-size:16px;margin:0 0 3px;color:#c4b5fd}
    #gh-mod-panel h3{font-size:12px;margin:14px 0 4px;color:#a78bfa;letter-spacing:.06em}
    #gh-mod-panel p{font-size:11.5px;color:#c4bdd3;margin:3px 0 8px}
    #gh-mod-panel .gh-row{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center;margin:6px 0}
    #gh-mod-panel label{font-weight:650}
    #gh-mod-panel input,#gh-mod-panel select{width:100%;min-width:0;border:1px solid #51416e;border-radius:7px;background:#090611;color:white;padding:6px 7px;font:inherit}
    #gh-mod-panel button{border:1px solid #a78bfa;border-radius:9px;background:#6d28d9;color:white;padding:9px 12px;font-weight:750;cursor:pointer;font:inherit;font-weight:750}
    #gh-mod-panel button.gh-secondary{background:transparent}
    #gh-mod-panel button:hover{filter:brightness(1.15)}
    #gh-mod-panel button:disabled{opacity:.5;cursor:not-allowed}
    #gh-mod-panel .gh-actions{display:flex;gap:8px;margin-top:12px}
    #gh-mod-panel .gh-actions button{flex:1}
    #gh-mod-panel #gh-status{margin:10px 0 0;padding:8px;border-radius:8px;background:#ffffff0c;color:#ddd6fe;min-height:34px}
    #gh-mod-panel .gh-hotkey{color:#a78bfa;font-weight:800}
  `;
  document.head.append(style);

  const SLOTS = [
    // [CharacterStats field, ItemManager array, item class, required fields, stat to show]
    ['weapon', 'weapon', 'Weapon', ['mat', 'melee', 'range'], 'melee', 'dmg'],
    ['shield', 'shield', 'Shield', ['radius', 'health', 'broken'], 'health', 'hp'],
    ['armor', 'armor', 'Armor', ['armor', 'weight', 'special'], 'armor', 'armor'],
    ['helmet', 'helmet', 'Helmet', ['armor', 'weight', 'special'], 'armor', 'armor'],
    ['gloves', 'gloves', 'Gloves', ['armor', 'weight', 'special'], 'armor', 'armor'],
    ['pants', 'pants', 'Pants', ['armor', 'weight', 'special'], 'armor', 'armor'],
    ['shoes', 'shoes', 'Shoes', ['armor', 'weight', 'special'], 'armor', 'armor']
  ];
  const label = s => s[0].toUpperCase() + s.slice(1);

  const panel = document.createElement('section');
  panel.id = 'gh-mod-panel';
  panel.setAttribute('aria-label', 'Gladihoppers mod menu');
  panel.innerHTML = `
    <h2>GLADIHOPPERS MOD MENU</h2>
    <p>Upgrades your saved career gladiator. Changes are saved and carry over to every fight. Toggle with <span class="gh-hotkey">/</span></p>
    <h3>STATS</h3>
    <div class="gh-row"><label for="gh-strength">Strength</label><input id="gh-strength" type="number" min="1" max="100" step="1"></div>
    <div class="gh-row"><label for="gh-endurance">Endurance</label><input id="gh-endurance" type="number" min="1" max="100" step="1"></div>
    <div class="gh-row"><label for="gh-maxHealth">Max health</label><input id="gh-maxHealth" type="number" min="1" max="100000" step="10"></div>
    <div class="gh-row"><label for="gh-gold">Gold</label><input id="gh-gold" type="number" min="0" max="10000000" step="100"></div>
    <div class="gh-row"><label for="gh-skillPoints">Skill points</label><input id="gh-skillPoints" type="number" min="0" max="1000" step="1"></div>
    <h3>EQUIPMENT</h3>
    ${SLOTS.map(([k]) => `<div class="gh-row"><label for="gh-${k}">${label(k)}</label><select id="gh-${k}"></select></div>`).join('')}
    <div class="gh-actions"><button id="gh-save" type="button">SAVE UPGRADES</button><button id="gh-reload" class="gh-secondary" type="button">RELOAD</button></div>
    <div id="gh-status" role="status">Loading Gladihoppers…</div>
  `;
  document.body.append(panel);

  const $ = id => panel.querySelector('#gh-' + id);
  const status = $('status');
  let messageUntil = 0;
  function say(text, hold) {
    status.textContent = text;
    messageUntil = hold ? Date.now() + 5000 : 0;
  }

  // ---- reading Unity IL2CPP memory -------------------------------------
  function getRuntime() {
    const runtime = window.unityGame || window.gameInstance;
    const m = runtime && runtime.Module;
    return m && m.HEAPU32 && m.HEAPU8 && m.HEAP32 && m.HEAPF32 ? m : null;
  }

  function textAt(m, ptr) {
    if (!ptr || ptr >= m.HEAPU8.length) return '';
    let out = '';
    for (let i = 0; i < 64 && m.HEAPU8[ptr + i]; i++) out += String.fromCharCode(m.HEAPU8[ptr + i]);
    return out;
  }

  function csString(m, ptr) {
    if (!ptr || ptr + 12 >= m.HEAPU8.length) return '';
    const len = m.HEAP32[(ptr + 8) >>> 2];
    if (len < 0 || len > 200) return '';
    let out = '';
    for (let i = 0; i < len; i++) out += String.fromCharCode(m.HEAPU16[((ptr + 12) >>> 1) + i]);
    return out;
  }

  // Finds an IL2CPP class by name and returns its field offsets.
  function findClass(m, name, required) {
    const u = m.HEAPU32, bytes = m.HEAPU8, first = name.charCodeAt(0);
    for (let i = 2; i < u.length - 32; i++) {
      const ptr = u[i];
      if (!ptr || ptr >= bytes.length || bytes[ptr] !== first || textAt(m, ptr) !== name) continue;
      const klass = i * 4 - 8;
      const fields = u[(klass + 64) >>> 2];
      if (!fields || fields > bytes.length - 20) continue;
      const offsets = {};
      for (let j = 0; j < 200; j++) {
        const f = fields + j * 20;
        if (f + 20 > bytes.length || u[(f + 8) >>> 2] !== klass) break;
        const fname = textAt(m, u[f >>> 2]), off = u[(f + 12) >>> 2];
        if (!/^[A-Za-z_<][\w<>.$`]*$/.test(fname) || off > 0xffff) break; // ran past the field list
        offsets[fname] = off;
      }
      if (required.every(key => Number.isInteger(offsets[key]))) return { klass, offsets };
    }
    return null;
  }

  function fieldsOf(m, klass) {
    const u = m.HEAPU32, fields = u[(klass + 64) >>> 2], offsets = {};
    if (!fields || fields > m.HEAPU8.length - 20) return offsets;
    for (let j = 0; j < 200; j++) {
      const f = fields + j * 20;
      if (u[(f + 8) >>> 2] !== klass) break;
      const fname = textAt(m, u[f >>> 2]), off = u[(f + 12) >>> 2];
      if (!/^[A-Za-z_<][\w<>.$`]*$/.test(fname) || off > 0xffff) break; // ran past the field list
      offsets[fname] = off;
    }
    return offsets;
  }

  let C = null; // resolved classes
  function resolve(m) {
    if (C) return C;
    const GM = findClass(m, 'GameMaster', ['cPlayerStats', 'gold', 'cSkillPoints', 'careerStage']);
    const CS = findClass(m, 'CharacterStats', ['strength', 'endurance', 'maxHealth', 'health', 'shield', 'weapon', 'name']);
    const IM = findClass(m, 'ItemManager', ['shield', 'weapon', 'helmet', 'armor']);
    if (!GM || !CS || !IM) return null;
    C = { GM, CS, IM };
    return C;
  }

  // Static singleton: klass->static_fields (offset 92 on 32-bit IL2CPP), field 0 = instance.
  const singleton = (m, cls) => {
    const statics = m.HEAPU32[(cls.klass + 92) >>> 2];
    const inst = statics && m.HEAPU32[statics >>> 2];
    return inst && m.HEAPU32[inst >>> 2] === cls.klass ? inst : 0;
  };

  function itemList(m, im, arrName, required, statName) {
    const arr = m.HEAPU32[(im + C.IM.offsets[arrName]) >>> 2];
    if (!arr) return [];
    const count = m.HEAPU32[(arr + 12) >>> 2];
    // The array's own class names its element type (Il2CppClass.element_class at +32).
    const elemKlass = m.HEAPU32[(m.HEAPU32[arr >>> 2] + 32) >>> 2];
    const cls = { offsets: fieldsOf(m, elemKlass) };
    if (!['name', 'secret', statName].concat(required).every(k => Number.isInteger(cls.offsets[k]))) return [];
    // Items are structs stored inline; field offsets include the 8-byte object header.
    const lastOff = Math.max(...Object.values(cls.offsets));
    const stride = lastOff + 4 - 8;
    const list = [];
    for (let i = 0; i < count && i < 500; i++) {
      const base = arr + 16 + i * stride - 8;
      const name = csString(m, m.HEAPU32[(base + cls.offsets.name) >>> 2]) || ('Item ' + i);
      const stat = m.HEAP32[(base + cls.offsets[statName]) >>> 2];
      const secret = m.HEAPU8[base + cls.offsets.secret];
      list.push({ id: i, name, stat, secret });
    }
    return list;
  }

  function getCareer(m) {
    if (!resolve(m)) return null;
    const gm = singleton(m, C.GM);
    if (!gm) return null;
    const ps = m.HEAPU32[(gm + C.GM.offsets.cPlayerStats) >>> 2];
    if (!ps || m.HEAPU32[ps >>> 2] !== C.CS.klass) return null;
    const im = singleton(m, C.IM);
    const name = csString(m, m.HEAPU32[(ps + C.CS.offsets.name) >>> 2]);
    return { gm, ps, im, name };
  }

  // ---- UI ----------------------------------------------------------------
  let filled = false;
  function fill() {
    const m = getRuntime();
    if (!m) { say('Loading Gladihoppers…'); return false; }
    const c = getCareer(m);
    if (!c) { say('Connecting to the game…'); return false; }
    const I = (base, off) => m.HEAP32[(base + off) >>> 2];
    $('strength').value = I(c.ps, C.CS.offsets.strength);
    $('endurance').value = I(c.ps, C.CS.offsets.endurance);
    $('maxHealth').value = I(c.ps, C.CS.offsets.maxHealth);
    $('gold').value = I(c.gm, C.GM.offsets.gold);
    $('skillPoints').value = I(c.gm, C.GM.offsets.cSkillPoints);
    for (const [field, arr, , required, statName, statLabel] of SLOTS) {
      const sel = $(field);
      const list = c.im ? itemList(m, c.im, arr, required, statName) : [];
      const current = I(c.ps, C.CS.offsets[field]);
      sel.innerHTML = '';
      for (const it of list) {
        const o = document.createElement('option');
        o.value = it.id;
        o.textContent = it.name + (it.stat ? ` (${it.stat} ${statLabel})` : '') + (it.secret ? ' ★' : '');
        sel.append(o);
      }
      if (!list.some(it => it.id === current)) {
        const o = document.createElement('option');
        o.value = current; o.textContent = 'Item ' + current;
        sel.append(o);
      }
      sel.value = current;
    }
    filled = true;
    say(c.name
      ? `Editing ${c.name}. Change anything, then SAVE UPGRADES.`
      : 'No career gladiator yet. Start a Career first, then open this menu.');
    $('save').disabled = !c.name;
    return true;
  }

  function save() {
    const m = getRuntime();
    const c = m && getCareer(m);
    if (!c) { say('The game is still loading. Try again in a moment.', true); return; }
    if (!c.name) { say('Start a Career first, then save upgrades.', true); return; }
    const num = (id, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number($(id).value) || 0)));
    const W = (base, off, v) => { m.HEAP32[(base + off) >>> 2] = v; };
    const maxHealth = num('maxHealth', 1, 100000);
    W(c.ps, C.CS.offsets.strength, num('strength', 1, 100));
    W(c.ps, C.CS.offsets.endurance, num('endurance', 1, 100));
    W(c.ps, C.CS.offsets.maxHealth, maxHealth);
    W(c.ps, C.CS.offsets.health, maxHealth); // start at full health
    W(c.gm, C.GM.offsets.gold, num('gold', 0, 10000000));
    W(c.gm, C.GM.offsets.cSkillPoints, num('skillPoints', 0, 1000));
    for (const [field] of SLOTS) W(c.ps, C.CS.offsets[field], Math.max(0, Number($(field).value) || 0));
    try {
      const game = window.unityGame || window.gameInstance;
      game.SendMessage('GameMaster', 'SaveCurrentCareer');
      game.SendMessage('GameMaster', 'SaveGold');
      say(`Saved! ${c.name}'s upgrades apply from your next fight and stay after reloading.`, true);
    } catch (e) {
      say('Changed in this session, but saving failed: ' + e.message, true);
    }
  }

  $('save').addEventListener('click', save);
  $('reload').addEventListener('click', () => { filled = false; fill(); });

  function togglePanel() {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) { filled = false; fill(); }
  }

  window.addEventListener('message', event => {
    if (event.data && event.data.type === 'GH_TOGGLE_MOD_MENU') togglePanel();
  });

  // Unity grabs every key (and cancels it) so the game can use it. While typing
  // in the menu, stop key events before Unity's listeners see them. This is
  // registered on window in the capture phase, before Unity starts, so it runs first.
  const shield = event => {
    if (event.target && panel.contains(event.target) && event.key !== 'Escape') event.stopImmediatePropagation();
  };
  ['keydown', 'keypress', 'keyup'].forEach(type => window.addEventListener(type, shield, true));

  document.addEventListener('keydown', event => {
    if (event.target && panel.contains(event.target) && event.key !== 'Escape') return;
    const slashKey = event.code === 'Slash' || event.key === '/' || event.key === '?';
    if (slashKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      togglePanel();
    }
    if (event.key === 'Escape' && panel.classList.contains('open')) panel.classList.remove('open');
  }, true);

  // Keep retrying until the game is ready while the panel is open.
  setInterval(() => {
    if (panel.classList.contains('open') && !filled && Date.now() > messageUntil) fill();
  }, 1200);
})();

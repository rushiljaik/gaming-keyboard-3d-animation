import * as THREE from 'three';

const U = 0.019;            // key pitch (m)
const CAP = 0.0172;         // 1u cap footprint
const CAP_H = 0.0072;       // cap height
const PLATE_Y = 0.0175;     // top plate surface height
const BEZEL = 0.009;

// ---- materials -------------------------------------------------------------
const matShell = new THREE.MeshStandardMaterial({
  name: 'shell_white', color: 0xf5f4f0, roughness: 0.44, metalness: 0.06
});
const matPlate = new THREE.MeshStandardMaterial({
  name: 'plate_brushed', color: 0xd8d7d2, roughness: 0.38, metalness: 0.3
});
const matBase = new THREE.MeshStandardMaterial({
  name: 'base_white', color: 0xeceae5, roughness: 0.6, metalness: 0.05
});
const matCap = new THREE.MeshStandardMaterial({
  name: 'keycap_pbt_white', color: 0xf2f1ec, roughness: 0.62, metalness: 0.04
});
const matPCB = new THREE.MeshStandardMaterial({
  name: 'pcb_copper', color: 0xb4703a, roughness: 0.42, metalness: 0.4
});
const matSolder = new THREE.MeshStandardMaterial({
  name: 'pcb_black', color: 0x191b1e, roughness: 0.75, metalness: 0.15
});
const matFoam = new THREE.MeshStandardMaterial({
  name: 'poron_foam', color: 0x2b2b2e, roughness: 0.98, metalness: 0.0
});
const matRubber = new THREE.MeshStandardMaterial({
  name: 'foot_rubber', color: 0x2b2d31, roughness: 0.95, metalness: 0.02
});
const matLabel = new THREE.MeshStandardMaterial({
  name: 'spec_label', color: 0xdcdad3, roughness: 0.7, metalness: 0.02
});
const matScrew = new THREE.MeshStandardMaterial({
  name: 'screw_steel', color: 0x7b828c, roughness: 0.35, metalness: 0.42
});
const matSwitch = new THREE.MeshStandardMaterial({
  name: 'switch_housing', color: 0x0b0d0f, roughness: 0.88, metalness: 0.04
});
const matSwitchTop = new THREE.MeshStandardMaterial({
  name: 'switch_top', color: 0xe8e6e1, roughness: 0.45, metalness: 0.03
});
const matStem = new THREE.MeshStandardMaterial({
  name: 'switch_stem', color: 0xc8443f, roughness: 0.55, metalness: 0.04
});
const matAccent = new THREE.MeshStandardMaterial({
  name: 'accent_steel', color: 0x8d949e, roughness: 0.3, metalness: 0.4
});

// 12 shared emissive hues so the OBJ/MTL export keeps readable colour names
const HUES = 12;
const rgbMats = [];
for (let i = 0; i < HUES; i++) {
  const h = i / HUES;
  const c = new THREE.Color().setHSL(h, 1.0, 0.55);
  rgbMats.push(new THREE.MeshStandardMaterial({
    name: `rgb_h${String(Math.round(h * 360)).padStart(3, '0')}`,
    color: c, emissive: c, emissiveIntensity: 3.4,
    roughness: 0.5, metalness: 0.0
  }));
}
const hueAt = (t) => rgbMats[((Math.round(t * HUES) % HUES) + HUES) % HUES];

// keycaps tinted by the LED under them — dark PBT that carries its hue
const capMats = [];
for (let i = 0; i < HUES; i++) {
  const h = i / HUES;
  const c = new THREE.Color().setHSL(h, 1.0, 0.5);
  capMats.push(new THREE.MeshStandardMaterial({
    name: `keycap_rgb_h${String(Math.round(h * 360)).padStart(3, '0')}`,
    color: 0xf2f1ec, emissive: c, emissiveIntensity: 0.055,
    roughness: 0.62, metalness: 0.04
  }));
}
const capHueAt = (t) => capMats[((Math.round(t * HUES) % HUES) + HUES) % HUES];

const ACCENT_KEYS = new Set(['esc', 'enter', 'space']);
const matCapAccent = new THREE.MeshStandardMaterial({
  name: 'keycap_pbt_black', color: 0x191c21, roughness: 0.6, metalness: 0.05
});

// ---- helpers ---------------------------------------------------------------
function roundedRect(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function slab(w, d, h, r, mat, name, curve = 2) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w, d, r), {
    depth: h, bevelEnabled: true, bevelThickness: 0.0008,
    bevelSize: 0.0008, bevelSegments: 3, curveSegments: 8 * curve
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, h, 0);
  const m = new THREE.Mesh(g, mat);
  m.name = name;
  return m;
}

function perforatedSlab(w, d, h, r, mat, name, holes) {
  const shape = roundedRect(w, d, r);
  holes.forEach(({ x, z, hw, hd }) => {
    const p = new THREE.Path();
    const y = -z;                       // shape Y maps to -Z after the rotate
    p.moveTo(x - hw / 2, y - hd / 2);
    p.lineTo(x + hw / 2, y - hd / 2);
    p.lineTo(x + hw / 2, y + hd / 2);
    p.lineTo(x - hw / 2, y + hd / 2);
    p.closePath();
    shape.holes.push(p);
  });
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h, bevelEnabled: false, curveSegments: 8
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, h, 0);
  const m = new THREE.Mesh(g, mat);
  m.name = name;
  return m;
}

// tapered keycap: 4-sided cylinder, rotated so faces align to axes
function keycap(units, name, mat) {
  const w = CAP + (units - 1) * U;
  const g = new THREE.CylinderGeometry(0.72, 0.78, CAP_H, 4, 1);
  g.rotateY(Math.PI / 4);
  const k = 0.78 * Math.SQRT2;
  g.scale(w / k, 1, CAP / k);
  const top = g.attributes.position;
  const m = new THREE.Mesh(g, mat || matCap);
  m.name = name;
  void top;
  return { mesh: m, w };
}


// ---- backlit legends -------------------------------------------------------
const LEGEND = {
  esc: 'ESC', prtsc: 'PRT', scroll: 'SCR', pause: 'PAU',
  grave: '~', k1: '1', k2: '2', k3: '3', k4: '4', k5: '5',
  k6: '6', k7: '7', k8: '8', k9: '9', k0: '0', minus: '-', equal: '=',
  backspace: 'BKSP', tab: 'TAB', lbracket: '[', rbracket: ']', backslash: '\\',
  caps: 'CAPS', semicolon: ';', quote: "'", enter: 'ENTER',
  lshift: 'SHIFT', rshift: 'SHIFT', comma: ',', period: '.', slash: '/',
  lctrl: 'CTRL', rctrl: 'CTRL', lwin: 'WIN', lalt: 'ALT', ralt: 'ALT',
  fn: 'FN', menu: 'MENU', space: 'RUSHIL',
  ins: 'INS', home: 'HOME', pgup: 'PGUP', del: 'DEL', end: 'END', pgdn: 'PGDN',
  up: '\u2191', down: '\u2193', left: '\u2190', right: '\u2192'
};
for (let i = 1; i <= 12; i++) LEGEND['f' + i] = 'F' + i;
'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c) => { LEGEND[c] = c.toUpperCase(); });

function legendTexture(text, aspect) {
  const H = 128, W = Math.max(H, Math.round(H * aspect));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const centred = text.length > 3 || aspect > 1.6;
  const size = text.length > 3 ? 42 : text.length > 1 ? 50 : 66;
  ctx.font = '600 ' + size + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  if (centred) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2 + 2);
  } else {
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(text, 16, 14);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function legend(label, w, glowColor, accent) {
  const text = LEGEND[label];
  if (!text) return null;
  const tw = w * 0.86, td = CAP * 0.86;
  const tex = legendTexture(text, tw / td);
  const mat = new THREE.MeshStandardMaterial({
    name: 'legend_' + label, map: tex, alphaMap: tex, transparent: true,
    color: accent ? 0xf4f3ef : 0x30343b,
    emissive: accent ? glowColor : 0x000000,
    emissiveMap: accent ? tex : null,
    emissiveIntensity: accent ? 0.5 : 0,
    roughness: 0.5, metalness: 0, depthWrite: false
  });
  const g = new THREE.PlaneGeometry(tw, td);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.name = 'legend_' + label;
  m.castShadow = false;
  return m;
}

// ---- layout ----------------------------------------------------------------
// each row: array of [units, label] ; null = gap of that many units
const ROWS = [
  [[1, 'esc'], [1, null], [1, 'f1'], [1, 'f2'], [1, 'f3'], [1, 'f4'], [0.5, null],
   [1, 'f5'], [1, 'f6'], [1, 'f7'], [1, 'f8'], [0.5, null],
   [1, 'f9'], [1, 'f10'], [1, 'f11'], [1, 'f12'], [0.5, null],
   [1, 'prtsc'], [1, 'scroll'], [1, 'pause']],
  [[1, 'grave'], [1, 'k1'], [1, 'k2'], [1, 'k3'], [1, 'k4'], [1, 'k5'], [1, 'k6'],
   [1, 'k7'], [1, 'k8'], [1, 'k9'], [1, 'k0'], [1, 'minus'], [1, 'equal'], [2, 'backspace'],
   [0.5, null], [1, 'ins'], [1, 'home'], [1, 'pgup']],
  [[1.5, 'tab'], [1, 'q'], [1, 'w'], [1, 'e'], [1, 'r'], [1, 't'], [1, 'y'], [1, 'u'],
   [1, 'i'], [1, 'o'], [1, 'p'], [1, 'lbracket'], [1, 'rbracket'], [1.5, 'backslash'],
   [0.5, null], [1, 'del'], [1, 'end'], [1, 'pgdn']],
  [[1.75, 'caps'], [1, 'a'], [1, 's'], [1, 'd'], [1, 'f'], [1, 'g'], [1, 'h'], [1, 'j'],
   [1, 'k'], [1, 'l'], [1, 'semicolon'], [1, 'quote'], [2.25, 'enter']],
  [[2.25, 'lshift'], [1, 'z'], [1, 'x'], [1, 'c'], [1, 'v'], [1, 'b'], [1, 'n'], [1, 'm'],
   [1, 'comma'], [1, 'period'], [1, 'slash'], [2.75, 'rshift'],
   [1.5, null], [1, 'up']],
  [[1.25, 'lctrl'], [1.25, 'lwin'], [1.25, 'lalt'], [6.25, 'space'], [1.25, 'ralt'],
   [1.25, 'fn'], [1.25, 'menu'], [1.25, 'rctrl'],
   [0.5, null], [1, 'left'], [1, 'down'], [1, 'right']]
];

// OEM-style row sculpt: rear rows lean back, front rows lean toward the typist
const ROW_TILT = [-0.05, -0.05, -0.03, 0, 0.035, 0.055];
const ROW_LIFT = [0.0005, 0.0004, 0.0001, 0, 0.0002, 0.0005];

const KEYS_W = 18.5 * U;                 // 15u main + 0.5u gap + 3u nav
const ROW_GAP = 0.5 * U;                 // between F-row and number row
const KEYS_D = 6 * U + ROW_GAP;
const BOARD_W = KEYS_W + BEZEL * 2;
const BOARD_D = KEYS_D + BEZEL * 2 + 0.008;

// exploded-view travel per layer, in metres of local +y
const EXPLODE = {
  caps: 0.132, switches: 0.104, case: 0.080, plate: 0.052,
  pcb: 0.029, foam: 0.013, base: 0
};

export const layers = [];            // THREE.Group per assembly layer
export const keyIndex = new Map();   // label -> { cap, legend, pad, hue }

export function buildKeyboard() {
  keyIndex.clear();
  const board = new THREE.Group();
  board.name = 'gaming_keyboard';

  const L = {};
  ['caps', 'switches', 'case', 'plate', 'pcb', 'foam', 'base'].forEach((n) => {
    L[n] = new THREE.Group();
    L[n].name = 'layer_' + n;
    L[n].userData.explode = EXPLODE[n];
    board.add(L[n]);
  });
  layers.length = 0;
  layers.push(...Object.values(L));

  // bottom case
  const base = slab(BOARD_W, BOARD_D, 0.0125, 0.0022, matBase, 'bottom_case');
  L.base.add(base);

  // rgb underglow channel — segmented strip around the perimeter
  const glow = new THREE.Group();
  glow.name = 'underglow';
  const halfW = BOARD_W / 2 - 0.0035, halfD = BOARD_D / 2 - 0.0035;
  const SIDES = [
    { from: [-halfW, halfD], to: [halfW, halfD] },     // front
    { from: [halfW, halfD], to: [halfW, -halfD] },     // right
    { from: [halfW, -halfD], to: [-halfW, -halfD] },   // rear
    { from: [-halfW, -halfD], to: [-halfW, halfD] }    // left
  ];
  const PERIM = 4 * (halfW + halfD);
  let walked = 0, si = 0;
  SIDES.forEach((side) => {
    const [ax, az] = side.from, [bx, bz] = side.to;
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(4, Math.round(len / 0.0085));
    const step = len / n;
    const horiz = Math.abs(bx - ax) > Math.abs(bz - az);
    for (let i = 0; i < n; i++) {
      const c = (i + 0.5) * step;
      const u = c / len;
      const x = ax + (bx - ax) * u, z = az + (bz - az) * u;
      const lit = step * 0.78;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(horiz ? lit : 0.0024, 0.0030, horiz ? 0.0024 : lit),
        hueAt((walked + c) / PERIM)
      );
      m.position.set(x, 0.0072, z);
      m.name = `underglow_${si++}`;
      glow.add(m);
    }
    walked += len;
  });
  L.base.add(glow);

  // anodized shell + inset brushed plate
  const shell = slab(BOARD_W - 0.0016, BOARD_D - 0.0016, PLATE_Y - 0.0125, 0.0018, matShell, 'top_shell');
  shell.position.y = 0.0125;
  L.case.add(shell);

  // --- internals, top-down: pcb over foam over the bottom case
  const pcb = slab(KEYS_W + 0.002, KEYS_D + 0.002, 0.0013, 0.0016, matPCB, 'pcb');
  pcb.position.set(0, 0.0121, -0.002);
  L.pcb.add(pcb);

  const mcu = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.0022, 0.014), matSolder);
  mcu.position.set(-0.055, 0.0145, -0.028);
  mcu.name = 'mcu';
  L.pcb.add(mcu);

  [[0.02, 0.03], [0.075, -0.03], [-0.11, 0.02]].forEach(([x, z], i) => {
    const ic = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0018, 0.009), matSolder);
    ic.position.set(x, 0.0143, z);
    ic.name = 'ic_' + i;
    L.pcb.add(ic);
  });

  const silk = new THREE.Mesh(new THREE.BoxGeometry(KEYS_W - 0.01, 0.0004, 0.010), matSolder);
  silk.position.set(0, 0.0136, KEYS_D / 2 - 0.008);
  silk.name = 'pcb_silkscreen';
  L.pcb.add(silk);

  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0006, 0.020), matPCB);
  ribbon.position.set(-0.02, 0.0137, -BOARD_D / 2 + 0.024);
  ribbon.name = 'ribbon_cable';
  L.pcb.add(ribbon);

  const jst = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.0026, 0.005), matSolder);
  jst.position.set(-0.02, 0.0147, -BOARD_D / 2 + 0.036);
  jst.name = 'jst_connector';
  L.pcb.add(jst);

  const daughter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0016, 0.012), matPCB);
  daughter.position.set(0, 0.0141, -BOARD_D / 2 + 0.011);
  daughter.name = 'daughterboard';
  L.pcb.add(daughter);

  const gasket = slab(BOARD_W - 0.012, BOARD_D - 0.012, 0.0018, 0.0016, matFoam, 'case_gasket');
  gasket.position.set(0, 0.0062, 0);
  L.foam.add(gasket);

  // keys
  const holeSpecs = [];
  const keys = new THREE.Group(); keys.name = 'keys';
  const switches = new THREE.Group(); switches.name = 'switches';
  const sockets = new THREE.Group(); sockets.name = 'hotswap_sockets';
  const lights = new THREE.Group(); lights.name = 'key_rgb';
  const x0 = -KEYS_W / 2;
  const z0 = -KEYS_D / 2 + BEZEL * 0 - 0.002;

  ROWS.forEach((row, ri) => {
    let cx = x0;
    const cz = z0 + ri * U + (ri >= 1 ? ROW_GAP : 0) + U / 2;
    row.forEach(([units, label]) => {
      if (label === null) { cx += units * U; return; }
      const px = cx + (units * U) / 2;
      const hueT = (px + KEYS_W / 2) / KEYS_W * 0.8 + ri * 0.045;
      const accent = ACCENT_KEYS.has(label);
      const { mesh, w } = keycap(units, `key_${label}`, accent ? matCapAccent : capHueAt(hueT));
      const lift = ROW_LIFT[ri], tilt = ROW_TILT[ri];
      mesh.position.set(px, PLATE_Y + CAP_H / 2 + 0.0046 + lift, cz);
      mesh.rotation.x = tilt;
      keys.add(mesh);

      const lg = legend(label, w, capHueAt(hueT).emissive, accent);
      if (lg) {
        lg.position.set(px, PLATE_Y + CAP_H + 0.0047 + lift, cz);
        lg.rotation.x = tilt;
        lg.position.z += tilt * CAP_H * 0.5;
        keys.add(lg);
      }

      // rgb bleed pad under the cap
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.0027, 0.0056, CAP + 0.0027),
        hueAt(hueT)
      );
      pad.position.set(px, PLATE_Y + 0.0028, cz);
      pad.name = `rgb_${label}`;
      lights.add(pad);

      // MX-style switch: bottom housing, top housing, cross stem
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.0139, 0.0050, 0.0139), matSwitch
      );
      housing.position.set(px, PLATE_Y - 0.0014, cz);
      housing.name = `switch_bottom_${label}`;
      switches.add(housing);

      const topHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.0125, 0.0042, 0.0125), matSwitchTop
      );
      topHousing.position.set(px, PLATE_Y + 0.0032, cz);
      topHousing.name = `switch_top_${label}`;
      switches.add(topHousing);

      const stem = new THREE.Mesh(
        new THREE.BoxGeometry(0.0042, 0.0034, 0.0013), matStem
      );
      stem.position.set(px, PLATE_Y + 0.0067, cz);
      stem.name = `stem_${label}`;
      switches.add(stem);
      const stem2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.0013, 0.0034, 0.0042), matStem
      );
      stem2.position.set(px, PLATE_Y + 0.0067, cz);
      stem2.name = `stem_cross_${label}`;
      switches.add(stem2);

      // hot-swap socket + solder pads on the PCB below
      const socket = new THREE.Mesh(
        new THREE.BoxGeometry(0.0094, 0.0016, 0.0044), matSolder
      );
      socket.position.set(px, 0.0142, cz + 0.0032);
      socket.name = `socket_${label}`;
      sockets.add(socket);

      // plate + foam cutout for this switch
      holeSpecs.push({ x: px, z: cz, hw: 0.0141, hd: 0.0141 });
      if (units >= 2) {
        const off = units * U * 0.365;
        holeSpecs.push({ x: px - off, z: cz, hw: 0.0068, hd: 0.0128 });
        holeSpecs.push({ x: px + off, z: cz, hw: 0.0068, hd: 0.0128 });
      }
      keyIndex.set(label, { cap: mesh, legend: lg, pad, hue: capHueAt(hueT) });
      cx += units * U;
    });
  });
  L.caps.add(keys, lights);
  L.switches.add(switches);
  L.pcb.add(sockets);

  // perforated steel plate and plate foam, cut around every switch
  const plate = perforatedSlab(KEYS_W + 0.004, KEYS_D + 0.004, 0.0014, 0.0018,
    matPlate, 'switch_plate', holeSpecs);
  plate.position.set(0, PLATE_Y - 0.0013, -0.002);
  L.plate.add(plate);

  const foam = perforatedSlab(KEYS_W - 0.002, KEYS_D - 0.002, 0.0030, 0.0016,
    matFoam, 'plate_foam', holeSpecs);
  foam.position.set(0, 0.0086, -0.002);
  L.foam.add(foam);

  // status indicators
  ['caps_lock', 'win_lock', 'game_mode'].forEach((n, i) => {
    const led = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0011, 0.0011, 0.0006, 16),
      i === 2 ? hueAt(0.33) : hueAt(0.0)
    );
    led.position.set(BOARD_W / 2 - 0.038 + i * 0.006, PLATE_Y + 0.0002, -BOARD_D / 2 + 0.0055);
    led.name = 'indicator_' + n;
    L.case.add(led);
  });

  // rear USB-C port + braided cable stub
  const port = new THREE.Mesh(new THREE.BoxGeometry(0.0092, 0.0032, 0.004), matAccent);
  port.position.set(0, 0.0105, -BOARD_D / 2 + 0.001);
  port.name = 'usb_c_port';
  L.base.add(port);

  // volume wheel, top-right
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0058, 0.0058, 0.007, 40),
    matAccent
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(BOARD_W / 2 - 0.012, PLATE_Y + 0.0005, -BOARD_D / 2 + 0.0048);
  wheel.name = 'volume_wheel';
  L.case.add(wheel);

  // --- underside: recessed panel, rubber feet, flip-out tilt feet, label, screws
  const underPanel = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_W - 0.020, 0.0010, BOARD_D - 0.020), matPlate
  );
  underPanel.position.set(0, 0.0006, 0);
  underPanel.name = 'underside_panel';
  L.base.add(underPanel);

  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.0026, 0.0085), matRubber);
    foot.position.set(sx * (BOARD_W / 2 - 0.036), -0.0009, sz * (BOARD_D / 2 - 0.017));
    foot.name = `rubber_foot_${i}`;
    L.base.add(foot);
  });

  [-1, 1].forEach((sx, i) => {
    const flip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0030, 0.014), matBase);
    flip.position.set(sx * (BOARD_W / 2 - 0.080), -0.0011, -BOARD_D / 2 + 0.026);
    flip.name = `tilt_foot_${i}`;
    L.base.add(flip);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.0014, 0.005), matRubber);
    grip.position.set(flip.position.x, -0.0023, flip.position.z);
    grip.name = `tilt_foot_grip_${i}`;
    L.base.add(grip);
  });

  const label = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0007, 0.024), matLabel);
  label.position.set(0, 0.0004, 0.012);
  label.name = 'spec_label';
  L.base.add(label);

  const channel = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.0016, 0.010), matPlate);
  channel.position.set(0, 0.0010, -BOARD_D / 2 + 0.019);
  channel.name = 'cable_channel';
  L.base.add(channel);

  [[-0.13, -0.03], [0.13, -0.03], [-0.13, 0.045], [0.13, 0.045], [0, -0.045], [0, 0.05]]
    .forEach(([x, z], i) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.0008, 20), matScrew);
      screw.position.set(x, 0.0003, z);
      screw.name = `case_screw_${i}`;
      L.base.add(screw);
    });

  // typing angle, then rest on y=0
  board.rotation.x = 0.105;
  const assembly = new THREE.Group();
  assembly.name = 'keyboard_assembly';
  assembly.add(board);
  assembly.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(assembly);
  assembly.position.y -= box.min.y;
  assembly.updateMatrixWorld(true);
  return assembly;
}

// ---- interaction -----------------------------------------------------------
const CODE_MAP = (() => {
  const m = {
    Backquote: 'grave', Minus: 'minus', Equal: 'equal', Backspace: 'backspace',
    Tab: 'tab', BracketLeft: 'lbracket', BracketRight: 'rbracket', Backslash: 'backslash',
    CapsLock: 'caps', Semicolon: 'semicolon', Quote: 'quote', Enter: 'enter',
    ShiftLeft: 'lshift', ShiftRight: 'rshift', Comma: 'comma', Period: 'period',
    Slash: 'slash', ControlLeft: 'lctrl', ControlRight: 'rctrl', MetaLeft: 'lwin',
    AltLeft: 'lalt', AltRight: 'ralt', Space: 'space', ContextMenu: 'menu',
    Escape: 'esc', PrintScreen: 'prtsc', ScrollLock: 'scroll', Pause: 'pause',
    Insert: 'ins', Home: 'home', PageUp: 'pgup', Delete: 'del', End: 'end',
    PageDown: 'pgdn', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left',
    ArrowRight: 'right'
  };
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c) => { m['Key' + c.toUpperCase()] = c; });
  for (let i = 0; i <= 9; i++) m['Digit' + i] = 'k' + i;
  for (let i = 1; i <= 12; i++) m['F' + i] = 'f' + i;
  return m;
})();

const TRAVEL = 0.0022;

/** Click keys with the mouse or type on a real keyboard; each cap dips and
 *  its LED flares, then springs back. */
export function attachInteraction(stage, board) {
  const canvas = (stage.shadowRoot || stage).querySelector('canvas');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const active = new Map();   // label -> release timestamp (ms) or Infinity while held
  const brightCache = new Map();

  function brightOf(mat) {
    if (!brightCache.has(mat)) {
      const b = mat.clone();
      b.name = mat.name + '_lit';
      b.emissiveIntensity = 0.85;
      brightCache.set(mat, b);
    }
    return brightCache.get(mat);
  }

  function press(label, hold) {
    const k = keyIndex.get(label);
    if (!k) return;
    if (!k.baseMat) k.baseMat = k.cap.material;
    k.cap.material = brightOf(k.baseMat);
    if (!k.padBase) k.padBase = k.pad.material;
    if (!k.padLit) {
      const pl = k.padBase.clone();
      pl.name = k.padBase.name + '_lit';
      pl.emissiveIntensity = 4.2;
      k.padLit = pl;
    }
    k.pad.material = k.padLit;
    if (k.restY === undefined) {
      k.restY = k.cap.position.y;
      k.restLegendY = k.legend ? k.legend.position.y : 0;
    }
    k.cap.position.y = k.restY - TRAVEL;
    if (k.legend) k.legend.position.y = k.restLegendY - TRAVEL;
    active.set(label, hold ? Infinity : performance.now() + 110);
  }

  function release(label) {
    const k = keyIndex.get(label);
    if (!k) return;
    if (k.baseMat) k.cap.material = k.baseMat;
    if (k.padBase) k.pad.material = k.padBase;
    if (k.restY !== undefined) {
      k.cap.position.y = k.restY;
      if (k.legend) k.legend.position.y = k.restLegendY;
    }
    active.delete(label);
  }

  function labelAt(ev) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, stage._camera);
    const hits = raycaster.intersectObject(board, true);
    for (const h of hits) {
      const n = h.object.name || '';
      if (n.startsWith('key_')) return n.slice(4);
      if (n.startsWith('legend_')) return n.slice(7);
    }
    return null;
  }

  let downAt = 0, downX = 0, downY = 0;
  canvas.addEventListener('pointerdown', (e) => { downAt = performance.now(); downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener('pointerup', (e) => {
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved > 4 || performance.now() - downAt > 400) return;   // that was an orbit
    const label = labelAt(e);
    if (label) press(label, false);
  });

  window.addEventListener('keydown', (e) => {
    const label = CODE_MAP[e.code];
    if (!label) return;
    e.preventDefault();
    press(label, true);
  });
  window.addEventListener('keyup', (e) => {
    const label = CODE_MAP[e.code];
    if (label) release(label);
  });
  window.addEventListener('blur', () => { [...active.keys()].forEach(release); });

  (function tick() {
    const now = performance.now();
    active.forEach((until, label) => { if (now > until) release(label); });
    requestAnimationFrame(tick);
  })();
}

/** Slide the assembly apart into its layers — keycaps, top case, switch
 *  plate, PCB, foam, bottom case — and back together. */
export function attachExplodeView(button, stage) {
  let open = false, from = 0, to = 0, t0 = 0;
  const DUR = 1100;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  function apply(k) {
    layers.forEach((g) => { g.position.y = (g.userData.explode || 0) * k; });
  }

  let baseDist = 0, baseDir = null, baseTargetY = 0;

  function tick() {
    const u = Math.min(1, (performance.now() - t0) / DUR);
    const k = from + (to - from) * ease(u);
    apply(k);
    if (stage && baseDir) {                       // pull back to keep the stack framed
      const c = stage._camera, tgt = stage._controls.target;
      tgt.y = baseTargetY + 0.055 * k;
      c.position.copy(tgt).addScaledVector(baseDir, baseDist * (1 + 0.55 * k));
      stage._controls.update();
    }
    if (u < 1) requestAnimationFrame(tick);
  }

  function toggle() {
    open = !open;
    from = layers.length ? layers[0].position.y / EXPLODE.caps : 0;
    to = open ? 1 : 0;
    t0 = performance.now();
    if (stage) {
      const c = stage._camera, tgt = stage._controls.target;
      baseTargetY = tgt.y - 0.055 * from;
      const off = c.position.clone().sub(tgt);
      baseDist = off.length() / (1 + 0.55 * from);
      baseDir = off.normalize();
    }
    button.textContent = open ? 'Reassemble' : 'Exploded view';
    button.dataset.open = open ? 'true' : 'false';
    requestAnimationFrame(tick);
  }

  button.addEventListener('click', toggle);
  return toggle;
}

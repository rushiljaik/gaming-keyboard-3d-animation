# RGB Gaming Keyboard (three.js)

Interactive 3D model of a white TKL RGB keyboard: orbit it, click keys or type
on your real keyboard to press them, toggle an exploded view of the internals,
and export the model as OBJ + MTL or GLB.

## Files
- `index.html` — page shell: pinned three.js import map, stage tag, UI
- `keyboard-model.js` — the model (layout, keycaps, switches, plate, PCB, foam,
  case), key-press interaction, and the exploded-view animation
- `three-d-stage.js` — viewer shell: renderer, studio lighting, orbit controls,
  OBJ/GLB export toolbar

## Run locally
three.js loads as ES modules, so open it over HTTP rather than `file://`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

In VS Code the Live Server extension works too.


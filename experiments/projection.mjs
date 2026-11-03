// Deliberately narrow visual experiment, not a replacement implementation of Foundry's layers.
const { canvas, PIXI, game, Hooks } = globalThis;
export function projection(scene) {
  const layer = new PIXI.Container();
  const grid = layer.addChild(new PIXI.Graphics());
  const marks = layer.addChild(new PIXI.Container());
  canvas.stage.addChild(layer);
  const hidden = [];
  for (const group of [canvas.tokens, canvas.tiles, canvas.drawings]) {
    hidden.push([group.objects, group.objects.visible]);
    group.objects.visible = false;
    for (const object of group.placeables)
      if (object.mesh) {
        hidden.push([object.mesh, object.mesh.visible]);
        object.mesh.visible = false;
      }
  }
  function redraw() {
    const z = canvas.stage.scale.x,
      c = canvas.stage.pivot;
    const w = canvas.app.renderer.screen.width / z,
      h = canvas.app.renderer.screen.height / z;
    grid
      .clear()
      .beginFill(0x102820)
      .drawRect(c.x - w, c.y - h, w * 2, h * 2)
      .endFill();
    const step = 10 ** Math.floor(Math.log10(100 / z));
    grid.lineStyle(1 / z, 0x315341, 1);
    for (let x = Math.floor((c.x - w) / step) * step; x < c.x + w; x += step)
      grid.moveTo(x, c.y - h).lineTo(x, c.y + h);
    for (let y = Math.floor((c.y - h) / step) * step; y < c.y + h; y += step)
      grid.moveTo(c.x - w, y).lineTo(c.x + w, y);
    marks.removeChildren().forEach((n) => n.destroy({ children: true }));
    const g = marks.addChild(new PIXI.Graphics());
    g.lineStyle(2 / z, 0xc3e87c, 0.6).drawRect(0, 0, 1000, 1000);
    for (const t of scene.tiles) {
      const s = t._source;
      if (s.hidden && !game.user.isGM) continue;
      g.lineStyle(2 / z, 0x85c9d9)
        .beginFill(0x254e49)
        .drawRect(s.x, s.y, s.width, s.height)
        .endFill();
    }
    for (const d of scene.drawings) {
      const s = d._source;
      if (s.hidden && !game.user.isGM) continue;
      g.lineStyle(2 / z, 0xa1b99b).drawRect(s.x, s.y, s.shape.width, s.shape.height);
    }
    for (const t of scene.tokens) {
      const s = t._source;
      if (s.hidden && !game.user.isGM) continue;
      const width = s.width * scene.grid.size,
        height = s.height * scene.grid.size;
      g.lineStyle(2 / z, 0xc3e87c)
        .beginFill(0x426c3b)
        .drawRect(s.x, s.y, width, height)
        .endFill();
      const label = marks.addChild(
        new PIXI.Text(`${t.name} [${s.x}, ${s.y}]`, {
          fontFamily: "sans-serif",
          fontSize: 14 / z,
          fill: 0xe0ecd5,
        }),
      );
      label.position.set(s.x, s.y - 20 / z);
    }
  }
  const hooks = [
    "canvasPan",
    "updateToken",
    "updateTile",
    "updateDrawing",
    "createToken",
    "createTile",
    "createDrawing",
    "deleteToken",
    "deleteTile",
    "deleteDrawing",
  ].map((name) => [name, Hooks.on(name, redraw)]);
  const view = canvas.app.view;
  let drag = null;
  function down(event) {
    if (event.button !== 0 || (game.paused && !game.user.isGM)) return;
    const p = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
    const candidates = [...scene.tokens, ...scene.tiles, ...scene.drawings];
    const target = candidates.find((t) => {
      const s = t._source;
      if (s.hidden && !game.user.isGM) return false;
      const size =
        t.documentName === "Token"
          ? { w: s.width * scene.grid.size, h: s.height * scene.grid.size }
          : t.documentName === "Drawing"
            ? { w: s.shape.width, h: s.shape.height }
            : { w: s.width, h: s.height };
      return p.x >= s.x && p.x <= s.x + size.w && p.y >= s.y && p.y <= s.y + size.h;
    });
    if (!target || !target.isOwner) return;
    drag = { target, dx: target._source.x - p.x, dy: target._source.y - p.y };
    event.preventDefault();
    event.stopImmediatePropagation();
    view.setPointerCapture(event.pointerId);
  }
  function moving(event) {
    if (drag) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  async function up(event) {
    if (!drag) return;
    const current = drag;
    drag = null;
    event.preventDefault();
    event.stopImmediatePropagation();
    const p = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
    try {
      if (game.paused && !game.user.isGM) throw new Error("The game is paused.");
      if (!current.target.isOwner) throw new Error("Ownership changed during the drag.");
      await current.target.update(
        { x: Math.round(p.x + current.dx), y: Math.round(p.y + current.dy) },
        { animate: false },
      );
    } catch (error) {
      globalThis.ui.notifications.error(error.message);
    }
  }
  function cancel() {
    drag = null;
  }
  view.addEventListener("pointerdown", down, true);
  view.addEventListener("pointermove", moving, true);
  view.addEventListener("pointerup", up, true);
  view.addEventListener("pointercancel", cancel, true);
  redraw();
  return () => {
    view.removeEventListener("pointerdown", down, true);
    view.removeEventListener("pointermove", moving, true);
    view.removeEventListener("pointerup", up, true);
    view.removeEventListener("pointercancel", cancel, true);

    for (const [name, id] of hooks) Hooks.off(name, id);
    for (const [object, visible] of hidden) if (!object.destroyed) object.visible = visible;
    layer.destroy({ children: true });
  };
}

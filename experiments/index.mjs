import { assertLab, createFixture, FLAG, POINTS } from "./fixture.mjs";
import { projection } from "./projection.mjs";
const { canvas, game, Hooks, foundry } = globalThis;
let restore = null;
function scene() {
  assertLab(canvas.scene);
  const source = game.scenes.get(canvas.scene.getFlag(FLAG, "sourceScene")) ?? canvas.scene;
  assertLab(source);
  return source;
}
export function stop() {
  restore?.();
  restore = null;
}
export async function mode(value = "camera") {
  if (!["native", "camera", "projection"].includes(value)) throw new Error("Unknown lab mode");
  stop();
  const source = scene();
  if (value !== "projection") {
    if (canvas.scene !== source) await source.view();
    if (value === "native") return inspect();
  } else {
    let view = game.scenes.find((s) => s.getFlag(FLAG, "sourceScene") === source.id);
    if (!view) {
      if (!game.user.isGM) throw new Error("The GM must create the radar test view first.");
      view = await foundry.documents.Scene.create({
        name: "Radar projection laboratory",
        width: 1000,
        height: 1000,
        padding: 0,
        tokenVision: false,
        grid: { type: 0, size: 100, distance: 1, units: "m" },
        ownership: { default: 2 },
        flags: { [FLAG]: { boundaryLab: true, sourceScene: source.id } },
      });
    }
    if (canvas.scene !== view) await view.view();
  }
  const active = canvas.scene,
    original = canvas._constrainView;
  const wrapped = function (view) {
    if (this.scene !== active) return original.call(this, view);
    return {
      x: Number.isFinite(view.x) ? view.x : this.stage.pivot.x,
      y: Number.isFinite(view.y) ? view.y : this.stage.pivot.y,
      scale: Math.max(
        0.01,
        Math.min(4, Number.isFinite(view.scale) ? view.scale : this.stage.scale.x),
      ),
    };
  };
  canvas._constrainView = wrapped;
  const cleanup = value === "projection" ? projection(source) : () => {};
  const hook = Hooks.on("canvasTearDown", stop);
  restore = () => {
    cleanup();
    if (canvas._constrainView === wrapped) canvas._constrainView = original;
    Hooks.off("canvasTearDown", hook);
  };
  return inspect();
}
export function inspect() {
  const s = scene();
  return {
    foundry: game.version,
    scene: s.id,
    viewedScene: canvas.scene.id,
    user: game.user.name,
    dimensions: { width: s.width, height: s.height },
    camera: { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y, scale: canvas.stage.scale.x },
    tokens: s.tokens
      .filter((t) => game.user.isGM || !t.hidden)
      .map((t) => ({
        id: t.id,
        name: t.name,
        stored: { x: t._source.x, y: t._source.y },
        prepared: { x: t.x, y: t.y },
        rendered: t.rendered,
        display: t.object ? { x: t.object.x, y: t.object.y } : null,
      })),
    tiles: s.tiles
      .filter((t) => game.user.isGM || !t.hidden)
      .map((t) => ({ id: t.id, x: t._source.x, y: t._source.y })),
    drawings: s.drawings
      .filter((d) => game.user.isGM || !d.hidden)
      .map((d) => ({ id: d.id, x: d._source.x, y: d._source.y })),
  };
}
export async function open() {
  stop();
  const s = await createFixture();
  await s.view();
  return inspect();
}
export function focus(name) {
  const p = POINTS.find((p) => p.name === name) ?? { x: 500, y: 500 };
  scene();
  canvas.pan({ x: p.x + 100, y: p.y + 50, scale: 0.65 });
  return inspect();
}
export async function move(name, x, y) {
  if (game.paused && !game.user.isGM) throw new Error("The game is paused.");
  const s = scene(),
    t = s.tokens.find((t) => t.name === name);
  if (!t?.isOwner) throw new Error("The selected token must be owned by this user.");
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Coordinates must be finite.");
  await t.update({ x, y }, { animate: false });
  return inspect();
}
export function probe(name = "Center", x = -1200, y = 400) {
  const s = scene(),
    t = s.tokens.find((t) => t.name === name);
  if (!t?.object) throw new Error("Token is not rendered.");
  const source = t.toObject();
  const [, constrained] = t.object.constrainMovementPath([source, { ...source, x, y }], {
    ignoreWalls: true,
    ignoreCost: true,
  });
  return {
    name,
    requested: { x, y },
    nativeMovementConstrained: constrained,
    dropAccepted: canvas.dimensions.rect.contains(x, y),
    snapshot: inspect(),
  };
}
export const boundaryLab = { open, mode, focus, inspect, probe, move, stop, flag: FLAG };

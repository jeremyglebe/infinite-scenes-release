const { game, foundry } = globalThis;
export const FLAG = "infinite-scenes";
export const POINTS = [
  { name: "West", x: -1200, y: 400 },
  { name: "North", x: 400, y: -1200 },
  { name: "East", x: 2200, y: 400 },
  { name: "South", x: 400, y: 2200 },
];
export function assertLab(scene) {
  if (game.world.id !== "infinite-scenes-lab" || !scene?.getFlag(FLAG, "boundaryLab"))
    throw new Error(
      "This experiment only operates in its disposable boundary-lab world and scenes.",
    );
  if (scene.tokenVision || scene.walls.size || scene.levels.size !== 1)
    throw new Error("Lab requires one level, no walls and token vision explicitly disabled.");
}
export async function createFixture() {
  if (!game.user.isGM || game.world.id !== "infinite-scenes-lab")
    throw new Error("Create fixtures as GM in the disposable lab world only.");
  const existing = game.scenes.find(
    (s) => s.getFlag(FLAG, "boundaryLab") && !s.getFlag(FLAG, "sourceScene"),
  );
  if (existing) return existing;
  const actor = await foundry.documents.Actor.create({
    name: "Boundary probe",
    type: "unit",
    ownership: { default: 3 },
  });
  const scene = await foundry.documents.Scene.create({
    name: "Boundary laboratory",
    width: 1000,
    height: 1000,
    padding: 0,
    grid: { type: 0, size: 100, distance: 1, units: "m" },
    tokenVision: false,
    flags: { [FLAG]: { boundaryLab: true } },
    ownership: { default: 2 },
  });
  const level = scene.levels.contents[0].id;
  await scene.createEmbeddedDocuments(
    "Token",
    [...POINTS, { name: "Center", x: 400, y: 400 }].map((p) => ({
      ...p,
      actorId: actor.id,
      actorLink: true,
      width: 1,
      height: 1,
      level,
      texture: { src: "icons/svg/mystery-man.svg" },
    })),
  );
  await scene.createEmbeddedDocuments(
    "Tile",
    POINTS.map((p) => ({
      x: p.x + 180,
      y: p.y,
      width: 150,
      height: 100,
      level,
      texture: { src: "icons/svg/tower.svg" },
      flags: { [FLAG]: { label: p.name } },
    })),
  );
  await scene.createEmbeddedDocuments(
    "Drawing",
    POINTS.map((p) => ({
      x: p.x,
      y: p.y + 180,
      shape: { type: "r", width: 250, height: 90 },
      strokeWidth: 4,
      strokeColor: "#bada55",
      fillType: 1,
      fillColor: "#234a3a",
      level,
    })),
  );
  await foundry.documents.Scene.create({
    name: "Ordinary control scene",
    width: 1000,
    height: 1000,
    padding: 0,
    grid: { type: 0, size: 100, distance: 1, units: "m" },
    tokenVision: false,
    ownership: { default: 2 },
  });
  return scene;
}

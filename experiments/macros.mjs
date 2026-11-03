const { game, foundry } = globalThis;
export async function installMacros() {
  if (!game.user.isGM || game.world.id !== "infinite-scenes-lab") throw new Error("Lab GM only.");
  const prefix =
    'const {boundaryLab:lab}=await import("/modules/infinite-scenes/experiments/index.mjs");\n';
  const entries = [
    ["Lab: Native", "await lab.open(); await lab.mode('native');"],
    ["Lab: Radar", "await lab.open(); await lab.mode('projection'); lab.focus('West');"],
    ...["West", "North", "East", "South"].map((name) => [`Lab: ${name}`, `lab.focus('${name}');`]),
    ["Lab: Overview", "canvas.pan({x:500,y:500,scale:0.18});"],
    [
      "Lab: Move West",
      "const t=game.scenes.get(lab.inspect().scene).tokens.find(t=>t.name==='West'); await lab.move('West',t._source.x-100,t._source.y);",
    ],
    [
      "Lab: Inspect",
      "console.table(lab.inspect().tokens); ui.notifications.info('Lab snapshot written to browser console.');",
    ],
    ["Lab: Stop", "lab.stop();"],
  ];
  for (const [i, [name, command]] of entries.entries()) {
    let macro = game.macros.find((m) => m.name === name);
    if (!macro)
      macro = await foundry.documents.Macro.create({
        name,
        type: "script",
        command: prefix + command,
        img: "icons/svg/target.svg",
      });
    else await macro.update({ command: prefix + command });
    await game.user.assignHotbarMacro(macro, i + 1);
  }
  return entries.map(([name]) => name);
}

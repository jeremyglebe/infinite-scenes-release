# Infinite Scenes

Radar-first infinite battlefields for Foundry VTT v14.

**Early development release · 0.0.1 · Foundry VTT minimum 14, verified 14**

Infinite Scenes adds an abstract radar battlefield with free panning and zooming. Place a normal
scene inside it, zoom into the detailed map, and zoom back out to the radar. Each player changes
only their own view; the radar can remain the active scene.

## Install

In Foundry's **Add-on Modules → Install Module**, paste this manifest URL:

```text
https://github.com/jeremyglebe/infinite-scenes-release/releases/latest/download/module.json
```

Enable **Infinite Scenes** in your world's module settings. No particular game system is required.
This first release was tested on Foundry 14.369 with a minimal test system; compatibility testing
with full game systems is still planned.

## Getting started

1. Create a separate abstract scene with one level, token vision disabled, and no walls.
2. In its scene configuration, use **Infinite Scenes → Enable / open radar**.
3. Use the radar controls to place tokens, tiles and rectangular terrain, or measure distances.
4. Use **Place / edit nested scene** to select an ordinary single-level map and set its position and
   physical width. A child scene can belong to one radar. Currently each radar has one child.
5. Zoom toward the mapped area to enter it. Zoom out or use **Return to radar** to return.
   Transition thresholds are configurable in the radar toolbar, with a reset to defaults.

Radar previews show schematic walls and regions rather than the detailed map background. Portrait
pins retain precise position tips; overlapping pins group at distant zoom levels. The GM controls
which schematic details are revealed. Radar does not simulate token vision, fog, walls or lighting.

## Tokens and temporary actors

Linked characters share Actor data and synchronize position and physical size between the radar and
its child. A connected GM is required for synchronization. There must be one token per Actor in each
participating scene.

Dropping an Actor with an unlinked prototype onto either scene creates a separate linked Actor named
`Name (1)`, `Name (2)`, etc. in **Infinite Scenes — Spawned Actors**. The original is untouched.
This also works when opening the child scene directly.

Deleting either token removes its counterpart. A generated Actor is also deleted if it is still in
the module's spawned folder and has no remaining tokens or combat references. **Move a generated
Actor out of that folder to keep it.** The Actors directory also offers a previewed manual cleanup.
GMs can delete selected radar tokens with Delete or Backspace.

Detach a child in scene configuration to stop synchronization while retaining its content. Existing
unlinked tokens are not automatically converted. A token outside the child map remains on the radar;
its native counterpart is hidden until it re-enters the mapped area.

## Current limits

This is an early 0.x release. Back up worlds before trying it in an ongoing campaign.

- One nested scene per radar; single-level scenes only.
- Radar is a GM-revealed overview, not a token-vision simulation.
- Drawing support is currently rectangular terrain; native editing features are limited.
- Rotation, elevation, deliberate visibility changes and combat state are not synchronized.
- Offline movement/deletion and simultaneous conflicting movement are not fully reconciled.
- Actor cloning needs normal Foundry creation permissions; no permissions are granted automatically.
- Detailed system compatibility and large-encounter performance testing remain in progress.

[Releases](https://github.com/jeremyglebe/infinite-scenes-release/releases/latest) · [Report an issue](https://github.com/jeremyglebe/infinite-scenes-release/issues)

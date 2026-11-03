//#region src/module/foundry/radar/host.ts
var e = "infinite-scenes", t = globalThis;
function n(e, n) {
	let r = t.Hooks.on(e, n);
	return () => t.Hooks.off(e, r);
}
function r(e) {
	console.error("Infinite Scenes", e), t.ui.notifications.error(e instanceof Error ? e.message : String(e));
}
function i(n) {
	let r = n.getFlag(e, "sourceId");
	return typeof r == "string" ? t.game.scenes.get(r) ?? n : n;
}
function a(e) {
	return [
		...e.tiles,
		...e.drawings,
		...e.tokens
	].filter((e) => t.game.user.isGM || !e._source.hidden);
}
function o(e) {
	let t = e._source;
	return {
		x: t.x,
		y: t.y,
		width: e.documentName === "Token" ? t.width * e.parent.grid.size : t.shape?.width ?? t.width,
		height: e.documentName === "Token" ? t.height * e.parent.grid.size : t.shape?.height ?? t.height
	};
}
function s(e) {
	return e.isOwner && !e._source.locked && (t.game.user.isGM || !t.game.paused && e.documentName === "Token" && !e._source.hidden);
}
function c(e) {
	if (e.tokenVision || e.walls.size || e.levels.size !== 1) throw Error("Radar requires token vision off, no walls, and exactly one level. Configure a separate abstract scene for radar.");
	if (!(e.grid.size > 0 && e.grid.distance > 0)) throw Error("Radar requires a positive grid size and distance.");
}
//#endregion
//#region src/module/functions/radar/nesting.ts
function l(e, t) {
	return {
		x: e.x,
		y: e.y,
		width: e.width,
		height: e.width * t.sceneHeight / t.sceneWidth
	};
}
function u(e, t, n) {
	let r = t.width / n.sceneWidth;
	return {
		x: n.sceneX + (e.x - t.x) / r,
		y: n.sceneY + (e.y - t.y) / r,
		scale: e.scale * r
	};
}
function d(e, t, n) {
	let r = t.width / n.sceneWidth;
	return {
		x: t.x + (e.x - n.sceneX) * r,
		y: t.y + (e.y - n.sceneY) * r,
		scale: e.scale / r
	};
}
function f(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return typeof t.sceneId == "string" && typeof t.revealPreview == "boolean" && (t.radarBackground === void 0 || typeof t.radarBackground == "string") && (t.revealSchematic === void 0 || typeof t.revealSchematic == "boolean") && [
		t.x,
		t.y,
		t.width
	].every(Number.isFinite) && t.width > 0;
}
function p(e, t, n, r) {
	return Math.max(e * n / r.x, t * n / r.y);
}
var m = {
	enter: 85,
	exit: 55
};
function h(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return Number.isFinite(t.enter) && Number.isFinite(t.exit) && t.exit >= 5 && t.enter <= 200 && t.enter - t.exit >= 5;
}
//#endregion
//#region src/module/foundry/radar/nesting/relationship.ts
function g(e) {
	return e.levels.size === 1 && !e.getFlag("infinite-scenes", "viewId") && !e.getFlag("infinite-scenes", "sourceId") && !e.getFlag("infinite-scenes", "nestedScene");
}
function _(n, r = !0) {
	let i = n.getFlag(e, "parentRadarId"), a = typeof i == "string" ? t.game.scenes.get(i) : void 0;
	if (!a) return null;
	let o = a.getFlag(e, "nestedScene"), s = t.game.scenes.get(String(a.getFlag(e, "viewId")));
	return !s || r && !s.getFlag("infinite-scenes", "enabled") || !f(o) || o.sceneId !== n.id ? null : {
		source: a,
		view: s,
		placement: o
	};
}
function v(e) {
	let n = i(e);
	return t.game.scenes.get(String(n.getFlag("infinite-scenes", "viewId")))?.getFlag("infinite-scenes", "enabled") ? n : _(e)?.source ?? null;
}
function y(n, r) {
	let i = n.getFlag(e, "parentRadarId");
	return n.id !== r.id && g(n) && (!i || i === r.id) && !t.game.scenes.contents.some((e) => e.id !== r.id && e.getFlag("infinite-scenes", "nestedScene")?.sceneId === n.id);
}
async function ee(t) {
	for (let n of t.tokens) {
		let t = n._source.flags?.[e]?.parked;
		t && await n.update({
			hidden: !!t.hidden,
			[`flags.${e}.-=parked`]: null
		}, { infiniteScenesMovement: !0 });
	}
}
async function te(n) {
	if (!t.game.user.isGM) throw Error("Only the GM can detach scenes.");
	let r = n.getFlag(e, "nestedScene");
	if (!f(r)) return;
	let i = t.game.scenes.get(r.sceneId);
	await n.update({ [`flags.${e}.-=nestedScene`]: null }), i?.getFlag("infinite-scenes", "parentRadarId") === n.id && (await i.update({ [`flags.${e}.-=parentRadarId`]: null }), await ee(i));
}
var b = Promise.resolve();
function ne(n, r) {
	let i = b.then(async () => {
		if (!t.game.user.isGM) throw Error("Only the GM can nest scenes.");
		let i = t.game.scenes.get(r.sceneId);
		if (!f(r) || !i || !y(i, n)) throw Error("This scene already belongs to another radar or cannot be nested.");
		let a = n.getFlag(e, "nestedScene"), o = f(a) ? t.game.scenes.get(a.sceneId) : void 0;
		await i.update({ [`flags.${e}.parentRadarId`]: n.id });
		try {
			await n.update({ [`flags.${e}.nestedScene`]: r });
		} catch (t) {
			throw o?.id !== i.id && await i.update({ [`flags.${e}.-=parentRadarId`]: null }), t;
		}
		o && o.id !== i.id && o.getFlag("infinite-scenes", "parentRadarId") === n.id && (await o.update({ [`flags.${e}.-=parentRadarId`]: null }), await ee(o));
	});
	return b = i.catch(() => {}), i;
}
async function re() {
	if (t.game.user.isGM && t.game.users.contents.filter((e) => e.active && e.isGM).sort((e, t) => e.id.localeCompare(t.id))[0]?.id === t.game.user.id) {
		for (let n of t.game.scenes) {
			let r = n.getFlag(e, "nestedScene");
			if (!f(r)) continue;
			let i = t.game.scenes.get(r.sceneId);
			if (!i || !t.game.scenes.get(String(n.getFlag("infinite-scenes", "viewId")))) {
				await te(n);
				continue;
			}
			y(i, n) && i.getFlag("infinite-scenes", "parentRadarId") !== n.id && await i.update({ [`flags.${e}.parentRadarId`]: n.id });
		}
		for (let n of t.game.scenes) n.getFlag("infinite-scenes", "parentRadarId") && !_(n, !1) && (await n.update({ [`flags.${e}.-=parentRadarId`]: null }), await ee(n));
	}
}
function ie() {
	n("ready", () => void re().catch(r)), n("deleteScene", () => void re().catch(r));
}
//#endregion
//#region src/module/functions/radar/spawn-name.ts
function ae(e, t) {
	let n = `${e} (`, r = 0;
	for (let e of t) {
		if (!e.startsWith(n) || !e.endsWith(")")) continue;
		let t = e.slice(n.length, -1);
		/^[1-9]\d*$/.test(t) && (r = Math.max(r, Number(t)));
	}
	return `${e} (${r + 1})`;
}
//#endregion
//#region src/module/foundry/radar/spawning/actors.ts
var oe = "spawnedActor", se = Promise.resolve();
function ce(n, r, i) {
	let a = se.then(async () => {
		if (!v(n)) throw Error("This scene is no longer part of an enabled radar.");
		if (!r.isOwner || !t.game.user.isGM && t.game.paused) throw Error("You cannot place this actor right now.");
		let a = r;
		if (!r.prototypeToken.actorLink) {
			let n = t.game.folders.find((e) => e.type === "Actor" && !!e.getFlag("infinite-scenes", "spawnFolder"))?.id ?? (await t.foundry.documents.Folder.create({
				name: "Infinite Scenes — Spawned Actors",
				type: "Actor",
				sorting: "a",
				flags: { "infinite-scenes": { spawnFolder: !0 } }
			})).id, i = r.toObject();
			delete i._id, delete i._stats;
			let o = ae(r.name, t.game.actors.contents.map((e) => e.name));
			i.name = o, i.folder = n, i.prototypeToken = {
				...i.prototypeToken,
				actorLink: !0,
				name: o
			}, i.flags = {
				...i.flags,
				[e]: { [oe]: {
					sourceUuid: r.uuid,
					createdBy: t.game.user.id
				} }
			}, a = await t.foundry.documents.Actor.create(i);
		}
		if (!v(n)) throw Error("Radar relationship changed during drop. Any unused copy can be removed with actor cleanup.");
		if (n.tokens.contents.some((e) => e._source.actorId === a.id)) throw Error("This linked character already has a token in this scene. Move its existing token instead.");
		await i(a);
	});
	return se = a.catch(() => {}), a;
}
//#endregion
//#region src/module/foundry/radar/spawning/drop.ts
function le() {
	n("dropCanvasData", (e, n, i) => {
		if (n.type !== "Actor" || !n.uuid || !_(e.scene)) return;
		let a = e.scene, o = n.uuid;
		return (async () => {
			let e = await t.fromUuid(o);
			if (!e) throw Error("Dropped actor could not be found.");
			await ce(a, e, async (e) => {
				if (t.canvas.scene?.id !== a.id) throw Error("Scene changed during drop; retry in the intended scene.");
				return t.canvas.tokens._onDropActorData(i, {
					...n,
					uuid: e.uuid
				});
			});
		})().catch(r), !1;
	});
}
//#endregion
//#region src/module/functions/radar/escape.ts
function x(e) {
	return e.replace(/[&<>"']/g, (e) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	})[e]);
}
//#endregion
//#region src/module/foundry/radar/spawning/cleanup.ts
function ue() {
	let e = new Set(t.game.scenes.contents.flatMap((e) => e.tokens.contents.map((e) => e._source.actorId)));
	for (let n of t.game.combats) for (let t of n.combatants) t.actorId && e.add(t.actorId);
	return t.game.actors.contents.filter((t) => t.getFlag("infinite-scenes", "spawnedActor") && !e.has(t.id));
}
async function de(e) {
	let t = ue().find((t) => t.id === e);
	t?.folder?.getFlag("infinite-scenes", "spawnFolder") && await t.delete();
}
async function fe() {
	if (!t.game.user.isGM) throw Error("Only the GM can clean up spawned actors.");
	let e = ue();
	if (!e.length) {
		t.ui.notifications.info("No unused spawned actors. Tokens in every scene and all combatants are checked.");
		return;
	}
	if (!await t.foundry.applications.api.DialogV2.confirm({
		window: { title: "Clean up unused spawned actors" },
		content: `<p>Delete these ${e.length} module-created actors? They have no tokens or combatants. This cannot be undone.</p><ul>${e.map((e) => `<li>${x(e.name)}</li>`).join("")}</ul>`
	})) return;
	let n = 0;
	for (let t of e) ue().some((e) => e.id === t.id) && (await t.delete(), n++);
	t.ui.notifications.info(`Removed ${n} unused spawned actors.`);
}
function pe() {
	n("renderActorDirectory", (e, n) => {
		if (!t.game.user.isGM || n.querySelector("[data-radar-cleanup]")) return;
		let i = document.createElement("button");
		i.type = "button", i.dataset.radarCleanup = "", i.textContent = "Clean up unused spawned actors", i.addEventListener("click", () => void fe().catch(r)), (n.querySelector(".directory-header") ?? n).append(i);
	});
}
//#endregion
//#region src/module/functions/radar/schematic.ts
function me(e, t) {
	return !e && t === 2;
}
function he(e) {
	return e !== 2;
}
//#endregion
//#region src/module/foundry/radar/nesting/schematic.ts
function ge(e, t) {
	if (e.save(), e.beginPath(), t.type === "polygon") {
		let n = t.points ?? [];
		for (let t = 0; t + 1 < n.length; t += 2) t === 0 ? e.moveTo(n[t], n[t + 1]) : e.lineTo(n[t], n[t + 1]);
		e.closePath();
	} else if (t.type === "rectangle") {
		let n = t.width ?? 0, r = t.height ?? 0;
		e.translate((t.x ?? 0) + n / 2, (t.y ?? 0) + r / 2), e.rotate((t.rotation ?? 0) * Math.PI / 180), e.rect(-n / 2, -r / 2, n, r);
	} else t.type === "ellipse" && e.ellipse(t.x ?? 0, t.y ?? 0, t.radiusX ?? 0, t.radiusY ?? 0, (t.rotation ?? 0) * Math.PI / 180, 0, Math.PI * 2);
	e.stroke(), e.restore();
}
function _e(e, n, r, i, a, o) {
	if (!t.game.user.isGM && !r.revealSchematic) return;
	let s = e.context, c = n.getDimensions(), l = a / c.sceneWidth;
	s.save(), s.beginPath(), s.rect(i.x, i.y, a, o), s.clip(), s.translate(i.x - c.sceneX * l, i.y - c.sceneY * l), s.scale(l, l), s.lineWidth = 1.5 / l, s.strokeStyle = "#70a99b", s.setLineDash([5 / l, 4 / l]);
	for (let e of n.regions) {
		let n = e._source;
		if (!(!t.game.user.isGM && !me(n.hidden, n.visibility))) for (let e of n.shapes) ge(s, e);
	}
	s.setLineDash([]), s.strokeStyle = "#aacdb8";
	for (let e of n.walls) {
		let n = e._source;
		!t.game.user.isGM && !he(n.door) || (n.door && n.ds === 1 ? s.setLineDash([3 / l, 4 / l]) : s.setLineDash([]), n.c.length === 4 && (s.beginPath(), s.moveTo(n.c[0], n.c[1]), s.lineTo(n.c[2], n.c[3]), s.stroke()));
	}
	s.restore();
}
//#endregion
//#region src/module/functions/radar/geometry.ts
var ve = 1e-5;
function ye(e, t, n) {
	return {
		x: (e.x - t.x) * t.scale + n.x / 2,
		y: (e.y - t.y) * t.scale + n.y / 2
	};
}
function be(e, t, n) {
	return {
		x: (e.x - n.x / 2) / t.scale + t.x,
		y: (e.y - n.y / 2) / t.scale + t.y
	};
}
function xe(e, t, n, r) {
	let i = be(t, e, n), a = Math.max(ve, Math.min(8, e.scale * r));
	return {
		scale: a,
		x: i.x - (t.x - n.x / 2) / a,
		y: i.y - (t.y - n.y / 2) / a
	};
}
function Se(e, t, n, r) {
	return Math.hypot(e.x - t.x, e.y - t.y) / n * r;
}
function Ce(e, t) {
	return {
		x: Math.min(e.x, t.x),
		y: Math.min(e.y, t.y),
		width: Math.abs(e.x - t.x),
		height: Math.abs(e.y - t.y)
	};
}
function we(e, t) {
	return t.x >= e.x && t.x <= e.x + e.width && t.y >= e.y && t.y <= e.y + e.height;
}
function Te(e, t) {
	if (!e.length) return {
		x: 0,
		y: 0,
		scale: 1
	};
	let n = Math.min(...e.map((e) => e.x)), r = Math.min(...e.map((e) => e.y)), i = Math.max(...e.map((e) => e.x + e.width)), a = Math.max(...e.map((e) => e.y + e.height));
	return {
		x: (n + i) / 2,
		y: (r + a) / 2,
		scale: Math.max(ve, Math.min(1, t.x / (i - n + 300), t.y / (a - r + 300)))
	};
}
//#endregion
//#region src/module/foundry/radar/nesting/placement.ts
var Ee = g;
function De(n) {
	let r = n.getFlag(e, "nestedScene");
	if (!f(r)) return null;
	let i = t.game.scenes.get(r.sceneId);
	return !i || !Ee(i) || i.getFlag("infinite-scenes", "parentRadarId") !== n.id || !t.game.user.isGM && !i.testUserPermission(t.game.user, "OBSERVER") ? null : {
		placement: r,
		child: i
	};
}
async function Oe(e) {
	if (!t.game.user.isGM) throw Error("Only the GM can place nested scenes.");
	let n = [...t.game.scenes].filter((t) => t !== e.source && t !== e.view && y(t, e.source));
	if (!n.length) throw Error("Create an ordinary single-level scene first. Radar scenes cannot be nested.");
	let r = De(e.source)?.placement, i = e.source.grid.distance / e.source.grid.size, a = `<p class="hint">One child scene per radar. Position and width use radar scene units. Height follows the scene aspect ratio. Viewing never activates the scene or moves tokens.</p>
    <div class="form-group"><label for="nested-scene">Scene</label><select id="nested-scene" name="scene">${n.map((e) => `<option value="${x(e.id)}" ${e.id === r?.sceneId ? "selected" : ""}>${x(e.name)}</option>`).join("")}</select></div>
    ${[
		[
			"x",
			"Left (X)",
			(r?.x ?? e.camera.x) * i
		],
		[
			"y",
			"Top (Y)",
			(r?.y ?? e.camera.y) * i
		],
		[
			"width",
			"Physical width",
			r ? r.width * i : 100
		]
	].map(([e, t, n]) => `<div class="form-group"><label for="nested-${e}">${t}</label><input id="nested-${e}" name="${e}" type="number" step="any" value="${n}" required></div>`).join("")}
    <div class="form-group"><label for="radar-background">Optional radar background</label><input id="radar-background" name="radarBackground" type="text" value="${x(r?.radarBackground ?? "")}" placeholder="Image path (blank for schematic only)"></div>
    <div class="form-group"><label for="nested-schematic">Reveal schematic to players</label><input id="nested-schematic" name="schematic" type="checkbox" ${r?.revealSchematic ? "checked" : ""}></div>
    <div class="form-group"><label for="nested-reveal">Reveal custom radar background to players</label><input id="nested-reveal" name="reveal" type="checkbox" ${r?.revealPreview ? "checked" : ""}></div><p class="hint">The detailed scene image is never used on radar. Revealing the schematic shares the wall layout without fog; secret doors and non-public regions stay concealed. Both reveal options are off by default.</p>`, o = await t.foundry.applications.api.DialogV2.prompt({
		window: { title: "Place scene on radar" },
		content: a,
		ok: {
			label: "Save placement",
			callback: (e, t, n) => {
				let r = (e) => n.element.querySelector(`[name="${e}"]`).value;
				return {
					sceneId: r("scene"),
					radarBackground: r("radarBackground").trim(),
					revealSchematic: n.element.querySelector("[name=\"schematic\"]").checked,
					x: Number(r("x")) / i,
					y: Number(r("y")) / i,
					width: Number(r("width")) / i,
					revealPreview: n.element.querySelector("[name=\"reveal\"]").checked
				};
			}
		}
	});
	if (!o) return;
	if (!f(o)) throw Error("Use finite coordinates and a positive width.");
	let s = t.game.scenes.get(o.sceneId);
	if (!e.element.isConnected || !s || !Ee(s) || s === e.source) throw Error("Scene placement is no longer valid.");
	await ne(e.source, o);
}
function ke(e, n) {
	let r = De(e.source);
	if (!r) return;
	let { placement: i, child: a } = r, o = l(i, a.getDimensions()), s = ye(o, e.camera, e.size), c = o.width * e.camera.scale, u = o.height * e.camera.scale;
	if (s.x + c < 0 || s.y + u < 0 || s.x > e.size.x || s.y > e.size.y) return;
	let d = e.context;
	d.save(), d.fillStyle = "#183c37", d.fillRect(s.x, s.y, c, u);
	let f = i.radarBackground;
	if (f && (t.game.user.isGM || i.revealPreview)) {
		let e = n(f);
		e.complete && e.naturalWidth && (d.globalAlpha = .85, d.drawImage(e, s.x, s.y, c, u), d.globalAlpha = 1);
	}
	_e(e, a, i, s, c, u), d.strokeStyle = "#85c9d9", d.lineWidth = 2, d.setLineDash([8, 5]), d.strokeRect(s.x, s.y, c, u), d.setLineDash([]), d.fillStyle = "#e0ecd5", d.font = "14px sans-serif", d.fillText(`${a.name} · zoom in to enter`, Math.max(110, s.x + 8), Math.max(145, s.y + 20)), d.restore();
}
//#endregion
//#region src/module/functions/radar/token-position.ts
function Ae(e, t, n, r) {
	let i = t.width / n.sceneWidth;
	return r ? {
		x: n.sceneX + (e.x - t.x) / i,
		y: n.sceneY + (e.y - t.y) / i,
		width: e.width / i,
		height: e.height / i
	} : {
		x: t.x + (e.x - n.sceneX) * i,
		y: t.y + (e.y - n.sceneY) * i,
		width: e.width * i,
		height: e.height * i
	};
}
function je(e, t) {
	return e.x >= t.sceneX && e.y >= t.sceneY && e.x + e.width <= t.sceneX + t.sceneWidth && e.y + e.height <= t.sceneY + t.sceneHeight;
}
//#endregion
//#region src/module/foundry/radar/nesting/movement.ts
var Me = "infiniteScenesMovement", Ne = () => ({
	[Me]: !0,
	animate: !1,
	constrainOptions: {
		ignoreWalls: !0,
		ignoreCost: !0
	}
}), Pe = Promise.resolve(), Fe = /* @__PURE__ */ new Set(), Ie = /* @__PURE__ */ new Map();
function Le() {
	return t.game.users.contents.filter((e) => e.active && e.isGM).sort((e, t) => e.id.localeCompare(t.id))[0]?.id === t.game.user.id;
}
function Re(e) {
	let n = e._source.actorId;
	return e._source.actorLink === !0 && !!n && t.game.actors.get(n)?.prototypeToken.actorLink === !0;
}
function ze(e, t) {
	return e.tokens.contents.filter((e) => e._source.actorId === t);
}
function Be(e, n) {
	Fe.has(e) || (Fe.add(e), t.ui.notifications.error(n));
}
function Ve(e) {
	Le() && (Pe = Pe.then(async () => {
		Le() && await e();
	}).catch(r));
}
function He() {
	let e = t.game.scenes.contents.flatMap((e) => {
		let n = t.game.scenes.get(String(e.getFlag("infinite-scenes", "viewId")))?.getFlag("infinite-scenes", "enabled") ? De(e) : null;
		return n ? [{
			source: e,
			...n
		}] : [];
	});
	return e.filter((t) => e.filter((e) => e.child.id === t.child.id).length === 1 ? !0 : (Be(t.child.id, `Movement sync skipped: ${t.child.name} is placed on multiple radars.`), !1));
}
async function Ue(n) {
	if (!(Ie.has(n._source.actorId ?? "") || !Re(n) || !n.parent.tokens.get(n.id))) for (let { source: r, child: i, placement: a } of He()) {
		if (n.parent.id !== r.id && n.parent.id !== i.id) continue;
		let s = n.parent.id === r.id, c = s ? i : r, l = n._source.actorId, u = ze(n.parent, l), d = ze(c, l);
		if (u.length !== 1 || d.length > 1 || d[0] && !Re(d[0])) {
			Be(`${r.id}:${l}`, `Movement sync skipped for ${n.name}: use one linked token per Actor in each scene.`);
			continue;
		}
		let f = i.getDimensions(), p = Ae(o(n), a, f, s), m = d[0], h = m?._source.flags?.[e]?.parked;
		if (s && !je(p, f)) {
			m && !h && await m.update({
				hidden: !0,
				[`flags.${e}.parked`]: { hidden: !!m._source.hidden }
			}, Ne());
			continue;
		}
		if (!s && n._source.flags?.["infinite-scenes"]?.parked) continue;
		let g = {
			x: p.x,
			y: p.y,
			width: p.width / c.grid.size,
			height: p.height / c.grid.size
		};
		if (h && typeof h == "object" && (g.hidden = h.hidden, g[`flags.${e}.-=parked`] = null), m) Object.entries(g).some(([e, t]) => m._source[e] !== t) && await m.update(g, Ne());
		else {
			let e = await t.game.actors.get(l).getTokenDocument({
				...g,
				actorLink: !0,
				hidden: !!n._source.hidden,
				level: c.levels.contents[0].id
			});
			Ie.has(l) || await c.createEmbeddedDocuments("Token", [e.toObject()], Ne());
		}
	}
}
async function We() {
	for (let { source: e, child: t } of He()) {
		for (let t of [...e.tokens.contents]) await Ue(t);
		for (let n of [...t.tokens.contents]) ze(e, n._source.actorId ?? "").length || await Ue(n);
	}
}
async function Ge(e) {
	let t = e._source.actorId;
	if (t) {
		if (Re(e)) for (let { source: n, child: r } of He()) {
			if (e.parent.id !== n.id && e.parent.id !== r.id) continue;
			let i = ze(e.parent.id === n.id ? r : n, t);
			if (ze(e.parent, t).length || i.length > 1 || i[0] && !Re(i[0])) {
				Be(`${n.id}:${t}:delete`, `Deletion sync skipped for ${e.name}: ambiguous Actor tokens.`);
				continue;
			}
			for (let e of i) await e.delete(Ne());
		}
		await de(t);
	}
}
function Ke() {
	n("deleteToken", (e, t) => {
		let n = e._source.actorId;
		t[Me] || !n || !Le() || (Ie.set(n, (Ie.get(n) ?? 0) + 1), Ve(async () => {
			try {
				await Ge(e);
			} finally {
				let e = (Ie.get(n) ?? 1) - 1;
				e ? Ie.set(n, e) : Ie.delete(n);
			}
		}));
	}), n("ready", () => Ve(We)), n("updateUser", () => Ve(We)), n("userConnected", () => Ve(We)), n("updateScene", () => Ve(We)), n("createToken", (e, t) => {
		t[Me] || Ve(() => Ue(e));
	}), n("updateToken", (e, t, n) => {
		n[Me] || ![
			"x",
			"y",
			"width",
			"height",
			"actorId",
			"actorLink"
		].some((e) => e in t) || Ve(() => Ue(e));
	});
}
//#endregion
//#region src/module/foundry/radar/nesting/settings.ts
var qe = "transitionThresholds";
function Je() {
	n("init", () => t.game.settings.register(e, qe, {
		scope: "client",
		config: !1,
		type: Object,
		default: m
	}));
}
function Ye() {
	let n = t.game.settings.get(e, qe);
	return h(n) ? n : m;
}
async function Xe() {
	let n = Ye(), r = await t.foundry.applications.api.DialogV2.wait({
		window: { title: "Scene transition settings" },
		content: `<p>These settings affect your view on this browser. Coverage is the larger of the map’s width / viewport width and height / viewport height.</p>
      <div class="form-group"><label for="transition-enter">Enter scene at (%)</label><input id="transition-enter" name="enter" type="number" min="10" max="200" step="1" value="${n.enter}" required></div>
      <div class="form-group"><label for="transition-exit">Return to radar at (%)</label><input id="transition-exit" name="exit" type="number" min="5" max="195" step="1" value="${n.exit}" required></div>
      <p class="hint">Entry must be at least 5 percentage points above return to prevent repeated switching. Defaults: enter 85%, return 55%. Higher entry means zooming in further; lower return means zooming out further.</p>`,
		buttons: [
			{
				action: "save",
				label: "Save",
				default: !0,
				callback: (e, t, n) => {
					let r = (e) => Number(n.element.querySelector(`[name="${e}"]`).value), i = {
						enter: r("enter"),
						exit: r("exit")
					};
					if (!h(i)) throw Error("Use 5–200% coverage, with entry at least 5 percentage points above return.");
					return i;
				}
			},
			{
				action: "reset",
				label: "Reset to defaults",
				type: "button",
				callback: () => ({ ...m })
			},
			{
				action: "cancel",
				label: "Cancel",
				type: "button"
			}
		]
	});
	h(r) && (await t.game.settings.set(e, qe, r), t.ui.notifications.info(`Scene transitions saved: enter ${r.enter}%, return ${r.exit}%.`));
}
//#endregion
//#region src/module/foundry/radar/linked-tokens.ts
var Ze = "Radar requires linked tokens and Link Actor Data enabled in the actor’s Prototype Token settings. Existing unlinked tokens must be replaced deliberately; they are not converted automatically.";
function Qe(e) {
	return !!v(e);
}
function $e(e) {
	return e.actorLink === !0 && typeof e.actorId == "string" && t.game.actors.get(e.actorId)?.prototypeToken.actorLink === !0;
}
function et(e) {
	if (e.tokens.contents.some((e) => !$e(e._source))) throw Error(Ze);
}
function tt() {
	n("preCreateToken", (e) => {
		if (Qe(e.parent) && !$e(e._source)) return t.ui.notifications.error(Ze), !1;
	}), n("preUpdateToken", (e, n) => {
		if (("actorLink" in n || "actorId" in n) && Qe(e.parent) && !$e({
			...e._source,
			...n
		})) return t.ui.notifications.error(Ze), !1;
	}), n("preUpdateActor", (e, n) => {
		let r = n.prototypeToken;
		if (!(n["prototypeToken.actorLink"] !== !1 && r?.actorLink !== !1) && t.game.scenes.contents.some((t) => Qe(t) && t.tokens.contents.some((t) => t._source.actorId === e.id))) return t.ui.notifications.error("Remove this actor from radar before disabling Link Actor Data."), !1;
	});
}
//#endregion
//#region src/module/foundry/radar/nesting/transition.ts
var nt = null, rt = !1, S = !1, it = () => null;
function at() {
	return `infinite-scenes:trip:${t.game.world.id}:${t.game.user.id}`;
}
function ot(e) {
	nt = e;
	try {
		e ? sessionStorage.setItem(at(), JSON.stringify(e)) : sessionStorage.removeItem(at());
	} catch {}
}
function st() {
	if (!rt) {
		rt = !0;
		try {
			let e = JSON.parse(sessionStorage.getItem(at()) ?? "null");
			e && f(e.placement) && [
				e.sourceId,
				e.viewId,
				e.childId
			].every((e) => typeof e == "string") && e.camera && [
				e.camera.x,
				e.camera.y,
				e.camera.scale
			].every(Number.isFinite) && e.camera.scale > 0 && (nt = e);
		} catch {}
	}
	let e = t.canvas.scene;
	if (e && !S) {
		let n = _(e);
		n && (t.game.user.isGM || n.source.testUserPermission(t.game.user, "OBSERVER")) ? nt = {
			sourceId: n.source.id,
			viewId: n.view.id,
			childId: e.id,
			placement: n.placement,
			camera: {
				x: n.placement.x,
				y: n.placement.y,
				scale: 1
			}
		} : nt?.childId === e.id && (nt = null);
	}
	return nt;
}
var ct = () => ({
	x: t.canvas.stage.pivot.x,
	y: t.canvas.stage.pivot.y,
	scale: t.canvas.stage.scale.x
});
async function lt(e) {
	let t = performance.now() + 2e4;
	for (; !e();) {
		if (performance.now() > t) throw Error("Scene loading timed out. You can retry from radar.");
		await new Promise((e) => requestAnimationFrame(() => e()));
	}
}
async function ut(e) {
	if (S) return;
	S = !0;
	let t = document.createElement("div");
	t.setAttribute("aria-label", "Changing scene view"), t.setAttribute("role", "status"), Object.assign(t.style, {
		position: "fixed",
		inset: "0",
		background: "#102820",
		zIndex: "100",
		opacity: "0",
		pointerEvents: "auto"
	}), document.body.append(t);
	let n = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160;
	try {
		await t.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: n,
			fill: "forwards"
		}).finished, await e();
	} finally {
		try {
			await t.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: n,
				fill: "forwards"
			}).finished;
		} finally {
			t.remove(), S = !1;
		}
	}
}
async function dt(e) {
	if (S || !e.element.isConnected || t.canvas.loading) return;
	let n = De(e.source);
	if (!n) throw Error("No accessible nested scene is placed here.");
	let { placement: r, child: i } = n, a = {
		sourceId: e.source.id,
		viewId: e.view.id,
		childId: i.id,
		placement: { ...r },
		camera: { ...e.camera }
	};
	await ut(async () => {
		try {
			let n = De(e.source);
			if (!n || JSON.stringify(n.placement) !== JSON.stringify(r) || !e.view.getFlag("infinite-scenes", "enabled")) throw Error("Scene access or radar configuration changed.");
			let o = u(a.camera, r, i.getDimensions());
			if (ot(a), await i.view(), await lt(() => !t.canvas.loading), t.canvas.scene?.id !== i.id) throw Error("The child scene could not be opened.");
			t.canvas.pan(o), await t.ui.controls.render({
				reset: !0,
				control: "tokens"
			});
		} catch (n) {
			ot(null), t.canvas.scene?.id !== e.view.id && (await lt(() => !t.canvas.loading), await e.view.view(), await lt(() => !!it()));
			let r = it();
			throw r && (r.camera = a.camera, r.draw()), n;
		}
	});
}
function ft(e, t) {
	let n = De(e.source);
	if (!n || S) return;
	let i = l(n.placement, n.child.getDimensions());
	we(i, t) && p(i.width, i.height, e.camera.scale, e.size) >= Ye().enter / 100 && dt(e).catch(r);
}
async function pt() {
	let e = st();
	if (!e || S) return;
	let n = t.game.scenes.get(e.sourceId), r = t.game.scenes.get(e.viewId), i = t.game.scenes.get(e.childId);
	if (!n || !r?.getFlag("infinite-scenes", "enabled") || !i) throw Error("The radar link is unavailable. Use scene navigation; no content has been moved.");
	if (!t.game.user.isGM && !n.testUserPermission(t.game.user, "OBSERVER")) throw Error("You no longer have access to this radar.");
	let a = t.canvas.scene?.id === i.id ? d(ct(), e.placement, i.getDimensions()) : e.camera;
	await ut(async () => {
		try {
			await r.view(), await lt(() => it()?.view.id === r.id);
			let e = it();
			e.camera = a, e.draw(), ot(null);
		} catch (n) {
			throw t.canvas.scene?.id !== i.id && (await lt(() => !t.canvas.loading), await i.view(), await lt(() => !t.canvas.loading), t.canvas.pan(u(a, e.placement, i.getDimensions()))), n;
		}
	});
}
function mt(e) {
	let n = st();
	!n || t.canvas.scene?.id !== n.childId || e.tokens?.tools && (e.tokens.tools.returnToRadar = {
		name: "returnToRadar",
		title: "Return to radar",
		icon: "fa-solid fa-satellite-dish",
		order: 99,
		button: !0,
		onChange: () => {
			pt().catch(r);
		}
	});
}
function ht(e) {
	it = e, n("getSceneControlButtons", mt), n("canvasReady", () => {
		let e = st();
		!e || S || [
			e.childId,
			e.viewId,
			e.sourceId
		].includes(t.canvas.scene?.id ?? "") || ot(null);
	});
	let i = 0, a = 0, o = 0;
	document.addEventListener("wheel", (e) => {
		let n = st();
		if (!n || S || e.deltaY <= 0 || t.canvas.scene?.id !== n.childId || e.target !== t.canvas.app.view) return;
		let s = t.game.scenes.get(n.childId);
		if (!s) return;
		let c = s.getDimensions(), l = t.canvas.stage.scale.x, u = performance.now(), f = (l === i && u - o < 1500 ? a : l) * Math.exp(-Math.min(100, e.deltaY) * .002);
		if (i = l, a = f, o = u, p(c.sceneWidth, c.sceneHeight, f, {
			x: innerWidth,
			y: innerHeight
		}) > Ye().exit / 100) return;
		e.preventDefault(), e.stopImmediatePropagation();
		let m = d({
			...ct(),
			scale: f
		}, n.placement, c);
		pt().then(() => {
			let e = it();
			e && (e.camera = m, e.draw());
		}).catch(r);
	}, {
		capture: !0,
		passive: !1
	});
}
//#endregion
//#region src/module/foundry/radar/configuration.ts
var gt = /* @__PURE__ */ new Set();
async function _t(n) {
	if (!t.game.user.isGM) throw Error("Only the GM can enable radar.");
	let r = i(n);
	if (r.getFlag("infinite-scenes", "parentRadarId")) throw Error("Detach this scene from its parent radar before enabling radar on it.");
	if (c(r), et(r), gt.has(r.id)) throw Error("Radar setup is already running.");
	gt.add(r.id);
	try {
		let n = r.getFlag(e, "viewId"), i = typeof n == "string" ? t.game.scenes.get(n) : void 0;
		return i ??= t.game.scenes.find((t) => t.getFlag(e, "sourceId") === r.id), i ??= await t.foundry.documents.Scene.create({
			name: `${r.name} — Radar`,
			width: 1e3,
			height: 1e3,
			padding: 0,
			tokenVision: !1,
			ownership: { ...r.ownership },
			grid: {
				type: 0,
				size: r.grid.size,
				distance: r.grid.distance,
				units: r.grid.units
			},
			flags: { [e]: {
				sourceId: r.id,
				schema: 1
			} }
		}), await r.update({
			[`flags.${e}.viewId`]: i.id,
			[`flags.${e}.schema`]: 1
		}), await i.update({ [`flags.${e}.enabled`]: !0 }), await i.view(), i;
	} finally {
		gt.delete(r.id);
	}
}
async function vt(n) {
	if (!t.game.user.isGM) throw Error("Only the GM can disable radar.");
	let r = i(n), a = t.game.scenes.get(String(r.getFlag(e, "viewId")));
	a && await a.update({ [`flags.${e}.enabled`]: !1 });
}
function yt(e, n) {
	if (!t.game.user.isGM || n.querySelector("[data-radar-config]")) return;
	let a = n.querySelector(".tab[data-tab=\"basics\"]");
	if (!a) return;
	let o = document.createElement("fieldset");
	o.dataset.radarConfig = "";
	let s = document.createElement("legend");
	s.textContent = "Infinite Scenes";
	let c = document.createElement("p");
	c.className = "hint", c.textContent = "Radar is a GM-revealed abstract map. Save your scene settings first. Requires one level, no walls and token vision off. Lighting, fog and regions are not simulated.";
	let l = document.createElement("button");
	l.type = "button", l.textContent = "Enable / open radar", l.addEventListener("click", () => {
		l.disabled = !0, _t(e.document).catch(r).finally(() => {
			l.disabled = !1;
		});
	}), o.append(s, c, l);
	let u = _(e.document, !1);
	u && (c.textContent = "This scene belongs to a radar. Unlinked Actor drops create numbered linked copies, and token movement stays synchronized. Scene permissions remain independent.", l.hidden = !0);
	let d = u?.source ?? i(e.document);
	if (u || d.getFlag("infinite-scenes", "nestedScene")) {
		let e = document.createElement("p");
		e.textContent = u ? `Parent radar: ${u.source.name}` : "This radar owns a nested scene placement.";
		let t = document.createElement("button");
		t.type = "button", t.textContent = "Detach nested scene (keep content)", t.addEventListener("click", () => {
			te(d).then(() => {
				e.textContent = "Detached from radar.", t.disabled = !0, l.hidden = !1;
			}).catch(r);
		}), o.append(e, t);
	}
	if (i(e.document).getFlag("infinite-scenes", "viewId")) {
		let t = document.createElement("button");
		t.type = "button", t.textContent = "Disable radar (keep content)", t.addEventListener("click", () => {
			vt(e.document).catch(r);
		}), o.append(t);
	}
	a.append(o);
}
function bt(e, t) {
	return Math.hypot(e.x - t.x, e.y - 26 - t.y) <= 19 || Math.hypot(e.x - t.x, e.y - t.y) <= 6;
}
function xt(e) {
	let t = [...e].sort((e, t) => e.id.localeCompare(t.id)).map((e) => ({
		x: e.x,
		y: e.y,
		members: [e.id]
	})), n = !0;
	for (; n;) {
		n = !1;
		for (let e = 0; e < t.length && !n; e++) for (let r = e + 1; r < t.length; r++) {
			let i = t[e], a = t[r];
			if (Math.hypot(i.x - a.x, i.y - a.y) >= 34) continue;
			let o = i.members.length + a.members.length;
			i.x = (i.x * i.members.length + a.x * a.members.length) / o, i.y = (i.y * i.members.length + a.y * a.members.length) / o, i.members.push(...a.members), t.splice(r, 1), n = !0;
			break;
		}
	}
	return t;
}
//#endregion
//#region src/module/foundry/radar/pins.ts
function St(e, t, n, r, i, a, s) {
	for (let c of t) {
		let t = c.members.length === 1 ? n.find((e) => e.id === c.members[0]) : void 0, l = c.members.includes(r ?? ""), u = c.y - 26;
		if (e.save(), e.globalAlpha = t?._source.hidden ? .45 : 1, e.strokeStyle = l ? "#ffffff" : "#c3e87c", e.fillStyle = "#183c37", e.lineWidth = 2, e.beginPath(), e.moveTo(c.x - 7, u + 10), e.lineTo(c.x, c.y), e.lineTo(c.x + 7, u + 10), e.fill(), e.stroke(), e.beginPath(), e.arc(c.x, u, 16, 0, Math.PI * 2), e.fill(), t) {
			let n = t._source.texture?.src, r = n ? i(n) : void 0;
			e.save(), e.clip(), r?.complete && r.naturalWidth ? e.drawImage(r, c.x - 16, u - 16, 32, 32) : (e.fillStyle = "#e0ecd5", e.textAlign = "center", e.font = "bold 14px sans-serif", e.fillText(t.name.slice(0, 1) || "?", c.x, u + 5)), e.restore();
		} else e.fillStyle = "#e0ecd5", e.textAlign = "center", e.font = "bold 13px sans-serif", e.fillText(String(c.members.length), c.x, u + 5);
		if (e.stroke(), e.beginPath(), e.arc(c.x, c.y, 2, 0, Math.PI * 2), e.fillStyle = "#e0ecd5", e.fill(), l && !t) {
			let t = n.find((e) => e.id === r);
			if (t) {
				let n = o(t), r = ye({
					x: n.x + n.width / 2,
					y: n.y + n.height / 2
				}, a, s);
				e.beginPath(), e.arc(r.x, r.y, 4, 0, Math.PI * 2), e.stroke();
			}
		}
		e.restore();
	}
}
//#endregion
//#region src/module/foundry/radar/surface.ts
var Ct = class {
	source;
	view;
	element = document.createElement("canvas");
	context;
	camera = {
		x: 0,
		y: 0,
		scale: 1
	};
	size = {
		x: 1,
		y: 1
	};
	tool = "select";
	selected = null;
	groups = [];
	preview = null;
	measure = null;
	cleanup = [];
	images = /* @__PURE__ */ new Map();
	frame = 0;
	alive = !0;
	key;
	constructor(e, n) {
		this.source = e, this.view = n, this.context = this.element.getContext("2d"), this.key = `infinite-scenes:${t.game.world.id}:${t.game.user.id}:${e.id}`, this.element.id = "infinite-scenes-radar", this.element.tabIndex = 0, this.element.setAttribute("aria-label", "Radar battlefield. Drag empty space to pan, wheel to zoom. Use the radar scene controls for selection, measurement and terrain."), Object.assign(this.element.style, {
			position: "fixed",
			inset: "0",
			width: "100%",
			height: "100%",
			zIndex: "0",
			touchAction: "none"
		}), t.canvas.app.view.after(this.element);
		let r = () => {
			this.size = {
				x: innerWidth,
				y: innerHeight
			};
			let e = devicePixelRatio || 1;
			this.element.width = innerWidth * e, this.element.height = innerHeight * e, this.context.setTransform(e, 0, 0, e, 0, 0), this.draw();
		};
		r(), this.camera = Te(this.contentBounds(), this.size);
		try {
			let e = JSON.parse(localStorage.getItem(this.key) ?? "null");
			e && [
				e.x,
				e.y,
				e.scale
			].every(Number.isFinite) && e.scale >= 1e-5 && e.scale <= 8 && (this.camera = e);
		} catch {}
		window.addEventListener("resize", r), this.cleanup.push(() => window.removeEventListener("resize", r));
		let i = () => {
			try {
				localStorage.setItem(this.key, JSON.stringify(this.camera));
			} catch {}
		};
		window.addEventListener("pagehide", i), this.cleanup.push(() => window.removeEventListener("pagehide", i)), this.draw();
	}
	documents() {
		return a(this.source);
	}
	selection() {
		return this.documents().find((e) => e.id === this.selected);
	}
	contentBounds() {
		let e = De(this.source);
		return [...this.documents().map(o), ...e ? [l(e.placement, e.child.getDimensions())] : []];
	}
	focus() {
		this.camera = Te(this.contentBounds(), this.size), this.draw();
	}
	draw = () => {
		!this.alive || this.frame || (this.frame = requestAnimationFrame(() => {
			this.frame = 0, this.paint();
		}));
	};
	image(e) {
		let t = this.images.get(e);
		return t || (t = new Image(), t.onload = this.draw, t.onerror = this.draw, t.src = e, this.images.set(e, t)), t;
	}
	paint() {
		let e = this.context, t = this.camera, n = this.size;
		e.fillStyle = "#102820", e.fillRect(0, 0, n.x, n.y);
		let r = 10 ** Math.floor(Math.log10(120 / t.scale)), i = r * t.scale, a = ye({
			x: 0,
			y: 0
		}, t, n);
		e.strokeStyle = "#315341", e.lineWidth = 1, e.beginPath();
		for (let t = (a.x % i + i) % i; t < n.x; t += i) e.moveTo(t, 0), e.lineTo(t, n.y);
		for (let t = (a.y % i + i) % i; t < n.y; t += i) e.moveTo(0, t), e.lineTo(n.x, t);
		e.stroke(), ke(this, (e) => this.image(e));
		let s = [];
		for (let r of this.documents()) {
			let i = o(r), a = ye(i, t, n), c = i.width * t.scale, l = i.height * t.scale;
			if (a.x + c < -80 || a.y + l < -80 || a.x > n.x + 80 || a.y > n.y + 80) continue;
			if (r.documentName === "Token" && Math.max(c, l) < 36) {
				s.push({
					id: r.id,
					x: a.x + c / 2,
					y: a.y + l / 2
				});
				continue;
			}
			e.save(), e.translate(a.x + c / 2, a.y + l / 2), e.rotate((r._source.rotation ?? 0) * Math.PI / 180), e.fillStyle = r.documentName === "Token" ? "#426c3b" : "#254e49", e.strokeStyle = r.id === this.selected ? "#ffffff" : r.documentName === "Tile" ? "#85c9d9" : "#c3e87c", e.globalAlpha = r._source.hidden?.valueOf() ? .45 : 1, e.lineWidth = r.id === this.selected ? 3 : 1.5, e.fillRect(-c / 2, -l / 2, c, l);
			let u = r._source.texture?.src;
			if (u) {
				let t = this.image(u);
				t.complete && t.naturalWidth && e.drawImage(t, -c / 2, -l / 2, c, l);
			}
			e.strokeRect(-c / 2, -l / 2, c, l), e.restore(), r.documentName === "Token" && (e.fillStyle = "#e0ecd5", e.font = "13px sans-serif", e.fillText(r.name, a.x, a.y - 7));
		}
		if (this.groups = xt(s), St(e, this.groups, this.documents(), this.selected, (e) => this.image(e), t, n), this.preview) {
			let r = ye(this.preview, t, n);
			e.strokeStyle = "#ffffff", e.strokeRect(r.x, r.y, this.preview.width * t.scale, this.preview.height * t.scale);
		}
		let c = "";
		if (this.measure) {
			let r = ye(this.measure.a, t, n), i = ye(this.measure.b, t, n);
			e.strokeStyle = "#ffffff", e.beginPath(), e.moveTo(r.x, r.y), e.lineTo(i.x, i.y), e.stroke(), c = ` · ${Se(this.measure.a, this.measure.b, this.source.grid.size, this.source.grid.distance).toLocaleString(void 0, { maximumFractionDigits: 2 })} ${this.source.grid.units}`;
		}
		e.fillStyle = "#e0ecd5", e.font = "14px sans-serif", e.fillText(`Radar · grid ${(r / this.source.grid.size * this.source.grid.distance).toLocaleString()} ${this.source.grid.units} · ${this.tool}${c}`, 110, 96);
		let l = this.selection();
		l && e.fillText(`Selected: ${l.name || l.documentName}`, 110, 118);
	}
	destroy() {
		this.alive = !1, cancelAnimationFrame(this.frame);
		try {
			localStorage.setItem(this.key, JSON.stringify(this.camera));
		} catch {}
		this.cleanup.splice(0).forEach((e) => e());
		for (let e of this.images.values()) e.onload = null, e.onerror = null;
		this.images.clear(), this.element.remove();
	}
};
//#endregion
//#region src/module/foundry/radar/actions.ts
async function wt(e, n) {
	let r = e.documents().filter((e) => !n || n.includes(e.id));
	if (!r.length) return;
	let i = await t.foundry.applications.api.DialogV2.prompt({
		window: { title: "Radar entities" },
		content: `<div class="form-group"><label for="radar-entity">Entity</label><select id="radar-entity" name="entity">${r.map((e) => `<option value="${x(e.id)}">${x(e.name || e.documentName)}</option>`).join("")}</select></div>`,
		ok: {
			label: "Select and focus",
			callback: (e, t, n) => n.element.querySelector("[name=\"entity\"]").value
		}
	}), a = e.documents().find((e) => e.id === i);
	if (!a || !e.element.isConnected) return;
	e.selected = a.id;
	let s = o(a);
	e.camera = {
		x: s.x + s.width / 2,
		y: s.y + s.height / 2,
		scale: Math.min(2, Math.max(.1, 100 / Math.max(s.width, s.height)))
	}, e.draw();
}
async function Tt(e, t, n, r) {
	if (!e.element.isConnected || !e.documents().includes(t) || !s(t)) throw Error("This entity cannot be moved by you right now.");
	if (![n, r].every(Number.isFinite)) throw Error("Coordinates must be finite.");
	await t.update({
		x: n,
		y: r
	}, { animate: !1 });
}
async function Et(e) {
	if (!t.game.user.isGM) return;
	let n = await t.foundry.applications.api.DialogV2.prompt({
		window: { title: "Place radar tile" },
		content: "<div class=\"form-group\"><label for=\"radar-path\">Image path</label><input id=\"radar-path\" name=\"path\" type=\"text\" required></div><div class=\"form-group\"><label for=\"radar-width\">Width in scene units</label><input id=\"radar-width\" name=\"width\" type=\"number\" min=\"0.01\" value=\"10\" required></div><div class=\"form-group\"><label for=\"radar-height\">Height in scene units</label><input id=\"radar-height\" name=\"height\" type=\"number\" min=\"0.01\" value=\"10\" required></div>",
		ok: {
			label: "Place at view center",
			callback: (e, t, n) => ({
				path: n.element.querySelector("[name=\"path\"]").value,
				width: Number(n.element.querySelector("[name=\"width\"]").value),
				height: Number(n.element.querySelector("[name=\"height\"]").value)
			})
		}
	});
	if (!n || !e.element.isConnected) return;
	if (!n.path || ![n.width, n.height].every((e) => Number.isFinite(e) && e > 0)) throw Error("Provide an image path and positive dimensions.");
	let r = new Image();
	r.src = n.path;
	try {
		await r.decode();
	} catch {
		throw Error("The tile image could not be loaded. Check its path.");
	}
	if (!e.element.isConnected) return;
	let i = e.source.grid.size / e.source.grid.distance;
	await e.source.createEmbeddedDocuments("Tile", [{
		x: e.camera.x,
		y: e.camera.y,
		width: n.width * i,
		height: n.height * i,
		texture: { src: n.path },
		level: e.source.levels.contents[0].id
	}]);
}
function Dt(e) {
	let t = e.selection();
	t?.isOwner && t.actor?.sheet.render({ force: !0 });
}
function Ot(e) {
	let n = e.selection();
	t.game.user.isGM && n && n.update({ hidden: !n._source.hidden }).catch(r);
}
//#endregion
//#region src/module/foundry/radar/interaction.ts
function kt(e) {
	let n = e.element, i = null, a = (e) => ({
		x: e.clientX,
		y: e.clientY
	}), c = (t) => be(t, e.camera, e.size), l = (t) => e.documents().slice().reverse().find((e) => {
		let n = o(e), r = {
			x: n.x + n.width / 2,
			y: n.y + n.height / 2
		}, i = -(e._source.rotation ?? 0) * Math.PI / 180, a = t.x - r.x, s = t.y - r.y;
		return we(n, {
			x: r.x + a * Math.cos(i) - s * Math.sin(i),
			y: r.y + a * Math.sin(i) + s * Math.cos(i)
		});
	}), u = (o) => {
		if (o.button !== 0 && o.button !== 2) return;
		o.preventDefault(), o.stopImmediatePropagation(), n.focus();
		let u = a(o), d = c(u), f = e.groups.find((e) => bt(e, u));
		if (o.button === 0 && e.tool === "select" && f) {
			if (f.members.length > 1) {
				wt(e, f.members).catch(r);
				return;
			}
			e.selected = f.members[0] ?? null;
		}
		let p = f ? e.documents().find((e) => e.id === f.members[0]) : l(d), m = o.button === 2 ? "pan" : e.tool === "select" ? p ? "move" : "pan" : e.tool;
		m === "move" && (e.selected = p.id, e.draw(), !s(p)) || m === "draw" && !t.game.user.isGM || (i = {
			start: u,
			current: u,
			camera: { ...e.camera },
			mode: m,
			...p ? {
				entity: p,
				origin: {
					x: p._source.x,
					y: p._source.y
				}
			} : {}
		}, n.setPointerCapture(o.pointerId));
	}, d = (t) => {
		if (!i) return;
		t.preventDefault(), i.current = a(t);
		let n = (t.clientX - i.start.x) / i.camera.scale, r = (t.clientY - i.start.y) / i.camera.scale;
		i.mode === "pan" && (e.camera = {
			...i.camera,
			x: i.camera.x - n,
			y: i.camera.y - r
		}), i.mode === "measure" && (e.measure = {
			a: be(i.start, i.camera, e.size),
			b: c(i.current)
		}), i.mode === "draw" && (e.preview = Ce(be(i.start, i.camera, e.size), c(i.current))), i.mode === "move" && i.entity && i.origin && (e.preview = {
			...o(i.entity),
			x: i.origin.x + n,
			y: i.origin.y + r
		}), e.draw();
	}, f = (a) => {
		if (!i) return;
		d(a);
		let o = i;
		i = null;
		let s = e.preview;
		e.preview = null, e.draw(), n.hasPointerCapture(a.pointerId) && n.releasePointerCapture(a.pointerId), o.mode === "move" && o.entity && s && Tt(e, o.entity, s.x, s.y).catch(r), o.mode === "draw" && s && s.width > 0 && s.height > 0 && t.game.user.isGM && e.source.createEmbeddedDocuments("Drawing", [{
			x: s.x,
			y: s.y,
			shape: {
				type: "r",
				width: s.width,
				height: s.height
			},
			strokeColor: "#c3e87c",
			strokeWidth: 2,
			fillType: 1,
			fillColor: "#254e49",
			level: e.source.levels.contents[0].id
		}]).catch(r);
	}, p = () => {
		i = null, e.preview = null, e.draw();
	}, m = (t) => {
		t.preventDefault(), t.stopImmediatePropagation(), !i && (e.camera = xe(e.camera, a(t), e.size, Math.exp(-Math.max(-100, Math.min(100, t.deltaY)) * .002)), e.draw(), t.deltaY < 0 && ft(e, c(a(t))));
	}, h = () => Dt(e), g = (e) => e.preventDefault(), _ = (n) => {
		if (n.key === "Escape" && p(), n.key === "Delete" || n.key === "Backspace") {
			n.preventDefault(), n.stopImmediatePropagation();
			let i = e.selection();
			t.game.user.isGM && i?.documentName === "Token" && s(i) && i.delete().catch(r);
		}
		let i = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1]
		}[n.key];
		i && (n.preventDefault(), e.camera.x += i[0] * 100 / e.camera.scale, e.camera.y += i[1] * 100 / e.camera.scale, e.draw()), [
			"+",
			"=",
			"-"
		].includes(n.key) && (n.preventDefault(), e.camera = xe(e.camera, {
			x: e.size.x / 2,
			y: e.size.y / 2
		}, e.size, n.key === "-" ? .8 : 1.25), e.draw()), n.key === "Home" && (n.preventDefault(), e.focus()), n.key === "Enter" && wt(e).catch(r);
	}, v = async (n) => {
		n.preventDefault(), n.stopImmediatePropagation();
		try {
			let r = JSON.parse(n.dataTransfer?.getData("text/plain") ?? "{}");
			if (r.type !== "Actor" || !r.uuid) return;
			let i = await t.fromUuid(r.uuid);
			if (!i?.isOwner || !t.game.user.isGM && t.game.paused) throw Error("You cannot place this actor right now.");
			let o = c(a(n));
			await ce(e.source, i, async (t) => {
				if (!e.element.isConnected) throw Error("Radar view changed during drop.");
				let n = await t.getTokenDocument({
					actorLink: !0,
					x: o.x,
					y: o.y,
					level: e.source.levels.contents[0].id
				});
				return e.source.createEmbeddedDocuments("Token", [n.toObject()]);
			});
		} catch (e) {
			r(e);
		}
	}, y = [
		["pointerdown", u],
		["pointermove", d],
		["pointerup", f],
		["pointercancel", p],
		["wheel", m],
		["dblclick", h],
		["contextmenu", g],
		["keydown", _],
		["dragover", g],
		["drop", (e) => {
			v(e);
		}]
	];
	for (let [e, t] of y) n.addEventListener(e, t, { passive: !1 });
	e.cleanup.push(() => y.forEach(([e, t]) => n.removeEventListener(e, t)));
}
//#endregion
//#region src/module/foundry/radar/index.ts
var C = null, At = 0;
function jt() {
	return C ? {
		sourceId: C.source.id,
		viewId: C.view.id,
		camera: { ...C.camera }
	} : null;
}
function Mt() {
	cancelAnimationFrame(At), At = 0, C?.destroy(), C = null;
}
async function Nt() {
	Mt();
	let n = t.canvas.scene;
	if (!n) return;
	if (n.getFlag("infinite-scenes", "sourceId") && !t.game.scenes.get(String(n.getFlag("infinite-scenes", "sourceId")))) throw Error("Radar backing scene is missing. Reopen the original scene configuration to repair the link.");
	let r = i(n), a = r.getFlag(e, "viewId"), o = typeof a == "string" ? t.game.scenes.get(a) : void 0;
	if (o?.getFlag("infinite-scenes", "enabled")) {
		if (n !== o) {
			await t.ui.controls.render({
				reset: !0,
				control: "tokens"
			}), await o.view();
			return;
		}
		if (c(r), !t.game.user.isGM && !r.testUserPermission(t.game.user, "OBSERVER")) throw Error("The GM must grant you access to the original radar scene.");
		if (r === o) throw Error("Radar backing scene is missing. Content has not been moved or deleted.");
		C = new Ct(r, o), kt(C), await t.ui.controls.render({
			reset: !0,
			control: "tokens"
		});
	}
}
function Pt(e) {
	let n = t.canvas.scene;
	if (!n?.getFlag("infinite-scenes", "enabled") || !n.getFlag("infinite-scenes", "sourceId")) return;
	let i = (e, n, r, i, a = !1, o = !1) => ({
		name: e,
		title: n,
		icon: r,
		order: 0,
		button: a,
		visible: !o || t.game.user.isGM,
		onChange: (e, t) => {
			(a || t) && i();
		}
	}), a = (e) => {
		C && (C.tool = e, C.draw());
	};
	e.tokens = {
		name: "tokens",
		title: "Radar battlefield",
		icon: "fa-solid fa-satellite-dish",
		order: 0,
		visible: !0,
		activeTool: "select",
		tools: {
			transitionSettings: i("transitionSettings", "Scene transition settings", "fa-solid fa-sliders", () => {
				Xe().catch(r);
			}, !0),
			placeScene: i("placeScene", "Place / edit nested scene", "fa-solid fa-map", () => {
				C && Oe(C).catch(r);
			}, !0, !0),
			enterScene: i("enterScene", "Enter nested scene", "fa-solid fa-door-open", () => {
				C && dt(C).catch(r);
			}, !0),
			select: i("select", "Select / drag · empty space pans", "fa-solid fa-arrow-pointer", () => a("select")),
			measure: i("measure", "Measure distance · drag between points", "fa-solid fa-ruler", () => a("measure")),
			draw: i("draw", "Draw terrain rectangle", "fa-solid fa-square", () => a("draw"), !1, !0),
			roster: i("roster", "Select entity from list", "fa-solid fa-list", () => {
				C && wt(C).catch(r);
			}, !0),
			fit: i("fit", "Fit all visible content", "fa-solid fa-expand", () => C?.focus(), !0),
			tile: i("tile", "Place tile image", "fa-solid fa-image", () => {
				C && Et(C).catch(r);
			}, !0, !0),
			sheet: i("sheet", "Open selected actor sheet", "fa-solid fa-user", () => {
				C && Dt(C);
			}, !0),
			hidden: i("hidden", "Hide / reveal selected entity", "fa-solid fa-eye-slash", () => {
				C && Ot(C);
			}, !0, !0)
		}
	};
}
function Ft() {
	cancelAnimationFrame(At);
	let e = t.canvas.scene, n = () => {
		if (t.canvas.scene === e) {
			if (t.canvas.loading) {
				At = requestAnimationFrame(n);
				return;
			}
			At = 0, Nt().catch(r);
		}
	};
	At = requestAnimationFrame(n);
}
function It() {
	ie(), le(), pe(), Ke(), Je(), tt(), ht(() => C), n("renderSceneConfig", yt), n("canvasReady", Ft), n("canvasTearDown", Mt), n("getSceneControlButtons", Pt), n("renderSceneControls", (e, n) => {
		if (!(!t.canvas.scene?.getFlag("infinite-scenes", "enabled") || !t.canvas.scene.getFlag("infinite-scenes", "sourceId"))) {
			for (let e of n.querySelectorAll("[data-control]")) e.dataset.control !== "tokens" && ((e.closest("li") ?? e).hidden = !0);
			e.control?.name !== "tokens" && requestAnimationFrame(() => {
				t.canvas.scene?.getFlag("infinite-scenes", "enabled") && e.render({ control: "tokens" }).catch(r);
			});
		}
	});
	for (let e of [
		"Token",
		"Tile",
		"Drawing",
		"Wall",
		"Region"
	]) for (let t of [
		"create",
		"update",
		"delete"
	]) n(`${t}${e}`, () => C?.draw());
	n("updateScene", (e) => {
		C?.draw(), (e.id === t.canvas.scene?.id || e.id === C?.source.id) && Nt().then(() => t.ui.controls.render({
			reset: !0,
			control: "tokens"
		})).catch(r);
	}), n("deleteScene", (e) => {
		(e.id === C?.source.id || e.id === C?.view.id) && (Mt(), t.ui.notifications.error("Radar scene link was removed. Reopen scene configuration to repair it."));
	});
	for (let e of [
		"Token",
		"Tile",
		"Drawing"
	]) n(`preCreate${e}`, (e) => {
		if (e.parent.getFlag("infinite-scenes", "sourceId") && e.parent.getFlag("infinite-scenes", "enabled")) return t.ui.notifications.error("Place content through radar controls, not the empty view scene."), !1;
	});
	n("preUpdateToken", (n, r) => {
		if (!("x" in r || "y" in r)) return;
		let i = n.parent.getFlag(e, "viewId");
		if ((typeof i == "string" ? t.game.scenes.get(i) : void 0)?.getFlag("infinite-scenes", "enabled") && t.canvas.scene?.id === n.parent.id) return t.ui.notifications.error("Open the radar view before moving its tokens."), !1;
	});
}
//#endregion
//#region src/module/constants.ts
var w = "infinite-scenes", Lt = "Infinite Scenes";
//#endregion
//#region node_modules/@vue/shared/dist/shared.esm-bundler.js
// @__NO_SIDE_EFFECTS__
function Rt(e) {
	let t = /* @__PURE__ */ Object.create(null);
	for (let n of e.split(",")) t[n] = 1;
	return (e) => e in t;
}
var T = {}, zt = [], E = () => {}, Bt = () => !1, Vt = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Ht = (e) => e.startsWith("onUpdate:"), D = Object.assign, Ut = (e, t) => {
	let n = e.indexOf(t);
	n > -1 && e.splice(n, 1);
}, Wt = Object.prototype.hasOwnProperty, O = (e, t) => Wt.call(e, t), k = Array.isArray, Gt = (e) => Zt(e) === "[object Map]", Kt = (e) => Zt(e) === "[object Set]", qt = (e) => Zt(e) === "[object Date]", A = (e) => typeof e == "function", j = (e) => typeof e == "string", Jt = (e) => typeof e == "symbol", M = (e) => typeof e == "object" && !!e, Yt = (e) => (M(e) || A(e)) && A(e.then) && A(e.catch), Xt = Object.prototype.toString, Zt = (e) => Xt.call(e), Qt = (e) => Zt(e).slice(8, -1), $t = (e) => Zt(e) === "[object Object]", en = (e) => j(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, tn = /* @__PURE__ */ Rt(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), nn = (e) => {
	let t = /* @__PURE__ */ Object.create(null);
	return ((n) => t[n] || (t[n] = e(n)));
}, rn = /-\w/g, N = nn((e) => e.replace(rn, (e) => e.slice(1).toUpperCase())), an = /\B([A-Z])/g, on = nn((e) => e.replace(an, "-$1").toLowerCase()), sn = nn((e) => e.charAt(0).toUpperCase() + e.slice(1)), cn = nn((e) => e ? `on${sn(e)}` : ""), P = (e, t) => !Object.is(e, t), ln = (e, ...t) => {
	for (let n = 0; n < e.length; n++) e[n](...t);
}, un = (e, t, n, r = !1) => {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		writable: r,
		value: n
	});
}, dn = (e) => {
	let t = parseFloat(e);
	return isNaN(t) ? e : t;
}, fn, pn = () => fn ||= typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
function mn(e) {
	if (k(e)) {
		let t = {};
		for (let n = 0; n < e.length; n++) {
			let r = e[n], i = j(r) ? vn(r) : mn(r);
			if (i) for (let e in i) t[e] = i[e];
		}
		return t;
	} else if (j(e) || M(e)) return e;
}
var hn = /;(?![^(]*\))/g, gn = /:([^]+)/, _n = /\/\*[^]*?\*\//g;
function vn(e) {
	let t = {};
	return e.replace(_n, "").split(hn).forEach((e) => {
		if (e) {
			let n = e.split(gn);
			n.length > 1 && (t[n[0].trim()] = n[1].trim());
		}
	}), t;
}
function yn(e) {
	let t = "";
	if (j(e)) t = e;
	else if (k(e)) for (let n = 0; n < e.length; n++) {
		let r = yn(e[n]);
		r && (t += r + " ");
	}
	else if (M(e)) for (let n in e) e[n] && (t += n + " ");
	return t.trim();
}
var bn = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", xn = /* @__PURE__ */ Rt(bn);
bn + "";
function Sn(e) {
	return !!e || e === "";
}
function Cn(e, t) {
	if (e.length !== t.length) return !1;
	let n = !0;
	for (let r = 0; n && r < e.length; r++) n = wn(e[r], t[r]);
	return n;
}
function wn(e, t) {
	if (e === t) return !0;
	let n = qt(e), r = qt(t);
	if (n || r) return n && r ? e.getTime() === t.getTime() : !1;
	if (n = Jt(e), r = Jt(t), n || r) return e === t;
	if (n = k(e), r = k(t), n || r) return n && r ? Cn(e, t) : !1;
	if (n = M(e), r = M(t), n || r) {
		if (!n || !r || Object.keys(e).length !== Object.keys(t).length) return !1;
		for (let n in e) {
			let r = e.hasOwnProperty(n), i = t.hasOwnProperty(n);
			if (r && !i || !r && i || !wn(e[n], t[n])) return !1;
		}
	}
	return String(e) === String(t);
}
//#endregion
//#region node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
var F, Tn = class {
	constructor(e = !1) {
		this.detached = e, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !e && F && (F.active ? (this.parent = F, this.index = (F.scopes ||= []).push(this) - 1) : (this._active = !1, this._warnOnRun = !1));
	}
	get active() {
		return this._active;
	}
	pause() {
		if (this._active) {
			this._isPaused = !0;
			let e, t;
			if (this.scopes) for (e = 0, t = this.scopes.length; e < t; e++) this.scopes[e].pause();
			for (e = 0, t = this.effects.length; e < t; e++) this.effects[e].pause();
		}
	}
	resume() {
		if (this._active && this._isPaused) {
			this._isPaused = !1;
			let e, t;
			if (this.scopes) for (e = 0, t = this.scopes.length; e < t; e++) this.scopes[e].resume();
			for (e = 0, t = this.effects.length; e < t; e++) this.effects[e].resume();
		}
	}
	run(e) {
		if (this._active) {
			let t = F;
			try {
				return F = this, e();
			} finally {
				F = t;
			}
		}
	}
	on() {
		++this._on === 1 && (this.prevScope = F, F = this);
	}
	off() {
		if (this._on > 0 && --this._on === 0) {
			if (F === this) F = this.prevScope;
			else {
				let e = F;
				for (; e;) {
					if (e.prevScope === this) {
						e.prevScope = this.prevScope;
						break;
					}
					e = e.prevScope;
				}
			}
			this.prevScope = void 0;
		}
	}
	stop(e) {
		if (this._active) {
			this._active = !1;
			let t, n;
			for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].stop();
			for (this.effects.length = 0, t = 0, n = this.cleanups.length; t < n; t++) this.cleanups[t]();
			if (this.cleanups.length = 0, this.scopes) {
				for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].stop(!0);
				this.scopes.length = 0;
			}
			if (!this.detached && this.parent && !e) {
				let e = this.parent.scopes.pop();
				e && e !== this && (this.parent.scopes[this.index] = e, e.index = this.index);
			}
			this.parent = void 0;
		}
	}
};
function En(e) {
	return new Tn(e);
}
function Dn() {
	return F;
}
var I, On = /* @__PURE__ */ new WeakSet(), kn = class {
	constructor(e) {
		this.fn = e, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, F && (F.active ? F.effects.push(this) : this.flags &= -2);
	}
	pause() {
		this.flags |= 64;
	}
	resume() {
		this.flags & 64 && (this.flags &= -65, On.has(this) && (On.delete(this), this.trigger()));
	}
	notify() {
		this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Nn(this);
	}
	run() {
		if (!(this.flags & 1)) return this.fn();
		this.flags |= 2, Gn(this), In(this);
		let e = I, t = L;
		I = this, L = !0;
		try {
			return this.fn();
		} finally {
			Ln(this), I = e, L = t, this.flags &= -3;
		}
	}
	stop() {
		if (this.flags & 1) {
			for (let e = this.deps; e; e = e.nextDep) Bn(e);
			this.deps = this.depsTail = void 0, Gn(this), this.onStop && this.onStop(), this.flags &= -2;
		}
	}
	trigger() {
		this.flags & 64 ? On.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
	}
	runIfDirty() {
		Rn(this) && this.run();
	}
	get dirty() {
		return Rn(this);
	}
}, An = 0, jn, Mn;
function Nn(e, t = !1) {
	if (e.flags |= 8, t) {
		e.next = Mn, Mn = e;
		return;
	}
	e.next = jn, jn = e;
}
function Pn() {
	An++;
}
function Fn() {
	if (--An > 0) return;
	if (Mn) {
		let e = Mn;
		for (Mn = void 0; e;) {
			let t = e.next;
			e.next = void 0, e.flags &= -9, e = t;
		}
	}
	let e;
	for (; jn;) {
		let t = jn;
		for (jn = void 0; t;) {
			let n = t.next;
			if (t.next = void 0, t.flags &= -9, t.flags & 1) try {
				t.trigger();
			} catch (t) {
				e ||= t;
			}
			t = n;
		}
	}
	if (e) throw e;
}
function In(e) {
	for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Ln(e) {
	let t, n = e.depsTail, r = n;
	for (; r;) {
		let e = r.prevDep;
		r.version === -1 ? (r === n && (n = e), Bn(r), Vn(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = e;
	}
	e.deps = t, e.depsTail = n;
}
function Rn(e) {
	for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (zn(t.dep.computed) || t.dep.version !== t.version)) return !0;
	return !!e._dirty;
}
function zn(e) {
	if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Kn) || (e.globalVersion = Kn, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Rn(e)))) return;
	e.flags |= 2;
	let t = e.dep, n = I, r = L;
	I = e, L = !0;
	try {
		In(e);
		let n = e.fn(e._value);
		(t.version === 0 || P(n, e._value)) && (e.flags |= 128, e._value = n, t.version++);
	} catch (e) {
		throw t.version++, e;
	} finally {
		I = n, L = r, Ln(e), e.flags &= -3;
	}
}
function Bn(e, t = !1) {
	let { dep: n, prevSub: r, nextSub: i } = e;
	if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
		n.computed.flags &= -5;
		for (let e = n.computed.deps; e; e = e.nextDep) Bn(e, !0);
	}
	!t && !--n.sc && n.map && n.map.delete(n.key);
}
function Vn(e) {
	let { prevDep: t, nextDep: n } = e;
	t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
var L = !0, Hn = [];
function Un() {
	Hn.push(L), L = !1;
}
function Wn() {
	let e = Hn.pop();
	L = e === void 0 ? !0 : e;
}
function Gn(e) {
	let { cleanup: t } = e;
	if (e.cleanup = void 0, t) {
		let e = I;
		I = void 0;
		try {
			t();
		} finally {
			I = e;
		}
	}
}
var Kn = 0, qn = class {
	constructor(e, t) {
		this.sub = e, this.dep = t, this.version = t.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
	}
}, Jn = class {
	constructor(e) {
		this.computed = e, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
	}
	track(e) {
		if (!I || !L || I === this.computed) return;
		let t = this.activeLink;
		if (t === void 0 || t.sub !== I) t = this.activeLink = new qn(I, this), I.deps ? (t.prevDep = I.depsTail, I.depsTail.nextDep = t, I.depsTail = t) : I.deps = I.depsTail = t, Yn(t);
		else if (t.version === -1 && (t.version = this.version, t.nextDep)) {
			let e = t.nextDep;
			e.prevDep = t.prevDep, t.prevDep && (t.prevDep.nextDep = e), t.prevDep = I.depsTail, t.nextDep = void 0, I.depsTail.nextDep = t, I.depsTail = t, I.deps === t && (I.deps = e);
		}
		return t;
	}
	trigger(e) {
		this.version++, Kn++, this.notify(e);
	}
	notify(e) {
		Pn();
		try {
			for (let e = this.subs; e; e = e.prevSub) e.sub.notify() && e.sub.dep.notify();
		} finally {
			Fn();
		}
	}
};
function Yn(e) {
	if (e.dep.sc++, e.sub.flags & 4) {
		let t = e.dep.computed;
		if (t && !e.dep.subs) {
			t.flags |= 20;
			for (let e = t.deps; e; e = e.nextDep) Yn(e);
		}
		let n = e.dep.subs;
		n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
	}
}
var Xn = /* @__PURE__ */ new WeakMap(), Zn = /* @__PURE__ */ Symbol(""), Qn = /* @__PURE__ */ Symbol(""), $n = /* @__PURE__ */ Symbol("");
function R(e, t, n) {
	if (L && I) {
		let t = Xn.get(e);
		t || Xn.set(e, t = /* @__PURE__ */ new Map());
		let r = t.get(n);
		r || (t.set(n, r = new Jn()), r.map = t, r.key = n), r.track();
	}
}
function er(e, t, n, r, i, a) {
	let o = Xn.get(e);
	if (!o) {
		Kn++;
		return;
	}
	let s = (e) => {
		e && e.trigger();
	};
	if (Pn(), t === "clear") o.forEach(s);
	else {
		let i = k(e), a = i && en(n);
		if (i && n === "length") {
			let e = Number(r);
			o.forEach((t, n) => {
				(n === "length" || n === $n || !Jt(n) && n >= e) && s(t);
			});
		} else switch ((n !== void 0 || o.has(void 0)) && s(o.get(n)), a && s(o.get($n)), t) {
			case "add":
				i ? a && s(o.get("length")) : (s(o.get(Zn)), Gt(e) && s(o.get(Qn)));
				break;
			case "delete":
				i || (s(o.get(Zn)), Gt(e) && s(o.get(Qn)));
				break;
			case "set":
				Gt(e) && s(o.get(Zn));
				break;
		}
	}
	Fn();
}
function tr(e) {
	let t = /* @__PURE__ */ V(e);
	return t === e ? t : (R(t, "iterate", $n), /* @__PURE__ */ B(e) ? t : t.map(Vr));
}
function nr(e) {
	return R(e = /* @__PURE__ */ V(e), "iterate", $n), e;
}
function z(e, t) {
	return /* @__PURE__ */ Rr(e) ? Hr(/* @__PURE__ */ Lr(e) ? Vr(t) : t) : Vr(t);
}
var rr = {
	__proto__: null,
	[Symbol.iterator]() {
		return ir(this, Symbol.iterator, (e) => z(this, e));
	},
	concat(...e) {
		return tr(this).concat(...e.map((e) => k(e) ? tr(e) : e));
	},
	entries() {
		return ir(this, "entries", (e) => (e[1] = z(this, e[1]), e));
	},
	every(e, t) {
		return or(this, "every", e, t, void 0, arguments);
	},
	filter(e, t) {
		return or(this, "filter", e, t, (e) => e.map((e) => z(this, e)), arguments);
	},
	find(e, t) {
		return or(this, "find", e, t, (e) => z(this, e), arguments);
	},
	findIndex(e, t) {
		return or(this, "findIndex", e, t, void 0, arguments);
	},
	findLast(e, t) {
		return or(this, "findLast", e, t, (e) => z(this, e), arguments);
	},
	findLastIndex(e, t) {
		return or(this, "findLastIndex", e, t, void 0, arguments);
	},
	forEach(e, t) {
		return or(this, "forEach", e, t, void 0, arguments);
	},
	includes(...e) {
		return cr(this, "includes", e);
	},
	indexOf(...e) {
		return cr(this, "indexOf", e);
	},
	join(e) {
		return tr(this).join(e);
	},
	lastIndexOf(...e) {
		return cr(this, "lastIndexOf", e);
	},
	map(e, t) {
		return or(this, "map", e, t, void 0, arguments);
	},
	pop() {
		return lr(this, "pop");
	},
	push(...e) {
		return lr(this, "push", e);
	},
	reduce(e, ...t) {
		return sr(this, "reduce", e, t);
	},
	reduceRight(e, ...t) {
		return sr(this, "reduceRight", e, t);
	},
	shift() {
		return lr(this, "shift");
	},
	some(e, t) {
		return or(this, "some", e, t, void 0, arguments);
	},
	splice(...e) {
		return lr(this, "splice", e);
	},
	toReversed() {
		return tr(this).toReversed();
	},
	toSorted(e) {
		return tr(this).toSorted(e);
	},
	toSpliced(...e) {
		return tr(this).toSpliced(...e);
	},
	unshift(...e) {
		return lr(this, "unshift", e);
	},
	values() {
		return ir(this, "values", (e) => z(this, e));
	}
};
function ir(e, t, n) {
	let r = nr(e), i = r[t]();
	return r !== e && !/* @__PURE__ */ B(e) && (i._next = i.next, i.next = () => {
		let e = i._next();
		return e.done || (e.value = n(e.value)), e;
	}), i;
}
var ar = Array.prototype;
function or(e, t, n, r, i, a) {
	let o = nr(e), s = o !== e && !/* @__PURE__ */ B(e), c = o[t];
	if (c !== ar[t]) {
		let t = c.apply(e, a);
		return s ? Vr(t) : t;
	}
	let l = n;
	o !== e && (s ? l = function(t, r) {
		return n.call(this, z(e, t), r, e);
	} : n.length > 2 && (l = function(t, r) {
		return n.call(this, t, r, e);
	}));
	let u = c.call(o, l, r);
	return s && i ? i(u) : u;
}
function sr(e, t, n, r) {
	let i = nr(e), a = i !== e && !/* @__PURE__ */ B(e), o = n, s = !1;
	i !== e && (a ? (s = r.length === 0, o = function(t, r, i) {
		return s && (s = !1, t = z(e, t)), n.call(this, t, z(e, r), i, e);
	}) : n.length > 3 && (o = function(t, r, i) {
		return n.call(this, t, r, i, e);
	}));
	let c = i[t](o, ...r);
	return s ? z(e, c) : c;
}
function cr(e, t, n) {
	let r = /* @__PURE__ */ V(e);
	R(r, "iterate", $n);
	let i = r[t](...n);
	return (i === -1 || i === !1) && /* @__PURE__ */ zr(n[0]) ? (n[0] = /* @__PURE__ */ V(n[0]), r[t](...n)) : i;
}
function lr(e, t, n = []) {
	Un(), Pn();
	let r = (/* @__PURE__ */ V(e))[t].apply(e, n);
	return Fn(), Wn(), r;
}
var ur = /* @__PURE__ */ Rt("__proto__,__v_isRef,__isVue"), dr = new Set(/* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Jt));
function fr(e) {
	Jt(e) || (e = String(e));
	let t = /* @__PURE__ */ V(this);
	return R(t, "has", e), t.hasOwnProperty(e);
}
var pr = class {
	constructor(e = !1, t = !1) {
		this._isReadonly = e, this._isShallow = t;
	}
	get(e, t, n) {
		if (t === "__v_skip") return e.__v_skip;
		let r = this._isReadonly, i = this._isShallow;
		if (t === "__v_isReactive") return !r;
		if (t === "__v_isReadonly") return r;
		if (t === "__v_isShallow") return i;
		if (t === "__v_raw") return n === (r ? i ? jr : Ar : i ? kr : Or).get(e) || Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
		let a = k(e);
		if (!r) {
			let e;
			if (a && (e = rr[t])) return e;
			if (t === "hasOwnProperty") return fr;
		}
		let o = Reflect.get(e, t, /* @__PURE__ */ H(e) ? e : n);
		if ((Jt(t) ? dr.has(t) : ur(t)) || (r || R(e, "get", t), i)) return o;
		if (/* @__PURE__ */ H(o)) {
			let e = a && en(t) ? o : o.value;
			return r && M(e) ? /* @__PURE__ */ Fr(e) : e;
		}
		return M(o) ? r ? /* @__PURE__ */ Fr(o) : /* @__PURE__ */ Nr(o) : o;
	}
}, mr = class extends pr {
	constructor(e = !1) {
		super(!1, e);
	}
	set(e, t, n, r) {
		let i = e[t], a = k(e) && en(t);
		if (!this._isShallow) {
			let e = /* @__PURE__ */ Rr(i);
			if (!/* @__PURE__ */ B(n) && !/* @__PURE__ */ Rr(n) && (i = /* @__PURE__ */ V(i), n = /* @__PURE__ */ V(n)), !a && /* @__PURE__ */ H(i) && !/* @__PURE__ */ H(n)) return e || (i.value = n), !0;
		}
		let o = a ? Number(t) < e.length : O(e, t), s = Reflect.set(e, t, n, /* @__PURE__ */ H(e) ? e : r);
		return e === /* @__PURE__ */ V(r) && (o ? P(n, i) && er(e, "set", t, n, i) : er(e, "add", t, n)), s;
	}
	deleteProperty(e, t) {
		let n = O(e, t), r = e[t], i = Reflect.deleteProperty(e, t);
		return i && n && er(e, "delete", t, void 0, r), i;
	}
	has(e, t) {
		let n = Reflect.has(e, t);
		return (!Jt(t) || !dr.has(t)) && R(e, "has", t), n;
	}
	ownKeys(e) {
		return R(e, "iterate", k(e) ? "length" : Zn), Reflect.ownKeys(e);
	}
}, hr = class extends pr {
	constructor(e = !1) {
		super(!0, e);
	}
	set(e, t) {
		return !0;
	}
	deleteProperty(e, t) {
		return !0;
	}
}, gr = /* @__PURE__ */ new mr(), _r = /* @__PURE__ */ new hr(), vr = /* @__PURE__ */ new mr(!0), yr = (e) => e, br = (e) => Reflect.getPrototypeOf(e);
function xr(e, t, n) {
	return function(...r) {
		let i = this.__v_raw, a = /* @__PURE__ */ V(i), o = Gt(a), s = e === "entries" || e === Symbol.iterator && o, c = e === "keys" && o, l = i[e](...r), u = n ? yr : t ? Hr : Vr;
		return !t && R(a, "iterate", c ? Qn : Zn), D(Object.create(l), { next() {
			let { value: e, done: t } = l.next();
			return t ? {
				value: e,
				done: t
			} : {
				value: s ? [u(e[0]), u(e[1])] : u(e),
				done: t
			};
		} });
	};
}
function Sr(e) {
	return function(...t) {
		return e === "delete" ? !1 : e === "clear" ? void 0 : this;
	};
}
function Cr(e, t) {
	let n = {
		get(n) {
			let r = this.__v_raw, i = /* @__PURE__ */ V(r), a = /* @__PURE__ */ V(n);
			e || (P(n, a) && R(i, "get", n), R(i, "get", a));
			let { has: o } = br(i), s = t ? yr : e ? Hr : Vr;
			if (o.call(i, n)) return s(r.get(n));
			if (o.call(i, a)) return s(r.get(a));
			r !== i && r.get(n);
		},
		get size() {
			let t = this.__v_raw;
			return !e && R(/* @__PURE__ */ V(t), "iterate", Zn), t.size;
		},
		has(t) {
			let n = this.__v_raw, r = /* @__PURE__ */ V(n), i = /* @__PURE__ */ V(t);
			return e || (P(t, i) && R(r, "has", t), R(r, "has", i)), t === i ? n.has(t) : n.has(t) || n.has(i);
		},
		forEach(n, r) {
			let i = this, a = i.__v_raw, o = /* @__PURE__ */ V(a), s = t ? yr : e ? Hr : Vr;
			return !e && R(o, "iterate", Zn), a.forEach((e, t) => n.call(r, s(e), s(t), i));
		}
	};
	return D(n, e ? {
		add: Sr("add"),
		set: Sr("set"),
		delete: Sr("delete"),
		clear: Sr("clear")
	} : {
		add(e) {
			let n = /* @__PURE__ */ V(this), r = br(n), i = /* @__PURE__ */ V(e), a = !t && !/* @__PURE__ */ B(e) && !/* @__PURE__ */ Rr(e) ? i : e;
			return r.has.call(n, a) || P(e, a) && r.has.call(n, e) || P(i, a) && r.has.call(n, i) || (n.add(a), er(n, "add", a, a)), this;
		},
		set(e, n) {
			!t && !/* @__PURE__ */ B(n) && !/* @__PURE__ */ Rr(n) && (n = /* @__PURE__ */ V(n));
			let r = /* @__PURE__ */ V(this), { has: i, get: a } = br(r), o = i.call(r, e);
			o ||= (e = /* @__PURE__ */ V(e), i.call(r, e));
			let s = a.call(r, e);
			return r.set(e, n), o ? P(n, s) && er(r, "set", e, n, s) : er(r, "add", e, n), this;
		},
		delete(e) {
			let t = /* @__PURE__ */ V(this), { has: n, get: r } = br(t), i = n.call(t, e);
			i ||= (e = /* @__PURE__ */ V(e), n.call(t, e));
			let a = r ? r.call(t, e) : void 0, o = t.delete(e);
			return i && er(t, "delete", e, void 0, a), o;
		},
		clear() {
			let e = /* @__PURE__ */ V(this), t = e.size !== 0, n = e.clear();
			return t && er(e, "clear", void 0, void 0, void 0), n;
		}
	}), [
		"keys",
		"values",
		"entries",
		Symbol.iterator
	].forEach((r) => {
		n[r] = xr(r, e, t);
	}), n;
}
function wr(e, t) {
	let n = Cr(e, t);
	return (t, r, i) => r === "__v_isReactive" ? !e : r === "__v_isReadonly" ? e : r === "__v_raw" ? t : Reflect.get(O(n, r) && r in t ? n : t, r, i);
}
var Tr = { get: /* @__PURE__ */ wr(!1, !1) }, Er = { get: /* @__PURE__ */ wr(!1, !0) }, Dr = { get: /* @__PURE__ */ wr(!0, !1) }, Or = /* @__PURE__ */ new WeakMap(), kr = /* @__PURE__ */ new WeakMap(), Ar = /* @__PURE__ */ new WeakMap(), jr = /* @__PURE__ */ new WeakMap();
function Mr(e) {
	switch (e) {
		case "Object":
		case "Array": return 1;
		case "Map":
		case "Set":
		case "WeakMap":
		case "WeakSet": return 2;
		default: return 0;
	}
}
// @__NO_SIDE_EFFECTS__
function Nr(e) {
	return /* @__PURE__ */ Rr(e) ? e : Ir(e, !1, gr, Tr, Or);
}
// @__NO_SIDE_EFFECTS__
function Pr(e) {
	return Ir(e, !1, vr, Er, kr);
}
// @__NO_SIDE_EFFECTS__
function Fr(e) {
	return Ir(e, !0, _r, Dr, Ar);
}
function Ir(e, t, n, r, i) {
	if (!M(e) || e.__v_raw && !(t && e.__v_isReactive) || e.__v_skip || !Object.isExtensible(e)) return e;
	let a = i.get(e);
	if (a) return a;
	let o = Mr(Qt(e));
	if (o === 0) return e;
	let s = new Proxy(e, o === 2 ? r : n);
	return i.set(e, s), s;
}
// @__NO_SIDE_EFFECTS__
function Lr(e) {
	return /* @__PURE__ */ Rr(e) ? /* @__PURE__ */ Lr(e.__v_raw) : !!(e && e.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Rr(e) {
	return !!(e && e.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function B(e) {
	return !!(e && e.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function zr(e) {
	return e ? !!e.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function V(e) {
	let t = e && e.__v_raw;
	return t ? /* @__PURE__ */ V(t) : e;
}
function Br(e) {
	return !O(e, "__v_skip") && Object.isExtensible(e) && un(e, "__v_skip", !0), e;
}
var Vr = (e) => M(e) ? /* @__PURE__ */ Nr(e) : e, Hr = (e) => M(e) ? /* @__PURE__ */ Fr(e) : e;
// @__NO_SIDE_EFFECTS__
function H(e) {
	return e ? e.__v_isRef === !0 : !1;
}
// @__NO_SIDE_EFFECTS__
function Ur(e) {
	return Wr(e, !1);
}
function Wr(e, t) {
	return /* @__PURE__ */ H(e) ? e : new Gr(e, t);
}
var Gr = class {
	constructor(e, t) {
		this.dep = new Jn(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = t ? e : /* @__PURE__ */ V(e), this._value = t ? e : Vr(e), this.__v_isShallow = t;
	}
	get value() {
		return this.dep.track(), this._value;
	}
	set value(e) {
		let t = this._rawValue, n = this.__v_isShallow || /* @__PURE__ */ B(e) || /* @__PURE__ */ Rr(e);
		e = n ? e : /* @__PURE__ */ V(e), P(e, t) && (this._rawValue = e, this._value = n ? e : Vr(e), this.dep.trigger());
	}
};
function Kr(e) {
	return /* @__PURE__ */ H(e) ? e.value : e;
}
var qr = {
	get: (e, t, n) => t === "__v_raw" ? e : Kr(Reflect.get(e, t, n)),
	set: (e, t, n, r) => {
		let i = e[t];
		return /* @__PURE__ */ H(i) && !/* @__PURE__ */ H(n) ? (i.value = n, !0) : Reflect.set(e, t, n, r);
	}
};
function Jr(e) {
	return /* @__PURE__ */ Lr(e) ? e : new Proxy(e, qr);
}
var Yr = class {
	constructor(e, t, n) {
		this.fn = e, this.setter = t, this._value = void 0, this.dep = new Jn(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Kn - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !t, this.isSSR = n;
	}
	notify() {
		if (this.flags |= 16, !(this.flags & 8) && I !== this) return Nn(this, !0), !0;
	}
	get value() {
		let e = this.dep.track();
		return zn(this), e && (e.version = this.dep.version), this._value;
	}
	set value(e) {
		this.setter && this.setter(e);
	}
};
// @__NO_SIDE_EFFECTS__
function Xr(e, t, n = !1) {
	let r, i;
	return A(e) ? r = e : (r = e.get, i = e.set), new Yr(r, i, n);
}
var Zr = {}, Qr = /* @__PURE__ */ new WeakMap(), $r = void 0;
function ei(e, t = !1, n = $r) {
	if (n) {
		let t = Qr.get(n);
		t || Qr.set(n, t = []), t.push(e);
	}
}
function ti(e, t, n = T) {
	let { immediate: r, deep: i, once: a, scheduler: o, augmentJob: s, call: c } = n, l = (e) => i ? e : /* @__PURE__ */ B(e) || i === !1 || i === 0 ? ni(e, 1) : ni(e), u, d, f, p, m = !1, h = !1;
	if (/* @__PURE__ */ H(e) ? (d = () => e.value, m = /* @__PURE__ */ B(e)) : /* @__PURE__ */ Lr(e) ? (d = () => l(e), m = !0) : k(e) ? (h = !0, m = e.some((e) => /* @__PURE__ */ Lr(e) || /* @__PURE__ */ B(e)), d = () => e.map((e) => {
		if (/* @__PURE__ */ H(e)) return e.value;
		if (/* @__PURE__ */ Lr(e)) return l(e);
		if (A(e)) return c ? c(e, 2) : e();
	})) : d = A(e) ? t ? c ? () => c(e, 2) : e : () => {
		if (f) {
			Un();
			try {
				f();
			} finally {
				Wn();
			}
		}
		let t = $r;
		$r = u;
		try {
			return c ? c(e, 3, [p]) : e(p);
		} finally {
			$r = t;
		}
	} : E, t && i) {
		let e = d, t = i === !0 ? Infinity : i;
		d = () => ni(e(), t);
	}
	let g = Dn(), _ = () => {
		u.stop(), g && g.active && Ut(g.effects, u);
	};
	if (a && t) {
		let e = t;
		t = (...t) => {
			let n = e(...t);
			return _(), n;
		};
	}
	let v = h ? Array(e.length).fill(Zr) : Zr, y = (e) => {
		if (!(!(u.flags & 1) || !u.dirty && !e)) if (t) {
			let n = u.run();
			if (e || i || m || (h ? n.some((e, t) => P(e, v[t])) : P(n, v))) {
				f && f();
				let e = $r;
				$r = u;
				try {
					let e = [
						n,
						v === Zr ? void 0 : h && v[0] === Zr ? [] : v,
						p
					];
					v = n, c ? c(t, 3, e) : t(...e);
				} finally {
					$r = e;
				}
			}
		} else u.run();
	};
	return s && s(y), u = new kn(d), u.scheduler = o ? () => o(y, !1) : y, p = (e) => ei(e, !1, u), f = u.onStop = () => {
		let e = Qr.get(u);
		if (e) {
			if (c) c(e, 4);
			else for (let t of e) t();
			Qr.delete(u);
		}
	}, t ? r ? y(!0) : v = u.run() : o ? o(y.bind(null, !0), !0) : u.run(), _.pause = u.pause.bind(u), _.resume = u.resume.bind(u), _.stop = _, _;
}
function ni(e, t = Infinity, n) {
	if (t <= 0 || !M(e) || e.__v_skip || (n ||= /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
	if (n.set(e, t), t--, /* @__PURE__ */ H(e)) ni(e.value, t, n);
	else if (k(e)) for (let r = 0; r < e.length; r++) ni(e[r], t, n);
	else if (Kt(e) || Gt(e)) e.forEach((e) => {
		ni(e, t, n);
	});
	else if ($t(e)) {
		for (let r in e) ni(e[r], t, n);
		for (let r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && ni(e[r], t, n);
	}
	return e;
}
//#endregion
//#region node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
function ri(e, t, n, r) {
	try {
		return r ? e(...r) : e();
	} catch (e) {
		ii(e, t, n);
	}
}
function U(e, t, n, r) {
	if (A(e)) {
		let i = ri(e, t, n, r);
		return i && Yt(i) && i.catch((e) => {
			ii(e, t, n);
		}), i;
	}
	if (k(e)) {
		let i = [];
		for (let a = 0; a < e.length; a++) i.push(U(e[a], t, n, r));
		return i;
	}
}
function ii(e, t, n, r = !0) {
	let i = t ? t.vnode : null, { errorHandler: a, throwUnhandledErrorInProduction: o } = t && t.appContext.config || T;
	if (t) {
		let r = t.parent, i = t.proxy, o = `https://vuejs.org/error-reference/#runtime-${n}`;
		for (; r;) {
			let t = r.ec;
			if (t) {
				for (let n = 0; n < t.length; n++) if (t[n](e, i, o) === !1) return;
			}
			r = r.parent;
		}
		if (a) {
			Un(), ri(a, null, 10, [
				e,
				i,
				o
			]), Wn();
			return;
		}
	}
	ai(e, n, i, r, o);
}
function ai(e, t, n, r = !0, i = !1) {
	if (i) throw e;
	console.error(e);
}
var W = [], G = -1, oi = [], si = null, ci = 0, li = /* @__PURE__ */ Promise.resolve(), di = null;
function fi(e) {
	let t = di || li;
	return e ? t.then(this ? e.bind(this) : e) : t;
}
function pi(e) {
	let t = G + 1, n = W.length;
	for (; t < n;) {
		let r = t + n >>> 1, i = W[r], a = yi(i);
		a < e || a === e && i.flags & 2 ? t = r + 1 : n = r;
	}
	return t;
}
function mi(e) {
	if (!(e.flags & 1)) {
		let t = yi(e), n = W[W.length - 1];
		!n || !(e.flags & 2) && t >= yi(n) ? W.push(e) : W.splice(pi(t), 0, e), e.flags |= 1, hi();
	}
}
function hi() {
	di ||= li.then(bi);
}
function gi(e) {
	k(e) ? oi.push(...e) : si && e.id === -1 ? si.splice(ci + 1, 0, e) : e.flags & 1 || (oi.push(e), e.flags |= 1), hi();
}
function _i(e, t, n = G + 1) {
	for (; n < W.length; n++) {
		let t = W[n];
		if (t && t.flags & 2) {
			if (e && t.id !== e.uid) continue;
			W.splice(n, 1), n--, t.flags & 4 && (t.flags &= -2), t(), t.flags & 4 || (t.flags &= -2);
		}
	}
}
function vi(e) {
	if (oi.length) {
		let e = [...new Set(oi)].sort((e, t) => yi(e) - yi(t));
		if (oi.length = 0, si) {
			si.push(...e);
			return;
		}
		for (si = e, ci = 0; ci < si.length; ci++) {
			let e = si[ci];
			e.flags & 4 && (e.flags &= -2), e.flags & 8 || e(), e.flags &= -2;
		}
		si = null, ci = 0;
	}
}
var yi = (e) => e.id == null ? e.flags & 2 ? -1 : Infinity : e.id;
function bi(e) {
	try {
		for (G = 0; G < W.length; G++) {
			let e = W[G];
			e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), ri(e, e.i, e.i ? 15 : 14), e.flags & 4 || (e.flags &= -2));
		}
	} finally {
		for (; G < W.length; G++) {
			let e = W[G];
			e && (e.flags &= -2);
		}
		G = -1, W.length = 0, vi(e), di = null, (W.length || oi.length) && bi(e);
	}
}
var K = null, xi = null;
function Si(e) {
	let t = K;
	return K = e, xi = e && e.type.__scopeId || null, t;
}
function Ci(e, t = K, n) {
	if (!t || e._n) return e;
	let r = (...n) => {
		r._d && Do(-1);
		let i = Si(t), a;
		try {
			a = e(...n);
		} finally {
			Si(i), r._d && Do(1);
		}
		return a;
	};
	return r._n = !0, r._c = !0, r._d = !0, r;
}
function wi(e, t, n, r) {
	let i = e.dirs, a = t && t.dirs;
	for (let o = 0; o < i.length; o++) {
		let s = i[o];
		a && (s.oldValue = a[o].value);
		let c = s.dir[r];
		c && (Un(), U(c, n, 8, [
			e.el,
			s,
			e,
			t
		]), Wn());
	}
}
function Ti(e, t) {
	if (Q) {
		let n = Q.provides, r = Q.parent && Q.parent.provides;
		r === n && (n = Q.provides = Object.create(r)), n[e] = t;
	}
}
function Ei(e, t, n = !1) {
	let r = Ko();
	if (r || ka) {
		let i = ka ? ka._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
		if (i && e in i) return i[e];
		if (arguments.length > 1) return n && A(t) ? t.call(r && r.proxy) : t;
	}
}
var Di = /* @__PURE__ */ Symbol.for("v-scx"), Oi = () => Ei(Di);
function ki(e, t, n) {
	return Ai(e, t, n);
}
function Ai(e, t, n = T) {
	let { immediate: r, deep: i, flush: a, once: o } = n, s = D({}, n), c = t && r || !t && a !== "post", l;
	if (Qo) {
		if (a === "sync") {
			let e = Oi();
			l = e.__watcherHandles ||= [];
		} else if (!c) {
			let e = () => {};
			return e.stop = E, e.resume = E, e.pause = E, e;
		}
	}
	let u = Q;
	s.call = (e, t, n) => U(e, u, t, n);
	let d = !1;
	a === "post" ? s.scheduler = (e) => {
		J(e, u && u.suspense);
	} : a !== "sync" && (d = !0, s.scheduler = (e, t) => {
		t ? e() : mi(e);
	}), s.augmentJob = (e) => {
		t && (e.flags |= 4), d && (e.flags |= 2, u && (e.id = u.uid, e.i = u));
	};
	let f = ti(e, t, s);
	return Qo && (l ? l.push(f) : c && f()), f;
}
function ji(e, t, n) {
	let r = this.proxy, i = j(e) ? e.includes(".") ? Mi(r, e) : () => r[e] : e.bind(r, r), a;
	A(t) ? a = t : (a = t.handler, n = t);
	let o = Yo(this), s = Ai(i, a.bind(r), n);
	return o(), s;
}
function Mi(e, t) {
	let n = t.split(".");
	return () => {
		let t = e;
		for (let e = 0; e < n.length && t; e++) t = t[n[e]];
		return t;
	};
}
var Ni = /* @__PURE__ */ Symbol("_vte"), Pi = (e) => e.__isTeleport, Fi = /* @__PURE__ */ Symbol("_leaveCb");
function Ii(e, t) {
	e.shapeFlag & 6 && e.component ? (e.transition = t, Ii(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function Li(e) {
	e.ids = [
		e.ids[0] + e.ids[2]++ + "-",
		0,
		0
	];
}
function Ri(e, t) {
	let n;
	return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
}
var zi = /* @__PURE__ */ new WeakMap();
function Bi(e, t, n, r, i = !1) {
	if (k(e)) {
		e.forEach((e, a) => Bi(e, t && (k(t) ? t[a] : t), n, r, i));
		return;
	}
	if (Hi(r) && !i) {
		r.shapeFlag & 512 && r.type.__asyncResolved && r.component.subTree.component && Bi(e, t, n, r.component.subTree);
		return;
	}
	let a = r.shapeFlag & 4 ? ss(r.component) : r.el, o = i ? null : a, { i: s, r: c } = e, l = t && t.r, u = s.refs === T ? s.refs = {} : s.refs, d = s.setupState, f = /* @__PURE__ */ V(d), p = d === T ? Bt : (e) => Ri(u, e) ? !1 : O(f, e), m = (e, t) => !(t && Ri(u, t));
	if (l != null && l !== c) {
		if (Vi(t), j(l)) u[l] = null, p(l) && (d[l] = null);
		else if (/* @__PURE__ */ H(l)) {
			let e = t;
			m(l, e.k) && (l.value = null), e.k && (u[e.k] = null);
		}
	}
	if (A(c)) ri(c, s, 12, [o, u]);
	else {
		let t = j(c), r = /* @__PURE__ */ H(c);
		if (t || r) {
			let s = () => {
				if (e.f) {
					let n = t ? p(c) ? d[c] : u[c] : m(c) || !e.k ? c.value : u[e.k];
					if (i) k(n) && Ut(n, a);
					else if (k(n)) n.includes(a) || n.push(a);
					else if (t) u[c] = [a], p(c) && (d[c] = u[c]);
					else {
						let t = [a];
						m(c, e.k) && (c.value = t), e.k && (u[e.k] = t);
					}
				} else t ? (u[c] = o, p(c) && (d[c] = o)) : r && (m(c, e.k) && (c.value = o), e.k && (u[e.k] = o));
			};
			if (o) {
				let t = () => {
					s(), zi.delete(e);
				};
				t.id = -1, zi.set(e, t), J(t, n);
			} else Vi(e), s();
		}
	}
}
function Vi(e) {
	let t = zi.get(e);
	t && (t.flags |= 8, zi.delete(e));
}
pn().requestIdleCallback, pn().cancelIdleCallback;
var Hi = (e) => !!e.type.__asyncLoader, Ui = (e) => e.type.__isKeepAlive;
function Wi(e, t) {
	Ki(e, "a", t);
}
function Gi(e, t) {
	Ki(e, "da", t);
}
function Ki(e, t, n = Q) {
	let r = e.__wdc ||= () => {
		let t = n;
		for (; t;) {
			if (t.isDeactivated) return;
			t = t.parent;
		}
		return e();
	};
	if (Ji(t, r, n), n) {
		let e = n.parent;
		for (; e && e.parent;) Ui(e.parent.vnode) && qi(r, t, n, e), e = e.parent;
	}
}
function qi(e, t, n, r) {
	let i = Ji(t, e, r, !0);
	ta(() => {
		Ut(r[t], i);
	}, n);
}
function Ji(e, t, n = Q, r = !1) {
	if (n) {
		let i = n[e] || (n[e] = []), a = t.__weh ||= (...r) => {
			Un();
			let i = Yo(n), a = U(t, n, e, r);
			return i(), Wn(), a;
		};
		return r ? i.unshift(a) : i.push(a), a;
	}
}
var Yi = (e) => (t, n = Q) => {
	(!Qo || e === "sp") && Ji(e, (...e) => t(...e), n);
}, Xi = Yi("bm"), Zi = Yi("m"), Qi = Yi("bu"), $i = Yi("u"), ea = Yi("bum"), ta = Yi("um"), na = Yi("sp"), ra = Yi("rtg"), ia = Yi("rtc");
function aa(e, t = Q) {
	Ji("ec", e, t);
}
var oa = /* @__PURE__ */ Symbol.for("v-ndc"), sa = (e) => e ? Zo(e) ? ss(e) : sa(e.parent) : null, ca = /* @__PURE__ */ D(/* @__PURE__ */ Object.create(null), {
	$: (e) => e,
	$el: (e) => e.vnode.el,
	$data: (e) => e.data,
	$props: (e) => e.props,
	$attrs: (e) => e.attrs,
	$slots: (e) => e.slots,
	$refs: (e) => e.refs,
	$parent: (e) => sa(e.parent),
	$root: (e) => sa(e.root),
	$host: (e) => e.ce,
	$emit: (e) => e.emit,
	$options: (e) => _a(e),
	$forceUpdate: (e) => e.f ||= () => {
		mi(e.update);
	},
	$nextTick: (e) => e.n ||= fi.bind(e.proxy),
	$watch: (e) => ji.bind(e)
}), la = (e, t) => e !== T && !e.__isScriptSetup && O(e, t), ua = {
	get({ _: e }, t) {
		if (t === "__v_skip") return !0;
		let { ctx: n, setupState: r, data: i, props: a, accessCache: o, type: s, appContext: c } = e;
		if (t[0] !== "$") {
			let e = o[t];
			if (e !== void 0) switch (e) {
				case 1: return r[t];
				case 2: return i[t];
				case 4: return n[t];
				case 3: return a[t];
			}
			else if (la(r, t)) return o[t] = 1, r[t];
			else if (i !== T && O(i, t)) return o[t] = 2, i[t];
			else if (O(a, t)) return o[t] = 3, a[t];
			else if (n !== T && O(n, t)) return o[t] = 4, n[t];
			else fa && (o[t] = 0);
		}
		let l = ca[t], u, d;
		if (l) return t === "$attrs" && R(e.attrs, "get", ""), l(e);
		if ((u = s.__cssModules) && (u = u[t])) return u;
		if (n !== T && O(n, t)) return o[t] = 4, n[t];
		if (d = c.config.globalProperties, O(d, t)) return d[t];
	},
	set({ _: e }, t, n) {
		let { data: r, setupState: i, ctx: a } = e;
		return la(i, t) ? (i[t] = n, !0) : r !== T && O(r, t) ? (r[t] = n, !0) : O(e.props, t) || t[0] === "$" && t.slice(1) in e ? !1 : (a[t] = n, !0);
	},
	has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: a, type: o } }, s) {
		let c;
		return !!(n[s] || e !== T && s[0] !== "$" && O(e, s) || la(t, s) || O(a, s) || O(r, s) || O(ca, s) || O(i.config.globalProperties, s) || (c = o.__cssModules) && c[s]);
	},
	defineProperty(e, t, n) {
		return n.get == null ? O(n, "value") && this.set(e, t, n.value, null) : e._.accessCache[t] = 0, Reflect.defineProperty(e, t, n);
	}
};
function da(e) {
	return k(e) ? e.reduce((e, t) => (e[t] = null, e), {}) : e;
}
var fa = !0;
function pa(e) {
	let t = _a(e), n = e.proxy, r = e.ctx;
	fa = !1, t.beforeCreate && ha(t.beforeCreate, e, "bc");
	let { data: i, computed: a, methods: o, watch: s, provide: c, inject: l, created: u, beforeMount: d, mounted: f, beforeUpdate: p, updated: m, activated: h, deactivated: g, beforeDestroy: _, beforeUnmount: v, destroyed: y, unmounted: ee, render: te, renderTracked: b, renderTriggered: ne, errorCaptured: re, serverPrefetch: ie, expose: ae, inheritAttrs: oe, components: se, directives: ce, filters: le } = t;
	if (l && ma(l, r, null), o) for (let e in o) {
		let t = o[e];
		A(t) && (r[e] = t.bind(n));
	}
	if (i) {
		let t = i.call(n, n);
		M(t) && (e.data = /* @__PURE__ */ Nr(t));
	}
	if (fa = !0, a) for (let e in a) {
		let t = a[e], i = ls({
			get: A(t) ? t.bind(n, n) : A(t.get) ? t.get.bind(n, n) : E,
			set: !A(t) && A(t.set) ? t.set.bind(n) : E
		});
		Object.defineProperty(r, e, {
			enumerable: !0,
			configurable: !0,
			get: () => i.value,
			set: (e) => i.value = e
		});
	}
	if (s) for (let e in s) ga(s[e], r, n, e);
	if (c) {
		let e = A(c) ? c.call(n) : c;
		Reflect.ownKeys(e).forEach((t) => {
			Ti(t, e[t]);
		});
	}
	u && ha(u, e, "c");
	function x(e, t) {
		k(t) ? t.forEach((t) => e(t.bind(n))) : t && e(t.bind(n));
	}
	if (x(Xi, d), x(Zi, f), x(Qi, p), x($i, m), x(Wi, h), x(Gi, g), x(aa, re), x(ia, b), x(ra, ne), x(ea, v), x(ta, ee), x(na, ie), k(ae)) if (ae.length) {
		let t = e.exposed ||= {};
		ae.forEach((e) => {
			Object.defineProperty(t, e, {
				get: () => n[e],
				set: (t) => n[e] = t,
				enumerable: !0
			});
		});
	} else e.exposed ||= {};
	te && e.render === E && (e.render = te), oe != null && (e.inheritAttrs = oe), se && (e.components = se), ce && (e.directives = ce), ie && Li(e);
}
function ma(e, t, n = E) {
	k(e) && (e = Sa(e));
	for (let n in e) {
		let r = e[n], i;
		i = M(r) ? "default" in r ? Ei(r.from || n, r.default, !0) : Ei(r.from || n) : Ei(r), /* @__PURE__ */ H(i) ? Object.defineProperty(t, n, {
			enumerable: !0,
			configurable: !0,
			get: () => i.value,
			set: (e) => i.value = e
		}) : t[n] = i;
	}
}
function ha(e, t, n) {
	U(k(e) ? e.map((e) => e.bind(t.proxy)) : e.bind(t.proxy), t, n);
}
function ga(e, t, n, r) {
	let i = r.includes(".") ? Mi(n, r) : () => n[r];
	if (j(e)) {
		let n = t[e];
		A(n) && ki(i, n);
	} else if (A(e)) ki(i, e.bind(n));
	else if (M(e)) if (k(e)) e.forEach((e) => ga(e, t, n, r));
	else {
		let r = A(e.handler) ? e.handler.bind(n) : t[e.handler];
		A(r) && ki(i, r, e);
	}
}
function _a(e) {
	let t = e.type, { mixins: n, extends: r } = t, { mixins: i, optionsCache: a, config: { optionMergeStrategies: o } } = e.appContext, s = a.get(t), c;
	return s ? c = s : !i.length && !n && !r ? c = t : (c = {}, i.length && i.forEach((e) => va(c, e, o, !0)), va(c, t, o)), M(t) && a.set(t, c), c;
}
function va(e, t, n, r = !1) {
	let { mixins: i, extends: a } = t;
	a && va(e, a, n, !0), i && i.forEach((t) => va(e, t, n, !0));
	for (let i in t) if (!(r && i === "expose")) {
		let r = ya[i] || n && n[i];
		e[i] = r ? r(e[i], t[i]) : t[i];
	}
	return e;
}
var ya = {
	data: ba,
	props: wa,
	emits: wa,
	methods: Ca,
	computed: Ca,
	beforeCreate: q,
	created: q,
	beforeMount: q,
	mounted: q,
	beforeUpdate: q,
	updated: q,
	beforeDestroy: q,
	beforeUnmount: q,
	destroyed: q,
	unmounted: q,
	activated: q,
	deactivated: q,
	errorCaptured: q,
	serverPrefetch: q,
	components: Ca,
	directives: Ca,
	watch: Ta,
	provide: ba,
	inject: xa
};
function ba(e, t) {
	return t ? e ? function() {
		return D(A(e) ? e.call(this, this) : e, A(t) ? t.call(this, this) : t);
	} : t : e;
}
function xa(e, t) {
	return Ca(Sa(e), Sa(t));
}
function Sa(e) {
	if (k(e)) {
		let t = {};
		for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
		return t;
	}
	return e;
}
function q(e, t) {
	return e ? [...new Set([].concat(e, t))] : t;
}
function Ca(e, t) {
	return e ? D(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function wa(e, t) {
	return e ? k(e) && k(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : D(/* @__PURE__ */ Object.create(null), da(e), da(t ?? {})) : t;
}
function Ta(e, t) {
	if (!e) return t;
	if (!t) return e;
	let n = D(/* @__PURE__ */ Object.create(null), e);
	for (let r in t) n[r] = q(e[r], t[r]);
	return n;
}
function Ea() {
	return {
		app: null,
		config: {
			isNativeTag: Bt,
			performance: !1,
			globalProperties: {},
			optionMergeStrategies: {},
			errorHandler: void 0,
			warnHandler: void 0,
			compilerOptions: {}
		},
		mixins: [],
		components: {},
		directives: {},
		provides: /* @__PURE__ */ Object.create(null),
		optionsCache: /* @__PURE__ */ new WeakMap(),
		propsCache: /* @__PURE__ */ new WeakMap(),
		emitsCache: /* @__PURE__ */ new WeakMap()
	};
}
var Da = 0;
function Oa(e, t) {
	return function(n, r = null) {
		A(n) || (n = D({}, n)), r != null && !M(r) && (r = null);
		let i = Ea(), a = /* @__PURE__ */ new WeakSet(), o = [], s = !1, c = i.app = {
			_uid: Da++,
			_component: n,
			_props: r,
			_container: null,
			_context: i,
			_instance: null,
			version: us,
			get config() {
				return i.config;
			},
			set config(e) {},
			use(e, ...t) {
				return a.has(e) || (e && A(e.install) ? (a.add(e), e.install(c, ...t)) : A(e) && (a.add(e), e(c, ...t))), c;
			},
			mixin(e) {
				return i.mixins.includes(e) || i.mixins.push(e), c;
			},
			component(e, t) {
				return t ? (i.components[e] = t, c) : i.components[e];
			},
			directive(e, t) {
				return t ? (i.directives[e] = t, c) : i.directives[e];
			},
			mount(a, o, l) {
				if (!s) {
					let u = c._ceVNode || Fo(n, r);
					return u.appContext = i, l === !0 ? l = "svg" : l === !1 && (l = void 0), o && t ? t(u, a) : e(u, a, l), s = !0, c._container = a, a.__vue_app__ = c, ss(u.component);
				}
			},
			onUnmount(e) {
				o.push(e);
			},
			unmount() {
				s && (U(o, c._instance, 16), e(null, c._container), delete c._container.__vue_app__);
			},
			provide(e, t) {
				return i.provides[e] = t, c;
			},
			runWithContext(e) {
				let t = ka;
				ka = c;
				try {
					return e();
				} finally {
					ka = t;
				}
			}
		};
		return c;
	};
}
var ka = null, Aa = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${N(t)}Modifiers`] || e[`${on(t)}Modifiers`];
function ja(e, t, ...n) {
	if (e.isUnmounted) return;
	let r = e.vnode.props || T, i = n, a = t.startsWith("update:"), o = a && Aa(r, t.slice(7));
	o && (o.trim && (i = n.map((e) => j(e) ? e.trim() : e)), o.number && (i = n.map(dn)));
	let s, c = r[s = cn(t)] || r[s = cn(N(t))];
	!c && a && (c = r[s = cn(on(t))]), c && U(c, e, 6, i);
	let l = r[s + "Once"];
	if (l) {
		if (!e.emitted) e.emitted = {};
		else if (e.emitted[s]) return;
		e.emitted[s] = !0, U(l, e, 6, i);
	}
}
var Ma = /* @__PURE__ */ new WeakMap();
function Na(e, t, n = !1) {
	let r = n ? Ma : t.emitsCache, i = r.get(e);
	if (i !== void 0) return i;
	let a = e.emits, o = {}, s = !1;
	if (!A(e)) {
		let r = (e) => {
			let n = Na(e, t, !0);
			n && (s = !0, D(o, n));
		};
		!n && t.mixins.length && t.mixins.forEach(r), e.extends && r(e.extends), e.mixins && e.mixins.forEach(r);
	}
	return !a && !s ? (M(e) && r.set(e, null), null) : (k(a) ? a.forEach((e) => o[e] = null) : D(o, a), M(e) && r.set(e, o), o);
}
function Pa(e, t) {
	return !e || !Vt(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), O(e, t[0].toLowerCase() + t.slice(1)) || O(e, on(t)) || O(e, t));
}
function Fa(e) {
	let { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [a], slots: o, attrs: s, emit: c, render: l, renderCache: u, props: d, data: f, setupState: p, ctx: m, inheritAttrs: h } = e, g = Si(e), _, v;
	try {
		if (n.shapeFlag & 4) {
			let e = i || r, t = e;
			_ = X(l.call(t, e, u, d, p, f, m)), v = s;
		} else {
			let e = t;
			_ = X(e.length > 1 ? e(d, {
				attrs: s,
				slots: o,
				emit: c
			}) : e(d, null)), v = t.props ? s : Ia(s);
		}
	} catch (t) {
		Co.length = 0, ii(t, e, 1), _ = Fo(xo);
	}
	let y = _;
	if (v && h !== !1) {
		let e = Object.keys(v), { shapeFlag: t } = y;
		e.length && t & 7 && (a && e.some(Ht) && (v = La(v, a)), y = Ro(y, v, !1, !0));
	}
	return n.dirs && (y = Ro(y, null, !1, !0), y.dirs = y.dirs ? y.dirs.concat(n.dirs) : n.dirs), n.transition && Ii(y, n.transition), _ = y, Si(g), _;
}
var Ia = (e) => {
	let t;
	for (let n in e) (n === "class" || n === "style" || Vt(n)) && ((t ||= {})[n] = e[n]);
	return t;
}, La = (e, t) => {
	let n = {};
	for (let r in e) (!Ht(r) || !(r.slice(9) in t)) && (n[r] = e[r]);
	return n;
};
function Ra(e, t, n) {
	let { props: r, children: i, component: a } = e, { props: o, children: s, patchFlag: c } = t, l = a.emitsOptions;
	if (t.dirs || t.transition) return !0;
	if (n && c >= 0) {
		if (c & 1024) return !0;
		if (c & 16) return r ? za(r, o, l) : !!o;
		if (c & 8) {
			let e = t.dynamicProps;
			for (let t = 0; t < e.length; t++) {
				let n = e[t];
				if (Ba(o, r, n) && !Pa(l, n)) return !0;
			}
		}
	} else return (i || s) && (!s || !s.$stable) ? !0 : r === o ? !1 : r ? o ? za(r, o, l) : !0 : !!o;
	return !1;
}
function za(e, t, n) {
	let r = Object.keys(t);
	if (r.length !== Object.keys(e).length) return !0;
	for (let i = 0; i < r.length; i++) {
		let a = r[i];
		if (Ba(t, e, a) && !Pa(n, a)) return !0;
	}
	return !1;
}
function Ba(e, t, n) {
	let r = e[n], i = t[n];
	return n === "style" && M(r) && M(i) ? !wn(r, i) : r !== i;
}
function Va({ vnode: e, parent: t, suspense: n }, r) {
	for (; t;) {
		let n = t.subTree;
		if (n.suspense && n.suspense.activeBranch === e && (n.suspense.vnode.el = n.el = r, e = n), n === e) (e = t.vnode).el = r, t = t.parent;
		else break;
	}
	n && n.activeBranch === e && (n.vnode.el = r);
}
var Ha = {}, Ua = () => Object.create(Ha), Wa = (e) => Object.getPrototypeOf(e) === Ha;
function Ga(e, t, n, r = !1) {
	let i = {}, a = Ua();
	e.propsDefaults = /* @__PURE__ */ Object.create(null), qa(e, t, i, a);
	for (let t in e.propsOptions[0]) t in i || (i[t] = void 0);
	n ? e.props = r ? i : /* @__PURE__ */ Pr(i) : e.type.props ? e.props = i : e.props = a, e.attrs = a;
}
function Ka(e, t, n, r) {
	let { props: i, attrs: a, vnode: { patchFlag: o } } = e, s = /* @__PURE__ */ V(i), [c] = e.propsOptions, l = !1;
	if ((r || o > 0) && !(o & 16)) {
		if (o & 8) {
			let n = e.vnode.dynamicProps;
			for (let r = 0; r < n.length; r++) {
				let o = n[r];
				if (Pa(e.emitsOptions, o)) continue;
				let u = t[o];
				if (c) if (O(a, o)) u !== a[o] && (a[o] = u, l = !0);
				else {
					let t = N(o);
					i[t] = Ja(c, s, t, u, e, !1);
				}
				else u !== a[o] && (a[o] = u, l = !0);
			}
		}
	} else {
		qa(e, t, i, a) && (l = !0);
		let r;
		for (let a in s) (!t || !O(t, a) && ((r = on(a)) === a || !O(t, r))) && (c ? n && (n[a] !== void 0 || n[r] !== void 0) && (i[a] = Ja(c, s, a, void 0, e, !0)) : delete i[a]);
		if (a !== s) for (let e in a) (!t || !O(t, e)) && (delete a[e], l = !0);
	}
	l && er(e.attrs, "set", "");
}
function qa(e, t, n, r) {
	let [i, a] = e.propsOptions, o = !1, s;
	if (t) for (let c in t) {
		if (tn(c)) continue;
		let l = t[c], u;
		i && O(i, u = N(c)) ? !a || !a.includes(u) ? n[u] = l : (s ||= {})[u] = l : Pa(e.emitsOptions, c) || (!(c in r) || l !== r[c]) && (r[c] = l, o = !0);
	}
	if (a) {
		let t = /* @__PURE__ */ V(n), r = s || T;
		for (let o = 0; o < a.length; o++) {
			let s = a[o];
			n[s] = Ja(i, t, s, r[s], e, !O(r, s));
		}
	}
	return o;
}
function Ja(e, t, n, r, i, a) {
	let o = e[n];
	if (o != null) {
		let e = O(o, "default");
		if (e && r === void 0) {
			let e = o.default;
			if (o.type !== Function && !o.skipFactory && A(e)) {
				let { propsDefaults: a } = i;
				if (n in a) r = a[n];
				else {
					let o = Yo(i);
					r = a[n] = e.call(null, t), o();
				}
			} else r = e;
			i.ce && i.ce._setProp(n, r);
		}
		o[0] && (a && !e ? r = !1 : o[1] && (r === "" || r === on(n)) && (r = !0));
	}
	return r;
}
var Ya = /* @__PURE__ */ new WeakMap();
function Xa(e, t, n = !1) {
	let r = n ? Ya : t.propsCache, i = r.get(e);
	if (i) return i;
	let a = e.props, o = {}, s = [], c = !1;
	if (!A(e)) {
		let r = (e) => {
			c = !0;
			let [n, r] = Xa(e, t, !0);
			D(o, n), r && s.push(...r);
		};
		!n && t.mixins.length && t.mixins.forEach(r), e.extends && r(e.extends), e.mixins && e.mixins.forEach(r);
	}
	if (!a && !c) return M(e) && r.set(e, zt), zt;
	if (k(a)) for (let e = 0; e < a.length; e++) {
		let t = N(a[e]);
		Za(t) && (o[t] = T);
	}
	else if (a) for (let e in a) {
		let t = N(e);
		if (Za(t)) {
			let n = a[e], r = o[t] = k(n) || A(n) ? { type: n } : D({}, n), i = r.type, c = !1, l = !0;
			if (k(i)) for (let e = 0; e < i.length; ++e) {
				let t = i[e], n = A(t) && t.name;
				if (n === "Boolean") {
					c = !0;
					break;
				} else n === "String" && (l = !1);
			}
			else c = A(i) && i.name === "Boolean";
			r[0] = c, r[1] = l, (c || O(r, "default")) && s.push(t);
		}
	}
	let l = [o, s];
	return M(e) && r.set(e, l), l;
}
function Za(e) {
	return e[0] !== "$" && !tn(e);
}
var Qa = (e) => e === "_" || e === "_ctx" || e === "$stable", $a = (e) => k(e) ? e.map(X) : [X(e)], eo = (e, t, n) => {
	if (t._n) return t;
	let r = Ci((...e) => $a(t(...e)), n);
	return r._c = !1, r;
}, to = (e, t, n) => {
	let r = e._ctx;
	for (let n in e) {
		if (Qa(n)) continue;
		let i = e[n];
		if (A(i)) t[n] = eo(n, i, r);
		else if (i != null) {
			let e = $a(i);
			t[n] = () => e;
		}
	}
}, no = (e, t) => {
	let n = $a(t);
	e.slots.default = () => n;
}, ro = (e, t, n) => {
	for (let r in t) (n || !Qa(r)) && (e[r] = t[r]);
}, io = (e, t, n) => {
	let r = e.slots = Ua();
	if (e.vnode.shapeFlag & 32) {
		let e = t._;
		e ? (ro(r, t, n), n && un(r, "_", e, !0)) : to(t, r);
	} else t && no(e, t);
}, ao = (e, t, n) => {
	let { vnode: r, slots: i } = e, a = !0, o = T;
	if (r.shapeFlag & 32) {
		let e = t._;
		e ? n && e === 1 ? a = !1 : ro(i, t, n) : (a = !t.$stable, to(t, i)), o = t;
	} else t && (no(e, t), o = { default: 1 });
	if (a) for (let e in i) !Qa(e) && o[e] == null && delete i[e];
}, J = vo;
function oo(e) {
	return so(e);
}
function so(e, t) {
	let n = pn();
	n.__VUE__ = !0;
	let { insert: r, remove: i, patchProp: a, createElement: o, createText: s, createComment: c, setText: l, setElementText: u, parentNode: d, nextSibling: f, setScopeId: p = E, insertStaticContent: m } = e, h = (e, t, n, r = null, i = null, a = null, o = void 0, s = null, c = !!t.dynamicChildren) => {
		if (e === t) return;
		e && !jo(e, t) && (r = xe(e), ge(e, i, a, !0), e = null), t.patchFlag === -2 && (c = !1, t.dynamicChildren = null);
		let { type: l, ref: u, shapeFlag: d } = t;
		switch (l) {
			case bo:
				g(e, t, n, r);
				break;
			case xo:
				_(e, t, n, r);
				break;
			case So:
				e ?? v(t, n, r, o);
				break;
			case yo:
				se(e, t, n, r, i, a, o, s, c);
				break;
			default: d & 1 ? te(e, t, n, r, i, a, o, s, c) : d & 6 ? ce(e, t, n, r, i, a, o, s, c) : (d & 64 || d & 128) && l.process(e, t, n, r, i, a, o, s, c, we);
		}
		u != null && i ? Bi(u, e && e.ref, a, t || e, !t) : u == null && e && e.ref != null && Bi(e.ref, null, a, e, !0);
	}, g = (e, t, n, i) => {
		if (e == null) r(t.el = s(t.children), n, i);
		else {
			let n = t.el = e.el;
			t.children !== e.children && l(n, t.children);
		}
	}, _ = (e, t, n, i) => {
		e == null ? r(t.el = c(t.children || ""), n, i) : t.el = e.el;
	}, v = (e, t, n, r) => {
		[e.el, e.anchor] = m(e.children, t, n, r, e.el, e.anchor);
	}, y = ({ el: e, anchor: t }, n, i) => {
		let a;
		for (; e && e !== t;) a = f(e), r(e, n, i), e = a;
		r(t, n, i);
	}, ee = ({ el: e, anchor: t }) => {
		let n;
		for (; e && e !== t;) n = f(e), i(e), e = n;
		i(t);
	}, te = (e, t, n, r, i, a, o, s, c) => {
		if (t.type === "svg" ? o = "svg" : t.type === "math" && (o = "mathml"), e == null) b(t, n, r, i, a, o, s, c);
		else {
			let n = e.el && e.el._isVueCE ? e.el : null;
			try {
				n && n._beginPatch(), ie(e, t, i, a, o, s, c);
			} finally {
				n && n._endPatch();
			}
		}
	}, b = (e, t, n, i, s, c, l, d) => {
		let f, p, { props: m, shapeFlag: h, transition: g, dirs: _ } = e;
		if (f = e.el = o(e.type, c, m && m.is, m), h & 8 ? u(f, e.children) : h & 16 && re(e.children, f, null, i, s, co(e, c), l, d), _ && wi(e, null, i, "created"), ne(f, e, e.scopeId, l, i), m) {
			for (let e in m) e !== "value" && !tn(e) && a(f, e, null, m[e], c, i);
			"value" in m && a(f, "value", null, m.value, c), (p = m.onVnodeBeforeMount) && Z(p, i, e);
		}
		_ && wi(e, null, i, "beforeMount");
		let v = uo(s, g);
		v && g.beforeEnter(f), r(f, t, n), ((p = m && m.onVnodeMounted) || v || _) && J(() => {
			try {
				p && Z(p, i, e), v && g.enter(f), _ && wi(e, null, i, "mounted");
			} finally {}
		}, s);
	}, ne = (e, t, n, r, i) => {
		if (n && p(e, n), r) for (let t = 0; t < r.length; t++) p(e, r[t]);
		if (i) {
			let n = i.subTree;
			if (t === n || _o(n.type) && (n.ssContent === t || n.ssFallback === t)) {
				let t = i.vnode;
				ne(e, t, t.scopeId, t.slotScopeIds, i.parent);
			}
		}
	}, re = (e, t, n, r, i, a, o, s, c = 0) => {
		for (let l = c; l < e.length; l++) h(null, e[l] = s ? Bo(e[l]) : X(e[l]), t, n, r, i, a, o, s);
	}, ie = (e, t, n, r, i, o, s) => {
		let c = t.el = e.el, { patchFlag: l, dynamicChildren: d, dirs: f } = t;
		l |= e.patchFlag & 16;
		let p = e.props || T, m = t.props || T, h;
		if (n && lo(n, !1), (h = m.onVnodeBeforeUpdate) && Z(h, n, t, e), f && wi(t, e, n, "beforeUpdate"), n && lo(n, !0), (p.innerHTML && m.innerHTML == null || p.textContent && m.textContent == null) && u(c, ""), d ? ae(e.dynamicChildren, d, c, n, r, co(t, i), o) : s || fe(e, t, c, null, n, r, co(t, i), o, !1), l > 0) {
			if (l & 16) oe(c, p, m, n, i);
			else if (l & 2 && p.class !== m.class && a(c, "class", null, m.class, i), l & 4 && a(c, "style", p.style, m.style, i), l & 8) {
				let e = t.dynamicProps;
				for (let t = 0; t < e.length; t++) {
					let r = e[t], o = p[r], s = m[r];
					(s !== o || r === "value") && a(c, r, o, s, i, n);
				}
			}
			l & 1 && e.children !== t.children && u(c, t.children);
		} else !s && d == null && oe(c, p, m, n, i);
		((h = m.onVnodeUpdated) || f) && J(() => {
			h && Z(h, n, t, e), f && wi(t, e, n, "updated");
		}, r);
	}, ae = (e, t, n, r, i, a, o) => {
		for (let s = 0; s < t.length; s++) {
			let c = e[s], l = t[s];
			h(c, l, c.el && (c.type === yo || !jo(c, l) || c.shapeFlag & 198) ? d(c.el) : n, null, r, i, a, o, !0);
		}
	}, oe = (e, t, n, r, i) => {
		if (t !== n) {
			if (t !== T) for (let o in t) !tn(o) && !(o in n) && a(e, o, t[o], null, i, r);
			for (let o in n) {
				if (tn(o)) continue;
				let s = n[o], c = t[o];
				s !== c && o !== "value" && a(e, o, c, s, i, r);
			}
			"value" in n && a(e, "value", t.value, n.value, i);
		}
	}, se = (e, t, n, i, a, o, c, l, u) => {
		let d = t.el = e ? e.el : s(""), f = t.anchor = e ? e.anchor : s(""), { patchFlag: p, dynamicChildren: m, slotScopeIds: h } = t;
		h && (l = l ? l.concat(h) : h), e == null ? (r(d, n, i), r(f, n, i), re(t.children || [], n, f, a, o, c, l, u)) : p > 0 && p & 64 && m && e.dynamicChildren && e.dynamicChildren.length === m.length ? (ae(e.dynamicChildren, m, n, a, o, c, l), (t.key != null || a && t === a.subTree) && fo(e, t, !0)) : fe(e, t, n, f, a, o, c, l, u);
	}, ce = (e, t, n, r, i, a, o, s, c) => {
		t.slotScopeIds = s, e == null ? t.shapeFlag & 512 ? i.ctx.activate(t, n, r, o, c) : le(t, n, r, i, a, o, c) : x(e, t, c);
	}, le = (e, t, n, r, i, a, o) => {
		let s = e.component = Go(e, r, i);
		if (Ui(e) && (s.ctx.renderer = we), $o(s, !1, o), s.asyncDep) {
			if (i && i.registerDep(s, ue, o), !e.el) {
				let r = s.subTree = Fo(xo);
				_(null, r, t, n), e.placeholder = r.el;
			}
		} else ue(s, e, t, n, i, a, o);
	}, x = (e, t, n) => {
		let r = t.component = e.component;
		if (Ra(e, t, n)) if (r.asyncDep && !r.asyncResolved) {
			de(r, t, n);
			return;
		} else r.next = t, r.update();
		else t.el = e.el, r.vnode = t;
	}, ue = (e, t, n, r, i, a, o) => {
		let s = () => {
			if (e.isMounted) {
				let { next: t, bu: n, u: r, parent: s, vnode: c } = e;
				{
					let n = mo(e);
					if (n) {
						t && (t.el = c.el, de(e, t, o)), n.asyncDep.then(() => {
							J(() => {
								e.isUnmounted || l();
							}, i);
						});
						return;
					}
				}
				let u = t, f;
				lo(e, !1), t ? (t.el = c.el, de(e, t, o)) : t = c, n && ln(n), (f = t.props && t.props.onVnodeBeforeUpdate) && Z(f, s, t, c), lo(e, !0);
				let p = Fa(e), m = e.subTree;
				e.subTree = p, h(m, p, d(m.el), xe(m), e, i, a), t.el = p.el, u === null && Va(e, p.el), r && J(r, i), (f = t.props && t.props.onVnodeUpdated) && J(() => Z(f, s, t, c), i);
			} else {
				let o, { el: s, props: c } = t, { bm: l, m: u, parent: d, root: f, type: p } = e, m = Hi(t);
				if (lo(e, !1), l && ln(l), !m && (o = c && c.onVnodeBeforeMount) && Z(o, d, t), lo(e, !0), s && Ee) {
					let t = () => {
						e.subTree = Fa(e), Ee(s, e.subTree, e, i, null);
					};
					m && p.__asyncHydrate ? p.__asyncHydrate(s, e, t) : t();
				} else {
					f.ce && f.ce._hasShadowRoot() && f.ce._injectChildStyle(p, e.parent ? e.parent.type : void 0);
					let o = e.subTree = Fa(e);
					h(null, o, n, r, e, i, a), t.el = o.el;
				}
				if (u && J(u, i), !m && (o = c && c.onVnodeMounted)) {
					let e = t;
					J(() => Z(o, d, e), i);
				}
				(t.shapeFlag & 256 || d && Hi(d.vnode) && d.vnode.shapeFlag & 256) && e.a && J(e.a, i), e.isMounted = !0, t = n = r = null;
			}
		};
		e.scope.on();
		let c = e.effect = new kn(s);
		e.scope.off();
		let l = e.update = c.run.bind(c), u = e.job = c.runIfDirty.bind(c);
		u.i = e, u.id = e.uid, c.scheduler = () => mi(u), lo(e, !0), l();
	}, de = (e, t, n) => {
		t.component = e;
		let r = e.vnode.props;
		e.vnode = t, e.next = null, Ka(e, t.props, r, n), ao(e, t.children, n), Un(), _i(e), Wn();
	}, fe = (e, t, n, r, i, a, o, s, c = !1) => {
		let l = e && e.children, d = e ? e.shapeFlag : 0, f = t.children, { patchFlag: p, shapeFlag: m } = t;
		if (p > 0) {
			if (p & 128) {
				me(l, f, n, r, i, a, o, s, c);
				return;
			} else if (p & 256) {
				pe(l, f, n, r, i, a, o, s, c);
				return;
			}
		}
		m & 8 ? (d & 16 && be(l, i, a), f !== l && u(n, f)) : d & 16 ? m & 16 ? me(l, f, n, r, i, a, o, s, c) : be(l, i, a, !0) : (d & 8 && u(n, ""), m & 16 && re(f, n, r, i, a, o, s, c));
	}, pe = (e, t, n, r, i, a, o, s, c) => {
		e ||= zt, t ||= zt;
		let l = e.length, u = t.length, d = Math.min(l, u), f;
		for (f = 0; f < d; f++) {
			let r = t[f] = c ? Bo(t[f]) : X(t[f]);
			h(e[f], r, n, null, i, a, o, s, c);
		}
		l > u ? be(e, i, a, !0, !1, d) : re(t, n, r, i, a, o, s, c, d);
	}, me = (e, t, n, r, i, a, o, s, c) => {
		let l = 0, u = t.length, d = e.length - 1, f = u - 1;
		for (; l <= d && l <= f;) {
			let r = e[l], u = t[l] = c ? Bo(t[l]) : X(t[l]);
			if (jo(r, u)) h(r, u, n, null, i, a, o, s, c);
			else break;
			l++;
		}
		for (; l <= d && l <= f;) {
			let r = e[d], l = t[f] = c ? Bo(t[f]) : X(t[f]);
			if (jo(r, l)) h(r, l, n, null, i, a, o, s, c);
			else break;
			d--, f--;
		}
		if (l > d) {
			if (l <= f) {
				let e = f + 1, d = e < u ? t[e].el : r;
				for (; l <= f;) h(null, t[l] = c ? Bo(t[l]) : X(t[l]), n, d, i, a, o, s, c), l++;
			}
		} else if (l > f) for (; l <= d;) ge(e[l], i, a, !0), l++;
		else {
			let p = l, m = l, g = /* @__PURE__ */ new Map();
			for (l = m; l <= f; l++) {
				let e = t[l] = c ? Bo(t[l]) : X(t[l]);
				e.key != null && g.set(e.key, l);
			}
			let _, v = 0, y = f - m + 1, ee = !1, te = 0, b = Array(y);
			for (l = 0; l < y; l++) b[l] = 0;
			for (l = p; l <= d; l++) {
				let r = e[l];
				if (v >= y) {
					ge(r, i, a, !0);
					continue;
				}
				let u;
				if (r.key != null) u = g.get(r.key);
				else for (_ = m; _ <= f; _++) if (b[_ - m] === 0 && jo(r, t[_])) {
					u = _;
					break;
				}
				u === void 0 ? ge(r, i, a, !0) : (b[u - m] = l + 1, u >= te ? te = u : ee = !0, h(r, t[u], n, null, i, a, o, s, c), v++);
			}
			let ne = ee ? po(b) : zt;
			for (_ = ne.length - 1, l = y - 1; l >= 0; l--) {
				let e = m + l, d = t[e], f = t[e + 1], p = e + 1 < u ? f.el || go(f) : r;
				b[l] === 0 ? h(null, d, n, p, i, a, o, s, c) : ee && (_ < 0 || l !== ne[_] ? he(d, n, p, 2) : _--);
			}
		}
	}, he = (e, t, n, a, o = null) => {
		let { el: s, type: c, transition: l, children: u, shapeFlag: d } = e;
		if (d & 6) {
			he(e.component.subTree, t, n, a);
			return;
		}
		if (d & 128) {
			e.suspense.move(t, n, a);
			return;
		}
		if (d & 64) {
			c.move(e, t, n, we);
			return;
		}
		if (c === yo) {
			r(s, t, n);
			for (let e = 0; e < u.length; e++) he(u[e], t, n, a);
			r(e.anchor, t, n);
			return;
		}
		if (c === So) {
			y(e, t, n);
			return;
		}
		if (a !== 2 && d & 1 && l) if (a === 0) l.persisted && !s[Fi] ? r(s, t, n) : (l.beforeEnter(s), r(s, t, n), J(() => l.enter(s), o));
		else {
			let { leave: a, delayLeave: o, afterLeave: c } = l, u = () => {
				e.ctx.isUnmounted ? i(s) : r(s, t, n);
			}, d = () => {
				let e = s._isLeaving || !!s[Fi];
				s._isLeaving && s[Fi](!0), l.persisted && !e ? u() : a(s, () => {
					u(), c && c();
				});
			};
			o ? o(s, u, d) : d();
		}
		else r(s, t, n);
	}, ge = (e, t, n, r = !1, i = !1) => {
		let { type: a, props: o, ref: s, children: c, dynamicChildren: l, shapeFlag: u, patchFlag: d, dirs: f, cacheIndex: p, memo: m } = e;
		if (d === -2 && (i = !1), s != null && (Un(), Bi(s, null, n, e, !0), Wn()), p != null && (t.renderCache[p] = void 0), u & 256) {
			t.ctx.deactivate(e);
			return;
		}
		let h = u & 1 && f, g = !Hi(e), _;
		if (g && (_ = o && o.onVnodeBeforeUnmount) && Z(_, t, e), u & 6) ye(e.component, n, r);
		else {
			if (u & 128) {
				e.suspense.unmount(n, r);
				return;
			}
			h && wi(e, null, t, "beforeUnmount"), u & 64 ? e.type.remove(e, t, n, we, r) : l && !l.hasOnce && (a !== yo || d > 0 && d & 64) ? be(l, t, n, !1, !0) : (a === yo && d & 384 || !i && u & 16) && be(c, t, n), r && _e(e);
		}
		let v = m != null && p == null;
		(g && (_ = o && o.onVnodeUnmounted) || h || v) && J(() => {
			_ && Z(_, t, e), h && wi(e, null, t, "unmounted"), v && (e.el = null);
		}, n);
	}, _e = (e) => {
		let { type: t, el: n, anchor: r, transition: a } = e;
		if (t === yo) {
			ve(n, r);
			return;
		}
		if (t === So) {
			ee(e);
			return;
		}
		let o = () => {
			i(n), a && !a.persisted && a.afterLeave && a.afterLeave();
		};
		if (e.shapeFlag & 1 && a && !a.persisted) {
			let { leave: t, delayLeave: r } = a, i = () => t(n, o);
			r ? r(e.el, o, i) : i();
		} else o();
	}, ve = (e, t) => {
		let n;
		for (; e !== t;) n = f(e), i(e), e = n;
		i(t);
	}, ye = (e, t, n) => {
		let { bum: r, scope: i, job: a, subTree: o, um: s, m: c, a: l } = e;
		ho(c), ho(l), r && ln(r), i.stop(), a && (a.flags |= 8, ge(o, e, t, n)), s && J(s, t), J(() => {
			e.isUnmounted = !0;
		}, t);
	}, be = (e, t, n, r = !1, i = !1, a = 0) => {
		for (let o = a; o < e.length; o++) ge(e[o], t, n, r, i);
	}, xe = (e) => {
		if (e.shapeFlag & 6) return xe(e.component.subTree);
		if (e.shapeFlag & 128) return e.suspense.next();
		let t = f(e.anchor || e.el), n = t && t[Ni];
		return n ? f(n) : t;
	}, Se = !1, Ce = (e, t, n) => {
		let r;
		e == null ? t._vnode && (ge(t._vnode, null, null, !0), r = t._vnode.component) : h(t._vnode || null, e, t, null, null, null, n), t._vnode = e, Se ||= (Se = !0, _i(r), vi(), !1);
	}, we = {
		p: h,
		um: ge,
		m: he,
		r: _e,
		mt: le,
		mc: re,
		pc: fe,
		pbc: ae,
		n: xe,
		o: e
	}, Te, Ee;
	return t && ([Te, Ee] = t(we)), {
		render: Ce,
		hydrate: Te,
		createApp: Oa(Ce, Te)
	};
}
function co({ type: e, props: t }, n) {
	return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function lo({ effect: e, job: t }, n) {
	n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function uo(e, t) {
	return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function fo(e, t, n = !1) {
	let r = e.children, i = t.children;
	if (k(r) && k(i)) for (let e = 0; e < r.length; e++) {
		let t = r[e], a = i[e];
		a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[e] = Bo(i[e]), a.el = t.el), !n && a.patchFlag !== -2 && fo(t, a)), a.type === bo && (a.patchFlag === -1 && (a = i[e] = Bo(a)), a.el = t.el), a.type === xo && !a.el && (a.el = t.el);
	}
}
function po(e) {
	let t = e.slice(), n = [0], r, i, a, o, s, c = e.length;
	for (r = 0; r < c; r++) {
		let c = e[r];
		if (c !== 0) {
			if (i = n[n.length - 1], e[i] < c) {
				t[r] = i, n.push(r);
				continue;
			}
			for (a = 0, o = n.length - 1; a < o;) s = a + o >> 1, e[n[s]] < c ? a = s + 1 : o = s;
			c < e[n[a]] && (a > 0 && (t[r] = n[a - 1]), n[a] = r);
		}
	}
	for (a = n.length, o = n[a - 1]; a-- > 0;) n[a] = o, o = t[o];
	return n;
}
function mo(e) {
	let t = e.subTree.component;
	if (t) return t.asyncDep && !t.asyncResolved ? t : mo(t);
}
function ho(e) {
	if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
function go(e) {
	if (e.placeholder) return e.placeholder;
	let t = e.component;
	return t ? go(t.subTree) : null;
}
var _o = (e) => e.__isSuspense;
function vo(e, t) {
	t && t.pendingBranch ? k(e) ? t.effects.push(...e) : t.effects.push(e) : gi(e);
}
var yo = /* @__PURE__ */ Symbol.for("v-fgt"), bo = /* @__PURE__ */ Symbol.for("v-txt"), xo = /* @__PURE__ */ Symbol.for("v-cmt"), So = /* @__PURE__ */ Symbol.for("v-stc"), Co = [], Y = null;
function wo(e = !1) {
	Co.push(Y = e ? null : []);
}
function To() {
	Co.pop(), Y = Co[Co.length - 1] || null;
}
var Eo = 1;
function Do(e, t = !1) {
	Eo += e, e < 0 && Y && t && (Y.hasOnce = !0);
}
function Oo(e) {
	return e.dynamicChildren = Eo > 0 ? Y || zt : null, To(), Eo > 0 && Y && Y.push(e), e;
}
function ko(e, t, n, r, i, a) {
	return Oo(Po(e, t, n, r, i, a, !0));
}
function Ao(e) {
	return e ? e.__v_isVNode === !0 : !1;
}
function jo(e, t) {
	return e.type === t.type && e.key === t.key;
}
var Mo = ({ key: e }) => e ?? null, No = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e == null ? null : j(e) || /* @__PURE__ */ H(e) || A(e) ? {
	i: K,
	r: e,
	k: t,
	f: !!n
} : e);
function Po(e, t = null, n = null, r = 0, i = null, a = e === yo ? 0 : 1, o = !1, s = !1) {
	let c = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e,
		props: t,
		key: t && Mo(t),
		ref: t && No(t),
		scopeId: xi,
		slotScopeIds: null,
		children: n,
		component: null,
		suspense: null,
		ssContent: null,
		ssFallback: null,
		dirs: null,
		transition: null,
		el: null,
		anchor: null,
		target: null,
		targetStart: null,
		targetAnchor: null,
		staticCount: 0,
		shapeFlag: a,
		patchFlag: r,
		dynamicProps: i,
		dynamicChildren: null,
		appContext: null,
		ctx: K
	};
	return s ? (Vo(c, n), a & 128 && e.normalize(c)) : n && (c.shapeFlag |= j(n) ? 8 : 16), Eo > 0 && !o && Y && (c.patchFlag > 0 || a & 6) && c.patchFlag !== 32 && Y.push(c), c;
}
var Fo = Io;
function Io(e, t = null, n = null, r = 0, i = null, a = !1) {
	if ((!e || e === oa) && (e = xo), Ao(e)) {
		let r = Ro(e, t, !0);
		return n && Vo(r, n), Eo > 0 && !a && Y && (r.shapeFlag & 6 ? Y[Y.indexOf(e)] = r : Y.push(r)), r.patchFlag = -2, r;
	}
	if (cs(e) && (e = e.__vccOpts), t) {
		t = Lo(t);
		let { class: e, style: n } = t;
		e && !j(e) && (t.class = yn(e)), M(n) && (/* @__PURE__ */ zr(n) && !k(n) && (n = D({}, n)), t.style = mn(n));
	}
	let o = j(e) ? 1 : _o(e) ? 128 : Pi(e) ? 64 : M(e) ? 4 : A(e) ? 2 : 0;
	return Po(e, t, n, r, i, o, a, !0);
}
function Lo(e) {
	return e ? /* @__PURE__ */ zr(e) || Wa(e) ? D({}, e) : e : null;
}
function Ro(e, t, n = !1, r = !1) {
	let { props: i, ref: a, patchFlag: o, children: s, transition: c } = e, l = t ? Ho(i || {}, t) : i, u = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e.type,
		props: l,
		key: l && Mo(l),
		ref: t && t.ref ? n && a ? k(a) ? a.concat(No(t)) : [a, No(t)] : No(t) : a,
		scopeId: e.scopeId,
		slotScopeIds: e.slotScopeIds,
		children: s,
		target: e.target,
		targetStart: e.targetStart,
		targetAnchor: e.targetAnchor,
		staticCount: e.staticCount,
		shapeFlag: e.shapeFlag,
		patchFlag: t && e.type !== yo ? o === -1 ? 16 : o | 16 : o,
		dynamicProps: e.dynamicProps,
		dynamicChildren: e.dynamicChildren,
		appContext: e.appContext,
		dirs: e.dirs,
		transition: c,
		component: e.component,
		suspense: e.suspense,
		ssContent: e.ssContent && Ro(e.ssContent),
		ssFallback: e.ssFallback && Ro(e.ssFallback),
		placeholder: e.placeholder,
		el: e.el,
		anchor: e.anchor,
		ctx: e.ctx,
		ce: e.ce
	};
	return c && r && Ii(u, c.clone(u)), u;
}
function zo(e = " ", t = 0) {
	return Fo(bo, null, e, t);
}
function X(e) {
	return e == null || typeof e == "boolean" ? Fo(xo) : k(e) ? Fo(yo, null, e.slice()) : Ao(e) ? Bo(e) : Fo(bo, null, String(e));
}
function Bo(e) {
	return e.el === null && e.patchFlag !== -1 || e.memo ? e : Ro(e);
}
function Vo(e, t) {
	let n = 0, { shapeFlag: r } = e;
	if (t == null) t = null;
	else if (k(t)) n = 16;
	else if (typeof t == "object") if (r & 65) {
		let n = t.default;
		n && (n._c && (n._d = !1), Vo(e, n()), n._c && (n._d = !0));
		return;
	} else {
		n = 32;
		let r = t._;
		!r && !Wa(t) ? t._ctx = K : r === 3 && K && (K.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
	}
	else A(t) ? (t = {
		default: t,
		_ctx: K
	}, n = 32) : (t = String(t), r & 64 ? (n = 16, t = [zo(t)]) : n = 8);
	e.children = t, e.shapeFlag |= n;
}
function Ho(...e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		for (let e in r) if (e === "class") t.class !== r.class && (t.class = yn([t.class, r.class]));
		else if (e === "style") t.style = mn([t.style, r.style]);
		else if (Vt(e)) {
			let n = t[e], i = r[e];
			i && n !== i && !(k(n) && n.includes(i)) ? t[e] = n ? [].concat(n, i) : i : i == null && n == null && !Ht(e) && (t[e] = i);
		} else e !== "" && (t[e] = r[e]);
	}
	return t;
}
function Z(e, t, n, r = null) {
	U(e, t, 7, [n, r]);
}
var Uo = Ea(), Wo = 0;
function Go(e, t, n) {
	let r = e.type, i = (t ? t.appContext : e.appContext) || Uo, a = {
		uid: Wo++,
		vnode: e,
		type: r,
		parent: t,
		appContext: i,
		root: null,
		next: null,
		subTree: null,
		effect: null,
		update: null,
		job: null,
		scope: new Tn(!0),
		render: null,
		proxy: null,
		exposed: null,
		exposeProxy: null,
		withProxy: null,
		provides: t ? t.provides : Object.create(i.provides),
		ids: t ? t.ids : [
			"",
			0,
			0
		],
		accessCache: null,
		renderCache: [],
		components: null,
		directives: null,
		propsOptions: Xa(r, i),
		emitsOptions: Na(r, i),
		emit: null,
		emitted: null,
		propsDefaults: T,
		inheritAttrs: r.inheritAttrs,
		ctx: T,
		data: T,
		props: T,
		attrs: T,
		slots: T,
		refs: T,
		setupState: T,
		setupContext: null,
		suspense: n,
		suspenseId: n ? n.pendingId : 0,
		asyncDep: null,
		asyncResolved: !1,
		isMounted: !1,
		isUnmounted: !1,
		isDeactivated: !1,
		bc: null,
		c: null,
		bm: null,
		m: null,
		bu: null,
		u: null,
		um: null,
		bum: null,
		da: null,
		a: null,
		rtg: null,
		rtc: null,
		ec: null,
		sp: null
	};
	return a.ctx = { _: a }, a.root = t ? t.root : a, a.emit = ja.bind(null, a), e.ce && e.ce(a), a;
}
var Q = null, Ko = () => Q || K, qo, Jo;
{
	let e = pn(), t = (t, n) => {
		let r;
		return (r = e[t]) || (r = e[t] = []), r.push(n), (e) => {
			r.length > 1 ? r.forEach((t) => t(e)) : r[0](e);
		};
	};
	qo = t("__VUE_INSTANCE_SETTERS__", (e) => Q = e), Jo = t("__VUE_SSR_SETTERS__", (e) => Qo = e);
}
var Yo = (e) => {
	let t = Q;
	return qo(e), e.scope.on(), () => {
		e.scope.off(), qo(t);
	};
}, Xo = () => {
	Q && Q.scope.off(), qo(null);
};
function Zo(e) {
	return e.vnode.shapeFlag & 4;
}
var Qo = !1;
function $o(e, t = !1, n = !1) {
	t && Jo(t);
	let { props: r, children: i } = e.vnode, a = Zo(e);
	Ga(e, r, a, t), io(e, i, n || t);
	let o = a ? es(e, t) : void 0;
	return t && Jo(!1), o;
}
function es(e, t) {
	let n = e.type;
	e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, ua);
	let { setup: r } = n;
	if (r) {
		Un();
		let n = e.setupContext = r.length > 1 ? os(e) : null, i = Yo(e), a = ri(r, e, 0, [e.props, n]), o = Yt(a);
		if (Wn(), i(), (o || e.sp) && !Hi(e) && Li(e), o) {
			if (a.then(Xo, Xo), t) return a.then((n) => {
				ts(e, n, t);
			}).catch((t) => {
				ii(t, e, 0);
			});
			e.asyncDep = a;
		} else ts(e, a, t);
	} else is(e, t);
}
function ts(e, t, n) {
	A(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : M(t) && (e.setupState = Jr(t)), is(e, n);
}
var ns, rs;
function is(e, t, n) {
	let r = e.type;
	if (!e.render) {
		if (!t && ns && !r.render) {
			let t = r.template || _a(e).template;
			if (t) {
				let { isCustomElement: n, compilerOptions: i } = e.appContext.config, { delimiters: a, compilerOptions: o } = r;
				r.render = ns(t, D(D({
					isCustomElement: n,
					delimiters: a
				}, i), o));
			}
		}
		e.render = r.render || E, rs && rs(e);
	}
	{
		let t = Yo(e);
		Un();
		try {
			pa(e);
		} finally {
			Wn(), t();
		}
	}
}
var as = { get(e, t) {
	return R(e, "get", ""), e[t];
} };
function os(e) {
	return {
		attrs: new Proxy(e.attrs, as),
		slots: e.slots,
		emit: e.emit,
		expose: (t) => {
			e.exposed = t || {};
		}
	};
}
function ss(e) {
	return e.exposed ? e.exposeProxy ||= new Proxy(Jr(Br(e.exposed)), {
		get(t, n) {
			if (n in t) return t[n];
			if (n in ca) return ca[n](e);
		},
		has(e, t) {
			return t in e || t in ca;
		}
	}) : e.proxy;
}
function cs(e) {
	return A(e) && "__vccOpts" in e;
}
var ls = (e, t) => /* @__PURE__ */ Xr(e, t, Qo), us = "3.5.38", ds = void 0, fs = typeof window < "u" && window.trustedTypes;
if (fs) try {
	ds = /* @__PURE__ */ fs.createPolicy("vue", { createHTML: (e) => e });
} catch {}
var ps = ds ? (e) => ds.createHTML(e) : (e) => e, ms = "http://www.w3.org/2000/svg", hs = "http://www.w3.org/1998/Math/MathML", $ = typeof document < "u" ? document : null, gs = $ && /* @__PURE__ */ $.createElement("template"), _s = {
	insert: (e, t, n) => {
		t.insertBefore(e, n || null);
	},
	remove: (e) => {
		let t = e.parentNode;
		t && t.removeChild(e);
	},
	createElement: (e, t, n, r) => {
		let i = t === "svg" ? $.createElementNS(ms, e) : t === "mathml" ? $.createElementNS(hs, e) : n ? $.createElement(e, { is: n }) : $.createElement(e);
		return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
	},
	createText: (e) => $.createTextNode(e),
	createComment: (e) => $.createComment(e),
	setText: (e, t) => {
		e.nodeValue = t;
	},
	setElementText: (e, t) => {
		e.textContent = t;
	},
	parentNode: (e) => e.parentNode,
	nextSibling: (e) => e.nextSibling,
	querySelector: (e) => $.querySelector(e),
	setScopeId(e, t) {
		e.setAttribute(t, "");
	},
	insertStaticContent(e, t, n, r, i, a) {
		let o = n ? n.previousSibling : t.lastChild;
		if (i && (i === a || i.nextSibling)) for (; t.insertBefore(i.cloneNode(!0), n), !(i === a || !(i = i.nextSibling)););
		else {
			gs.innerHTML = ps(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
			let i = gs.content;
			if (r === "svg" || r === "mathml") {
				let e = i.firstChild;
				for (; e.firstChild;) i.appendChild(e.firstChild);
				i.removeChild(e);
			}
			t.insertBefore(i, n);
		}
		return [o ? o.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
	}
}, vs = /* @__PURE__ */ Symbol("_vtc");
function ys(e, t, n) {
	let r = e[vs];
	r && (t = (t ? [t, ...r] : [...r]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
var bs = /* @__PURE__ */ Symbol("_vod"), xs = /* @__PURE__ */ Symbol("_vsh"), Ss = /* @__PURE__ */ Symbol(""), Cs = /(?:^|;)\s*display\s*:/;
function ws(e, t, n) {
	let r = e.style, i = j(n), a = !1;
	if (n && !i) {
		if (t) if (j(t)) for (let e of t.split(";")) {
			let t = e.slice(0, e.indexOf(":")).trim();
			n[t] ?? Es(r, t, "");
		}
		else for (let e in t) n[e] ?? Es(r, e, "");
		for (let i in n) {
			i === "display" && (a = !0);
			let o = n[i];
			o == null ? Es(r, i, "") : As(e, i, !j(t) && t ? t[i] : void 0, o) || Es(r, i, o);
		}
	} else if (i) {
		if (t !== n) {
			let e = r[Ss];
			e && (n += ";" + e), r.cssText = n, a = Cs.test(n);
		}
	} else t && e.removeAttribute("style");
	bs in e && (e[bs] = a ? r.display : "", e[xs] && (r.display = "none"));
}
var Ts = /\s*!important$/;
function Es(e, t, n) {
	if (k(n)) n.forEach((n) => Es(e, t, n));
	else if (n ??= "", t.startsWith("--")) e.setProperty(t, n);
	else {
		let r = ks(e, t);
		Ts.test(n) ? e.setProperty(on(r), n.replace(Ts, ""), "important") : e[r] = n;
	}
}
var Ds = [
	"Webkit",
	"Moz",
	"ms"
], Os = {};
function ks(e, t) {
	let n = Os[t];
	if (n) return n;
	let r = N(t);
	if (r !== "filter" && r in e) return Os[t] = r;
	r = sn(r);
	for (let n = 0; n < Ds.length; n++) {
		let i = Ds[n] + r;
		if (i in e) return Os[t] = i;
	}
	return t;
}
function As(e, t, n, r) {
	return e.tagName === "TEXTAREA" && (t === "width" || t === "height") && j(r) && n === r;
}
var js = "http://www.w3.org/1999/xlink";
function Ms(e, t, n, r, i, a = xn(t)) {
	r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(js, t.slice(6, t.length)) : e.setAttributeNS(js, t, n) : n == null || a && !Sn(n) ? e.removeAttribute(t) : e.setAttribute(t, a ? "" : Jt(n) ? String(n) : n);
}
function Ns(e, t, n, r, i) {
	if (t === "innerHTML" || t === "textContent") {
		n != null && (e[t] = t === "innerHTML" ? ps(n) : n);
		return;
	}
	let a = e.tagName;
	if (t === "value" && a !== "PROGRESS" && !a.includes("-")) {
		let r = a === "OPTION" ? e.getAttribute("value") || "" : e.value, i = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
		(r !== i || !("_value" in e)) && (e.value = i), n ?? e.removeAttribute(t), e._value = n;
		return;
	}
	let o = !1;
	if (n === "" || n == null) {
		let r = typeof e[t];
		r === "boolean" ? n = Sn(n) : n == null && r === "string" ? (n = "", o = !0) : r === "number" && (n = 0, o = !0);
	}
	try {
		e[t] = n;
	} catch {}
	o && e.removeAttribute(i || t);
}
function Ps(e, t, n, r) {
	e.addEventListener(t, n, r);
}
function Fs(e, t, n, r) {
	e.removeEventListener(t, n, r);
}
var Is = /* @__PURE__ */ Symbol("_vei");
function Ls(e, t, n, r, i = null) {
	let a = e[Is] || (e[Is] = {}), o = a[t];
	if (r && o) o.value = r;
	else {
		let [n, s] = zs(t);
		r ? Ps(e, n, a[t] = Us(r, i), s) : o && (Fs(e, n, o, s), a[t] = void 0);
	}
}
var Rs = /(?:Once|Passive|Capture)$/;
function zs(e) {
	let t;
	if (Rs.test(e)) {
		t = {};
		let n;
		for (; n = e.match(Rs);) e = e.slice(0, e.length - n[0].length), t[n[0].toLowerCase()] = !0;
	}
	return [e[2] === ":" ? e.slice(3) : on(e.slice(2)), t];
}
var Bs = 0, Vs = /* @__PURE__ */ Promise.resolve(), Hs = () => Bs ||= (Vs.then(() => Bs = 0), Date.now());
function Us(e, t) {
	let n = (e) => {
		if (!e._vts) e._vts = Date.now();
		else if (e._vts <= n.attached) return;
		let r = n.value;
		if (k(r)) {
			let n = e.stopImmediatePropagation;
			e.stopImmediatePropagation = () => {
				n.call(e), e._stopped = !0;
			};
			let i = r.slice(), a = [e];
			for (let n = 0; n < i.length && !e._stopped; n++) {
				let e = i[n];
				e && U(e, t, 5, a);
			}
		} else U(r, t, 5, [e]);
	};
	return n.value = e, n.attached = Hs(), n;
}
var Ws = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Gs = (e, t, n, r, i, a) => {
	let o = i === "svg";
	t === "class" ? ys(e, r, o) : t === "style" ? ws(e, n, r) : Vt(t) ? Ht(t) || Ls(e, t, n, r, a) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : Ks(e, t, r, o)) ? (Ns(e, t, r), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Ms(e, t, r, o, a, t !== "value")) : e._isVueCE && (qs(e, t) || e._def.__asyncLoader && (/[A-Z]/.test(t) || !j(r))) ? Ns(e, N(t), r, a, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), Ms(e, t, r, o));
};
function Ks(e, t, n, r) {
	if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Ws(t) && A(n));
	if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return !1;
	if (t === "width" || t === "height") {
		let t = e.tagName;
		if (t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "SOURCE") return !1;
	}
	return Ws(t) && j(n) ? !1 : t in e;
}
function qs(e, t) {
	let n = e._def.props;
	if (!n) return !1;
	let r = N(t);
	return Array.isArray(n) ? n.some((e) => N(e) === r) : Object.keys(n).some((e) => N(e) === r);
}
var Js = /* @__PURE__ */ D({ patchProp: Gs }, _s), Ys;
function Xs() {
	return Ys ||= oo(Js);
}
var Zs = ((...e) => {
	let t = Xs().createApp(...e), { mount: n } = t;
	return t.mount = (e) => {
		let r = $s(e);
		if (!r) return;
		let i = t._component;
		!A(i) && !i.render && !i.template && (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
		let a = n(r, !1, Qs(r));
		return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), a;
	}, t;
});
function Qs(e) {
	if (e instanceof SVGElement) return "svg";
	if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
}
function $s(e) {
	return j(e) ? document.querySelector(e) : e;
}
//#endregion
//#region \0plugin-vue:export-helper
var ec = (e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
}, tc = {}, nc = { class: "sample-app" };
function rc(e, t) {
	return wo(), ko("main", nc, [...t[0] ||= [Po("h1", null, "Sample Application", -1), Po("p", null, " This sample demonstrates the application shell. Prefer Foundry controls and native dialogs for simple workflows; use Vue + DaisyUI when a dedicated application is needed. ", -1)]]);
}
var ic = /*#__PURE__*/ ec(tc, [["render", rc]]), ac = typeof window < "u", oc = Symbol(), sc;
(function(e) {
	e.direct = "direct", e.patchObject = "patch object", e.patchFunction = "patch function";
})(sc ||= {});
var cc = typeof window == "object" && window.window === window ? window : typeof self == "object" && self.self === self ? self : typeof global == "object" && global.global === global ? global : typeof globalThis == "object" ? globalThis : { HTMLElement: null };
function lc(e, { autoBom: t = !1 } = {}) {
	return t && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type) ? new Blob(["﻿", e], { type: e.type }) : e;
}
function uc(e, t, n) {
	let r = new XMLHttpRequest();
	r.open("GET", e), r.responseType = "blob", r.onload = function() {
		hc(r.response, t, n);
	}, r.onerror = function() {
		console.error("could not download file");
	}, r.send();
}
function dc(e) {
	let t = new XMLHttpRequest();
	t.open("HEAD", e, !1);
	try {
		t.send();
	} catch {}
	return t.status >= 200 && t.status <= 299;
}
function fc(e) {
	try {
		e.dispatchEvent(new MouseEvent("click"));
	} catch {
		let t = new MouseEvent("click", {
			bubbles: !0,
			cancelable: !0,
			view: window,
			detail: 0,
			screenX: 80,
			screenY: 20,
			clientX: 80,
			clientY: 20,
			ctrlKey: !1,
			altKey: !1,
			shiftKey: !1,
			metaKey: !1,
			button: 0,
			relatedTarget: null
		});
		e.dispatchEvent(t);
	}
}
var pc = typeof navigator == "object" ? navigator : { userAgent: "" }, mc = /Macintosh/.test(pc.userAgent) && /AppleWebKit/.test(pc.userAgent) && !/Safari/.test(pc.userAgent), hc = ac ? typeof HTMLAnchorElement < "u" && "download" in HTMLAnchorElement.prototype && !mc ? gc : "msSaveOrOpenBlob" in pc ? _c : vc : () => {};
function gc(e, t = "download", n) {
	let r = document.createElement("a");
	r.download = t, r.rel = "noopener", typeof e == "string" ? (r.href = e, r.origin === location.origin ? fc(r) : dc(r.href) ? uc(e, t, n) : (r.target = "_blank", fc(r))) : (r.href = URL.createObjectURL(e), setTimeout(function() {
		URL.revokeObjectURL(r.href);
	}, 4e4), setTimeout(function() {
		fc(r);
	}, 0));
}
function _c(e, t = "download", n) {
	if (typeof e == "string") if (dc(e)) uc(e, t, n);
	else {
		let t = document.createElement("a");
		t.href = e, t.target = "_blank", setTimeout(function() {
			fc(t);
		});
	}
	else navigator.msSaveOrOpenBlob(lc(e, n), t);
}
function vc(e, t, n, r) {
	if (r ||= open("", "_blank"), r && (r.document.title = r.document.body.innerText = "downloading..."), typeof e == "string") return uc(e, t, n);
	let i = e.type === "application/octet-stream", a = /constructor/i.test(String(cc.HTMLElement)) || "safari" in cc, o = /CriOS\/[\d]+/.test(navigator.userAgent);
	if ((o || i && a || mc) && typeof FileReader < "u") {
		let t = new FileReader();
		t.onloadend = function() {
			let e = t.result;
			if (typeof e != "string") throw r = null, Error("Wrong reader.result type");
			e = o ? e : e.replace(/^data:[^;]*;/, "data:attachment/file;"), r ? r.location.href = e : location.assign(e), r = null;
		}, t.readAsDataURL(e);
	} else {
		let t = URL.createObjectURL(e);
		r ? r.location.assign(t) : location.href = t, r = null, setTimeout(function() {
			URL.revokeObjectURL(t);
		}, 4e4);
	}
}
var { assign: yc } = Object;
function bc() {
	let e = En(!0), t = e.run(() => /* @__PURE__ */ Ur({})), n = [], r = [], i = Br({
		install(e) {
			i._a = e, e.provide(oc, i), e.config.globalProperties.$pinia = i, r.forEach((e) => n.push(e)), r = [];
		},
		use(e) {
			return this._a ? n.push(e) : r.push(e), this;
		},
		_p: n,
		_a: null,
		_e: e,
		_s: /* @__PURE__ */ new Map(),
		state: t
	});
	return i;
}
var { assign: xc } = Object, Sc = class {
	#e;
	createRoot() {
		let e = document.createElement("div");
		return e.classList.add("infinite-scenes-root"), e.dataset.theme = "infinite-scenes", e;
	}
	mount(e, t, n, r) {
		this.unmount(), t.classList.add("infinite-scenes-app"), t.replaceChildren(e), this.#e = Zs(n, r), this.#e.use(bc()), this.#e.mount(e);
	}
	unmount() {
		this.#e?.unmount(), this.#e = void 0;
	}
}, Cc = class extends foundry.applications.api.ApplicationV2 {
	#e = new Sc();
	getVueProps() {}
	async _renderHTML(e, t) {
		return this.#e.createRoot();
	}
	_replaceHTML(e, t, n) {
		this.#e.mount(e, t, this.getVueComponent(), this.getVueProps() ?? {});
	}
	async _preClose(e) {
		this.#e.unmount(), await super._preClose(e);
	}
}, wc = class extends Cc {
	static DEFAULT_OPTIONS = {
		id: `${w}-sample`,
		tag: "section",
		window: {
			icon: "fa-solid fa-cube",
			resizable: !0,
			title: `${Lt} Sample`
		},
		position: {
			height: "auto",
			width: 480
		}
	};
	getVueComponent() {
		return ic;
	}
};
function Tc(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ec(e, t, n) {
	let r = {};
	for (let [i, a] of Object.entries(e)) {
		if (i === "default") {
			r[i] = a;
			continue;
		}
		let e = Object.hasOwn(t.ownershipMap ?? {}, i) ? t.ownershipMap?.[i] : t.destinationUserIds.includes(i) ? i : null;
		if (!e) {
			n.add(i);
			continue;
		}
		let o = r[e];
		r[e] = typeof o == "number" && typeof a == "number" ? Math.max(o, a) : a;
	}
	return r;
}
function Dc(e, t, n, r) {
	if (Array.isArray(e)) {
		let i = new Map((Array.isArray(t) ? t : []).filter((e) => Tc(e) && typeof e._id == "string").map((e) => [e._id, e]));
		return e.map((e) => Dc(e, Tc(e) ? i.get(e._id) : void 0, n, r));
	}
	if (!Tc(e)) return e;
	let i = Tc(t) ? t : void 0, a = {};
	for (let [t, o] of Object.entries(e)) t === "ownership" && Tc(o) ? i ? Object.hasOwn(i, t) && (a[t] = structuredClone(i[t])) : a[t] = Ec(o, n, r) : a[t] = Dc(o, i?.[t], n, r);
	return i && Object.hasOwn(i, "ownership") && (a.ownership = structuredClone(i.ownership)), a;
}
`${w}`, `${Lt}`;
//#endregion
//#region src/module/foundry/api/create-package-api.ts
function Oc() {
	return {
		radar: {
			enable: _t,
			disable: vt,
			inspect: jt
		},
		async openSampleApplication() {
			await new wc().render(!0);
		},
		openPreviewNotice() {
			console.log("Infinite Scenes API is available.");
		}
	};
}
//#endregion
//#region src/module/foundry/api/register-package-api.ts
function kc() {
	if (!game) throw Error("Foundry game global is unavailable during module API registration.");
	let e = game.modules.get(w);
	if (!e) throw Error(`Foundry module registry entry was not found for ${w}.`);
	e.api = Oc();
}
//#endregion
//#region src/module/foundry/integrations/is-module-active.ts
function Ac(e) {
	if (typeof game > "u" || !game) throw Error("Optional module integrations require an initialized Foundry game.");
	return game.modules.get(e)?.active === !0;
}
//#endregion
//#region src/module/foundry/integrations/example-health-system/register-integration.ts
var jc = "example-health-system";
function Mc() {
	Ac(jc) && console.info("Optional health-system integration enabled. Replace this example with the target module's documented API and feature registration.");
}
//#endregion
//#region src/module/foundry/compendiums/settings.ts
var Nc = "keepCompendiumsTidy";
function Pc() {
	if (!game?.user) throw Error("Foundry user is unavailable during Compendium tidy setting registration.");
	game.settings.register(w, Nc, {
		config: game.user.isGM === !0,
		default: !1,
		hint: "Restore this module's Compendium sidebar folders and pack locations when the active GM opens the world.",
		name: `Keep ${Lt} Compendiums Tidy?`,
		scope: "world",
		type: Boolean
	});
}
//#endregion
//#region src/module/foundry/compendiums/queue.ts
var Fc = /* @__PURE__ */ new WeakMap();
async function Ic(e, t) {
	let n = (Fc.get(e) ?? Promise.resolve()).catch(() => void 0).then(async () => {
		let e = globalThis.navigator?.locks;
		e ? await e.request("foundry:folder-tidy", t) : await t();
	});
	Fc.set(e, n);
	try {
		await n;
	} finally {
		Fc.get(e) === n && Fc.delete(e);
	}
}
//#endregion
//#region src/module/foundry/compendiums/merge.ts
async function Lc(e, t, n, r) {
	for (let [, n] of r.entries()) if (n.folder?.id === e.id && (await n.setFolder(t), n.folder?.id !== t.id)) throw Error(`Could not move a pack out of ${e.name}.`);
	for (let r of n.filter((t) => t.folder?.id === e.id)) if (await r.update({ folder: t.id }), r.folder?.id !== t.id) throw Error(`Could not move folder ${r.name}.`);
	if (!await e.delete({
		deleteSubfolders: !1,
		deleteContents: !1
	})) throw Error(`Could not delete empty duplicate folder ${e.name}.`);
	n.splice(n.indexOf(e), 1);
}
async function Rc(e, t, n, r) {
	for (let [e, i] of t.entries()) if (i.folder && n.has(i.folder.id) && !r.has(e) && (await i.setFolder(null), i.folder)) throw Error(`Could not move unrelated pack ${e} to the sidebar root.`);
	for (let t of e) if (t.folder && n.has(t.folder.id) && !n.has(t.id) && (await t.update({ folder: null }), t.folder)) throw Error(`Could not move unrelated folder ${t.name} to the sidebar root.`);
}
//#endregion
//#region src/module/functions/compendiums/folders.ts
function zc(e, t) {
	return t.filter((t) => t.folder?.id === e.id);
}
function Bc(e, t) {
	let n = new Set([e.id]);
	for (let r of zc(e, t)) for (let e of Bc(r, t)) n.add(e);
	return n;
}
function Vc(e, t) {
	let n = new Set(e.packs.map((e) => `${t}.${e}`));
	for (let r of e.folders) for (let e of Vc(r, t)) n.add(e);
	return n;
}
function Hc(e, t, n, r) {
	let i = Bc(e, t), a = !1;
	for (let [e, t] of n.entries()) !t.folder || !i.has(t.folder.id) || r.has(e) && (a = !0);
	return a;
}
function Uc(e) {
	let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
	function r(e, i) {
		let a = `${i}/${e.name}`;
		if (t.has(a)) throw Error(`Duplicate Compendium folder declaration: ${a}`);
		t.add(a);
		for (let t of e.packs) {
			if (n.has(t)) throw Error(`Duplicate Compendium pack declaration: ${t}`);
			n.add(t);
		}
		for (let t of e.folders) r(t, a);
	}
	for (let t of e) r(t, "");
}
//#endregion
//#region src/module/foundry/compendiums/tidy.ts
async function Wc(e, t) {
	await Ic(e, () => Gc(e, t));
}
async function Gc(e, t) {
	if (e.user.isGM !== !0 || e.user.isActiveGM !== !0) return;
	let n = e.modules.get(w);
	if (!n) throw Error(`Foundry module registry entry was not found for ${w}.`);
	let r = Array.from(n.packFolders ?? []);
	if (Uc(r), r.length === 0) return;
	for (let t of r) for (let n of Vc(t, w)) if (!e.packs.has(n)) throw Error(`Declared Compendium ${n} was not found.`);
	let i = Array.from(e.folders).filter((e) => e.type === "Compendium"), a = /* @__PURE__ */ new Set();
	async function o(n, r) {
		let s = Vc(n, w), c = i.filter((e) => e.name === n.name && !a.has(e.id) && (!r || !Bc(e, i).has(r.id))).sort((t, n) => Number(Hc(n, i, e.packs, s)) - Number(Hc(t, i, e.packs, s)) || t.id.localeCompare(n.id)), l = c.find((e) => (e.folder?.id ?? null) === (r?.id ?? null));
		if (!l) if (l = c.find((t) => Hc(t, i, e.packs, s) && (!r || !Bc(t, i).has(r.id))), l) {
			if (r && Bc(l, i).has(r.id)) throw Error(`Moving ${n.name} under ${r.name} would make a folder cycle.`);
			let e = r?.id ?? null;
			if (await l.update({ folder: e }) === void 0 && (l.folder?.id ?? null) !== e) throw Error(`Could not move Compendium folder ${n.name}; the update was not applied.`);
		} else {
			if (l = await t({
				name: n.name,
				type: "Compendium",
				folder: r?.id ?? null,
				sorting: n.sorting,
				...n.color ? { color: n.color } : {}
			}), !l) throw Error(`Could not create Compendium folder ${n.name}.`);
			i.push(l);
		}
		a.add(l.id);
		for (let t of c) if (t.id !== l.id && !((t.folder?.id ?? null) !== (r?.id ?? null) && !Hc(t, i, e.packs, s))) {
			if (Bc(t, i).has(l.id)) throw Error(`Cannot merge ancestor folder ${t.name} into its descendant.`);
			await Lc(t, l, i, e.packs);
		}
		let u = {};
		if (l.sorting !== n.sorting && (u.sorting = n.sorting), n.color !== void 0 && l.color !== n.color && (u.color = n.color), Object.keys(u).length > 0 && await l.update(u) === void 0 && (l.sorting !== n.sorting || n.color !== void 0 && l.color !== n.color)) throw Error(`Could not configure Compendium folder ${n.name}; the update was not applied.`);
		for (let t of n.packs) {
			let n = `${w}.${t}`, r = e.packs.get(n);
			if (!r) throw Error(`Declared Compendium ${n} was not found.`);
			r.folder?.id !== l.id && await r.setFolder(l);
		}
		for (let e of n.folders) await o(e, l);
	}
	for (let e of r) await o(e, null);
	let s = new Set(r.flatMap((e) => [...Vc(e, w)]));
	await Rc(i, e.packs, a, s);
}
async function Kc() {
	!game?.user.isGM || !game.user.isActiveGM || game.settings.get("infinite-scenes", "keepCompendiumsTidy") === !0 && await Wc(game, (e) => CONFIG.Folder.documentClass.create(e));
}
foundry.applications.api.ApplicationV2;
//#endregion
//#region src/module/init/register-hooks.ts
function qc() {
	It(), Hooks.once("init", kc), Hooks.once("setup", Pc), Hooks.once("ready", async () => {
		Mc();
		try {
			await Kc();
		} catch (e) {
			console.error("Compendium sidebar tidy-up failed.", e), ui.notifications.error(`${Lt}: Compendium cleanup failed and may be incomplete. See the console for details.`, {
				permanent: !0,
				console: !1
			});
		}
	});
}
//#endregion
//#region src/module/init/index.ts
qc();
//#endregion

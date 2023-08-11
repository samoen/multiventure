import type { MessageFromServer, OtherPlayerInfo } from '$lib/utils';
import { activeEnemies, addAggro, enemiesInScene } from './enemies';
import { items } from './items';
import { scenes } from './scenes';
import { activePlayers, globalFlags, playerItemStates, users, type HeroName, type Player } from './users';

export const FAKE_LATENCY = 1;

export const recentHappenings: string[] = [];

export function pushHappening(toPush: string, endSection: boolean = false) {
	recentHappenings.push(toPush);
	if (recentHappenings.length > 10) {
		recentHappenings.shift();
	}
	if (endSection) {
		recentHappenings.push('----');
	}
}

export function updateAllPlayerActions() {
	for (const allPlayer of users.values()) {
		updatePlayerActions(allPlayer)
	}
}

export function updatePlayerActions(player: Player) {
	player.sceneActions = []
	player.itemActions = []

	if (player.health < 1) {
		player.sceneActions.push({
			buttonText: 'Succumb to your wounds',
			goTo: 'dead',
		})
		return
	}

	for (const cd of playerItemStates(player)) {
		const i = items[cd.itemId]
		if (i.actions) {
			if (cd.cooldown < 1 && cd.warmup < 1) {
				i.actions(player)
			}
		}
	}

	// if (activeEnemies.some(e => e.currentScene == player.currentScene)) {
	if (enemiesInScene(player.currentScene).length) {
		player.itemActions.push(
			{
				buttonText: 'wait',
				provoke: 1,
				performAction() {
				},
			}
		)
		if(player.currentScene != 'armory'){
			return
		}
	}

	scenes.get(player.currentScene)?.actions(player)
}

export async function sendEveryoneWorld(triggeredBy: HeroName) {
	await new Promise((r) => {
		setTimeout(r, FAKE_LATENCY);
	});
	for (const user of users.values()) {
		if (user.connectionState && user.connectionState.con) {
			const toSend = buildNextMessage(user, triggeredBy);
			user.connectionState.con.enqueue(encode(`world`, toSend));
		}
	}
}

export function buildNextMessage(forPlayer: Player, triggeredBy: HeroName): MessageFromServer {

	const nextMsg: MessageFromServer = {
		triggeredBy: triggeredBy,
		yourName: forPlayer.heroName,
		yourHp: forPlayer.health,
		yourWeapon: forPlayer.inventory.weapon,
		yourUtility: forPlayer.inventory.utility,
		yourBody: forPlayer.inventory.body,
		yourScene: forPlayer.currentScene,
		otherPlayers: activePlayers()
			.filter((u) => u.heroName != forPlayer.heroName)
			.map((u) => {
				return {
					heroName: u.heroName,
					health: u.health,
					currentScene: u.currentScene
				} satisfies OtherPlayerInfo;
			}),
		sceneTexts: forPlayer.sceneTexts,
		sceneActions: forPlayer.sceneActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText,
			};
		}),
		itemActions: forPlayer.itemActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText,
			};
		}),
		happenings: recentHappenings,
		enemiesInScene: enemiesInScene(forPlayer.currentScene).map((e) => {
			return {
				health: e.currentHealth,
				name: e.name,
				myAggro: e.aggros.get(forPlayer.heroName) ?? 0,
				statuses: e.statuses,
			}
		}),
		playerFlags: Array.from(forPlayer.flags),
		globalFlags: Array.from(globalFlags),
	};
	return nextMsg;
}

const textEncoder = new TextEncoder();
export function encode(event: string, data: object, noretry: boolean = false) {
	let toEncode = `event:${event}\ndata: ${JSON.stringify(data)}\n`;
	if (noretry) {
		toEncode = toEncode + `retry: -1\n`;
	}
	toEncode = toEncode + `\n`;
	return textEncoder.encode(toEncode);
}

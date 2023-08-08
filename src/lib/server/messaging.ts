import type { MessageFromServer, OtherPlayerInfo } from '$lib/utils';
import { activeEnemies } from './enemies';
import { bodyItems, utilityItems, weapons } from './items';
import { scenes } from './scenes';
import { type HeroName, users, type Player, globalFlags, playerEquipped } from './users';

export const FAKE_LATENCY = 100;

export const recentHappenings: string[] = [];

export function pushHappening(toPush: string) {
	recentHappenings.push(toPush);
	if (recentHappenings.length > 10) {
		recentHappenings.shift();
	}
}

export function updateAllPlayerActions() {
	for (const allPlayer of users.values()) {
		updatePlayerActions(allPlayer)
	}
}

export function updatePlayerActions(player: Player) {
	player.actions = []
	scenes[player.currentScene].sceneActions(player)
	const wep = weapons[player.weapon]
	if (wep.actions) {
		if (player.weaponCooldown < 1) {
			wep.actions(player)
		}
	}
	const util = utilityItems[player.utility]
	if (util.actions) {
		if (player.utilityCooldown < 1) {
			util.actions(player)
		}
	}
	const body = bodyItems[player.body]
	if (body.actions) {
		if (player.bodyCooldown < 1) {
			body.actions(player)
		}
	}

	if (activeEnemies.some(e => e.currentScene == player.currentScene)) {
		player.actions.push(
			{
				buttonText: 'wait',
				performAction() {
				},
			}
		)
	}
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
		yourWeapon: forPlayer.weapon,
		yourUtility: forPlayer.utility,
		yourBody: forPlayer.body,
		yourScene: forPlayer.currentScene,
		otherPlayers: Array.from(users.values())
			.filter((u) => u.heroName != forPlayer.heroName && u.connectionState != null)
			.map((u) => {
				return {
					heroName: u.heroName,
					health: u.health,
					currentScene: u.currentScene
				} satisfies OtherPlayerInfo;
			}),
		sceneTexts: forPlayer.sceneTexts,
		actions: forPlayer.actions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText
			};
		}),
		happenings: recentHappenings,
		enemiesInScene: activeEnemies.filter(e => e.currentScene == forPlayer.currentScene).map((e) => {
			return {
				health: e.currentHealth,
				name: e.name,
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

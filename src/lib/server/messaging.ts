import type { MessageFromServer, OtherPlayerInfo } from '$lib/utils';
import { activeEnemies, addAggro, damagePlayer, enemiesInScene, takePoisonDamage } from './enemies';
import { items } from './items';
import { scenes } from './scenes';
import { activePlayers, globalFlags, playerItemStates, users, type HeroName, type Player, type GameAction, activePlayersInScene } from './users';

export const FAKE_LATENCY = 1;

export const recentHappenings: string[] = [];


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
				maxHealth: e.maxHealth,
				name: e.name,
				templateId: e.templateId,
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

export function pushHappening(toPush: string, endSection: boolean = false) {
	recentHappenings.push(toPush);
	if (recentHappenings.length > 30) {
		recentHappenings.shift();
	}
	if (endSection) {
		recentHappenings.push('----');
	}
}

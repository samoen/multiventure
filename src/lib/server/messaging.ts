import type { GameActionSentToClient, MessageFromServer, PlayerInClient } from '$lib/utils';
import { activeEnemies, addAggro, damagePlayer, enemiesInScene, getAggroForPlayer, takePoisonDamage } from './enemies';
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
			user.animations = []
		}
	}
}

export function buildNextMessage(forPlayer: Player, triggeredBy: HeroName): MessageFromServer {
	
	const nextMsg: MessageFromServer = {
		triggeredBy: triggeredBy,
		yourInfo:{
			heroName: forPlayer.heroName,
			health: forPlayer.health,
			maxHealth: forPlayer.maxHealth,
			weapon: forPlayer.inventory.weapon,
			utility: forPlayer.inventory.utility,
			body: forPlayer.inventory.body,
			currentScene: forPlayer.currentScene,
			statuses:forPlayer.statuses,
		},
		otherPlayers: activePlayers()
			.filter((u) => u.heroName != forPlayer.heroName)
			.map((u) => {
				return {
					heroName: u.heroName,
					health: u.health,
					maxHealth: u.maxHealth,
					weapon: u.inventory.weapon,
					utility: u.inventory.utility,
					body: u.inventory.body,
					currentScene: u.currentScene,
					statuses:u.statuses,
				} satisfies PlayerInClient;
			}),
			sceneTexts: forPlayer.sceneTexts,
			sceneActions: forPlayer.sceneActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText,
				// target:gameAction.target
			};
		}),
		itemActions: forPlayer.itemActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText,
				slot:gameAction.slot,
				target:gameAction.target,
				wait:gameAction.wait,
			} satisfies GameActionSentToClient;
		}),
		happenings: recentHappenings,
		animations: forPlayer.animations,
		enemiesInScene: enemiesInScene(forPlayer.currentScene).map((e) => {
			// console.log(`sending ${e.name} statuses ${JSON.stringify(e.statuses)}`)
			return {
				health: e.currentHealth,
				maxHealth: e.maxHealth,
				name: e.name,
				templateId: e.templateId,
				myAggro: getAggroForPlayer(e,forPlayer),
				statuses: Object.fromEntries(e.statuses),
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

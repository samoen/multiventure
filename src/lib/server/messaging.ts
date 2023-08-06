import type { MessageFromServer, OtherPlayerInfo } from '$lib/utils';
import { getAvailableActionsForPlayer } from './actions';
import { activeEnemies } from './enemies';
import { scenes } from './scenes';
import { type HeroName, users, type Player, globalFlags } from './users';

export const FAKE_LATENCY = 100;

export const recentHappenings: string[] = [];

export function pushHappening(toPush: string) {
	recentHappenings.push(toPush);
	if (recentHappenings.length > 10) {
		recentHappenings.shift();
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
	// const scene = scenes[forPlayer.currentScene];
	const sceneTexts: string[] = [];
	// sceneTexts.push(scene.mainSceneText(forPlayer,forPlayer.previousScene))
	sceneTexts.push(...forPlayer.duringSceneTexts);

	const nextMsg: MessageFromServer = {
		triggeredBy: triggeredBy,
		yourName: forPlayer.heroName,
		yourHp: forPlayer.health,
		yourInventory: forPlayer.inventory,
		yourScene: forPlayer.currentScene,
		otherPlayers: Array.from(users.values())
			.filter((u) => u.heroName != forPlayer.heroName && u.connectionState != null)
			.map((u) => {
				return {
					heroName: u.heroName,
					inventory: u.inventory,
					health: u.health,
					currentScene: u.currentScene
				} satisfies OtherPlayerInfo;
			}),
		sceneTexts: sceneTexts,
		actions: getAvailableActionsForPlayer(forPlayer).map((gameAction) => {
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
		playerFlags:Array.from(forPlayer.flags),
		globalFlags:Array.from(globalFlags),
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

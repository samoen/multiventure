import type { MsgFromServer, OtherPlayerInfo } from '$lib/utils';
import { getAvailableActionsForPlayer } from './actions';
import { scenes } from './scenes';
import { type HeroName, users, type User } from './users';

export const FAKE_LATENCY = 300;

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
			const toSend = buildNextMsg(user, triggeredBy);
			user.connectionState.con.enqueue(encode(`world`, toSend));
		}
	}
}

export function buildNextMsg(user: User, triggeredBy: HeroName): MsgFromServer {
	const scene = scenes[user.currentScene];
	const sceneTexts: string[] = [scene.text];
	sceneTexts.push(...user.extraTexts);

	const nextMsg: MsgFromServer = {
		triggeredBy: triggeredBy,
		yourName: user.heroName,
		yourHp: user.health,
		yourInventory: user.inventory,
		yourScene: user.currentScene,
		otherPlayers: Array.from(users.values())
			.filter((u) => u.heroName != user.heroName && u.connectionState != null)
			.map((u) => {
				return {
					heroName: u.heroName,
					inventory: u.inventory,
					health: u.health,
					currentScene: u.currentScene
				} satisfies OtherPlayerInfo;
			}),
		sceneTexts: sceneTexts,
		actions: getAvailableActionsForPlayer(user).map((gameAction) => {
			return {
				buttonText: gameAction.buttonText
			};
		}),
		happenings: recentHappenings
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

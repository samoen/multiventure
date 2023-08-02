import type { GameActionWithDescription, MsgFromServer, PlayerState, Scene, User } from '$lib/utils';

export const FAKE_LATENCY = 500;
export const players = new Map<string, User>();

export function sendEveryoneWorld() {
	for (const user of players.values()) {
		if (user.connectionState && user.connectionState.con) {
			let msg: MsgFromServer = {
				yourName: user.playerState.heroName,
				players: Array.from(players.values()).map((u) => {
					return u.playerState;
				}),
				sceneText: locations[user.playerState.in].text,
				actions: getAvailableActionsForPlayer(user.playerState)
			};
			user.connectionState.con.enqueue(encode(`world`, msg));
		}
	}
}

export function getAvailableActionsForPlayer(p: PlayerState): GameActionWithDescription[] {
	let res: GameActionWithDescription[] = [];
	res.push(...locations[p.in].options);
	return res;
}

const textEncoder = new TextEncoder();
export function encode(event: string, data: object) {
	return textEncoder.encode(`event:${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const locations = {
	forest: {
		text: 'you are in a forest',
		options: [
			{
				desc: 'hike to the castle',
				action: {
					go: 'castle'
				}
			}
		]
	},
	castle: {
		text: 'you are at the castle',
		options: [
			{
				desc: 'screw this go back to forest',
				action: {
					go: 'forest'
				}
			},
			{
				desc: 'yeye approach the throne',
				action: {
					go: 'throne'
				}
			}
		]
	},
	throne: {
		text: 'you are at the throne room',
		options: [
			{
				desc: 'run to the forest',
				action: {
					go: 'forest'
				}
			}
		]
	}
} as const;

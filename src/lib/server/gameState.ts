// Put things in here that should only be available to the server

import type { GameActionWithDescription, MsgFromServer, PlayerState, Scene } from '$lib/utils';

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
const textEncoder = new TextEncoder();
export function encode(event: string, data: object, noretry: boolean = false) {
	let toEncode = `event:${event}\ndata: ${JSON.stringify(data)}\n`;
	if (noretry) {
		toEncode = toEncode + `retry: 9999999\n`;
	}
	toEncode = toEncode + `\n`;

	// return textEncoder.encode(`event:${event}\ndata: ${JSON.stringify(data)}\n\n`);
	return textEncoder.encode(toEncode);
}

export function getAvailableActionsForPlayer(p: PlayerState): GameActionWithDescription[] {
	let res: GameActionWithDescription[] = [];
	const removedNeedsUnmet = locations[p.in].options.filter((o) => {
		if ('needs' in o) {
			if (!p.inventory.includes(o.needs)) {
				return false;
			}
		}
		return true;
	});
	res.push(...removedNeedsUnmet);
	return res;
}

export type User = {
	connectionState: {
		ip: string;
		con: ServerSentEventController;
		stream: ReadableStream;
	};
	playerState: PlayerState;
};

export type ServerSentEventController = ReadableStreamController<unknown>;

export const locations = {
	forest: {
		text: 'You are in the forest',
		options: [
			{
				desc: 'hike to the castle',
				action: {
					go: 'castle'
				}
			},
			{
				desc: 'use green gem to find hidden passage',
				needs: 'green gem',
				action: {
					go: 'forestPassage'
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
		text: 'You enter the throne room. The King gives you a green gem and asks you to kill a monster in the forest',
		gives: 'green gem',
		options: [
			{
				desc: 'head back to the castle',
				action: {
					go: 'castle'
				}
			}
		]
	},
	forestPassage: {
		text: 'You enter a dark passage, guided by the green gem you got from the king. good for you.',
		options: [
			{
				desc: 'get out of this dank passage it stinks',
				action: {
					go: 'forest'
				}
			}
		]
	}
} as const;

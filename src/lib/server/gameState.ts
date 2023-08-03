// Put things in here that should only be available to the server

import type {
	GameActionWithDescription,
	Item,
	ItemKey,
	MsgFromServer,
	OtherPlayerInfo,
	Scene
} from '$lib/utils';

export const FAKE_LATENCY = 300;
export const users = new Map<UserId, User>();
export const recentHappenings: string[] = [];

export type UserId = string;
export type HeroName = string;

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
	const scene = locations[user.currentScene];
	const sceneTexts: string[] = [scene.text];
	sceneTexts.push(...user.extraTexts);

	const nextMsg: MsgFromServer = {
		triggeredBy: triggeredBy,
		yourName: user.heroName,
		yourHp: user.health,
		yourInventory: user.inventory,
		yourScene:user.currentScene,
		otherPlayers: Array.from(users.values()).filter(u=>u.heroName != user.heroName && u.connectionState != null).map((u) => {
			return {
				heroName: u.heroName,
				inventory: u.inventory,
				health: u.health,
				currentScene: u.currentScene
			} satisfies OtherPlayerInfo;
		}),
		sceneTexts: sceneTexts,
		actions: getAvailableActionsForPlayer(user)
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

export function getAvailableActionsForPlayer(p: User): GameActionWithDescription[] {
	const res: GameActionWithDescription[] = [];
	const removedNeedsUnmet = locations[p.currentScene].options.filter((o) => {
		if ('needs' in o) {
			if (!p.inventory.includes(o.needs)) {
				return false;
			}
		}
		return true;
	});
	res.push(...removedNeedsUnmet);

	const playersInRoom = Array.from(users.entries())
		.filter(([id, usr]) => usr.currentScene == p.currentScene)
		.map(([id, usr]) => id);

	const usableItems = p.inventory.filter((ik) => {
		if ('onUse' in items[ik]) {
			return true;
		}
		return false;
	});
	const usableItemsActions: GameActionWithDescription[] = [];

	usableItems.forEach((ik) => {
		// const i = items[ik]
		// if("onUse" in i){
		playersInRoom.forEach((pk) => {
			let descTarget = pk;
			if (pk == p.heroName) {
				descTarget = 'self';
			}
			usableItemsActions.push({
				desc: `use ${ik} on ${descTarget}`,
				action: {
					use: ik,
					targetHero: pk
				}
			} satisfies GameActionWithDescription);
		});
		// }
	});
	res.push(...usableItemsActions);

	return res;
}

export type User = {
	connectionState: {
		ip: string;
		con: ServerSentEventController;
		stream: ReadableStream;
	};
	heroName: HeroName;
	currentScene: SceneKey;
	inventory: ItemKey[];
	health: number;
	extraTexts: string[];
};

export type ServerSentEventController = ReadableStreamController<unknown>;

export type SceneKey = 'forest' | 'castle' | 'throne' | 'forestPassage';

export type Scenes = {
	[key in SceneKey]: Scene;
};

export const locations: Scenes = {
	forest: {
		text: 'You find yourself in the forest',
		options: [
			{
				desc: 'hike to the castle',
				action: {
					go: 'castle'
				}
			},
			{
				desc: 'use green gem to find hidden passage',
				needs: 'greenGem',
				action: {
					go: 'forestPassage'
				}
			}
		]
	},
	castle: {
		text: 'You arrive at the castle',
		onEnter: (user: User) => {
			if (!user.inventory.includes('bandage')) {
				user.inventory.push('bandage');
				user.extraTexts.push('A passing soldier gives you a bandage');
			}
		},
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
		text: 'You enter the throne room',
		onEnter: (user) => {
			if (!user.inventory.includes('greenGem')) {
				user.inventory.push('greenGem');
				user.extraTexts.push('You receive a green gem useful for finding forest passages');
			}
		},
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
};

export const items = {
	greenGem: {},
	bandage: {
		onUse: (user: User, target: User) => {
			target.health += 10;
			user.inventory = user.inventory.filter((i) => i != 'bandage');
		}
	}
} as const satisfies Record<string, Item>;

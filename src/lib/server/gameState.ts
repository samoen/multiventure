// Put things in here that should only be available to the server

import type {
	ItemKey,
	MsgFromServer,
	OtherPlayerInfo,
	Scene,
	GameAction,
	PreAction,
	PreActionTargetsUsers,
	PreActionTargetsOnlySelf
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
		yourScene: user.currentScene,
		otherPlayers: Array.from(users.values()).filter(u => u.heroName != user.heroName && u.connectionState != null).map((u) => {
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
				id: gameAction.id,
				buttonText: gameAction.buttonText
			}
		})
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

export function getAvailableActionsForPlayer(p: User): GameAction[] {
	const res: GameAction[] = [];

	const onlySelfPreActions: PreActionTargetsOnlySelf[] = []
	const userTargetingPreActions: PreActionTargetsUsers[] = []

	locations[p.currentScene].options.forEach((pa) => {
		if (pa.targetKind == 'onlyself') {
			onlySelfPreActions.push(pa)
		} else if (pa.targetKind == 'usersInRoom') {
			userTargetingPreActions.push(pa)
		}
	})
	p.inventory.forEach((ik) => {
		const preAction = items[ik]
		if (preAction.targetKind == 'usersInRoom') {
			userTargetingPreActions.push(preAction)
		} else if (preAction.targetKind == 'onlyself') {
			onlySelfPreActions.push(preAction)
		}
	})

	const onlySelfActions = onlySelfPreActions
		.map((pe) => pe.generate(p))
		.filter((ga) => {
			if (ga.includeIf()) {
				return true;
			}
			return false;
		})
	res.push(...onlySelfActions);

	const userTargetingActions: GameAction[] = [];
	const usersInRoom: User[] = Array.from(users.entries())
		.filter(([id, usr]) => usr.connectionState != null && usr.currentScene == p.currentScene)
		.map(([id, usr]) => usr);

	userTargetingPreActions.forEach((prea) => {
		usersInRoom.forEach((userInRoom) => {
			const gameAction = prea.generate(p, userInRoom)
			if (gameAction.includeIf()) {
				userTargetingActions.push(gameAction);
			}
		});
	});

	res.push(...userTargetingActions);

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
export function makeTravelAction(to: SceneKey, buttonText: string, includeIf: (user) => boolean = (user) => true): PreActionTargetsOnlySelf {
	return {
		targetKind: 'onlyself',
		generate: (actor: User) => {
			return {
				id: `travelTo${to}`,
				onAct: () => {
					actor.currentScene = to
				},
				includeIf: () => {
					return includeIf(actor)
				},
				buttonText: buttonText,
			}
		}
	}
}
export const locations: Scenes = {
	forest: {
		text: 'You find yourself in the forest',
		options: [
			makeTravelAction("castle", "hike to castle"),
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
			makeTravelAction("forest", "shimmy back to forest"),
			makeTravelAction("throne", "approach the throne!"),
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
			makeTravelAction('castle', "head back to castle")
		]
	},
	forestPassage: {
		text: 'You enter a dark passage, guided by the green gem you got from the king. good for you.',
		options: [
			makeTravelAction("forest", "get out of this dank passage it stinks")
		]
	}
};

export const items: Record<string, PreAction> = {
	greenGem: makeTravelAction(
		"forestPassage",
		"use green gem",
		(user) => user.currentScene == 'forest'
	),
	bandage: {
		targetKind: 'usersInRoom',
		generate: (actor: User, target: User) => {
			return {
				id: `${actor.heroName}bandage${target.heroName}`,
				onAct: () => {
					target.health += 10;
					actor.inventory = actor.inventory.filter((i) => i != 'bandage');
				},
				buttonText: `bandage up ${target.heroName == actor.heroName ? 'self' : target.heroName}`,
				includeIf: () => {
					return true
				},
			}
		}
	}
} as const satisfies Record<string, PreAction>;

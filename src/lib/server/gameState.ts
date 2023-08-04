// Put things in here that should only be available to the server

import type {
	ItemKey,
	MsgFromServer,
	OtherPlayerInfo,
	GameAction,
	ActionGenerator,
	NearbyFriendlyActionGenerator,
	SelfActionGenerator
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
	const scene = scenes[user.currentScene];
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
		}),
		happenings:recentHappenings,
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

	const onlySelfPreActions: SelfActionGenerator[] = []
	const userTargetingPreActions: NearbyFriendlyActionGenerator[] = []

	scenes[p.currentScene].options.forEach((pa) => {
		if (pa.targetKind == 'onlySelf') {
			onlySelfPreActions.push(pa)
		} else if (pa.targetKind == 'usersInRoom') {
			userTargetingPreActions.push(pa)
		}
	})
	p.inventory.forEach((ik) => {
		const preAction = items[ik]
		if (preAction.targetKind == 'usersInRoom') {
			userTargetingPreActions.push(preAction)
		} else if (preAction.targetKind == 'onlySelf') {
			onlySelfPreActions.push(preAction)
		}
	})

	const onlySelfActions = onlySelfPreActions
		.map((pe) => pe.generate(p))
		.filter((ga) => ga)

	res.push(...onlySelfActions);

	const userTargetingActions: GameAction[] = [];
	const usersInRoom: User[] = Array.from(users.entries())
		.filter(([id, usr]) => usr.connectionState != null && usr.currentScene == p.currentScene)
		.map(([id, usr]) => usr);

	userTargetingPreActions.forEach((prea) => {
		usersInRoom.forEach((userInRoom) => {
			const gameAction = prea.generate(p, userInRoom)
			if (gameAction) {
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

export function basicTravelAction(to: SceneKey, buttonText: string): SelfActionGenerator {
	return {
		targetKind: 'onlySelf',
		generate: (actor: User) => {
			return {
				id: `travelTo${to}`,
				onAct: () => {
					actor.currentScene = to
				},
				buttonText: buttonText,
			}
		}
	}
}


export type SceneKey = 'forest' | 'castle' | 'throne' | 'forestPassage';
export type Scene = {
	text: string;
	onEnter?: (user: User) => void;
	options: ActionGenerator[];
};
export const scenes:Record<SceneKey,Scene> = {
	forest: {
		text: 'You find yourself in the forest',
		options: [
			basicTravelAction("castle", "hike to castle"),
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
			basicTravelAction("forest", "Delve back into forest"),
			basicTravelAction("throne", "Approach the throne!"),
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
			basicTravelAction('castle', "Leave the throne room")
		]
	},
	forestPassage: {
		text: 'Guided by the green gem, you enter a hidden forest passage',
		onEnter:(user) =>{
			if(!hasGotFreeWeapon.has(user.heroName)){
				user.extraTexts.push('A forest spirit asks you - would you like a sword or a bow?')
			}
		},
		options: [
			basicTravelAction("forest", "get out of this dank passage it stinks"),
			{
				targetKind:'onlySelf',
				generate:(actor)=>{
					if(hasGotFreeWeapon.has(actor.heroName)) return null
					return {
						id:'chooseBow',
						buttonText:'I am skillful, I choose the bow',
						onAct:()=>{
							actor.inventory.push('shortBow')
							hasGotFreeWeapon.add(actor.heroName)
							actor.extraTexts = []
						},
					}
				}
			},
			{
				targetKind:'onlySelf',
				generate:(actor)=>{
					if(hasGotFreeWeapon.has(actor.heroName)) return null
					return {
						id:'chooseSword',
						buttonText:'I am mighty, I will take of the sword!',
						onAct:()=>{
							actor.inventory.push('shortSword')
							hasGotFreeWeapon.add(actor.heroName)
							actor.extraTexts = []
						},
					}
				}
			},
		]
	}
};

export const hasGotFreeWeapon : Set<HeroName> = new Set()

export const items = {
	greenGem: {
		targetKind: 'onlySelf',
		generate: (actor: User) => {
			if(actor.currentScene != 'forest') return null;
			return {
				id: `goForestPassage`,
				onAct: () => {
					actor.currentScene = 'forestPassage'
				},
				buttonText: `use green gem`,
			}
		}
	},
	bandage: {
		targetKind: 'usersInRoom',
		generate: (actor: User, target: User) => {
			return {
				id: `${actor.heroName}bandage${target.heroName}`,
				onAct: () => {
					target.health += 10;
					actor.inventory = actor.inventory.filter((i) => i != 'bandage');
					pushHappening(`${actor.heroName} healed ${target.heroName == actor.heroName ? 'themself' : target.heroName} for 10hp`)
				},
				buttonText: `bandage up ${target.heroName == actor.heroName ? 'self' : target.heroName}`,
			}
		}
	},
	shortBow:{
		targetKind:'usersInRoom',
		generate(actor, target) {
			return null
		},
	},
	shortSword:{
		targetKind:'usersInRoom',
		generate(actor, target) {
			return null
		},
	},

} as const satisfies Record<string, ActionGenerator>;

export function pushHappening(toPush:string){
	recentHappenings.push(toPush)
	if(recentHappenings.length > 10){
		recentHappenings.shift()
	}
}

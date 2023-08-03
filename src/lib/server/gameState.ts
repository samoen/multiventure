// Put things in here that should only be available to the server

import type {
	Item,
	ItemKey,
	MsgFromServer,
	OtherPlayerInfo,
	Scene,
	GameAction,
	GameActionReady
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
		actions: getAvailableActionsForPlayer(user).map((readyAction)=>{
			return {
				id:readyAction.gameAction.id,
				buttonText:readyAction.gameAction.buttonText
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

export function getAvailableActionsForPlayer(p: User): GameActionReady[] {
	const res: GameActionReady[] = [];
	const actionsFromScene : GameAction[] = locations[p.currentScene].options.filter((o) => {
		if (o.includeIf(p)) {
			return true;
		}
		return false;
	})
	const readyActionsFromScene : GameActionReady[] = 
	actionsFromScene
	.map((action)=>{
		return {
			gameAction:action,
			actor:p,
			target:p
		}
	});
	res.push(...readyActionsFromScene);

	const usableItemsReadyActions: GameActionReady[] = [];

	const usersInRoom : User[] = Array.from(users.entries())
		.filter(([id, usr]) => usr.currentScene == p.currentScene)
		.map(([id, usr]) => usr);


	const usableItemsInInventory = p.inventory.filter((ik) => {
		if ('onUse' in items[ik]) {
			return true;
		}
		return false;
	});

	usableItemsInInventory.forEach((ik) => {
		usersInRoom.forEach((userInRoom) => {
			usableItemsReadyActions.push({
					gameAction:{
						id:`use${ik}on${userInRoom.heroName}`,
						buttonText: `use ${ik} on ${userInRoom.heroName == p.heroName ? 'self' : userInRoom.heroName}`,
						onAct(actor, target) {
							const item = items[ik]
							if("onUse" in item){
								item.onUse(actor,target)
							}
						},
					},
					itemKey: ik,
					actor:p,
					target: userInRoom,
			} satisfies GameActionReady);
		});
		// }
	});

	res.push(...usableItemsReadyActions);

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
export function makeTravelAction(to:SceneKey, buttonText:string, includeIf:(user:User)=>boolean = (user)=>true):GameAction{
	return {
		id:`travelTo${to}`,
		onAct:(actor:User,target:User)=>{
			actor.currentScene = to
		},
		includeIf:includeIf,
		buttonText:buttonText,
	}
}
export const locations: Scenes = {
	forest: {
		text: 'You find yourself in the forest',
		options: [
			makeTravelAction("castle","hike to castle"),
			makeTravelAction("forestPassage","go to hidden passage",(user)=>user.inventory.includes("greenGem")),
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
			makeTravelAction("forest","shimmy back to forest"),
			makeTravelAction("throne","approach the throne!"),
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
			makeTravelAction('castle',"head back to castle")
		]
	},
	forestPassage: {
		text: 'You enter a dark passage, guided by the green gem you got from the king. good for you.',
		options: [
				makeTravelAction("forest","get out of this dank passage it stinks")
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

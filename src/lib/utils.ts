// This file is for stuff available to both the server and browser

import type { HeroName, SceneKey, User, items, locations } from './server/gameState';

export type MsgFromServer = {
	triggeredBy: HeroName;
	yourName: HeroName;
	yourScene: SceneKey;
	yourHp:number;
	yourInventory:ItemKey[];
	otherPlayers: OtherPlayerInfo[];
	sceneTexts: string[];
	actions: GameActionSentToClient[];
};

export function isMsgFromServer(msg: object): msg is MsgFromServer {
	return 'yourName' in msg;
}

// Information a player receives about other players
export type OtherPlayerInfo = {
	heroName: HeroName;
	currentScene: SceneKey;
	inventory: ItemKey[];
	health: number;
};

export type ItemKey = keyof typeof items;
export type Item = {
	onUse?: (user: User, target: User) => void;
};
export type Scene = {
	text: string;
	onEnter?: (user: User) => void;
	options: GameAction[];
};

export type GameActionReady = {
	gameAction : GameAction,
	itemKey?:ItemKey,
	actor:User,
	target:User
}

export type GameAction = {
	id:string,
	onAct:((actor:User,target:User)=>void),
	buttonText:string,
	includeIf?:(user:User)=>boolean,
};

export type GameActionSelected = {
	id:string
}
export function isGameActionSelected(msg: object): msg is GameActionSelected {
	return 'id' in msg;
}

export type GameActionSentToClient = {
	id:string,
	buttonText:string,
}

export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

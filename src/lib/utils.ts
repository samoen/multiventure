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

export type Scene = {
	text: string;
	onEnter?: (user: User) => void;
	options: PreAction[];
};

export type PreActionTargetsOnlySelf = {
	targetKind: 'onlyself'
	generate:(actor:User)=>GameAction
}

export type PreActionTargetsUsers ={
	targetKind: 'usersInRoom'
	generate:(actor:User,target:User)=>GameAction
}
export type PreAction = PreActionTargetsOnlySelf | PreActionTargetsUsers

export type GameAction = {
	id:string,
	onAct:(()=>void),
	buttonText:string,
	includeIf:()=>boolean,
};

// export type ActionTarget = 'selfOnly'

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

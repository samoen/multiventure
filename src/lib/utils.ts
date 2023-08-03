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
	actions: GameActionWithDescription[];
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
	options: GameActionWithDescription[];
};

export type GameActionWithDescription = {
	desc: string;
	needs?: ItemKey;
	action: GameAction;
};

export type GameAction = Travel | UseItem;
export type Travel = {
	go: SceneKey;
};

export function isTravel(msg: object): msg is Travel {
	return 'go' in msg;
}
export type UseItem = {
	use: ItemKey;
	targetHero: HeroName;
};
export function isUseItem(msg: object): msg is UseItem {
	return 'use' in msg;
}

export function isGameAction(msg: object): msg is GameAction {
	return isTravel(msg) || isUseItem(msg);
}

export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

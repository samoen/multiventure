// This file is for stuff available to both the server and browser

import type { ItemState } from './server/items';
import type { SceneId } from './server/scenes';
import type { Flag, GlobalFlag, HeroName } from './server/users';

export type MessageFromServer = {
	triggeredBy: HeroName;
	yourName: HeroName;
	yourScene: SceneId;
	yourHp: number;
	yourWeapon: ItemState;
	yourUtility: ItemState;
	yourBody: ItemState;
	otherPlayers: OtherPlayerInfo[];
	sceneTexts: string[];
	actions: GameActionSentToClient[];
	happenings: string[];
	enemiesInScene:EnemyInClient[];
	playerFlags:Flag[];
	globalFlags:GlobalFlag[];
};

export type EnemyInClient = {
	name:string,
	health:number,
	myAggro:number,
}

export function isMsgFromServer(msg: object): msg is MessageFromServer {
	return 'yourName' in msg;
}

// Information a player receives about other players
export type OtherPlayerInfo = {
	heroName: HeroName;
	currentScene: SceneId;
	health: number;
};

export type GameActionSelected = {
	buttonText: string;
};
export function isGameActionSelected(msg: object): msg is GameActionSelected {
	return 'buttonText' in msg;
}

export type GameActionSentToClient = {
	buttonText: string;
	section: ButtonSection
};

export type ButtonSection = 'item' | 'scene' 

export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

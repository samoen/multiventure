// This file is for stuff available to both the server and browser

import type { EnemyTemplateId } from './server/enemies';
import type { ItemState, ItemStateForSlot } from './server/items';
import type { SceneId } from './server/scenes';
import type { Flag, GlobalFlag, HeroName } from './server/users';

export type MessageFromServer = {
	triggeredBy: HeroName;
	yourName: HeroName;
	yourScene: SceneId;
	yourHp: number;
	yourWeapon: ItemStateForSlot<'weapon'>;
	yourUtility: ItemStateForSlot<'utility'>;
	yourBody: ItemStateForSlot<'body'>;
	otherPlayers: OtherPlayerInfo[];
	sceneTexts: string[];
	sceneActions: GameActionSentToClient[];
	itemActions: GameActionSentToClient[];
	happenings: string[];
	enemiesInScene:EnemyInClient[];
	playerFlags:Flag[];
	globalFlags:GlobalFlag[];
};
export type EnemyStatusEffect = {
	status:'poison' | 'rage';
	counter?:number;
}

export type EnemyInClient = {
	name:string
	templateId:EnemyTemplateId
	health:number
	maxHealth:number
	myAggro:number
	statuses:EnemyStatusEffect[]
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
};


export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

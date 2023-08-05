// This file is for stuff available to both the server and browser

import type { HeroName } from './server/users';
import type { ItemKey } from './server/items';
import type { SceneKey } from './server/scenes';
import type { EnemyKey } from './server/enemies';

export type MessageFromServer = {
	triggeredBy: HeroName;
	yourName: HeroName;
	yourScene: SceneKey;
	yourHp: number;
	yourInventory: ItemKey[];
	otherPlayers: OtherPlayerInfo[];
	sceneTexts: string[];
	actions: GameActionSentToClient[];
	happenings: string[];
	enemiesInScene:EnemyInClient[];
};

export type EnemyInClient = {
	name:string,
	health:number,
}

export function isMsgFromServer(msg: object): msg is MessageFromServer {
	return 'yourName' in msg;
}

// Information a player receives about other players
export type OtherPlayerInfo = {
	heroName: HeroName;
	currentScene: SceneKey;
	inventory: ItemKey[];
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

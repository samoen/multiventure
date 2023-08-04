// This file is for stuff available to both the server and browser

import type { HeroName } from './server/users';
import type { ItemKey } from './server/items';
import type { SceneKey } from './server/scenes';

export type MsgFromServer = {
	triggeredBy: HeroName;
	yourName: HeroName;
	yourScene: SceneKey;
	yourHp: number;
	yourInventory: ItemKey[];
	otherPlayers: OtherPlayerInfo[];
	sceneTexts: string[];
	actions: GameActionSentToClient[];
	happenings: string[];
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

export type GameActionSelected = {
	id: string;
};
export function isGameActionSelected(msg: object): msg is GameActionSelected {
	return 'id' in msg;
}

export type GameActionSentToClient = {
	id: string;
	buttonText: string;
};

export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

// This file is for stuff available to both the server and browser

import type { locations } from './server/gameState';

export type MsgFromServer = {
	yourName: string;
	players: PlayerState[];
	sceneText: string;
	actions: GameActionWithDescription[];
};

export function isMsgFromServer(msg: object): msg is MsgFromServer {
	return 'yourName' in msg;
}

export type PlayerState = {
	heroName: string;
	in: LocationKey;
	inventory: Item[];
};

// type MsgFromClient = JoinGame | ChooseOption

export type LocationKey = keyof typeof locations;
export type Scene = (typeof locations)[LocationKey];
type ExtractGives<T> = T extends { gives: infer S } ? S : never;
export type Item = ExtractGives<Scene>;
// export type Scene = {
//     text:string,
//     options:GameActionWithDescription[]
// }

export type GameActionWithDescription = {
	desc: string;
	action: GameAction;
};

export type GameAction = Travel | Attack;
export type Travel = {
	go: LocationKey;
};
export function isTravel(msg: object): msg is Travel {
	return 'go' in msg;
}
export type Attack = {
	who: string;
};
export function isAttack(msg: object): msg is Attack {
	return 'who' in msg;
}

export type JoinGame = {
	join: string;
};

export function isJoin(msg: object): msg is JoinGame {
	// return msg.hasOwnProperty('join')
	return 'join' in msg;
}

// export type ChooseOption = {
// name:string,
// option:number
// }

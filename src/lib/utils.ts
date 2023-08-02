// This file is for stuff available to both the server and browser

import type { items, locations } from './server/gameState';

export type MsgFromServer = {
	yourName: string;
	players: PlayerState[];
	sceneTexts: string[];
	actions: GameActionWithDescription[];
};

export function isMsgFromServer(msg: object): msg is MsgFromServer {
	return 'yourName' in msg;
}

export type PlayerState = {
	heroName: string;
	in: LocationKey;
	inventory: ItemKey[];
	health:number;
};

// type MsgFromClient = JoinGame | ChooseOption

export type LocationKey = keyof typeof locations;
// export type Scene = (typeof locations)[LocationKey];
// type ExtractGives<T> = T extends { gives: infer S } ? S : never;
// export type Item = ExtractGives<Scene>;
export type ItemKey = keyof typeof items;
export type Item = {
	onUse? : (on:PlayerState)=>{

	}
}
export type ItemAquisition = {
	item:ItemKey,
	how:string
}
export type Scene = {
    text:string,
	gives?:ItemAquisition,
    options:GameActionWithDescription[]
}

// export type Item

export type GameActionWithDescription = {
	desc: string;
	needs?:ItemKey;
	action: GameAction;
};

export type GameAction = Travel | UseItem;
export type Travel = {
	go: LocationKey;
};
export type UseItem = {

}
export function isTravel(msg: object): msg is Travel {
	return 'go' in msg;
}
// export type Attack = {
// 	who: string;
// };
export function isGameAction(msg: object): msg is GameAction {
	return isTravel(msg);
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

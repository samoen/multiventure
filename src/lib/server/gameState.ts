// Put things in here that should only be available to the server

import type { GameActionWithDescription, MsgFromServer, PlayerState, Scene } from '$lib/utils';

export const FAKE_LATENCY = 500;
export const players = new Map<string, User>();
export const recentHappenings : string[] = [];

export function sendEveryoneWorld() {
	for (const user of players.values()) {
		if (user.connectionState && user.connectionState.con) {

			// const scene = locations[user.playerState.in];
			// const sceneTexts : string[] = [scene.text]
			// if ('gives' in scene) {
			// 	if(!user.playerState.inventory.includes(scene.gives.item)){
			// 		user.playerState.inventory.push(scene.gives.item);
			// 		sceneTexts.push(scene.gives.how)
			// 	}
			// }


			// let msg: MsgFromServer = {
			// 	yourName: user.playerState.heroName,
			// 	players: Array.from(players.values()).map((u) => {
			// 		return u.playerState;
			// 	}),
			// 	sceneTexts: sceneTexts,
			// 	actions: getAvailableActionsForPlayer(user.playerState)
			// };
			const toSend = buildNextMsg(user.playerState,user.stateWhenLastTravelled)
			user.connectionState.con.enqueue(encode(`world`, toSend));
		}
	}
}

export function buildNextMsg(playerState : PlayerState, lastTravelled : PlayerState):MsgFromServer{
	const scene = locations[playerState.in];
		const sceneTexts : string[] = [scene.text]
		if ('gives' in scene) {
			if(!lastTravelled.inventory.includes(scene.gives.item)){
				sceneTexts.push(scene.gives.how)
			}
		}

		let nextMsg: MsgFromServer = {
			yourName: playerState.heroName,
			players: Array.from(players.values()).map((u) => {
				return u.playerState;
			}),
			sceneTexts: sceneTexts,
			actions: getAvailableActionsForPlayer(playerState)
		};
		return nextMsg
}

const textEncoder = new TextEncoder();
export function encode(event: string, data: object, noretry: boolean = false) {
	let toEncode = `event:${event}\ndata: ${JSON.stringify(data)}\n`;
	if (noretry) {
		toEncode = toEncode + `retry: 9999999\n`;
	}
	toEncode = toEncode + `\n`;

	// return textEncoder.encode(`event:${event}\ndata: ${JSON.stringify(data)}\n\n`);
	return textEncoder.encode(toEncode);
}

export function getAvailableActionsForPlayer(p: PlayerState): GameActionWithDescription[] {
	let res: GameActionWithDescription[] = [];
	const removedNeedsUnmet = locations[p.in].options.filter((o) => {
		if ('needs' in o) {
			if (!p.inventory.includes(o.needs)) {
				return false;
			}
		}
		return true;
	});
	res.push(...removedNeedsUnmet);
	
	const playersInRoom =  Array.from(players.entries()).filter(([id,usr])=>
	usr.playerState.in == p.in
	).map(([id,usr])=>id)
	
	const usableItems = p.inventory.filter((ik)=>{
		if("onUse" in items[ik]){
			return true
		}
		return false
	})
	const usableItemsActions : GameActionWithDescription[] = []
	
	usableItems.forEach((ik)=>{
		// const i = items[ik]
		// if("onUse" in i){
			playersInRoom.forEach((pk)=>{
				usableItemsActions.push( {
					desc: `use ${ik} on ${pk}`,
					action:{
						use:ik,
						targetHero:pk
					}
				} satisfies GameActionWithDescription)
			})
		// }
	})
	res.push(...usableItemsActions);
	
	return res;
}

export type User = {
	connectionState: {
		ip: string;
		con: ServerSentEventController;
		stream: ReadableStream;
	};
	playerState: PlayerState;
	// nextMsg : MsgFromServer;
	stateWhenLastTravelled : PlayerState;
};

export type ServerSentEventController = ReadableStreamController<unknown>;

export const locations : Record<string,Scene> = {
	forest: {
		text: 'You find yourself in the forest',
		options: [
			{
				desc: 'hike to the castle',
				action: {
					go: 'castle'
				}
			},
			{
				desc: 'use green gem to find hidden passage',
				needs: 'greenGem',
				action: {
					go: 'forestPassage'
				}
			}
		]
	},
	castle: {
		text: 'You arrive at the castle',
		gives: {
			item:'bandage',
			how:'A passing soldier gives you a bandage.'
		},
		options: [
			{
				desc: 'screw this go back to forest',
				action: {
					go: 'forest'
				}
			},
			{
				desc: 'yeye approach the throne',
				action: {
					go: 'throne'
				}
			}
		]
	},
	throne: {
		text: 'You enter the throne room',
		gives: {
			item:'greenGem',
			how:'The king gives you a green gem useful for finding forest passages'
		},
		options: [
			{
				desc: 'head back to the castle',
				action: {
					go: 'castle'
				}
			}
		]
	},
	forestPassage: {
		text: 'You enter a dark passage, guided by the green gem you got from the king. good for you.',
		options: [
			{
				desc: 'get out of this dank passage it stinks',
				action: {
					go: 'forest'
				}
			}
		]
	}
} satisfies Record<string,Scene>;

export const items = {
	greenGem:{},
	bandage:{
		onUse(p:PlayerState){
			p.health += 10;
		}
	}
}
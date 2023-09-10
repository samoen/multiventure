import type { GameActionSentToClient, BattleAnimation, EnemyInClient, LandscapeImage, StatusId, HeroId, AggroInClient, EnemyStatusInClient } from '$lib/utils';
import { activeEnemies, addAggro, damagePlayer, enemiesInScene, getAggroForPlayer, takePoisonDamage } from './enemies';
import { comboFindClassFromInventory, items } from './items';
import { type VisualActionSourceInClient, convertServerActionToClientAction, convertVasToClient } from './logic';
import {  forest, getSceneData } from './scenes';
import { activePlayers, globalFlags, users, type HeroName, type Player, type GameAction, type PlayerInClient, type Flag, type GlobalFlag, activePlayersInScene } from './users';

export const FAKE_LATENCY = 50;

export const recentHappenings: string[] = [];

export type MessageFromServer = {
	triggeredBy: HeroName;
	yourInfo:PlayerInClient;
	otherPlayers: PlayerInClient[];
	userList:HeroName[];
	sceneTexts: string[];
	sceneActions: GameActionSentToClient[];
	itemActions: GameActionSentToClient[];
	happenings: string[];
	animations: BattleAnimation[];
	enemiesInScene: EnemyInClient[];
	playerFlags: Flag[];
	globalFlags: GlobalFlag[];
	visualActionSources: VisualActionSourceInClient[];
	landscape:LandscapeImage;
};


export async function sendEveryoneWorld(triggeredBy: HeroName) {
	await new Promise((r) => {
		setTimeout(r, FAKE_LATENCY);
	});
	for (const user of users.values()) {
		if (user.heroName != triggeredBy && user.connectionState.stream && user.connectionState.con) {
			const toSend = buildNextMessage(user, triggeredBy);
			let fail = false
			try{
				user.connectionState.con.enqueue(encode(`world`, toSend));
			}catch(e){
				console.log(user.heroName + ' failed to enqeue ' + e)
				fail = true
			}
			if(fail){
				try{
					user.connectionState.con?.close()
				}catch(e){
					console.log('failed to enque and failed to close!')
				}
				try{
					// user.connectionState.stream?.cancel()
				}catch(e){
					console.log('failed to enque and failed to cancel stream!')
				}
				user.connectionState.con = undefined
				user.connectionState.stream = undefined
			}
			user.animations = []
		}
	}
}

export function buildNextMessage(forPlayer: Player, triggeredBy: HeroName): MessageFromServer {
	// console.log(`sending anims ${JSON.stringify(forPlayer.animations)}`)
	// for (const p of activePlayers()){
	// 	console.log(`${p.heroName} is at ${JSON.stringify(p.currentUniqueSceneId)}`)
	// }
	// console.log(activePlayersInScene2(forPlayer.currentUniqueSceneId).length)
	let scene = getSceneData(forPlayer)
	const nextMsg: MessageFromServer = {
		triggeredBy: triggeredBy,
		landscape: scene.landscape ?? 'plains',
		yourInfo:{
			unitId:forPlayer.unitId,
			heroName: forPlayer.heroName,
			health: forPlayer.health,
			maxHealth: forPlayer.maxHealth,
			agility: forPlayer.agility,
			strength: forPlayer.strength,
			inventory:forPlayer.inventory,
			currentSceneDisplay: scene.displayName,
			statuses:forPlayer.statuses,
			class:comboFindClassFromInventory(forPlayer.inventory)
		},
		otherPlayers: activePlayersInScene(forPlayer.currentUniqueSceneId)
			.filter((u) => u.unitId != forPlayer.unitId)
			.map((u) => {
				return {
					unitId:u.unitId,
					heroName: u.heroName,
					health: u.health,
					maxHealth: u.maxHealth,
					agility:u.agility,
					strength:u.strength,
					inventory:u.inventory,
					currentSceneDisplay: 'somewhere',
					statuses:u.statuses,
					class:comboFindClassFromInventory(u.inventory)
				} satisfies PlayerInClient;
			}),
			sceneTexts: forPlayer.sceneTexts,
			sceneActions: forPlayer.sceneActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText,
				// target:gameAction.target
			};
		}),
		userList:activePlayers().map(u=>u.heroName),
		itemActions: forPlayer.itemActions.map((gameAction) => convertServerActionToClientAction(gameAction)),
		// visualActionSources:[],
		visualActionSources:forPlayer.visualActionSources.map(s=>{
			return convertVasToClient(s,forPlayer)
		}),
		happenings: recentHappenings,
		animations: forPlayer.animations,
		enemiesInScene: enemiesInScene(forPlayer.currentUniqueSceneId).map((e) => {
			// console.log(`sending ${e.name} statuses ${JSON.stringify(e.statuses)}`)
			let aggros : AggroInClient[] = []
			for (let [k,v] of e.aggros){
				aggros.push({
					agg:v,
					hId:k,
				})
			}

			let statusesInClient : EnemyStatusInClient[] = []
			for (let [k,v] of e.statuses){
				for(let [k2,v2] of v){
					statusesInClient.push({
						hId:k,
						count:v2,
						statusId:k2,
					})
				}
			}

			return {
				unitId:e.unitId,
				health: e.currentHealth,
				maxHealth: e.maxHealth,
				name: e.name,
				templateId: e.templateId,
				template:e.template,
				myAggro: getAggroForPlayer(e,forPlayer),
				aggros: aggros,
				statuses: statusesInClient,
			} satisfies EnemyInClient
		}),
		playerFlags: Array.from(forPlayer.flags),
		globalFlags: Array.from(globalFlags),
	};
	// console.log('sending vases '+JSON.stringify(nextMsg.visualActionSources.at(0)))
	return nextMsg;
}


const textEncoder = new TextEncoder();
export function encode(event: string, data: object, noretry: boolean = false) {
	let toEncode = `event:${event}\ndata: ${JSON.stringify(data)}\n`;
	if (noretry) {
		toEncode = toEncode + `retry: -1\n`;
	}
	toEncode = toEncode + `\n`;
	return textEncoder.encode(toEncode);
}

export function pushHappening(toPush: string, endSection: boolean = false) {
	recentHappenings.push(toPush);
	if (recentHappenings.length > 30) {
		recentHappenings.shift();
	}
	if (endSection) {
		recentHappenings.push('----');
	}
}

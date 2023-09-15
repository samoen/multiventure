import type {
	AggroInClient,
	BattleAnimation,
	BattleEventEntity,
	EnemyInClient,
	EnemyStatusInClient,
	GameActionSentToClient,
	HeroId,
	LandscapeImage,
	StatusState
} from '$lib/utils';
import { enemiesInScene, getAggroForPlayer } from './enemies';
import { comboFindClassFromInventory } from './items';
import {
	convertServerActionToClientAction,
	convertVasToClient,
	immuneDueToStatus,
	type VisualActionSourceInClient
} from './logic';
import { getSceneData } from './scenes';
import type { StatusId } from './statuses';
import {
	activePlayers,
	activePlayersInScene,
	globalFlags,
	users,
	type Flag,
	type GlobalFlag,
	type HeroName,
	type Player,
	type PlayerInClient
} from './users';

export const FAKE_LATENCY = 50;

export const recentHappenings: string[] = [];

export type MessageFromServer = {
	triggeredBy: HeroId;
	yourInfo: PlayerInClient;
	otherPlayers: PlayerInClient[];
	userList: HeroName[];
	sceneTexts: string[];
	devActions: GameActionSentToClient[];
	itemActions: GameActionSentToClient[];
	vasActions: GameActionSentToClient[];
	happenings: string[];
	animations: BattleAnimation[];
	enemiesInScene: EnemyInClient[];
	playerFlags: Flag[];
	globalFlags: GlobalFlag[];
	visualActionSources: VisualActionSourceInClient[];
	landscape: LandscapeImage;
};

export async function sendEveryoneWorld(triggeredBy: HeroId) {
	await new Promise((r) => {
		setTimeout(r, FAKE_LATENCY);
	});
	for (const user of users.values()) {
		if (user.unitId != triggeredBy && user.connectionState.stream && user.connectionState.con) {
			const toSend = buildNextMessage(user, triggeredBy);
			let fail = false;
			try {
				user.connectionState.con.enqueue(encode(`world`, toSend));
			} catch (e) {
				console.log(user.displayName + ' failed to enqeue ' + e);
				fail = true;
			}
			if (fail) {
				try {
					user.connectionState.con?.close();
				} catch (e) {
					console.log('failed to enque and failed to close!');
				}
				try {
					// user.connectionState.stream?.cancel()
				} catch (e) {
					console.log('failed to enque and failed to cancel stream!');
				}
				user.connectionState.con = undefined;
				user.connectionState.stream = undefined;
			}
			user.animations = [];
		}
	}
}

export function statusMapToStatusInClients(s: Map<StatusId, number>): StatusState[] {
	const result: StatusState[] = [];
	for (const [k, v] of s) {
		result.push({ statusId: k, count: v });
	}
	return result;
}

export function buildNextMessage(forPlayer: Player, triggeredBy: HeroId): MessageFromServer {
	// console.log(`sending anims ${JSON.stringify(forPlayer.animations)}`)
	// for (const p of activePlayers()){
	// 	console.log(`${p.heroName} is at ${JSON.stringify(p.currentUniqueSceneId)}`)
	// }
	// console.log(activePlayersInScene2(forPlayer.currentUniqueSceneId).length)
	const scene = getSceneData(forPlayer);
	const nextMsg: MessageFromServer = {
		triggeredBy: triggeredBy,
		landscape: scene.landscape ?? 'plains',
		yourInfo: {
			unitId: forPlayer.unitId,
			displayName: forPlayer.displayName,
			health: forPlayer.health,
			maxHealth: forPlayer.maxHealth,
			agility: forPlayer.agility,
			strength: forPlayer.strength,
			bonusStats:forPlayer.bonusStats,
			inventory: forPlayer.inventory,
			currentSceneDisplay: scene.displayName,
			statuses: statusMapToStatusInClients(forPlayer.statuses),
			class: comboFindClassFromInventory(forPlayer.inventory)
		},
		otherPlayers: activePlayersInScene(forPlayer.currentUniqueSceneId)
			.filter((u) => u.unitId != forPlayer.unitId)
			.map((u) => {
				return {
					unitId: u.unitId,
					displayName: u.displayName,
					health: u.health,
					maxHealth: u.maxHealth,
					agility: u.agility,
					strength: u.strength,
					bonusStats:u.bonusStats,
					inventory: u.inventory,
					currentSceneDisplay: 'somewhere',
					statuses: statusMapToStatusInClients(u.statuses),
					class: comboFindClassFromInventory(u.inventory)
				} satisfies PlayerInClient;
			}),
		sceneTexts: forPlayer.sceneTexts,
		devActions: forPlayer.devActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText
			};
		}),
		userList: activePlayers().map((u) => u.displayName),
		itemActions: forPlayer.itemActions.map((gameAction) =>
			convertServerActionToClientAction(gameAction)
		),
		vasActions: forPlayer.vasActions,
		visualActionSources: forPlayer.visualActionSources.map((s) => {
			return convertVasToClient(s, forPlayer);
		}),
		happenings: recentHappenings,
		animations: forPlayer.animations,
		enemiesInScene: enemiesInScene(forPlayer.currentUniqueSceneId).map((e) => {
			const aggros: AggroInClient[] = [];
			for (const [k, v] of e.aggros) {
				aggros.push({
					agg: v,
					hId: k
				});
			}

			const statusesInClient: EnemyStatusInClient[] = [];
			for (const [k, v] of e.statuses) {
				const sInCs = statusMapToStatusInClients(v);
				for (const cs of sInCs) {
					statusesInClient.push({
						hId: k,
						...cs
					} satisfies EnemyStatusInClient);
				}
			}

			return {
				unitId: e.unitId,
				health: e.health,
				maxHealth: e.maxHealth,
				displayName: e.displayName,
				templateId: e.templateId,
				template: e.template,
				myAggro: getAggroForPlayer(e, forPlayer),
				aggros: aggros,
				statuses: statusesInClient
			} satisfies EnemyInClient;
		}),
		playerFlags: Array.from(forPlayer.flags),
		globalFlags: Array.from(globalFlags)
	};
	// console.log('sending vases '+JSON.stringify(nextMsg.visualActionSources.at(0)))
	return nextMsg;
}

const textEncoder = new TextEncoder();
export function encode(event: string, data: object, noretry = false) {
	let toEncode = `event:${event}\ndata: ${JSON.stringify(data)}\n`;
	if (noretry) {
		toEncode = toEncode + `retry: -1\n`;
	}
	toEncode = toEncode + `\n`;
	return textEncoder.encode(toEncode);
}

export function pushHappening(toPush: string, endSection = false) {
	recentHappenings.push(toPush);
	if (recentHappenings.length > 30) {
		recentHappenings.shift();
	}
	if (endSection) {
		recentHappenings.push('----');
	}
}

// This file is for stuff available to both the server and browser

import type { EnemyTemplateId } from './server/enemies';
import type { EquipmentSlot, ItemState, ItemStateForSlot } from './server/items';
import type { SceneId } from './server/scenes';
import type { Flag, GlobalFlag, HeroName } from './server/users';

export type MessageFromServer = {
	triggeredBy: HeroName;
	yourInfo:PlayerInClient;
	otherPlayers: PlayerInClient[];
	sceneTexts: string[];
	sceneActions: GameActionSentToClient[];
	itemActions: GameActionSentToClient[];
	happenings: string[];
	animations: BattleAnimation[];
	enemiesInScene: EnemyInClient[];
	playerFlags: Flag[];
	globalFlags: GlobalFlag[];
};

export type AnimationTarget = {
	name: HeroName,
	side: 'hero'
} | {
	name: EnemyName,
	side: 'enemy'
}

export type BattleAnimation = {
	source: AnimationTarget,
	target?: AnimationTarget,
	putsStatusOnTarget?:StatusId,
	damage: number,
	behavior: AnimationBehavior,
	extraSprite?: ExtraSprite,
	alsoDamages?:{target:AnimationTarget,amount:number}[],
	alsoModifiesAggro?:{
		target:AnimationTarget,
		amount?:number,
		setTo?:number,
		showFor:'onlyme' | 'all'
	}[],
}

export type ExtraSprite = 'arrow' | 'bomb' | 'flame' | 'poison'

export type AnimationBehavior = 'missile' | 'melee' | 'center' | 'selfInflicted'

export type StatusId = 'poison' | 'rage'

export type StatusEffect = {
	status: StatusId;
	counter?: number;
}

export type EnemyInClient = {
	name: EnemyName
	templateId: EnemyTemplateId
	health: number
	maxHealth: number
	myAggro: number
	// statuses: Map<HeroName,Record<StatusId,number>>
	statuses: Record<HeroName,Record<StatusId,number>>
}

export function isMsgFromServer(msg: object): msg is MessageFromServer {
	return 'triggeredBy' in msg;
}

// Information a player receives about other players
export type PlayerInClient = {
	heroName: HeroName;
	currentScene: SceneId;
	health: number;
	maxHealth: number;
	weapon: ItemStateForSlot<'weapon'>
	utility: ItemStateForSlot<'utility'>
	body: ItemStateForSlot<'body'>
	statuses:Record<StatusId,number>
};

export type GameActionSelected = {
	buttonText: string;
};
export function isGameActionSelected(msg: object): msg is GameActionSelected {
	return 'buttonText' in msg;
}

export type GameActionSentToClient = {
	buttonText: string;
	slot?:EquipmentSlot;
	target?: AnimationTarget;
	wait?:boolean;
};

export type EnemyName = string


export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

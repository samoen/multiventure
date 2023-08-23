// This file is for stuff available to both the server and browser

import type { ActiveEnemy, EnemyTemplateId } from './server/enemies';
import type { EquipmentSlot, ItemState, ItemStateForSlot } from './server/items';
import type { SceneId } from './server/scenes';
import type { Flag, GlobalFlag, HeroName, Player } from './server/users';


export type UnitId = `hero${string}` | `enemy${string}`

export type BattleAnimation = {
	source: UnitId,
	damageToSource?: number,
	target?: UnitId,
	damageToTarget?: number,
	putsStatuses?:StatusModifier[]
	behavior: AnimationBehavior,
	extraSprite?: ExtraSprite,
	alsoDamages?:HealthModifier[],
	alsoModifiesAggro?:AggroModifier[],
}

export type BattleEvent = {
	sourcePlayer?: Player,
	sourceEnemy?: ActiveEnemy,
	targetEnemy?: ActiveEnemy,
	targetPlayer?: Player,
	baseHealingToSource?: number,
	baseHealingToTarget?: number,
	baseDamageToTarget?:number,
	strikes?:number,
	// putsStatuses?:StatusModifier[]
	putsStatuses?:StatusModifierEvent[]
	behavior: AnimationBehavior,
	extraSprite?: ExtraSprite,
	alsoDamages?:HealthModifierEvent[],
	alsoModifiesAggro?:AggroModifier[],
}

export type StatusModifier = {target:UnitId, status:StatusId, remove?:boolean, count?:number}
export type StatusModifierEvent = {targetPlayer?:Player, targetEnemy?:ActiveEnemy, status:StatusId, remove?:boolean, count?:number}
export type HealthModifier = {target:UnitId,amount:number}
export type HealthModifierEvent = {targetPlayer?:Player,targetEnemy?:ActiveEnemy,baseDamage?:number,baseHeal?:number}
export type AggroModifier = {
	target:UnitId,
	amount?:number,
	setTo?:number,
	showFor:'onlyme' | 'all'
}

export type ExtraSprite = 'arrow' | 'bomb' | 'flame' | 'poison' | 'smoke' | 'shield'

export type AnimationBehavior = 'missile' | 'melee' | 'center' | 'selfInflicted'

export type StatusId = 'poison' | 'rage' | 'hidden'

export type StatusEffect = {
	status: StatusId;
	counter?: number;
}

export type EnemyInClient = {
	unitId:UnitId
	name: EnemyName
	templateId: EnemyTemplateId
	health: number
	maxHealth: number
	myAggro: number
	// statuses: Map<HeroName,Record<StatusId,number>>
	statuses: Record<UnitId,Record<StatusId,number>>
}




export type GameActionSelected = {
	buttonText: string;
};
export function isGameActionSelected(msg: object): msg is GameActionSelected {
	return 'buttonText' in msg;
}

export type GameActionSentToClient = {
	buttonText: string;
	slot?:EquipmentSlot;
	target?: UnitId;
	wait?:boolean;
};

export type EnemyName = string


export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

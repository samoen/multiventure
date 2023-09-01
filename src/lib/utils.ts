// This file is for stuff available to both the server and browser

import type { ActiveEnemy, EnemyTemplateId } from './server/enemies';
import type { EquipmentSlot, Item, ItemId, ItemState } from './server/items';
import type { SceneId } from './server/scenes';
import type { Flag, GlobalFlag, HeroName, Player } from './server/users';


export type UnitId = HeroId | EnemyId | VisualActionSourceId
export type HeroId = `hero${string}`  
export type EnemyId = `enemy${string}`
export type VisualActionSourceId = `vas${string}`

export type BattleAnimation = {
	source: UnitId,
	damageToSource?: number,
	target?: UnitId,
	damageToTarget?: number,
	putsStatuses?:StatusModifier[]
	behavior: AnimationBehavior,
	alsoDamages?:HealthModifier[],
	alsoModifiesAggro?:AggroModifier[],
	takesItem?:{slot:EquipmentSlot,id:ItemId},
}

export type DataFirstLoad = {
	cookieMissing?:boolean,
	noPlayer?:boolean,
	yourHeroCookie?:string,
	noMatch?:boolean,
	readyToSubscribe?:boolean,
	userId?:string,
}

export type BattleEvent = {
	source:{kind:'player',entity:Player}|{kind:'enemy',entity:ActiveEnemy}
	target?:{kind:'player',entity:Player}|{kind:'enemy',entity:ActiveEnemy}|{kind:'vas',entity:{unitId:VisualActionSourceId}}
	baseHealingToSource?: number,
	baseHealingToTarget?: number,
	baseDamageToTarget?:number,
	strikes?:number,
	putsStatuses?:StatusModifierEvent[]
	behavior: AnimationBehavior,
	alsoDamages?:HealthModifierEvent[],
	alsoModifiesAggro?:AggroModifierEvent[],
	takesItem?:Item,
	succumb?:boolean,
}

export type StatusModifier = {target:UnitId, status:StatusId, remove?:boolean, count?:number}
export type StatusModifierEvent = {targetPlayer?:Player, targetEnemy?:ActiveEnemy, status:StatusId, remove?:boolean, count?:number}
export type HealthModifier = {target:UnitId,amount:number}
export type HealthModifierEvent = {targetPlayer?:Player,targetEnemy?:ActiveEnemy,baseDamage?:number,baseHeal?:number}
export type AggroModifier = {
	target:UnitId,
	amount?:number,
	setTo?:number,
	forHeros:HeroId[]
}
export type AggroModifierEvent = {
	targetEnemy:ActiveEnemy,
	baseAmount?:number,
	setTo?:number,
	forHeros: Player[]
}

export type AnySprite = 
| 'castle' 
| 'general' 
| 'druid' 
| 'lady' 
| 'necromancer' 
| 'arrow' 
| 'bomb' 
| 'flame' 
| 'heal' 
| 'poison' 
| 'smoke' 
| 'shield' 
| 'club'
| 'armorStand'

export type LandscapeImage = 'plains' | 'castle' | 'bridge' | 'grimForest'

export type AnimationBehavior = 
	| {kind:'missile', extraSprite:AnySprite} 
	| {kind: 'melee'} 
	| {kind: 'travel', goTo:SceneId} 
	| {kind: 'center', extraSprite:AnySprite} 
	| {kind: 'selfInflicted', extraSprite:AnySprite}

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
};

export type EnemyName = string


export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: object): msg is JoinGame {
	return 'join' in msg;
}

// This file is for stuff available to both the server and browser

import type { ActiveEnemy, EnemyTemplate, EnemyTemplateId } from './server/enemies';
import type { ItemId } from './server/items';
import type { SceneDataId } from './server/scenes';
import type { HeroName, Player } from './server/users';


export type UnitId = HeroId | EnemyId | VisualActionSourceId
export type HeroId = `hero${string}`  
export type EnemyId = `enemy${string}`
export type VisualActionSourceId = `vas${string}`

export type BattleAnimation = {
	triggeredBy:HeroId,
	source: UnitId,
	damageToSource?: number,
	target?: UnitId,
	damageToTarget?: number,
	strikes?:number,
	putsStatuses?:StatusModifier[]
	behavior: AnimationBehavior,
	alsoDamages?:HealthModifier[],
	alsoModifiesAggro?:AggroModifier[],
	takesItem?:boolean,
	teleporting?:boolean,
}

export type DataFirstLoad = {
	cookieMissing?:boolean,
	noPlayer?:boolean,
	yourHeroCookie?:string,
	noMatch?:boolean,
	readyToSubscribe?:boolean,
	userId?:string,
}

export type SignupResponse = {
	alreadyConnected: boolean,
	yourHeroName: string,
	yourId:string,
	needsAuth:string,
}
export function isSignupResponse(r:any): r is SignupResponse{
   if(typeof r != 'object')return false
   if(!('alreadyConnected' in r))return false
   if(!('yourHeroName' in r))return false
   if(!('yourId' in r))return false
   if(!('needsAuth' in r))return false
   return true
}

export type BattleEventEntity = {kind:'player',entity:Player}|{kind:'enemy',entity:ActiveEnemy}

export type BattleEvent = {
	source: BattleEventEntity
	target?:BattleEventEntity
	baseHealingToSource?: number,
	baseHealingToTarget?: number,
	baseDamageToTarget?:number,
	strikes?:number,
	putsStatuses?:StatusModifierEvent[]
	behavior: AnimationBehavior,
	alsoDamages?:HealthModifierEvent[],
	alsoModifiesAggro?:AggroModifierEvent[],
	teleportsTo?:SceneDataId,
}

export type StatusMod = {statusId:StatusId, remove?:boolean, count?:number}

export type StatusModifier = {target:UnitId} & StatusMod
export type StatusModifierEvent = {targetPlayer?:Player, targetEnemy?:ActiveEnemy,} & StatusMod
export type HealthModifier = {target:UnitId,amount:number}
export type HealthModifierEvent = {targetPlayer?:Player,targetEnemy?:ActiveEnemy,baseDamage?:number,baseHeal?:number}
export type AggroModifier = {
	target:EnemyId,
	amount:number,
	forHeros:HeroId[]
}
export type AggroModifierEvent = {
	targetEnemy:ActiveEnemy,
	baseAmount:number,
	forHeros: Player[]
}

export type AnySprite = 
| 'castle' 
| 'forest'
| 'stoneDoor'
| 'temple'
| 'portal'
| 'signpost'
| 'general' 
| 'spectre' 
| 'druid' 
| 'lady' 
| 'necromancer' 
| 'arrow' 
| 'bomb'
| 'bombPadded'
| 'potion'
| 'staff'
| 'dagger'
| 'altar'
| 'flame' 
| 'heal' 
| 'poison' 
| 'smoke' 
| 'shield'
| 'skull'
| 'club'
| 'box'
| 'whiteRing'
| 'scarecrow'
| 'bag'
| 'armorStand'

export type LandscapeImage = 'plains' | 'castle' | 'bridge' | 'grimForest'

export type AnimationBehavior = 
	| {kind:'missile', extraSprite:AnySprite} 
	| {kind: 'melee'} 
	| {kind: 'travel'} 
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
	template:EnemyTemplate
	aggros:AggroInClient[]
	statuses: EnemyStatusInClient[]
}

export type EnemyStatusInClient = {hId:HeroId,statusId:StatusId,count:number}
export type AggroInClient = {hId:HeroId,agg:number}

export type GameActionSelected = {
	buttonText: string;
};
export function isGameActionSelected(msg: object): msg is GameActionSelected {
	return 'buttonText' in msg;
}

export type GameActionSentToClient = {
	buttonText: string;
	itemId?:ItemId;
	target?: UnitId;
	vasId?: VisualActionSourceId;
};

export type EnemyName = string


export type JoinGame = {
	join: HeroName;
};

export function isJoin(msg: any): msg is JoinGame {
	if(((typeof msg) === 'object') && msg){
		if('join' in msg){
			if((typeof msg.join) === 'string'){
				if(msg.join.length > 0){
					return true
				}
			}
		}
	}
	return false;
}

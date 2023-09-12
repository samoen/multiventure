import type { AnimationBehavior, BattleAnimation, BattleEventEntity, EnemyId, EnemyName, HeroId, StatusId, StatusMod } from "$lib/utils";
import { v4 } from "uuid";
import { deepEqual, type EnemyForSpawning } from "./logic";
import { pushHappening } from "./messaging";
import { scenesData, type UniqueSceneIdenfitier } from "./scenes";
import { activePlayersInScene, type Player } from "./users";


export const activeEnemies: ActiveEnemy[] = []

export type ActiveEnemy = {
	unitId: EnemyId
	name: EnemyName
	templateId: EnemyTemplateId
	currentUniqueSceneId:UniqueSceneIdenfitier
	health: number
	maxHealth: number
	damage: number
	aggros: Map<HeroId, number>
	template: EnemyTemplate
	statuses: EnemyStatuses
}

export function getAggroForPlayer(enemy: ActiveEnemy, player: Player): number {
	let existing = enemy.aggros.get(player.unitId)
	if (existing == undefined) {
		enemy.aggros.set(player.unitId, enemy.template.startAggro)
		existing = enemy.template.startAggro
	}
	return existing
}

export type EnemyTemplate = {
	portrait?:string
	strikes?: number
	baseHealth: number
	baseDamage: number
	behavior?: AnimationBehavior
	randomTarget?:boolean
	putsStatusOnTarget?:StatusMod
	aggroGain: number
	startAggro: number
	speed: number
	damageLimit?:number
	damageReduction?:number
};

export type EnemyTemplateId =
	| 'rat'
	| 'goblin'
	| 'darter'
	| 'orc'
	| 'fireGremlin'
	| 'troll';

export const enemyTemplates: Record<EnemyTemplateId, EnemyTemplate> = {
	rat: {
		strikes: 2,
		baseHealth: 5,
		baseDamage: 10,
		aggroGain: 10,
		startAggro: 70,
		speed: 3,
	},
	goblin: {
		baseHealth: 50,
		baseDamage: 20,
		aggroGain: 80,
		startAggro: 20,
		damageReduction: 2,
		speed: 4,
	},
	darter: {
		baseHealth: 50,
		baseDamage: 2,
		aggroGain: 10,
		startAggro: 10,
		speed: 4,
		behavior:{kind:'missile',extraSprite:'arrow'},
		putsStatusOnTarget:{statusId:'poison',count:3},
	},
	orc: {
		portrait:'grunt',
		baseHealth: 50,
		baseDamage: 10,
		aggroGain: 30,
		startAggro: 0,
		speed: 4,
		damageLimit:10,
	},
	fireGremlin: {
		baseHealth: 10,
		baseDamage: 10,
		aggroGain: 50,
		startAggro: 100,
		speed: 10,
		behavior:{kind:'missile',extraSprite:'flame'},
		randomTarget:true,
	},
	troll: {
		baseHealth: 150,
		baseDamage: 50,
		aggroGain: 1,
		startAggro: 0,
		speed: 1,
	}
};

export const PERCENT_OF_BASE_ADDED_PER_PLAYER = 0.5

export function modifiedEnemyHealth(baseHealth: number, numPlayers:number): number {
	if (numPlayers < 2) return baseHealth
	return baseHealth + Math.floor(((numPlayers - 1) * PERCENT_OF_BASE_ADDED_PER_PLAYER * baseHealth))
}

export function spawnEnemy(
	eFs : EnemyForSpawning,
	where2:UniqueSceneIdenfitier,
	triggeredBy:HeroId
	) {

	let template = enemyTemplates[eFs.eTemp]

	let modifiedBaseHealth = template.baseHealth
	let scene = scenesData.find(s=>s.sceneDataId == where2.dataId)
	if(!scene) return
	let playersInScene = activePlayersInScene(where2)
	if(!scene.solo){
		modifiedBaseHealth = modifiedEnemyHealth(modifiedBaseHealth,playersInScene.length)
	}

	// let modifiedBaseHealth = scenes.get(where)?.solo ? baseHealth : modifiedEnemyHealth(baseHealth)

	let aggros : Map<HeroId,number> = new Map()
	for(const p of playersInScene){
		aggros.set(p.unitId,template.startAggro)
	}

	let mapStatuses : EnemyStatuses = new Map();

	if(eFs.statuses){
		let mapForHeroStatuses: Map<StatusId, number> = new Map();
		for (let [k,v] of Object.entries(eFs.statuses)){
			mapForHeroStatuses.set((k as StatusId),v)
		}
		mapStatuses.set(triggeredBy,mapForHeroStatuses)
	}

	let uid = v4()

	activeEnemies.push({
		unitId: `enemy${uid}`,
		name: eFs.eName ?? eFs.eTemp,
		templateId: eFs.eTemp,
		currentUniqueSceneId:where2,
		health: modifiedBaseHealth,
		maxHealth: modifiedBaseHealth,
		damage: template.baseDamage,
		aggros: aggros,
		template: template,
		statuses: mapStatuses,
	})
}
export type EnemyStatuses = Map<HeroId, Map<StatusId, number>>

export function addAggro(actor: Player, provoke: number) {
	for (const respondingEnemy of enemiesInScene(actor.currentUniqueSceneId)) {
		const aggroGain = provoke + respondingEnemy.template.aggroGain
		let existingAggro = getAggroForPlayer(respondingEnemy, actor)
		let newAggro = existingAggro + aggroGain
		if (newAggro > 100) {
			newAggro = 100
		}
		respondingEnemy.aggros.set(actor.unitId, newAggro)
	}

}

export function modifyAggroForPlayer(player:Player, enemy: ActiveEnemy, baseAmount: number): { increasedBy: number } {
	let existing = enemy.aggros.get(player.unitId)
	if (existing == undefined) {
		enemy.aggros.set(player.unitId, enemy.template.startAggro)
		existing = enemy.template.startAggro
	}
	let wantNext = existing + baseAmount
	if (wantNext > 100) {
		wantNext = 100
	}
	if (wantNext < 0) {
		wantNext = 0
	}
	enemy.aggros.set(player.unitId, wantNext)
	return { increasedBy: wantNext - existing }
}

export function enemiesInScene(sceneKey: UniqueSceneIdenfitier): ActiveEnemy[] {
	return activeEnemies.filter(e =>  deepEqual(e.currentUniqueSceneId, sceneKey))
}

export function damagePlayer(enemy: ActiveEnemy, player: Player, baseDmg:number): { dmgDone: number } {
	if (player.health < 1) return { dmgDone: 0 }
	let dmgDone = 0
	let strikes = enemy.template.strikes ?? 1
	for (const _ of Array.from({ length: strikes })) {
		let dmg = baseDmg
		for (const item of player.inventory) {
			if (item.stats.damageReduction) {
				dmg = dmg - item.stats.damageReduction
				if(dmg < 1)dmg = 1
			}
		}
		for (const item of player.inventory) {
			if(item.stats.damageLimit){
				if(dmg > item.stats.damageLimit)dmg = item.stats.damageLimit
			}
		}

		player.health -= dmg
		dmgDone += dmg
	}

	pushHappening(`${enemy.name} hit ${player.heroName} ${strikes > 1 ? strikes + ' times' : ''} for ${dmgDone} damage`)
	return { dmgDone: dmgDone }
}

export function damageEnemy(
	source:BattleEventEntity,
	enemy: ActiveEnemy,
	damage: number,
	strikes: number = 1): { dmgDone: number } {
	if (enemy.health < 1) return { dmgDone: 0 }

	let dmgDone = 0
	for (const _ of Array.from({ length: strikes })) {
		let dmg = damage
		if(enemy.template.damageReduction){
			dmg = dmg - enemy.template.damageReduction
			if(dmg < 1) dmg = 1
		}
		if(enemy.template.damageLimit){
			if (dmg > enemy.template.damageLimit) {
				dmg = enemy.template.damageLimit
			} 
		}
		enemy.health -= dmg
		dmgDone += dmg
	}
	let attackerName = source.kind == 'player' ? source.entity.heroName : source.entity.name
	pushHappening(`${attackerName} hit ${enemy.name} ${strikes > 1 ? strikes + ' times' : ''} for ${dmgDone} damage`)

	let result = checkEnemyDeath(enemy)
	if (result.killed) {
		pushHappening(`${attackerName} killed ${enemy.name}`)
	}
	return { dmgDone: dmgDone }
}

export function pushAnimation(
	{ sceneId, battleAnimation, leavingScene }: { sceneId: UniqueSceneIdenfitier, battleAnimation: BattleAnimation, leavingScene?:Player }
) {
	activePlayersInScene(sceneId).forEach(p => {
		p.animations.push(battleAnimation)
	})
	if(leavingScene){
		leavingScene.animations.push(battleAnimation)
	}
}

export function takePoisonDamage(enemy: ActiveEnemy, player:Player): { dmgDone: number } {
	if (enemy.health < 1) return { dmgDone: 0 }
	let dmg = Math.floor(enemy.maxHealth * 0.25)
	enemy.health -= dmg
	pushHappening(`${enemy.name} took ${dmg} damage from ${player.heroName}'s poison`)
	let result = checkEnemyDeath(enemy)
	if (result.killed) {
		pushHappening(`${enemy.name} died from poison`)
	}
	pushAnimation(
		{
			sceneId: enemy.currentUniqueSceneId,
			battleAnimation: {
				triggeredBy:player.unitId,
				source: enemy.unitId,
				target:enemy.unitId,
				alsoDamages:[{target:enemy.unitId,amount:dmg,strikes:1}],
				behavior: {kind:'selfInflicted', extraSprite:'poison'},
			}
		}
	)
	return { dmgDone: dmg }
}

export function checkEnemyDeath(target: ActiveEnemy): { killed: boolean } {
	if (target.health < 1) {
		const i = activeEnemies.findIndex(e => e === target)
		if (i >= 0) {
			activeEnemies.splice(i, 1)
		}
		return { killed: true }
	}
	return { killed: false }
}

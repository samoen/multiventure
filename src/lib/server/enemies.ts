import type { AnimationBehavior, UnitId, BattleAnimation, EnemyName, StatusEffect, StatusId, EnemyId } from "$lib/utils";
import { pushHappening } from "./messaging";
import { scenes, type SceneId } from "./scenes";
import { playerEquipped, type HeroName, type Player, activePlayers, activePlayersInScene } from "./users";


export const activeEnemies: ActiveEnemy[] = []

export type ActiveEnemy = {
	unitId: EnemyId
	name: EnemyName
	templateId:EnemyTemplateId
	currentScene: SceneId
	currentHealth: number
	maxHealth: number
	damage: number
	aggros: Map<HeroName, number>
	template: EnemyTemplate
	statuses: Map<HeroName, Record<StatusId,number>>
}

export function getAggroForPlayer(enemy:ActiveEnemy, player:Player):number{
	let existing = enemy.aggros.get(player.heroName)
	if(existing == undefined){
		enemy.aggros.set(player.heroName,enemy.template.startAggro)
		existing = enemy.template.startAggro
	}
	return existing
}

export type EnemyTemplate = {
	strikes?:number
	baseHealth: number
	baseDamage: number
	behavior?: AnimationBehavior
	aggroGain: number
	startAggro: number
	speed: number
	onTakeDamage?: (incoming: number) => number
	specialAttack?: (me: ActiveEnemy, player:Player) => void
};

export type EnemyTemplateId =
	| 'rat'
	| 'goblin'
	| 'darter'
	| 'hobGoblin'
	| 'fireGremlin'
	| 'troll';

export const enemyTemplates: Record<EnemyTemplateId, EnemyTemplate> = {
	rat: {
		strikes: 2,
		baseHealth: 5,
		baseDamage: 10,
		aggroGain: 10,
		startAggro: 50,
		speed: 3,
	},
	goblin: {
		baseHealth: 50,
		baseDamage: 10,
		aggroGain: 10,
		startAggro:10,
		speed: 4,
	},
	darter:{
		baseHealth: 50,
		baseDamage: 2,
		aggroGain: 10,
		startAggro:10,
		speed: 4,
		specialAttack(me, player) {
			let r = damagePlayer(me, player)
			if(player.statuses.poison < 3){
				player.statuses.poison = 3
			}
			pushAnimation(
				{
					sceneId: player.currentScene,
					battleAnimation: {
						source: me.unitId,
						target: player.unitId,
						putsStatuses:[{target:player.unitId,status:'poison', count:3}],
						damageToTarget: r.dmgDone,
						behavior: 'missile',
						extraSprite:'arrow',
					}
				})
		},

	},
	hobGoblin: {
		baseHealth: 50,
		baseDamage: 10,
		aggroGain: 30,
		startAggro:0,
		speed: 10,
		onTakeDamage(incoming) {
			if (incoming > 10) return 10
			return incoming
		}
	},
	fireGremlin: {
		baseHealth: 10,
		baseDamage: 5,
		aggroGain: 50,
		startAggro:100,
		speed: 10,
		specialAttack(me: ActiveEnemy, player:Player) {
			let dmged:({target:UnitId, amount:number})[] = []
			for (const enemy of enemiesInScene(me.currentScene)) {
				if (enemy.name != me.name) {
					let r = infightDamage(me, enemy)
					if(r.dmgDone > 0)dmged.push({target:enemy.unitId,amount:r.dmgDone})
				}
			}
			// for (const player of activePlayersInScene(me.currentScene)) {
				let r = damagePlayer(me, player)
				if(r.dmgDone > 0){
					pushAnimation({
						sceneId:player.currentScene,
						battleAnimation:{
							source:me.unitId,
							target: player.unitId,
							damageToTarget:r.dmgDone,
							behavior:'missile',
							extraSprite:'flame',
							alsoDamages: dmged,
						},
					})
				}
			// }
		}
	},
	troll: {
		baseHealth: 150,
		baseDamage: 50,
		aggroGain: 1,
		startAggro:0,
		speed: 1,
	}
};

export const PERCENT_OF_BASE_ADDED_PER_PLAYER = 0.5

export function modifiedEnemyHealth(h: number): number {
	if (activePlayers().length < 2) return h
	return h + Math.floor(((activePlayers().length - 1) * PERCENT_OF_BASE_ADDED_PER_PLAYER * h))
}

export function spawnEnemy(name: string, template: EnemyTemplateId, where: SceneId, statuses: Map<HeroName,Record<StatusId,number>> = new Map()) {
	const baseHealth = enemyTemplates[template].baseHealth
	let modifiedBaseHealth = scenes.get(where)?.solo ? baseHealth : modifiedEnemyHealth(baseHealth)
	activeEnemies.push({
		unitId:`enemy${name}`,
		name: name,
		templateId:template,
		currentScene: where,
		currentHealth: modifiedBaseHealth,
		maxHealth: modifiedBaseHealth,
		damage: enemyTemplates[template].baseDamage,
		aggros: new Map(),
		template: enemyTemplates[template],
		statuses: statuses,
	})
}

export function addAggro(actor: Player, provoke: number) {
	for (const respondingEnemy of enemiesInScene(actor.currentScene)) {
		const aggroGain = provoke + respondingEnemy.template.aggroGain
		let existingAggro = getAggroForPlayer(respondingEnemy,actor)
		let newAggro = existingAggro + aggroGain
		if(newAggro > 100){
			newAggro = 100
		}
		respondingEnemy.aggros.set(actor.heroName, newAggro)
	}

}

export function modifyAggroForPlayer(heroName:HeroName, enemy:ActiveEnemy,baseAmount:number):{increasedBy:number}{
	let existing = enemy.aggros.get(heroName)
	if(existing == undefined){
		enemy.aggros.set(heroName,enemy.template.startAggro)
		existing = enemy.template.startAggro
	}
	let wantNext = existing + baseAmount
	if(wantNext > 100){
		wantNext = 100
	}
	if(wantNext < 0){
		wantNext = 0
	}
	enemy.aggros.set(heroName,wantNext)
	return {increasedBy: wantNext - existing}
}

export function enemiesInScene(sceneKey: SceneId): ActiveEnemy[] {
	return activeEnemies.filter(e => e.currentScene == sceneKey)
}

export function damagePlayer(enemy: ActiveEnemy, player: Player) : {dmgDone:number} {
	if(player.health < 1) return {dmgDone:0}
	let dmgDone = 0
	let strikes = enemy.template.strikes ?? 1
	for(const _ of Array.from({length:strikes})){
		let dmg = enemy.damage
		for (const item of playerEquipped(player)) {
			if (item.onTakeDamage) {
				dmg = item.onTakeDamage(dmg)
			}
		}
		player.health -= dmg
		dmgDone +=dmg
	}
	
	pushHappening(`${enemy.name} hit ${player.heroName} ${strikes>1?strikes+' times':''} for ${dmgDone} damage`)
	return {dmgDone:dmgDone}
}

export function damageEnemy(actor: Player, enemy: ActiveEnemy, damage: number, strikes:number=1) : {dmgDone:number} {
	if (enemy.currentHealth < 1) return {dmgDone:0}

	let dmgDone = 0
	for(const _ of Array.from({length:strikes})){
		let dmg = enemy.template.onTakeDamage?.(damage) ?? damage
		enemy.currentHealth -= dmg
		dmgDone +=dmg
	}

	pushHappening(`${actor.heroName} hit ${enemy.name} ${strikes>1?strikes+' times':''} for ${dmgDone} damage`)
	
	let result = checkEnemyDeath(enemy)
	if (result.killed) {
		pushHappening(`${actor.heroName} killed ${enemy.name}`)
	}
	return {dmgDone:dmgDone}
}

export function pushAnimation(
	{sceneId,battleAnimation}:{sceneId:SceneId,battleAnimation:BattleAnimation}
	){
	activePlayersInScene(sceneId).forEach(p=>{
		p.animations.push(battleAnimation)

	})
}

export function infightDamage(actor: ActiveEnemy, target: ActiveEnemy) :{dmgDone:number}{
	if(target.currentHealth < 1)return {dmgDone:0}
	let damage = target.template.onTakeDamage?.(actor.damage) ?? actor.damage
	target.currentHealth -= damage
	pushHappening(`${actor.name} accidentally hit ${target.name} for ${damage} damage`)
	let result = checkEnemyDeath(target)
	if (result.killed) {
		pushHappening(`${actor.name} killed ${target.name}`)
	}
	return {dmgDone:damage}
}

export function takePoisonDamage(enemy: ActiveEnemy) : {dmgDone:number} {
	if(enemy.currentHealth < 1) return {dmgDone:0}
	let dmg = Math.floor(enemy.maxHealth * 0.25)
	enemy.currentHealth -= dmg
	pushHappening(`${enemy.name} took ${dmg} damage from poison`)
	let result = checkEnemyDeath(enemy)
	if (result.killed) {
		pushHappening(`${enemy.name} died from poison`)
	}
	pushAnimation(
		{
			sceneId:enemy.currentScene,
			battleAnimation:{
				source:enemy.unitId,
				damageToSource:dmg,
				behavior:'selfInflicted',
				extraSprite:'poison',
			}
		}
	)
	return {dmgDone:dmg}
}

export function checkEnemyDeath(target: ActiveEnemy): { killed: boolean } {
	if (target.currentHealth < 1) {
		const i = activeEnemies.findIndex(e => e === target)
		if (i >= 0) {
			activeEnemies.splice(i, 1)
		}
		return { killed: true }
	}
	return { killed: false }
}

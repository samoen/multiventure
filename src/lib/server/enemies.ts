import type { EnemyName, EnemyStatusEffect } from "$lib/utils";
import { pushHappening } from "./messaging";
import { scenes, type SceneId } from "./scenes";
import { playerEquipped, type HeroName, type Player, activePlayers, activePlayersInScene } from "./users";


export const activeEnemies: ActiveEnemy[] = []

export type ActiveEnemy = {
	name: EnemyName
	templateId:EnemyTemplateId
	currentScene: SceneId
	currentHealth: number
	maxHealth: number
	damage: number
	aggros: Map<HeroName, number>
	template: EnemyTemplate
	statuses: EnemyStatusEffect[]
}

export type EnemyTemplate = {
	strikes?:number
	baseHealth: number
	baseDamage: number
	aggroGain: number
	speed: number
	onTakeDamage?: (incoming: number) => number
	specialAttack?: (me: ActiveEnemy, player:Player) => void
};

export type EnemyTemplateId =
	| 'rat'
	| 'goblin'
	| 'hobGoblin'
	| 'fireGremlin'
	| 'troll';

export const enemyTemplates: Record<EnemyTemplateId, EnemyTemplate> = {
	rat: {
		strikes: 2,
		baseHealth: 5,
		baseDamage: 10,
		aggroGain: 50,
		speed: 3
	},
	goblin: {
		baseHealth: 50,
		baseDamage: 10,
		aggroGain: 90,
		speed: 4,
	},
	hobGoblin: {
		baseHealth: 50,
		baseDamage: 10,
		aggroGain: 30,
		speed: 10,
		onTakeDamage(incoming) {
			if (incoming > 10) return 10
			return incoming
		}
	},
	fireGremlin: {
		baseHealth: 10,
		baseDamage: 5,
		aggroGain: 90,
		speed: 10,
		specialAttack(me: ActiveEnemy, player:Player) {
			for (const enemy of enemiesInScene(me.currentScene)) {
				if (enemy.name != me.name) {
					infightDamage(me, enemy)
				}
			}
			// for (const player of activePlayersInScene(me.currentScene)) {
				damagePlayer(me, player)
			// }
		}
	},
	troll: {
		baseHealth: 150,
		baseDamage: 50,
		aggroGain: 1,
		speed: 1,
	}
};

export const PERCENT_OF_BASE_ADDED_PER_PLAYER = 0.5

export function modifiedEnemyHealth(h: number): number {
	if (activePlayers().length < 2) return h
	return h + ((activePlayers().length - 1) * PERCENT_OF_BASE_ADDED_PER_PLAYER * h)
}

export function spawnEnemy(name: string, template: EnemyTemplateId, where: SceneId, statuses: EnemyStatusEffect[] = []) {
	const baseHealth = enemyTemplates[template].baseHealth
	let modifiedBaseHealth = scenes.get(where)?.solo ? baseHealth : modifiedEnemyHealth(baseHealth)
	activeEnemies.push({
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
		let existingAggro = respondingEnemy.aggros.get(actor.heroName)
		if (existingAggro) {
			respondingEnemy.aggros.set(actor.heroName, existingAggro + aggroGain)
		} else {
			respondingEnemy.aggros.set(actor.heroName, aggroGain)
		}
	}

}

export function enemiesInScene(sceneKey: SceneId): ActiveEnemy[] {
	return activeEnemies.filter(e => e.currentScene == sceneKey)
}

export function damagePlayer(enemy: ActiveEnemy, player: Player) {
	if(player.health < 1) return
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

	player.animations.push({
		source:enemy.name,
		target:player.heroName,
		damage:dmgDone,
	})
	
	pushHappening(`${enemy.name} hit ${player.heroName} ${strikes>1?strikes+' times':''} for ${dmgDone} damage`)
}

export function damageEnemy(actor: Player, enemy: ActiveEnemy, damage: number, strikes:number=1) {
	if (enemy.currentHealth < 1) return

	let dmgDone = 0
	for(const _ of Array.from({length:strikes})){
		let dmg = enemy.template.onTakeDamage?.(damage) ?? damage
		enemy.currentHealth -= dmg
		dmgDone +=dmg
	}

	pushHappening(`${actor.heroName} hit ${enemy.name} ${strikes>1?strikes+' times':''} for ${dmgDone} damage`)
	actor.animations.push({
		source:actor.heroName,
		target:enemy.name,
		damage:dmgDone,
	})
	let result = checkEnemyDeath(enemy)
	if (result.killed) {
		pushHappening(`${actor.heroName} killed ${enemy.name}`)
	}
}

export function infightDamage(actor: ActiveEnemy, target: ActiveEnemy) {
	let damage = target.template.onTakeDamage?.(actor.damage) ?? actor.damage
	target.currentHealth -= damage
	pushHappening(`${actor.name} accidentally hit ${target.name} for ${damage} damage`)
	let result = checkEnemyDeath(target)
	if (result.killed) {
		pushHappening(`${actor.name} killed ${target.name}`)
	}
}

export function takePoisonDamage(enemy: ActiveEnemy) {
	let dmg = Math.floor(enemy.maxHealth * 0.25)
	enemy.currentHealth -= dmg
	pushHappening(`${enemy.name} took ${dmg}damage from poison`)
	let result = checkEnemyDeath(enemy)
	if (result.killed) {
		pushHappening(`${enemy.name} died from poison`)
	}
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

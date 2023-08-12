import type { EnemyStatusEffect } from "$lib/utils";
import { pushHappening } from "./messaging";
import { scenes, type SceneId } from "./scenes";
import { playerEquipped, type HeroName, type Player, activePlayers, activePlayersInScene } from "./users";


export const activeEnemies: ActiveEnemy[] = []

export type ActiveEnemy = {
	name: string,
	currentScene: SceneId;
	currentHealth: number;
	maxHealth: number;
	damage: number;
	aggros: Map<HeroName, number>,
	template: EnemyTemplate;
	statuses: EnemyStatusEffect[]
}

export type EnemyTemplate = {
	baseHealth: number;
	baseDamage: number;
	aggroGain: number;
	speed: number;
	onTakeDamage?:(incoming:number)=>number
	onAttack?:(me:ActiveEnemy)=>void
};

export type EnemyTemplateId =
	| 'rat'
	| 'goblin'
	| 'hobGoblin'
	| 'fireGremlin'
	| 'troll';

export const enemyTemplates: Record<EnemyTemplateId, EnemyTemplate> = {
	rat: {
		baseHealth: 5,
		baseDamage: 10,
		aggroGain: 50,
		speed: 3
	},
	goblin: {
		baseHealth: 50,
		baseDamage: 10,
		aggroGain: 10,
		speed: 4,
	},
	hobGoblin: {
		baseHealth: 50,
		baseDamage: 5,
		aggroGain: 80,
		speed: 10,
		onTakeDamage(incoming){
			if(incoming > 10)return 10
			return incoming
		}
	},
	fireGremlin: {
		baseHealth: 10,
		baseDamage: 5,
		aggroGain: 90,
		speed: 10,
		onAttack(me:ActiveEnemy){
			for(const enemy of enemiesInScene(me.currentScene)){
				if(enemy.name != me.name){
					infightDamage(me, enemy)
				}
			}
			for(const player of activePlayersInScene(me.currentScene)){
				damagePlayer(me,player)
			}
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

export function spawnEnemy(name: string, template: EnemyTemplateId, where: SceneId) {
	const baseHealth = enemyTemplates[template].baseHealth
	let modifiedBaseHealth = scenes.get(where)?.solo ? baseHealth : modifiedEnemyHealth(baseHealth)
	activeEnemies.push({
		name: name,
		currentScene: where,
		currentHealth: modifiedBaseHealth,
		maxHealth: modifiedBaseHealth,
		damage: enemyTemplates[template].baseDamage,
		aggros: new Map(),
		template: enemyTemplates[template],
		statuses:[],
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
	let dmg = enemy.damage
	for (const item of playerEquipped(player)) {
		if (item.onTakeDamage) {
			dmg = item.onTakeDamage(dmg)
		}
	}
	player.health -= dmg
	pushHappening(`${enemy.name} hit ${player.heroName} for ${dmg} damage`)
}

export function damageEnemy(actor: Player, enemy: ActiveEnemy, damage: number) {
	if(enemy.currentHealth < 1)return
	damage = enemy.template.onTakeDamage?.(damage) ?? damage
	enemy.currentHealth -= damage
	pushHappening(`${actor.heroName} hit ${enemy.name} for ${damage} damage`)
	let result = checkEnemyDeath(enemy)
	if(result.killed){
		pushHappening(`${actor.heroName} killed ${enemy.name}`)
	}
}

export function infightDamage(actor:ActiveEnemy,target:ActiveEnemy){
	let damage = target.template.onTakeDamage?.(actor.damage) ?? actor.damage
	target.currentHealth -= damage
	pushHappening(`${actor.name} accidentally hit ${target.name} for ${damage} damage`)
	let result = checkEnemyDeath(target)
	if(result.killed){
		pushHappening(`${actor.name} killed ${target.name}`)
	}
}

export function takePoisonDamage(enemy : ActiveEnemy){
	let dmg = Math.floor(enemy.maxHealth * 0.25)
	enemy.currentHealth -= dmg
	pushHappening(`${enemy.name} took ${dmg}damage from poison`)
	let result = checkEnemyDeath(enemy)
	if(result.killed){
		pushHappening(`${enemy.name} died from poison`)
	}
}

export function checkEnemyDeath(target:ActiveEnemy): { killed: boolean } {
	if (target.currentHealth < 1) {
		const i = activeEnemies.findIndex(e => e === target)
		// activeEnemies.findIndex
		if (i >= 0) {
			activeEnemies.splice(i, 1)
		}
		return { killed: true }
	}
	return {killed:false}
	
}

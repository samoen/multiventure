import { pushHappening } from "./messaging";
import type { SceneId } from "./scenes";
import { playerEquipped, type HeroName, type Player, activePlayers } from "./users";


export const activeEnemies : ActiveEnemy[] = []

export type ActiveEnemy = {
	name:string,
	currentScene:SceneId;
	currentHealth:number;
	maxHealth:number;
	damage:number;
	aggros:Map<HeroName,number>,
	template:EnemyTemplate;
}

export type EnemyTemplate = {
	baseHealth: number;
	baseDamage: number;
	aggroGain:number;
	speed:number;
};

export type EnemyTemplateId = 'goblin' | 'wolf' | 'troll';

export const enemyTemplates: Record<EnemyTemplateId, EnemyTemplate> = {
	goblin: {
		baseHealth: 100,
		baseDamage: 10,
		aggroGain:10,
		speed:4,
	},
	wolf: {
		baseHealth: 50,
		baseDamage: 5,
		aggroGain:90,
		speed:10,
	},
	troll:{
		baseHealth:150,
		baseDamage:40,
		aggroGain:1,
		speed:1,
	}
};
export const PERCENT_OF_BASE_ADDED_PER_PLAYER = 0.5

export function modifiedEnemyHealth(h:number):number{
	if(activePlayers.length<1)return h
	return h + ((activePlayers().length-1) * PERCENT_OF_BASE_ADDED_PER_PLAYER * h) 
}

export function spawnEnemy(name:string,template:EnemyTemplateId,where:SceneId){
	const baseHealth = enemyTemplates[template].baseHealth
	let modifiedBaseHealth = modifiedEnemyHealth(baseHealth)
	activeEnemies.push({
		name: name,
		currentScene: where,
		currentHealth: modifiedBaseHealth,
		maxHealth : modifiedBaseHealth, 
		damage : enemyTemplates[template].baseDamage,
		aggros:new Map(),
		template: enemyTemplates[template],
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

export function enemiesInScene(sceneKey:SceneId):ActiveEnemy[]{
	return activeEnemies.filter(e=>e.currentScene == sceneKey)
}

export function damagePlayer(enemy:ActiveEnemy, player:Player){
	let dmg = enemy.damage
	for(const item of playerEquipped(player)){
		if(item.onTakeDamage){
			dmg = item.onTakeDamage(dmg)
		}
	}
	player.health -= dmg
	pushHappening(`${enemy.name} hit ${player.heroName} for ${dmg} damage`)
}

export function damageEnemy(actor:Player, enemy:ActiveEnemy, damage:number):{killed:boolean}{
	enemy.currentHealth -= damage
	pushHappening(`${actor.heroName} hit ${enemy.name} for ${damage} damage`)
	if(enemy.currentHealth < 1){
		const i = activeEnemies.findIndex(e=>e.name == enemy.name)
		if(i>=0){
			activeEnemies.splice(i,1)
		}
		pushHappening(`${actor.heroName} killed ${enemy.name}`)
		return {killed:true}
	}
	return {killed:false}
}

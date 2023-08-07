import { pushHappening } from "./messaging";
import type { SceneKey } from "./scenes";
import type { HeroName, Player } from "./users";


export const activeEnemies : ActiveEnemy[] = []

export type ActiveEnemy = {
	name:string,
	currentScene:SceneKey;
	currentHealth:number;
	aggros:Map<HeroName,number>,
	template:EnemyTemplate;
}

export type EnemyTemplate = {
	maxHealth: number;
	attackDamage: number;
	aggroGain:number;
};

export type EnemyKey = 'goblin' | 'wolf';

export const enemyTemplates: Record<EnemyKey, EnemyTemplate> = {
	goblin: {
		maxHealth: 50,
		attackDamage: 15,
		aggroGain:10,
	},
	wolf: {
		maxHealth: 30,
		attackDamage: 5,
		aggroGain:100,
	}
};

export function addAggro(actor: Player, provoke: number) {
	for (const respondingEnemy of activeEnemies.filter(e => e.currentScene == actor.currentScene)) {
		const aggroGain = provoke + respondingEnemy.template.aggroGain
		let existingAggro = respondingEnemy.aggros.get(actor.heroName)
		if (existingAggro) {
			respondingEnemy.aggros.set(actor.heroName, existingAggro + aggroGain)
		} else {
			respondingEnemy.aggros.set(actor.heroName, aggroGain)
		}
	}

}

export function damagePlayer(enemy:ActiveEnemy, player:Player){
	player.health -= enemy.template.attackDamage
	// enemy.retaliate = 0
	pushHappening(`${enemy.name} hit ${player.heroName} for ${enemy.template.attackDamage} damage`)

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

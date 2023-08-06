import { pushHappening } from "./messaging";
import type { SceneKey } from "./scenes";
import type { Player } from "./users";


export const activeEnemies : ActiveEnemy[] = []

export type ActiveEnemy = {
	name:string,
	currentScene:SceneKey;
	currentHealth:number;
	template:EnemyTemplate;
}

export type EnemyTemplate = {
	maxHealth: number;
	attackDamage: number;
};

export type EnemyKey = 'goblin' | 'wolf';

export const enemyTemplates: Record<EnemyKey, EnemyTemplate> = {
	goblin: {
		maxHealth: 50,
		attackDamage: 15,
	},
	wolf: {
		maxHealth: 30,
		attackDamage: 5
	}
};

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

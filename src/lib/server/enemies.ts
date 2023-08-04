import type { SceneKey } from "./scenes";


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

export type EnemyKey = keyof typeof enemyTemplates;

export const enemyTemplates: Record<string, EnemyTemplate> = {
	goblin: {
		maxHealth: 50,
		attackDamage: 15,
	},
	wolf: {
		maxHealth: 30,
		attackDamage: 5
	}
};

export function damageEnemy(enemy:ActiveEnemy, damage:number):{killed:boolean}{
	enemy.currentHealth -= damage
	if(enemy.currentHealth < 1){
		const i = activeEnemies.findIndex(e=>e.name == enemy.name)
		if(i>=0){
			activeEnemies.splice(i,1)
		}
		return {killed:true}
	}
	return {killed:false}
}

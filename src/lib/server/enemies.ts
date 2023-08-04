import type { SceneKey } from "./scenes";


export const activeEnemies : ActiveEnemy[] = []

export type ActiveEnemy = {
	name:string,
	currentLocation:SceneKey;
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

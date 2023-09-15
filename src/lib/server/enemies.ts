import {
	OffenseKinds,
	type AnimationBehavior,
	type BattleAnimation,
	type BattleEventEntity,
	type DamageEvent,
	type EnemyId,
	type EnemyName,
	type HeroId,
	type ItemAnimationBehavior,
	type StatusMod
} from '$lib/utils';
import { v4 } from 'uuid';
import { deepEqual, getDamageReduction, type EnemyForSpawning, getDamageLimit } from './logic';
import { pushHappening } from './messaging';
import { scenesData, type UniqueSceneIdenfitier } from './scenes';
import { activePlayersInScene, type BonusStatsState, type Player } from './users';
import type { StatusId } from './statuses';
import { items, type Item, type ItemDamageData, type ItemId, type ItemState } from './items';

export const activeEnemies: ActiveEnemy[] = [];

export type ActiveEnemy = {
	unitId: EnemyId;
	displayName: EnemyName;
	templateId: EnemyTemplateId;
	currentUniqueSceneId: UniqueSceneIdenfitier;
	health: number;
	maxHealth: number;
	bonusStats:BonusStatsState;
	aggros: Map<HeroId, number>;
	template: EnemyTemplate;
	statuses: EnemyStatuses;
	inventory:ItemState[];
};

export function getAggroForPlayer(enemy: ActiveEnemy, player: Player): number {
	let existing = enemy.aggros.get(player.unitId);
	if (existing == undefined) {
		enemy.aggros.set(player.unitId, enemy.template.startAggro);
		existing = enemy.template.startAggro;
	}
	return existing;
}

export type EnemyTemplate = {
	portrait?: string;
	baseHealth: number;
	strength: number;
	agility: number;
	randomTarget?: boolean;
	aggroGain: number;
	startAggro: number;
	damageLimit?: number;
	damageReduction?: number;
	hasItem:ItemId;
};

export type EnemyTemplateId = 'rat' | 'goblin' | 'darter' | 'orc' | 'fireGremlin' | 'troll';

export const enemyTemplates: Record<EnemyTemplateId, EnemyTemplate> = {
	rat: {
		baseHealth: 5,
		strength: 0,
		agility:0,
		aggroGain: 10,
		startAggro: 70,
		hasItem:'fist'
	},
	goblin: {
		baseHealth: 50,
		strength: 0,
		agility:3,
		aggroGain: 50,
		startAggro: 20,
		damageReduction: 2,
		hasItem:'potion'
	},
	darter: {
		baseHealth: 50,
		strength: 0,
		aggroGain: 10,
		startAggro: 10,
		agility: 4,
		hasItem:'poisonDart'
	},
	orc: {
		portrait: 'grunt',
		baseHealth: 50,
		strength: 2,
		aggroGain: 30,
		startAggro: 10,
		agility: 4,
		damageLimit: 10,
		hasItem:'thiefCloak',
	},
	fireGremlin: {
		baseHealth: 10,
		strength: 0,
		aggroGain: 50,
		startAggro: 100,
		agility: 10,
		randomTarget: true,
		hasItem:'fireStaff',
	},
	troll: {
		baseHealth: 150,
		strength: 10,
		aggroGain: 3,
		startAggro: 80,
		agility: 1,
		hasItem:'club'
	}
};

export const PERCENT_OF_BASE_ADDED_PER_PLAYER = 0.5;

export function modifiedEnemyHealth(baseHealth: number, numPlayers: number): number {
	if (numPlayers < 2) return baseHealth;
	return baseHealth + Math.floor((numPlayers - 1) * PERCENT_OF_BASE_ADDED_PER_PLAYER * baseHealth);
}

export function spawnEnemy(
	eFs: EnemyForSpawning,
	where2: UniqueSceneIdenfitier,
	triggeredBy: HeroId
) {
	const template = enemyTemplates[eFs.eTemp];

	let modifiedBaseHealth = template.baseHealth;
	const scene = scenesData.find((s) => s.sceneDataId == where2.dataId);
	if (!scene) return;
	const playersInScene = activePlayersInScene(where2);
	if (!scene.solo) {
		modifiedBaseHealth = modifiedEnemyHealth(modifiedBaseHealth, playersInScene.length);
	}

	// let modifiedBaseHealth = scenes.get(where)?.solo ? baseHealth : modifiedEnemyHealth(baseHealth)

	const aggros: Map<HeroId, number> = new Map();
	for (const p of playersInScene) {
		aggros.set(p.unitId, template.startAggro);
	}

	const mapStatuses: EnemyStatuses = new Map();

	if (eFs.statuses) {
		const mapForHeroStatuses: Map<StatusId, number> = new Map();
		for (const k of eFs.statuses) {
			mapForHeroStatuses.set(k.statusId, k.count);
		}
		mapStatuses.set(triggeredBy, mapForHeroStatuses);
	}

	const uid = v4();

	const item = items.find((i) => i.id == template.hasItem);
	if (!item) return;
	const createState: ItemState = {
		cooldown: 0,
		warmup: item.warmup ?? 0,
		stats: item,
		stock: item.startStock
	};

	activeEnemies.push({
		unitId: `enemy${uid}`,
		displayName: eFs.eName ?? eFs.eTemp,
		templateId: eFs.eTemp,
		currentUniqueSceneId: where2,
		health: modifiedBaseHealth,
		maxHealth: modifiedBaseHealth,
		bonusStats:{
			strength:0,
			agility:0,
		},
		aggros: aggros,
		template: template,
		statuses: mapStatuses,
		inventory:[createState],
	});
}
export type EnemyStatuses = Map<HeroId, Map<StatusId, number>>;

export function addAggro(actor: Player, provoke: number) {
	for (const respondingEnemy of enemiesInScene(actor.currentUniqueSceneId)) {
		const aggroGain = provoke + respondingEnemy.template.aggroGain;
		const existingAggro = getAggroForPlayer(respondingEnemy, actor);
		let newAggro = existingAggro + aggroGain;
		if (newAggro > 100) {
			newAggro = 100;
		}
		respondingEnemy.aggros.set(actor.unitId, newAggro);
	}
}

export function modifyAggroForPlayer(
	player: Player,
	enemy: ActiveEnemy,
	baseAmount: number
): { increasedBy: number } {
	let existing = enemy.aggros.get(player.unitId);
	if (existing == undefined) {
		enemy.aggros.set(player.unitId, enemy.template.startAggro);
		existing = enemy.template.startAggro;
	}
	let wantNext = existing + baseAmount;
	if (wantNext > 100) {
		wantNext = 100;
	}
	if (wantNext < 0) {
		wantNext = 0;
	}
	enemy.aggros.set(player.unitId, wantNext);
	return { increasedBy: wantNext - existing };
}

export function enemiesInScene(sceneKey: UniqueSceneIdenfitier): ActiveEnemy[] {
	return activeEnemies.filter((e) => deepEqual(e.currentUniqueSceneId, sceneKey));
}

export function damageEntity(
	hme:DamageEvent,
	source: BattleEventEntity,
	toDamage: BattleEventEntity,
	// damage: number,
	// strikes :number,
): { dmgDone: number[] } {
	if (toDamage.entity.health < 1) return { dmgDone: [] };
	let bone = 0
	if(hme.itemDamageData.offenseKind && hme.itemDamageData.offenseKind  == OffenseKinds.brutal){
		bone += source.entity.bonusStats.strength
		if(source.kind == 'player'){
			bone += source.entity.strength
		}else if(source.kind == 'enemy'){
			bone += source.entity.template.strength
		}
	}
	let strikes = hme.itemDamageData.strikes
	
	let damageReduction = getDamageReduction(toDamage)
	let damageLimit = getDamageLimit(toDamage)

	const dmgDone: number[] = [];
	let dmgSum = 0
	for (let i = 0; i < strikes; i++) {
		let dmg = hme.itemDamageData.baseDmg;
		if (damageReduction != undefined) {
			dmg = dmg - damageReduction;
			if (dmg < 1) dmg = 1;
		}
		if (damageLimit != undefined) {
			if (dmg > damageLimit) {
				dmg = damageLimit;
			}
		}
		if (i == strikes - 1) {
			dmg += bone;
		}
		toDamage.entity.health -= dmg;
		dmgDone.push(dmg);
		dmgSum += dmg
		if (toDamage.entity.health < 1) break;
	}
	pushHappening(
		`${source.entity.displayName} hit ${toDamage.entity.displayName} for ${dmgSum} damage`
	);
	if(toDamage.kind == 'enemy'){
		const result = checkEnemyDeath(toDamage.entity);
		if (result.killed) {
			pushHappening(`${source.entity.displayName} killed ${toDamage.entity.displayName}`);
		}
	}
	return { dmgDone: dmgDone };
}

export function pushAnimation({
	sceneId,
	battleAnimation,
	leavingScene
}: {
	sceneId: UniqueSceneIdenfitier;
	battleAnimation: BattleAnimation;
	leavingScene?: Player;
}) {
	activePlayersInScene(sceneId).forEach((p) => {
		p.animations.push(battleAnimation);
	});
	if (leavingScene) {
		leavingScene.animations.push(battleAnimation);
	}
}

export function checkEnemyDeath(target: ActiveEnemy): { killed: boolean } {
	if (target.health < 1) {
		const i = activeEnemies.findIndex((e) => e === target);
		if (i >= 0) {
			activeEnemies.splice(i, 1);
		}
		return { killed: true };
	}
	return { killed: false };
}

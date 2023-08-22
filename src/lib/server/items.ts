import type { AggroModifier, HealthModifier, UnitId } from '$lib/utils';
import { damageEnemy, enemiesInScene, pushAnimation, takePoisonDamage } from './enemies';
import { pushHappening } from './messaging';
import { activePlayersInScene, healPlayer, type Player } from './users';

export type EquipmentSlot =
	| 'weapon'
	| 'utility'
	| 'body'

export type ItemIdForSlot<T extends EquipmentSlot> =
	T extends 'weapon' ?
	| 'unarmed'
	| 'club'
	| 'dagger'
	| 'fireStaff'
	: T extends 'utility' ?
	| 'empty'
	| 'bandage'
	| 'bomb'
	| 'poisonDart'
	: T extends 'body' ?
	| 'rags'
	| 'leatherArmor'
	| 'theifCloak'
	| 'plateMail'
	: never

export type ItemId = ItemIdForSlot<EquipmentSlot>

export type ItemStateForSlot<T extends EquipmentSlot> = {
	itemId: ItemIdForSlot<T>;
	cooldown: number;
	warmup: number;
	stock?: number;
}

export type ItemState = ItemStateForSlot<EquipmentSlot>

export type Inventory = {
	[T in EquipmentSlot]: ItemStateForSlot<T>
}

export type Item = {
	actions?: (player: Player) => void
	onTakeDamage?: (incoming: number) => number
	warmup?: number
	startStock?: number
}

const dagger: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Attack ${enemy.name} with Dagger`,
					provoke: 7,
					speed: 8,
					slot:'weapon',
					target:enemy.unitId,
					performAction() {
						let r = damageEnemy(player, enemy, 7, 3)
						if (r.dmgDone > 0) {
							pushAnimation(
								{
									sceneId: player.currentScene,
									battleAnimation: {
										source: player.unitId,
										target: enemy.unitId,
										damageToTarget: r.dmgDone,
										behavior: 'melee',
									}
								})
						}
					}
				}
			)
		}
	}
}

const club: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Hit ${enemy.name} with Club`,
					provoke: 40,
					speed: 2,
					slot:'weapon',
					target:enemy.unitId,
					performAction() {
						let r = damageEnemy(player, enemy, 25)
						if (r.dmgDone > 0) {
							pushAnimation(
								{
									sceneId: player.currentScene,
									battleAnimation: {
										source: player.unitId,
										target: enemy.unitId,
										damageToTarget: r.dmgDone,
										behavior: 'melee',
									}
								})
						}
					}
				}
			)
		}
	}
}

const fireStaff: Item = {
	warmup: 2,
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Blast ${enemy.name} with Firebolt`,
					provoke: 60,
					speed: 1,
					slot:'weapon',
					target:enemy.unitId,
					performAction() {
						let r = damageEnemy(player, enemy, 999)
						if (r.dmgDone > 0) {
							pushAnimation(
								{
									sceneId: player.currentScene,
									battleAnimation: {
										source: player.unitId,
										target: enemy.unitId,
										damageToTarget: r.dmgDone,
										behavior: 'missile',
										extraSprite:'flame',
									}
								})
						}
						player.inventory.weapon.cooldown = 1
					}
				}
			)
		}
	}
}

const bandage: Item = {
	startStock: 2,
	actions(player) {
		for (const friend of activePlayersInScene(player.currentScene)) {
			if (friend.health < friend.maxHealth && friend.health > 0) {
				player.itemActions.push(
					{
						buttonText: `Heal ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with bandage`,
						grantsImmunity: true,
						provoke: 1,
						slot:'utility',
						target:friend.unitId,
						performAction: () => {
							let r = healPlayer(friend, 90)
							if (r.healed > 0) {
								if(friend.heroName != player.heroName){
									pushAnimation(
										{
											sceneId: player.currentScene,
											battleAnimation: {
												source: player.unitId,
												target: friend.unitId,
												damageToTarget: r.healed*-1,
												behavior: 'melee',
											}
										}
									)
								}else{
									pushAnimation(
										{
											sceneId: player.currentScene,
											battleAnimation: {
												source: player.unitId,
												damageToSource: r.healed*-1,
												behavior: 'selfInflicted',
												extraSprite:'flame'
											}
										}
									)
								}
							}
							if (player.inventory.utility.stock) {
								player.inventory.utility.stock--
							}
						},
					}
				)
			}
		}
	}
}

const bomb: Item = {
	startStock: 1,
	actions(player) {
		if (enemiesInScene(player.currentScene).length) {
			player.itemActions.push({
				buttonText: 'Throw Powderbomb',
				speed: 12,
				provoke:5,
				slot:'utility',
				performAction() {
					let dmgs : HealthModifier[]= []
					let aggroAffected : AggroModifier[]= []
					for (const enemy of enemiesInScene(player.currentScene)) {			
						for (const key of enemy.aggros.keys()) {
							let prevAggro = enemy.aggros.get(key)
							if(prevAggro != undefined){
								let newAggro = prevAggro - 20
								if(newAggro < 1)newAggro = 0
								enemy.aggros.set(key, newAggro);
								aggroAffected.push({
									target:enemy.unitId,
									amount:20,
									showFor:'all',
								})
							}
						}
						let r = damageEnemy(player, enemy, 5)
						if(r.dmgDone>0){
							dmgs.push({
								amount:r.dmgDone,
								target:enemy.unitId
							})
						}
					}
					pushAnimation(
						{
							sceneId: player.currentScene,
							battleAnimation: {
								source: player.unitId,
								behavior: 'center',
								extraSprite:'bomb',
								alsoDamages:dmgs,
								alsoModifiesAggro:aggroAffected
							}
						})
					if (player.inventory.utility.stock) {
						player.inventory.utility.stock--
					}
				},
			})
		}
	},
}

const poisonDart: Item = {
	startStock:2,
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Throw poison dart at ${enemy.name}`,
					provoke: 40,
					speed:20,
					slot:'utility',
					target:enemy.unitId,
					performAction() {
						let found = enemy.statuses.get(player.heroName)
						if(!found){
							found = {
								poison:0,
								rage:0,
							}
						}
						// found = enemy.statuses.get(player.heroName)
						if(found.poison < 3){
							found.poison = 3
						}
						enemy.statuses.set(player.heroName,found)
						
						let r = damageEnemy(player,enemy,1)
							pushAnimation(
								{
									sceneId: player.currentScene,
									battleAnimation: {
										source: player.unitId,
										target: enemy.unitId,
										putsStatusOnTarget:'poison',
										damageToTarget: r.dmgDone,
										behavior: 'missile',
										extraSprite:'arrow',
									}
								})
						// }
						if (player.inventory.utility.stock) {
							player.inventory.utility.stock--
						}
					},
				}
			)
		}
	},
}

const plateMail: Item = {
	actions(player) {
		if (enemiesInScene(player.currentScene).length) {
			player.itemActions.push({
				provoke: 5,
				buttonText: 'Taunt',
				slot:'body',
				speed: 999,
				performAction() {
					player.inventory.body.cooldown = 2
					for (const enemy of enemiesInScene(player.currentScene)) {
						enemy.aggros.set(player.heroName,100)
					}
					pushAnimation({
						sceneId:player.currentScene,
						battleAnimation:{
							behavior:'center',
							damageToTarget:0,
							source:player.unitId,
							extraSprite:'bomb',
							alsoModifiesAggro:enemiesInScene(player.currentScene).map((e)=>{
								return {
									target:e.unitId,
									setTo:100,
									showFor:'onlyme'
								}
							})
						}
					})				
					pushHappening(`${player.heroName} infuriates enemies!`)
				},
			})
		}
	},
	onTakeDamage(incoming) {
		if (incoming > 20) {
			return 20
		}
		return incoming
	},
}

const theifCloak: Item = {
	actions(player) {
		if (enemiesInScene(player.currentScene).length) {
			player.itemActions.push({
				buttonText: 'Hide in shadows',
				grantsImmunity: true,
				slot:'body',
				performAction() {
					for (const enemy of enemiesInScene(player.currentScene)) {
						enemy.aggros.set(player.heroName,0)
					}
					player.inventory.body.cooldown = 3
					pushHappening(`${player.heroName} hid in shadows`)
				},
			})
		}
	},
}

const leatherArmor: Item = {
	onTakeDamage(incoming) {
		if (incoming < 6) {
			return 1
		}
		return incoming - 5
	},
}

export const weapons: Record<ItemIdForSlot<'weapon'>, Item> = {
	unarmed: {},
	dagger: dagger,
	club: club,
	fireStaff: fireStaff,
};

export const utilityItems: Record<ItemIdForSlot<'utility'>, Item> = {
	empty: {},
	bandage: bandage,
	bomb: bomb,
	poisonDart: poisonDart,
}

export const bodyItems: Record<ItemIdForSlot<'body'>, Item> = {
	rags: {},
	plateMail: plateMail,
	leatherArmor: leatherArmor,
	theifCloak: theifCloak,
}

export const items: Record<ItemId, Item> = {
	...weapons,
	...utilityItems,
	...bodyItems
} satisfies Record<ItemId, Item>



import type { AggroModifier, BattleEvent, HealthModifier, HealthModifierEvent, UnitId } from '$lib/utils';
import { damageEnemy, enemiesInScene, pushAnimation, takePoisonDamage, type ActiveEnemy } from './enemies';
import { pushHappening } from './messaging';
import type { Player } from './users';

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
	itemTargeting?: GeneratesActionsFor
	actions?: (player: Player) => void
	actionForEnemy?: (player: Player, enemy: ActiveEnemy) => void
	actionForFriendly?: (player: Player, friend: Player) => void
	onTakeDamage?: (incoming: number) => number
	warmup?: number
	cooldown?:number
	startStock?: number
	useableOutOfBattle?: boolean
}

export type GeneratesActionsFor = 'enemies' | 'friendlies' | 'noTarget'

const dagger: Item = {
	itemTargeting: 'enemies',
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Attack ${enemy.name} with Dagger`,
				provoke: 7,
				speed: 8,
				slot: 'weapon',
				target: enemy.unitId,
				performAction() {
								return {
									sourcePlayer: player,
									targetEnemy: enemy,
									baseDamageToTarget:7,
									strikes:3,
									behavior: 'melee',
								} satisfies BattleEvent
				}
			}
		)
	}
}

const club: Item = {
	itemTargeting: 'enemies',
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Hit ${enemy.name} with Club`,
				provoke: 40,
				speed: 2,
				slot: 'weapon',
				target: enemy.unitId,
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

const fireStaff: Item = {
	itemTargeting: 'enemies',
	warmup: 2,
	cooldown:1,
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Blast ${enemy.name} with Firebolt`,
				provoke: 60,
				speed: 1,
				slot: 'weapon',
				target: enemy.unitId,
				performAction() {
					let r = damageEnemy(player, enemy, 100)
					if (r.dmgDone > 0) {
						pushAnimation(
							{
								sceneId: player.currentScene,
								battleAnimation: {
									source: player.unitId,
									target: enemy.unitId,
									damageToTarget: r.dmgDone,
									behavior: 'missile',
									extraSprite: 'flame',
								}
							})
					}
				}
			}
		)
	}
}

const bandage: Item = {
	itemTargeting: 'friendlies',
	startStock: 2,
	useableOutOfBattle: true,
	actionForFriendly(player, friend) {
		if (friend.health < friend.maxHealth && friend.health > 0) {
			player.itemActions.push(
				{
					buttonText: `Heal ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with bandage`,
					speed: 15,
					provoke: 1,
					slot: 'utility',
					target: friend.unitId,
					performAction: () => {
							if (friend.heroName != player.heroName) {
										return {
											sourcePlayer: player,
											targetPlayer: friend,
											baseHealingToTarget: 90,
											behavior: 'melee',
										} satisfies BattleEvent
							} else {
										return {
											sourcePlayer: player,
											baseHealingToSource: 90,
											behavior: 'selfInflicted',
											extraSprite: 'flame'
										}
							}
					},
				}
			)
		}
	}
}

const bomb: Item = {
	itemTargeting: 'noTarget',
	startStock: 1,
	actions(player) {
		player.itemActions.push({
			buttonText: 'Throw Powderbomb',
			speed: 12,
			provoke: 5,
			slot: 'utility',
			performAction() {
				let dmgs: HealthModifierEvent[] = []
				// let aggroAffected: AggroModifier[] = []
				for (const enemy of enemiesInScene(player.currentScene)) {
				// 	for (const key of enemy.aggros.keys()) {
				// 		let prevAggro = enemy.aggros.get(key)
				// 		if (prevAggro != undefined) {
				// 			let newAggro = prevAggro - 20
				// 			if (newAggro < 1) newAggro = 0
				// 			enemy.aggros.set(key, newAggro);
				// 			aggroAffected.push({
				// 				target: enemy.unitId,
				// 				amount: 20,
				// 				showFor: 'all',
				// 			})
				// 		}
				// 	}
						dmgs.push({
							baseDamage: 5,
							targetEnemy: enemy
						} )
				}
						return {
							sourcePlayer: player,
							behavior: 'center',
							extraSprite: 'bomb',
							alsoDamages: dmgs,
							// alsoModifiesAggro: aggroAffected
						} satisfies BattleEvent
			},
		})
	},
}

const poisonDart: Item = {
	itemTargeting: 'enemies',
	startStock: 2,
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Throw poison dart at ${enemy.name}`,
				provoke: 40,
				speed: 20,
				slot: 'utility',
				target: enemy.unitId,
				performAction() {
							return {
								sourcePlayer: player,
								targetEnemy: enemy,
								putsStatuses: [{ targetEnemy: enemy, status: 'poison', count:3 }],
								baseDamageToTarget: 3,
								behavior: 'missile',
								extraSprite: 'arrow',
							} satisfies BattleEvent
				},
			}
		)
	},
}

const plateMail: Item = {
	itemTargeting: 'noTarget',
	cooldown:2,
	actions(player) {
		player.itemActions.push({
			provoke: 5,
			buttonText: 'Taunt',
			slot: 'body',
			speed: 999,
			performAction() {
				for (const enemy of enemiesInScene(player.currentScene)) {
					enemy.aggros.set(player.heroName, 100)
				}
				pushAnimation({
					sceneId: player.currentScene,
					battleAnimation: {
						behavior: 'center',
						source: player.unitId,
						extraSprite: 'bomb',
						alsoModifiesAggro: enemiesInScene(player.currentScene).map((e) => {
							return {
								target: e.unitId,
								setTo: 100,
								showFor: 'onlyme'
							}
						})
					}
				})
				pushHappening(`${player.heroName} infuriates enemies!`)
			},
		})
	},
	onTakeDamage(incoming) {
		if (incoming > 20) {
			return 20
		}
		return incoming
	},
}

const theifCloak: Item = {
	itemTargeting: 'noTarget',
	cooldown:3,
	actions(player) {
		player.itemActions.push({
			buttonText: 'Hide in shadows',
			speed: 999,
			slot: 'body',
			provoke: 30,
			performAction() {
				pushHappening(`${player.heroName} hid in shadows`)
					return {
						behavior: 'selfInflicted',
						sourcePlayer: player,
						extraSprite: 'bomb',
						putsStatuses: [{ targetPlayer: player, status: 'hidden', count:2 }],
					} satisfies BattleEvent
			},
		})
	},
}

const leatherArmor: Item = {
	itemTargeting: 'noTarget',
	useableOutOfBattle: true,
	onTakeDamage(incoming) {
		if (incoming < 6) {
			return 1
		}
		return incoming - 5
	},
	actionForFriendly(player, friend) {
		if (friend.statuses.poison > 0) {
			player.itemActions.push(
				{
					buttonText: `Cure ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with ranger's herbs`,
					grantsImmunity: true,
					speed: 5,
					provoke: 0,
					slot: 'body',
					target: friend.unitId,
					performAction: () => {
						if (friend.heroName != player.heroName) {
									return {
										sourcePlayer: player,
										targetPlayer: friend,
										behavior: 'melee',
										putsStatuses: [{ targetPlayer: friend, status: 'poison', remove: true }]
									} satisfies BattleEvent
						} else {
									return {
										sourcePlayer: player,
										behavior: 'selfInflicted',
										extraSprite: 'bomb',
										putsStatuses: [{ targetPlayer: player, status: 'poison', remove: true }]
									} satisfies BattleEvent
						}
					},
				}
			)
		}

	}
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



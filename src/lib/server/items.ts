import type { AggroModifier, HealthModifier, UnitId } from '$lib/utils';
import { damageEnemy, enemiesInScene, pushAnimation, takePoisonDamage, type ActiveEnemy } from './enemies';
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
		// for (const enemy of enemiesInScene(player.currentScene)) {
		player.itemActions.push(
			{
				buttonText: `Attack ${enemy.name} with Dagger`,
				provoke: 7,
				speed: 8,
				slot: 'weapon',
				target: enemy.unitId,
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
		// }
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
						let r = healPlayer(friend, 90)
						if (r.healed > 0) {
							if (friend.heroName != player.heroName) {
								pushAnimation(
									{
										sceneId: player.currentScene,
										battleAnimation: {
											source: player.unitId,
											target: friend.unitId,
											damageToTarget: r.healed * -1,
											behavior: 'melee',
										}
									}
								)
							} else {
								pushAnimation(
									{
										sceneId: player.currentScene,
										battleAnimation: {
											source: player.unitId,
											damageToSource: r.healed * -1,
											behavior: 'selfInflicted',
											extraSprite: 'flame'
										}
									}
								)
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
				let dmgs: HealthModifier[] = []
				let aggroAffected: AggroModifier[] = []
				for (const enemy of enemiesInScene(player.currentScene)) {
					for (const key of enemy.aggros.keys()) {
						let prevAggro = enemy.aggros.get(key)
						if (prevAggro != undefined) {
							let newAggro = prevAggro - 20
							if (newAggro < 1) newAggro = 0
							enemy.aggros.set(key, newAggro);
							aggroAffected.push({
								target: enemy.unitId,
								amount: 20,
								showFor: 'all',
							})
						}
					}
					let r = damageEnemy(player, enemy, 5)
					if (r.dmgDone > 0) {
						dmgs.push({
							amount: r.dmgDone,
							target: enemy.unitId
						})
					}
				}
				pushAnimation(
					{
						sceneId: player.currentScene,
						battleAnimation: {
							source: player.unitId,
							behavior: 'center',
							extraSprite: 'bomb',
							alsoDamages: dmgs,
							alsoModifiesAggro: aggroAffected
						}
					})
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
					let found = enemy.statuses.get(player.heroName)
					if (!found) {
						found = {
							poison: 0,
							rage: 0,
							hidden: 0,
						}
					}
					// found = enemy.statuses.get(player.heroName)
					if (found.poison < 3) {
						found.poison = 3
					}
					enemy.statuses.set(player.heroName, found)

					let r = damageEnemy(player, enemy, 1)
					pushAnimation(
						{
							sceneId: player.currentScene,
							battleAnimation: {
								source: player.unitId,
								target: enemy.unitId,
								putsStatuses: [{ target: enemy.unitId, status: 'poison' }],
								damageToTarget: r.dmgDone,
								behavior: 'missile',
								extraSprite: 'arrow',
							}
						})
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
				player.statuses.hidden = 2
				pushHappening(`${player.heroName} hid in shadows`)
				pushAnimation({
					sceneId: player.currentScene,
					battleAnimation: {
						behavior: 'selfInflicted',
						source: player.unitId,
						extraSprite: 'bomb',
						putsStatuses: [{ target: player.unitId, status: 'hidden' }],
					}
				})
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
						friend.statuses.poison = 0
						if (friend.heroName != player.heroName) {
							pushAnimation(
								{
									sceneId: player.currentScene,
									battleAnimation: {
										source: player.unitId,
										target: friend.unitId,
										behavior: 'melee',
										putsStatuses: [{ target: friend.unitId, status: 'poison', remove: true }]
									}
								}
							)
						} else {
							pushAnimation(
								{
									sceneId: player.currentScene,
									battleAnimation: {
										source: player.unitId,
										behavior: 'selfInflicted',
										extraSprite: 'bomb',
										putsStatuses: [{ target: player.unitId, status: 'poison', remove: true }]
									}
								}
							)
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



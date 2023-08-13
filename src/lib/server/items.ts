import { addAggro, damageEnemy, enemiesInScene, takePoisonDamage } from './enemies';
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
}

export type ItemState = ItemStateForSlot<EquipmentSlot>

export type Inventory = {
	[T in EquipmentSlot]: ItemStateForSlot<T>
}

export type Item = {
	actions?: (player: Player) => void
	onTakeDamage?: (incoming: number) => number
	warmup?: number
}

const dagger: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Attack ${enemy.name} with Dagger`,
					provoke: 7,
					speed: 8,
					performAction() {
						damageEnemy(player, enemy, 7)
						damageEnemy(player, enemy, 7)
						damageEnemy(player, enemy, 7)
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
					performAction() {
						damageEnemy(player, enemy, 25)
					}
				}
			)
		}
	}
}

const fireStaff: Item = {
	warmup:2,
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Blast ${enemy.name} with Firebolt`,
					provoke: 60,
					speed: 10,
					performAction() {
						damageEnemy(player, enemy, 40)
						player.inventory.weapon.cooldown = 2
					}
				}
			)
		}
	}
}

const bandage: Item = {
	actions(player) {
		for (const friend of activePlayersInScene(player.currentScene)) {
			if (friend.health < friend.maxHealth) {
				player.itemActions.push(
					{
						buttonText: `Heal ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with bandage`,
						grantsImmunity: true,
						provoke: 1,
						performAction: () => {
							healPlayer(friend, 40)
							player.inventory.utility.itemId = 'empty'
						},
					}
				)
			}
		}
	}
}

const bomb: Item = {
	actions(player) {
		if (enemiesInScene(player.currentScene).length) {
			player.itemActions.push({
				buttonText: 'Throw Powderbomb',
				speed: 12,
				performAction() {
					for (const enemy of enemiesInScene(player.currentScene)) {
						enemy.aggros.clear()
						damageEnemy(player, enemy, 5)
					}
					player.inventory.utility.itemId = 'empty'
				},
			})
		}
	},
}

const poisonDart: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Throw poison dart at ${enemy.name}`,
					provoke: 100,
					performAction() {
						let found = enemy.statuses.find(s => s.status == 'poison')
						if (found != undefined) {
							found.counter = 3
						} else {
							enemy.statuses.push({ status: 'poison', counter: 2 })
						}
						takePoisonDamage(enemy)
						player.inventory.utility.itemId = 'empty'
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
				provoke: 100,
				buttonText: 'Taunt',
				performAction() {
					player.inventory.body.cooldown = 2
					pushHappening(`----`)
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
				performAction() {
					// for (const enemy of enemiesInScene(player.currentScene)) {
					// 	enemy.aggros.delete(player.heroName)
					// }
					player.inventory.body.cooldown = 3
					pushHappening(`----`)
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
	theifCloak:theifCloak,
}

export const items: Record<ItemId, Item> = {
	...weapons,
	...utilityItems,
	...bodyItems
} satisfies Record<ItemId, Item>



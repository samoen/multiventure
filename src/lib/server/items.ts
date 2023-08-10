import { addAggro, damageEnemy, enemiesInScene } from './enemies';
import { pushHappening } from './messaging';
import { activePlayersInScene, healPlayer, type Player } from './users';

export type EquipmentSlot =
	| 'weapon'
	| 'utility'
	| 'body'

export type ItemIdForSlot<T extends EquipmentSlot> =
	 T extends 'weapon' ?
	 	| 'unarmed'
		| 'shortBow'
		| 'shortSword'
		: T extends 'utility' ?
		| 'empty'
		| 'bandage'
		| 'bomb'
		: T extends 'body' ?
		| 'rags'
		| 'leatherArmor'
		| 'plateMail'
		: never

export type ItemId = ItemIdForSlot<EquipmentSlot>

export type ItemStateForSlot<T extends EquipmentSlot> = {
	itemId: ItemIdForSlot<T>;
	cooldown: number;
}

export type ItemState = ItemStateForSlot<EquipmentSlot>

export type Inventory = {
	[T in EquipmentSlot]: ItemStateForSlot<T>
}

export type Item = {
	actions?: (player: Player) => void
	onTakeDamage?: (incoming: number) => number
}

const shortSword: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Slash ${enemy.name} with my short sword`,
					provoke:7,
					speed:2,
					performAction() {
						damageEnemy(player, enemy, 30)
					}
				}
			)
		}
	}
}

const shortBow: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.itemActions.push(
				{
					buttonText: `Fire an arrow at ${enemy.name}`,
					provoke: 2,
					speed:6,
					performAction() {
						damageEnemy(player, enemy, 10)
						player.inventory.weapon.cooldown = 1
					}
				}
			)
		}
	}
}

const bandage: Item = {
	actions(player) {
		for (const friend of activePlayersInScene(player.currentScene)) {
			if(friend.health < friend.maxHealth){
				player.itemActions.push(
					{
						buttonText: `Heal ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with bandage`,
						grantsImmunity:true,
						provoke:1,
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

const bomb : Item = {
	actions(player) {
		if(enemiesInScene(player.currentScene).length){
			player.itemActions.push({
				buttonText:'Throw bomb',
				speed:12,
				performAction() {
					for (const enemy of enemiesInScene(player.currentScene)) {
						enemy.aggros.clear()
						damageEnemy(player, enemy, 15)
					}
					player.inventory.utility.itemId = 'empty'
				},
			})
		}
	},
}

const plateMail: Item = {
	actions(player) {
		if(enemiesInScene(player.currentScene).length){
			player.itemActions.push({
				provoke:100,
				buttonText:'Taunt',
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

const leatherArmor: Item = {
	actions(player) {
		if(enemiesInScene(player.currentScene).length){
			player.itemActions.push({
				buttonText:'Hide in shadows',
				grantsImmunity:true,
				performAction() {
					for (const enemy of enemiesInScene(player.currentScene)) {
						enemy.aggros.delete(player.heroName)
					}
					player.inventory.body.cooldown = 3
					pushHappening(`----`)
					pushHappening(`${player.heroName} hid in shadows`)
				},
			})
		}
	},
	onTakeDamage(incoming) {
		if (incoming < 6) {
			return 1
		}
		return incoming - 5
	},
}

export const weapons: Record<ItemIdForSlot<'weapon'>, Item> = {
	unarmed: {},
	shortBow: shortBow,
	shortSword: shortSword,
};

export const utilityItems: Record<ItemIdForSlot<'utility'>, Item> = {
	empty: {},
	bandage: bandage,
	bomb: bomb,
}

export const bodyItems: Record<ItemIdForSlot<'body'>, Item> = {
	rags: {},
	plateMail: plateMail,
	leatherArmor: leatherArmor,
}

export const items: Record<ItemId, Item> = {
	...weapons,
	...utilityItems,
	...bodyItems
} satisfies Record<ItemId, Item>



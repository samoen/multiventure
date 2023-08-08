import { addAggro, damageEnemy, enemiesInScene } from './enemies';
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


const shortBow: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.actions.push(
				{
					buttonText: `Fire an arrow at ${enemy.name}`,
					performAction() {
						damageEnemy(player, enemy, 10)
						addAggro(player, 5)
						player.inventory.weapon.cooldown = 2
					}
				}
			)
		}
	}
}

const shortSword: Item = {
	actions(player) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			player.actions.push(
				{
					buttonText: `Slash ${enemy.name} with my short sword`,
					performAction() {
						damageEnemy(player, enemy, 30)
						addAggro(player, 50)
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
				player.actions.push(
					{
						buttonText: `Heal ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with bandage`,
						performAction: () => {
							healPlayer(friend, 40)
							addAggro(player, 1)
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
			player.actions.push({
				buttonText:'Throw bomb',
				performAction() {
					for (const enemy of enemiesInScene(player.currentScene)) {
						damageEnemy(player, enemy, 15)
					}
					addAggro(player, 1)
					player.inventory.utility.itemId = 'empty'
				},
			})
		}
	},
}

const plateMail: Item = {
	onTakeDamage(incoming) {
		if (incoming > 20) {
			return 20
		}
		return incoming
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



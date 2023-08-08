import { activePlayersInScene } from './actions';
import { activeEnemies, addAggro, damageEnemy } from './enemies';
import { pushHappening } from './messaging';
import type { Player } from './users';

export type EquipmentSlot =
	| 'weapon'
	| 'utility'
	| 'body'

export type ItemIdForSlot<T extends EquipmentSlot> =
	T extends 'weapon' ? 
		| 'fist'
		| 'shortBow'
		| 'shortSword'
	: T extends 'utility' ? 
		| 'nothing' 
		| 'bandage' 
	: T extends 'body' ? 	
		| 'rags' 
		| 'leatherArmor' 
		| 'plateMail' 
	: never

export type ItemId = ItemIdForSlot<EquipmentSlot>

export type ItemStateForSlot<T extends EquipmentSlot> = {
	itemId:ItemIdForSlot<T>;
	cooldown:number;
}

export type ItemState = ItemStateForSlot<EquipmentSlot>

export type Inventory = {
	[T in EquipmentSlot] : ItemStateForSlot<T>
}

export type ItemTemplate = {
	actions?: (actor: Player) => void
	onTakeDamage?: (incoming: number) => number
}

const bandage: ItemTemplate = {
	actions(actor) {
		for (const friend of activePlayersInScene(actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `Heal ${friend.heroName == actor.heroName ? 'myself' : friend.heroName} with bandage`,
					performAction: () => {
						friend.health += 10;
						addAggro(actor, 1)
						actor.inventory.utility.itemId = 'nothing'
						pushHappening(
							`${actor.heroName} healed ${friend.heroName == actor.heroName ? 'themself' : friend.heroName
							} for 10hp`
						);
					},
				}
			)
		}
	}
}

const fist: ItemTemplate = {
	actions(actor: Player) {
		for (const enemy of activeEnemies.filter(e => e.currentScene == actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `punch ${enemy.name}`,
					performAction() {
						damageEnemy(actor, enemy, 2)
						addAggro(actor, 2)
					}
				}
			)
		}
	}
}

const shortBow: ItemTemplate = {
	actions(actor: Player) {
		for (const enemy of activeEnemies.filter(e => e.currentScene == actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `Fire an arrow at ${enemy.name}`,
					performAction() {
						damageEnemy(actor, enemy, 5)
						addAggro(actor, 10)
						actor.inventory.weapon.cooldown = 2
					}
				}
			)
		}
	}
}

const shortSword: ItemTemplate = {
	actions(actor: Player) {
		for (const enemy of activeEnemies.filter(e => e.currentScene == actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `Slash ${enemy.name} with my short sword`,
					performAction() {
						damageEnemy(actor, enemy, 10)
						addAggro(actor, 90)
					}
				}
			)
		}
	}
}

const plateMail: ItemTemplate = {
	onTakeDamage(incoming) {
		if (incoming > 20) {
			return 20
		}
		return incoming
	},
}

const leatherArmor: ItemTemplate = {
	onTakeDamage(incoming) {
		if (incoming < 6) {
			return 1
		}
		return incoming - 5
	},
}

export const weapons: Record<ItemIdForSlot<'weapon'>, ItemTemplate> = {
	fist: fist,
	shortBow: shortBow,
	shortSword: shortSword,
};

export const utilityItems: Record<ItemIdForSlot<'utility'>, ItemTemplate> = {
	bandage: bandage,
	nothing: {},
}

export const bodyItems: Record<ItemIdForSlot<'body'>, ItemTemplate> = {
	rags: {},
	plateMail: plateMail,
	leatherArmor: leatherArmor,
}

export const items : Record<ItemId, ItemTemplate> = {
	...weapons,
	...utilityItems,
	...bodyItems
} satisfies Record<ItemId, ItemTemplate>



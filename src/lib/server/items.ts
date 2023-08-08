import { activePlayersInScene } from './actions';
import { activeEnemies, addAggro, damageEnemy } from './enemies';
import { pushHappening } from './messaging';
import type { Player } from './users';

export type WeaponItemKey =
	| 'fist'
	| 'shortBow'
	| 'shortSword'

export type UtilityItemKey =
	| 'nothing'
	| 'bandage'

export type BodyItemKey =
	| 'rags'
	| 'leatherArmor'
	| 'plateMail'


export type Item = {
	actions?: (actor: Player) => void
	onTakeDamage?: (incoming: number) => number
}

const bandage: Item = {
	actions(actor) {
		for (const friend of activePlayersInScene(actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `Heal ${friend.heroName == actor.heroName ? 'myself' : friend.heroName} with bandage`,
					performAction: () => {
						friend.health += 10;
						addAggro(actor, 1)
						actor.utility = 'nothing'
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

const fist: Item = {
	actions(actor: Player) {
		for (const enemy of activeEnemies.filter(e => e.currentScene == actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `punch ${enemy.name}`,
					performAction() {
						addAggro(actor, 2)
						damageEnemy(actor, enemy, 2)
					}
				}
			)
		}
	}
}

const shortBow: Item = {
	actions(actor: Player) {
		for (const enemy of activeEnemies.filter(e => e.currentScene == actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `Fire an arrow at ${enemy.name}`,
					performAction() {
						addAggro(actor, 10)
						damageEnemy(actor, enemy, 5)
						actor.weaponCooldown = 2
					}
				}
			)
		}
	}
}

const shortSword: Item = {
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

const plateMail : Item = {
	onTakeDamage(incoming) {
		if(incoming > 20){
			return 20
		}
		return incoming	
	},
}

const leatherArmor : Item = {
	onTakeDamage(incoming) {
		if(incoming < 6){
			return 1
		}
		return incoming	- 5
	},
}

export const weapons: Record<WeaponItemKey, Item> = {
	fist: fist,
	shortBow: shortBow,
	shortSword: shortSword,
};

export const utilityItems: Record<UtilityItemKey, Item> = {
	bandage: bandage,
	nothing: {},
}

export const bodyItems: Record<BodyItemKey, Item> = {
	rags: {},
	plateMail:plateMail,
	leatherArmor:leatherArmor,
}



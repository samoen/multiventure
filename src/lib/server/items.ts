import { activePlayersInScene } from './actions';
import { activeEnemies, addAggro, damageEnemy } from './enemies';
import { pushHappening } from './messaging';
import type { Player } from './users';

export type ItemKey = 'bandage' | 'shortBow' | 'shortSword';

export type Item = (actor: Player) => void

export const items: Record<ItemKey, Item> = {
	bandage(actor: Player) {
		for (const friend of activePlayersInScene(actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `Heal ${friend.heroName == actor.heroName ? 'myself' : friend.heroName} with bandage`,
					performAction: () => {
						friend.health += 10;
						addAggro(actor, 1)
						actor.inventory = actor.inventory.filter((i) => i != 'bandage');
						pushHappening(
							`${actor.heroName} healed ${friend.heroName == actor.heroName ? 'themself' : friend.heroName
							} for 10hp`
						);
					},
				}
			)
		}
	},
	shortBow(actor: Player) {
		for (const enemy of activeEnemies.filter(e => e.currentScene == actor.currentScene)) {
			actor.actions.push(
				{
					buttonText: `Fire an arrow at ${enemy.name}`,
					performAction() {
						addAggro(actor, 10)
						damageEnemy(actor, enemy, 5)
					}
				}
			)
		}
	},
	shortSword(actor: Player) {
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
	},
};

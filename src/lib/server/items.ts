import { activePlayersInScene, type ActionGenerator } from './actions';
// import { users, type Player } from './users';
import { pushHappening, recentHappenings } from './messaging';
import { activeEnemies, damageEnemy, type ActiveEnemy } from './enemies';
import type { Player } from './users';
// import { damageEnemy, type ActiveEnemy } from './enemies';

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
						const dmgResult = damageEnemy(actor, enemy, 10)
						if (!dmgResult.killed) {
							actor.health -= enemy.template.attackDamage
							pushHappening(`${enemy.name} hit ${actor.heroName} for ${enemy.template.attackDamage} damage`)
						}
					}

				}
			)
		}
	},
};

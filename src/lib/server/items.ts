import type { ActionGenerator } from './actions';
import type { User } from './users';
import { pushHappening } from './messaging';

export type ItemKey = keyof typeof items;

export const items : Record<string, ActionGenerator>= {
	bandage: {
		targeting: 'usersInScene',
		generate: (actor: User, target: User) => {
			return {
				onAct: () => {
					target.health += 10;
					actor.inventory = actor.inventory.filter((i) => i != 'bandage');
					pushHappening(
						`${actor.heroName} healed ${
							target.heroName == actor.heroName ? 'themself' : target.heroName
						} for 10hp`
					);
				},
				buttonText: `bandage up ${target.heroName == actor.heroName ? 'self' : target.heroName}`
			};
		}
	},
	shortBow: {
		targeting: 'enemiesInScene',
		generate(actor, target) {
			return {
				buttonText:`fire an arrow at ${target.name}`,
				onAct(){
					target.currentHealth -= 10
					actor.extraTexts = ["Direct hit!"]
				}
			}
		}
	},
	shortSword: {
		targeting: 'enemiesInScene',
		generate(actor, target) {
			return {
				buttonText:`slash ${target.name} with your short sword`,
				onAct(){
					target.currentHealth -= 10
					actor.health -= target.template.attackDamage
					actor.extraTexts = ["You slashed the enemy and took a hit retaliation"]
				}
			}
		}
	}
};

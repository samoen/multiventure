import type { ActionGenerator } from './actions';
import type { User } from './users';
import { pushHappening } from './messaging';

export type ItemKey = keyof typeof items;

export const items : Record<string, ActionGenerator>= {
	bandage: {
		targeting: 'usersInScene',
		generate: (actor: User, target: User) => {
			return {
				id: `${actor.heroName}bandage${target.heroName}`,
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
			// return {
			// 	id:``
			// }
			// target.currentHealth -= 10
			return null
		}
	},
	shortSword: {
		targeting: 'enemiesInScene',
		generate(actor, target) {
			return null;
		}
	}
};

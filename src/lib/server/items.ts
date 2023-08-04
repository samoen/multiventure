import type { ActionGenerator } from './actions';
import type { User } from './users';
import { pushHappening } from './messaging';

export type ItemKey = keyof typeof items;

export const items = {
	greenGem: {
		targetKind: 'onlySelf',
		generate: (actor: User) => {
			if (actor.currentScene != 'forest') return null;
			return {
				id: `goForestPassage`,
				buttonText: `use green gem`,
				onAct: () => {
					actor.currentScene = 'forestPassage';
				}
			};
		}
	},
	bandage: {
		targetKind: 'usersInRoom',
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
		targetKind: 'usersInRoom',
		generate(actor, target) {
			return null;
		}
	},
	shortSword: {
		targetKind: 'usersInRoom',
		generate(actor, target) {
			return null;
		}
	}
} as const satisfies Record<string, ActionGenerator>;

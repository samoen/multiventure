import type { ActionGenerator } from './actions';
import type { User } from './users';
import { pushHappening, recentHappenings } from './messaging';
import { damageEnemy } from './enemies';

export type ItemKey = 'bandage' | 'shortBow' | 'shortSword';

export const items : Record<ItemKey, ActionGenerator>= {
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
				buttonText: `Heal ${target.heroName == actor.heroName ? 'myself' : target.heroName} with bandage`
			};
		}
	},
	shortBow: {
		targeting: 'enemiesInScene',
		generate(actor, target) {
			return {
				buttonText:`Fire an arrow at ${target.name}`,
				onAct(){
					damageEnemy(actor,target,5)
				}
			}
		}
	},
	shortSword: {
		targeting: 'enemiesInScene',
		generate(actor, target) {
			return {
				buttonText:`Slash ${target.name} with my short sword`,
				onAct(){
					const dmgResult = damageEnemy(actor,target,10)
					if(!dmgResult.killed){
						actor.health -= target.template.attackDamage
						pushHappening(`${target.name} hit ${actor.heroName} for ${target.template.attackDamage} damage`)
					}
				}
			}
		}
	}
};

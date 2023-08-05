import type { ActionGenerator } from './actions';
import type { Player } from './users';
import { pushHappening, recentHappenings } from './messaging';
import { damageEnemy } from './enemies';

export type ItemKey = 'bandage' | 'shortBow' | 'shortSword';

export const items : Record<ItemKey, ActionGenerator>= {
	bandage: {
		targeting: 'friendlies',
		generate: (actor: Player, target: Player) => {
			return {
				performAction: () => {
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
		targeting: 'enemies',
		generate(actor, target) {
			return {
				buttonText:`Fire an arrow at ${target.name}`,
				performAction(){
					damageEnemy(actor,target,5)
				}
			}
		}
	},
	shortSword: {
		targeting: 'enemies',
		generate(actor, target) {
			return {
				buttonText:`Slash ${target.name} with my short sword`,
				performAction(){
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

import type { ActionGenerator } from './actions';
import type { User } from './users';
import { pushHappening } from './messaging';
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
					const dmgResult = damageEnemy(target,5)
					actor.extraTexts = [`Your arrow hit ${target.name}!`]
					if(dmgResult.killed){
						actor.extraTexts.push(`${target.name} dies from the arrow`)
					}
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
					const dmgResult = damageEnemy(target,10)
					actor.health -= target.template.attackDamage
					actor.extraTexts = [`You slashed ${target.name} but took a hit in retaliation`]
					if(dmgResult.killed){
						actor.extraTexts.push(`${target.name} was slain by your sword`)
					}
				}
			}
		}
	}
};

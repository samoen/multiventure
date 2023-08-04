import type { ActionGenerator, SelfActionGenerator } from './actions';
import type { User } from './users';

export type SceneKey = 'forest' | 'castle' | 'throne' | 'forestPassage';
export type Scene = {
	text: string;
	onEnter?: (user: User) => void;
	options: ActionGenerator[];
};

export function basicTravelAction(to: SceneKey, buttonText: string): SelfActionGenerator {
	return {
		targetKind: 'onlySelf',
		generate(actor) {
			return {
				id: `travelTo${to}`,
				onAct(){
					actor.currentScene = to;
				},
				buttonText: buttonText
			}
		}
	};
}

export const scenes : Record<SceneKey,Scene> = {
	forest: {
		text: 'You find yourself in the forest',
		options: [basicTravelAction('castle', 'hike to castle')]
	},
	castle: {
		text: 'You are in a cool castle',
		onEnter(user){
			if (!user.inventory.includes('bandage')) {
				user.inventory.push('bandage');
				user.extraTexts.push('A passing soldier gives you a bandage');
			}
		},
		options: [
			basicTravelAction('forest', 'Delve back into forest'),
			basicTravelAction('throne', 'Approach the throne!')
		]
	},
	throne: {
		text: 'You enter the throne room',
		onEnter(user){
			if (!user.inventory.includes('greenGem')) {
				user.inventory.push('greenGem');
				user.extraTexts.push('You receive a green gem useful for finding forest passages');
			}
		},
		options: [basicTravelAction('castle', 'Leave the throne room')]
	},
	forestPassage: {
		text: 'Guided by the green gem, you enter a hidden forest passage',
		onEnter(user){
			if (!user.flags.has('gotFreeForestWeapon')) {
				user.extraTexts.push('A forest spirit asks you - would you like a sword or a bow?');
			}
		},
		options: [
			basicTravelAction('forest', 'get out of this dank passage it stinks'),
			{
				targetKind: 'onlySelf',
				generate(actor : User){
					if (actor.flags.has('gotFreeForestWeapon')) return null;
					return {
						id: 'chooseBow',
						buttonText: 'I am skillful, I choose the bow',
						onAct: () => {
							actor.inventory.push('shortBow');
							actor.flags.add('gotFreeForestWeapon');
							actor.extraTexts = [];
						}
					};
				}
			},
			{
				targetKind: 'onlySelf',
				generate(actor: User){
					if (actor.flags.has('gotFreeForestWeapon')) return null;
					return {
						id: 'chooseSword',
						buttonText: 'I am mighty, I will take of the sword!',
						onAct: () => {
							actor.inventory.push('shortSword');
							actor.flags.add('gotFreeForestWeapon');
							actor.extraTexts = [];
						}
					};
				}
			}
		]
	}
};

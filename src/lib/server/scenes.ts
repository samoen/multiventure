import type { ActionGenerator, SelfActionGenerator } from './actions';
import type { User } from './users';

export type SceneKey = 'forest' | 'castle' | 'throne' | 'forestPassage';
export type Scene = {
	text: string;
	onEnter?: (user: User) => void;
	options: ActionGenerator[];
};

export const scenes : Record<SceneKey,Scene> = {
	forest: {
		text: `You are in a forest. It's wet and dank. You see a castle in the distance`,
		options: [
			simpleTravel('castle', 'Hike towards that castle'),
			{
				targeting: 'noTarget',
				generate: (actor: User) => {
					if (!actor.flags.has('heardAboutHiddenPassage')) return null;
					return {
						buttonText: `search deep into dense forest`,
						onAct: () => {
							actor.currentScene = 'forestPassage';
						}
					};
				}
			},
	]
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
			simpleTravel('forest', 'Delve back into forest'),
			simpleTravel('throne', 'Approach the throne room')
		]
	},
	throne: {
		text: 'You enter the throne room',
		onEnter(user){
			if (!user.flags.has('heardAboutHiddenPassage')) {
				user.flags.add('heardAboutHiddenPassage')
				user.extraTexts.push('The king tells you about a secret passage in the forest');
			}
		},
		options: [simpleTravel('castle', 'Leave the throne room')]
	},
	forestPassage: {
		text: 'You find a hidden forest passage. It leads to an ancient temple or something',
		onEnter(user){
			if (!user.flags.has('gotFreeStarterWeapon')) {
				user.extraTexts.push('A forest spirit appears! It speaks a question: "would you like a sword or a bow?"');
			}
		},
		options: [
			simpleTravel('forest', 'get out of this dank passage it stinks'),
			{
				targeting: 'noTarget',
				generate(actor : User){
					if (actor.flags.has('gotFreeStarterWeapon')) return null;
					return {
						buttonText: 'I am skillful, I choose the bow',
						onAct: () => {
							actor.inventory.push('shortBow');
							actor.flags.add('gotFreeStarterWeapon');
							actor.extraTexts = ["A bow appears before you. You take it"];
						}
					};
				}
			},
			{
				targeting: 'noTarget',
				generate(actor: User){
					if (actor.flags.has('gotFreeStarterWeapon')) return null;
					return {
						buttonText: 'I am mighty, I will take of the sword!',
						onAct: () => {
							actor.inventory.push('shortSword');
							actor.flags.add('gotFreeStarterWeapon');
							actor.extraTexts = ["A shiny sword materializes in your hand!"];
						}
					};
				}
			}
		]
	}
};

export function simpleTravel(to: SceneKey, buttonText: string): SelfActionGenerator {
	return {
		targeting: 'noTarget',
		generate(actor) {
			return {
				onAct(){
					actor.currentScene = to;
				},
				buttonText: buttonText
			}
		}
	};
}

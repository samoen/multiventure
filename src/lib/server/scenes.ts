import type { ActionGenerator, SelfActionGenerator } from './actions';
import { activeEnemies, enemyTemplates } from './enemies';
import type { User } from './users';

export type SceneKey = 'forest' | 'castle' | 'throne' | 'forestPassage' | 'goblinCamp';
export type Scene = {
	text: string;
	onEnter?: (user: User) => void;
	options: ActionGenerator[];
};

export const scenes : Record<SceneKey,Scene> = {
	forest: {
		text: `You are in a forest. It's wet and dank. You see a castle in the distance`,
		options: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Hike towards that castle',
						onAct(){
							actor.transitionText = 'Trudging through the overgrowth you finally arrive at the castle'
							actor.currentScene = 'castle';
						},
					}
				}
			},
			{
				targeting: 'noTarget',
				generate: (actor: User) => {
					if (!actor.flags.has('heardAboutHiddenPassage')) return null;
					return {
						buttonText: `Search deep into dense forest`,
						onAct: () => {
							actor.transitionText='you discover a hidden passage'
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
				user.extraTexts = 'A passing soldier gives you a bandage';
			}
		},
		options: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Delve into the forest',
						onAct(){
							actor.transitionText = 'You leave the safety of the castle and delve back into the forest'
							actor.currentScene = 'forest';
						},
					}
				}
			},
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Head towards the throne room',
						onAct(){
							actor.transitionText = 'You climb a huge staircase upwards, finally reaching the top'
							actor.currentScene = 'throne';
						},
					}
				}
			},
		]
	},
	throne: {
		text: 'You are in a throne room',
		onEnter(user){
			if (!user.flags.has('heardAboutHiddenPassage')) {
				user.flags.add('heardAboutHiddenPassage')
				user.extraTexts = 'The king tells you about a secret passage in the forest';
			}
		},
		options: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Take your leave',
						onAct(){
							actor.transitionText = 'You climb back down those darn steps. So many steps.'
							actor.currentScene = 'castle';
						},
					}
				}
			},
		]
	},
	forestPassage: {
		text: `You are in a hidden passage.`,
		onEnter(user){
			if (!user.flags.has('gotFreeStarterWeapon')) {
				user.extraTexts ='A forest spirit appears! It speaks a question: "would you like a sword or a bow?"';
			}
		},
		options: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Get out of this stinky passage',
						onAct(){
							actor.transitionText = 'You get out the passage, and stumble into the surrounding overgrowth'
							actor.currentScene = 'forest';
						},
					}
				}
			},
			{
				targeting: 'noTarget',
				generate(actor : User){
					if (actor.flags.has('gotFreeStarterWeapon')) return null;
					return {
						buttonText: 'I am skillful, I choose the bow',
						onAct: () => {
							actor.inventory.push('shortBow');
							actor.flags.add('gotFreeStarterWeapon');
							actor.extraTexts = "A bow appears before you. You take it";
						}
					};
				}
			},
			{
				targeting: 'noTarget',
				generate(actor: User){
					if (actor.flags.has('gotFreeStarterWeapon')) return null;
					return {
						buttonText: 'I am mighty, I will take the sword!',
						onAct(){
							actor.inventory.push('shortSword');
							actor.flags.add('gotFreeStarterWeapon');
							actor.extraTexts = "A shiny sword materializes in your hand!";
						}
					};
				}
			},
			{
				targeting:'noTarget',
				generate(actor) {
					if(!actor.flags.has('gotFreeStarterWeapon')) return null;
					return {
						buttonText:'Push through to the end of the passage',
						onAct() {
							actor.transitionText = 'You push through the passage. Oh no! You stumble into a goblin camp'
							actor.currentScene = 'goblinCamp'
						},
					}
				},
			}
		]
	},
	goblinCamp:{
		text:"You are in a goblin camp. It's not cool",
		onEnter(user) {
			if(!(activeEnemies.some(e=>e.name=='Gorlak') || activeEnemies.some(e=>e.name=='Murk'))){
				user.extraTexts = `A pair of goblins rush out of a tent.. "Hey Gorlak, looks like lunch!" "Right you are Murk lets eat!"`
				activeEnemies.push({
					name:'Gorlak',
					currentScene: 'goblinCamp',
					currentHealth:20,
					template:enemyTemplates.goblin,
				})
				activeEnemies.push({
					name:'Murk',
					currentScene: 'goblinCamp',
					currentHealth:20,
					template:enemyTemplates.goblin,
				})
			}
		},
		options:[
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Escape back through the passage',
						onAct(){
							actor.transitionText = 'You leave the camp and squeeze back into the dank passage'
							actor.currentScene = 'forestPassage';
						},
					}
				}
			}
		]
	}
};

// export function simpleTravel(to: SceneKey, buttonText: string, transitionText:string=''): SelfActionGenerator {
// 	return {
// 		targeting: 'noTarget',
// 		generate(actor) {
// 			return {
// 				onAct(){
// 					actor.transitionText = transitionText
// 					actor.currentScene = to;
// 				},
// 				buttonText: buttonText
// 			}
// 		}
// 	};
// }

import type { ActionGenerator, SelfActionGenerator } from './actions';
import { activeEnemies, enemyTemplates } from './enemies';
import type { Player } from './users';

export type SceneKey = 'forest' | 'castle' | 'throne' | 'forestPassage' | 'goblinCamp';
export type Scene = {
	mainSceneText: string;
	onEnterScene?: (user: Player) => void;
	sceneActions: ActionGenerator[];
};

export const scenes : Record<SceneKey,Scene> = {
	forest: {
		mainSceneText: `You are in a forest. It's wet and dank. You see a castle in the distance`,
		sceneActions: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Hike towards that castle',
						performAction(){
							actor.transitionSceneText = 'Trudging through the overgrowth you finally arrive at the castle'
							actor.currentScene = 'castle';
						},
					}
				}
			},
			{
				targeting: 'noTarget',
				generate: (actor: Player) => {
					if (!actor.flags.has('heardAboutHiddenPassage')) return null;
					return {
						buttonText: `Search deep into dense forest`,
						performAction: () => {
							actor.transitionSceneText='you discover a hidden passage'
							actor.currentScene = 'forestPassage';
						}
					};
				}
			},
	]
	},
	castle: {
		mainSceneText: 'You are in a cool castle',
		onEnterScene(user){
			if (!user.inventory.includes('bandage')) {
				user.inventory.push('bandage');
				user.duringSceneText = 'A passing soldier gives you a bandage';
			}
		},
		sceneActions: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Delve into the forest',
						performAction(){
							actor.transitionSceneText = 'You leave the safety of the castle and delve back into the forest'
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
						performAction(){
							actor.transitionSceneText = 'You climb a huge staircase upwards, finally reaching the top'
							actor.currentScene = 'throne';
						},
					}
				}
			},
		]
	},
	throne: {
		mainSceneText: 'You are in a throne room',
		onEnterScene(user){
			if (!user.flags.has('heardAboutHiddenPassage')) {
				user.flags.add('heardAboutHiddenPassage')
				user.duringSceneText = 'The king tells you about a secret passage in the forest';
			}
		},
		sceneActions: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Take your leave',
						performAction(){
							actor.transitionSceneText = 'You climb back down those darn steps. So many steps.'
							actor.currentScene = 'castle';
						},
					}
				}
			},
		]
	},
	forestPassage: {
		mainSceneText: `You are in a hidden passage.`,
		onEnterScene(user){
			if (!user.flags.has('gotFreeStarterWeapon')) {
				user.duringSceneText ='A forest spirit appears! It speaks a question: "would you like a sword or a bow?"';
			}
		},
		sceneActions: [
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Get out of this stinky passage',
						performAction(){
							actor.transitionSceneText = 'You get out the passage, and stumble into the surrounding overgrowth'
							actor.currentScene = 'forest';
						},
					}
				}
			},
			{
				targeting: 'noTarget',
				generate(actor : Player){
					if (actor.flags.has('gotFreeStarterWeapon')) return null;
					return {
						buttonText: 'I am skillful, I choose the bow',
						performAction: () => {
							actor.inventory.push('shortBow');
							actor.flags.add('gotFreeStarterWeapon');
							actor.duringSceneText = "A bow appears before you. You take it";
						}
					};
				}
			},
			{
				targeting: 'noTarget',
				generate(actor: Player){
					if (actor.flags.has('gotFreeStarterWeapon')) return null;
					return {
						buttonText: 'I am mighty, I will take the sword!',
						performAction(){
							actor.inventory.push('shortSword');
							actor.flags.add('gotFreeStarterWeapon');
							actor.duringSceneText = "A shiny sword materializes in your hand!";
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
						performAction() {
							actor.transitionSceneText = 'You push through the passage. Oh no! You stumble into a goblin camp'
							actor.currentScene = 'goblinCamp'
						},
					}
				},
			}
		]
	},
	goblinCamp:{
		mainSceneText:"You are in a goblin camp. It's not cool",
		onEnterScene(user) {
			if(!(activeEnemies.some(e=>e.name=='Gorlak') || activeEnemies.some(e=>e.name=='Murk'))){
				user.duringSceneText = `A pair of goblins rush out of a tent.. "Hey Gorlak, looks like lunch!" "Right you are Murk lets eat!"`
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
		sceneActions:[
			{
				targeting: 'noTarget',
				generate(actor) {
					return {
						buttonText: 'Escape back through the passage',
						performAction(){
							actor.transitionSceneText = 'You leave the camp and squeeze back into the dank passage'
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

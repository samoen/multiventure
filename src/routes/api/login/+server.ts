import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MessageFromServer } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag, globalFlags } from '$lib/server/users';
import { scenes, type SceneId, addSoloScenes } from '$lib/server/scenes';
import type { Inventory } from '$lib/server/items';

export const POST: RequestHandler = async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();

	if (!isJoin(msg)) {
		return json('malformed login', { status: 400 });
	}
	// if(players.has(msg.join) && players.get(msg.join).connectionState){
	//     return json('hero already connected', {status:401})
	// }
	console.log('logging in ' + msg.join);
	let player = users.get(msg.join)
	if (!player) {
		// new user

		// globalFlags.add('smashedMedallion')

		const startflags : Set<Flag>= new Set()
		// startflags.add('heardAboutHiddenPassage')
		// startflags.add('gotFreeStarterWeapon')
		// startflags.add('killedGoblins')

		let startScene : SceneId = 'forest'
		startScene = `tutorial_${msg.join}` 
		// startScene = 'forestPassage' 
		// startScene = 'throne'
		// startScene = 'armory'

		let startInventory :Inventory= {
			weapon:{
				itemId:'unarmed',
				cooldown:0,
				warmup:0,
			},
			utility:{
				itemId:'empty',
				cooldown:0,
				warmup:0,
			},
			body:{
				itemId:'rags',
				cooldown:0,
				warmup:0,
			}
		}

		player = {
			connectionState: null,
			heroName: msg.join,
			previousScene: 'dead',
			currentScene: startScene,
			inventory: startInventory,
			health: 100,
			maxHealth: 100,
			speed:0,
			sceneActions:[],
			itemActions:[],
			sceneTexts: [],
			flags: startflags,
		} satisfies Player

		addSoloScenes(msg.join)
		scenes.get(player.currentScene)?.onEnterScene(player)
		users.set(msg.join, player);
	}

	r.cookies.set('hero', msg.join, { path: '/',secure:false});

	if(player && player.connectionState != null){
		return json({ alreadyConnected: true });	
	}

	return json({ alreadyConnected: false });
};

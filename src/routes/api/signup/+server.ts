import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MessageFromServer } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag, globalFlags } from '$lib/server/users';
import { scenes, type SceneId, addSoloScenes } from '$lib/server/scenes';
import type { Inventory } from '$lib/server/items';
import { v4 } from 'uuid';

export const POST: RequestHandler = async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();
	console.log(`signup request ${JSON.stringify(msg)}`)
	if (!isJoin(msg)) {
		return json({error: 'malformed sign up request'}, { status: 400 });
	}
	// if(players.has(msg.join) && players.get(msg.join).connectionState){
		//     return json('hero already connected', {status:401})
		// }
		
	console.log(`signup checking name ${msg.join} is already in ${JSON.stringify(Array.from(users.values()).map(p=>p.heroName))}`)
	let nameTaken = Array.from(users.values()).some(p => p.heroName == msg.join)
	if (nameTaken) {
		console.log('name already taken')
		return json({error:'hero name taken'}, { status: 400 });
	}
	// r.cookies.get('uid')
	// let player = users.get(msg.join)
	// if (!player) {
		// new user
		
		// globalFlags.add('smashedMedallion')
		
		const startflags: Set<Flag> = new Set()
		// startflags.add('heardAboutHiddenPassage')
		// startflags.add('gotFreeStarterWeapon')
		// startflags.add('killedGoblins')
		
		let startScene: SceneId = `tutorial_${msg.join}`
		// startScene = `forest`
		// startScene = 'forestPassage'
		startScene = 'goblinCamp'
		// startScene = 'throne'
		// startScene = 'armory'
		
		let startInventory: Inventory = {
			weapon: {
				itemId: 'unarmed',
				cooldown: 0,
				warmup: 0,
				stock:0,
			},
			utility: {
				itemId: 'empty',
				cooldown: 0,
				warmup: 0,
				stock:0,
			},
			body: {
				itemId: 'rags',
				cooldown: 0,
				warmup: 0,
				stock:0,
			}
		}
		
		let player = {
			connectionState: null,
			heroName: msg.join,
			previousScene: 'dead',
			currentScene: startScene,
			inventory: startInventory,
			health: 100,
			maxHealth: 100,
			speed: 0,
			sceneActions: [],
			itemActions: [],
			sceneTexts: [],
			flags: startflags,
			animations:[],
		} satisfies Player
		
		addSoloScenes(msg.join)
		scenes.get(player.currentScene)?.onEnterScene(player)
		let userId = v4()
		users.set(userId, player);
		// }
		
	console.log('added player, setting cookies ' + msg.join);
	r.cookies.set('hero', msg.join, { path: '/', secure: false });
	r.cookies.set('uid', userId, { path: '/', secure: false });

	if (player && player.connectionState != null) {
		return json({ alreadyConnected: true });
	}

	return json({ alreadyConnected: false });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MessageFromServer } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag } from '$lib/server/users';
import { scenes, type SceneKey } from '$lib/server/scenes';

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

	if (!users.has(msg.join)) {
		// new user

		const startflags : Set<Flag>= new Set()
		startflags.add('heardAboutHiddenPassage')
		// startflags.add('gotFreeStarterWeapon')
		// startflags.add('killedGoblins')

		let startScene : SceneKey = 'forest'
		startScene = 'forestPassage' 
		// startScene = 'throne' 

		const player = {
			connectionState: null,
			heroName: msg.join,
			previousScene: 'dead',
			currentScene: startScene,
			// inventory: startitems,
			weapon:'fist',
			weaponCooldown:0,
			utility:'bandage',
			utilityCooldown:0,
			body:'rags',
			bodyCooldown:0,
			health: 100,
			actions:[],
			sceneTexts: [],
			flags: startflags,
		} satisfies Player
		scenes[player.currentScene].onEnterScene(player)
		users.set(msg.join, player);
	}
	r.cookies.set('hero', msg.join, { path: '/',secure:false});

	return json({ yes: 'good' });
};

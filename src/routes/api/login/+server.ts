import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MessageFromServer } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag } from '$lib/server/users';
import type { ItemKey } from '$lib/server/items';
import { scenes } from '$lib/server/scenes';

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
		// startflags.add('heardAboutHiddenPassage')
		// startflags.add('gotFreeStarterWeapon')
		// startflags.add('killedGoblins')
		const startitems : ItemKey[] = []
		// startitems.push('shortSword')

		const player = {
			connectionState: null,
			heroName: msg.join,
			currentScene: 'forest',
			previousScene: 'dead',
			inventory: startitems,
			health: 100,
			duringSceneTexts: [],
			flags: startflags,
		} satisfies Player
		scenes[player.currentScene].onEnterScene(player,player.previousScene)
		users.set(msg.join, player);
	}
	r.cookies.set('hero', msg.join, { path: '/',secure:false});

	return json({ yes: 'good' });
};

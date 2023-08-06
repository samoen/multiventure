import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MessageFromServer } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag } from '$lib/server/users';
import type { ItemKey } from '$lib/server/items';

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

	// new user
	const startflags : Set<Flag>= new Set()
	// startflags.add('heardAboutHiddenPassage')
	// startflags.add('gotFreeStarterWeapon')
	// startflags.add('killedGoblins')
	const startitems : ItemKey[] = []
	// startitems.push('shortSword')

	if (!users.has(msg.join)) {
		users.set(msg.join, {
			connectionState: null,
			heroName: msg.join,
			currentScene: 'forest',
			// currentScene:'throne',
			inventory: startitems,
			health: 100,
			transitionSceneText: "You awaken in a cold sweat with no memory of anything. The world around you seems dark and permeated by an unholy madness. There's a strange sickly smell that seems familiar. The smell of corruption. The smell of death.",
			duringSceneText: 'You feel an urgent need to escape your wretched surrounds',
			flags: startflags,
		} satisfies Player);

	}
	r.cookies.set('hero', msg.join, { path: '/',secure:false});

	return json({ yes: 'good' });
};

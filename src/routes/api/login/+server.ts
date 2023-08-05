import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MsgFromServer } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type User } from '$lib/server/users';

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
	if (!users.has(msg.join)) {
		users.set(msg.join, {
			connectionState: null,
			heroName: msg.join,
			currentScene: 'forest',
			inventory: [],
			health: 100,
			transitionText: 'You awake in a cold sweat, with no memory of anything',
			extraTexts: 'You should probably get out of this place',
			flags: new Set()
		} satisfies User);
	}
	r.cookies.set('hero', msg.join, { path: '/',secure:false});

	return json({ yes: 'good' });
};

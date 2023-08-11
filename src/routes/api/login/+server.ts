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
		return json('malformed login', { status: 400 });
	}
	// if(players.has(msg.join) && players.get(msg.join).connectionState){
	//     return json('hero already connected', {status:401})
	// }

	let nameTaken = Array.from(users.values()).some(p => p.heroName == msg.join)
	if (nameTaken) {
		return json('hero name taken', { status: 400 });
	}
	// r.cookies.get('uid')
	// let player = users.get(msg.join)
	// if (!player) {
		// new user
		


	return json({ alreadyConnected: false });
};

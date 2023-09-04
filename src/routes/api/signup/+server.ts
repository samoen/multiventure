import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag, globalFlags, addNewUser } from '$lib/server/users';

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
		return json({error:'hero name taken', needAuth:msg.join}, { status: 400 });
	}
	// r.cookies.get('uid')
	// let player = users.get(msg.join)
	// if (!player) {
		// new user
		
		// globalFlags.add('smashedMedallion')
		
	let {id, player} =	addNewUser(msg.join)
		// }
		
	console.log('added player, setting cookies ' + msg.join);
	r.cookies.set('hero', msg.join, { path: '/', secure: false });
	r.cookies.set('uid', id, { path: '/', secure: false });

	if (player && player.connectionState != null) {
		return json({ alreadyConnected: true });
	}

	return json({ alreadyConnected: false });
};

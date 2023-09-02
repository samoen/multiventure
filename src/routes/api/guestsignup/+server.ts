import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag, globalFlags, addNewUser } from '$lib/server/users';
import { scenes, type SceneId, addSoloScenes } from '$lib/server/scenes';
import type { Inventory } from '$lib/server/items';
import { v4 } from 'uuid';


function isGuestSignupMsg(msg: object): msg is {hi:string} {
	return 'hi' in msg;
}

export const POST: RequestHandler = async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();
	console.log(`guest signup request ${msg}`)

	if (!isGuestSignupMsg(msg)) {
		return json({error: 'malformed guest sign up request'}, { status: 400 });
	}
	
	// console.log(`signup checking name ${msg.join} is already in ${JSON.stringify(Array.from(users.values()).map(p=>p.heroName))}`)
	let guestName = `Guest1`
	for(let num = 1; num < 100; num++){
		let nameTaken = Array.from(users.values()).some(p => p.heroName == `Guest${num}`)
		if(!nameTaken){
			guestName = `Guest${num}`
			break
		}
	}
		
	let {id, player} =	addNewUser(guestName)
		
	console.log('added guest player, setting cookies ' + guestName);
	r.cookies.set('hero', guestName, { path: '/', secure: false });
	r.cookies.set('uid', id, { path: '/', secure: false });

	if (player && player.connectionState != null) {
		return json({ alreadyConnected: true, yourGuestName: guestName });
	}

	return json({ alreadyConnected: false, yourGuestName: guestName });
};

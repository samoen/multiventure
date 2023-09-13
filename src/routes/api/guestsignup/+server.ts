import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag, globalFlags, addNewUser } from '$lib/server/users';
import type { SignupResponse } from '$lib/utils';


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

	let resp : SignupResponse = {
		alreadyConnected:false,
		needsAuth:'',
		yourHeroName:'nope',
		yourId:'nope,'
	}
	
	// console.log(`signup checking name ${msg.join} is already in ${JSON.stringify(Array.from(users.values()).map(p=>p.heroName))}`)
	let guestName = `Guest1`
	for(let num = 1; num < 100; num++){
		let nameTaken = Array.from(users.values()).some(p => p.displayName == `Guest${num}`)
		if(!nameTaken){
			guestName = `Guest${num}`
			break
		}
	}
		
	let addUserResult =	addNewUser(guestName)
	if(!addUserResult){
		console.log('failed to add user')
		return json(resp)
	}
		
	console.log('added guest player, setting cookies ' + guestName);
	r.cookies.set('hero', guestName, { path: '/', secure: false });
	r.cookies.set('uid', addUserResult.id, { path: '/', secure: false });
	resp.yourHeroName = guestName
	resp.yourId = addUserResult.id

	if (addUserResult.player.connectionState != null) {
		resp.alreadyConnected = true
	}

	return json(resp);
};

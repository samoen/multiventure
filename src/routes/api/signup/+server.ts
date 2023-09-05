import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type SignupResponse } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag, globalFlags, addNewUser } from '$lib/server/users';

export const POST: RequestHandler = async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();
	console.log(`signup request ${JSON.stringify(msg)}`)
	if (!isJoin(msg)) {
		return json({error: 'malformed sign up request'}, { status: 400 });
	}
	
	let resp : SignupResponse = {
		alreadyConnected:false,
		needsAuth:'',
		yourHeroName:'',
		yourId:''
	}
		
	console.log(`signup checking name ${msg.join} is already in ${JSON.stringify(Array.from(users.values()).map(p=>p.heroName))}`)
	let nameTaken = Array.from(users.values()).some(p => p.heroName == msg.join)
	if (nameTaken) {
		console.log('name already taken')
		resp.needsAuth = msg.join
		return json(resp);
	}
		
	let {id, player} =	addNewUser(msg.join)
	
	console.log('added player, setting cookies ' + msg.join);
	r.cookies.set('hero', msg.join, { path: '/', secure: false });
	r.cookies.set('uid', id, { path: '/', secure: false });
	resp.yourHeroName = msg.join
	resp.yourId = id

	if (player && player.connectionState != null) {
		resp.alreadyConnected = true
	}

	return json(resp);
};

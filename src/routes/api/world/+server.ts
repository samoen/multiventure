import { FAKE_LATENCY, buildNextMessage } from '$lib/server/messaging';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../world/$types';
import { users } from '$lib/server/users';

// Get the world without performing an action. 
export const POST: RequestHandler = async (r) => {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let cookieHero = r.cookies.get('hero');
	let uid = r.cookies.get('uid');
	if (!uid) {
		console.log(`rejected action no uid`);
		return json('need uid cookie for action', { status: 401 });
	}
	let player = users.get(uid);
	if (!player) {
		return json(`player not found for uid ${uid}`, { status: 401 });
	}
	
	if(player.heroName != cookieHero){
		return json(`cookie hero not matching hero from uid ${uid}`, { status: 401 });
	}
    let msg = buildNextMessage(player,player.heroName)
    return json(msg);
};
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { users } from '$lib/server/users';
import { FAKE_LATENCY } from '$lib/server/messaging';

export const POST: RequestHandler = async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let uid = r.cookies.get('uid');
	if(!uid){
		return json('need uid cookie', { status: 401 });
	}
	let hero = r.cookies.get('hero');
	if (!hero) {
		return json('need hero cookie', { status: 401 });
	}
	let player = users.get(uid)
	if(!player){
		return json('no hero found for uid', { status: 401 });
	}
	if(player.displayName != hero){
		return json('cookie hero name doesnt match uid hero name', { status: 401 });
	}

	console.log(`deleting ${hero}`);
	r.cookies.delete('hero', { path: '/' });
	r.cookies.delete('uid', { path: '/' });
	users.delete(uid)
	// setTimeout(() => {
	// let player = players.get(hero);
	// if (player.connectionState) {
	// 	player.connectionState.con.close();
	// 	player.connectionState = null;
	// }
	// sendEveryoneWorld();
	// }, FAKE_LATENCY);
	return json({ ok: 'yes' });
};

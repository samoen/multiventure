import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { users } from '$lib/server/users';
import { FAKE_LATENCY } from '$lib/server/messaging';

export const POST: RequestHandler = async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let hero = r.cookies.get('hero');
	if (!hero || !users.has(hero)) {
		return json('must be logged in to log out', { status: 401 });
	}

	console.log(`logging out ${hero}`);
	r.cookies.delete('hero', { path: '/' });
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

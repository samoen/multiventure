import { FAKE_LATENCY, buildNextMessage } from '$lib/server/messaging';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../world/$types';
import { users } from '$lib/server/users';

// Get the world without performing an action.
export const POST: RequestHandler = async (r) => {
	console.log('first world requested');
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	const cookieHero = r.cookies.get('hero');
	const uid = r.cookies.get('uid');
	if (!uid) {
		return json('need uid cookie for action', { status: 401 });
	}
	const player = users.get(uid);
	if (!player) {
		return json(`player not found for uid ${uid}`, { status: 401 });
	}

	if (player.displayName != cookieHero) {
		return json(`cookie hero not matching hero from uid ${uid}`, { status: 401 });
	}
	const msg = buildNextMessage(player, player.unitId);
	// console.log(`success first world for ${player.heroName}`);
	return json(msg);
};

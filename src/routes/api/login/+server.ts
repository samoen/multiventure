import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MsgFromServer, type PlayerState } from '$lib/utils';
import { buildNextMsg, FAKE_LATENCY, players, type User } from '$lib/server/gameState';

export const POST: RequestHandler = async (r) => {
	let msg = await r.request.json();
	if (!isJoin(msg)) {
		return json('malformed login', { status: 400 });
	}
	// if(players.has(msg.join) && players.get(msg.join).connectionState){
	//     return json('hero already connected', {status:401})
	// }
	console.log('logging in ' + msg.join);
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));

	// new user
	if (!players.has(msg.join)) {
		const startPlayerState : PlayerState= { 
			heroName: msg.join,
			in: 'forest',
			inventory: [],
			health:100, 
		}
		players.set(msg.join, {
			connectionState: null,
			playerState:  startPlayerState,
			// nextMsg:buildNextMsg(startPlayerState,startPlayerState),
			stateWhenLastTravelled:startPlayerState,
		} satisfies User);
	}
	r.cookies.set('hero', msg.join, { path: '/' });

	return json({ yes: 'good' });
};

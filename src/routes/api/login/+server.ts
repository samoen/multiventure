import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type MessageFromServer } from '$lib/utils';
import { FAKE_LATENCY } from '$lib/server/messaging';
import { users, type Player, type Flag, globalFlags } from '$lib/server/users';
import { scenes, type SceneId, addSoloScenes } from '$lib/server/scenes';
import type { Inventory } from '$lib/server/items';

type LoginRequest = {
	heroName:string,
	userId:string,
}

function isLoginRequest(msg:object): msg is LoginRequest{
	return ('heroName' in msg) && ('userId' in msg)
}

export const POST: RequestHandler = async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();
	console.log(`login request ${JSON.stringify(msg)}`)
	if (!isLoginRequest(msg)) {
		return json('malformed login request', { status: 400 });
	}
	
	let player = users.get(msg.userId)
	if (!player) {
		return json({error:'no hero for that userID'}, { status: 400 });
	}

	if(player.heroName != msg.heroName){
		return json({error:'bad hero name'}, { status: 400 });
	}

	r.cookies.set('hero', msg.heroName, { path: '/', secure: false });
	r.cookies.set('uid', msg.userId, { path: '/', secure: false });

	return json({ success: true });
};

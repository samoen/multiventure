import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isGameAction, isTravel, isUseItem, type MsgFromServer, type PlayerState } from '$lib/utils';
import {
	buildNextMsg,
	FAKE_LATENCY,
	getAvailableActionsForPlayer,
	items,
	locations,
	players,
	sendEveryoneWorld
} from '$lib/server/gameState';

export const POST = (async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();

	//console.log('got move ' + JSON.stringify(msg))
	if (!isGameAction(msg)) {
		return json('malformed action', { status: 400 });
	}
	let hero = r.cookies.get('hero');
	if (!hero || !players.has(hero)) {
		return json('hero not found', { status: 401 });
	}
	let player = players.get(hero);
	let validActions = getAvailableActionsForPlayer(player.playerState).map((awd) =>
		JSON.stringify(awd.action)
	);
	if (!validActions.includes(JSON.stringify(msg))) {
		return json({ err: 'situation has changed, cannot', thing: msg }, { status: 401 });
	}
	if (isTravel(msg)) {
		console.log(`${hero} wants to go to ${msg.go}`);
		player.stateWhenLastTravelled = structuredClone(player.playerState)
		player.playerState.in = msg.go;
		const scene = locations[player.playerState.in];
		if ('gives' in scene) {
			if(!player.playerState.inventory.includes(scene.gives.item)){
				player.playerState.inventory.push(scene.gives.item);
			}
		}
		// player.nextMsg = buildNextMsg(player.playerState)

	}else if(isUseItem(msg)){
		const item = items[msg.use]
		if("onUse" in item){
			console.log('use item '+JSON.stringify(msg))
			item.onUse(player.playerState, players.get(msg.targetHero).playerState)
		}
	}

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		sendEveryoneWorld(hero);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;

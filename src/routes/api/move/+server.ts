import {
	FAKE_LATENCY,
	getAvailableActionsForPlayer,
	items,
	locations,
	users,
	sendEveryoneWorld
} from '$lib/server/gameState';
import { isGameAction, isTravel, isUseItem } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = (async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();

	//console.log('got move ' + JSON.stringify(msg))
	if (!isGameAction(msg)) {
		return json('malformed action', { status: 400 });
	}
	let hero = r.cookies.get('hero');
	if (!hero || !users.has(hero)) {
		return json('hero not found', { status: 401 });
	}
	let player = users.get(hero);
	let validActions = getAvailableActionsForPlayer(player).map((awd) => JSON.stringify(awd.action));
	if (!validActions.includes(JSON.stringify(msg))) {
		return json({ err: 'situation has changed, cannot', thing: msg }, { status: 401 });
	}
	if (isTravel(msg)) {
		console.log(`${hero} wants to go to ${msg.go}`);
		player.currentScene = msg.go;
		player.extraTexts = [];

		const scene = locations[msg.go];
		if ('onEnter' in scene) {
			scene.onEnter(player);
		}
	} else if (isUseItem(msg)) {
		const item = items[msg.use];
		if ('onUse' in item) {
			console.log('use item ' + JSON.stringify(msg));
			item.onUse(player, users.get(msg.targetHero));
		}
	}

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		sendEveryoneWorld(hero);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;

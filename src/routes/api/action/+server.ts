import {
	FAKE_LATENCY,
	getAvailableActionsForPlayer,
	items,
	locations,
	users,
	sendEveryoneWorld
} from '$lib/server/gameState';
import { isGameActionSelected, type GameAction } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = (async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();
	if (!isGameActionSelected(msg)) {
		return json('malformed action', { status: 400 });
	}
	let hero = r.cookies.get('hero');
	if (!hero || !users.has(hero)) {
		return json('hero not found', { status: 401 });
	}
	let player = users.get(hero);


	const oldSceneKey = player.currentScene

	let actionFromId = getAvailableActionsForPlayer(player).find(g => g.gameAction.id == msg.id)
	if (!actionFromId) {
		console.log(`rejected action ${JSON.stringify(msg)}`)
		return json(`action id ${msg.id} not available`, { status: 400 });
	}
	actionFromId.gameAction.onAct(actionFromId.actor, actionFromId.target)

	if (player.currentScene != oldSceneKey) {
		const scene = locations[player.currentScene]
		player.extraTexts = [];
		if ('onEnter' in scene) {
			scene.onEnter(player)
		}
	}

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		sendEveryoneWorld(hero);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;

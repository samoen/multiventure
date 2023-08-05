import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAvailableActionsForPlayer } from '$lib/server/actions';
import { FAKE_LATENCY, sendEveryoneWorld } from '$lib/server/messaging';
import { isGameActionSelected } from '$lib/utils';
import { scenes } from '$lib/server/scenes';
import { users } from '$lib/server/users';

export const POST = (async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let msg = await r.request.json();
	if (!isGameActionSelected(msg)) {
		console.log(`rejected action ${msg} because no id`);
		return json('malformed action', { status: 400 });
	}
	let hero = r.cookies.get('hero');
	if (!hero) {
		console.log(`rejected action ${JSON.stringify(msg)} hero not found`);
		return json('hero not found', { status: 401 });
	}
	let player = users.get(hero);
	if(!player){
		return json('hero not found', { status: 401 });
	}

	const oldSceneKey = player.currentScene;

	let actionFromId = getAvailableActionsForPlayer(player).find((g) => g.buttonText == msg.buttonText);
	if (!actionFromId) {
		console.log(`rejected action ${JSON.stringify(msg)} because not available`);
		return json(`action ${msg.buttonText} not available`, { status: 400 });
	}

	// player.transitionText = ''
	actionFromId.performAction();

	if (player.currentScene != oldSceneKey) {
		const scene = scenes[player.currentScene];
		player.duringSceneText = '';
		if (scene && scene.onEnterScene) {
			scene.onEnterScene(player);
		}
	}

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		if(hero) sendEveryoneWorld(hero);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;

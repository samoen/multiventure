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
	let actionFromId = player.actions.find((g) => g.buttonText == msg.buttonText);
	if (!actionFromId) {
		console.log(`rejected action ${JSON.stringify(msg)} because not available`);
		return json(`action ${msg.buttonText} not available`, { status: 400 });
	}
	
	
	const oldSceneKey = player.currentScene;
	// player.previousScene = player.currentScene;
	const preActionScene = scenes[player.currentScene];
	actionFromId.performAction();
	if(preActionScene.onActed){
		preActionScene.onActed()
	}
	const postActionScene = scenes[player.currentScene];
	
	if (player.currentScene != oldSceneKey) {
		player.duringSceneTexts = [];
		if (postActionScene && postActionScene.onEnterScene) {
			postActionScene.onEnterScene(player,oldSceneKey);
		}
	}
	for (const allPlayer of users.values()) {
		allPlayer.actions = []
		getAvailableActionsForPlayer(allPlayer)
	}

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		if(hero) sendEveryoneWorld(hero);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;

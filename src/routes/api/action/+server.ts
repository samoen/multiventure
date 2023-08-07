import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FAKE_LATENCY, sendEveryoneWorld, updateAllPlayerActions, updatePlayerActions } from '$lib/server/messaging';
import { isGameActionSelected } from '$lib/utils';
import { scenes } from '$lib/server/scenes';
import { users } from '$lib/server/users';
import { items } from '$lib/server/items';
import { activeEnemies, damagePlayer } from '$lib/server/enemies';

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
	if (!player) {
		return json('hero not found', { status: 401 });
	}
	updatePlayerActions(player)
	let actionFromId = player.actions.find((g) => g.buttonText == msg.buttonText);
	if (!actionFromId) {
		console.log(`rejected action ${JSON.stringify(msg)} because not available`);
		return json(`action ${msg.buttonText} not available`, { status: 400 });
	}


	const oldSceneKey = player.currentScene;
	const preActionScene = scenes[player.currentScene];
	const preActionHadEnemies = activeEnemies.some(e=>e.currentScene==player?.currentScene)
	actionFromId.performAction();
	const postActionScene = scenes[player.currentScene];
	const postActionHadEnemies = activeEnemies.some(e=>e.currentScene==player?.currentScene)

	for(const enemyInScene of activeEnemies.filter(e=>e.currentScene == player?.currentScene)){
		let aggroForActor = enemyInScene.aggros.get(player.heroName)
		if(aggroForActor){
			if((Math.random() + (aggroForActor/100)) > 1){
				damagePlayer(enemyInScene,player)
				enemyInScene.aggros = new Map()
			}
		}
	}

	// console.log(activeEnemies)

	
	if (preActionScene.onVictory && (preActionHadEnemies && !postActionHadEnemies)) {
		preActionScene.onVictory()
	}

	if (player.currentScene != oldSceneKey) {
		player.sceneTexts = [];
		player.previousScene = oldSceneKey
		if (postActionScene && postActionScene.onEnterScene) {
			postActionScene.onEnterScene(player);
		}
	}
	updateAllPlayerActions()
	

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		if (hero) sendEveryoneWorld(hero);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;

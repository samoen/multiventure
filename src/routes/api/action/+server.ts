import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FAKE_LATENCY, recentHappenings, sendEveryoneWorld, updateAllPlayerActions, updatePlayerActions } from '$lib/server/messaging';
import { isGameActionSelected } from '$lib/utils';
import { scenes } from '$lib/server/scenes';
import { playerItemStates, users } from '$lib/server/users';
import { activeEnemies, damagePlayer, enemiesInScene } from '$lib/server/enemies';

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

	for (const cd of playerItemStates(player)) {
		if (cd.cooldown > 0) cd.cooldown--
	}

	const preActionSceneKey = player.currentScene;
	const preActionScene = scenes[player.currentScene];
	const preActionHadEnemies = enemiesInScene(player.currentScene).length > 0
	actionFromId.performAction();
	let actionMovedScene = false
	if (player.currentScene != preActionSceneKey) {
		actionMovedScene = true
	}
	if (!actionMovedScene) {
		const postActionEnemies = enemiesInScene(player.currentScene)
		const postActionHasEnemies = postActionEnemies.length > 0
		if (postActionHasEnemies) {
			for (const enemyInScene of postActionEnemies) {
				let aggroForActor = enemyInScene.aggros.get(player.heroName)
				if (aggroForActor) {
					if ((Math.random() + (aggroForActor / 100)) > 1) {
						damagePlayer(enemyInScene, player)
						enemyInScene.aggros = new Map()
					}
				}
			}
			recentHappenings.push('----');
		}
	}
	let actionOrReactionMovedScene = player.currentScene != preActionSceneKey

	const postReactionEnemies = enemiesInScene(player.currentScene)

	if (
		!actionOrReactionMovedScene
		&& (preActionHadEnemies && !postReactionEnemies.length)
		&& preActionScene.onVictory
	) {
		preActionScene.onVictory()
	}

	if (actionOrReactionMovedScene) {
		player.sceneTexts = [];
		player.previousScene = preActionSceneKey
		for (const itemState of playerItemStates(player)) {
			itemState.cooldown = 0
		}
		const postActionScene = scenes[player.currentScene];
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

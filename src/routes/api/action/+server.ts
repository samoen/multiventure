import { addAggro, damagePlayer, enemiesInScene } from '$lib/server/enemies';
import { FAKE_LATENCY, pushHappening, sendEveryoneWorld, updateAllPlayerActions, updatePlayerActions } from '$lib/server/messaging';
import { scenes } from '$lib/server/scenes';
import { playerItemStates, users, type GameAction, type Player } from '$lib/server/users';
import { isGameActionSelected } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

	const startedSceneKey = player.currentScene;
	const startedScene = scenes[player.currentScene];
	const startedEnemies = enemiesInScene(player.currentScene)

	if (startedEnemies.length && !actionFromId.grantsImmunity) pushHappening('----');

	if (actionFromId.provoke) {
		addAggro(player, actionFromId.provoke)
	}

	handleRetaliations(player, false, actionFromId)

	if (player.currentScene == startedSceneKey) {
		actionFromId.performAction();
	}
	let actionMovedScene = false
	if (player.currentScene != startedSceneKey) {
		actionMovedScene = true
	}
	if (!actionMovedScene) {
		handleRetaliations(player, true, actionFromId)
	}

	const postReactionEnemies = enemiesInScene(player.currentScene)

	if (
		player.currentScene == startedSceneKey
		&& (startedEnemies.length && !postReactionEnemies.length)
		&& startedScene.onVictory
	) {
		startedScene.onVictory()
	}

	if (player.currentScene != startedSceneKey) {
		player.sceneTexts = [];
		player.previousScene = startedSceneKey
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

function handleRetaliations(player: Player, postAction: boolean, action: GameAction) {
	if (action.grantsImmunity) return
	let playerHitSpeed = player.speed
	if (action.speed) {
		playerHitSpeed += action.speed
	}
	for (const enemyInScene of enemiesInScene(player.currentScene).sort((a,b)=>b.template.speed-a.template.speed)) {
		if (
			(postAction && (playerHitSpeed >= enemyInScene.template.speed))
			|| (!postAction && (playerHitSpeed < enemyInScene.template.speed))
		) {
			let aggroForActor = enemyInScene.aggros.get(player.heroName)
			if (aggroForActor) {
				if ((Math.random() + (aggroForActor / 100)) > 1) {
					damagePlayer(enemyInScene, player)
					enemyInScene.aggros.clear()
				}
			}
		}
	}

}

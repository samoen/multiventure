import { activeEnemies, addAggro, damagePlayer, enemiesInScene, takePoisonDamage } from '$lib/server/enemies';
import { FAKE_LATENCY, pushHappening, sendEveryoneWorld, updateAllPlayerActions, updatePlayerActions } from '$lib/server/messaging';
import { scenes, type SceneId } from '$lib/server/scenes';
import { playerItemStates, users, type GameAction, type Player, activePlayersInScene } from '$lib/server/users';
import { isGameActionSelected } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { items } from '$lib/server/items';

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

	// ensure action is still valid
	updatePlayerActions(player)
	let actionFromId = [...player.sceneActions, ...player.itemActions].find((g) => g.buttonText == msg.buttonText);
	if (!actionFromId) {
		console.log(`rejected action ${JSON.stringify(msg)} because not available`);
		return json(`action ${msg.buttonText} not available`, { status: 400 });
	}

	// enemies despawn when there are no players in scene
	for (let i = activeEnemies.length - 1; i >= 0; i--) {
		if (!activePlayersInScene(activeEnemies[i].currentScene).length) {
		  activeEnemies.splice(i, 1);
		}
	}

	handleAction(player, actionFromId)
	
	if(player.health < 1){
		player.sceneTexts.push('You were struck down')
		pushHappening(`${player.heroName} is mortally wounded`)
	}


	updateAllPlayerActions()

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		if (hero) sendEveryoneWorld(hero);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;

function handleAction(player: Player, actionFromId: GameAction) {
	if (actionFromId.goTo) {
		// when moving to a new scene, state cooldowns to 0, warmups to the item warmup
		for (const itemState of playerItemStates(player)) {
			itemState.cooldown = 0
			let wep = items[itemState.itemId]
			if(wep != undefined && wep.warmup){
				itemState.warmup = wep.warmup
			}
		}
		player.previousScene = player.currentScene
		player.currentScene = actionFromId.goTo
		player.sceneTexts = [];
		const postActionScene = scenes.get(player.currentScene);
		if (postActionScene && postActionScene.onEnterScene) {
			postActionScene.onEnterScene(player);
		}
		return
	}

	if(!enemiesInScene(player.currentScene).length){
		if (actionFromId.performAction) {
			actionFromId.performAction();
		}
		return
	}

	for (const cd of playerItemStates(player)) {
		if (cd.cooldown > 0) cd.cooldown--
		if (cd.warmup > 0) cd.warmup--
	}

	if (!actionFromId.grantsImmunity) pushHappening('----');
	
	if (actionFromId.provoke) {
		addAggro(player, actionFromId.provoke)
	}

	for(const enemy of enemiesInScene(player.currentScene)){
		for(const s of enemy.statuses){
			if(s.status == 'poison'){
				takePoisonDamage(enemy)
				s.counter--
			}
		}
		enemy.statuses = enemy.statuses.filter(s=>s.counter > 0)
	}
	
	handleRetaliations(player, false, actionFromId)

	if (player.health > 1) {
		if (actionFromId.performAction) {
			actionFromId.performAction();
		}
	}
	
	if (player.health > 1) {
		handleRetaliations(player, true, actionFromId)
	}
	
	
	const playerScene = scenes.get(player.currentScene);
	const postReactionEnemies = enemiesInScene(player.currentScene)
	if ( !postReactionEnemies.length && playerScene?.onVictory) {
		for (const playerInScene of activePlayersInScene(player.currentScene)){
			playerScene.onVictory(playerInScene)
		}
	}
}

function handleRetaliations(player: Player, postAction: boolean, action: GameAction) {
	if (action.grantsImmunity) return
	let playerHitSpeed = player.speed
	if (action.speed) {
		playerHitSpeed += action.speed
	}
	for (const enemyInScene of enemiesInScene(player.currentScene).sort((a, b) => b.template.speed - a.template.speed)) {
		if (
			(postAction && (playerHitSpeed >= enemyInScene.template.speed))
			|| (!postAction && (playerHitSpeed < enemyInScene.template.speed))
		) {
			let aggroForActor = enemyInScene.aggros.get(player.heroName)
			if (aggroForActor) {
				if ((Math.random() + (aggroForActor / 100)) > 1) {
					if(enemyInScene.template.onAttack){
						enemyInScene.template.onAttack(enemyInScene)
					}else{
						damagePlayer(enemyInScene, player)
					}
					enemyInScene.aggros.clear()
				}
			}
		}
	}

}

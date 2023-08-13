import { activeEnemies, addAggro, damagePlayer, enemiesInScene, takePoisonDamage } from '$lib/server/enemies';
import { scenes, type SceneId } from '$lib/server/scenes';
import { playerItemStates, users, type GameAction, type Player, activePlayersInScene } from '$lib/server/users';
import { isGameActionSelected } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { items } from '$lib/server/items';
import { goto } from '$app/navigation';
import { updatePlayerActions, handleAction, updateAllPlayerActions } from '$lib/server/logic';
import { FAKE_LATENCY, pushHappening, sendEveryoneWorld } from '$lib/server/messaging';

export const POST = (async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	let cookieHero = r.cookies.get('hero');
	let uid = r.cookies.get('uid');
	if (!uid) {
		console.log(`rejected action no uid`);
		return json('need uid cookie for action', { status: 401 });
	}
	let player = users.get(uid);
	if (!player) {
		return json(`player not found for uid ${uid}`, { status: 401 });
	}
	
	if(player.heroName != cookieHero){
		return json(`cookie hero not matching hero from uid ${uid}`, { status: 401 });
	}

	let msg = await r.request.json();
	if (!isGameActionSelected(msg)) {
		console.log(`rejected action ${msg} because body malformed`);
		return json('malformed action body', { status: 400 });
	}

	// ensure action is still valid
	updatePlayerActions(player)
	let actionFromId = [...player.sceneActions, ...player.itemActions].find((g) => g.buttonText == msg.buttonText);
	if (!actionFromId) {
		console.log(`rejected action ${JSON.stringify(msg)} because not available`);
		return json(`action ${msg.buttonText} not available`, { status: 400 });
	}

	handleAction(player, actionFromId)
	
	if(player.health < 1){
		player.sceneTexts.push('You were struck down')
		pushHappening(`${player.heroName} is mortally wounded`)
	}

	updateAllPlayerActions()

	// tiny timeout so endpoint returns before the event messages get sent
	setTimeout(() => {
		if (player?.heroName) sendEveryoneWorld(player.heroName);
	}, 1);

	return json({ sucess: 'yessir' });
}) satisfies RequestHandler;



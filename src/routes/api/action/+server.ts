import { handlePlayerAction, updateAllPlayerActions } from '$lib/server/logic';
import {
	FAKE_LATENCY,
	buildNextMessage,
	pushHappening,
	sendEveryoneWorld
} from '$lib/server/messaging';
import { users } from '$lib/server/users';
import { isGameActionSelected } from '$lib/utils';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = (async (r) => {
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
	const cookieHero = r.cookies.get('hero');
	const uid = r.cookies.get('uid');
	if (!uid) {
		console.log(`rejected action no uid`);
		return json('need uid cookie for action', { status: 401 });
	}
	const player = users.get(uid);
	if (!player) {
		return json(`player not found for uid ${uid}`, { status: 401 });
	}

	if (player.displayName != cookieHero) {
		return json(`cookie hero not matching hero from uid ${uid}`, { status: 401 });
	}

	const msg = await r.request.json();
	if (!isGameActionSelected(msg)) {
		console.log(`rejected action ${msg} because body malformed`);
		return json('malformed action body', { status: 400 });
	}

	// ensure action is still valid
	const actionFromId = [...player.devActions, ...player.itemActions, ...player.vasActions].find(
		(g) => g.buttonText == msg.buttonText
	);
	if (!actionFromId) {
		console.log(`rejected action ${JSON.stringify(msg)} because not available`);
		return json(`action ${msg.buttonText} not available`, { status: 400 });
	}
	player.animations = [];
	handlePlayerAction(player, actionFromId);

	if (player.health < 1) {
		pushHappening(`${player.displayName} is mortally wounded`);
	}

	updateAllPlayerActions();

	// tiny timeout so endpoint returns before the event messages get sent
	// setTimeout(() => {
	sendEveryoneWorld(player.unitId);
	// }, 1);

	const nm = buildNextMessage(player, player.unitId);
	player.animations = [];
	return json(nm);
}) satisfies RequestHandler;

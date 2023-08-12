import type { MessageFromServer, OtherPlayerInfo } from '$lib/utils';
import { activeEnemies, addAggro, damagePlayer, enemiesInScene, takePoisonDamage } from './enemies';
import { items } from './items';
import { scenes } from './scenes';
import { activePlayers, globalFlags, playerItemStates, users, type HeroName, type Player, type GameAction, activePlayersInScene } from './users';

export const FAKE_LATENCY = 1;

export const recentHappenings: string[] = [];

export function pushHappening(toPush: string, endSection: boolean = false) {
	recentHappenings.push(toPush);
	if (recentHappenings.length > 10) {
		recentHappenings.shift();
	}
	if (endSection) {
		recentHappenings.push('----');
	}
}

export function updateAllPlayerActions() {
	for (const allPlayer of users.values()) {
		updatePlayerActions(allPlayer)
	}
}

export function updatePlayerActions(player: Player) {
	player.sceneActions = []
	player.itemActions = []

	if (player.health < 1) {
		player.sceneActions.push({
			buttonText: 'Succumb to your wounds',
			goTo: 'dead',
		})
		return
	}

	for (const cd of playerItemStates(player)) {
		const i = items[cd.itemId]
		if (i.actions) {
			if (cd.cooldown < 1 && cd.warmup < 1) {
				i.actions(player)
			}
		}
	}

	// if (activeEnemies.some(e => e.currentScene == player.currentScene)) {
	if (enemiesInScene(player.currentScene).length) {
		player.itemActions.push(
			{
				buttonText: 'wait',
				provoke: 1,
				performAction() {
				},
			}
		)
		if (player.currentScene != 'armory') {
			return
		}
	}

	scenes.get(player.currentScene)?.actions(player)
}

export async function sendEveryoneWorld(triggeredBy: HeroName) {
	await new Promise((r) => {
		setTimeout(r, FAKE_LATENCY);
	});
	for (const user of users.values()) {
		if (user.connectionState && user.connectionState.con) {
			const toSend = buildNextMessage(user, triggeredBy);
			user.connectionState.con.enqueue(encode(`world`, toSend));
		}
	}
}

export function buildNextMessage(forPlayer: Player, triggeredBy: HeroName): MessageFromServer {

	const nextMsg: MessageFromServer = {
		triggeredBy: triggeredBy,
		yourName: forPlayer.heroName,
		yourHp: forPlayer.health,
		yourWeapon: forPlayer.inventory.weapon,
		yourUtility: forPlayer.inventory.utility,
		yourBody: forPlayer.inventory.body,
		yourScene: forPlayer.currentScene,
		otherPlayers: activePlayers()
			.filter((u) => u.heroName != forPlayer.heroName)
			.map((u) => {
				return {
					heroName: u.heroName,
					health: u.health,
					currentScene: u.currentScene
				} satisfies OtherPlayerInfo;
			}),
		sceneTexts: forPlayer.sceneTexts,
		sceneActions: forPlayer.sceneActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText,
			};
		}),
		itemActions: forPlayer.itemActions.map((gameAction) => {
			return {
				buttonText: gameAction.buttonText,
			};
		}),
		happenings: recentHappenings,
		enemiesInScene: enemiesInScene(forPlayer.currentScene).map((e) => {
			return {
				health: e.currentHealth,
				name: e.name,
				myAggro: e.aggros.get(forPlayer.heroName) ?? 0,
				statuses: e.statuses,
			}
		}),
		playerFlags: Array.from(forPlayer.flags),
		globalFlags: Array.from(globalFlags),
	};
	return nextMsg;
}

const textEncoder = new TextEncoder();
export function encode(event: string, data: object, noretry: boolean = false) {
	let toEncode = `event:${event}\ndata: ${JSON.stringify(data)}\n`;
	if (noretry) {
		toEncode = toEncode + `retry: -1\n`;
	}
	toEncode = toEncode + `\n`;
	return textEncoder.encode(toEncode);
}

export function enterSceneOrWakeup(player: Player) {

	// If no players except me in there, remove all enemies
	if (!activePlayersInScene(player.currentScene).filter(p => p.heroName != player.heroName).length) {
		for (const e of enemiesInScene(player.currentScene)) {
			let index = activeEnemies.indexOf(e)
			if (index != -1) {
				activeEnemies.splice(index, 1)
			}
		}
		scenes.get(player.currentScene)?.hasEntered?.clear()
	}

	const enteringScene = scenes.get(player.currentScene);
	if (!enteringScene) {
		return
	}

	if (!enteringScene.hasEntered) {
		enteringScene.hasEntered = new Set()
	}

	// scene texts will be repopulated
	player.sceneTexts = [];

	const wasEnemiesPreEnter = enemiesInScene('goblinCamp').length

	// Always call main enter scene hook
	if (enteringScene.onEnterScene) {
		enteringScene.onEnterScene(player);
	}

	// If it's the player's first mid-battle join
	if (enteringScene.onBattleJoin
		&& wasEnemiesPreEnter
		&& !enteringScene.hasEntered.has(player.heroName)
	) {
		enteringScene.onBattleJoin(player)
	}


	// Remember this player has entered
	enteringScene.hasEntered.add(player.heroName)
}

export function handleAction(player: Player, actionFromId: GameAction) {
	if (actionFromId.goTo) {
		player.previousScene = player.currentScene
		player.currentScene = actionFromId.goTo
		
		// When entering a new scene, state cooldowns to 0, state warmups to the item warmup
		for (const itemState of playerItemStates(player)) {
			itemState.cooldown = 0
			let wep = items[itemState.itemId]
			if (wep != undefined && wep.warmup) {
				itemState.warmup = wep.warmup
			} else {
				itemState.warmup = 0
			}
		}

		enterSceneOrWakeup(player)
		return
	}

	if (!enemiesInScene(player.currentScene).length) {
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

	for (const enemy of enemiesInScene(player.currentScene)) {
		for (const s of enemy.statuses) {
			if (s.status == 'poison') {
				takePoisonDamage(enemy)
				s.counter--
			}
		}
		enemy.statuses = enemy.statuses.filter(s => s.counter > 0)
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
	if (!postReactionEnemies.length && playerScene?.onVictory) {
		for (const playerInScene of activePlayersInScene(player.currentScene)) {
			playerScene.onVictory(playerInScene)
			if (playerScene.hasEntered) {
				playerScene.hasEntered.clear()
			}
		}
	}
}

export function handleRetaliations(player: Player, postAction: boolean, action: GameAction) {
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
					if (enemyInScene.template.onAttack) {
						enemyInScene.template.onAttack(enemyInScene)
					} else {
						damagePlayer(enemyInScene, player)
					}
					enemyInScene.aggros.clear()
				}
			}
		}
	}

}
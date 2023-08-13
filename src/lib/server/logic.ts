import { enemiesInScene, activeEnemies, addAggro, takePoisonDamage, damagePlayer } from "./enemies"
import { items } from "./items"
import { pushHappening } from "./messaging"
import { scenes } from "./scenes"
import { users, type Player, playerItemStates, activePlayersInScene, type GameAction } from "./users"

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
				if(s.counter) s.counter--
			}
			if(s.status == 'rage'){
				enemy.damage += 10
				pushHappening(`${enemy.name}'s rage grows!`)
			}
		}
		enemy.statuses = enemy.statuses.filter(s => (s.counter != undefined && s.counter > 0) || s.counter == undefined)
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
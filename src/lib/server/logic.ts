import type { StatusEffect } from "$lib/utils"
import { enemiesInScene, activeEnemies, addAggro, takePoisonDamage, damagePlayer, pushAnimation, getAggroForPlayer } from "./enemies"
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
			if (cd.cooldown < 1 && cd.warmup < 1 && (cd.stock == undefined || cd.stock > 0)) {
				i.actions(player)
			}
		}
	}

	if (enemiesInScene(player.currentScene).length) {
		player.itemActions.push(
			{
				buttonText: 'wait',
				wait:true,
                // target:{kind:'onlySelf'},
				provoke: 0,
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

	const enteringScene = scenes.get(player.currentScene);
	if (!enteringScene) {
		return
	}

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

	if (!enteringScene.hasEntered) {
		enteringScene.hasEntered = new Set()
	}


	// scene texts will be repopulated
	player.sceneTexts = [];

	const wasEnemiesPreEnter = enemiesInScene(player.currentScene).length

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
		
		// When entering a new scene, state cooldowns to 0,
        // state warmups to the item warmup, stocks to start
		for (const itemState of playerItemStates(player)) {
			itemState.cooldown = 0
			let wep = items[itemState.itemId]
			if (wep != undefined) {
                if(wep.warmup){
                    itemState.warmup = wep.warmup
                } else {
                    itemState.warmup = 0
                }
                if(wep.startStock != undefined){
                    itemState.stock = wep.startStock
                }
            }
		}

		player.statuses = {
			poison:0,
			rage:0,
			hidden:0,
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
	if(actionFromId.provoke != undefined){
		for (const cd of playerItemStates(player)) {
			if (cd.cooldown > 0) cd.cooldown--
			if (cd.warmup > 0) cd.warmup--
		}
	}

    pushHappening('----');
	
	
	handleRetaliations(player, false, actionFromId)
	
	if (player.health > 0) {
		if (actionFromId.performAction) {
			// if(actionFromId.provoke && actionFromId.provoke > 0){
			// 	player.statuses.hidden = 0
			// }
			actionFromId.performAction();
			
		}
	}
	
	if (player.health > 0) {
		handleRetaliations(player, true, actionFromId)
	}
	if(actionFromId.provoke != undefined){
		for (const enemy of enemiesInScene(player.currentScene)) {
			let statusForPlayer = enemy.statuses.get(player.heroName)
			if(!statusForPlayer)continue
			if(statusForPlayer.poison > 0){
				console.log(`${enemy.name} takes poison ${JSON.stringify(enemy.statuses)}`)
				takePoisonDamage(enemy)
				statusForPlayer.poison --
			}
			if(statusForPlayer.rage > 0){
				enemy.damage += 10
				pushHappening(`${enemy.name}'s rage grows!`)
				statusForPlayer.rage--
			}
			if(statusForPlayer.hidden > 0){
				statusForPlayer.hidden--
			}
		}
	}
	
	if(player.health > 0 && actionFromId.provoke != undefined){
		if(player.statuses.poison > 0){
			let dmg = Math.floor(player.maxHealth * 0.1)
			player.health -= dmg
			pushHappening(`${player.heroName} took ${dmg} damage from poison`)
			pushAnimation(
				{
					sceneId:player.currentScene,
					battleAnimation:{
						source:player.unitId,
						damageToSource:dmg,
						behavior:'selfInflicted',
						extraSprite:'poison',
					}
				}
			)
			player.statuses.poison--
		}
		if(player.statuses.rage > 0){
			player.speed += 10
			pushHappening(`${player.heroName}'s rage grows!`)
			player.statuses.rage--
		}
		if(player.statuses.hidden > 0){
			player.statuses.hidden--
		}
	}

	
	if (actionFromId.provoke !=undefined && player.health > 0) {
		addAggro(player, actionFromId.provoke)
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
	if (action.grantsImmunity || player.statuses.hidden > 0) return
	let playerHitSpeed = player.speed
	if (action.speed) {
		playerHitSpeed += action.speed
	}
	for (const enemyInScene of enemiesInScene(player.currentScene).sort((a, b) => b.template.speed - a.template.speed)) {
		if(enemyInScene.currentHealth < 1)continue
		if (
			(postAction && (playerHitSpeed >= enemyInScene.template.speed))
			|| (!postAction && (playerHitSpeed < enemyInScene.template.speed))
		) {
			let aggroForActor = getAggroForPlayer(enemyInScene,player)
			if (aggroForActor) {
				if ((Math.random() < (aggroForActor / 100))) {
					if (enemyInScene.template.specialAttack) {
						enemyInScene.template.specialAttack(enemyInScene, player)
					} else {
                        // for(const _ of Array.from({length:enemyInScene.template.strikes ?? 1})){
                            let r = damagePlayer(enemyInScene, player)
							if(r.dmgDone > 0){
								pushAnimation(
									{
										sceneId: player.currentScene,
										battleAnimation: {
											source: enemyInScene.unitId,
											target: player.unitId,
											damageToTarget: r.dmgDone,
											behavior: enemyInScene.template.behavior ?? 'melee',
										}
									})
							}
                        // }
					}
					
					// enemyInScene.aggros.clear()
					for (const key of enemyInScene.aggros.keys()) {
						enemyInScene.aggros.set(key, 0);
					}
				}
			}
		}
	}

}
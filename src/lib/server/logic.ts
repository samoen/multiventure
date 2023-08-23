import type { BattleAnimation, HealthModifier, StatusEffect, StatusModifier, UnitId } from "$lib/utils"
import { enemiesInScene, activeEnemies, addAggro, takePoisonDamage, damagePlayer, pushAnimation, getAggroForPlayer, damageEnemy, infightDamage } from "./enemies"
import { items, type Item } from "./items"
import { pushHappening } from "./messaging"
import { scenes } from "./scenes"
import { users, type Player, playerItemStates, activePlayersInScene, type GameAction, healPlayer } from "./users"

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
		if (i.useableOutOfBattle || enemiesInScene(player.currentScene).length) {
			if (cd.cooldown < 1 && cd.warmup < 1 && (cd.stock == undefined || cd.stock > 0)) {
				if (i.actions) {
					i.actions(player)
				}
				if (i.actionForEnemy) {
					for (const enemy of enemiesInScene(player.currentScene)) {
						i.actionForEnemy(player, enemy)
					}
				}
				if (i.actionForFriendly) {
					for (const friend of activePlayersInScene(player.currentScene)) {
						i.actionForFriendly(player, friend)
					}
				}
			}
		}
	}

	if (enemiesInScene(player.currentScene).length) {
		player.itemActions.push(
			{
				buttonText: 'wait',
				wait: true,
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
			let item = items[itemState.itemId]
			if (item != undefined) {
				if (item.warmup) {
					itemState.warmup = item.warmup
				} else {
					itemState.warmup = 0
				}
				if (item.startStock != undefined) {
					itemState.stock = item.startStock
				}
			}
		}

		player.statuses = {
			poison: 0,
			rage: 0,
			hidden: 0,
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

	pushHappening('----');

	if (actionFromId.provoke && actionFromId.provoke > 0 && player.statuses.hidden > 0) {
		player.statuses.hidden = 0
		pushAnimation({
			sceneId: player.currentScene,
			battleAnimation: {
				source: player.unitId,
				behavior: 'selfInflicted',
				extraSprite: 'smoke',
				putsStatuses: [{ status: 'hidden', target: player.unitId, remove: true }]
			}
		})
	}

	handleRetaliations(player, false, actionFromId)

	if (player.health > 0) {
		if (actionFromId.performAction) {
			preCombatActionPerformed(player, actionFromId)
			let battleEvent = actionFromId.performAction();
			if (battleEvent) {
				let dmgToSource = 0
				let dmgToTarget = 0
				if (battleEvent.sourcePlayer && battleEvent.baseHealingToSource) {
					let r = healPlayer(battleEvent.sourcePlayer, battleEvent.baseHealingToSource)
					dmgToSource = r.healed * -1
				}
				if (battleEvent.targetPlayer && battleEvent.baseHealingToTarget) {
					let r = healPlayer(battleEvent.targetPlayer, battleEvent.baseHealingToTarget)
					dmgToTarget = r.healed * -1
				}
				if (battleEvent.baseDamageToTarget) {
					if (battleEvent.targetEnemy && battleEvent.sourcePlayer) {
						const r = damageEnemy(battleEvent.sourcePlayer, battleEvent.targetEnemy, battleEvent.baseDamageToTarget, battleEvent.strikes)
						dmgToTarget = r.dmgDone
					}
					if (battleEvent.targetPlayer && battleEvent.sourceEnemy) {
						const r = damagePlayer(battleEvent.sourceEnemy, battleEvent.targetPlayer)
						dmgToTarget = r.dmgDone
					}
					if (battleEvent.targetEnemy && battleEvent.sourceEnemy) {
						const r = infightDamage(battleEvent.sourceEnemy, battleEvent.targetEnemy)
						dmgToTarget = r.dmgDone
					}
				}

				if (battleEvent.putsStatuses) {
					for (const put of battleEvent.putsStatuses) {
						if (put.count) {
							if (put.targetEnemy) {
								let found = put.targetEnemy.statuses.get(player.heroName)
								if (!found) {
									found = {
										poison: 0,
										rage: 0,
										hidden: 0,
									}
								}
								if (found[put.status] < put.count) {
									found.poison = put.count
								}
								put.targetEnemy.statuses.set(player.heroName, found)
							}
							if (put.targetPlayer) {
								if (put.targetPlayer.statuses[put.status] < put.count) {
									put.targetPlayer.statuses[put.status] = put.count
								}
							}
						}
						if(put.remove){
							if(put.targetPlayer){
								put.targetPlayer.statuses[put.status] = 0
							}
							if(put.targetEnemy){
								for(const [key,value] of put.targetEnemy.statuses){
									value[put.status] = 0
								}
							}
						}
					}
				}
				let alsoDmgedAnimation : HealthModifier[] = []
				if(battleEvent.alsoDamages){
					for (const dmged of battleEvent.alsoDamages){
						if(dmged.targetEnemy){
							if(battleEvent.sourcePlayer){
								if(dmged.baseDamage){
									let r = damageEnemy(battleEvent.sourcePlayer,dmged.targetEnemy,dmged.baseDamage)
									alsoDmgedAnimation.push({
										target:dmged.targetEnemy.unitId,
										amount:r.dmgDone,
									})
								}
							}
							if(battleEvent.sourceEnemy){
								if(dmged.baseDamage){
									let r = infightDamage(battleEvent.sourceEnemy,dmged.targetEnemy)
									alsoDmgedAnimation.push({
										target:dmged.targetEnemy.unitId,
										amount:r.dmgDone,
									})
								}
							}
						}
					}
				}

				let battleAnimation: BattleAnimation = {
					source: battleEvent.sourcePlayer ? battleEvent.sourcePlayer.unitId : battleEvent.sourceEnemy?.unitId ?? 'herohi',
					target: battleEvent.targetPlayer ? battleEvent.targetPlayer.unitId : battleEvent.targetEnemy?.unitId ?? 'herohi',
					damageToSource: dmgToSource,
					damageToTarget: dmgToTarget,
					behavior: battleEvent.behavior,
					alsoDamages: alsoDmgedAnimation,
					alsoModifiesAggro: battleEvent.alsoModifiesAggro,
					extraSprite: battleEvent.extraSprite,
					putsStatuses: battleEvent.putsStatuses?.map(m => {
						let id: UnitId = 'herohi'
						if (m.targetEnemy) {
							id = m.targetEnemy.unitId
						}
						if (m.targetPlayer) {
							id = m.targetPlayer.unitId
						}
						return {
							status: m.status,
							target: id,
							count: m.count,
							remove: m.remove
						} satisfies StatusModifier
					}),
				}
				pushAnimation({
					sceneId: player.currentScene,
					battleAnimation: battleAnimation,
				})
			}

		}
	}

	if (player.health > 0) {
		handleRetaliations(player, true, actionFromId)
	}
	if (actionFromId.provoke != undefined) {
		for (const enemy of enemiesInScene(player.currentScene)) {
			let statusForPlayer = enemy.statuses.get(player.heroName)
			if (!statusForPlayer) continue
			if (statusForPlayer.poison > 0) {
				console.log(`${enemy.name} takes poison ${JSON.stringify(enemy.statuses)}`)
				takePoisonDamage(enemy)
				statusForPlayer.poison--
			}
			if (statusForPlayer.rage > 0) {
				enemy.damage += 10
				pushHappening(`${enemy.name}'s rage grows!`)
				statusForPlayer.rage--
			}
			if (statusForPlayer.hidden > 0) {
				statusForPlayer.hidden--
			}
		}
	}

	if (player.health > 0 && actionFromId.provoke != undefined) {
		if (player.statuses.poison > 0) {
			let dmg = Math.floor(player.maxHealth * 0.1)
			player.health -= dmg
			pushHappening(`${player.heroName} took ${dmg} damage from poison`)
			pushAnimation(
				{
					sceneId: player.currentScene,
					battleAnimation: {
						source: player.unitId,
						damageToSource: dmg,
						behavior: 'selfInflicted',
						extraSprite: 'poison',
					}
				}
			)
			player.statuses.poison--
		}
		if (player.statuses.rage > 0) {
			player.speed += 10
			pushHappening(`${player.heroName}'s rage grows!`)
			player.statuses.rage--
		}
		if (player.statuses.hidden > 0) {
			player.statuses.hidden--
		}
	}


	if (actionFromId.provoke != undefined && player.health > 0) {
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

function preCombatActionPerformed(player: Player, gameAction: GameAction) {

	if (gameAction.provoke != undefined) {
		for (const cd of playerItemStates(player)) {
			if (cd.cooldown > 0) cd.cooldown--
			if (cd.warmup > 0) cd.warmup--
		}
	}
	if (gameAction.slot) {
		let itemState = player.inventory[gameAction.slot]
		let item = items[itemState.itemId]
		if (item.cooldown) {
			itemState.cooldown = item.cooldown
		}
		if (itemState.stock) {
			itemState.stock--
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
		if (enemyInScene.currentHealth < 1) continue
		if (
			(postAction && (playerHitSpeed >= enemyInScene.template.speed))
			|| (!postAction && (playerHitSpeed < enemyInScene.template.speed))
		) {
			let aggroForActor = getAggroForPlayer(enemyInScene, player)
			if (aggroForActor) {
				if ((Math.random() < (aggroForActor / 100))) {
					if (enemyInScene.template.specialAttack) {
						enemyInScene.template.specialAttack(enemyInScene, player)
					} else {
						// for(const _ of Array.from({length:enemyInScene.template.strikes ?? 1})){
						let r = damagePlayer(enemyInScene, player)
						if (r.dmgDone > 0) {
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
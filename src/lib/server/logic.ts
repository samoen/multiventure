import { goto } from "$app/navigation"
import type { AggroModifier, AggroModifierEvent, AnySprite, BattleAnimation, BattleEvent, BattleEventEntity, GameActionSentToClient, HealthModifier, HealthModifierEvent, StatusEffect, StatusModifier, StatusModifierEvent, UnitId, VisualActionSourceId } from "$lib/utils"
import { enemiesInScene, activeEnemies, addAggro, takePoisonDamage, damagePlayer, pushAnimation, getAggroForPlayer, damageEnemy, modifyAggroForPlayer, modifiedEnemyHealth, type EnemyTemplateId, spawnEnemy } from "./enemies"
import { items, type Item, equipItem, checkHasItem, type ItemId } from "./items"
import { pushHappening } from "./messaging"
import { scenes, type SceneId } from "./scenes"
import { users, type Player, activePlayersInScene, type GameAction, healPlayer, type Flag } from "./users"

export function updateAllPlayerActions() {
	for (const allPlayer of users.values()) {
		updatePlayerActions(allPlayer)
	}
}

export function updatePlayerActions(player: Player) {
	player.sceneActions = []
	player.itemActions = []
	player.visualActionSources = []

	let sceneEnemies = enemiesInScene(player.currentScene)
	let scenePlayers = activePlayersInScene(player.currentScene)

	for (const cd of player.inventory) {
		const i = items.find(item => item.id == cd.itemId)
		if (i == undefined) return
		if (!i.useableOutOfBattle && !sceneEnemies.length) continue
		if ((i.requiresSourceDead && player.health > 0)) continue
		if (!i.requiresSourceDead && player.health < 1) continue
		if (cd.cooldown > 0) continue
		if (cd.warmup > 0) continue
		if (cd.stock != undefined && cd.stock < 1) continue

		if (i.style.style == 'onlySelf') {
			const be: BattleEvent = {
				source: { kind: 'player', entity: player },
				succumb: i.succumb,
				behavior: i.behavior,
			}
			let ga: GameAction = {
				buttonText: `use ${i.id}`,
				performAction() {
					return be
				},
				slot: i.slot,
				itemId: i.id,
			}
			player.itemActions.push(ga)
		}

		if ((i.style.style == 'allEnemies')) {
			const be: BattleEvent = {
				source: { kind: 'player', entity: player },
				behavior: i.behavior,
			}
			if (i.baseDmg) {
				be.alsoDamages = []
				for (const enemy of sceneEnemies) {
					be.alsoDamages.push({
						baseDamage: i.baseDmg,
						targetEnemy: enemy
					})
				}
			}
			if (i.aggroModifyForAll) {
				be.alsoModifiesAggro = []
				for (const enemy of sceneEnemies) {
					be.alsoModifiesAggro.push({
						targetEnemy: enemy,
						forHeros: scenePlayers,
						baseAmount: i.aggroModifyForAll,
					})
				}
			}
			if (i.putsStatusOnAffected) {
				be.putsStatuses = []
				for (const enemy of sceneEnemies) {
					be.putsStatuses.push({
						targetEnemy: enemy,
						statusId: i.putsStatusOnAffected.statusId,
						count: i.putsStatusOnAffected.count,
						remove: i.putsStatusOnAffected.remove,

					})
				}
			}
			if (i.style.putsStatusOnSelf) {
				be.putsStatuses = []
				be.putsStatuses.push({
					targetPlayer: player,
					statusId: i.style.putsStatusOnSelf.statusId,
					count: i.style.putsStatusOnSelf.count,
					remove: i.style.putsStatusOnSelf.remove,
				})
			}

			let ga: GameAction = {
				buttonText: `use ${i.id}`,
				performAction() {
					return be
				},
				slot: i.slot,
				itemId: i.id,
			}
			player.itemActions.push(ga)


		}
		if ((i.style.style == 'anyEnemy')) {
			for (const enemy of sceneEnemies) {
				const be: BattleEvent = {
					source: { kind: 'player', entity: player },
					target: { kind: 'enemy', entity: enemy },
					baseDamageToTarget: i.baseDmg,
					behavior: i.behavior,
					strikes: i.strikes,
				}
				if (i.putsStatusOnAffected) {
					be.putsStatuses = []
					be.putsStatuses.push({
						targetEnemy: enemy,
						statusId: i.putsStatusOnAffected.statusId,
						count: i.putsStatusOnAffected.count,
						remove: i.putsStatusOnAffected.remove,
					})
				}

				let ga: GameAction = {
					buttonText: `use ${i.id} on ${enemy.unitId}`,
					performAction() {
						return be
					},
					slot: i.slot,
					itemId: i.id,
					target: enemy.unitId,
				}
				player.itemActions.push(ga)



			}
		}
		if ((i.style.style == 'anyFriendly')) {
			for (const friend of scenePlayers.filter(f => f.unitId != player.unitId)) {
				if (
					(!i.requiresHealth || friend.health < friend.maxHealth && friend.health > 0) &&
					(!i.requiresStatus || friend.statuses[i.requiresStatus] > 0)
				) {
					const be: BattleEvent = {
						source: { kind: 'player', entity: player },
						target: { kind: 'player', entity: friend },
						behavior: { kind: 'melee' },
						baseHealingToTarget: i.baseHeal
					}
					if (i.putsStatusOnAffected) {
						be.putsStatuses = []
						be.putsStatuses.push({
							targetPlayer: friend,
							statusId: i.putsStatusOnAffected.statusId,
							count: i.putsStatusOnAffected.count,
							remove: i.putsStatusOnAffected.remove,
						})
					}
					let ga: GameAction = {
						buttonText: `use ${i.id} on ${friend.unitId}`,
						performAction() {
							return be
						},
						slot: i.slot,
						itemId: i.id,
						target: friend.unitId,
					}
					player.itemActions.push(ga)


				}
			}
		}
		if ((i.style.style == 'anyFriendly')) {
			if (
				(!i.requiresHealth || player.health < player.maxHealth && player.health > 0) &&
				(!i.requiresStatus || player.statuses[i.requiresStatus] > 0)
			) {

				const be: BattleEvent = {
					source: { kind: 'player', entity: player },
					behavior: i.style.selfBehavior,
					baseHealingToSource: i.baseHeal
				}
				if (i.putsStatusOnAffected) {
					be.putsStatuses = []
					be.putsStatuses.push({
						targetPlayer: player,
						statusId: i.putsStatusOnAffected.statusId,
						count: i.putsStatusOnAffected.count,
						remove: i.putsStatusOnAffected.remove,
					})
				}
				let ga: GameAction = {
					buttonText: `use ${i.id} on self`,
					performAction() {
						return be
					},
					slot: i.slot,
					itemId: i.id,
					target: player.unitId,
				}
				player.itemActions.push(ga)


			}
		}
	}

	if (!sceneEnemies.length || player.currentScene == 'armory') {
		scenes.get(player.currentScene)?.actions(player)
	}
}

export function enterSceneOrWakeup(player: Player) {

	const enteringScene = scenes.get(player.currentScene);
	if (!enteringScene) {
		return
	}
	const scenePlayers = activePlayersInScene(player.currentScene)

	// If no players except me in there, remove all enemies
	if (!scenePlayers.filter(p => p.heroName != player.heroName).length) {
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

	const wasEnemiesPreEnter = enemiesInScene(player.currentScene)

	// Always call main enter scene hook
	if (enteringScene.onEnterScene) {
		enteringScene.onEnterScene(player);
	}

	// If it's the player's first mid-battle join
	if (enteringScene.onBattleJoin
		&& wasEnemiesPreEnter.length
		&& !enteringScene.hasEntered.has(player.heroName)
	) {
		for (const e of wasEnemiesPreEnter){
			if(!e.aggros.has(player.unitId)){
				e.aggros.set(player.unitId,e.template.startAggro)
			}
		}
		scaleEnemyHealthInScene(player.currentScene)
		enteringScene.onBattleJoin(player)
	}


	// Remember this player has entered
	enteringScene.hasEntered.add(player.heroName)
}

export function scaleEnemyHealthInScene(sceneId: SceneId) {
	let eScene = scenes.get(sceneId)
	if (eScene && eScene.solo) return

	for (const enemy of enemiesInScene(sceneId)) {
		let percentHealthBefore = enemy.currentHealth / enemy.maxHealth
		enemy.maxHealth = Math.floor(modifiedEnemyHealth(enemy.template.baseHealth, activePlayersInScene(sceneId).length))
		enemy.currentHealth = Math.floor(percentHealthBefore * enemy.maxHealth)
	}
}

export function changeScene(player: Player, goTo: SceneId) {
	let left = scenes.get(player.currentScene)
	if (!left) return
	if (left.onLeaveScene) {
		left.onLeaveScene(player)
	}

	player.previousScene = player.currentScene
	player.currentScene = goTo

	// When entering a new scene, state cooldowns to 0,
	// state warmups to the item warmup, stocks to start
	for (const itemState of player.inventory) {
		itemState.cooldown = 0
		let item = items.find(i => i.id == itemState.itemId)
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

	// should status persist after battles?
	player.statuses = {
		poison: 0,
		rage: 0,
		hidden: 0,
	}

	enterSceneOrWakeup(player)
}

export function handleAction(player: Player, actionFromId: GameAction) {
	const actionStartedInSceneId = player.currentScene

	if (actionFromId.goTo) {
		changeScene(player, actionFromId.goTo)
		return
	}
	if (actionFromId.devAction) {
		actionFromId.devAction()
		return
	}

	if (actionFromId.unlockableActData) {
		if (actionFromId.unlockableActData.pickupItem) {
			const idToPickup = actionFromId.unlockableActData.pickupItem
			let toPickup = items.find(i => i.id == idToPickup)
			if (toPickup) {
				equipItem(player, toPickup)
				pushAnimation({
					sceneId: actionStartedInSceneId,
					battleAnimation: {
						triggeredBy:player.unitId,
						source: player.unitId,
						target: actionFromId.target,
						behavior: { kind: 'melee' },
						takesItem: { id: idToPickup, slot: toPickup.slot },
					}
				})
			}
		}

		if (actionFromId.unlockableActData.setsFlag) {
			player.flags.add(actionFromId.unlockableActData.setsFlag)
		}

		if (actionFromId.unlockableActData.spawnsEnemies) {
			for (const e of actionFromId.unlockableActData.spawnsEnemies) {
				spawnEnemy(e.eName, e.eTemp, actionStartedInSceneId)
			}
		}

		if (actionFromId.unlockableActData.travelTo) {
			changeScene(player, actionFromId.unlockableActData.travelTo)
			pushAnimation({
				leavingScene: player,
				sceneId: actionStartedInSceneId,
				battleAnimation: {
					triggeredBy:player.unitId,
					source: player.unitId,
					behavior: { kind: 'travel', goTo: actionFromId.unlockableActData.travelTo },
					target: actionFromId.target
				}
			})
		}
		return
	}

	if (!actionFromId.itemId) return
	let itemUsed = items.find(i => i.id == actionFromId.itemId)
	if (!itemUsed) return


	pushHappening('----');

	if (itemUsed.provoke && itemUsed.provoke > 0 && player.statuses.hidden > 0) {
		player.statuses.hidden = 0
		pushAnimation({
			sceneId: player.currentScene,
			battleAnimation: {
				triggeredBy:player.unitId,
				source: player.unitId,
				behavior: { kind: 'selfInflicted', extraSprite: 'smoke', },
				putsStatuses: [{ statusId: 'hidden', target: player.unitId, remove: true }]
			}
		})
	}

	handleRetaliations(player, false, actionFromId, itemUsed)

	if (player.health > 0 || itemUsed.requiresSourceDead) {
		preCombatActionPerformed(player, actionFromId, itemUsed)
		if (actionFromId.performAction) {
			let battleEvent = actionFromId.performAction();
			if (battleEvent) {
				processBattleEvent(battleEvent, player)
			}
		}
	}

	if (player.health > 0) {
		handleRetaliations(player, true, actionFromId, itemUsed)
	}
	if (itemUsed.provoke != undefined) {
		// const scenePlayers = activePlayersInScene(actionStartedInSceneId)
		for (const enemy of enemiesInScene(actionStartedInSceneId)) {

			for (const [hId, statusForPlayer] of enemy.statuses){
				if(hId == player.unitId){
					let pois = statusForPlayer.get('poison')
					if (pois && pois > 0) {
						takePoisonDamage(enemy,player)
						statusForPlayer.set('poison',pois-1)
					}
					let rg = statusForPlayer.get('rage')
					if (rg && rg > 0) {
						enemy.damage += 10
						pushHappening(`${enemy.name}'s rage grows!`)
						statusForPlayer.set('rage', rg -1)
					}
					let hidn = statusForPlayer.get('hidden')
					if (hidn && hidn > 0) {
						statusForPlayer.set('hidden',hidn-1)
					}

				}
				// else{
				// 	if(!scenePlayers.some(p=>hId == p.unitId)){
				// 		enemy.statuses.delete(hId)
				// 	}
				// }
			}
			// let statusForPlayer = enemy.statuses.get(player.unitId)
			// if (!statusForPlayer) continue
		}
	}

	if (player.health > 0 && itemUsed.provoke != undefined) {
		if (player.statuses.poison > 0) {
			let dmg = Math.floor(player.maxHealth * 0.1)
			player.health -= dmg
			pushHappening(`${player.heroName} took ${dmg} damage from poison`)
			pushAnimation(
				{
					sceneId: player.currentScene,
					battleAnimation: {
						triggeredBy:player.unitId,
						source: player.unitId,
						damageToSource: dmg,
						behavior: { kind: 'selfInflicted', extraSprite: 'poison', }

					}
				}
			)
			player.statuses.poison--
		}
		if (player.statuses.rage > 0) {
			player.agility += 10
			pushHappening(`${player.heroName}'s rage grows!`)
			player.statuses.rage--
		}
		if (player.statuses.hidden > 0) {
			player.statuses.hidden--
		}
	}


	if (itemUsed.provoke != undefined && player.health > 0) {
		addAggro(player, itemUsed.provoke)
	}


	const playerScene = scenes.get(actionStartedInSceneId);
	const postReactionEnemies = enemiesInScene(actionStartedInSceneId)
	if (!postReactionEnemies.length && playerScene?.onVictory) {
		for (const playerInScene of activePlayersInScene(player.currentScene)) {
			playerScene.onVictory(playerInScene)
			if (playerScene.hasEntered) {
				playerScene.hasEntered.clear()
			}
		}
	}
}

function preCombatActionPerformed(player: Player, gameAction: GameAction, itemUsed: Item) {

	// Each turn decrement cooldowns, only if time passed ie provoke
	if (itemUsed.provoke != undefined) {
		for (const cd of player.inventory) {
			if (cd.cooldown > 0) cd.cooldown--
			if (cd.warmup > 0) cd.warmup--
		}
	}

	// If we used an equipment item set it on cooldown and reduce stock
	if (gameAction.itemId) {
		let itemState = player.inventory.find(i => i.itemId == gameAction.itemId)
		if (itemState) {
			const isId = itemState.itemId
			let item = items.find(i => i.id == isId)
			if (!item) return
			if (item.cooldown) {
				itemState.cooldown = item.cooldown
			}
			if (itemState.stock) {
				itemState.stock--
			}
		}
	}

}

export function handleRetaliations(player: Player, postAction: boolean, action: GameAction, itemUsed: Item) {
	if (itemUsed.grantsImmunity || player.statuses.hidden > 0) return
	let playerHitSpeed = player.agility
	if (itemUsed.speed) {
		playerHitSpeed += itemUsed.speed
	}
	let sceneEnemies = enemiesInScene(player.currentScene)
	for (const enemyInScene of sceneEnemies.sort((a, b) => b.template.speed - a.template.speed)) {
		if (enemyInScene.currentHealth < 1) continue
		if (
			(postAction && (playerHitSpeed >= enemyInScene.template.speed))
			|| (!postAction && (playerHitSpeed < enemyInScene.template.speed))
		) {
			let aggroForActor = getAggroForPlayer(enemyInScene, player)
			if (aggroForActor) {
				if ((Math.random() < (aggroForActor / 100))) {

					// let r = damagePlayer(enemyInScene, player, enemyInScene.damage)
					// if (r.dmgDone > 0) {
					let putsStatuses: StatusModifierEvent[] = []
					if (enemyInScene.template.putsStatusOnTarget) {
						putsStatuses.push({
							statusId: enemyInScene.template.putsStatusOnTarget.statusId,
							count: enemyInScene.template.putsStatusOnTarget.count,
							targetPlayer: player,
						})
					}
					let target: BattleEventEntity = { kind: 'player', entity: player }
					if (enemyInScene.template.randomTarget) {
						const selfIndex = sceneEnemies.indexOf(enemyInScene)
						if (selfIndex == -1) {
							console.log('random targeting failed to find self index')
							break
						}
						const randomIndex = Math.floor(Math.random() * sceneEnemies.length);
						if (randomIndex != selfIndex) {
							let randomEnemy = sceneEnemies.at(randomIndex)
							if (!randomEnemy) {
								console.log('random targeting failed to find enemy target')
								break
							}
							target = { kind: 'enemy', entity: randomEnemy }
						}
					}
					let be: BattleEvent = {
						source: { kind: 'enemy', entity: enemyInScene },
						target: target,
						behavior: enemyInScene.template.behavior ?? { kind: 'melee' },
						putsStatuses: putsStatuses,
						strikes: enemyInScene.template.strikes,
						baseDamageToTarget: enemyInScene.damage,
					}
					processBattleEvent(be, player)

					// enemy aggro to all players goes to zero when it succeeds an aggro roll
					for (const key of enemyInScene.aggros.keys()) {
						enemyInScene.aggros.set(key, 0);
					}
				}
			}
		}
	}

}

function processBattleEvent(battleEvent: BattleEvent, player: Player) {

	if (
		(battleEvent.target && battleEvent.target.kind == 'enemy' && battleEvent.target.entity.currentHealth < 1) ||
		(battleEvent.target && battleEvent.target.kind == 'player' && battleEvent.target.entity.health < 1)
	) {
		return
	}

	let dmgToSource = 0
	let dmgToTarget = 0
	if (battleEvent.source.kind == 'player' && battleEvent.baseHealingToSource) {
		let r = healPlayer(battleEvent.source.entity, battleEvent.baseHealingToSource)
		dmgToSource = r.healed * -1
	}
	if (battleEvent.target?.kind == 'player' && battleEvent.baseHealingToTarget) {
		let r = healPlayer(battleEvent.target.entity, battleEvent.baseHealingToTarget)
		dmgToTarget = r.healed * -1
	}
	if (battleEvent.baseDamageToTarget) {
		if (battleEvent.target?.kind == 'enemy' && battleEvent.source.kind == 'player') {
			const r = damageEnemy(battleEvent.source.entity.heroName, battleEvent.target.entity, battleEvent.baseDamageToTarget, battleEvent.source.entity.strength, battleEvent.strikes)
			dmgToTarget = r.dmgDone
		}
		if (battleEvent.target?.kind == 'player' && battleEvent.source.kind == 'enemy') {
			const r = damagePlayer(battleEvent.source.entity, battleEvent.target.entity, battleEvent.baseDamageToTarget)
			dmgToTarget = r.dmgDone
		}
		if (battleEvent.target?.kind == 'enemy' && battleEvent.source.kind == 'enemy') {
			const r = damageEnemy(battleEvent.source.entity.name, battleEvent.target.entity, battleEvent.baseDamageToTarget, 0)
			dmgToTarget = r.dmgDone
		}
	}

	if (battleEvent.putsStatuses) {
		for (const put of battleEvent.putsStatuses) {
			if (put.count) {
				if (put.targetEnemy) {
					let found = put.targetEnemy.statuses.get(player.unitId)
					if (!found) {
						found = new Map()
					}
					let exist = found.get(put.statusId)

					if (!exist || exist < put.count) {
						found.set(put.statusId,put.count)
					}
					put.targetEnemy.statuses.set(player.unitId, found)
				}
				if (put.targetPlayer) {
					if (put.targetPlayer.statuses[put.statusId] < put.count) {
						put.targetPlayer.statuses[put.statusId] = put.count
					}
				}
			}
			if (put.remove) {
				if (put.targetPlayer) {
					put.targetPlayer.statuses[put.statusId] = 0
				}
				if (put.targetEnemy) {
					for (const [key, value] of put.targetEnemy.statuses) {
						value.delete(put.statusId)
					}
				}
			}
		}
	}
	let alsoDmgedAnimation: HealthModifier[] = []
	if (battleEvent.alsoDamages) {
		for (const healthModifyEvent of battleEvent.alsoDamages) {
			if (healthModifyEvent.targetEnemy) {
				if (battleEvent.source.kind == 'player') {
					if (healthModifyEvent.baseDamage) {
						let r = damageEnemy(battleEvent.source.entity.heroName, healthModifyEvent.targetEnemy, healthModifyEvent.baseDamage, 0)
						alsoDmgedAnimation.push({
							target: healthModifyEvent.targetEnemy.unitId,
							amount: r.dmgDone,
						})
					}
				}
				if (battleEvent.source.kind == 'enemy') {
					if (healthModifyEvent.baseDamage) {
						let r = damageEnemy(battleEvent.source.entity.name, healthModifyEvent.targetEnemy, healthModifyEvent.baseDamage, 0)
						alsoDmgedAnimation.push({
							target: healthModifyEvent.targetEnemy.unitId,
							amount: r.dmgDone,
						})
					}
				}
			}
		}
	}
	let aggroModifiedAnimations: AggroModifier[] = []
	if (battleEvent.alsoModifiesAggro) {
		for (const modifyEvent of battleEvent.alsoModifiesAggro) {
			for (const hero of modifyEvent.forHeros) {
				let r = modifyAggroForPlayer(hero, modifyEvent.targetEnemy, modifyEvent.baseAmount)
			}

			aggroModifiedAnimations.push({
				forHeros: modifyEvent.forHeros.map(h => h.unitId),
				target: modifyEvent.targetEnemy.unitId,
				amount: modifyEvent.baseAmount,
			})

		}
	}


	let leavingScene = undefined
	let sceneToPlayAnim = player.currentScene

	if (battleEvent.succumb) {
		leavingScene = player
		changeScene(player, 'dead')
	}

	let battleAnimation: BattleAnimation = {
		triggeredBy:player.unitId,
		source: battleEvent.source.entity.unitId,
		target: battleEvent.target?.entity.unitId,
		damageToSource: dmgToSource,
		damageToTarget: dmgToTarget,
		strikes: battleEvent.strikes,
		behavior: battleEvent.behavior,
		alsoDamages: alsoDmgedAnimation,
		alsoModifiesAggro: aggroModifiedAnimations,
		putsStatuses: battleEvent.putsStatuses?.map(m => {
			let id: UnitId = 'herohi'
			if (m.targetEnemy) {
				id = m.targetEnemy.unitId
			}
			if (m.targetPlayer) {
				id = m.targetPlayer.unitId
			}
			return {
				statusId: m.statusId,
				target: id,
				count: m.count,
				remove: m.remove
			} satisfies StatusModifier
		}),

	}
	pushAnimation({
		sceneId: sceneToPlayAnim,
		battleAnimation: battleAnimation,
		leavingScene: leavingScene,
	})
}

export function getServerActionsMetRequirementsFromVases(vases: VisualActionSource[], player: Player): GameAction[] {
	let validActionsFromVases: GameAction[] = []
	for (const vas of vases) {
		let acts = getValidUnlockableServerActionsFromVas(vas, player)
		for (const act of acts) {
			validActionsFromVases.push(act)
		}
	}
	return validActionsFromVases
}


export function getValidUnlockableServerActionsFromVas(vas: VisualActionSource, player: Player): GameAction[] {
	let validUnlockableActions: GameAction[] = []
	if (vas.actionsWithRequirements) {
		for (const unlockableActData of vas.actionsWithRequirements) {
			let passedRequirements = true
			if (unlockableActData.requiresGear) {
				for (const requiredItem of unlockableActData.requiresGear) {
					if (!checkHasItem(player, requiredItem)) {
						passedRequirements = false
						break
					}
				}
			}
			if (unlockableActData.requiresFlags != undefined) {
				for (const flagRequired of unlockableActData.requiresFlags) {
					if (!player.flags.has(flagRequired)) {
						passedRequirements = false
					}
				}
			}
			if (unlockableActData.requiresNotFlags != undefined) {
				for (const flagNotAllowed of unlockableActData.requiresNotFlags) {
					if (player.flags.has(flagNotAllowed)) {
						passedRequirements = false
					}
				}
			}
			if (passedRequirements) {
				let ga: GameAction

				let txt: string = 'no text'
				let targ: UnitId | undefined = undefined
				if (unlockableActData.pickupItem) {
					let id = unlockableActData.pickupItem
					txt = `Equip ${id}`
					targ = vas.unitId
				}
				if (unlockableActData.travelTo) {
					let travelTo = unlockableActData.travelTo
					let scene = scenes.get(travelTo)
					if (!scene) continue
					txt = `Travel to ${scene.displayName}`
					targ = vas.unitId
				}

				if (unlockableActData.bText) {
					txt = unlockableActData.bText
				}

				ga = {
					buttonText: txt,
					unlockableActData: unlockableActData,
					target: targ
				}

				// else {
				// 	continue
				// }

				validUnlockableActions.push(ga)
			}
		}
	}
	return validUnlockableActions
}


export function convertServerActionToClientAction(sa: GameAction): GameActionSentToClient {
	return {
		buttonText: sa.buttonText,
		// slot: sa.slot != 'wait' && sa.slot != 'succumb' ? sa.slot : undefined,
		itemId: sa.itemId,
		slot: sa.slot,
		target: sa.target,
	}
}

export function convertVasToClient(vas: VisualActionSource, player: Player): VisualActionSourceInClient {
	let validUnlockableActions = getValidUnlockableServerActionsFromVas(vas, player)

	let validUnlockableClientActions: GameActionSentToClient[] = []
	validUnlockableClientActions = convertUnlockableActionsToClient(validUnlockableActions)

	let startText = vas.startText
	let startLocked = vas.startsLocked
	let responses: ConversationResponse[] = []
	if (vas.responses) responses = vas.responses
	let detectStep = undefined
	if (vas.detect) {
		for (const detected of vas.detect) {
			if (player.flags.has(detected.flag)) {
				detectStep = detected.flag
				startLocked = detected.locked
				responses = detected.responses ?? []
				startText = detected.startText ?? vas.startText
			}
		}
	}

	let result = {
		id: vas.unitId,
		displayName: vas.displayName,
		startText: startText,
		responses: responses,
		sprite: vas.sprite,
		portrait: vas.portrait,
		startsLocked: startLocked,
		actionsInClient: validUnlockableClientActions,
		detectStep: detectStep,
	} satisfies VisualActionSourceInClient
	return result
}

export function convertUnlockableActionsToClient(sUnlockables: (GameAction[] | undefined)): GameActionSentToClient[] {
	let clientUnlockables: GameActionSentToClient[] = []
	if (!sUnlockables) return clientUnlockables
	return sUnlockables.map(u => {
		return convertServerActionToClientAction(u)
	})
}

export type VisualActionSource = {
	unitId: VisualActionSourceId
	displayName: string
	sprite: AnySprite
	portrait?: string
	actionsWithRequirements?: UnlockableActionData[]
	startText: string,
	responses?: ConversationResponse[]
	detect?: { flag: Flag, startText?: string, responses?: ConversationResponse[], locked?: boolean }[]
	startsLocked?: boolean
}

export type VisualActionSourceInClient = {
	displayName: string
	startsLocked?: boolean
	id: VisualActionSourceId
	sprite: AnySprite
	portrait?: string
	actionsInClient: GameActionSentToClient[]
	startText: string,
	responses: ConversationResponse[]
	detectStep?: Flag
}

export type UnlockableActionData = {
	requiresFlags?: Flag[]
	requiresNotFlags?: Flag[]
	requiresGear?: ItemId[]
	pickupItem?: ItemId
	travelTo?: SceneId
	setsFlag?: Flag
	bText?: string
	spawnsEnemies?: { eName: string, eTemp: EnemyTemplateId }[]
}

export type ConversationResponse = {
	responseId: string,
	unlock?: string[],
	lock?: string[],
	unlockVas?: VisualActionSourceId[],
	lockVas?: VisualActionSourceId[],
	startsLocked?: boolean,
	responseText: string,
	retort?: string,
}
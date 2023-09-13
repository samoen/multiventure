import { goto } from "$app/navigation"
import { addAnimateToUnit, animatesToUnit, type AggroModifier, type AggroModifierEvent, type AnimationBehavior, type AnySprite, type BattleAnimation, type BattleEvent, type BattleEventEntity, type GameActionSentToClient, type HealthModifier, type HealthModifierEvent, type HeroId, type ItemAnimationBehavior, type StatusEffect, type StatusModifier, type StatusModifierEvent, type UnitId, type VisualActionSourceId, type StatusState } from "$lib/utils"
import { enemiesInScene, activeEnemies, addAggro, takePoisonDamage, damagePlayer, pushAnimation, getAggroForPlayer, damageEnemy, modifyAggroForPlayer, modifiedEnemyHealth, type EnemyTemplateId, spawnEnemy, type EnemyStatuses, type ActiveEnemy, checkEnemyDeath } from "./enemies"
import { items, type Item, equipItem, checkHasItem, type ItemId, type CanTarget } from "./items"
import { pushHappening } from "./messaging"
import { alreadySpawnedCurrentBattle, spawnedNewBattle, hasPlayerAlreadySpawnedForBattle, spawnedOngoing, getSceneData, type UniqueSceneIdenfitier, type SceneDataId, getSceneDataSimple, dead, uniqueFromSceneDataId } from "./scenes"
import { statusDatas, type StatusData, type StatusId } from "./statuses"
import { users, type Player, type GameAction, healPlayer, type Flag, activePlayersInScene } from "./users"

export function updateAllPlayerActions() {
	for (const allPlayer of users.values()) {
		updatePlayerActions(allPlayer)
	}
}

export function updatePlayerActions(player: Player) {
	player.devActions = []
	player.itemActions = []
	player.visualActionSources = []
	player.vasActions = []

	let scene = getSceneData(player)
	let sceneEnemies = enemiesInScene(player.currentUniqueSceneId)
	let scenePlayers = activePlayersInScene(player.currentUniqueSceneId)

	for (const cd of player.inventory) {
		const i = items.find(item => item.id == cd.stats.id)
		if (i == undefined) continue
		if (i.noAction) continue
		if (!i.useableOutOfBattle && !sceneEnemies.length) continue
		if ((i.requiresSourceDead && player.health > 0)) continue
		if (!i.requiresSourceDead && player.health < 1) continue
		if (cd.cooldown > 0) continue
		if (cd.warmup > 0) continue
		if (cd.stock != undefined && cd.stock < 1) continue

		let iAb: ItemAnimationBehavior = i.behavior ?? { kind: 'melee' }
		let iCt: CanTarget
		if (i.canTarget) {
			iCt = i.canTarget
		} else if (iAb.kind == 'melee' || iAb.kind == 'missile') {
			iCt = { kind: 'anyEnemy' }
		} else {
			iCt = { kind: 'onlySelf' }
		}



		let nBe = (
			targetChosen: BattleEventEntity
		) => {
			let affected: BattleEventEntity[] = []
			if (i.affects) {
				if ((i.affects == 'allEnemy')) {
					affected = sceneEnemies.map(se => {
						return {
							kind: 'enemy',
							entity: se,
						}
					})
				} else if (i.affects == 'allFriendly') {
					affected = [{ kind: 'player', entity: player }]
				}
			} else {
				affected = [targetChosen]
			}

			let alsoDmgs: HealthModifierEvent[] = []
			let modagro: AggroModifierEvent[] = []
			let ptstatuses: StatusModifierEvent[] = []
			let bonus = 0
			if (iAb.kind == 'melee') {
				bonus = player.strength + player.bonusStrength
			}
			for (const aff of affected) {
				if (i.baseDmg) {
					alsoDmgs.push({
						target: aff,
						baseDamage: i.baseDmg,
						bonusDamage: bonus,
						strikes: i.strikes ?? 1,
					} satisfies HealthModifierEvent)
				}
				if (i.baseHealToTarget) {
					alsoDmgs.push({
						target: aff,
						baseHeal: i.baseHealToTarget,
					} satisfies HealthModifierEvent)
				}
				let aModEvent = AggroModifierEventFromItem(aff, i, player, scenePlayers)
				if (aModEvent) {
					modagro.push(aModEvent)
				}
				let sModEvent = StatusModifierEventFromItem(aff, i)
				if (sModEvent) {
					ptstatuses.push(sModEvent)
				}
			}

			let beBehav: AnimationBehavior

			if (animatesToUnit(iAb)) {
				beBehav = addAnimateToUnit(iAb, targetChosen.entity.unitId)
			} else {
				beBehav = iAb
			}

			if (i.canTarget?.kind == 'anyFriendly' && targetChosen) {
				if (targetChosen.entity.unitId == player.unitId) {
					beBehav = { kind: 'selfInflicted', extraSprite: i.canTarget.selfAfflictSprite }
				}
			}

			let result: BattleEvent = {
				source: { kind: 'player', entity: player },
				behavior: beBehav,
				teleportsTo: i.teleportTo,
				alsoDamages: alsoDmgs,
				alsoModifiesAggro: modagro,
				putsStatuses: ptstatuses,
				stillHappenIfTargetDies: i.requiresSourceDead
			} satisfies BattleEvent

			return result
		}


		let targetable: BattleEventEntity[] = []
		if (iCt.kind == 'anyEnemy') {
			targetable = sceneEnemies.map(se => {
				return {
					kind: 'enemy',
					entity: se
				}
			})
		} else if (iCt.kind == 'anyFriendly') {
			targetable = scenePlayers.map(sp => {
				return {
					kind: 'player',
					entity: sp
				}
			})
		} else {
			targetable = [{ kind: 'player', entity: player }]
		}

		for (const t of targetable) {
			let perTargbe = nBe(t)
			let statuses: Map<StatusId, number> | undefined = undefined
			if (t.kind == 'player') {
				statuses = t.entity.statuses
			} else if (t.kind == 'enemy') {
				statuses = t.entity.statuses.get(player.unitId)
			}

			if ((i.requiresTargetDamaged && !(t.entity.health < t.entity.maxHealth && t.entity.health > 0)) ||
				(i.requiresStatus && !checkHasStatus(t, i.requiresStatus)) ||
				(statuses && immuneDueToStatus(statuses))
			) {
				continue
			}
			let ga: GameAction = {
				buttonText: `use ${i.id} on ${t.entity.unitId}`,
				battleEvent: perTargbe,
				itemId: i.id,
				associateWithUnit: t.entity.unitId
			}
			player.itemActions.push(ga)
		}
	}

	if (scene.actions) {
		scene.actions(player)
	}
	if (!sceneEnemies.length) {
		if (scene.vases) {
			for (const vas of scene.vases) {
				player.visualActionSources.push(vas)
				let acts = getValidGameActionsFromVas(vas, player)
				player.vasActions.push(...acts)
			}
		}
	}
}

export function checkHasStatus(bee: BattleEventEntity, st: StatusId): boolean {
	if (bee.kind == 'player') {
		let found = bee.entity.statuses.get(st)
		return (found != undefined && found > 0)
	}
	if (bee.kind == 'enemy') {
		if (Array.from(bee.entity.statuses.values()).some(s => {
			let c = s.get(st)
			return c && c > 0
		})) {
			return true
		}
	}

	return false
}

export function removeStatusesOnProvoke(player: Player): StatusData | undefined {
	let result = undefined
	for (let [k, v] of player.statuses) {
		let statusData = statusDatas.find(s => s.id == k)
		if (!statusData) continue
		if (statusData.removeOnProvoke) {
			result = statusData
			player.statuses.delete(k)
		}
	}
	return result
}

export function removeStatus(bee: BattleEventEntity, st: StatusId) {
	if (bee.kind == 'player') {
		bee.entity.statuses.delete(st)
	}
	if (bee.kind == 'enemy') {
		for (const [key, value] of bee.entity.statuses) {
			value.delete(st)
		}
	}
}


function AggroModifierEventFromItem(aff: BattleEventEntity, i: Item, player: Player, scenePlayers: Player[]): AggroModifierEvent | undefined {
	if (i.modifiesAggroOnAffected) {
		if (aff.kind == 'enemy') {
			let fHeroes = [player]
			if (i.modifiesAggroOnAffected.kind == 'allPlayers') {
				fHeroes = scenePlayers
			}
			return {
				targetEnemy: aff.entity,
				forHeros: fHeroes,
				baseAmount: i.modifiesAggroOnAffected.amount,
			}
		}
	}
	return undefined
}

function StatusModifierEventFromItem(aff: BattleEventEntity, i: Item): StatusModifierEvent | undefined {
	if (i.putsStatusOnAffected) {
		return {
			target: aff,
			statusId: i.putsStatusOnAffected.statusId,
			count: i.putsStatusOnAffected.count,
			remove: i.putsStatusOnAffected.remove,
		}
	}
	return undefined
}

export function enterSceneOrWakeup(player: Player) {

	const enteringScene = getSceneData(player);
	const scenePlayers = activePlayersInScene(player.currentUniqueSceneId)

	const onlyMeInScene = !scenePlayers.filter(p => p.heroName != player.heroName).length

	if (onlyMeInScene) {
		// No players except me in here remove enemies
		for (const e of enemiesInScene(player.currentUniqueSceneId)) {
			let index = activeEnemies.indexOf(e)
			if (index != -1) {
				activeEnemies.splice(index, 1)
			}
		}
	}

	const sceneEnemies = enemiesInScene(player.currentUniqueSceneId)

	if (!sceneEnemies.length) {
		if (enteringScene.spawnsEnemiesOnEnter) {
			// start new battle
			spawnedNewBattle(player)

			for (const es of enteringScene.spawnsEnemiesOnEnter) {
				spawnEnemy(es, player.currentUniqueSceneId, player.unitId)
			}
		}
	} else {
		// we are joining a battle
		console.log('joining battle')
		for (const e of sceneEnemies) {
			// init enemy aggro towards me
			if (!e.aggros.has(player.unitId)) {
				e.aggros.set(player.unitId, e.template.startAggro)
			}
			// scale health to player count
			if (!enteringScene.solo) {
				scaleEnemyHealth(e, scenePlayers.length)
			}
		}

		if (enteringScene.spawnsEnemiesOnBattleJoin && !hasPlayerAlreadySpawnedForBattle(player)) {
			console.log('spawning on join')
			// spawn extra enemies
			spawnedOngoing(player)
			// let extraEnemyName = player.heroName.split('').reverse().join('')
			for (const es of enteringScene.spawnsEnemiesOnBattleJoin) {
				spawnEnemy(es, player.currentUniqueSceneId, player.unitId)
			}
		}
	}

	// Always perform these
	if (enteringScene.healsOnEnter) {
		player.health = player.maxHealth
	}
	if (enteringScene.setCheckpointOnEnter) {
		player.lastCheckpoint = player.currentUniqueSceneId
	}
	if (enteringScene.setsFlagOnEnter) {
		player.flags.add(enteringScene.setsFlagOnEnter)
	}


	// scene texts will be repopulated
	player.sceneTexts = [];
	if (enteringScene.sceneTexts) {
		let { fallback, ...froms } = enteringScene.sceneTexts
		let useDefault = true
		for (let [from, txt] of Object.entries(froms)) {
			if (player.previousScene.dataId == from && txt) {
				player.sceneTexts.push(txt)
				useDefault = false
				break
			}
		}
		if (useDefault) {
			player.sceneTexts.push(fallback)
		}
	}
}

export function scaleEnemyHealth(enemy: ActiveEnemy, playerCount: number) {
	let percentHealthBefore = enemy.health / enemy.maxHealth
	enemy.maxHealth = Math.floor(modifiedEnemyHealth(enemy.template.baseHealth, playerCount))
	enemy.health = Math.floor(percentHealthBefore * enemy.maxHealth)
}

export function changeScene(player: Player, goTo: SceneDataId) {

	let uniqueTo = uniqueFromSceneDataId(player.unitId, goTo)

	player.previousScene = player.currentUniqueSceneId
	player.currentUniqueSceneId = uniqueTo

	// When entering a new scene, state cooldowns to 0,
	// state warmups to the item warmup, stocks to start
	for (const itemState of player.inventory) {
		itemState.cooldown = 0
		if (itemState.stats.warmup) {
			itemState.warmup = itemState.stats.warmup
		} else {
			itemState.warmup = 0
		}
		if (itemState.stats.startStock != undefined) {
			itemState.stock = itemState.stats.startStock
		}
	}

	// should status persist after battles?
	player.statuses = new Map()

	player.bonusStrength = 0

	enterSceneOrWakeup(player)
}

export function handleAction(player: Player, actionFromId: GameAction) {
	const actionStartedInSceneId = player.currentUniqueSceneId

	// if (actionFromId.goTo) {
	// 	changeScene(player, actionFromId.goTo)
	// 	return
	// }
	if (actionFromId.devAction) {
		actionFromId.devAction()
		return
	}

	if (actionFromId.unlockableActData) {
		if (actionFromId.unlockableActData.pickupItem) {
			const idToPickup = actionFromId.unlockableActData.pickupItem
			equipItem(player, idToPickup)
			pushAnimation({
				sceneId: actionStartedInSceneId,
				battleAnimation: {
					triggeredBy: player.unitId,
					source: player.unitId,
					behavior: { kind: 'melee', animateTo: actionFromId.unlockableActData.vasId },
					takesItem: true,
				}
			})
		}

		if (actionFromId.unlockableActData.setsFlag) {
			player.flags.add(actionFromId.unlockableActData.setsFlag)
		}

		if (actionFromId.unlockableActData.spawnsEnemies) {
			for (const e of actionFromId.unlockableActData.spawnsEnemies) {
				spawnEnemy(e, player.currentUniqueSceneId, player.unitId)
			}
		}

		if (actionFromId.unlockableActData.travelTo) {

			changeScene(player, actionFromId.unlockableActData.travelTo)
			pushAnimation({
				leavingScene: player,
				sceneId: actionStartedInSceneId,
				battleAnimation: {
					triggeredBy: player.unitId,
					source: player.unitId,
					behavior: { kind: 'travel', animateTo: actionFromId.unlockableActData.vasId },
				}
			})
		}
		return
	}

	if (!actionFromId.itemId) return
	let itemUsed = items.find(i => i.id == actionFromId.itemId)
	if (!itemUsed) return


	pushHappening('----');

	if (itemUsed.provoke && itemUsed.provoke > 0) {
		let r = removeStatusesOnProvoke(player)
		if (r) {
			pushAnimation({
				sceneId: player.currentUniqueSceneId,
				battleAnimation: {
					triggeredBy: player.unitId,
					source: player.unitId,
					behavior: { kind: 'selfInflicted', extraSprite: r.selfInflictSprite, },
					putsStatuses: [{ statusId: r.id, target: player.unitId, remove: true }]
				}
			})
		}

	}

	handleRetaliations(player, false, actionFromId, itemUsed)

	if (player.health > 0 || itemUsed.requiresSourceDead) {
		preCombatActionPerformed(player, actionFromId, itemUsed)
		if (actionFromId.battleEvent) {
			processBattleEvent(actionFromId.battleEvent, player)
		}
	}

	if (player.health > 0) {
		handleRetaliations(player, true, actionFromId, itemUsed)
	}
	if (itemUsed.provoke != undefined) {
		for (const enemy of enemiesInScene(actionStartedInSceneId)) {
			let sprite: AnySprite | undefined = undefined
			let ad: HealthModifier[] = []

			for (const [hId, statusForPlayer] of enemy.statuses) {
				if (hId == player.unitId) {
					for (let [k, v] of statusForPlayer) {
						if (v < 1) continue
						let statusData = statusDatas.find(s => s.id == k)
						if (!statusData) continue
						if (statusData.damagePercent) {
							// takePoisonDamage(enemy, player)
							let dmg = Math.floor(enemy.maxHealth * statusData.damagePercent)
							enemy.health -= dmg
							checkEnemyDeath(enemy)
							ad.push({ target: enemy.unitId, amount: [dmg] })
							sprite = statusData.selfInflictSprite
							pushHappening(`${enemy.name} took ${dmg} damage from ${k}`)
						}
						if (statusData.incStr) {
							enemy.damage += statusData.incStr
							pushHappening(`${enemy.name} grows in strength!`)
						}

						statusForPlayer.set(k, v - 1)
					}
				}
			}
			if (ad.length && sprite) {
				pushAnimation(
					{
						sceneId: player.currentUniqueSceneId,
						battleAnimation: {
							triggeredBy: player.unitId,
							source: enemy.unitId,
							alsoDamages: ad,
							behavior: { kind: 'selfInflicted', extraSprite: sprite }
						}
					}
				)
			}
		}
	}

	if (player.health > 0 && itemUsed.provoke != undefined) {
		let ad: HealthModifier[] = []
		let sprite: AnySprite | undefined = undefined
		for (let [k, v] of player.statuses) {
			if (v < 1) continue
			let statusData = statusDatas.find(s => s.id == k)
			if (!statusData) continue
			if (statusData.damagePercent) {
				let dmg = Math.floor(player.maxHealth * statusData.damagePercent)
				player.health -= dmg
				ad.push({ target: player.unitId, amount: [dmg] })
				sprite = statusData.selfInflictSprite
				pushHappening(`${player.heroName} took ${dmg} damage from ${k}`)
			}
			if (statusData.incStr) {
				player.bonusStrength += 10
				pushHappening(`${player.heroName} grows in strength!`)
			}

			player.statuses.set(k, v - 1)
		}
		if (ad.length && sprite) {
			pushAnimation(
				{
					sceneId: player.currentUniqueSceneId,
					battleAnimation: {
						triggeredBy: player.unitId,
						source: player.unitId,
						alsoDamages: ad,
						behavior: { kind: 'selfInflicted', extraSprite: sprite }
					}
				}
			)
		}
	}


	if (itemUsed.provoke != undefined && player.health > 0) {
		addAggro(player, itemUsed.provoke)
	}

	const playerScene = getSceneDataSimple(actionStartedInSceneId.dataId);
	const postReactionEnemies = enemiesInScene(actionStartedInSceneId)
	if (!postReactionEnemies.length) {
		for (const playerInScene of activePlayersInScene(player.currentUniqueSceneId)) {
			if (playerScene.healsOnVictory) {
				playerInScene.health = playerInScene.maxHealth
			}
			if (playerScene.setsFlagOnVictory) {
				playerInScene.flags.add(playerScene.setsFlagOnVictory)
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
		let itemState = player.inventory.find(i => i.stats.id == gameAction.itemId)
		if (itemState) {
			if (itemState.stats.cooldown) {
				itemState.cooldown = itemState.stats.cooldown
			}
			if (itemState.stock) {
				itemState.stock--
			}
		}
	}

}

export function immuneDueToStatus(statusMap: Map<StatusId, number>): boolean {
	let immunity = false
	for (let [k, v] of statusMap) {
		if (v < 1) continue
		let foundData = statusDatas.find(d => d.id == k)
		if (!foundData) continue
		if (foundData.immunity) {
			immunity = true
		}
	}
	return immunity
}

export function handleRetaliations(player: Player, postAction: boolean, action: GameAction, itemUsed: Item) {
	if (itemUsed.grantsImmunity || immuneDueToStatus(player.statuses)) return
	let playerHitSpeed = player.agility
	if (itemUsed.speed) {
		playerHitSpeed += itemUsed.speed
	}
	let sceneEnemies = enemiesInScene(player.currentUniqueSceneId)
	for (const enemyInScene of sceneEnemies.sort((a, b) => b.template.speed - a.template.speed)) {
		if (enemyInScene.health < 1) continue
		if (player.health < 1) continue
		if (
			(postAction && (playerHitSpeed >= enemyInScene.template.speed))
			|| (!postAction && (playerHitSpeed < enemyInScene.template.speed))
		) {
			let aggroForActor = getAggroForPlayer(enemyInScene, player)
			if (aggroForActor) {
				if ((Math.random() < (aggroForActor / 100))) {

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
					let putsStatuses: StatusModifierEvent[] = []
					if (enemyInScene.template.putsStatusOnTarget) {
						putsStatuses.push({
							statusId: enemyInScene.template.putsStatusOnTarget.statusId,
							count: enemyInScene.template.putsStatusOnTarget.count,
							target: target,
						})
					}
					let iBehav: ItemAnimationBehavior = enemyInScene.template.behavior ?? { kind: 'melee' }
					let behav: AnimationBehavior = addAnimateToUnit(iBehav, target.entity.unitId)
					let be: BattleEvent = {
						source: { kind: 'enemy', entity: enemyInScene },
						behavior: behav,
						putsStatuses: putsStatuses,
						alsoDamages: [{ target: target, baseDamage: enemyInScene.damage, strikes: enemyInScene.template.strikes ?? 1 }]
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
	if (battleEvent.putsStatuses) {
		for (const put of battleEvent.putsStatuses) {
			if (put.target.entity.health < 0 && !battleEvent.stillHappenIfTargetDies) continue
			if (put.count) {
				if (put.target.kind == 'enemy') {
					let found = put.target.entity.statuses.get(player.unitId)
					if (!found) {
						found = new Map()
					}
					let exist = found.get(put.statusId)

					if (!exist || exist < put.count) {
						found.set(put.statusId, put.count)
					}
					put.target.entity.statuses.set(player.unitId, found)
				}
				if (put.target.kind == 'player') {
					let found = put.target.entity.statuses.get(put.statusId)
					if (!found) {
						put.target.entity.statuses.set(put.statusId, put.count)
					} else {
						if (found < put.count) {
							put.target.entity.statuses.set(put.statusId, put.count)
						}
					}
				}
			}
			if (put.remove) {
				removeStatus(put.target, put.statusId)
			}
		}
	}
	let alsoDmgedAnimation: HealthModifier[] = []
	if (battleEvent.alsoDamages) {
		for (const healthModifyEvent of battleEvent.alsoDamages) {
			if (healthModifyEvent.target.entity.health < 0 && !battleEvent.stillHappenIfTargetDies) continue
			if (healthModifyEvent.target.kind == 'enemy') {
				if (healthModifyEvent.baseDamage) {
					let r = damageEnemy(
						battleEvent.source,
						healthModifyEvent.target.entity,
						healthModifyEvent.baseDamage,
						healthModifyEvent.strikes,
						healthModifyEvent.bonusDamage,
					)
					alsoDmgedAnimation.push({
						target: healthModifyEvent.target.entity.unitId,
						amount: r.dmgDone,
					})
				}
			} else if (healthModifyEvent.target.kind == 'player') {
				if (healthModifyEvent.baseHeal) {
					let r = healPlayer(healthModifyEvent.target.entity, healthModifyEvent.baseHeal)
					alsoDmgedAnimation.push({
						target: healthModifyEvent.target.entity.unitId,
						amount: [r.healed * -1],
					})
				} else if (healthModifyEvent.baseDamage && battleEvent.source.kind == 'enemy') {
					let r = damagePlayer(battleEvent.source.entity, healthModifyEvent.target.entity, healthModifyEvent.baseDamage)
					alsoDmgedAnimation.push({
						target: healthModifyEvent.target.entity.unitId,
						amount: r.dmgDone,
					})
				}
			}
		}
	}
	let aggroModifiedAnimations: AggroModifier[] = []
	if (battleEvent.alsoModifiesAggro) {
		for (const modifyEvent of battleEvent.alsoModifiesAggro) {
			if (modifyEvent.targetEnemy.health < 0 && !battleEvent.stillHappenIfTargetDies) continue
			let foHeros: { hId: HeroId, amount: number }[] = []
			for (const hero of modifyEvent.forHeros) {
				let r = modifyAggroForPlayer(hero, modifyEvent.targetEnemy, modifyEvent.baseAmount)
				foHeros.push({
					hId: hero.unitId,
					amount: r.increasedBy,
				})
			}

			aggroModifiedAnimations.push({
				forHeros: foHeros,
				target: modifyEvent.targetEnemy.unitId,
			})

		}
	}


	let leavingScene = undefined
	let sceneToPlayAnim = player.currentUniqueSceneId

	if (battleEvent.teleportsTo) {
		leavingScene = player
		changeScene(player, battleEvent.teleportsTo)
	}

	let battleAnimation: BattleAnimation = {
		triggeredBy: player.unitId,
		source: battleEvent.source.entity.unitId,
		behavior: battleEvent.behavior,
		alsoDamages: alsoDmgedAnimation,
		alsoModifiesAggro: aggroModifiedAnimations,
		putsStatuses: battleEvent.putsStatuses?.map(m => {
			return {
				statusId: m.statusId,
				target: m.target.entity.unitId,
				count: m.count,
				remove: m.remove
			} satisfies StatusModifier
		}),
		teleporting: battleEvent.teleportsTo ? true : undefined

	}
	pushAnimation({
		sceneId: sceneToPlayAnim,
		battleAnimation: battleAnimation,
		leavingScene: leavingScene,
	})
}

export function getValidGameActionsFromVas(vas: VisualActionSource, player: Player): GameAction[] {
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
				if (unlockableActData.pickupItem) {
					let id = unlockableActData.pickupItem
					txt = `Equip ${id}`
				}
				if (unlockableActData.travelTo) {
					let scene = getSceneDataSimple(unlockableActData.travelTo)
					txt = `Travel to ${scene.displayName}`
				}
				if (unlockableActData.travelToCheckpoint) {
					let travelTo = player.lastCheckpoint.dataId
					unlockableActData.travelTo = travelTo

					let scene = getSceneDataSimple(travelTo)
					txt = `Respawn at checkpoint: ${scene.displayName}`
				}

				if (unlockableActData.bText) {
					txt = unlockableActData.bText
				}

				ga = {
					buttonText: txt,
					unlockableActData: { ...unlockableActData, vasId: vas.unitId },
					associateWithUnit: vas.unitId,
				}

				validUnlockableActions.push(ga)
			}
		}
	}
	return validUnlockableActions
}


export function convertServerActionToClientAction(sa: GameAction): GameActionSentToClient {
	return {
		buttonText: sa.buttonText,
		itemId: sa.itemId,
		associateWithUnit: sa.associateWithUnit,
	}
}

export function convertVasToClient(vas: VisualActionSource, player: Player): VisualActionSourceInClient {

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
		detectStep: detectStep,
		scene: player.currentUniqueSceneId.dataId,
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
	actionsWithRequirements?: VasActionData[]
	startText: string,
	responses?: ConversationResponse[]
	detect?: { flag: Flag, startText?: string, responses?: ConversationResponse[], locked?: boolean }[]
	startsLocked?: boolean
}

export type VisualActionSourceInClient = {
	displayName: string
	scene: SceneDataId
	startsLocked?: boolean
	id: VisualActionSourceId
	sprite: AnySprite
	portrait?: string
	startText: string,
	responses: ConversationResponse[]
	detectStep?: Flag
}

export type VasActionData = {
	requiresFlags?: Flag[]
	requiresNotFlags?: Flag[]
	requiresGear?: ItemId[]
	pickupItem?: ItemId
	travelTo?: SceneDataId
	travelToCheckpoint?: boolean
	setsFlag?: Flag
	bText?: string
	spawnsEnemies?: EnemyForSpawning[]
}

export type EnemyForSpawning = {
	eName?: string,
	eTemp: EnemyTemplateId,
	statuses?: StatusState[]
}

// export type EnemyStatusesObject = Record<StatusId,number>

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

export function deepEqual(objA: any, objB: any): boolean {
	// Check if both objects are of the same type
	if (typeof objA !== typeof objB) {
		return false;
	}

	if (typeof objA !== 'object' || objA === null || objB === null) {
		// If both objects are not objects or are null, compare them directly
		return objA === objB;
	}

	// Get the keys of both objects
	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	// Check if the number of keys is the same
	if (keysA.length !== keysB.length) {
		return false;
	}

	// Check if all keys in objA are also in objB and have equal values
	for (const key of keysA) {
		if (!keysB.includes(key) || !deepEqual(objA[key], objB[key])) {
			return false;
		}
	}

	return true;
}
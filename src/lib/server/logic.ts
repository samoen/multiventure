import { goto } from "$app/navigation"
import type { AggroModifier, AggroModifierEvent, AnySprite, BattleAnimation, BattleEvent, BattleEventEntity, GameActionSentToClient, HealthModifier, HealthModifierEvent, HeroId, StatusEffect, StatusId, StatusModifier, StatusModifierEvent, UnitId, VisualActionSourceId } from "$lib/utils"
import { enemiesInScene, activeEnemies, addAggro, takePoisonDamage, damagePlayer, pushAnimation, getAggroForPlayer, damageEnemy, modifyAggroForPlayer, modifiedEnemyHealth, type EnemyTemplateId, spawnEnemy, type EnemyStatuses, type ActiveEnemy } from "./enemies"
import { items, type Item, equipItem, checkHasItem, type ItemId, type AffectStyle } from "./items"
import { pushHappening } from "./messaging"
import { alreadySpawnedCurrentBattle, spawnedNewBattle, hasPlayerAlreadySpawnedForBattle, spawnedOngoing, getSceneData, type UniqueSceneIdenfitier, type SceneDataId, getSceneDataSimple, dead, uniqueFromSceneDataId } from "./scenes"
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
		if (i == undefined) return
		if (!i.useableOutOfBattle && !sceneEnemies.length) continue
		if ((i.requiresSourceDead && player.health > 0)) continue
		if (!i.requiresSourceDead && player.health < 1) continue
		if (cd.cooldown > 0) continue
		if (cd.warmup > 0) continue
		if (cd.stock != undefined && cd.stock < 1) continue
		if (i.targetStyle.kind == 'noAction') continue


		let nBe = (
			targ?: BattleEventEntity
		) => {
			let affected: BattleEventEntity[] = []
			if(targ){
				affected.push(targ)
			}
			if (i.affectStyle) {
				if ((i.affectStyle.kind == 'AllEnemy')) {
					affected = sceneEnemies.map(se => {
						return {
							kind: 'enemy',
							entity: se,
						}
					})
				}
				if (i.affectStyle.kind == 'SelfOnly') {
					affected = [{ kind: 'player', entity: player }]
				}
				if (i.affectStyle.kind == 'TargetOnly' && targ) {
					affected = [targ]
				}
			}

			let alsoDmgs: HealthModifierEvent[] = []
			let modagro: AggroModifierEvent[] = []
			let ptstatuses: StatusModifierEvent[] = []
			for (const aff of affected) {
				let hModEvent = HealthModifierEventFromItem(aff, i)
				if (hModEvent) {
					alsoDmgs.push(hModEvent)
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
			let result: BattleEvent = {
				source: { kind: 'player', entity: player },
				target:targ,
				behavior: i.behavior,
				teleportsTo: i.teleportTo,
				alsoDamages: alsoDmgs,
				alsoModifiesAggro: modagro,
				putsStatuses: ptstatuses,
			} satisfies BattleEvent

			return result
		}

		let targetable: BattleEventEntity[] | undefined = undefined

		if ((i.targetStyle.kind == 'anyEnemy')) {
			targetable = sceneEnemies.map(se => {
				return {
					kind: 'enemy',
					entity: se
				}
			})
		}
		if ((i.targetStyle.kind == 'anyFriendly')) {
			targetable = scenePlayers.map(sp => {
				return {
					kind: 'player',
					entity: sp
				}
			})
		}

		if (i.targetStyle.kind == 'noTarget') {
			let noTargBe = nBe()
			let ga: GameAction = {
				buttonText: `use ${i.id} without target`,
				battleEvent: noTargBe,
				itemId: i.id,
			}
			player.itemActions.push(ga)
		} else {
			let targetable: BattleEventEntity[] = []

			if ((i.targetStyle.kind == 'anyEnemy')) {
				targetable = sceneEnemies.map(se => {
					return {
						kind: 'enemy',
						entity: se
					}
				})
			}
			if ((i.targetStyle.kind == 'anyFriendly')) {
				targetable = scenePlayers.map(sp => {
					return {
						kind: 'player',
						entity: sp
					}
				})
			}
			for (const t of targetable) {
				let perTargbe = nBe(t)
				if ((!i.requiresTargetDamaged || t.entity.health < t.entity.maxHealth && t.entity.health > 0) &&
					(!i.requiresStatus || checkHasStatus(t, i.requiresStatus))) {
					if (i.targetStyle.kind == 'anyFriendly') {
						let behav = i.behavior
						if (t.entity.unitId == player.unitId) {
							behav = i.targetStyle.selfBehavior
						}
						perTargbe.behavior = behav
					}
					let ga: GameAction = {
						buttonText: `use ${i.id} on ${t.entity.unitId}`,
						battleEvent: perTargbe,
						itemId: i.id,
						target: t.entity.unitId
					}
					player.itemActions.push(ga)
				}

			}
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
		return bee.entity.statuses[st] > 0
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

function HealthModifierEventFromItem(aff: BattleEventEntity, i: Item): HealthModifierEvent | undefined {
	if (i.baseDmg || i.baseHealToTarget) {
		return {
			target:aff,
			baseDamage: i.baseDmg,
			baseHeal: i.baseHealToTarget,
			strikes:i.strikes ?? 1,
		} satisfies HealthModifierEvent
	}
	return undefined
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
			targetEnemy: aff.kind == 'enemy' ? aff.entity : undefined,
			targetPlayer: aff.kind == 'player' ? aff.entity : undefined,
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
	player.statuses = {
		poison: 0,
		rage: 0,
		hidden: 0,
	}

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
					target: actionFromId.target,
					behavior: { kind: 'melee' },
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
					behavior: { kind: 'travel' },
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
			sceneId: player.currentUniqueSceneId,
			battleAnimation: {
				triggeredBy: player.unitId,
				source: player.unitId,
				behavior: { kind: 'selfInflicted', extraSprite: 'smoke', },
				putsStatuses: [{ statusId: 'hidden', target: player.unitId, remove: true }]
			}
		})
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
			for (const [hId, statusForPlayer] of enemy.statuses) {
				if (hId == player.unitId) {
					let pois = statusForPlayer.get('poison')
					if (pois && pois > 0) {
						takePoisonDamage(enemy, player)
						statusForPlayer.set('poison', pois - 1)
					}
					let rg = statusForPlayer.get('rage')
					if (rg && rg > 0) {
						enemy.damage += 10
						pushHappening(`${enemy.name}'s rage grows!`)
						statusForPlayer.set('rage', rg - 1)
					}
					let hidn = statusForPlayer.get('hidden')
					if (hidn && hidn > 0) {
						statusForPlayer.set('hidden', hidn - 1)
					}

				}
			}
		}
	}

	if (player.health > 0 && itemUsed.provoke != undefined) {
		if (player.statuses.poison > 0) {
			let dmg = Math.floor(player.maxHealth * 0.1)
			player.health -= dmg
			pushHappening(`${player.heroName} took ${dmg} damage from poison`)
			pushAnimation(
				{
					sceneId: player.currentUniqueSceneId,
					battleAnimation: {
						triggeredBy: player.unitId,
						source: player.unitId,
						target: player.unitId,
						alsoDamages:[{target:player.unitId,amount:dmg, strikes:1}],
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

export function handleRetaliations(player: Player, postAction: boolean, action: GameAction, itemUsed: Item) {
	if (itemUsed.grantsImmunity || player.statuses.hidden > 0) return
	let playerHitSpeed = player.agility
	if (itemUsed.speed) {
		playerHitSpeed += itemUsed.speed
	}
	let sceneEnemies = enemiesInScene(player.currentUniqueSceneId)
	for (const enemyInScene of sceneEnemies.sort((a, b) => b.template.speed - a.template.speed)) {
		if (enemyInScene.health < 1) continue
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
						alsoDamages:[{target:target,baseDamage:enemyInScene.damage,strikes:enemyInScene.template.strikes??1}]
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
		(battleEvent.target && battleEvent.target.kind == 'enemy' && battleEvent.target.entity.health < 1) ||
		(battleEvent.target && battleEvent.target.kind == 'player' && battleEvent.target.entity.health < 1)
	) {
		return
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
						found.set(put.statusId, put.count)
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
			if (healthModifyEvent.target.kind == 'enemy') {
					if (healthModifyEvent.baseDamage) {
						let r = damageEnemy(
								battleEvent.source, 
								healthModifyEvent.target.entity, 
								healthModifyEvent.baseDamage, 						
								healthModifyEvent.strikes)
						alsoDmgedAnimation.push({
							target: healthModifyEvent.target.entity.unitId,
							amount: r.dmgDone,
							strikes:healthModifyEvent.strikes,
						})
					}
			}else if(healthModifyEvent.target.kind == 'player'){
				if(healthModifyEvent.baseHeal){
					let r = healPlayer(healthModifyEvent.target.entity,healthModifyEvent.baseHeal)
					alsoDmgedAnimation.push({
						target:healthModifyEvent.target.entity.unitId,
						amount:r.healed * -1,
						strikes:healthModifyEvent.strikes,
					})
				}else if(healthModifyEvent.baseDamage && battleEvent.source.kind == 'enemy'){
					let r = damagePlayer(battleEvent.source.entity,healthModifyEvent.target.entity,healthModifyEvent.baseDamage)
					alsoDmgedAnimation.push({
						target:healthModifyEvent.target.entity.unitId,
						amount:r.dmgDone,
						strikes:healthModifyEvent.strikes,
					})
				}
			}
		}
	}
	let aggroModifiedAnimations: AggroModifier[] = []
	if (battleEvent.alsoModifiesAggro) {
		for (const modifyEvent of battleEvent.alsoModifiesAggro) {
			let foHeros:{hId:HeroId,amount:number}[] = [] 
			for (const hero of modifyEvent.forHeros) {
				let r = modifyAggroForPlayer(hero, modifyEvent.targetEnemy, modifyEvent.baseAmount)
				foHeros.push({
					hId:hero.unitId,
					amount:r.increasedBy,
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
		target: battleEvent.target?.entity.unitId,
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
				let targ: UnitId | undefined = undefined
				if (unlockableActData.pickupItem) {
					let id = unlockableActData.pickupItem
					txt = `Equip ${id}`
					targ = vas.unitId
				}
				if (unlockableActData.travelTo) {
					let scene = getSceneDataSimple(unlockableActData.travelTo)
					txt = `Travel to ${scene.displayName}`
					targ = vas.unitId
				}
				if (unlockableActData.travelToCheckpoint) {
					let travelTo = player.lastCheckpoint.dataId
					unlockableActData.travelTo = travelTo

					let scene = getSceneDataSimple(travelTo)
					txt = `Respawn at checkpoint: ${scene.displayName}`
					targ = vas.unitId
				}

				if (unlockableActData.bText) {
					txt = unlockableActData.bText
				}

				ga = {
					buttonText: txt,
					unlockableActData: unlockableActData,
					target: targ,
					vasId: vas.unitId,
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
		target: sa.target,
		vasId: sa.vasId,
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

export type EnemyForSpawning = { eName?: string, eTemp: EnemyTemplateId, statuses?: EnemyStatusesObject }

// export type EnemyStatusesObject = Record<StatusId,number>
export type EnemyStatusesObject = {
	[k in StatusId]?: number;
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
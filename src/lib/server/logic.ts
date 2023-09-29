import { goto } from '$app/navigation';
import type { BattleEventEntity, BattleEvent, ItemAnimationBehavior, DamageEvent, HealEvent, AggroModifierEvent, StatusModifierEvent, AnimationBehavior, DamageAnimation, AnySprite, HealAnimation, AggroModifier, HeroId, BattleAnimation, StatusModifyAnimation, GameActionSentToClient, VisualActionSourceId, StatusState } from '$lib/utils';
import {
	enemiesInScene,
	activeEnemies,
	addAggro,
	pushAnimation,
	getAggroForPlayer,
	damageEntity,
	modifyAggroForPlayer,
	modifiedEnemyHealth,
	type EnemyTemplateId,
	spawnEnemy,
	type EnemyStatuses,
	type ActiveEnemy,
	checkEnemyDeath
} from './enemies';
import {
	items,
	type Item,
	equipItem,
	checkHasItem,
	type ItemId,
	type CanTarget,
	type CanEffect
} from './items';
import { pushHappening } from './messaging';
import {
	alreadySpawnedCurrentBattle,
	spawnedNewBattle,
	hasPlayerAlreadySpawnedForBattle,
	spawnedOngoing,
	getSceneData,
	type UniqueSceneIdenfitier,
	type SceneDataId,
	getSceneDataSimple,
	dead,
	uniqueFromSceneDataId
} from './scenes';
import { statusDatas, type StatusData, type StatusId } from './statuses';
import {
	users,
	type Player,
	type GameAction,
	healEntity,
	type Flag,
	activePlayersInScene
} from './users';

export function updateAllPlayerActions() {
	for (const allPlayer of users.values()) {
		updatePlayerActions(allPlayer);
	}
}

export function createPossibleBattleEventsFromEntity(
	bee: BattleEventEntity,
	uSceneId: UniqueSceneIdenfitier,
	triggeredBy: Player
): BattleEvent[] {
	let scenePlayers = activePlayersInScene(uSceneId)
	let scenePlayersEntities: BattleEventEntity[] = scenePlayers.map((sp) => {
		return {
			kind: 'player',
			entity: sp
		};
	})
	let sceneEnemiesEntities: BattleEventEntity[] = enemiesInScene(uSceneId).map(se => {
		return {
			kind: 'enemy',
			entity: se
		}
	})
	let alliesOfBee: BattleEventEntity[] = []
	let opponentsOfBee: BattleEventEntity[] = []
	if (bee.kind == 'player') {
		alliesOfBee = scenePlayersEntities
		opponentsOfBee = sceneEnemiesEntities
	}
	if (bee.kind == 'enemy') {
		alliesOfBee = sceneEnemiesEntities
		opponentsOfBee = scenePlayersEntities
	}

	let result: BattleEvent[] = []
	for (const itemState of bee.entity.inventory) {
		const i = items.find((item) => item.id == itemState.stats.id);
		if (i == undefined) continue;
		if (i.noAction) continue;
		if (!i.useableOutOfBattle && !opponentsOfBee.length) continue;
		if (i.requiresSourceDead && bee.entity.health > 0) continue;
		if (!i.requiresSourceDead && bee.entity.health < 1) continue;
		if (itemState.cooldown > 0) continue;
		if (itemState.warmup > 0) continue;
		if (itemState.stock != undefined && itemState.stock < 1) continue;

		const iAb: ItemAnimationBehavior = i.animation ?? { kind: 'melee' };
		let iCt: CanTarget;
		if (i.targets) {
			iCt = i.targets;
		} else if (iAb.kind == 'melee' || iAb.kind == 'missile') {
			iCt = { kind: 'anyEnemy' };
		} else {
			iCt = { kind: 'onlySelf' };
		}

		const affectedsFromCanEffect = (ca: CanEffect, t: BattleEventEntity) => {
			let affecteds: BattleEventEntity[] = [];
			if (ca == 'allEnemy') {
				affecteds = opponentsOfBee;
			} else if (ca == 'allFriendly') {
				affecteds = alliesOfBee;
			} else if (ca == 'selfOnly') {
				affecteds = [bee];
			} else if (ca == 'targetOnly') {
				affecteds = [t];
			}
			return affecteds;
		};

		const nBe = (targetChosen: BattleEventEntity) => {
			const alsoDmgs: DamageEvent[] = [];
			if (i.damages) {
				const dmgAffected = affectedsFromCanEffect(i.damages.affects, targetChosen);
				for (const aff of dmgAffected) {
					alsoDmgs.push({
						target: aff,
						itemDamageData: i.damages,
					} satisfies DamageEvent);
				}
			}
			const alsoHeals: HealEvent[] = [];
			if (i.heals) {
				const healAffected = affectedsFromCanEffect(i.heals.affects, targetChosen);
				for (const aff of healAffected) {
					if (i.heals) {
						alsoHeals.push({
							target: aff,
							baseHeal: i.heals.baseHeal
						} satisfies HealEvent);
					}
				}
			}
			const modagro: AggroModifierEvent[] = [];
			if (i.modifiesAggro) {
				const aggroAffected = affectedsFromCanEffect(i.modifiesAggro.affects, targetChosen);
				for (const aff of aggroAffected) {
					if (aff.kind == 'enemy') {
						let fHeroes = [triggeredBy];
						if (i.modifiesAggro.aggroFor == 'allPlayers') {
							fHeroes = scenePlayers;
						}
						modagro.push({
							targetEnemy: aff.entity,
							forHeros: fHeroes,
							baseAmount: i.modifiesAggro.amount
						});
					}
				}
			}
			const ptstatuses: StatusModifierEvent[] = [];
			if (i.modifiesStatus) {
				const statusAffected = affectedsFromCanEffect(i.modifiesStatus.affects, targetChosen);
				for (const aff of statusAffected) {
					// if (i.modifiesStatus.statusMod) {
					ptstatuses.push({
						target: aff,
						statusMod: i.modifiesStatus.statusMod,
						dispell: i.modifiesStatus.dispell,
					});
					// }
				}
			}

			let beBehav: AnimationBehavior = iAb;

			let animateTo: BattleEventEntity | undefined = undefined
			if (iAb.kind == 'missile' || iAb.kind == 'melee') {
				animateTo = targetChosen
			}

			if (iCt.kind == 'anyFriendly' && targetChosen) {
				if (targetChosen.entity.unitId == bee.entity.unitId) {
					beBehav = { kind: 'selfInflicted', extraSprite: iCt.selfAfflictSprite };
				}
			}

			const result: BattleEvent = {
				source: bee,
				primaryTarget:targetChosen,
				alsoHeals: alsoHeals,
				alsoModifiesAggro: modagro,
				putsStatuses: ptstatuses,
				itemUsed: i,
			} satisfies BattleEvent;

			return result;
		};

		let targetable: BattleEventEntity[] = [];
		if (iCt.kind == 'anyEnemy') {
			targetable = opponentsOfBee.filter(o => {
				if (bee.kind != 'enemy') return true
				if (o.entity.unitId != triggeredBy.unitId) {
					return false
				}
				return true
			});
		} else if (iCt.kind == 'anyFriendly') {
			targetable = alliesOfBee;
		} else {
			targetable = [bee];
		}

		for (const t of targetable) {
			const perTargbe = nBe(t);
			let targetImmune = false;
			if (iCt.kind == 'anyEnemy') {
				if (immuneDueToStatus(t)) {
					targetImmune = true;
				}
			}

			if (
				(i.requiresTargetDamaged &&
					!(t.entity.health < t.entity.maxHealth && t.entity.health > 0)) ||
				// (i.requiresStatus && !checkHasStatus(t, i.requiresStatus)) ||
				(i.requiresTargetWithoutStatus && checkHasStatus(t, i.requiresTargetWithoutStatus)) ||
				targetImmune
			) {
				continue;
			}
			result.push(perTargbe)
		}
	}


	return result
}

export function updatePlayerActions(player: Player) {
	const possibleBattleEvents = createPossibleBattleEventsFromEntity({ kind: 'player', entity: player }, player.currentUniqueSceneId, player)
	player.itemActions = [];
	for (let possibleBe of possibleBattleEvents) {
		let associate = possibleBe.primaryTarget.entity.unitId
		const ga: GameAction = {
			buttonText: `${possibleBe.source.entity.unitId} use ${possibleBe.itemUsed.id} on ${associate}`,
			battleEvent: possibleBe,
			itemId: possibleBe.itemUsed.id,
			associateWithUnit: associate,
		};
		player.itemActions.push(ga);
	}

	const scene = getSceneDataSimple(player.currentUniqueSceneId.dataId);

	player.devActions = [];
	if (scene.actions) {
		scene.actions(player);
	}
	player.devActions.push({
		buttonText: 'Give up',
		associateWithUnit: player.unitId,
		devAction() {
			player.health = 0
		},
	})

	player.vasActions = [];
	player.visualActionSources = [];
	const sceneEnemies = enemiesInScene(player.currentUniqueSceneId);
	if (!sceneEnemies.length) {
		if (scene.vases) {
			for (const vas of scene.vases) {
				player.visualActionSources.push(vas);
				const acts = getValidGameActionsFromVas(vas, player);
				player.vasActions.push(...acts);
			}
		}
	}
}

export function checkHasStatus(bee: BattleEventEntity, st: StatusId): boolean {
	if (bee.kind == 'player') {
		const found = bee.entity.statuses.get(st);
		return found != undefined && found > 0;
	}
	if (bee.kind == 'enemy') {
		if (
			Array.from(bee.entity.statuses.values()).some((s) => {
				const c = s.get(st);
				return c && c > 0;
			})
		) {
			return true;
		}
	}

	return false;
}

export function removeStatusesOnProvoke(bee: BattleEventEntity): StatusData[] {

	let result: StatusData[] = [];
	let rem = (s: Map<StatusId, number>) => {
		for (const [k, v] of s) {
			const statusData = statusDatas.find((s) => s.id == k);
			if (!statusData) continue;
			if (statusData.removeOnProvoke) {
				result.push(statusData);
				s.delete(k);
			}
		}

	}

	if (bee.kind == 'player') {
		rem(bee.entity.statuses)
	}
	if (bee.kind == 'enemy') {
		for (const [sForp, statuses] of bee.entity.statuses) {
			rem(statuses)
		}
	}
	return result;
}

export function removeStatus(bee: BattleEventEntity, st: StatusId) {
	if (bee.kind == 'player') {
		bee.entity.statuses.delete(st);
	}
	if (bee.kind == 'enemy') {
		for (const [key, value] of bee.entity.statuses) {
			value.delete(st);
		}
	}
}

export function enterSceneOrWakeup(player: Player) {
	const enteringScene = getSceneData(player);
	const scenePlayers = activePlayersInScene(player.currentUniqueSceneId);

	const onlyMeInScene = !scenePlayers.filter((p) => p.unitId != player.unitId).length;

	if (onlyMeInScene) {
		// No players except me in here remove enemies
		for (const e of enemiesInScene(player.currentUniqueSceneId)) {
			const index = activeEnemies.indexOf(e);
			if (index != -1) {
				activeEnemies.splice(index, 1);
			}
		}
	}

	const sceneEnemies = enemiesInScene(player.currentUniqueSceneId);

	if (!sceneEnemies.length) {
		if (enteringScene.spawnsEnemiesOnEnter) {
			// start new battle
			spawnedNewBattle(player);

			for (const es of enteringScene.spawnsEnemiesOnEnter) {
				spawnEnemy(es, player.currentUniqueSceneId, player.unitId);
			}
		}
	} else {
		// we are joining a battle
		console.log('joining battle');
		for (const e of sceneEnemies) {
			// init enemy aggro towards me
			if (!e.aggros.has(player.unitId)) {
				e.aggros.set(player.unitId, e.template.startAggro);
			}
			// scale health to player count
			if (!enteringScene.solo) {
				scaleEnemyHealth(e, scenePlayers.length);
			}
		}

		if (enteringScene.spawnsEnemiesOnBattleJoin && !hasPlayerAlreadySpawnedForBattle(player)) {
			console.log('spawning on join');
			// spawn extra enemies
			spawnedOngoing(player);
			// let extraEnemyName = player.heroName.split('').reverse().join('')
			for (const es of enteringScene.spawnsEnemiesOnBattleJoin) {
				spawnEnemy(es, player.currentUniqueSceneId, player.unitId);
			}
		}
	}

	// Always perform these
	if (enteringScene.healsOnEnter) {
		player.health = player.maxHealth;
	}
	if (enteringScene.setCheckpointOnEnter) {
		player.lastCheckpoint = player.currentUniqueSceneId;
	}
	if (enteringScene.setsFlagOnEnter) {
		player.flags.add(enteringScene.setsFlagOnEnter);
	}

	// scene texts will be repopulated
	player.sceneTexts = [];
	if (enteringScene.sceneTexts) {
		const { fallback, ...froms } = enteringScene.sceneTexts;
		let useDefault = true;
		for (const [from, txt] of Object.entries(froms)) {
			if (player.previousScene.dataId == from && txt) {
				player.sceneTexts.push(txt);
				useDefault = false;
				break;
			}
		}
		if (useDefault) {
			player.sceneTexts.push(fallback);
		}
	}
}

export function scaleEnemyHealth(enemy: ActiveEnemy, playerCount: number) {
	const percentHealthBefore = enemy.health / enemy.maxHealth;
	enemy.maxHealth = Math.floor(modifiedEnemyHealth(enemy.template.baseHealth, playerCount));
	enemy.health = Math.floor(percentHealthBefore * enemy.maxHealth);
}

export function resetBonusStats(bee : BattleEventEntity){
	bee.entity.bonusStats.agility = 0
	bee.entity.bonusStats.strength = 0
	bee.entity.bonusStats.mind = 0
	bee.entity.bonusStats.armor = 0
}

export function resetCooldowns(player: Player) {
	for (const itemState of player.inventory) {
		itemState.cooldown = 0;
		if (itemState.stats.warmup) {
			itemState.warmup = itemState.stats.warmup;
		} else {
			itemState.warmup = 0;
		}
		if (itemState.stats.startStock != undefined) {
			itemState.stock = itemState.stats.startStock;
		}
	}
}

export function changeScene(player: Player, goTo: SceneDataId) {
	const uniqueTo = uniqueFromSceneDataId(player.unitId, goTo);

	player.previousScene = player.currentUniqueSceneId;
	player.currentUniqueSceneId = uniqueTo;

	resetCooldowns(player)
	resetBonusStats({kind:'player',entity:player})

	// should status persist after battles?
	player.statuses = new Map();

	enterSceneOrWakeup(player);
}

export function handleAction(player: Player, actionFromId: GameAction) {
	const actionStartedInSceneId = player.currentUniqueSceneId;

	if (actionFromId.devAction) {
		actionFromId.devAction();
		return;
	}

	if (actionFromId.unlockableActData) {
		if (actionFromId.unlockableActData.travelTo) {
			pushAnimation({
				sceneId: actionStartedInSceneId,
				battleAnimation: {
					triggeredBy: player.unitId,
					source: player.unitId,
					behavior: { kind: 'travel' },
					animateTo: actionFromId.associateWithUnit,
				}
			});
			changeScene(player, actionFromId.unlockableActData.travelTo);
			return
		}

		if (actionFromId.unlockableActData.pickupItem) {
			const idToPickup = actionFromId.unlockableActData.pickupItem;
			equipItem(player, idToPickup);
			pushAnimation({
				sceneId: actionStartedInSceneId,
				battleAnimation: {
					triggeredBy: player.unitId,
					source: player.unitId,
					behavior: { kind: 'melee' },
					animateTo: actionFromId.associateWithUnit,
					takesItem: true
				}
			});
		}

		if (actionFromId.unlockableActData.setsFlag) {
			player.flags.add(actionFromId.unlockableActData.setsFlag);
		}

		if (actionFromId.unlockableActData.spawnsEnemies) {
			for (const e of actionFromId.unlockableActData.spawnsEnemies) {
				spawnEnemy(e, player.currentUniqueSceneId, player.unitId);
			}
		}

		return;
	}

	if (!actionFromId.battleEvent) return;
	if (!actionFromId.itemId) return;
	if(!actionFromId.battleEvent)return;
	const triggeredFromItem = items.find((i) => i.id == actionFromId.itemId);
	if(!triggeredFromItem)return

	if(triggeredFromItem.teleportTo){
		const battleAnimation: BattleAnimation = {
			triggeredBy: player.unitId,
			source: player.unitId,
			behavior: {kind:'selfInflicted',extraSprite:'skull'},
			teleporting: true
		};
		pushAnimation({
			sceneId:actionStartedInSceneId,
			battleAnimation:battleAnimation,
		})
		changeScene(player,triggeredFromItem.teleportTo)
		return
	}

	pushHappening('----');
	console.log('-----starting combat round----')
	
	let chosenBattleEvents: BattleEvent[] = []
	
	chosenBattleEvents.push(actionFromId.battleEvent)
	
	let startEnemies = enemiesInScene(actionStartedInSceneId)
	for (const enemy of startEnemies) {
		const aggroForActor = getAggroForPlayer(enemy, player);
		let chosenForEnemy: BattleEvent | undefined = undefined
		if (aggroForActor) {
			let r = Math.floor(Math.random() * 100)
			console.log(`${enemy.displayName} rolled ${r} with aggro ${aggroForActor}`)
			if (r < aggroForActor) {
				let bEventsForEnemy = createPossibleBattleEventsFromEntity(
					{ kind: 'enemy', entity: enemy },
					actionStartedInSceneId,
					player,
				)
				// enemy prioritize a finishing blow
				let foundFinisher = bEventsForEnemy.find(be => {
					if (be.itemUsed.damages) {
						if((be.itemUsed.damages.baseDmg * be.itemUsed.damages.strikes) >= be.primaryTarget.entity.health){
							return true							
						}
					}
					return false
				})
				if (foundFinisher) {
					chosenForEnemy = foundFinisher
					console.log(`${enemy.displayName} chose finishing blow ${chosenForEnemy.itemUsed.id}`)
				} else {
					let itemsPossible = bEventsForEnemy
						.map(be => be.itemUsed)
						.filter((value, index, self) => self.indexOf(value) === index);
					const randomItemIndex = Math.floor(Math.random() * itemsPossible.length);
					const randomItemSel = itemsPossible.at(randomItemIndex)
					if (randomItemSel) {
						let besOfSelItem = bEventsForEnemy.filter(be => be.itemUsed.id == randomItemSel.id)
						const randomIndex = Math.floor(Math.random() * besOfSelItem.length);
						let selected = besOfSelItem.at(randomIndex)
						if (selected) {
							chosenForEnemy = selected
							console.log(`${enemy.displayName} selected ${chosenForEnemy.itemUsed.id}`)
						}
					}
				}
				if(!chosenForEnemy){
					console.log(`${enemy.displayName} rolled hit but chose nothing`)
				}
			}
		}
		if (chosenForEnemy) {
			chosenBattleEvents.push(chosenForEnemy)
		}
	}

	chosenBattleEvents.sort((a, b) => {
		return getActionSpeed(b.source, b.itemUsed) - getActionSpeed(a.source, a.itemUsed)
	})

	for (let chosenBe of chosenBattleEvents) {
		let cantUse = false
		if (chosenBe.source.entity.health < 1 && !chosenBe.itemUsed.requiresSourceDead) {
			cantUse = true
		}
		if (chosenBe.primaryTarget && (immuneDueToStatus(chosenBe.primaryTarget) || chosenBe.primaryTarget.entity.health < 1)) {
			cantUse = true
		}

		if (!cantUse) {
			if(chosenBe.itemUsed.provoke){
				handleRemoveStatusOnProvoke(chosenBe.source,player,chosenBe.itemUsed.provoke > 0)
			}

			processBattleEvent(chosenBe, player);
			handleStatusEffects(player, chosenBe.source);
		}
	}

	// handleStatusEffects(player, { kind: 'player', entity: player });
	decrementCooldowns({ kind: 'player', entity: player });
	decrementStatusCounts({ kind: 'player', entity: player }, player)

	for (const enemy of enemiesInScene(actionStartedInSceneId)) {
		let tookAction = chosenBattleEvents.find(b => b.source.entity.unitId == enemy.unitId)
		if(!tookAction){
			handleStatusEffects(player, { kind: 'enemy', entity: enemy });
		}
		decrementCooldowns({ kind: 'enemy', entity: enemy });
		decrementStatusCounts({ kind: 'enemy', entity: enemy }, player)
	}

	
	if (triggeredFromItem.provoke != undefined && player.health > 0) {
		addAggro(player, triggeredFromItem.provoke);
	}

	const playerScene = getSceneDataSimple(actionStartedInSceneId.dataId);
	const postReactionEnemies = enemiesInScene(actionStartedInSceneId);
	if (startEnemies.length && !postReactionEnemies.length) {
		for (const playerInScene of activePlayersInScene(player.currentUniqueSceneId)) {
			resetCooldowns(playerInScene)
			resetBonusStats({kind:'player',entity:playerInScene})
			if (playerScene.healsOnVictory) {
				playerInScene.health = playerInScene.maxHealth;
			}
			if (playerScene.setsFlagOnVictory) {
				playerInScene.flags.add(playerScene.setsFlagOnVictory);
			}
		}
	}
}

function getActionSpeed(bee: BattleEventEntity, itemUsed: Item): number {
	let agi = 0
	if (bee.kind == 'player') {
		agi = bee.entity.agility
	}
	if (bee.kind == 'enemy') {
		agi = bee.entity.template.agility
	}
	agi += (itemUsed.speed ?? 0)
	return agi;
}

function handleStatusEffects(playerTriggered: Player, on: BattleEventEntity) {
	if (on.entity.health < 1) return
	// const ad: DamageAnimation[] = [];
	// const healAnimations: HealAnimation[] = [];
	let sprite: AnySprite | undefined = undefined;
	let check = (statusMap: Map<StatusId, number>) => {
		for (const [k, v] of statusMap) {
			if (on.entity.health < 0) break
			if (v < 1) continue;
			const statusData = statusDatas.find((s) => s.id == k);
			if (!statusData) continue;
			if (statusData.damagePercent) {
				let dmg = Math.ceil(on.entity.health * statusData.damagePercent);
				if(dmg < 5)dmg = 5
				on.entity.health -= dmg;
				// ad.push({ target: on.entity.unitId, amount: [dmg] });
				sprite = statusData.selfInflictSprite;
				pushAnimation({
					sceneId: playerTriggered.currentUniqueSceneId,
					battleAnimation: {
						triggeredBy: playerTriggered.unitId,
						source: on.entity.unitId,
						alsoDamages: [{ target: on.entity.unitId, amount: [dmg] }],
						behavior: { kind: 'selfInflicted', extraSprite: sprite },
						noResetAggro:true,
					}
				});
				pushHappening(`${on.entity.unitId} took ${dmg} damage from ${k}`);
			}
			if (statusData.heal) {
				healEntity(on, statusData.heal)
				// healAnimations.push({ target: on.entity.unitId, amount: statusData.heal });
				sprite = statusData.selfInflictSprite;
				pushAnimation({
					sceneId: playerTriggered.currentUniqueSceneId,
					battleAnimation: {
						triggeredBy: playerTriggered.unitId,
						source: on.entity.unitId,
						alsoHeals: [{ target: on.entity.unitId, amount: statusData.heal }],
						behavior: { kind: 'selfInflicted', extraSprite: sprite },
						noResetAggro:true,
					}
				});
			}
			if (statusData.giveBonus) {
				if(statusData.giveBonus.accumulates){
					on.entity.bonusStats[statusData.giveBonus.stat] += statusData.giveBonus.amount
				}else{
					let existingBonus = on.entity.bonusStats[statusData.giveBonus.stat]
					if(existingBonus < statusData.giveBonus.amount){
						on.entity.bonusStats[statusData.giveBonus.stat] = statusData.giveBonus.amount
					}
				}
				// sprite = statusData.selfInflictSprite
				pushHappening(`${on.entity.displayName} grows in strength!`);
			}
			// statusMap.set(k, v - 1);
		}
	}
	if (on.kind == 'player') {
		check(on.entity.statuses)
	}
	if (on.kind == 'enemy') {
		let fp = on.entity.statuses.get(playerTriggered.unitId)
		if(fp){
			check(fp)
		}
		checkEnemyDeath(on.entity)
	}
}

function decrementStatusCounts(bee: BattleEventEntity, playerTriggered: Player): StatusData[] {
	let decayed: StatusData[] = []
	// let  = new Map()

	let dec = (statusMap: Map<StatusId, number>, full: boolean) => {
		for (const [k, v] of statusMap) {
			const statusData = statusDatas.find((s) => s.id == k);
			if (!statusData) continue;
			if (full || statusData.decayAnyPlayer) {
				let decremented = v - 1

				if (decremented < 1) {
					if(statusData.giveBonus){
						bee.entity.bonusStats[statusData.giveBonus.stat] = 0
					}
					decayed.push(statusData)
					statusMap.delete(k);
				} else {
					statusMap.set(k, decremented)
				}
			}

		}
	}
	if (bee.kind == 'player') {
		dec(bee.entity.statuses, true)
	}
	if (bee.kind == 'enemy') {
		for (let [p, statuses] of bee.entity.statuses) {
			dec(statuses, p == playerTriggered.unitId)
		}
	}
	return decayed
}

function decrementCooldowns(bee: BattleEventEntity) {
	// Each turn decrement cooldowns, only if time passed ie provoke
	// if (itemUsed.provoke != undefined) {
	for (const cd of bee.entity.inventory) {
		if (cd.cooldown > 0) cd.cooldown--;
		if (cd.warmup > 0) cd.warmup--;
	}
	// }
}

export function immuneDueToStatus(bee: BattleEventEntity): boolean {
	// let statusMap: Map<StatusId, number> | undefined = undefined
	const check = (statusMap: Map<StatusId, number>) => {
		let immunity = false;
		for (const [k, v] of statusMap) {
			if (v < 1) continue;
			const foundData = statusDatas.find((d) => d.id == k);
			if (!foundData) continue;
			if (foundData.untargetable) {
				immunity = true;
			}
		}
		return immunity;
	}
	if (bee.kind == 'player') {
		return check(bee.entity.statuses)
	}
	if (bee.kind == 'enemy') {
		for (const [p, statuses] of bee.entity.statuses) {
			let checked = check(statuses)
			if (checked) {
				return true
			}
		}
	}
	return false
}


function handleRemoveStatusOnProvoke(bee: BattleEventEntity, triggeredBy: Player, provoke: boolean){
	let decayed: StatusData[] = []
	if (provoke) {
		const r = removeStatusesOnProvoke(bee);
		if (r) {
			decayed.push(...r)
		}
	}
	if(decayed.length){
		let ptstatuses = decayed.map(d=>{
			return {
				statusId:d.id,
				target:bee.entity.unitId,
				remove:true
			}satisfies StatusModifyAnimation
		})
		pushAnimation({
			sceneId: triggeredBy.currentUniqueSceneId,
			battleAnimation: {
				triggeredBy: triggeredBy.unitId,
				source: bee.entity.unitId,
				behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
				putsStatuses: ptstatuses
			}
		});
	}
}

function processBattleEvent(battleEvent: BattleEvent, player: Player) {
	let scenePlayers = activePlayersInScene(player.currentUniqueSceneId)
	let scenePlayersEntities: BattleEventEntity[] = scenePlayers.map((sp) => {
		return {
			kind: 'player',
			entity: sp
		};
	})
	let sceneEnemiesEntities: BattleEventEntity[] = enemiesInScene(player.currentUniqueSceneId).map(se => {
		return {
			kind: 'enemy',
			entity: se
		}
	})
	let alliesOfBee: BattleEventEntity[] = []
	let opponentsOfBee: BattleEventEntity[] = []
	if (battleEvent.source.kind == 'player') {
		alliesOfBee = scenePlayersEntities
		opponentsOfBee = sceneEnemiesEntities
	}
	if (battleEvent.source.kind == 'enemy') {
		alliesOfBee = sceneEnemiesEntities
		opponentsOfBee = scenePlayersEntities
	}
	const affectedsFromCanEffect = (ca: CanEffect, t: BattleEventEntity) => {
		let affecteds: BattleEventEntity[] = [];
		if (ca == 'allEnemy') {
			affecteds = opponentsOfBee;
		} else if (ca == 'allFriendly') {
			affecteds = alliesOfBee;
		} else if (ca == 'selfOnly') {
			affecteds = [battleEvent.source];
		} else if (ca == 'targetOnly') {
			affecteds = [t];
		}
		return affecteds;
	};

	const iAb: ItemAnimationBehavior = battleEvent.itemUsed.animation ?? { kind: 'melee' };
	let iCt: CanTarget;
	if (battleEvent.itemUsed.targets) {
		iCt = battleEvent.itemUsed.targets;
	} else if (iAb.kind == 'melee' || iAb.kind == 'missile') {
		iCt = { kind: 'anyEnemy' };
	} else {
		iCt = { kind: 'onlySelf' };
	}
	let beBehav: AnimationBehavior = iAb;
	if (iCt.kind == 'anyFriendly') {
		if (battleEvent.primaryTarget.entity.unitId == battleEvent.source.entity.unitId) {
			beBehav = { kind: 'selfInflicted', extraSprite: iCt.selfAfflictSprite };
		}
	}

	// const checkShouldStillAffect = (aff:BattleEventEntity)=>{
		// if(battleEvent.itemUsed.requiresSourceDead && rce.entity.health > 0)return false
		// if(battleEvent.itemUsed.requiresTargetDead && battleEvent.primaryTarget.entity.health < 1)
		// if(aff.entity.health < 1)return false
		// return true
	// }

	let statusModAnims: StatusModifyAnimation[] = []
	if (battleEvent.putsStatuses) {
		for (const put of battleEvent.putsStatuses) {
			if (put.target.entity.health < 1) continue;
			if (put.dispell != undefined) {
				let toRemove: StatusData[] = []
				if (put.dispell == 'bad') {
					toRemove = statusDatas.filter(sd => sd.bad)
				}
				if (put.dispell == 'good') {
					toRemove = statusDatas.filter(sd => !sd.bad)
				}
				for (const r of toRemove) {
					if (checkHasStatus(put.target, r.id)) {
						removeStatus(put.target, r.id)
						statusModAnims.push({
							statusId: r.id,
							target: put.target.entity.unitId,
							remove: true,
						})
					}
				}
				resetBonusStats(put.target)
			}
			if (put.statusMod) {
				let countToAdd : number | undefined = put.statusMod.count
				if (countToAdd) {
					countToAdd += battleEvent.source.entity.bonusStats.mind
					let mind = 0
					if(battleEvent.source.kind == 'player'){
						mind = battleEvent.source.entity.mind
					}
					if(battleEvent.source.kind == 'enemy'){
						mind = battleEvent.source.entity.template.mind
					}
					let bonusLongevity = Math.floor(mind / 2)
					countToAdd += bonusLongevity
					
					if (put.target.kind == 'enemy') {
						let found = put.target.entity.statuses.get(player.unitId);
						if (!found) {
							found = new Map();
						}
						const exist = found.get(put.statusMod.statusId);
						
						if (!exist || exist < countToAdd) {
							found.set(put.statusMod.statusId, countToAdd);
						}
						put.target.entity.statuses.set(player.unitId, found);
						
					}
					if (put.target.kind == 'player') {
						const found = put.target.entity.statuses.get(put.statusMod.statusId);
						if (!found) {
							put.target.entity.statuses.set(put.statusMod.statusId, countToAdd);
						} else {
							if (found < countToAdd) {
								put.target.entity.statuses.set(put.statusMod.statusId, countToAdd);
							}
						}
					}
					
				}
				if (put.statusMod.remove) {
					removeStatus(put.target, put.statusMod.statusId);
				}
				statusModAnims.push({
					target: put.target.entity.unitId,
					statusId: put.statusMod.statusId,
					count: countToAdd,
					remove: put.statusMod.remove,
				})

			}
		}
	}
	const damageAnimations: DamageAnimation[] = [];
	let damageAnimationForMissleTarget: DamageAnimation | undefined = undefined;
	if (battleEvent.itemUsed.damages) {
		let ads = affectedsFromCanEffect(battleEvent.itemUsed.damages.affects,battleEvent.primaryTarget)
		for (const healthModifyEvent of ads) {
			if (healthModifyEvent.entity.health < 1) {
				continue;
			}
			if (battleEvent.itemUsed.damages.baseDmg) {
				const r = damageEntity(
					battleEvent.itemUsed.damages,
					battleEvent.source,
					healthModifyEvent,
				);
				if (
					beBehav.kind == 'missile' &&
					healthModifyEvent.entity.unitId == battleEvent.primaryTarget.entity.unitId &&
					damageAnimationForMissleTarget == undefined
				) {
					damageAnimationForMissleTarget = {
						target: healthModifyEvent.entity.unitId,
						amount: r.dmgDone
					};
				} else {
					damageAnimations.push({
						target: healthModifyEvent.entity.unitId,
						amount: r.dmgDone
					});
				}
			}
		}
	}
	const healAnimations: HealAnimation[] = [];
	if (battleEvent.alsoHeals) {
		for (const healthModifyEvent of battleEvent.alsoHeals) {
			if (healthModifyEvent.target.entity.health < 1)
				continue;
			const r = healEntity(healthModifyEvent.target, healthModifyEvent.baseHeal);
			healAnimations.push({
				target: healthModifyEvent.target.entity.unitId,
				amount: r.healed
			});
		}
	}
	const aggroModifiedAnimations: AggroModifier[] = [];
	if (battleEvent.alsoModifiesAggro) {
		for (const modifyEvent of battleEvent.alsoModifiesAggro) {
			if (modifyEvent.targetEnemy.health < 1) continue;
			const foHeros: { hId: HeroId; amount: number }[] = [];
			for (const hero of modifyEvent.forHeros) {
				const r = modifyAggroForPlayer(hero, modifyEvent.targetEnemy, modifyEvent.baseAmount);
				foHeros.push({
					hId: hero.unitId,
					amount: r.increasedBy
				});
			}

			aggroModifiedAnimations.push({
				forHeros: foHeros,
				target: modifyEvent.targetEnemy.unitId
			});
		}
	}


	if (damageAnimationForMissleTarget) {
		const firstStrike = damageAnimationForMissleTarget.amount.at(0);
		if (firstStrike) {
			damageAnimations.push({
				target: damageAnimationForMissleTarget.target,
				amount: [firstStrike]
			});
			damageAnimationForMissleTarget.amount.splice(0, 1);
		}
	}

	const battleAnimation: BattleAnimation = {
		triggeredBy: player.unitId,
		source: battleEvent.source.entity.unitId,
		behavior: beBehav,
		animateTo: battleEvent.primaryTarget.entity.unitId,
		alsoDamages: damageAnimations,
		alsoHeals: healAnimations,
		alsoModifiesAggro: aggroModifiedAnimations,
		putsStatuses: statusModAnims,
	};

	pushAnimation({
		sceneId: player.currentUniqueSceneId,
		battleAnimation: battleAnimation,
	});
	if (damageAnimationForMissleTarget) {
		for (const i of damageAnimationForMissleTarget.amount) {
			const xba: BattleAnimation = {
				triggeredBy: player.unitId,
				source: battleEvent.source.entity.unitId,
				behavior: beBehav,
				animateTo: battleEvent.primaryTarget.entity.unitId,
				alsoDamages: [{ target: damageAnimationForMissleTarget.target, amount: [i] }]
			};
			pushAnimation({
				sceneId: player.currentUniqueSceneId,
				battleAnimation: xba,
			});
		}
	}
	if (battleEvent.itemUsed.id) {
		const itemState = battleEvent.source.entity.inventory.find((i) => i.stats.id == battleEvent.itemUsed.id);
		if (itemState) {
			if (itemState.stats.cooldown) {
				itemState.cooldown = itemState.stats.cooldown;
			}
			if (itemState.stock) {
				itemState.stock--;
			}
		}
	}
	if (battleEvent.source.kind == 'enemy') {
		// enemy aggro to all players goes to zero when it uses an item
		for (const key of battleEvent.source.entity.aggros.keys()) {
			battleEvent.source.entity.aggros.set(key, 0);
		}
	}
}

export function getDamageReduction(from: BattleEventEntity): number {
	let dmgReduc: number = 0
	for (const item of from.entity.inventory) {
		if (item.stats.damageReduction) {
			dmgReduc += item.stats.damageReduction
		}
	}
	if(from.entity.bonusStats.armor > 0){
		dmgReduc += from.entity.bonusStats.armor
	}

	return dmgReduc
}
export function getDamageLimit(from: BattleEventEntity): number | undefined {
	let dmgLim: number | undefined = undefined
	for (const item of from.entity.inventory) {
		if (item.stats.damageLimit) {
			if (dmgLim == undefined || dmgLim > item.stats.damageLimit) {
				dmgLim = item.stats.damageLimit
			}
		}
	}
	return dmgLim
}

export function getValidGameActionsFromVas(vas: VisualActionSource, player: Player): GameAction[] {
	const validUnlockableActions: GameAction[] = [];
	if (vas.actionsWithRequirements) {
		for (const unlockableActData of vas.actionsWithRequirements) {
			let passedRequirements = true;
			if (unlockableActData.requiresGear) {
				for (const requiredItem of unlockableActData.requiresGear) {
					if (!checkHasItem(player, requiredItem)) {
						passedRequirements = false;
						break;
					}
				}
			}
			if (unlockableActData.requiresFlags != undefined) {
				for (const flagRequired of unlockableActData.requiresFlags) {
					if (!player.flags.has(flagRequired)) {
						passedRequirements = false;
					}
				}
			}
			if (unlockableActData.requiresNotFlags != undefined) {
				for (const flagNotAllowed of unlockableActData.requiresNotFlags) {
					if (player.flags.has(flagNotAllowed)) {
						passedRequirements = false;
					}
				}
			}
			if (passedRequirements) {
				let ga: GameAction;

				let txt = 'no text';
				if (unlockableActData.pickupItem) {
					const id = unlockableActData.pickupItem;
					txt = `Equip ${id}`;
				}
				if (unlockableActData.travelTo) {
					const scene = getSceneDataSimple(unlockableActData.travelTo);
					txt = `Travel to ${scene.displayName}`;
				}
				if (unlockableActData.travelToCheckpoint) {
					const travelTo = player.lastCheckpoint.dataId;
					unlockableActData.travelTo = travelTo;

					const scene = getSceneDataSimple(travelTo);
					txt = `Respawn at checkpoint: ${scene.displayName}`;
				}

				if (unlockableActData.bText) {
					txt = unlockableActData.bText;
				}

				ga = {
					buttonText: txt,
					unlockableActData: unlockableActData,
					associateWithUnit: vas.unitId
				};

				validUnlockableActions.push(ga);
			}
		}
	}
	return validUnlockableActions;
}

export function convertServerActionToClientAction(sa: GameAction): GameActionSentToClient {
	return {
		buttonText: sa.buttonText,
		itemId: sa.itemId,
		associateWithUnit: sa.associateWithUnit
	};
}

export function convertVasToClient(
	vas: VisualActionSource,
	player: Player
): VisualActionSourceInClient {
	let startText = vas.startText;
	let startLocked = vas.startsLocked;
	let responses: ConversationResponse[] = [];
	if (vas.responses) responses = vas.responses;
	let detectStep = undefined;
	if (vas.detect) {
		for (const detected of vas.detect) {
			if (player.flags.has(detected.flag)) {
				detectStep = detected.flag;
				startLocked = detected.locked;
				responses = detected.responses ?? [];
				startText = detected.startText ?? vas.startText;
			}
		}
	}

	const result = {
		id: vas.unitId,
		displayName: vas.displayName,
		startText: startText,
		responses: responses,
		sprite: vas.sprite,
		portrait: vas.portrait,
		startsLocked: startLocked,
		detectStep: detectStep,
		scene: player.currentUniqueSceneId.dataId
	} satisfies VisualActionSourceInClient;
	return result;
}

export function convertUnlockableActionsToClient(
	sUnlockables: GameAction[] | undefined
): GameActionSentToClient[] {
	const clientUnlockables: GameActionSentToClient[] = [];
	if (!sUnlockables) return clientUnlockables;
	return sUnlockables.map((u) => {
		return convertServerActionToClientAction(u);
	});
}

export type VisualActionSource = {
	unitId: VisualActionSourceId;
	displayName: string;
	sprite: AnySprite;
	portrait?: string;
	actionsWithRequirements?: VasActionData[];
	startText: string;
	responses?: ConversationResponse[];
	detect?: {
		flag: Flag;
		startText?: string;
		responses?: ConversationResponse[];
		locked?: boolean;
	}[];
	startsLocked?: boolean;
};

export type VisualActionSourceInClient = {
	displayName: string;
	scene: SceneDataId;
	startsLocked?: boolean;
	id: VisualActionSourceId;
	sprite: AnySprite;
	portrait?: string;
	startText: string;
	responses: ConversationResponse[];
	detectStep?: Flag;
};

export type VasActionData = {
	requiresFlags?: Flag[];
	requiresNotFlags?: Flag[];
	requiresGear?: ItemId[];
	pickupItem?: ItemId;
	travelTo?: SceneDataId;
	travelToCheckpoint?: boolean;
	setsFlag?: Flag;
	bText?: string;
	spawnsEnemies?: EnemyForSpawning[];
};

export type EnemyForSpawning = {
	displayName?: string;
	template: EnemyTemplateId;
	statuses?: StatusState[];
};

// export type EnemyStatusesObject = Record<StatusId,number>

export type ConversationResponse = {
	responseId: string;
	unlock?: string[];
	lock?: string[];
	unlockVas?: VisualActionSourceId[];
	lockVas?: VisualActionSourceId[];
	startsLocked?: boolean;
	responseText: string;
	retort?: string;
};

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

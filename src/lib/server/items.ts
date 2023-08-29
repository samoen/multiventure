import type { AggroModifier, AggroModifierEvent, BattleEvent, HealthModifier, HealthModifierEvent, UnitId } from '$lib/utils';
import { damageEnemy, enemiesInScene, pushAnimation, takePoisonDamage, type ActiveEnemy } from './enemies';
import { pushHappening } from './messaging';
import { activePlayersInScene, type Player } from './users';

export type EquipmentSlot =
	| 'weapon'
	| 'utility'
	| 'body'

export type ItemIdForSlot<T extends EquipmentSlot> =
	T extends 'weapon' ?
	| 'unarmed'
	| 'club'
	| 'dagger'
	| 'fireStaff'
	: T extends 'utility' ?
	| 'empty'
	| 'bandage'
	| 'bomb'
	| 'poisonDart'
	: T extends 'body' ?
	| 'rags'
	| 'leatherArmor'
	| 'theifCloak'
	| 'plateMail'
	: never

export type ItemId = ItemIdForSlot<EquipmentSlot>

export type ItemStateForSlot<T extends EquipmentSlot> = {
	itemId: ItemIdForSlot<T>;
	cooldown: number;
	warmup: number;
	stock?: number;
}

export type ItemState = ItemStateForSlot<EquipmentSlot>

export type Inventory = {
	[T in EquipmentSlot]: ItemStateForSlot<T>
}

export type Item = {
	actions?: (player: Player) => void
	actionForEnemy?: (player: Player, enemy: ActiveEnemy) => void
	actionForFriendly?: (player: Player, friend: Player) => void
	onTakeDamage?: (incoming: number) => number
	warmup?: number
	cooldown?: number
	startStock?: number
	useableOutOfBattle?: boolean
}


const dagger: Item = {
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Attack ${enemy.name} with Dagger`,
				provoke: 7,
				speed: 8,
				slot: 'weapon',
				target: enemy.unitId,
				performAction() {
					return {
						source: { kind: 'player', entity: player },
						target: {kind:'enemy',entity:enemy},
						baseDamageToTarget: 7,
						strikes: 3,
						behavior: { kind: 'melee' },
					} satisfies BattleEvent
				}
			}
		)
	}
}

const club: Item = {
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Hit ${enemy.name} with Club`,
				provoke: 40,
				speed: 2,
				slot: 'weapon',
				target: enemy.unitId,
				performAction() {
					return {
						source: { kind: 'player', entity: player },
						target: {kind:'enemy',entity:enemy},
						baseDamageToTarget: 25,
						behavior: { kind: 'melee' },
					} satisfies BattleEvent
				}
			}
		)
	}
}

const fireStaff: Item = {
	warmup: 2,
	cooldown: 1,
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Blast ${enemy.name} with Firebolt`,
				provoke: 60,
				speed: 1,
				slot: 'weapon',
				target: enemy.unitId,
				performAction() {
					return {
						source: { kind: 'player', entity: player },
						target: {kind:'enemy',entity:enemy},
						baseDamageToTarget: 100,
						behavior: { kind: 'missile', extraSprite: 'flame' },
					} satisfies BattleEvent
				}
			}
		)
	}
}

const bandage: Item = {
	startStock: 2,
	useableOutOfBattle: true,
	actionForFriendly(player, friend) {
		if (friend.health < friend.maxHealth && friend.health > 0) {
			player.itemActions.push(
				{
					buttonText: `Heal ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with bandage`,
					speed: 15,
					provoke: 1,
					slot: 'utility',
					target: friend.unitId,
					performAction: () => {
						if (friend.heroName != player.heroName) {
							return {
								source: { kind: 'player', entity: player },
								target: {kind:'player',entity:friend},
								baseHealingToTarget: 90,
								behavior: { kind: 'melee' },
							} satisfies BattleEvent
						} else {
							return {
								source: { kind: 'player', entity: player },
								baseHealingToSource: 90,
								behavior: { kind: 'selfInflicted', extraSprite: 'heal' },

							}
						}
					},
				}
			)
		}
	}
}

const bomb: Item = {
	startStock: 1,
	actions(player) {
		player.itemActions.push({
			buttonText: 'Throw Powderbomb',
			speed: 12,
			provoke: 5,
			slot: 'utility',
			performAction() {
				let dmgModifies: HealthModifierEvent[] = []
				let aggroModifies: AggroModifierEvent[] = []
				let forHeroes = activePlayersInScene(player.currentScene)
				for (const enemy of enemiesInScene(player.currentScene)) {
					dmgModifies.push({
						baseDamage: 5,
						targetEnemy: enemy
					})
					aggroModifies.push({
						targetEnemy: enemy,
						forHeros: forHeroes,
						baseAmount: -20,
					})
				}

				return {
					source: { kind: 'player', entity: player },
					behavior: { kind: 'center', extraSprite: 'bomb' },
					alsoDamages: dmgModifies,
					alsoModifiesAggro: aggroModifies
				} satisfies BattleEvent
			},
		})
	},
}

const poisonDart: Item = {
	startStock: 2,
	actionForEnemy(player, enemy) {
		player.itemActions.push(
			{
				buttonText: `Throw poison dart at ${enemy.name}`,
				provoke: 40,
				speed: 20,
				slot: 'utility',
				target: enemy.unitId,
				performAction() {
					return {
						source: { kind: 'player', entity: player },
						target: {kind:'enemy',entity:enemy},
						putsStatuses: [{ targetEnemy: enemy, status: 'poison', count: 3 }],
						baseDamageToTarget: 3,
						behavior: { kind: 'missile', extraSprite: 'arrow' },
					} satisfies BattleEvent
				},
			}
		)
	},
}

const plateMail: Item = {
	cooldown: 2,
	actions(player) {
		player.itemActions.push({
			provoke: 5,
			buttonText: 'Taunt',
			slot: 'body',
			speed: 999,
			performAction() {
				pushHappening(`${player.heroName} infuriates enemies!`)
				return {
					behavior: { kind: 'center', extraSprite: 'bomb' },
					source: { kind: 'player', entity: player },
					alsoModifiesAggro: enemiesInScene(player.currentScene).map((e) => {
						return {
							targetEnemy: e,
							setTo: 100,
							forHeros: [player]
						} satisfies AggroModifierEvent
					})
				} satisfies BattleEvent
			},
		})
	},
	onTakeDamage(incoming) {
		if (incoming > 20) {
			return 20
		}
		return incoming
	},
}

const theifCloak: Item = {
	cooldown: 3,
	actions(player) {
		player.itemActions.push({
			buttonText: 'Hide in shadows',
			speed: 999,
			slot: 'body',
			provoke: 30,
			performAction() {
				pushHappening(`${player.heroName} hid in shadows`)
				return {
					behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
					source: { kind: 'player', entity: player },
					putsStatuses: [{ targetPlayer: player, status: 'hidden', count: 2 }],
				} satisfies BattleEvent
			},
		})
	},
}

const leatherArmor: Item = {
	useableOutOfBattle: true,
	onTakeDamage(incoming) {
		if (incoming < 6) {
			return 1
		}
		return incoming - 5
	},
	actionForFriendly(player, friend) {
		if (friend.statuses.poison > 0) {
			player.itemActions.push(
				{
					buttonText: `Cure ${friend.heroName == player.heroName ? 'myself' : friend.heroName} with ranger's herbs`,
					grantsImmunity: true,
					speed: 5,
					provoke: 0,
					slot: 'body',
					target: friend.unitId,
					performAction: () => {
						if (friend.heroName != player.heroName) {
							return {
								source: { kind: 'player', entity: player },
								target: {kind:'player',entity:friend},
								behavior: { kind: 'melee' },
								putsStatuses: [{ targetPlayer: friend, status: 'poison', remove: true }]
							} satisfies BattleEvent
						} else {
							return {
								source: { kind: 'player', entity: player },
								behavior: { kind: 'selfInflicted', extraSprite: 'heal' },
								putsStatuses: [{ targetPlayer: player, status: 'poison', remove: true }]
							} satisfies BattleEvent
						}
					},
				}
			)
		}

	}
}

export const weapons: Record<ItemIdForSlot<'weapon'>, Item> = {
	unarmed: {},
	dagger: dagger,
	club: club,
	fireStaff: fireStaff,
};

export const utilityItems: Record<ItemIdForSlot<'utility'>, Item> = {
	empty: {},
	bandage: bandage,
	bomb: bomb,
	poisonDart: poisonDart,
}

export const bodyItems: Record<ItemIdForSlot<'body'>, Item> = {
	rags: {},
	plateMail: plateMail,
	leatherArmor: leatherArmor,
	theifCloak: theifCloak,
}

export const items: Record<ItemId, Item> = {
	...weapons,
	...utilityItems,
	...bodyItems
} satisfies Record<ItemId, Item>

export function equipItem(player:Player, id:ItemId){
	if(weapons.hasOwnProperty(id)){
		player.inventory.weapon.itemId = id as ItemIdForSlot<'weapon'>
	}
	if(utilityItems.hasOwnProperty(id)){
		player.inventory.utility.itemId = id as ItemIdForSlot<'utility'>
	}
	if(bodyItems.hasOwnProperty(id)){
		player.inventory.body.itemId = id as ItemIdForSlot<'body'>
	}
}

export function checkHasItem(player:Player, id:ItemId):boolean{
	if(weapons.hasOwnProperty(id)){
		return player.inventory.weapon.itemId == id
	}
	if(utilityItems.hasOwnProperty(id)){
		return player.inventory.utility.itemId == id
	}
	if(bodyItems.hasOwnProperty(id)){
		return player.inventory.body.itemId == id
	}
	return false
}




import type { AggroModifier, AggroModifierEvent, BattleEvent, HealthModifier, HealthModifierEvent, UnitId } from '$lib/utils';
import { damageEnemy, enemiesInScene, pushAnimation, takePoisonDamage, type ActiveEnemy } from './enemies';
import { pushHappening } from './messaging';
import { activePlayersInScene, type Player } from './users';

export type EquipmentSlot =
	| 'weapon'
	| 'utility'
	| 'body'

export type ItemId = keyof typeof items

export type ItemState = {
	itemId: ItemId;
	cooldown: number;
	warmup: number;
	stock?: number;
}

export type Inventory = {
	[T in EquipmentSlot]: ItemState
}

export type Item = {
	id:ItemId
	slot:EquipmentSlot
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
	id:'dagger',
	slot:'weapon',
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
	id:'club',
	slot:'weapon',
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
	id:'fireStaff',
	slot:'weapon',
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
	id:'bandage',
	slot:'utility',
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
	id:'bomb',
	slot:'utility',
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
	id:'poisonDart',
	slot:'utility',
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
	id:'plateMail',
	slot:'body',
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
	id:'theifCloak',
	slot:'body',
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
	id:'leatherArmor',
	slot:'body',
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

const unarmed : Item = {
	id:'unarmed',
	slot:'weapon',
}

const empty : Item = {
	id:'empty',
	slot:'utility',
}
const rags : Item = {
	id:'rags',
	slot:'body'
}

// export const allItems = new Map<ItemId,Item>()
// allItems.set(unarmed.id,unarmed)
// allItems.set(club.id,club)
// allItems.set(dagger.id,dagger)
// allItems.set(fireStaff.id,fireStaff)
// allItems.set(rags.id,rags)


export const items = {
	unarmed: unarmed,
	dagger: dagger,
	club: club,
	fireStaff: fireStaff,
	empty: empty,
	bandage: bandage,
	bomb: bomb,
	poisonDart: poisonDart,
	rags: rags,
	plateMail: plateMail,
	leatherArmor: leatherArmor,
	theifCloak: theifCloak,
} as const satisfies Record<string, Item>;

// export const utilityItems: Record<ItemIdForSlot<'utility'>, Item> = {
// }

// export const bodyItems: Record<ItemIdForSlot<'body'>, Item> = {
// }

// export const items: Record<ItemId, Item> = {
// 	...weapons,
// 	...utilityItems,
// 	...bodyItems
// } satisfies Record<ItemId, Item>

export function equipItem(player:Player, item:Item){
	player.inventory[item.slot].itemId = item.id
	player.inventory[item.slot].warmup = item.warmup ?? 0
	player.inventory[item.slot].cooldown = 0
	player.inventory[item.slot].stock = item.startStock
	// if(weapons.hasOwnProperty(id)){
	// 	player.inventory.weapon.itemId = id as ItemIdForSlot<'weapon'>
	// }
	// if(utilityItems.hasOwnProperty(id)){
	// 	player.inventory.utility.itemId = id as ItemIdForSlot<'utility'>
	// }
	// if(bodyItems.hasOwnProperty(id)){
	// 	player.inventory.body.itemId = id as ItemIdForSlot<'body'>
	// }
}

export function checkHasItem(player:Player, id:ItemId):boolean{
	if(
		player.inventory.weapon.itemId == id ||
		player.inventory.utility.itemId == id ||
		player.inventory.body.itemId == id	
		){
		return true
	}
	return false
}




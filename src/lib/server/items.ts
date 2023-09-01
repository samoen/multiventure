import type { AggroModifier, AggroModifierEvent, BattleEvent, HealthModifier, HealthModifierEvent, StatusId, UnitId } from '$lib/utils';
import { damageEnemy, enemiesInScene, pushAnimation, takePoisonDamage, type ActiveEnemy } from './enemies';
import { pushHappening } from './messaging';
import { activePlayersInScene, type GameAction, type Player } from './users';

export type EquipmentSlot =
	| 'weapon'
	| 'utility'
	| 'body'

export type QuickbarSlot = EquipmentSlot | 'wait' | 'succumb'

export type ItemId = keyof typeof items

export type ItemState = {
	itemId: ItemId;
	cooldown: number;
	warmup: number;
	stock?: number;
}

// export type Inventory = {
// 	weapon:ItemState
// 	utility:ItemState
// 	body:ItemState
// }

export type Inventory = {
	[T in EquipmentSlot]: ItemState
}

// type ItemActionData = {
// 	validator:string,

// }

export type Item = {
	id: ItemId
	slot: QuickbarSlot
	speed: number
	provoke?: number
	grantsImmunity?:boolean;
	actions?: (player: Player) => GameAction
	actionForEnemy?: (player: Player, enemy: ActiveEnemy) => GameAction
	actionForFriendly?: (player: Player, friend: Player) => GameAction
	actionForSelf?: (player: Player) => GameAction
	onTakeDamage?: (incoming: number) => number
	warmup?: number
	cooldown?: number
	startStock?: number
	useableOutOfBattle?: boolean
	requiresHealth?: boolean
	requiresStatus?: StatusId
}


const dagger: Item = {
	id: 'dagger',
	slot: 'weapon',
	provoke: 7,
	speed: 8,
	actionForEnemy(player, enemy) {
		return {
			buttonText: `Attack ${enemy.name} with Dagger`,
			slot: 'weapon',
			target: enemy.unitId,
			performAction() {
				return {
					source: { kind: 'player', entity: player },
					target: { kind: 'enemy', entity: enemy },
					baseDamageToTarget: 7,
					strikes: 3,
					behavior: { kind: 'melee' },
				} satisfies BattleEvent
			}
		}
	}
}

const club: Item = {
	id: 'club',
	slot: 'weapon',
	provoke: 40,
	speed: 2,
	actionForEnemy(player, enemy) {
		return {
			buttonText: `Hit ${enemy.name} with Club`,
			slot: 'weapon',
			target: enemy.unitId,
			performAction() {
				return {
					source: { kind: 'player', entity: player },
					target: { kind: 'enemy', entity: enemy },
					baseDamageToTarget: 25,
					behavior: { kind: 'melee' },
				} satisfies BattleEvent
			}
		}
	}
}

const fireStaff: Item = {
	id: 'fireStaff',
	slot: 'weapon',
	warmup: 2,
	cooldown: 1,
	provoke: 60,
	speed: 1,
	actionForEnemy(player, enemy) {

		return {
			buttonText: `Blast ${enemy.name} with Firebolt`,
			slot: 'weapon',
			target: enemy.unitId,
			performAction() {
				return {
					source: { kind: 'player', entity: player },
					target: { kind: 'enemy', entity: enemy },
					baseDamageToTarget: 100,
					behavior: { kind: 'missile', extraSprite: 'flame' },
				} satisfies BattleEvent
			}
		}

	}
}

const bandage: Item = {
	id: 'bandage',
	slot: 'utility',
	startStock: 2,
	useableOutOfBattle: true,
	requiresHealth: true,
	speed: 15,
	provoke: 1,
	actionForFriendly(player, friend) {
		return {
			buttonText: `Heal ${friend.heroName} with bandage`,
			slot: 'utility',
			target: friend.unitId,
			performAction: () => {
				return {
					source: { kind: 'player', entity: player },
					target: { kind: 'player', entity: friend },
					baseHealingToTarget: 90,
					behavior: { kind: 'melee' },
				} satisfies BattleEvent
			},
		}
	},
	actionForSelf(player) {
		return {
			buttonText: `Heal myself with bandage`,
			slot: 'utility',
			target: player.unitId,
			performAction: () => {
				return {
					source: { kind: 'player', entity: player },
					baseHealingToSource: 90,
					behavior: { kind: 'selfInflicted', extraSprite: 'heal' },
				}
			},
		}
	}
}

const bomb: Item = {
	id: 'bomb',
	slot: 'utility',
	startStock: 1,
	speed: 12,
	provoke: 5,
	actions(player) {
		return {
			buttonText: 'Throw Powderbomb',
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
		}
	},
}

const poisonDart: Item = {
	id: 'poisonDart',
	slot: 'utility',
	startStock: 2,
	provoke: 40,
	speed: 20,
	actionForEnemy(player, enemy) {
		return {
			buttonText: `Throw poison dart at ${enemy.name}`,
			slot: 'utility',
			target: enemy.unitId,
			performAction() {
				return {
					source: { kind: 'player', entity: player },
					target: { kind: 'enemy', entity: enemy },
					putsStatuses: [{ targetEnemy: enemy, status: 'poison', count: 3 }],
					baseDamageToTarget: 3,
					behavior: { kind: 'missile', extraSprite: 'arrow' },
				} satisfies BattleEvent
			},
		}

	},
}

const plateMail: Item = {
	id: 'plateMail',
	slot: 'body',
	cooldown: 2,
	provoke: 5,
	speed: 999,
	actions(player) {
		return {
			buttonText: 'Taunt',
			slot: 'body',
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
		}
	},
	onTakeDamage(incoming) {
		if (incoming > 20) {
			return 20
		}
		return incoming
	},
}

const theifCloak: Item = {
	id: 'theifCloak',
	slot: 'body',
	cooldown: 3,
	speed: 999,
	provoke: 30,
	actions(player) {
		return {
			buttonText: 'Hide in shadows',
			slot: 'body',
			performAction() {
				pushHappening(`${player.heroName} hid in shadows`)
				return {
					behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
					source: { kind: 'player', entity: player },
					putsStatuses: [{ targetPlayer: player, status: 'hidden', count: 2 }],
				} satisfies BattleEvent
			},
		}
	},
}

const leatherArmor: Item = {
	id: 'leatherArmor',
	slot: 'body',
	useableOutOfBattle: true,
	onTakeDamage(incoming) {
		if (incoming < 6) {
			return 1
		}
		return incoming - 5
	},
	requiresStatus: 'poison',
	speed: 5,
	provoke: 0,
	grantsImmunity: true,
	actionForFriendly(player, friend) {
		return {
			buttonText: `Cure ${friend.heroName} with ranger's herbs`,
			slot: 'body',
			target: friend.unitId,
			performAction: () => {
				return {
					source: { kind: 'player', entity: player },
					target: { kind: 'player', entity: friend },
					behavior: { kind: 'melee' },
					putsStatuses: [{ targetPlayer: friend, status: 'poison', remove: true }]
				} satisfies BattleEvent
			},
		} satisfies GameAction
	},
	actionForSelf(player) {
		return {
			buttonText: `Cure myself with ranger's herbs`,
			slot: 'body',
			target: player.unitId,
			performAction: () => {
				return {
					source: { kind: 'player', entity: player },
					behavior: { kind: 'selfInflicted', extraSprite: 'heal' },
					putsStatuses: [{ targetPlayer: player, status: 'poison', remove: true }]
				} satisfies BattleEvent

			},
		} satisfies GameAction
	}
}

const unarmed: Item = {
	id: 'unarmed',
	slot: 'weapon',
	provoke: 1,
	speed: 10,
	actionForEnemy(player, enemy) {
		return {
			buttonText: `Punch ${enemy.name}`,
			target: enemy.unitId,
			slot: 'weapon',
			performAction() {
				return {
					behavior: { kind: 'melee' },
					source: { kind: 'player', entity: player },
					target: { kind: 'enemy', entity: enemy },
					baseDamageToTarget: 5,
				} satisfies BattleEvent
			},
		}
	},
}

const wait: Item = {
	id: 'wait',
	slot: 'wait',
	speed: 999,
	provoke: 0,
	actions(player) {
		return {
			slot: 'wait',
			buttonText: 'wait',
			performAction() {
				return {
					behavior: { kind: 'selfInflicted', extraSprite: 'shield' },
					source: { kind: 'player', entity: player },
				} satisfies BattleEvent
			},
		}
	}
}
const succumb: Item = {
	id: 'succumb',
	slot: 'succumb',
	speed: -999,
	grantsImmunity: true,
	actions(player) {
		return {
			slot: 'succumb',
			buttonText: 'succumb to your wounds',
			performAction() {
				return {
					behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
					source: { kind: 'player', entity: player },
					succumb:true,
				} satisfies BattleEvent
			},
		} satisfies GameAction
	}
}

const empty: Item = {
	id: 'empty',
	slot: 'utility',
	speed: 0,
	provoke: 0,
}
const rags: Item = {
	id: 'rags',
	slot: 'body',
	speed: 0,
	provoke: 0,
}

// export const allItems = new Map<ItemId,Item>()
// allItems.set(unarmed.id,unarmed)
// allItems.set(club.id,club)
// allItems.set(dagger.id,dagger)
// allItems.set(fireStaff.id,fireStaff)
// allItems.set(rags.id,rags)


export const items = {
	wait: wait,
	succumb:succumb,
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


export function equipItem(player: Player, item: Item) {
	if (item.slot == 'wait' || item.slot == 'succumb') return
	player.inventory[item.slot].itemId = item.id
	player.inventory[item.slot].warmup = item.warmup ?? 0
	player.inventory[item.slot].cooldown = 0
	player.inventory[item.slot].stock = item.startStock
}

export function checkHasItem(player: Player, id: ItemId): boolean {
	if (
		player.inventory.weapon.itemId == id ||
		player.inventory.utility.itemId == id ||
		player.inventory.body.itemId == id
	) {
		return true
	}
	return false
}




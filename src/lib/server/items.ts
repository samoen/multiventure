import type { AggroModifier, AggroModifierEvent, BattleEvent, HealthModifier, HealthModifierEvent, StatusId, UnitId } from '$lib/utils';
import { damageEnemy, enemiesInScene, pushAnimation, takePoisonDamage, type ActiveEnemy } from './enemies';
import { pushHappening } from './messaging';
import type { SceneId } from './scenes';
import { activePlayersInScene, type GameAction, type Player } from './users';



const dagger: Item = {
	id: 'dagger',
	slot: 'weapon',
	provoke: 7,
	speed: 8,
	actionForEnemy(player, enemy) {
		return {
			source: { kind: 'player', entity: player },
			target: { kind: 'enemy', entity: enemy },
			baseDamageToTarget: 7,
			strikes: 3,
			behavior: { kind: 'melee' },
		} satisfies BattleEvent
	}
}

const club: Item = {
	id: 'club',
	slot: 'weapon',
	provoke: 40,
	speed: 2,
	actionForEnemy(player, enemy) {
		return {
			source: { kind: 'player', entity: player },
			target: { kind: 'enemy', entity: enemy },
			baseDamageToTarget: 25,
			behavior: { kind: 'melee' },
		} satisfies BattleEvent
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
			source: { kind: 'player', entity: player },
			target: { kind: 'enemy', entity: enemy },
			baseDamageToTarget: 100,
			behavior: { kind: 'missile', extraSprite: 'flame' },
		} satisfies BattleEvent

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
			source: { kind: 'player', entity: player },
			target: { kind: 'player', entity: friend },
			baseHealingToTarget: 90,
			behavior: { kind: 'melee' },
		} satisfies BattleEvent
	},
	actionForSelf(player) {
		return {
			source: { kind: 'player', entity: player },
			baseHealingToSource: 90,
			behavior: { kind: 'selfInflicted', extraSprite: 'heal' },
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

const poisonDart: Item = {
	id: 'poisonDart',
	slot: 'utility',
	startStock: 2,
	provoke: 40,
	speed: 20,
	actionForEnemy(player, enemy) {
		return {
			source: { kind: 'player', entity: player },
			target: { kind: 'enemy', entity: enemy },
			putsStatuses: [{ targetEnemy: enemy, status: 'poison', count: 3 }],
			baseDamageToTarget: 3,
			behavior: { kind: 'missile', extraSprite: 'arrow' },
		} satisfies BattleEvent

	},
}

const plateMail: Item = {
	id: 'plateMail',
	slot: 'body',
	cooldown: 2,
	provoke: 5,
	speed: 999,
	actions(player) {
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
		pushHappening(`${player.heroName} hid in shadows`)
		return {
			behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
			source: { kind: 'player', entity: player },
			putsStatuses: [{ targetPlayer: player, status: 'hidden', count: 2 }],
		} satisfies BattleEvent
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
			source: { kind: 'player', entity: player },
			target: { kind: 'player', entity: friend },
			behavior: { kind: 'melee' },
			putsStatuses: [{ targetPlayer: friend, status: 'poison', remove: true }]
		} satisfies BattleEvent
	},
	actionForSelf(player) {
		return {
			source: { kind: 'player', entity: player },
			behavior: { kind: 'selfInflicted', extraSprite: 'heal' },
			putsStatuses: [{ targetPlayer: player, status: 'poison', remove: true }]
		} satisfies BattleEvent

	},
}

const fist: Item = {
	id: 'fist',
	slot: 'weapon',
	default: true,
	provoke: 1,
	speed: 10,
	actionForEnemy(player, enemy) {
		return {
			behavior: { kind: 'melee' },
			source: { kind: 'player', entity: player },
			target: { kind: 'enemy', entity: enemy },
			baseDamageToTarget: 5,
		} satisfies BattleEvent
	},
}
const belt: Item = {
	id: 'belt',
	slot: 'utility',
	default: true,
}
const rags: Item = {
	id: 'rags',
	slot: 'body',
	default: true,
}

const wait: Item = {
	id: 'wait',
	slot: 'wait',
	default: true,
	speed: 999,
	provoke: 0,
	actions(player) {
		return {
			behavior: { kind: 'selfInflicted', extraSprite: 'shield' },
			source: { kind: 'player', entity: player },
		} satisfies BattleEvent
	}
}
const succumb: Item = {
	id: 'succumb',
	slot: 'succumb',
	default: true,
	speed: -999,
	grantsImmunity: true,
	requiresSourceDead: true,
	useableOutOfBattle: true,
	actions(player) {
		return {
			behavior: { kind: 'selfInflicted', extraSprite: 'skull' },
			source: { kind: 'player', entity: player },
			succumb: true,
		} satisfies BattleEvent
	}
}


export const items = [
	fist,
	dagger,
	club,
	fireStaff,
	belt,
	bandage,
	bomb,
	poisonDart,
	rags,
	plateMail,
	leatherArmor,
	theifCloak,
	wait,
	succumb,
] as const satisfies Item[]


export type ItemId = typeof items[number]['id']
export type QuickbarSlot = typeof items[number]['slot']

export type ItemState = {
	itemId: ItemId;
	slot: QuickbarSlot;
	cooldown: number;
	warmup: number;
	stock?: number;
}

export type Item = {
	id: string
	slot: string
	speed?: number
	provoke?: number
	grantsImmunity?: boolean;
	default?: boolean;
	actions?: (player: Player) => BattleEvent
	actionForEnemy?: (player: Player, enemy: ActiveEnemy) => BattleEvent
	actionForFriendly?: (player: Player, friend: Player) => BattleEvent
	actionForSelf?: (player: Player) => BattleEvent
	onTakeDamage?: (incoming: number) => number
	warmup?: number
	cooldown?: number
	startStock?: number
	useableOutOfBattle?: boolean
	requiresHealth?: boolean
	requiresStatus?: StatusId
	requiresSourceDead?: boolean
}


export function equipItem(player: Player, item: Item) {
	let state = player.inventory.find(i => i.slot == item.slot)
	if (!state) {
		let createState: ItemState = {
			itemId: item.id,
			slot: item.slot,
			cooldown: 0,
			warmup: item.warmup ?? 0,
		}
		player.inventory.push(createState)
		// player.inventory.sort((a, b) => {
		// 	let aIndex = items.findIndex(i => i.id == a.itemId)
		// 	let bIndex = items.findIndex(i => i.id == b.itemId)
		// 	return aIndex - bIndex
		// })
	} else {
		state.itemId = item.id
		state.warmup = item.warmup ?? 0
		state.cooldown = 0
		state.stock = item.startStock
	}

}

export function checkHasItem(player: Player, id: ItemId): boolean {
	if (
		player.inventory.some(i => i.itemId == id)
	) {
		return true
	}
	return false
}




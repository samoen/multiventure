import type { AnimationBehavior, AnySprite, ItemAnimationBehavior, StatusMod } from '$lib/utils';
import type { SceneDataId } from './scenes';
import type { StatusId } from './statuses';
import type { Player } from './users';

export type ItemId = string
export type QuickbarSlot = string

export type CanTarget =
	| { kind: 'anyEnemy' }
	| { kind: 'anyFriendly', selfAfflictSprite: AnySprite }
	| { kind: 'onlySelf' }

export type CanEffect = 'allFriendly' | 'allEnemy' | 'targetOnly' | 'selfOnly'

export type Item = {
	id: ItemId,
	slot: QuickbarSlot
	speed?: number,
	damageLimit?: number,
	damageReduction?: number,
	provoke?: number
	grantsImmunity?: boolean;
	default?: boolean;
	warmup?: number
	cooldown?: number
	startStock?: number
	useableOutOfBattle?: boolean
	requiresTargetDamaged?: boolean
	requiresStatus?: StatusId
	requiresSourceDead?: boolean
	excludeFromDetail?: boolean
	noAction?: boolean
	damages?:{affects:CanEffect,baseDmg:number,strikes:number}
	heals?:{affects:CanEffect,baseHeal:number}
	modifiesStatus?: { affects: CanEffect, statusMod: StatusMod },
	modifiesAggro?: { affects: CanEffect, aggroFor: 'allPlayers' | 'justMe', amount: number },
	animation?: ItemAnimationBehavior, // default melee
	targets?: CanTarget // for melee or missle defaults anyEnemy, else onlyself
	teleportTo?: SceneDataId
}

const dagger: Item = {
	id: 'dagger',
	slot: 'weapon',
	provoke: 7,
	speed: 4,
	damages:{affects:'targetOnly',baseDmg:7,strikes:3},
}

const club: Item = {
	id: 'club',
	slot: 'weapon',
	provoke: 40,
	speed: 1,
	damages:{affects:'targetOnly',baseDmg:28,strikes:1},
}

export const fireStaff: Item = {
	id: 'fireStaff',
	slot: 'weapon',
	warmup: 2,
	cooldown: 1,
	provoke: 10,
	speed: 2,
	damages:{affects:'targetOnly',baseDmg:30,strikes:2},
	animation: { kind: 'missile', extraSprite: 'flame' },
	modifiesAggro: { affects: 'targetOnly', aggroFor: 'justMe', amount: 80 },
}

const potion: Item = {
	id: 'potion',
	slot: 'utility',
	startStock: 2,
	useableOutOfBattle: true,
	requiresTargetDamaged: true,
	speed: 15,
	provoke: 1,
	targets: { kind: 'anyFriendly', selfAfflictSprite: 'heal' },
	heals:{affects:'targetOnly',baseHeal:50},
}

const bomb: Item = {
	id: 'bomb',
	slot: 'utility',
	startStock: 1,
	speed: 12,
	provoke: 5,
	animation: { kind: 'center', extraSprite: 'bomb' },
	damages:{affects:'allEnemy',baseDmg:5,strikes:1},
	modifiesAggro: { affects: 'allEnemy', aggroFor: 'allPlayers', amount: -30 }
}

export const poisonDart: Item = {
	id: 'poisonDart',
	slot: 'utility',
	startStock: 2,
	provoke: 40,
	speed: 20,
	damages:{affects:'targetOnly',baseDmg:3,strikes:1},
	animation: { kind: 'missile', extraSprite: 'arrow' },
	modifiesStatus: { affects: 'targetOnly', statusMod: { statusId: 'poison', count: 3 } },
}

export const plateMail: Item = {
	id: 'plateMail',
	slot: 'body',
	cooldown: 2,
	provoke: 0,
	speed: 100,
	damageLimit: 20,
	animation: { kind: 'selfInflicted', extraSprite: 'flame' },
	modifiesStatus: { affects: 'targetOnly', statusMod: { statusId: 'rage', count: 1 } },
	modifiesAggro: { affects: 'allEnemy', aggroFor: 'justMe', amount: 100 },
}

const thiefCloak: Item = {
	id: 'thiefCloak',
	slot: 'body',
	cooldown: 3,
	speed: 100,
	provoke: 30,
	// grantsImmunity: true,
	animation: { kind: 'selfInflicted', extraSprite: 'smoke' },
	modifiesStatus: { affects: 'targetOnly', statusMod: { statusId: 'hidden', count: 2 } },
}

export const leatherArmor: Item = {
	id: 'leatherArmor',
	slot: 'body',
	useableOutOfBattle: true,
	requiresStatus: 'poison',
	speed: 5,
	damageReduction: 5,
	targets: { kind: 'anyFriendly', selfAfflictSprite: 'heal' },
	modifiesStatus: { affects: 'targetOnly', statusMod: { statusId: 'poison', remove: true } }
}

const fist: Item = {
	id: 'fist',
	slot: 'weapon',
	default: true,
	provoke: 1,
	speed: 10,
	damages:{affects:'targetOnly',baseDmg:10,strikes:2}
}
const belt: Item = {
	id: 'belt',
	slot: 'utility',
	default: true,
	excludeFromDetail: true,
	noAction: true,
}
const rags: Item = {
	id: 'rags',
	slot: 'body',
	default: true,
	excludeFromDetail: true,
	noAction: true,
}

const wait: Item = {
	id: 'wait',
	slot: 'wait',
	default: true,
	excludeFromDetail: true,
	speed: 999,
	provoke: 0,
	animation: { kind: 'selfInflicted', extraSprite: 'shield' },
}

const succumb: Item = {
	id: 'succumb',
	slot: 'succumb',
	excludeFromDetail: true,
	teleportTo: 'dead',
	default: true,
	speed: -999,
	// grantsImmunity: true,
	requiresSourceDead: true,
	useableOutOfBattle: true,
	animation: { kind: 'selfInflicted', extraSprite: 'skull' },
}


export const items : Item[] = [
	fist,
	dagger,
	club,
	fireStaff,
	belt,
	potion,
	bomb,
	poisonDart,
	rags,
	plateMail,
	leatherArmor,
	thiefCloak,
	wait,
	succumb,
]


export type ItemState = {
	cooldown: number;
	warmup: number;
	stock?: number;
	stats: Item;
}

export function equipItem(player: Player, itemId: ItemId) {
	const item = items.find(i => i.id == itemId)
	if (!item) return
	let state = player.inventory.find(i => i.stats.slot == item.slot)
	if (!state) {
		let createState: ItemState = {
			cooldown: 0,
			warmup: item.warmup ?? 0,
			stats: item,
			stock: item.startStock,
		}
		player.inventory.push(createState)
		// player.inventory.sort((a, b) => {
		// 	let aIndex = items.findIndex(i => i.id == a.itemId)
		// 	let bIndex = items.findIndex(i => i.id == b.itemId)
		// 	return aIndex - bIndex
		// })
	} else {
		state.warmup = item.warmup ?? 0
		state.cooldown = 0
		state.stock = item.startStock
		state.stats = item
	}

}

export function checkHasItem(player: Player, id: ItemId): boolean {
	if (
		player.inventory.some(i => i.stats.id == id)
	) {
		return true
	}
	return false
}

export type ItemCombination = { className: string, combos: string[] }
export const itemCombinations = [
	{ className: 'peasant', combos: ['fist'] },
	{ className: 'thief', combos: ['dagger'] },
	{ className: 'rogue', combos: ['dagger', 'leatherArmor'] },
	{ className: 'rogue', combos: ['dagger', 'thiefCloak'] },
	{ className: 'rogue', combos: ['dagger', 'plateMail'] },
	{ className: 'ruffian', combos: ['club'] },
	{ className: 'thug', combos: ['club', 'leatherArmor'] },
	{ className: 'heavy', combos: ['club', 'plateMail'] },
	{ className: 'mage', combos: ['fireStaff'] },
	{ className: 'cleric', combos: ['fireStaff', 'potion'] },
]

export function comboFindClassFromInventory(inv: ItemState[]): string {
	let result = 'peasant'
	for (const itemCombination of itemCombinations) {
		let satisfies = true
		for (const itemId of itemCombination.combos) {
			let found = inv.find(i => i.stats.id == itemId)
			if (!found) {
				satisfies = false
				break
			}
		}
		if (satisfies) {
			result = itemCombination.className
		}
	}
	return result
}

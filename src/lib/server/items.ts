import type { AggroModifier, AggroModifierEvent, AnimationBehavior, BattleEvent, HealthModifier, HealthModifierEvent, StatusId, StatusMod, UnitId } from '$lib/utils';
import type { ActiveEnemy } from './enemies';
import { pushHappening } from './messaging';
import type { SceneId } from './scenes';
import type { Player } from './users';

export type Item = {
	id: string
	slot: string
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
	requiresHealth?: boolean
	requiresStatus?: StatusId
	requiresSourceDead?: boolean
	excludeFromDetail?:boolean
	baseHeal?: number,
	baseDmg?: number,
	putsStatusOnAffected?: StatusMod,
	aggroModifyForAll?: number,
	behavior: AnimationBehavior,
	strikes?: number
	style: TargetStyle
	succumb?: boolean
}


export type TargetStyle = { style: 'anyEnemy' } | { style: 'allEnemies', putsStatusOnSelf?: StatusMod } | { style: 'anyFriendly', selfBehavior: AnimationBehavior } | { style: 'noAction' } | { style: 'onlySelf' }

const dagger: Item = {
	id: 'dagger',
	slot: 'weapon',
	provoke: 7,
	speed: 4,
	baseDmg: 7,
	behavior: { kind: 'melee' },
	strikes: 3,
	style: { style: 'anyEnemy' }
}

const club: Item = {
	id: 'club',
	slot: 'weapon',
	provoke: 40,
	speed: 1,
	baseDmg: 28,
	behavior: { kind: 'melee' },
	style: { style: 'anyEnemy' }
}

export const fireStaff: Item = {
	id: 'fireStaff',
	slot: 'weapon',
	warmup: 2,
	cooldown: 1,
	provoke: 60,
	speed: 2,
	baseDmg: 100,
	behavior: { kind: 'missile', extraSprite: 'flame' },
	style: { style: 'anyEnemy' }
}

const potion: Item = {
	id: 'potion',
	slot: 'utility',
	startStock: 2,
	useableOutOfBattle: true,
	requiresHealth: true,
	speed: 15,
	provoke: 1,
	style: { style: 'anyFriendly', selfBehavior: { kind: 'selfInflicted', extraSprite: 'heal' } },
	behavior: { kind: 'melee' },
	baseHeal: 90,
}

const bomb: Item = {
	id: 'bomb',
	slot: 'utility',
	startStock: 1,
	speed: 12,
	provoke: 5,
	style: { style: 'allEnemies' },
	behavior: { kind: 'center', extraSprite: 'bomb' },
	baseDmg: 5,
	aggroModifyForAll: -20
}

export const poisonDart: Item = {
	id: 'poisonDart',
	slot: 'utility',
	startStock: 2,
	provoke: 40,
	speed: 20,
	behavior: { kind: 'missile', extraSprite: 'arrow' },
	style: { style: 'anyEnemy' },
	putsStatusOnAffected: { statusId: 'poison', count: 3 },
	baseDmg: 3,
}

export const plateMail: Item = {
	id: 'plateMail',
	slot: 'body',
	cooldown: 2,
	provoke: 100,
	speed: 0,
	damageLimit: 20,
	grantsImmunity: true,
	behavior: { kind: 'selfInflicted', extraSprite: 'flame' },
	style: { style: 'allEnemies', putsStatusOnSelf: { statusId: 'rage', count: 2 } },

}

const thiefCloak: Item = {
	id: 'thiefCloak',
	slot: 'body',
	cooldown: 3,
	speed: 100,
	provoke: 30,
	grantsImmunity: true,
	behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
	style: { style: 'allEnemies', putsStatusOnSelf: { statusId: 'hidden', count: 2 } },
}

export const leatherArmor: Item = {
	id: 'leatherArmor',
	slot: 'body',
	useableOutOfBattle: true,
	requiresStatus: 'poison',
	speed: 5,
	provoke: 0,
	grantsImmunity: true,
	damageReduction: 5,
	behavior: { kind: 'melee' },
	style: { style: 'anyFriendly', selfBehavior: { kind: 'selfInflicted', extraSprite: 'heal' } },
	putsStatusOnAffected: { statusId: 'poison', remove: true }
}

const fist: Item = {
	id: 'fist',
	slot: 'weapon',
	default: true,
	provoke: 1,
	speed: 10,
	behavior: { kind: 'melee' },
	style: { style: 'anyEnemy' },
	baseDmg: 10,
}
const belt: Item = {
	id: 'belt',
	slot: 'utility',
	default: true,
	excludeFromDetail:true,
	style: { style: 'noAction' },
	behavior: { kind: 'melee' }
}
const rags: Item = {
	id: 'rags',
	slot: 'body',
	default: true,
	excludeFromDetail:true,
	style: { style: 'noAction' },
	behavior: { kind: 'melee' }
}

const wait: Item = {
	id: 'wait',
	slot: 'wait',
	default: true,
	excludeFromDetail:true,
	speed: 999,
	provoke: 0,
	behavior: { kind: 'selfInflicted', extraSprite: 'shield' },
	style: { style: 'onlySelf' }
}
const succumb: Item = {
	id: 'succumb',
	slot: 'succumb',
	excludeFromDetail:true,
	succumb: true,
	default: true,
	speed: -999,
	grantsImmunity: true,
	requiresSourceDead: true,
	useableOutOfBattle: true,
	behavior: { kind: 'selfInflicted', extraSprite: 'skull' },
	style: { style: 'onlySelf' },
}


export const items = [
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
] as const satisfies Item[]


export type ItemId = typeof items[number]['id']
export type QuickbarSlot = typeof items[number]['slot']

export type ItemState = {
	itemId: ItemId;
	slot: QuickbarSlot;
	cooldown: number;
	warmup: number;
	stock?: number;
	stats?: Item;
}



export function equipItem(player: Player, item: Item) {
	let state = player.inventory.find(i => i.slot == item.slot)
	if (!state) {
		let createState: ItemState = {
			itemId: item.id,
			slot: item.slot,
			cooldown: 0,
			warmup: item.warmup ?? 0,
			stats:item,
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
		state.stats = item
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

export type ItemCombination = {className : string, combos : string[]}
export const itemCombinations = [
	{className:'peasant',combos:['fist']},
	{className:'thief',combos:['dagger']},
	{className:'rogue',combos:['dagger','leatherArmor']},
	{className:'rogue',combos:['dagger','thiefCloak']},
	{className:'ruffian',combos:['club']},
	{className:'thug',combos:['club','leatherArmor']},
	{className:'mage',combos:['fireStaff']}
]

export function comboFindClassFromInventory(inv:ItemState[]):string{
	let result = 'peasant'
	for(const itemCombination of itemCombinations){
		let satisfies = true
		for(const itemId of itemCombination.combos){
			let found = inv.find(i=>i.itemId == itemId)
			if(!found){
				satisfies = false
				break
			}
		}
		if(satisfies){
			result = itemCombination.className
		}
	}
	return result
}

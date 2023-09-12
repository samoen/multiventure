import type { AnimationBehavior, StatusId, StatusMod } from '$lib/utils';
import type { SceneDataId } from './scenes';
import type { Player } from './users';

export type ItemId = string
export type QuickbarSlot = string

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
	excludeFromDetail?:boolean
	baseHealToTarget?: number,
	baseDmg?: number,
	putsStatusOnAffected?: StatusMod,
	modifiesAggroOnAffected?: {kind:'allPlayers' | 'justMe', amount:number},
	behavior: AnimationBehavior,
	strikes?: number
	targetStyle: TargetStyle
	affectStyle? : AffectStyle
	teleportTo?: SceneDataId
}


export type TargetStyle = 
	| { kind: 'anyEnemy' } 
	| { kind: 'noTarget'} 
	| { kind: 'anyFriendly', selfBehavior: AnimationBehavior } 
	| { kind: 'noAction' } 

export type AffectStyle = 
| { kind:'AllEnemy' }
| { kind:'TargetOnly' }
| { kind:'SelfOnly' }

const dagger: Item = {
	id: 'dagger',
	slot: 'weapon',
	provoke: 7,
	speed: 4,
	baseDmg: 7,
	behavior: { kind: 'melee' },
	strikes: 3,
	targetStyle: { kind: 'anyEnemy' }
}

const club: Item = {
	id: 'club',
	slot: 'weapon',
	provoke: 40,
	speed: 1,
	baseDmg: 28,
	behavior: { kind: 'melee' },
	targetStyle: { kind: 'anyEnemy' }
}

export const fireStaff: Item = {
	id: 'fireStaff',
	slot: 'weapon',
	warmup: 2,
	cooldown: 1,
	provoke: 10,
	speed: 2,
	baseDmg: 50,
	behavior: { kind: 'missile', extraSprite: 'flame' },
	modifiesAggroOnAffected:{kind:'justMe',amount:80},
	affectStyle:{kind:'TargetOnly'},
	targetStyle: { kind: 'anyEnemy' },
}

const potion: Item = {
	id: 'potion',
	slot: 'utility',
	startStock: 2,
	useableOutOfBattle: true,
	requiresTargetDamaged: true,
	speed: 15,
	provoke: 1,
	targetStyle: { kind: 'anyFriendly', selfBehavior: { kind: 'selfInflicted', extraSprite: 'heal' } },
	behavior: { kind: 'melee' },
	baseHealToTarget: 50,
}

const bomb: Item = {
	id: 'bomb',
	slot: 'utility',
	startStock: 1,
	speed: 12,
	provoke: 5,
	targetStyle: { kind: 'noTarget' },
	affectStyle: {kind:'AllEnemy'},
	behavior: { kind: 'center', extraSprite: 'bomb' },
	baseDmg: 5,
	modifiesAggroOnAffected: {kind:'allPlayers', amount:-20}
}

export const poisonDart: Item = {
	id: 'poisonDart',
	slot: 'utility',
	startStock: 2,
	provoke: 40,
	speed: 20,
	behavior: { kind: 'missile', extraSprite: 'arrow' },
	targetStyle: { kind: 'anyEnemy' },
	affectStyle:{kind:'TargetOnly'},
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
	putsStatusOnAffected:{ statusId: 'rage', count: 2 },
	targetStyle: { kind: 'noTarget'},
	affectStyle: {kind:'SelfOnly'}
}

const thiefCloak: Item = {
	id: 'thiefCloak',
	slot: 'body',
	cooldown: 3,
	speed: 100,
	provoke: 30,
	grantsImmunity: true,
	behavior: { kind: 'selfInflicted', extraSprite: 'smoke' },
	putsStatusOnAffected:{ statusId: 'hidden', count: 2 },
	targetStyle: { kind: 'noTarget' },
	affectStyle: {kind:'SelfOnly'},
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
	targetStyle: { kind: 'anyFriendly', selfBehavior: { kind: 'selfInflicted', extraSprite: 'heal' } },
	affectStyle:{kind:'TargetOnly'},
	putsStatusOnAffected: { statusId: 'poison', remove: true }
}

const fist: Item = {
	id: 'fist',
	slot: 'weapon',
	default: true,
	provoke: 1,
	speed: 10,
	behavior: { kind: 'melee' },
	targetStyle: { kind: 'anyEnemy' },
	baseDmg: 10,
}
const belt: Item = {
	id: 'belt',
	slot: 'utility',
	default: true,
	excludeFromDetail:true,
	targetStyle: { kind: 'noAction' },
	behavior: { kind: 'melee' }
}
const rags: Item = {
	id: 'rags',
	slot: 'body',
	default: true,
	excludeFromDetail:true,
	targetStyle: { kind: 'noAction' },
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
	targetStyle: { kind: 'noTarget' }
}
const succumb: Item = {
	id: 'succumb',
	slot: 'succumb',
	excludeFromDetail:true,
	teleportTo: 'dead',
	default: true,
	speed: -999,
	grantsImmunity: true,
	requiresSourceDead: true,
	useableOutOfBattle: true,
	behavior: { kind: 'selfInflicted', extraSprite: 'skull' },
	targetStyle: { kind: 'noTarget' },
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


export type ItemState = {
	cooldown: number;
	warmup: number;
	stock?: number;
	stats: Item;
}

export function equipItem(player: Player, itemId: ItemId) {
	const item = items.find(i => i.id == itemId)
	if(!item)return
	let state = player.inventory.find(i => i.stats.slot == item.slot)
	if (!state) {
		let createState: ItemState = {
			cooldown: 0,
			warmup: item.warmup ?? 0,
			stats:item,
			stock:item.startStock,
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

export type ItemCombination = {className : string, combos : string[]}
export const itemCombinations = [
	{className:'peasant',combos:['fist']},
	{className:'thief',combos:['dagger']},
	{className:'rogue',combos:['dagger','leatherArmor']},
	{className:'rogue',combos:['dagger','thiefCloak']},
	{className:'rogue',combos:['dagger','plateMail']},
	{className:'ruffian',combos:['club']},
	{className:'thug',combos:['club','leatherArmor']},
	{className:'heavy',combos:['club','plateMail']},
	{className:'mage',combos:['fireStaff']},
	{className:'cleric',combos:['fireStaff','potion']},
]

export function comboFindClassFromInventory(inv:ItemState[]):string{
	let result = 'peasant'
	for(const itemCombination of itemCombinations){
		let satisfies = true
		for(const itemId of itemCombination.combos){
			let found = inv.find(i=>i.stats.id == itemId)
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

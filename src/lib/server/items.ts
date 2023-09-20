import type { AnySprite, OffenseKind, StatusMod, ItemAnimationBehavior } from '$lib/utils';
import type { SceneDataId } from './scenes';
import type { StatusId } from './statuses';
import type { Player } from './users';

export type ItemId = string;
export type QuickbarSlot = string;

export type CanTarget =
	| { kind: 'anyEnemy' }
	| { kind: 'anyFriendly'; selfAfflictSprite: AnySprite }
	| { kind: 'onlySelf' };

export type CanEffect = 'allFriendly' | 'allEnemy' | 'targetOnly' | 'selfOnly';
export type ItemDamageData = { affects: CanEffect; baseDmg: number; strikes: number, offenseKind?:OffenseKind[] }
export type ItemVisualBase = |'dagger'|'staff'|'club'|'none'|'heavyArmor'|'lightArmor'|'bow' |'healer' | 'bomb' | 'dart' | 'necklace' | 'cloak'
export type Item = {
	id: ItemId;
	slot: QuickbarSlot;
	visualBase?:ItemVisualBase
	speed?: number;
	damageLimit?: number;
	damageReduction?: number;
	provoke?: number;
	grantsImmunity?: boolean;
	default?: boolean;
	warmup?: number;
	cooldown?: number;
	startStock?: number;
	useableOutOfBattle?: boolean;
	requiresTargetDamaged?: boolean;
	// requiresStatus?: StatusId;
	requiresTargetWithoutStatus?:StatusId;
	requiresSourceDead?: boolean;
	excludeFromDetail?: boolean;
	noAction?: boolean;
	damages?: ItemDamageData;
	heals?: { affects: CanEffect; baseHeal: number };
	modifiesStatus?: { affects: CanEffect; statusMod?: StatusMod, dispell?:'good'|'bad' };
	modifiesAggro?: { affects: CanEffect; aggroFor: 'allPlayers' | 'justMe'; amount: number };
	animation?: ItemAnimationBehavior; // default melee
	targets?: CanTarget; // for melee or missle defaults anyEnemy, else onlyself
	teleportTo?: SceneDataId;
};

const dagger: Item = {
	id: 'dagger',
	visualBase:'dagger',
	slot: 'weapon',
	provoke: 7,
	speed: 4,
	damages: { affects: 'targetOnly', baseDmg: 7, strikes: 3, offenseKind:['brutal','skillful'] }
};

const vampiricDagger: Item = {
	id: 'vampDagger',
	visualBase:'dagger',
	slot: 'weapon',
	provoke: 7,
	speed: 4,
	damages: { affects: 'targetOnly', baseDmg: 10, strikes: 1, offenseKind:['brutal','skillful','magical'] },
	heals: {affects:'selfOnly',baseHeal:10}
};

const club: Item = {
	id: 'club',
	visualBase:'club',
	slot: 'weapon',
	provoke: 40,
	speed: 1,
	damages: { affects: 'targetOnly', baseDmg: 28, strikes: 1, offenseKind:['brutal'] }
};

export const bow: Item = {
	id: 'bow',
	visualBase:'bow',
	slot: 'weapon',
	warmup: 1,
	cooldown: 1,
	provoke: 5,
	speed: 3,
	damages: { affects: 'targetOnly', baseDmg: 10, strikes: 2, offenseKind:['skillful'] },
	animation: { kind: 'missile', extraSprite: 'arrow' },
	modifiesAggro: { affects: 'targetOnly', aggroFor: 'justMe', amount: 30 },
};

export const fireStaff: Item = {
	id: 'fireStaff',
	visualBase:'staff',
	slot: 'weapon',
	warmup: 1,
	cooldown: 2,
	provoke: 5,
	speed: 2,
	damages: { affects: 'targetOnly', baseDmg: 50, strikes: 1, offenseKind:['magical','skillful'], },
	animation: { kind: 'missile', extraSprite: 'flame' },
	modifiesAggro: { affects: 'targetOnly', aggroFor: 'justMe', amount: 30 }
};

export const gremlinStaff: Item = {
	id: 'gremlinStaff',
	visualBase:'staff',
	slot: 'weapon',
	warmup: 2,
	cooldown: 2,
	provoke: 15,
	speed: 2,
	damages: { affects: 'targetOnly', baseDmg: 20, strikes: 2, offenseKind:['magical','skillful'], },
	animation: { kind: 'missile', extraSprite: 'flame' },
};

const potion: Item = {
	id: 'potion',
	visualBase:'healer',
	slot: 'utility',
	startStock: 2,
	useableOutOfBattle: true,
	requiresTargetDamaged: true,
	speed: 15,
	provoke: 1,
	targets: { kind: 'anyFriendly', selfAfflictSprite: 'heal' },
	heals: { affects: 'targetOnly', baseHeal: 50 }
};

const bomb: Item = {
	id: 'bomb',
	slot: 'utility',
	startStock: 2,
	speed: 12,
	provoke: 5,
	animation: { kind: 'center', extraSprite: 'bomb' },
	damages: { affects: 'allEnemy', baseDmg: 10, strikes: 1 },

};

const holyBomb: Item = {
	id: 'holy',
	slot: 'utility',
	startStock: 3,
	speed: 12,
	provoke: 5,
	animation: { kind: 'center', extraSprite: 'bomb' },
	damages: { affects: 'allEnemy', baseDmg: 5, strikes: 1, offenseKind:['magical'] },
	modifiesStatus:{affects:'allEnemy',dispell:'good'},
	modifiesAggro: { affects: 'allEnemy', aggroFor: 'allPlayers', amount: -30 }
};

const poisonDart: Item = {
	id: 'poisonDart',
	visualBase:'dart',
	slot: 'utility',
	startStock: 2,
	provoke: 40,
	speed: 20,
	damages: { affects: 'targetOnly', baseDmg: 3, strikes: 1 },
	animation: { kind: 'missile', extraSprite: 'arrow' },
	modifiesStatus: { affects: 'targetOnly', statusMod: { statusId: 'poisoned', count: 3 } }
};

const deadlyDart: Item = {
	id: 'deadlyDart',
	visualBase:'dart',
	slot: 'utility',
	startStock: 1,
	provoke: 40,
	speed: 20,
	damages: { affects: 'targetOnly', baseDmg: 100, strikes: 1 },
	animation: { kind: 'missile', extraSprite: 'arrow' },
};

const plateMail: Item = {
	id: 'plateMail',
	visualBase:'heavyArmor',
	slot: 'body',
	cooldown: 7,
	provoke: 0,
	speed: 100,
	damageLimit: 15,
	requiresTargetWithoutStatus:'rage',
	animation: { kind: 'selfInflicted', extraSprite: 'flame' },
	modifiesStatus: { affects: 'targetOnly', statusMod: { statusId: 'rage', count: 3 } },
	modifiesAggro: { affects: 'allEnemy', aggroFor: 'justMe', amount: 100 }
};

const thiefCloak: Item = {
	id: 'thiefCloak',
	visualBase:'cloak',
	slot: 'body',
	cooldown: 3,
	speed: 5,
	provoke: 30,
	animation: { kind: 'selfInflicted', extraSprite: 'smoke' },
	modifiesStatus: { affects: 'targetOnly', statusMod: { statusId: 'hidden', count: 2 } }
};


export const leatherArmor: Item = {
	id: 'leatherArmor',
	visualBase:'lightArmor',
	slot: 'body',
	useableOutOfBattle: true,
	speed: 5,
	damageReduction: 5,
	requiresTargetWithoutStatus:'blessed',
	targets: { kind: 'anyFriendly', selfAfflictSprite: 'heal' },
	modifiesStatus: { affects: 'targetOnly', dispell: 'bad', statusMod:{statusId:'blessed',count:3} }
};

export const trollArmor: Item = {
	id: 'trollArmor',
	visualBase:'lightArmor',
	slot: 'body',
	speed: 2,
	requiresTargetWithoutStatus:'blessed',
	targets: { kind: 'onlySelf' },
	animation: { kind: 'selfInflicted', extraSprite: 'shield' },
	modifiesStatus: { affects: 'targetOnly', statusMod:{statusId:'blessed',count:3} }
};

export const goblinArmor: Item = {
	id: 'goblinArmor',
	visualBase:'lightArmor',
	slot: 'body',
	speed: 5,
	noAction:true,
	damageReduction: 5,
};

export const pendantOfProtection: Item = {
	id: 'pendantOfProtection',
	visualBase:'necklace',
	slot: 'body',
	speed: 999,
	cooldown:3,
	damageReduction: 5,
	targets: { kind: 'anyFriendly', selfAfflictSprite: 'shield' },
	requiresTargetWithoutStatus:'protected',
	modifiesStatus: { affects: 'targetOnly', statusMod:{statusId:'protected',count:3} }
};

const fist: Item = {
	id: 'fist',
	slot: 'weapon',
	default: true,
	provoke: 1,
	speed: 10,
	damages: { affects: 'targetOnly', baseDmg: 10, strikes: 2, offenseKind:['brutal'] }
};

const belt: Item = {
	id: 'belt',
	slot: 'utility',
	default: true,
	excludeFromDetail: true,
	noAction: true
};

const rags: Item = {
	id: 'rags',
	slot: 'body',
	default: true,
	excludeFromDetail: true,
	noAction: true
};

const wait: Item = {
	id: 'wait',
	slot: 'wait',
	default: true,
	excludeFromDetail: true,
	speed: 999,
	provoke: 0,
	animation: { kind: 'selfInflicted', extraSprite: 'whiteRing' }
};

const succumb: Item = {
	id: 'succumb',
	slot: 'succumb',
	excludeFromDetail: true,
	teleportTo: 'dead',
	default: true,
	speed: -999,
	requiresSourceDead: true,
	useableOutOfBattle: true,
	animation: { kind: 'selfInflicted', extraSprite: 'skull' }
};

export const items: Item[] = [
	belt,
	rags,
	fist,
	dagger,
	club,
	bow,
	fireStaff,
	gremlinStaff,
	potion,
	bomb,
	holyBomb,
	poisonDart,
	deadlyDart,
	vampiricDagger,
	plateMail,
	leatherArmor,
	trollArmor,
	goblinArmor,
	pendantOfProtection,
	thiefCloak,
	wait,
	succumb,
];

export type ItemState = {
	cooldown: number;
	warmup: number;
	stock?: number;
	stats: Item;
};

export function equipItem(player: Player, itemId: ItemId) {
	const item = items.find((i) => i.id == itemId);
	if (!item) return;
	const state = player.inventory.find((i) => i.stats.slot == item.slot);
	if (!state) {
		const createState: ItemState = {
			cooldown: 0,
			warmup: item.warmup ?? 0,
			stats: item,
			stock: item.startStock
		};
		player.inventory.push(createState);
		// player.inventory.sort((a, b) => {
		// 	let aIndex = items.findIndex(i => i.id == a.itemId)
		// 	let bIndex = items.findIndex(i => i.id == b.itemId)
		// 	return aIndex - bIndex
		// })
	} else {
		state.warmup = item.warmup ?? 0;
		state.cooldown = 0;
		state.stock = item.startStock;
		state.stats = item;
	}
}

export function checkHasItem(player: Player, id: ItemId): boolean {
	if (player.inventory.some((i) => i.stats.id == id)) {
		return true;
	}
	return false;
}
export const startClass = 'peasant'
export type ItemCombination = { className: string; combos: string[] };
export const itemCombinations = [
	{ className: 'thief', combos: ['dagger'] },
	{ className: 'ruffian', combos: ['club'] },
	{ className: 'woodsman', combos: ['bow'] },
	{ className: 'mage', combos: ['staff'] },
	{ className: 'thug', combos: ['club', 'lightArmor'] },
	{ className: 'bowman', combos: ['bow', 'lightArmor'] },
	{ className: 'longbowman', combos: ['bow', 'heavyArmor'] },
	{ className: 'heavy', combos: ['club', 'heavyArmor'] },
	{ className: 'cleric', combos: ['staff', 'healer'] },
	{ className: 'rogue', combos: ['dagger', 'lightArmor'] },
	{ className: 'swordsman', combos: ['dagger', 'heavyArmor'] }
];

export function comboFindClassFromInventory(inv: ItemState[]): string {
	let result = startClass;
	for (const itemCombination of itemCombinations) {
		let satisfies = true;
		for (const itemId of itemCombination.combos) {
			const found = inv.find((i) => i.stats.visualBase && i.stats.visualBase == itemId);
			if (!found) {
				satisfies = false;
				break;
			}
		}
		if (satisfies) {
			result = itemCombination.className;
		}
	}
	return result;
}

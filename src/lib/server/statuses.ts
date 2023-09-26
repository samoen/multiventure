import type { AnySprite } from '$lib/utils';
import type { BonusStat } from './users';

// export type StatusId = 'poison' | 'rage' | 'hidden'
export type StatusId = string;

export type StatusData = {
	id: StatusId;
	damagePercent?: number;
	heal?: number;
	giveBonus?:{stat:BonusStat, amount:number}
	untargetable?: boolean;
	removeOnProvoke?: boolean;
	selfInflictSprite: AnySprite;
	decayAnyPlayer?:boolean;
	bad?:boolean;
	// statusSprite:AnySprite;
};

export const statusDatas: StatusData[] = [
	{
		id: 'poisoned',
		damagePercent: 0.2,
		selfInflictSprite: 'poison',
		bad:true,
	},
	{
		id: 'blessed',
		heal: 10,
		selfInflictSprite: 'heal',
	},
	{
		id: 'rage',
		giveBonus:{stat:'strength',amount:5},
		selfInflictSprite: 'flame'
	},
	{
		id: 'hidden',
		untargetable: true,
		removeOnProvoke: true,
		selfInflictSprite: 'smoke',
		decayAnyPlayer:true,
	},
	{
		id: 'protected',
		giveBonus:{stat:'armor',amount:40},
		selfInflictSprite: 'shield',
		decayAnyPlayer:true,
		removeOnProvoke:true,
	},
];

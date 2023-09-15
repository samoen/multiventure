import type { AnySprite } from '$lib/utils';
import type { BonusStat } from './users';

// export type StatusId = 'poison' | 'rage' | 'hidden'
export type StatusId = string;

export type StatusData = {
	id: StatusId;
	damagePercent?: number;
	giveBonus?:{stat:BonusStat, amount:number}
	immunity?: boolean;
	removeOnProvoke?: boolean;
	selfInflictSprite: AnySprite;
	decayAnyPlayer?:boolean;
};

export const statusDatas: StatusData[] = [
	{
		id: 'poison',
		damagePercent: 0.2,
		selfInflictSprite: 'poison'
	},
	{
		id: 'rage',
		giveBonus:{stat:'strength',amount:10},
		selfInflictSprite: 'flame'
	},
	{
		id: 'hidden',
		immunity: true,
		removeOnProvoke: true,
		selfInflictSprite: 'smoke',
		decayAnyPlayer:true,
	}
];

import type { AnySprite } from '$lib/utils';

// export type StatusId = 'poison' | 'rage' | 'hidden'
export type StatusId = string;

export type StatusData = {
	id: StatusId;
	damagePercent?: number;
	incStr?: number;
	immunity?: boolean;
	removeOnProvoke?: boolean;
	selfInflictSprite: AnySprite;
};

export const statusDatas: StatusData[] = [
	{
		id: 'poison',
		damagePercent: 0.2,
		selfInflictSprite: 'poison'
	},
	{
		id: 'rage',
		incStr: 10,
		selfInflictSprite: 'flame'
	},
	{
		id: 'hidden',
		immunity: true,
		removeOnProvoke: true,
		selfInflictSprite: 'smoke'
	}
];

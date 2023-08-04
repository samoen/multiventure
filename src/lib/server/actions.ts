import type { Enemy } from './enemies';
import { users, type User } from './users';
import { items } from './items';
import { scenes, type SceneKey } from './scenes';

export type SelfActionGenerator = {
	targetKind: 'onlySelf';
	generate: (actor: User) => GameAction | null;
};

export type NearbyFriendlyActionGenerator = {
	targetKind: 'usersInRoom';
	generate: (actor: User, target: User) => GameAction | null;
};

export type NearbyEnemyActionGenerator = {
	targetKind: 'enemiesInRoom';
	generate: (actor: User, target: Enemy) => GameAction | null;
};

export type ActionGenerator = SelfActionGenerator | NearbyFriendlyActionGenerator;

export type GameAction = {
	id: string;
	onAct: () => void;
	buttonText: string;
};

export function getAvailableActionsForPlayer(p: User): GameAction[] {
	const res: GameAction[] = [];

	const onlySelfPreActions: SelfActionGenerator[] = [];
	const userTargetingPreActions: NearbyFriendlyActionGenerator[] = [];

	scenes[p.currentScene].options.forEach((pa)=>{
		if (pa.targetKind == 'onlySelf') {
			onlySelfPreActions.push(pa);
		} else if (pa.targetKind == 'usersInRoom') {
			userTargetingPreActions.push(pa);
		}
	});
	p.inventory.forEach((ik) => {
		const preAction = items[ik];
		if (preAction.targetKind == 'usersInRoom') {
			userTargetingPreActions.push(preAction);
		} else if (preAction.targetKind == 'onlySelf') {
			onlySelfPreActions.push(preAction);
		}
	});

	onlySelfPreActions
			.map((pe) => pe.generate(p))
			.forEach((ga) => {
				if (ga) {
					res.push(ga)
				}
			});

	// res.push(...onlySelfActions);

	const userTargetingActions: GameAction[] = [];
	const usersInRoom: User[] = Array.from(users.entries())
		.filter(([id, usr]) => usr.connectionState != null && usr.currentScene == p.currentScene)
		.map(([id, usr]) => usr);

	userTargetingPreActions.forEach((prea) => {
		usersInRoom.forEach((userInRoom) => {
			const gameAction = prea.generate(p, userInRoom);
			if (gameAction) {
				userTargetingActions.push(gameAction);
			}
		});
	});

	res.push(...userTargetingActions);

	return res;
}

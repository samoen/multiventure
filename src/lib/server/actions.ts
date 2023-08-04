import type { ActiveEnemy } from './enemies';
import { items } from './items';
import { scenes } from './scenes';
import { users, type User } from './users';

export type SelfActionGenerator = {
	targeting: 'noTarget';
	generate: (actor: User) => GameAction | null;
};

export type NearbyFriendlyActionGenerator = {
	targeting: 'usersInScene';
	generate: (actor: User, target: User) => GameAction | null;
};

export type NearbyEnemyActionGenerator = {
	targeting: 'enemiesInScene';
	generate: (actor: User, target: ActiveEnemy) => GameAction | null;
};

export type ActionGenerator = SelfActionGenerator | NearbyFriendlyActionGenerator | NearbyEnemyActionGenerator;

export type GameAction = {
	onAct: () => void;
	buttonText: string;
};

export function getAvailableActionsForPlayer(p: User): GameAction[] {
	const availableActions: GameAction[] = [];

	const friendlyActionGenerators: NearbyFriendlyActionGenerator[] = [];

	for (const pa of scenes[p.currentScene].options) {
		if (pa.targeting == 'noTarget') {
			const ga = pa.generate(p)
			if (ga) availableActions.push(ga)
		} else if (pa.targeting == 'usersInScene') {
			friendlyActionGenerators.push(pa);
		}
	}

	for (const itemKey of p.inventory) {
		const actionGenerator = items[itemKey];
		if (actionGenerator.targeting == 'noTarget') {
			const gameAction = actionGenerator.generate(p)
			if (gameAction) availableActions.push(gameAction);
		} else if (actionGenerator.targeting == 'usersInScene') {
			friendlyActionGenerators.push(actionGenerator);
		}
	}

	const usersInRoom: User[] = Array.from(users.entries())
		.filter(([id, usr]) => usr.connectionState != null && usr.currentScene == p.currentScene)
		.map(([id, usr]) => usr);


	for (const friendlyActionGenerator of friendlyActionGenerators) {
		for (const user of usersInRoom) {
			const gameAction = friendlyActionGenerator.generate(p, user);
			if (gameAction) {
				availableActions.push(gameAction);
			}

		}
	}

	return availableActions;
}

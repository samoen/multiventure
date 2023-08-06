// import { activeEnemies, type ActiveEnemy } from './enemies';
import type { ActiveEnemy } from './enemies';
import { items } from './items';
import { scenes, type SceneKey } from './scenes';
import { users, type Player } from './users';
// import { users, type Player } from './users';

export type SelfActionGenerator = {
	targeting: 'noTarget';
	generate: (actor: Player) => GameAction | null;
};

export type FriendlyActionGenerator = {
	targeting: 'friendlies';
	generate: (actor: Player, target: Player) => GameAction | null;
};

export type AggressiveActionGenerator = {
	targeting: 'enemies';
	generate: (actor: Player, target: ActiveEnemy) => GameAction | null;
};

export type ActionGenerator = SelfActionGenerator | FriendlyActionGenerator | AggressiveActionGenerator;

export type GameAction = {
	performAction: () => void;
	buttonText: string;
};

export function activePlayersInScene(scene:SceneKey) : Player[]{
	return Array.from(users.values())
		.filter((usr) => usr.connectionState != null && usr.currentScene == scene)
}

export function getAvailableActionsForPlayer(p: Player) {
	// const availableActions: GameAction[] = [];
	// const friendlyActionGenerators: FriendlyActionGenerator[] = [];
	// const aggressiveActionGenerators: AggressiveActionGenerator[] = [];
	p.actions = []
	scenes[p.currentScene].sceneActions(p)

	// for (const pa of scenes[p.currentScene].sceneActions) {
	// 	if (pa.targeting == 'noTarget') {
	// 		const ga = pa.generate(p)
	// 		if (ga) availableActions.push(ga)
	// 	} else if (pa.targeting == 'friendlies') {
	// 		friendlyActionGenerators.push(pa);
	// 	}
	// }

	for (const itemKey of p.inventory) {
		
		const item = items[itemKey];
		item(p)
		// const actionGenerator = items[itemKey];
	// 	if (actionGenerator.targeting == 'noTarget') {
	// 		const gameAction = actionGenerator.generate(p)
	// 		if (gameAction) availableActions.push(gameAction);
	// 	} else if (actionGenerator.targeting == 'friendlies') {
	// 		friendlyActionGenerators.push(actionGenerator);
	// 	}else if (actionGenerator.targeting == "enemies") {
	// 		aggressiveActionGenerators.push(actionGenerator);
	// 	}
	}

	// const friendliesInRoom: Player[] = Array.from(users.entries())
	// 	.filter(([id, usr]) => usr.connectionState != null && usr.currentScene == p.currentScene)
	// 	.map(([id, usr]) => usr);


	// for (const friendlyActionGenerator of friendlyActionGenerators) {
	// 	for (const friendly of friendliesInRoom) {
	// 		const gameAction = friendlyActionGenerator.generate(p, friendly);
	// 		if (gameAction) {
	// 			availableActions.push(gameAction);
	// 		}

	// 	}
	// }

	// const enemiesInScene: ActiveEnemy[] = activeEnemies.filter(e=>e.currentScene == p.currentScene)
	// for (const aggressiveActionGenerator of aggressiveActionGenerators) {
	// 	for (const enemy of enemiesInScene) {
	// 		const gameAction = aggressiveActionGenerator.generate(p, enemy);
	// 		if (gameAction) {
	// 			availableActions.push(gameAction);
	// 		}

	// 	}
	// }

	// return availableActions;
}

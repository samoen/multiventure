// import { activeEnemies, type ActiveEnemy } from './enemies';
import type { ActiveEnemy } from './enemies';
import { items } from './items';
import type { SceneKey } from './scenes';
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

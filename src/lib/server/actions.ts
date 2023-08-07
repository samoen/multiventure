// import { activeEnemies, type ActiveEnemy } from './enemies';
import type { SceneKey } from './scenes';
import { users, type Player } from './users';


export type GameAction = {
	performAction: () => void;
	buttonText: string;
};

export function activePlayersInScene(scene:SceneKey) : Player[]{
	return Array.from(users.values())
		.filter((usr) => usr.connectionState != null && usr.currentScene == scene)
}
export function activePlayers() : Player[]{
	return Array.from(users.values())
		.filter((usr) => usr.connectionState != null)
}

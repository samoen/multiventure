import type { ItemKey } from './items';
import type { SceneKey } from './scenes';

export type UserId = string;
export type HeroName = string;
export type Flag = 'gotFreeStarterWeapon' | 'heardAboutHiddenPassage';
export type User = {
	connectionState: {
		ip: string | null; 
		con: ReadableStreamController<unknown> | null;
		stream: ReadableStream | null;
	} | null;
	heroName: HeroName;
	currentScene: SceneKey;
	inventory: ItemKey[];
	health: number;
	transitionText:string;
	extraTexts: string;
	flags: Set<Flag>;
};

export const users = new Map<UserId, User>();
import type { ItemKey } from './items';
import type { SceneKey } from './scenes';

export type UserId = string;
export type HeroName = string;
export type Flag = 'gotFreeStarterWeapon' | 'heardAboutHiddenPassage' | 'killedGoblins';
export type GlobalFlag = 'smashedMedallion' | 'placedMedallion';

export type Player = {
	connectionState: {
		ip: string | null; 
		con: ReadableStreamController<unknown> | null;
		stream: ReadableStream | null;
	} | null;
	heroName: HeroName;
	inventory: ItemKey[];
	health: number;
	currentScene: SceneKey;
	previousScene:SceneKey;
	duringSceneTexts: string[];
	flags: Set<Flag>;
};

export const users = new Map<UserId, Player>();
export const globalFlags = new Set<GlobalFlag>();

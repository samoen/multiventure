import type { GameAction } from './actions';
import { utilityItems, type BodyItemKey, type Item, type UtilityItemKey, type WeaponItemKey, bodyItems, weapons, type ItemKey, items, type ItemKeyWithCooldown, type Inventory } from './items';
import type { SceneKey } from './scenes';

export type UserId = string;
export type HeroName = string;
export type Flag =
	'metArthur'
	| 'heardAboutHiddenPassage'
	| 'gotFreeStarterWeapon'
	| 'killedGoblins'
	| 'sawArthurAfterBattle'

export type GlobalFlag =
	'smashedMedallion'
	| 'placedMedallion';


export type Player = {
	connectionState: {
		ip: string | null;
		con: ReadableStreamController<unknown> | null;
		stream: ReadableStream | null;
	} | null;
	heroName: HeroName;
	health: number;
	inventory:Inventory;
	currentScene: SceneKey;
	previousScene: SceneKey;
	actions: GameAction[];
	sceneTexts: string[];
	flags: Set<Flag>;
};

export const users = new Map<UserId, Player>();
export const globalFlags = new Set<GlobalFlag>();

export function playerEquipped(player:Player) : Item[]{
	return [
		items[player.inventory.weapon.itemKey],
		items[player.inventory.body.itemKey],
		items[player.inventory.utility.itemKey]]
}

export function playerCooldowns(player:Player) : ItemKeyWithCooldown[]{
	return [
		player.inventory.weapon,
		player.inventory.body,
		player.inventory.utility
	]
}


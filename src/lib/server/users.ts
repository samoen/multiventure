import type { GameAction } from './actions';
import { utilityItems, type ItemTemplate, bodyItems, weapons, type ItemId, items, type Inventory, type ItemStateForSlot, type EquipmentSlot, type ItemState } from './items';
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

export function playerEquipped(player:Player) : ItemTemplate[]{
	return [
		items[player.inventory.weapon.itemId],
		items[player.inventory.body.itemId],
		items[player.inventory.utility.itemId]]
}

export function playerCooldowns(player:Player) : ItemState[]{
	return [
		player.inventory.weapon,
		player.inventory.body,
		player.inventory.utility
	]
}


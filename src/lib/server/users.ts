import type { GameAction } from './actions';
import { utilityItems, type BodyItemKey, type Item, type UtilityItemKey, type WeaponItemKey, bodyItems, weapons } from './items';
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

// export type EquipmentSlot =
// |'weapon'
// | 'utility'
// | 'body'

// export type Inventory = Map<EquipmentSlot,ItemKey>

export type Player = {
	connectionState: {
		ip: string | null;
		con: ReadableStreamController<unknown> | null;
		stream: ReadableStream | null;
	} | null;
	heroName: HeroName;
	// inventory: Inventory;
	health: number;
	weapon:WeaponItemKey;
	weaponCooldown:number;
	utility:UtilityItemKey;
	utilityCooldown:number;
	body:BodyItemKey;
	bodyCooldown:number;
	currentScene: SceneKey;
	previousScene: SceneKey;
	actions: GameAction[];
	sceneTexts: string[];
	flags: Set<Flag>;
};

export const users = new Map<UserId, Player>();
export const globalFlags = new Set<GlobalFlag>();

export function playerEquipped(player:Player) : Item[]{
	return [weapons[player.weapon],utilityItems[player.utility],bodyItems[player.body]]
}


import type { UnitId, BattleAnimation, StatusEffect, StatusId, BattleEvent, HeroId, ScenerySprite, VisualActionSourceId } from '$lib/utils';
import { items, type Inventory, type Item, type ItemState, type EquipmentSlot, type ItemStateForSlot } from './items';
import { pushHappening } from './messaging';
import type { SceneId, VisualActionSource } from './scenes';

export const users = new Map<UserId, Player>();
export const globalFlags = new Set<GlobalFlag>();

export type UserId = string;
export type HeroName = string;
export type Flag =
	| 'approachedRack'
	| 'metArthur'
	| 'heardAboutHiddenPassage'
	| 'gotFreeStarterWeapon'
	| 'killedGoblins'
	| 'sawArthurAfterBattle'

export type GlobalFlag =
	| 'smashedMedallion'
	| 'placedMedallion';


export type Player = {
	connectionState: {
		ip: string | null;
		con: ReadableStreamController<unknown> | null;
		stream: ReadableStream | null;
	} | null;
	previousScene: SceneId;
	lastCheckpoint: SceneId;
	itemActions: GameAction[];
	sceneActions: GameAction[];
	sceneTexts: string[];
	flags: Set<Flag>;
	animations: BattleAnimation[];
	visualActionSources: VisualActionSource[];
} & PlayerInClient;

export type PlayerInClient = {
	unitId:HeroId;
	heroName: HeroName;
	currentScene: SceneId;
	health: number;
	agility:number;
	strength:number;
	maxHealth: number;
	inventory:Inventory;
	statuses:Record<StatusId,number>
};

export type GameAction = {
	goTo?:SceneId;
	performAction?: () => BattleEvent | void;
	buttonText: string;
	speed?:number;
	provoke?:number;
	grantsImmunity?:boolean;
	slot?:EquipmentSlot
	target?: UnitId;
	wait?:boolean;
};

export type MiscPortrait = 'general' | 'peasant'

export function playerEquipped(player:Player) : Item[]{
	return [
		items[player.inventory.weapon.itemId],
		items[player.inventory.body.itemId],
		items[player.inventory.utility.itemId]]
}

export function playerItemStates(player:Player) : ItemState[]{
	return [
		player.inventory.weapon,
		player.inventory.body,
		player.inventory.utility
	]
}

export function healPlayer(player:Player, amount:number) : {healed:number}{
	let missing = player.maxHealth - player.health	
	let toHeal = amount
	if(missing < amount){
		toHeal = missing
	}
	player.health += toHeal
	pushHappening(`${player.heroName} was healed for ${toHeal}hp`);
	return {healed:toHeal}
}

export function activePlayers(): Player[]{
	return Array.from(users.values())
		.filter((usr) => usr.connectionState != null 
		&& usr.connectionState.stream && usr.connectionState.stream.locked
		)
}

export function activePlayersInScene(scene:SceneId) : Player[]{
	return activePlayers()
		.filter((usr) => usr.currentScene == scene)
}

export function cleanConnections(){
	for(const p of activePlayers()){
		if(p.connectionState != null && !p.connectionState.stream?.locked){
			p.connectionState.con?.close()	
		}
	}
}

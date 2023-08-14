import type { ActionTarget } from '$lib/utils';
import { items, type Inventory, type Item, type ItemState } from './items';
import { pushHappening } from './messaging';
import type { SceneId } from './scenes';

export const users = new Map<UserId, Player>();
export const globalFlags = new Set<GlobalFlag>();

export type UserId = string;
export type HeroName = string;
export type Flag =
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
	heroName: HeroName;
	health: number;
	maxHealth: number;
	speed:number;
	inventory:Inventory;
	currentScene: SceneId;
	previousScene: SceneId;
	lastCheckpoint?: SceneId;
	itemActions: GameAction[];
	sceneActions: GameAction[];
	sceneTexts: string[];
	flags: Set<Flag>;
};

export type GameAction = {
	goTo?:SceneId;
	performAction?: () => void;
	buttonText: string;
	speed?:number;
	provoke?:number;
	grantsImmunity?:boolean;
	target?: ActionTarget;
};

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

export function healPlayer(player:Player, amount:number){
	let missing = player.maxHealth - player.health	
	let toHeal = amount
	if(missing < amount){
		toHeal = missing
	}
	player.health += toHeal
	pushHappening(`${player.heroName} was healed for ${toHeal}hp`);
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

import type { UnitId, BattleAnimation, StatusEffect, StatusId, BattleEvent, HeroId, AnySprite, VisualActionSourceId } from '$lib/utils';
import { v4 } from 'uuid';
import { items, type Inventory, type Item, type ItemState, type EquipmentSlot, type QuickbarSlot } from './items';
import { pushHappening } from './messaging';
import type { VisualActionSource } from './logic';
import { type SceneId, scenes, addSoloScenes } from './scenes';

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
	| 'smashedMedallion'
	| 'placedMedallion';

export type GlobalFlag = 'unused';


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
	currentScene: SceneId;
} & PlayerInClient;

export type PlayerInClient = {
	unitId:HeroId;
	heroName: HeroName;
	currentSceneDisplay:string;
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
	slot?:QuickbarSlot;
	target?: UnitId;
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

export function addNewUser(heroName : string) : {id:string,player:Player}{
	const startflags: Set<Flag> = new Set()
		// startflags.add('heardAboutHiddenPassage')
		// startflags.add('gotFreeStarterWeapon')
		// startflags.add('killedGoblins')
		
		let startScene: SceneId = `tutorial_${heroName}`
		// startScene = `trainingRoom1_${heroName}`
		// startScene = `forest`
		// startScene = 'forestPassage'
		// startScene = 'goblinCamp'
		// startScene = 'castle'
		// startScene = 'throne'
		startScene = 'armory'
		
		let startWep = items.unarmed
		let startUtil = items.empty
		let startBody = items.rags

		let startInventory: Inventory = {
			weapon: {
				itemId: startWep.id,
				// itemId: 'club',
				cooldown: 0,
				warmup: startWep.warmup ?? 0,
				stock: startWep.startStock
			},
			utility: {
				itemId: startUtil.id,
				cooldown: 0,
				warmup: startBody.warmup ?? 0,
				stock: startUtil.startStock
			},
			body: {
				itemId: startBody.id,
				cooldown: 0,
				warmup: startBody.warmup ?? 0,
				stock: startBody.startStock
			}
		}
		
		let player : Player = {
			unitId:`hero${heroName}`,
			connectionState: null,
			heroName: heroName,
			previousScene: 'dead',
			lastCheckpoint: 'forest',
			currentScene: startScene,
			currentSceneDisplay: scenes.get(startScene)?.displayName ?? 'Somewhere',
			inventory: startInventory,
			health: 100,
			maxHealth: 100,
			agility: 0,
			strength: 0,
			sceneActions: [],
			itemActions: [],
			visualActionSources: [],
			sceneTexts: [],
			flags: startflags,
			animations:[],
			statuses:{
				poison:0,
				rage:0,
				hidden:0,
			},
		}
		
		addSoloScenes(heroName)
		scenes.get(player.currentScene)?.onEnterScene(player)
		let userId = v4()
		users.set(userId, player);
		return {id:userId,player:player}
}

import { v4 } from 'uuid';
import { items, type Item, type ItemState, type QuickbarSlot, type ItemId, equipItem, fireStaff, plateMail, leatherArmor, poisonDart, comboFindClassFromInventory } from './items';
import { pushHappening } from './messaging';
import { deepEqual, type UnlockableActionData, type VisualActionSource } from './logic';
import { type SceneDataId, scenesData, type UniqueSceneIdenfitier, startSceneDataId, dead, uniqueFromSceneDataId, getSceneDataSimple } from './scenes';
import type { BattleAnimation, HeroId, StatusId, BattleEvent, UnitId, VisualActionSourceId } from '$lib/utils';

export const users = new Map<UserId, Player>();
export const globalFlags = new Set<GlobalFlag>();

export function defaultInventory():ItemState[]{
	let defaultItems = items.filter(i=>i.default)
	
	return defaultItems.map(i=>{
		return{
			itemId:i.id,
			cooldown:0,
			slot:i.slot,
			warmup:i.warmup ?? 0,
			stock:i.startStock,
			stats:i,
		} satisfies ItemState
	})

}

export function addNewUser(heroName: string): { id: string, player: Player } | undefined{

	let pId : HeroId = `hero${heroName}`

	const startflags: Set<Flag> = new Set()
	// startflags.add('heardAboutHiddenPassage')
	// startflags.add('gotFreeStarterWeapon')
	// startflags.add('killedGoblins')
	
	let startInventory = defaultInventory()


	let startSceneId: SceneDataId = startSceneDataId
	// startSceneId = 'forestPassage'
	// startSceneId = 'throne'
	// startSceneId = 'armory'

	let startUnique = uniqueFromSceneDataId(pId,startSceneId)
	let startScene = getSceneDataSimple(startSceneId)


	let player: Player = {
		unitId: pId,
		connectionState: {
			con:undefined,
			stream:undefined,
		},
		heroName: heroName,
		previousScene: startUnique,
		lastCheckpoint: startUnique,
		currentUniqueSceneId:startUnique,
		currentSceneDisplay: startScene.displayName,
		inventory: startInventory,
		health: 100,
		maxHealth: 100,
		agility: 1,
		strength: 1,
		sceneActions: [],
		itemActions: [],
		vasActions: [],
		visualActionSources: [],
		sceneTexts: [],
		flags: startflags,
		animations: [],
		statuses: {
			poison: 0,
			rage: 0,
			hidden: 0,
		},
		class:comboFindClassFromInventory(startInventory)
	}

	// equipItem(player, fireStaff)
	// equipItem(player,leatherArmor)
	// equipItem(player, poisonDart)

	let userId = v4()
	users.set(userId, player);
	return { id: userId, player: player }
}

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
		// ip: string | null;
		con: ReadableStreamController<unknown> | undefined;
		stream: ReadableStream | undefined;
	};
	previousScene: UniqueSceneIdenfitier;
	lastCheckpoint: UniqueSceneIdenfitier;
	itemActions: GameAction[];
	sceneActions: GameAction[];
	vasActions: GameAction[];
	sceneTexts: string[];
	flags: Set<Flag>;
	animations: BattleAnimation[];
	visualActionSources: VisualActionSource[];
	currentUniqueSceneId:UniqueSceneIdenfitier;
} & PlayerInClient;

export type PlayerInClient = {
	inventory:ItemState[];
	unitId: HeroId;
	heroName: HeroName;
	currentSceneDisplay: string;
	health: number;
	agility: number;
	strength: number;
	maxHealth: number;
	statuses: Record<StatusId, number>
	class:string
};

export type GameAction = {
	devAction?:()=>void;
	battleEvent?:BattleEvent;
	buttonText: string;
	slot?: QuickbarSlot;
	itemId?:ItemId;
	vasId?:VisualActionSourceId;
	target?: UnitId;
	unlockableActData?:UnlockableActionData;
};

export function playerEquipped(player: Player): Item[] {
	let equippedItems : Item[] = []
	for(const iId of player.inventory){
		let found = items.find(i=>i.id == iId.itemId)
		if(found){
			equippedItems.push(found)
		}
	}
	return equippedItems
}

export function healPlayer(player: Player, amount: number): { healed: number } {
	let missing = player.maxHealth - player.health
	let toHeal = amount
	if (missing < amount) {
		toHeal = missing
	}

	player.health += toHeal
	pushHappening(`${player.heroName} was healed for ${toHeal}hp`);
	return { healed: toHeal }
}

export function activePlayers(): Player[] {
	return Array.from(users.values())
		.filter((usr) => {
			return usr.connectionState.con && 
				usr.connectionState.stream && 
				usr.connectionState.stream.locked
		}
		)
}

export function activePlayersInScene(scene:UniqueSceneIdenfitier){
	let ap = activePlayers()
	let apIs = ap.filter((usr) => deepEqual(usr.currentUniqueSceneId,scene))
	return apIs
}

export function cleanConnections() {
	for (const p of activePlayers()) {
		if (p.connectionState != null && !p.connectionState.stream?.locked) {
			p.connectionState.con?.close()
		}
	}
}


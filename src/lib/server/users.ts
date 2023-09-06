import type { UnitId, BattleAnimation, StatusEffect, StatusId, BattleEvent, HeroId, AnySprite, VisualActionSourceId } from '$lib/utils';
import { v4 } from 'uuid';
import { items, type Item, type ItemState, type QuickbarSlot, type ItemId, equipItem, fireStaff, plateMail, leatherArmor, poisonDart } from './items';
import { pushHappening } from './messaging';
import type { UnlockableActionData, VisualActionSource } from './logic';
import { type SceneId, scenes, addSoloScenes } from './scenes';

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
		} satisfies ItemState
	})

}

export function addNewUser(heroName: string): { id: string, player: Player } {
	const startflags: Set<Flag> = new Set()
	// startflags.add('heardAboutHiddenPassage')
	// startflags.add('gotFreeStarterWeapon')
	// startflags.add('killedGoblins')

	let startScene: SceneId = `tutorial_${heroName}`
	// startScene = `trainingRoom3_${heroName}`
	// startScene = `forest`
	// startScene = 'forestPassage'
	// startScene = 'goblinCamp'
	// startScene = 'castle'
	// startScene = 'throne'
	// startScene = 'armory'

	let startInventory = defaultInventory()


	let player: Player = {
		unitId: `hero${heroName}`,
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
		animations: [],
		statuses: {
			poison: 0,
			rage: 0,
			hidden: 0,
		},
	}

	// equipItem(player, fireStaff)
	// equipItem(player,leatherArmor)
	// equipItem(player, poisonDart)

	addSoloScenes(heroName)
	scenes.get(player.currentScene)?.onEnterScene(player)
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
	// abilities:Map<QuickbarSlot,ItemState>;
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
};

export type GameAction = {
	goTo?: SceneId;
	devAction?:()=>void;
	performAction?: () => BattleEvent | void;
	buttonText: string;
	slot?: QuickbarSlot;
	itemId?:ItemId;
	target?: UnitId;
	unlockableActData?:UnlockableActionData;
};

export type MiscPortrait = 'general' | 'peasant' | 'lady'

export function playerEquipped(player: Player): Item[] {
	let equippedItems : Item[] = []
	for(const iId of player.inventory){
		// if(slot in ItemId){

		// }
		let found = items.find(i=>i.id == iId.itemId)
		if(found){
			equippedItems.push(found)

		}
	}
	return equippedItems
	// return [
	// 	items[player.inventory.weapon.itemId],
	// 	items[player.inventory.body.itemId],
	// 	items[player.inventory.utility.itemId]]
}

// export function playerItemStates(player: Player): ItemState[] {
// 	return [
// 		player.inventory.weapon,
// 		player.inventory.body,
// 		player.inventory.utility
// 	]
// }

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
		.filter((usr) => usr.connectionState != null
			&& usr.connectionState.stream && usr.connectionState.stream.locked
		)
}

export function activePlayersInScene(scene: SceneId): Player[] {
	return activePlayers()
		.filter((usr) => usr.currentScene == scene)
}

export function cleanConnections() {
	for (const p of activePlayers()) {
		if (p.connectionState != null && !p.connectionState.stream?.locked) {
			p.connectionState.con?.close()
		}
	}
}


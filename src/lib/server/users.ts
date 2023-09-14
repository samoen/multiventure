import type {
	BattleAnimation,
	BattleEvent,
	HeroId,
	StatusState,
	UnitId,
	VisualActionSourceId
} from '$lib/utils';
import { v4 } from 'uuid';
import { equipItem, items, type Item, type ItemId, type ItemState } from './items';
import { deepEqual, type VasActionData, type VisualActionSource } from './logic';
import { pushHappening } from './messaging';
import {
	startSceneDataId,
	uniqueFromSceneDataId,
	type SceneDataId,
	type UniqueSceneIdenfitier
} from './scenes';
import type { StatusId } from './statuses';

export const users = new Map<UserId, Player>();
export const globalFlags = new Set<GlobalFlag>();

export function addNewUser(heroName: string): { id: string; player: Player } | undefined {
	const pId: HeroId = `hero${heroName}`;

	const startflags: Set<Flag> = new Set();
	// startflags.add('heardAboutHiddenPassage')
	// startflags.add('gotFreeStarterWeapon')
	// startflags.add('killedGoblins')

	let startSceneId: SceneDataId = startSceneDataId;
	// startSceneId = 'forestPassage'
	// startSceneId = 'throne'
	startSceneId = 'armory'

	const startUnique = uniqueFromSceneDataId(pId, startSceneId);

	const player: Player = {
		unitId: pId,
		connectionState: {
			con: undefined,
			stream: undefined
		},
		displayName: heroName,
		previousScene: startUnique,
		lastCheckpoint: startUnique,
		currentUniqueSceneId: startUnique,
		inventory: [],
		health: 100,
		maxHealth: 100,
		agility: 1,
		strength: 1,
		bonusStrength: 0,
		devActions: [],
		itemActions: [],
		vasActions: [],
		visualActionSources: [],
		sceneTexts: [],
		flags: startflags,
		animations: [],
		statuses: new Map()
	};

	items
		.filter((i) => i.default)
		.forEach((i) => {
			equipItem(player, i.id);
		});
	// equipItem(player, 'potion')
	// equipItem(player,'leatherArmor')
	// equipItem(player, 'poisonDart')

	const userId = v4();
	users.set(userId, player);
	return { id: userId, player: player };
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
	devActions: GameAction[];
	vasActions: GameAction[];
	sceneTexts: string[];
	flags: Set<Flag>;
	animations: BattleAnimation[];
	visualActionSources: VisualActionSource[];
	currentUniqueSceneId: UniqueSceneIdenfitier;
	statuses: Map<StatusId, number>;
} & PlayerCommonStats;

export type PlayerCommonStats = {
	inventory: ItemState[];
	unitId: HeroId;
	displayName: HeroName;
	health: number;
	agility: number;
	strength: number;
	bonusStrength: number;
	maxHealth: number;
};

export type PlayerInClient = {
	currentSceneDisplay: string;
	class: string;
	statuses: StatusState[];
} & PlayerCommonStats;

export type GameAction = {
	devAction?: () => void;
	battleEvent?: BattleEvent;
	buttonText: string;
	itemId?: ItemId;
	associateWithUnit?: UnitId;
	unlockableActData?: VasActionData & withVasId;
};

export type withVasId = {
	vasId: VisualActionSourceId;
};

export function healPlayer(player: Player, amount: number): { healed: number } {
	const missing = player.maxHealth - player.health;
	let toHeal = amount;
	if (missing < amount) {
		toHeal = missing;
	}

	player.health += toHeal;
	pushHappening(`${player.displayName} was healed for ${toHeal}hp`);
	return { healed: toHeal };
}

export function activePlayers(): Player[] {
	return Array.from(users.values()).filter((usr) => {
		return (
			usr.connectionState.con && usr.connectionState.stream && usr.connectionState.stream.locked
		);
	});
}

export function activePlayersInScene(scene: UniqueSceneIdenfitier) {
	const ap = activePlayers();
	const apIs = ap.filter((usr) => deepEqual(usr.currentUniqueSceneId, scene));
	return apIs;
}

export function cleanConnections() {
	for (const p of activePlayers()) {
		if (p.connectionState != null && !p.connectionState.stream?.locked) {
			p.connectionState.con?.close();
		}
	}
}

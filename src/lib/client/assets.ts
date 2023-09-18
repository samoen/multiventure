import rage from '$lib/assets/extras/rage.png';
import skull from '$lib/assets/extras/suppose_dead.png';
import hidden from '$lib/assets/extras/hidden.png';
import plainsLandscape from '$lib/assets/landscapes/landscape-plain.webp';
import castleLandscape from '$lib/assets/landscapes/landscape-castle.webp';
import grimForestLandscape from '$lib/assets/landscapes/grim-altar.jpg';
import bridgeLandscape from '$lib/assets/landscapes/landscape-bridge.webp';
import peasantPortrait from '$lib/assets/portraits/peasant-fists.webp';
import woodsmanPortrait from '$lib/assets/portraits/woodsman.webp';
import bowmanPortrait from '$lib/assets/portraits/bowman.webp';
import generalPortrait from '$lib/assets/portraits/general.webp';
import ladyPortrait from '$lib/assets/portraits/lady.webp';
import thiefPortrait from '$lib/assets/portraits/thief.webp';
import thugPortrait from '$lib/assets/portraits/thug.webp';
import heavyInfantryPortrait from '$lib/assets/portraits/heavy-infantry.webp';
import whiteMagePortrait from '$lib/assets/portraits/mage-white.webp';
import ruffianPortrait from '$lib/assets/portraits/ruffian.webp';
import magePortrait from '$lib/assets/portraits/mage.webp';
import peasant from '$lib/assets/units/peasant.png';
import rogue from '$lib/assets/units/rogue.png';
import thug from '$lib/assets/units/thug.png';
import heavyInfantry from '$lib/assets/units/heavyinfantry.png';
import whiteMage from '$lib/assets/units/white-mage.png';
import woodsman from '$lib/assets/units/woodsman.png';
import bowman from '$lib/assets/units/bowman.png';
import general from '$lib/assets/units/general.png';
import druid from '$lib/assets/units/druid.png';
import lady from '$lib/assets/units/lady.png';
import spectre from '$lib/assets/units/spectre.png';
import necromancer from '$lib/assets/units/necromancer.png';
import gruntPortrait from '$lib/assets/portraits/grunt.webp';
import spearman from '$lib/assets/units/spearman.png';
import rat from '$lib/assets/units/giant-rat.png';
import grunt from '$lib/assets/units/grunt.png';
import troll from '$lib/assets/units/young-ogre.png';
import greenDrip from '$lib/assets/extras/green-drip.png';
import ruffian from '$lib/assets/units/ruffian.png';
import fireghost from '$lib/assets/units/fireghost.png';
import thief from '$lib/assets/units/thief.png';
import mage from '$lib/assets/units/mage.png';
import arrow from '$lib/assets/extras/arrow.png';
import bomb from '$lib/assets/extras/bomb.png';
import box from '$lib/assets/scenery/box.png';
import shield from '$lib/assets/extras/shield.png';
import smoke from '$lib/assets/extras/smoke.png';
import flame from '$lib/assets/extras/flame.png';
import heal from '$lib/assets/extras/heal.png';
import lighthouse from '$lib/assets/scenery/lighthouse.png';
import forest from '$lib/assets/scenery/mixed-summer-small.png';
import stoneDoor from '$lib/assets/scenery/dwarven-doors-closed.png';
import portal from '$lib/assets/scenery/summoning-center.png';
import signpost from '$lib/assets/scenery/signpost.png';
import temple from '$lib/assets/scenery/temple1.png';
import armor from '$lib/assets/scenery/armor.png';
import pendant from '$lib/assets/scenery/pendant.png';
import bombpad from '$lib/assets/scenery/bomb-pad.png';
import altar from '$lib/assets/scenery/altar.png';
import staff from '$lib/assets/scenery/staff-magic.png';
import whiteRing from '$lib/assets/scenery/ring-white.png';
import bag from '$lib/assets/scenery/leather-pack.png';
import scarecrow from '$lib/assets/scenery/scarecrow.png';
import dagger from '$lib/assets/scenery/dagger.png';
import bow from '$lib/assets/scenery/bow.png';
import potion from '$lib/assets/scenery/potion-red.png';
import club from '$lib/assets/extras/club.png';
import potionSlot from '$lib/assets/equipment/potion-slot.png';
import skullSlot from '$lib/assets/equipment/skull-slot.png';
import dressSlot from '$lib/assets/equipment/dress_silk_green.png';
import tunicSlot from '$lib/assets/equipment/tunic_elven.png';
import clubSlot from '$lib/assets/equipment/club-small.png';
import bombSlot from '$lib/assets/equipment/bomb-slot.png';
import fistSlot from '$lib/assets/equipment/fist-human.png';
import shieldSlot from '$lib/assets/equipment/heater-shield.png';
import waitSlot from '$lib/assets/equipment/wait-slot.png';
import blankSlot from '$lib/assets/equipment/blank-attack.png';
import poisonDartSlot from '$lib/assets/equipment/dagger-thrown-poison-human.png';
import fireballSlot from '$lib/assets/equipment/fireball.png';
import daggerSlot from '$lib/assets/equipment/dagger-human.png';
import bowSlot from '$lib/assets/equipment/bow-short.png';
import type { EnemyTemplateId } from '$lib/server/enemies';
import type { ItemId, ItemState } from '$lib/server/items';
import type { PlayerInClient } from '$lib/server/users';
import type { AnySprite, LandscapeImage } from '$lib/utils';
import type { StatusId } from '$lib/server/statuses';

export const enemySprites: Record<EnemyTemplateId, string> = {
	goblin: spearman,
	rat: rat,
	darter: spearman,
	orc: grunt,
	troll: troll,
	fireGremlin: fireghost
};

export function getSlotImage(id: ItemId): string {
	if (id == 'fist') return fistSlot;
	if (id == 'club') return clubSlot;
	if (id == 'dagger') return daggerSlot;
	if (id == 'fireStaff') return fireballSlot;
	if (id == 'bomb') return bombSlot;
	if (id == 'bow') return bowSlot;
	if (id == 'poisonDart') return poisonDartSlot;
	if (id == 'potion') return potionSlot;
	if (id == 'leatherArmor') return tunicSlot;
	if (id == 'thiefCloak') return dressSlot;
	if (id == 'plateMail') return shieldSlot;
	if (id == 'pendantOfProtection') return shieldSlot;
	if (id == 'wait') return waitSlot;
	if (id == 'succumb') return skullSlot;
	return blankSlot;
}

export function getHeroPortrait(className: string): string {
	if (className == 'peasant') return peasantPortrait;
	if (className == 'thief') return thiefPortrait;
	if (className == 'rogue') return thiefPortrait;
	if (className == 'woodsman') return woodsmanPortrait;
	if (className == 'bowman') return bowmanPortrait;
	if (className == 'ruffian') return ruffianPortrait;
	if (className == 'thug') return thugPortrait;
	if (className == 'heavy') return heavyInfantryPortrait;
	if (className == 'mage') return magePortrait;
	if (className == 'cleric') return whiteMagePortrait;
	return peasantPortrait;
}

export function getPortrait(key: string): string {
	if (key == 'grunt') return gruntPortrait;
	if (key == 'lady') return ladyPortrait;
	if (key == 'general') return generalPortrait;
	return gruntPortrait;
}

export function getStatusImage(statusDataId:string): string {
    if(statusDataId == 'poisoned')return greenDrip
    if(statusDataId == 'rage')return rage
    if(statusDataId == 'hidden')return hidden
    if(statusDataId == 'blessed')return heal
    if(statusDataId == 'protected')return shield
    return hidden
};

export function heroSpriteFromClass(className: string): string {
	if (className == 'peasant') return peasant;
	if (className == 'thief') return thief;
	if (className == 'rogue') return rogue;
	if (className == 'ruffian') return ruffian;
	if (className == 'thug') return thug;
	if (className == 'woodsman') return woodsman;
	if (className == 'bowman') return bowman;
	if (className == 'mage') return mage;
	if (className == 'heavy') return heavyInfantry;
	if (className == 'cleric') return whiteMage;
	return peasant;
}

export const anySprites: Record<AnySprite, string> = {
	arrow: arrow,
	bomb: bomb,
	smoke: smoke,
	shield: shield,
	flame: flame,
	heal: heal,
	poison: greenDrip,
	skull: skull,
	castle: lighthouse,
	forest: forest,
	stoneDoor: stoneDoor,
	portal: portal,
	signpost: signpost,
	temple: temple,
	club: club,
	bag: bag,
	box: box,
	whiteRing: whiteRing,
	scarecrow: scarecrow,
	dagger: dagger,
	bow: bow,
	staff: staff,
	pendant: pendant,
	potion: potion,
	altar: altar,
	bombPadded: bombpad,
	armorStand: armor,
	general: general,
	spectre: spectre,
	druid: druid,
	lady: lady,
	necromancer: necromancer
};

export function getLandscape(key: LandscapeImage): string {
	if (key == 'plains') {
		return plainsLandscape;
	} else if (key == 'castle') {
		return castleLandscape;
	} else if (key == 'grimForest') {
		return grimForestLandscape;
	} else if (key == 'bridge') {
		return bridgeLandscape;
	}
	return plainsLandscape;
}

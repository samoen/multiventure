import rage from '$lib/assets/extras/rage.png';
import skull from '$lib/assets/extras/suppose_dead.png';
import hidden from '$lib/assets/extras/hidden.png';
import plainsLandscape from '$lib/assets/landscapes/landscape-plain.webp';
import castleLandscape from '$lib/assets/landscapes/landscape-castle.webp';
import grimForestLandscape from '$lib/assets/landscapes/grim-altar.jpg';
import bridgeLandscape from '$lib/assets/landscapes/landscape-bridge.webp';
import peasantPortrait from '$lib/assets/portraits/peasant.webp';
import generalPortrait from '$lib/assets/portraits/general.webp';
import ladyPortrait from '$lib/assets/portraits/lady.webp';
import thiefPortrait from '$lib/assets/portraits/thief.webp';
import thugPortrait from '$lib/assets/portraits/thug.webp';
import magePortrait from '$lib/assets/portraits/mage.webp';
import peasant from '$lib/assets/units/peasant.png';
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
import rogue from '$lib/assets/units/rogue.png';
import fireghost from '$lib/assets/units/fireghost.png';
import theif from '$lib/assets/units/thief.png';
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
import bombpad from '$lib/assets/scenery/bomb-pad.png';
import altar from '$lib/assets/scenery/altar.png';
import staff from '$lib/assets/scenery/staff-magic.png';
import whiteRing from '$lib/assets/scenery/ring-white.png';
import bag from '$lib/assets/scenery/leather-pack.png';
import scarecrow from '$lib/assets/scenery/scarecrow.png';
import dagger from '$lib/assets/scenery/dagger.png';
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
import type { EnemyTemplateId } from '$lib/server/enemies';
import type { ItemId } from '$lib/server/items';
import type { MiscPortrait, PlayerInClient } from '$lib/server/users';
import type { AnySprite, LandscapeImage, StatusId } from '$lib/utils';

export const enemySprites: Record<EnemyTemplateId, string> = {
    goblin: spearman,
    rat: rat,
    darter: spearman,
    hobGoblin: grunt,
    troll: troll,
    fireGremlin: fireghost
};

export function getSlotImage(id: ItemId): string {
    if (id == 'fist') return fistSlot;
    if (id == 'club') return clubSlot;
    if (id == 'dagger') return daggerSlot;
    if (id == 'fireStaff') return fireballSlot;
    if (id == 'bomb') return bombSlot;
    if (id == 'poisonDart') return poisonDartSlot;
    if (id == 'potion') return potionSlot;
    if (id == 'leatherArmor') return tunicSlot;
    if (id == 'theifCloak') return dressSlot;
    if (id == 'plateMail') return shieldSlot;
    if(id == 'wait')return waitSlot;
    if(id == 'succumb')return skullSlot;
    return blankSlot;
}

export function getHeroPortrait(pi: PlayerInClient): string {
    if (pi.inventory.some(i=>i.itemId=='dagger'))return thiefPortrait
    if (pi.inventory.some(i=>i.itemId=='fireStaff'))return magePortrait
    if (pi.inventory.some(i=>i.itemId=='club'))return thugPortrait
    // if (pi.inventory.weapon.itemId == 'dagger') {
    //     return peasantPortrait
    // }
    return peasantPortrait
}

export const enemyPortraits = {
    hobGoblin: gruntPortrait,
    rat: gruntPortrait,
    goblin: gruntPortrait,
    darter: gruntPortrait,
    fireGremlin: gruntPortrait,
    troll: gruntPortrait
} satisfies Record<EnemyTemplateId, string>;

export const miscPortraits = {
    peasant: peasantPortrait,
    general: generalPortrait,
    lady: ladyPortrait,
} satisfies Record<MiscPortrait, string>;

export const statusImages: Record<StatusId, string> = {
    poison: greenDrip,
    rage: rage,
    hidden: hidden,
};

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
    staff: staff,
    potion: potion,
    altar: altar,
    bombPadded: bombpad,
    armorStand: armor,
    general: general,
    spectre: spectre,
    druid: druid,
    lady: lady,
    necromancer: necromancer,
}

export const heroSprites = {
    peasant: peasant,
    rogue: rogue,
    theif: theif,
    ruffian: ruffian,
    mage: mage
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
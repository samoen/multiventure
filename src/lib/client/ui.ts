import type { HeroName } from "$lib/server/users";
import type { BattleAnimation, EnemyInClient, EnemyName, ExtraSprite, GameActionSentToClient, MessageFromServer, OtherPlayerInfo } from "$lib/utils";
import { derived, get, writable, type Writable } from "svelte/store";
import peasantPortrait from '$lib/assets/portraits/peasant.webp';
import peasant from '$lib/assets/peasant.png';
import gruntPortrait from '$lib/assets/portraits/grunt.webp';
import spearman from '$lib/assets/spearman.png';
import rat from '$lib/assets/giant-rat.png';
import grunt from '$lib/assets/grunt.png';
import troll from '$lib/assets/young-ogre.png';
import ruffian from '$lib/assets/ruffian.png';
import rogue from '$lib/assets/rogue.png';
import fireghost from '$lib/assets/fireghost.png';
import theif from '$lib/assets/thief.png';
import mage from '$lib/assets/mage.png';
import arrow from '$lib/assets/arrow.png';
import bomb from '$lib/assets/bomb.png';
import type { ItemId, ItemIdForSlot } from '$lib/server/items.js';
import { crossfade } from "svelte/transition";
import { expoInOut, linear, quadInOut, quintInOut, quintOut } from "svelte/easing";
import { tick } from "svelte";


// export let waitingForMyEvent = true;
// export let status = 'starting up';
type UnitDetails = {
    // unitName: HeroName | EnemyName
    // health: number
    // maxHealth: number
    portrait: string
    kind: 'enemy'
    enemy: EnemyInClient
} | {
    kind: 'otherPlayer',
    portrait: string
    other: OtherPlayerInfo
} | {
    kind: 'me', portrait: string,
    me: { myHealth: number, myName: HeroName }
};

export let clientState = writable({
    waitingForMyEvent: true,
    status: 'starting up',
})
export type VisualUnitProps = {
    name: string;
    src: string;
    hp: number;
    displayHp: number
    maxHp: number;
}

export const enemySprites = {
    goblin: spearman,
    rat: rat,
    hobGoblin: grunt,
    troll: troll,
    fireGremlin: fireghost
};

export type ProjectileProps ={
    projectileImg:string
}

export type Guest = VisualUnitProps | undefined
export type Projectile = undefined | ProjectileProps


export const lastMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export const previousMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export const selectedDetail: Writable<UnitDetails | undefined> = writable()
export const heroVisualUnitProps: Writable<VisualUnitProps|undefined> = writable()
export let enemiesVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
export let alliesVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
// export let pAnimations : Writable<{ba:BattleAnimation, sourceProps:VisualUnitProps, targetProps:VisualUnitProps}>
export let currentAnimationIndex: Writable<number> = writable(0)
// export let currentAnimation: Writable<BattleAnimation | undefined> = writable(undefined)
export let currentAnimation = derived([currentAnimationIndex],([$currentAnimationIndex])=>{
    return get(lastMsgFromServer)?.animations.at($currentAnimationIndex)
})
export const animationCancelled = writable(false)
export const subAnimationStage :Writable<'start'|'fire'|'sentHome'> = writable('start')

export const [sendMelee, receiveMelee] = crossfade({
    duration: (d) => Math.sqrt(d * 600),
    easing:quintInOut,
    fallback(node, params) {
        return {
            duration: 0,
        };
    }
});
export const [sendProj, receiveProj] = crossfade({
    duration: (d) => Math.sqrt(d * 400),
    easing:linear,
    fallback(node, params) {
        return {
            duration: 0,
        };
    }
});

// export let animationQueue: Writable<
// (
// BattleAnimation[]
// &{done:boolean})
// > = writable([])
export function syncVisualsToMsg(lastMsg: MessageFromServer) {
    // let lastMsg = get(lastMsgFromServer)
    if(!lastMsg){
        console.log('tried to sync with bad msg')
    }
    if (lastMsg) {
        heroVisualUnitProps.set(
            {
                name: lastMsg.yourName,
                src: heroSprites[heroSprite(lastMsg.yourWeapon?.itemId)],
                hp: lastMsg.yourHp,
                maxHp: lastMsg.yourMaxHp,
                displayHp: lastMsg.yourHp
            }
        )

        enemiesVisualUnitProps.set(lastMsg.enemiesInScene.map(e => {
            return {
                name: e.name,
                src: enemySprites[e.templateId],
                hp: e.health,
                displayHp: e.health,
                maxHp: e.maxHealth,
            }
        }))
        alliesVisualUnitProps.set(
            lastMsg.otherPlayers
                .filter(p => p.currentScene == lastMsg.yourScene)
                .map(p => {
                    return {
                        name: p.heroName,
                        src: heroSprites[heroSprite(p.weapon.itemId)],
                        hp: p.health,
                        displayHp: p.health,
                        maxHp: p.maxHealth,
                    }
                }))

                // console.log('synced visuals with allies '+JSON.stringify(get(alliesVisualUnitProps)))
    }
}

export const extraSprites : Record<ExtraSprite,string> = {
    arrow:arrow,
    bomb:bomb,
    flame:arrow,
}

export async function nextAnimationIndex(start:boolean){
    if(start){
        currentAnimationIndex.set(0)
        
    }else{
        currentAnimationIndex.update(o=>{
            return o+1
        })

    }
    
    let lm = get(lastMsgFromServer)
    let cai = get(currentAnimationIndex)
    if(!lm)return
    if(cai > lm.animations.length - 1){
        console.log('animations done, sync to recent')
        syncVisualsToMsg(lm)
        return
    }

    subAnimationStage.set('start')
    console.log('tick')
    await tick()


    
    // $currentAnimationIndex = 0;
		// $currentAnimation = latest.animations.at($currentAnimationIndex);
		// await tick();
		// if (get(currentAnimation)) {
            console.log('firing substage')
            subAnimationStage.set('fire')
		// }else{
            // subAnimationStage.set('start')
            // let lm = get(lastMsgFromServer)
            // if(lm){
                
                // console.log('animations done, sync to recent')
                // syncVisualsToMsg(lm)
            // }
		// }
    // currentAnimation.set()
}

lastMsgFromServer.subscribe((l) => {
    if (l) {
        selectedDetail.update(u => {
            if (u == null) {
                return {
                    portrait: peasantPortrait,
                    me: {
                        myName: l.yourName,
                        myHealth: l.yourHp,
                    },
                    // maxHealth : l.yourMaxHp,
                    kind: 'me',
                }
            }
            return u
        })
    }
})

export function heroSprite(weapon: ItemIdForSlot<'weapon'>) {
    if (weapon == 'club') return 'ruffian';
    if (weapon == 'dagger') return 'theif';
    if (weapon == 'fireStaff') return 'mage';
    return 'peasant';
}
export const heroSprites = {
    peasant: peasant,
    rogue: rogue,
    theif: theif,
    ruffian: ruffian,
    mage: mage
};
export async function choose(chosen: GameActionSentToClient) {
    clientState.update((s) => {
        s.waitingForMyEvent = true;
        s.status = 'submitting action';
        return s
    })
    let f = await fetch('/api/action', {
        method: 'POST',
        body: JSON.stringify({ buttonText: chosen.buttonText })
    });

    if (f.status > 399) {
        // let res = await f.json();
        console.log('action submit failed');
        clientState.update((s) => {

            s.waitingForMyEvent = false;
            s.status = 'playing';
            return s
        })
        return;
    }
    clientState.update(s => {
        s.status = 'waiting for my event';
        return s
    })
}
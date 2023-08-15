import type { HeroName } from "$lib/server/users";
import type { BattleAnimation, EnemyInClient, EnemyName, GameActionSentToClient, MessageFromServer, OtherPlayerInfo } from "$lib/utils";
import { get, writable, type Writable } from "svelte/store";
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
	import type { ItemId, ItemIdForSlot } from '$lib/server/items.js';


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
    name:string;
    src:string;
    hp:number;
    displayHp:number
    maxHp:number;
}
        
	export const enemySprites = {
		goblin: spearman,
		rat: rat,
		hobGoblin: grunt,
		troll: troll,
		fireGremlin: fireghost
	};
        
        export const lastMsgFromServer: Writable<MessageFromServer | null> = writable(null);
        export const previousMsgFromServer: Writable<MessageFromServer | null> = writable(null);
        export const selectedDetail: Writable<UnitDetails | null> = writable(null)
        export const heroVisualUnitProps: Writable<VisualUnitProps> = writable()
        export let enemiesVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
        export let actingEnemyVUP : Writable<VisualUnitProps | undefined> = writable()
        export let currentAnimation : Writable<BattleAnimation|undefined> = writable(undefined)
        export let currentAnimationIndex : Writable<number> = writable(0)

        // export function findVisualUnitProps(name:string):VisualUnitProps | undefined{
        //     if(name == 'werdd' ){
        //         return get(heroVisualUnitProps)
        //     }
        //     let en = get(enemiesVisualUnitProps).find(e=>name==e.name)
        //     if(en) return en
        // }

    // enemiesVisualUnitProps.subscribe(enemies=>{
    //     let e = enemies.at(0)
    //     if(e){
    //         actingEnemyVUP.update(olde=>{
    //             if(e){
    //                 console.log('upding acting')
    //                 return {
    //                     name: e.name,
    //                     src: e.src,
    //                     hp: e.hp,
    //                     maxHp: e.maxHp,
    //                     flip: true,
    //                     animating:false as boolean,
    //                 }
    //             }
    //             return olde
    //         })

    //     }

    // })



    // previousMsgFromServer.subscribe((l) => {
        // if (l) {
        //     enemiesVisualUnitProps.update(_=>{
        //         return l.enemiesInScene.map(e=>{
        //             return {
        //                 name: e.name,
        //                 src: enemySprites[e.templateId],
        //                 hp: e.health,
        //                 maxHp: e.maxHealth,
        //                 flip: true,
        //                 animating:false as boolean,
        //             }
        //         })  
        //     })
        //     heroVisualUnitProps.update(_=>{
        //         return {
        //             name: l.yourName,
        //             src: heroSprites[heroSprite(l.yourWeapon?.itemId)],
        //             hp: l.yourHp,
        //             maxHp: l.yourMaxHp,
        //             flip: false,
        //             animating:false as boolean,
        //         }
        //     })
        // }
    // })
    lastMsgFromServer.subscribe((l) => {
        if (l) {
            // enemiesVisualUnitProps.update(previous=>{
            //     return l.enemiesInScene.map(e=>{
            //         let findInPrevious = previous.find(pe=>{pe.name == e.name})

            //         return {
            //             name: e.name,
            //             src: enemySprites[e.templateId],
            //             hp: e.health,
            //             displayHp:findInPrevious?.hp ?? 0,    
            //             maxHp: e.maxHealth,
            //             flip: true,
            //             animating:false as boolean,
            //         }
            //     })  
            // })
            // heroVisualUnitProps.update(previous=>{
            //     return {
            //         name: l.yourName,
            //         src: heroSprites[heroSprite(l.yourWeapon?.itemId)],
            //         hp: l.yourHp,
            //         maxHp: l.yourMaxHp,
            //         displayHp:previous?.hp??0,
            //     }
            // })
            selectedDetail.update(u => {
                if (u == null) {
                    return {
                        portrait:peasantPortrait,
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
import type { HeroName, MiscPortrait, PlayerInClient } from "$lib/server/users";
import type { UnitId, BattleAnimation, EnemyInClient, EnemyName, GameActionSentToClient, AnySprite } from "$lib/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import peasantPortrait from '$lib/assets/portraits/peasant.webp';
import generalPortrait from '$lib/assets/portraits/general.webp';
import peasant from '$lib/assets/units/peasant.png';
import general from '$lib/assets/units/general.png';
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
import shield from '$lib/assets/extras/shield.png';
import smoke from '$lib/assets/extras/smoke.png';
import flame from '$lib/assets/extras/flame.png';
import heal from '$lib/assets/extras/heal.png';
import lighthouse from '$lib/assets/scenery/lighthouse.png';
import clubSlot from '$lib/assets/equipment/club-small.png';
import club from '$lib/assets/extras/club.png';
import type { EquipmentSlot, Inventory, ItemId, ItemIdForSlot, ItemState, ItemStateForSlot } from '$lib/server/items';
import { crossfade } from "svelte/transition";
import { expoInOut, linear, quadInOut, quintInOut, quintOut } from "svelte/easing";
import { tick } from "svelte";
import type { EnemyTemplateId } from "$lib/server/enemies";
import type { MessageFromServer } from "$lib/server/messaging";
import type { ConversationResponse, UnlockableAction, UnlockableClientAction, VisualActionSource, VisualActionSourceInClient } from "$lib/server/scenes";


type UnitDetails = {
    portrait: string
    kind: 'enemy'
    enemy: EnemyInClient
} | {
    kind: 'player',
    portrait: string
    info: PlayerInClient
}

export let clientState = writable({
    waitingForMyEvent: true,
    status: 'starting up',
})
export let waitingForMyAnimation = writable(false)

export type VisualUnitProps = {
    id: UnitId;
    name: string;
    src: string;
    displayHp: number;
    maxHp: number;
    aggro?: number;
    side: 'hero' | 'enemy'
    actual: UnitDetails;
    actionsThatCanTargetMe: GameActionSentToClient[]
}

export const enemySprites : Record<EnemyTemplateId,string> = {
    goblin: spearman,
    rat: rat,
    darter:spearman,
    hobGoblin: grunt,
    troll: troll,
    fireGremlin: fireghost
};

export type ProjectileProps = {
    projectileImg: string
}

export type Guest = VisualUnitProps | undefined
export type Projectile = undefined | ProjectileProps


export const lastMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export const previousMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export let allVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
export let visualActionSources: Writable<VisualActionSourceInClient[]> = writable([])

export const currentAnimationIndex: Writable<number> = writable(999)

export function numberShownOnSlot(itemState: ItemState):number|undefined{
    // if(!$lastMsgFromServer)return undefined
    const higherOfCooldownOrWarmup = Math.max(itemState.cooldown, itemState.warmup)
    if(higherOfCooldownOrWarmup > 0) return higherOfCooldownOrWarmup
    return undefined
}

export function stockDotsOnSlotButton(itemState: ItemState):string{
    let dots = ''
    if(itemState.stock != undefined){
        for (const _ of Array.from({length:itemState.stock})){
            dots=dots+'.'
        }
    }
    return dots
}

export const currentAnimationsWithData: Writable<BattleAnimation[]> = writable([])

export let currentAnimation = derived([currentAnimationIndex, currentAnimationsWithData], ([$currentAnimationIndex, $currentAnimationsWithData]) => {
    return $currentAnimationsWithData?.at($currentAnimationIndex)
})

export const animationCancelled = writable(false)
export const subAnimationStage: Writable<'start' | 'fire' | 'sentHome'> = writable('start')

export function actionsForSlot(lm:MessageFromServer|undefined,equipmentSlot:EquipmentSlot): GameActionSentToClient[] {
    if(!lm)return []
    return lm?.itemActions.filter(ia => ia.slot == equipmentSlot)
}
export let typedInventory = derived(lastMsgFromServer, ($lastMsgFromServer) => {
    let map = new Map<EquipmentSlot,ItemState>()
    if(!$lastMsgFromServer){
        return map
    }
    for(const [key,value] of Object.entries($lastMsgFromServer.yourInfo.inventory)){
        let tKey = key as EquipmentSlot
        map.set(tKey,value)
    }
    return map
})
export let wepSlotActions = derived(lastMsgFromServer, ($lastMsgFromServer) => {
    return $lastMsgFromServer?.itemActions.filter(ia => ia.slot == 'weapon')
})

export let utilitySlotActions = derived(lastMsgFromServer, ($lastMsgFromServer) => {
    return $lastMsgFromServer?.itemActions.filter(ia => ia.slot == 'utility')
})
export let bodySlotActions = derived(lastMsgFromServer, ($lastMsgFromServer) => {
    return $lastMsgFromServer?.itemActions.filter(ia => ia.slot == 'body')
})
export let waitButtonAction = derived(lastMsgFromServer, ($lastMsgFromServer) => {
    return $lastMsgFromServer?.itemActions.find(ia => ia.wait)
})

// export const lastUnitClicked: Writable<VisualUnitProps | undefined> = writable()
export const lastUnitClicked: Writable<UnitId | undefined> = writable()

export const selectedDetail = derived([
    lastUnitClicked,
    allVisualUnitProps,
], ([$lastUnitClicked,
     $allVisualUnitProps,
]) => {

    let props = $allVisualUnitProps
    let vupAt = props.find(v=>v.id == $lastUnitClicked)
    if(vupAt)return vupAt
    return $allVisualUnitProps.at(0)
})
export const selectedVisualActionSource = derived([
    lastUnitClicked,
    visualActionSources,
], ([$lastUnitClicked,
     $visualActionSources,
]) => {

    let vasAt = $visualActionSources.find(v=>v.id==$lastUnitClicked)
    if(vasAt)return vasAt
    return undefined
})

// a collection of the responsetexts you've clicked and also the ulockable button texts youve clicked
export const convoBeenSaid : Writable<Set<string>> = writable(new Set())
export const currentConvoPrompt : Writable<string | undefined> = writable(undefined)

export type ConvoState = {
    currentRetort:string
    maybeLockedResponses: (ConversationResponse)[]
    maybeLockedActions: (UnlockableClientAction)[]
}

export const convoStateForEachVAS : Writable<Map<UnitId,ConvoState>> = writable(new Map())
export const selectedVisualActionSourceState = derived([
    lastUnitClicked,
    visualActionSources,
    convoStateForEachVAS,

], ([$lastUnitClicked,
     $visualActionSources,
     $convoStateForEachVAS,
]) => {
    if(!$lastUnitClicked)return undefined
    let state = $convoStateForEachVAS.get($lastUnitClicked)
    if(!state){
        return undefined
    }
    return state
})

// export const unlockableActions = derived([convoBeenSaid,selectedVisualActionSource],([$convoBeenSaid, $selectedVisualActionSource])=>{

    // let unlocked = []
    // let locked = []

    // // see if we've said something that locks an unlockable action
    // for(const u of $convoBeenSaid){
    //     let lockKey = $selectedVisualActionSource?.conversation?.responses.find(r=>r.responseText == u)?.lock
    //     locked.push(lockKey)
    // }

    // // find unlockable actions where we have said the thing that unlocks it but haven't said the thing that locks it
    // for(const u of $convoBeenSaid){
    //     let unlockKey = $selectedVisualActionSource?.conversation?.responses.find(r=>r.responseText == u)?.unlock
    //     if(unlockKey && !locked.includes(unlockKey)){
    //         console.log('unlocking ' + unlockKey)
    //         let a = $selectedVisualActionSource?.unlockablesInClient[unlockKey]
            
    //         if(a && !$convoBeenSaid.has(a.buttonText)){
    //             unlocked.push(a)
    //         }

    //     }
    // }
    // return unlocked
// })



export let latestSlotButtonInput: Writable<EquipmentSlot | 'none'> = writable('none')

export const [sendMelee, receiveMelee] = crossfade({
    duration: (d) => Math.sqrt(d * 900),
    easing: quintInOut,
    fallback(node, params) {
        return {
            duration: 0,
        };
    }
});
export const [sendProj, receiveProj] = crossfade({
    duration: 600,
    easing: linear,
    fallback(node, params) {
        return {
            duration: 0,
        };
    }
});
export const [sendCenter, receiveCenter] = crossfade({
    duration: (d) => Math.sqrt(d * 1900),
    easing: quintOut,
    fallback(node, params) {
        return {
            duration: 0,
        };
    }
});


let enemyPortraits = {
    hobGoblin: gruntPortrait,
    rat: gruntPortrait,
    goblin: gruntPortrait,
    darter: gruntPortrait,
    fireGremlin: gruntPortrait,
    troll: gruntPortrait
} satisfies Record<EnemyTemplateId, string>;

export const miscPortraits = {
    peasant:peasantPortrait,
    general:generalPortrait,
} satisfies Record<MiscPortrait, string>;

export function updateUnit(index: UnitId, run: (vup: VisualUnitProps) => void) {
    allVisualUnitProps.update((old)=>{
            return old.map((p, j) => {
                if (index == p.id) {
                    run(p);
                }
                return p;
            });

    })
}

export function syncVisualsToMsg(lastMsg: MessageFromServer | undefined) {
    if (!lastMsg) {
        console.log('tried to sync with bad msg')
    }
    if (lastMsg) {
        let newVups: VisualUnitProps[] = []
        // console.log(`syncing hero with poison ${lastMsg.yourInfo.statuses.poison}`)
        newVups.push({
            id:`hero${lastMsg.yourInfo.heroName}`,
            name: lastMsg.yourInfo.heroName,
            src: heroSprites[heroSprite(lastMsg.yourInfo.inventory.weapon?.itemId)],
            maxHp: lastMsg.yourInfo.maxHealth,
            displayHp: lastMsg.yourInfo.health,
            side: 'hero',
            actual: {
                kind: 'player',
                portrait: peasantPortrait,
                info:lastMsg.yourInfo,
            },
            actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target == lastMsg.yourInfo.unitId)
        } satisfies VisualUnitProps
        )

        for (const e of lastMsg.enemiesInScene) {
            newVups.push(
                {
                    id:`enemy${e.name}`,
                    name: e.name,
                    src: enemySprites[e.templateId],
                    displayHp: e.health,
                    maxHp: e.maxHealth,
                    aggro: e.myAggro,
                    side: 'enemy',
                    actual: {
                        kind: 'enemy',
                        portrait: enemyPortraits[e.templateId],
                        enemy: e
                    },
                    actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target == e.unitId)
                } satisfies VisualUnitProps
                )
            }
            for (const p of lastMsg.otherPlayers) {
                if (p.currentScene == lastMsg.yourInfo.currentScene) {
                    newVups.push(
                        {
                        id:`hero${p.heroName}`,
                        name: p.heroName,
                        src: heroSprites[heroSprite(p.inventory.weapon.itemId)],
                        displayHp: p.health,
                        maxHp: p.maxHealth,
                        side: 'hero',
                        actual: {
                            kind: 'player',
                            portrait: peasantPortrait,
                            info: p,
                        },
                        actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target == p.unitId)
                    }
                )
            }

        }
        allVisualUnitProps.set(newVups)
        // console.log(`${JSON.stringify(lastMsg.visualActionSources.map(v=>v.id))}`)
        visualActionSources.set(lastMsg.visualActionSources)
        for (const vas of lastMsg.visualActionSources){
            convoStateForEachVAS.update(cs=>{
                if(!cs.get(vas.id)){
                    cs.set(vas.id,{
                        currentRetort:vas.conversation.startText,
                        maybeLockedActions:vas.unlockables,
                        maybeLockedResponses:vas.conversation.responses
                    })
                }
                return cs
            })
        }
    }
}


export const anySprites : Record<AnySprite,string> ={
    arrow: arrow,
    bomb: bomb,
    smoke: smoke,
    shield: shield,
    flame: flame,
    heal:heal,
    poison: greenDrip,
    castle:lighthouse,
    general:general,
    club:club,
    clubSlot:clubSlot,
}

export function handlePutsStatuses(anim: BattleAnimation) {
    if (anim.putsStatuses) {
        for(const ps of anim.putsStatuses){
            updateUnit(ps.target,(vup)=>{
                if(ps.remove){
                    if (vup.actual.kind == 'enemy') {
                        // remove enemy status for all sources
                        for(const sourceId in vup.actual.enemy.statuses){
                            const tSourceId = sourceId as UnitId
                            vup.actual.enemy.statuses[tSourceId][ps.status] = 0
                        }
                    } else if (vup.actual.kind == 'player') {
                        vup.actual.info.statuses[ps.status] = 0;
                    }
                }else{
                    if(ps.count){
                        if (vup.actual.kind == 'enemy') {
                            let existingStatusesForSource = vup.actual.enemy.statuses[anim.source];
                            console.log(vup.actual.enemy.statuses)
                            if (!existingStatusesForSource) {
                                console.log('adding statuses for ' + anim.source)
                                vup.actual.enemy.statuses[anim.source] = { poison: 0, rage: 0, hidden:0 };
                            }
                            vup.actual.enemy.statuses[anim.source][ps.status] = ps.count;
                        } else if (vup.actual.kind == 'player') {
                            vup.actual.info.statuses[ps.status] = ps.count;
                        }

                    }
                }
            })
        }
    }
}

export const centerFieldTarget = derived(
    [currentAnimation, subAnimationStage],
    ([$currentAnimation, $subAnimationStage]) => {
        if (!$currentAnimation) return undefined;
        if (
            $currentAnimation.behavior.kind == 'center' &&
            $subAnimationStage == 'fire'
        ) {
            return { projectileImg: anySprites[$currentAnimation.behavior.extraSprite] };
        }
        return undefined;
    }
);
export type AnimsInWaiting = {prev: MessageFromServer, withAnims:MessageFromServer}
export const animationsInWaiting : Writable<AnimsInWaiting|undefined> = writable()

export async function nextAnimationIndex(
    start: boolean, curAnimIndex:number, 
    curAnimations:BattleAnimation[], 
    latest:MessageFromServer|undefined, 
    someoneDied:boolean,
    cancel:boolean,
    animsInWaiting:AnimsInWaiting|undefined,
    ) {
    let cai = 0
    if (start) {
        currentAnimationIndex.set(0)
    } else {
        currentAnimationIndex.update(o => {
            return o + 1
        })
        cai = curAnimIndex+1
    }
    
    if (cai > curAnimations.length - 1) {
        if(!animsInWaiting){
            // give some time for enemies slain on the last animation to fade out.
            if(someoneDied){
                await new Promise(r=>setTimeout(r,500))
            }
            waitingForMyAnimation.set(false)
            syncVisualsToMsg(latest)
            return
        }
        if(animsInWaiting){
            console.log('playing anims in waiting')
            syncVisualsToMsg(animsInWaiting.prev)
            currentAnimationsWithData.set(animsInWaiting.withAnims.animations)
            animationsInWaiting.set(undefined)
            currentAnimationIndex.set(0)
            subAnimationStage.set('start')
            await tick()
            subAnimationStage.set('fire')
        }

        return
    }



    
    subAnimationStage.set('start')

    // let the projectiles render at start position
    await tick()

    subAnimationStage.set('fire')
}


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
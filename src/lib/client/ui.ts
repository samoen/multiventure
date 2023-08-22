import type { HeroName, PlayerInClient } from "$lib/server/users";
import type { UnitId, BattleAnimation, EnemyInClient, EnemyName, ExtraSprite, GameActionSentToClient } from "$lib/utils";
import { derived, get, writable, type Writable } from "svelte/store";
import peasantPortrait from '$lib/assets/portraits/peasant.webp';
import peasant from '$lib/assets/peasant.png';
import gruntPortrait from '$lib/assets/portraits/grunt.webp';
import spearman from '$lib/assets/spearman.png';
import rat from '$lib/assets/giant-rat.png';
import grunt from '$lib/assets/grunt.png';
import troll from '$lib/assets/young-ogre.png';
import greenDrip from '$lib/assets/green-drip.png';
import ruffian from '$lib/assets/ruffian.png';
import rogue from '$lib/assets/rogue.png';
import fireghost from '$lib/assets/fireghost.png';
import theif from '$lib/assets/thief.png';
import mage from '$lib/assets/mage.png';
import arrow from '$lib/assets/arrow.png';
import bomb from '$lib/assets/bomb.png';
import type { EquipmentSlot, ItemId, ItemIdForSlot, ItemState, ItemStateForSlot } from '$lib/server/items';
import { crossfade } from "svelte/transition";
import { expoInOut, linear, quadInOut, quintInOut, quintOut } from "svelte/easing";
import { tick } from "svelte";
import type { EnemyTemplateId } from "$lib/server/enemies";
import type { MessageFromServer } from "$lib/server/messaging";


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
    displayHp: number
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

export const currentAnimationIndex: Writable<number> = writable(0)

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

export const currentAnimationsWithData: Writable<BattleAnimation[]> = writable()

export let currentAnimation = derived([currentAnimationIndex, currentAnimationsWithData], ([$currentAnimationIndex, $currentAnimationsWithData]) => {
    return $currentAnimationsWithData?.at($currentAnimationIndex)
})

export const animationCancelled = writable(false)
export const subAnimationStage: Writable<'start' | 'fire' | 'sentHome'> = writable('start')


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
export const lastUnitClicked: Writable<string> = writable()

export const selectedDetail = derived([lastUnitClicked
    , allVisualUnitProps
], ([$lastUnitClicked
    , $allVisualUnitProps
]) => {

    let props = $allVisualUnitProps

    let vupAt = props.find(v=>v.id == $lastUnitClicked)
    if (!vupAt) {
        return $allVisualUnitProps.at(0)
    }
    return vupAt
})

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
    }
}

export const extraSprites: Record<ExtraSprite, string> = {
    arrow: arrow,
    bomb: bomb,
    smoke: bomb,
    shield: bomb,
    flame: arrow,
    poison: greenDrip,
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
                    if (vup.actual.kind == 'enemy') {
                        let existingStatusesForSource = vup.actual.enemy.statuses[anim.source];
                        if (!existingStatusesForSource) {
                            vup.actual.enemy.statuses[anim.source] = { poison: 0, rage: 0, hidden:0 };
                        }
                        vup.actual.enemy.statuses[anim.source][ps.status] = 1;
                    } else if (vup.actual.kind == 'player') {
                        vup.actual.info.statuses[ps.status] = 1;
                    }
                }
            })
        }
    }
}

export const centerFieldTarget = derived(
    [currentAnimation, subAnimationStage],
    ([$currentAnimation, $subAnimationStage]) => {
        if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
        // console.log(`calc target proj ${stableHost.name}`)
        if (
            $currentAnimation.behavior == 'center' &&
            $subAnimationStage == 'fire'
        ) {
            return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
        }
        return undefined;
    }
);
export async function nextAnimationIndex(start: boolean, curAnimIndex:number, curAnimations:BattleAnimation[], latest:MessageFromServer|undefined, someoneDied:boolean) {
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
        // give some time for enemies slain on the last animation to fade out. 
        if(someoneDied){
            await new Promise(r=>setTimeout(r,500))
        }
        // console.log('animations done, sync to recent')
        waitingForMyAnimation.set(false)
        syncVisualsToMsg(latest)
        return
    }



    
    subAnimationStage.set('start')
    // console.log('tick')
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
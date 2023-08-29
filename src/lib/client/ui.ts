import type { Flag, HeroName, MiscPortrait, PlayerInClient } from "$lib/server/users";
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
import armor from '$lib/assets/scenery/armor.png';
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
    waitingForMyEvent: false,
    status: 'starting up',
    loading: false,
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

export const enemySprites: Record<EnemyTemplateId, string> = {
    goblin: spearman,
    rat: rat,
    darter: spearman,
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
export const allVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
export const visualActionSources: Writable<VisualActionSourceInClient[]> = writable([])
export const currentAnimationIndex: Writable<number> = writable(999)
export const currentAnimationsWithData: Writable<BattleAnimation[]> = writable([])
export const subAnimationStage: Writable<'start' | 'fire' | 'sentHome'> = writable('start')
export const lockedHandles: Writable<Map<string, boolean>> = writable(new Map())
export const convoStateForEachVAS: Writable<Map<UnitId, ConvoState>> = writable(new Map())
export const latestSlotButtonInput: Writable<EquipmentSlot | 'none'> = writable('none')
export const lastUnitClicked: Writable<UnitId | undefined> = writable()


export function numberShownOnSlot(itemState: ItemState): number | undefined {
    // if(!$lastMsgFromServer)return undefined
    const higherOfCooldownOrWarmup = Math.max(itemState.cooldown, itemState.warmup)
    if (higherOfCooldownOrWarmup > 0) return higherOfCooldownOrWarmup
    return undefined
}

export function stockDotsOnSlotButton(itemState: ItemState): string {
    let dots = ''
    if (itemState.stock != undefined) {
        for (const _ of Array.from({ length: itemState.stock })) {
            dots = dots + '.'
        }
    }
    return dots
}


export let currentAnimation = derived([currentAnimationIndex, currentAnimationsWithData], ([$currentAnimationIndex, $currentAnimationsWithData]) => {
    return $currentAnimationsWithData?.at($currentAnimationIndex)
})

// export const animationCancelled = writable(false)

export function actionsForSlot(lm: MessageFromServer | undefined, equipmentSlot: EquipmentSlot): GameActionSentToClient[] {
    if (!lm) return []
    return lm?.itemActions.filter(ia => ia.slot == equipmentSlot)
}
export let typedInventory = derived(lastMsgFromServer, ($lastMsgFromServer) => {
    let map = new Map<EquipmentSlot, ItemState>()
    if (!$lastMsgFromServer) {
        return map
    }
    for (const [key, value] of Object.entries($lastMsgFromServer.yourInfo.inventory)) {
        let tKey = key as EquipmentSlot
        map.set(tKey, value)
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
export let slotlessBattleActions = derived(lastMsgFromServer, ($lastMsgFromServer) => {
    return $lastMsgFromServer?.itemActions.filter(ia => ia.slot == undefined) ?? []
})


export type DetailWindow = { kind: 'vup', entity: VisualUnitProps } | { kind: 'vas', entity: VisualActionSourceInClient }


export const selectedDetail: Readable<DetailWindow | undefined> = derived([
    lastUnitClicked,
    allVisualUnitProps,
    visualActionSources,
    lockedHandles,
], ([$lastUnitClicked,
    $allVisualUnitProps,
    $visualActionSources,
    $lockedHandles,
]) => {

    if (!$lastUnitClicked) {
        let firstVas = undefined
        // find unlocked vas with an unlocked action or response
        outer: for (const vas of $visualActionSources) {
            if ($lockedHandles.get(vas.id) == true) continue
            for (const act of vas.actionsInClient) {
                if (!act.lockHandle || $lockedHandles.get(act.lockHandle) == false) {
                    firstVas = vas
                    break outer
                }
            }
            for (const r of vas.responses) {
                if (!r.lockHandle || $lockedHandles.get(r.lockHandle) == false) {
                    firstVas = vas
                    break outer
                }
            }
        }
        if (firstVas) return { kind: 'vas', entity: firstVas } satisfies DetailWindow
        
        let me = $allVisualUnitProps.at(0)
        if (me) return { kind: 'vup', entity: me } satisfies DetailWindow
    }
    
    let vupAt = $allVisualUnitProps.find(v => v.id == $lastUnitClicked)
    if (vupAt) return { kind: 'vup', entity: vupAt } satisfies DetailWindow
    
    let vasAt = $visualActionSources.find(v => v.id == $lastUnitClicked)
    if (vasAt) return { kind: 'vas', entity: vasAt } satisfies DetailWindow
    
    let me = $allVisualUnitProps.at(0)
    if (me) return { kind: 'vup', entity: me } satisfies DetailWindow
    
    return undefined
})


export type ConvoState = {
    currentRetort: string,
    detectStep?:Flag,
}


export const selectedVisualActionSourceState = derived([
    // lastUnitClicked,
    // selectedVisualActionSource,
    selectedDetail,
    visualActionSources,
    convoStateForEachVAS,

], ([
    // $lastUnitClicked,
    // $selectedVisualActionSource,
    $selectedDetail,
    $visualActionSources,
    $convoStateForEachVAS,
]) => {
    if (!$selectedDetail || $selectedDetail.kind != 'vas') return undefined
    let state = $convoStateForEachVAS.get($selectedDetail.entity.id)
    if (!state) {
        return undefined
    }
    return state
})

export const [sendMelee, receiveMelee] = crossfade({
    duration: (d) => 500,
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
    peasant: peasantPortrait,
    general: generalPortrait,
} satisfies Record<MiscPortrait, string>;

export function updateUnit(index: UnitId, run: (vup: VisualUnitProps) => void) {
    allVisualUnitProps.update((old) => {
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
            id: lastMsg.yourInfo.unitId,
            name: lastMsg.yourInfo.heroName,
            src: heroSprites[heroSprite(lastMsg.yourInfo.inventory.weapon?.itemId)],
            maxHp: lastMsg.yourInfo.maxHealth,
            displayHp: lastMsg.yourInfo.health,
            side: 'hero',
            actual: {
                kind: 'player',
                portrait: peasantPortrait,
                info: lastMsg.yourInfo,
            },
            actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target == lastMsg.yourInfo.unitId)
        } satisfies VisualUnitProps
        )

        for (const e of lastMsg.enemiesInScene) {
            newVups.push(
                {
                    id: e.unitId,
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
                        id: p.unitId,
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
        for (const vas of lastMsg.visualActionSources) {
            convoStateForEachVAS.update(cs => {
                let existing = cs.get(vas.id)

                // if we can't find this vas in the state, initialize it
                // also reset it if it's a new conversation
                if (!existing || existing.detectStep != vas.detectStep) {
                    // console.log(`init vas state ${vas.id} with unlockable`)
                    cs.set(vas.id, {
                        currentRetort: vas.startText,
                        detectStep:vas.detectStep
                    })
                }
                return cs
            })
            lockedHandles.update((lh) => {
                // console.log(`new msg, current lockhandles: ${[...lh.entries()]}`)
                let existing = lh.get(vas.id)
                if (existing == undefined) {
                    if (vas.startsLocked) {
                        lh.set(vas.id, true)
                    } else {
                        lh.set(vas.id, false)
                    }
                }
                for (const uAct of vas.actionsInClient) {
                    if (uAct.lockHandle) {
                        let existing = lh.get(uAct.lockHandle)
                        if (existing == undefined) {
                            if (uAct.startsLocked) {
                                lh.set(uAct.lockHandle, true)
                            } else {
                                lh.set(uAct.lockHandle, false)
                            }
                        }

                    }
                }
                for (const resp of vas.responses) {
                    if (resp.lockHandle) {
                        let existing = lh.get(resp.lockHandle)
                        if (existing == undefined) {
                            if (resp.startsLocked) {
                                lh.set(resp.lockHandle, true)
                            } else {
                                lh.set(resp.lockHandle, false)
                            }
                        }
                    }
                }
                return lh
            })

        }
        visualActionSources.set(lastMsg.visualActionSources)
    }
}


export const anySprites: Record<AnySprite, string> = {
    arrow: arrow,
    bomb: bomb,
    smoke: smoke,
    shield: shield,
    flame: flame,
    heal: heal,
    poison: greenDrip,
    castle: lighthouse,
    general: general,
    club: club,
    clubSlot: clubSlot,
    armorStand: armor,
}

export function handlePutsStatuses(anim: BattleAnimation) {
    if (anim.putsStatuses) {
        for (const ps of anim.putsStatuses) {
            updateUnit(ps.target, (vup) => {
                if (ps.remove) {
                    if (vup.actual.kind == 'enemy') {
                        // remove enemy status for all sources
                        for (const sourceId in vup.actual.enemy.statuses) {
                            const tSourceId = sourceId as UnitId
                            vup.actual.enemy.statuses[tSourceId][ps.status] = 0
                        }
                    } else if (vup.actual.kind == 'player') {
                        vup.actual.info.statuses[ps.status] = 0;
                    }
                } else {
                    if (ps.count) {
                        if (vup.actual.kind == 'enemy') {
                            let existingStatusesForSource = vup.actual.enemy.statuses[anim.source];
                            console.log(vup.actual.enemy.statuses)
                            if (!existingStatusesForSource) {
                                console.log('adding statuses for ' + anim.source)
                                vup.actual.enemy.statuses[anim.source] = { poison: 0, rage: 0, hidden: 0 };
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
export type AnimsInWaiting = { prev: MessageFromServer, withAnims: MessageFromServer }
export const animationsInWaiting: Writable<AnimsInWaiting | undefined> = writable()

export async function nextAnimationIndex(
    start: boolean,
    someoneDied: boolean,
) {
    let curAnimations = get(currentAnimationsWithData)
    let latest = get(lastMsgFromServer)
    let animsInWaiting = get(animationsInWaiting)
    if (start) {
        currentAnimationIndex.set(0)
    } else {
        currentAnimationIndex.update(o => {
            return o + 1
        })
        // cai = curAnimIndex + 1
    }
    let cai = get(currentAnimationIndex)

    if (cai > curAnimations.length - 1) {
        if (!animsInWaiting) {
            // give some time for enemies slain on the last animation to fade out.
            if (someoneDied) {
                await new Promise(r => setTimeout(r, 500))
            }
            waitingForMyAnimation.set(false)
            syncVisualsToMsg(latest)
            return
        }
        if (animsInWaiting) {
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

export async function choose(chosen: GameActionSentToClient): Promise<MessageFromServer | undefined> {
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
        console.log('action submit failed');
        clientState.update((s) => {

            s.waitingForMyEvent = false;
            s.status = 'playing';
            return s
        })
        return undefined;
    }
    let res = await f.json();
    if (!isMsgFromServer(res)) {
        console.log('sent action but response not mgsfromserver')
        return undefined
    }

    worldReceived(res)

    clientState.update(cs => {
        cs.status = 'playing'
        cs.waitingForMyEvent = false
        cs.loading = false;
        return cs
    })

    return res
}

function isMsgFromServer(msg: object): msg is MessageFromServer {
    return 'triggeredBy' in msg;
}

function handleAnimationsOnMessage(
    previous: MessageFromServer | undefined,
    latest: MessageFromServer,

) {
    const currentAnim = get(currentAnimation)
    // console.log(`got animations: ${JSON.stringify(latest.animations)}`);

    // first message just sync instant
    if (!previous) {
        console.log('first message, just sync it');
        if (currentAnim) {
            throw Error('first message but animating already, should be impossible')
            // await cancelAnimations();
        }
        syncVisualsToMsg(latest);
        return;
    }

    if (latest.animations.length && latest.triggeredBy == latest.yourInfo.heroName) {
        console.log('start waiting my anim');
        waitingForMyAnimation.set(true);
    }

    // my message with no animations
    if (latest.triggeredBy == latest.yourInfo.heroName && !latest.animations.length && currentAnim != undefined) {
        console.log('my message with no animations, but we are animating. Ignore, it will be synced when current anims finish');
        // if ($currentAnimation) {
        // 	await cancelAnimations();
        // }
        // syncVisualsToMsg(latest);
        return;
    }

    // someone else's message and we are animating
    if (latest.triggeredBy != latest.yourInfo.heroName && currentAnim != undefined) {
        console.log(`someone else message but ignoring because we are animating: ${JSON.stringify(currentAnim)}`);
        return;
    }

    // anyone's message with no animations and not animating
    if (currentAnim == undefined && !latest.animations.length) {
        // await cancelAnimations();
        console.log('Anyones message with no animations and not animating, just sync');
        syncVisualsToMsg(latest);
        return;
    }

    // My message with animations but animation is in progress
    if (
        latest.animations.length &&
        currentAnim != undefined &&
        latest.triggeredBy == latest.yourInfo.heroName
    ) {
        console.log('My message with anims but we are animating. store these anims to play once current is done');
        animationsInWaiting.set({ prev: previous, withAnims: latest })
        // await cancelAnimations();
        // syncVisualsToMsg(previous);
        // await startAnimating(previous, latest);
        return;
    }

    // console.log(`precheck start anim ${JSON.stringify($currentAnimation)}`)

    // new animations and we aren't animating, start animating
    if (latest.animations.length && currentAnim == undefined) {
        console.log('anyones message, we not animating. starting');
        // await cancelAnimations();
        syncVisualsToMsg(previous);
        startAnimating(latest);
        return;
    }
    // syncVisualsToMsg(latest);
    console.log('no specific anim handling, ignore');
}

function startAnimating(msgWithAnims: MessageFromServer) {
    currentAnimationsWithData.set(msgWithAnims.animations);
    // console.log(`starting anims ${JSON.stringify($currentAnimationsWithData)}`);
    nextAnimationIndex(
        true,
        false,
    );
}

export async function worldReceived(sMsg: MessageFromServer) {
    let prevMsg = structuredClone(get(lastMsgFromServer));
    lastMsgFromServer.set(sMsg);
    handleAnimationsOnMessage(prevMsg, sMsg);
}
import type { Flag, HeroName, MiscPortrait, PlayerInClient } from "$lib/server/users";
import type { UnitId, BattleAnimation, EnemyInClient, EnemyName, GameActionSentToClient, AnySprite, LandscapeImage, VisualActionSourceId } from "$lib/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";
import peasantPortrait from '$lib/assets/portraits/peasant.webp';
import generalPortrait from '$lib/assets/portraits/general.webp';
import peasant from '$lib/assets/units/peasant.png';
import general from '$lib/assets/units/general.png';
import druid from '$lib/assets/units/druid.png';
import lady from '$lib/assets/units/lady.png';
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
import dagger from '$lib/assets/scenery/dagger.png';
import potion from '$lib/assets/scenery/potion-red.png';
import club from '$lib/assets/extras/club.png';
import clubSlot from '$lib/assets/equipment/club-small.png';
import fistSlot from '$lib/assets/equipment/fist-human.png';
import shieldSlot from '$lib/assets/equipment/heater-shield.png';
import blankSlot from '$lib/assets/equipment/blank-attack.png';
import poisonDartSlot from '$lib/assets/equipment/dagger-thrown-poison-human.png';
import fireballSlot from '$lib/assets/equipment/fireball.png';
import daggerSlot from '$lib/assets/equipment/dagger-human.png';
import type { EquipmentSlot, Inventory, ItemId, ItemState } from '$lib/server/items';
import { crossfade } from "svelte/transition";
import { expoInOut, linear, quadInOut, quintInOut, quintOut } from "svelte/easing";
import { tick } from "svelte";
import type { EnemyTemplateId } from "$lib/server/enemies";
import type { MessageFromServer } from "$lib/server/messaging";
import type { VisualActionSourceInClient } from "$lib/server/logic";


type UnitDetails = {
    portrait: string
    kind: 'enemy'
    enemy: EnemyInClient
} | {
    kind: 'player',
    portrait: string
    info: PlayerInClient
}

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
export type ConvoState = {
    kind: 'seen' | 'notSeen'
    currentRetort: string,
    detectStep?: Flag,
    lockedResponseHandles: Map<string, boolean>
    isLocked: boolean
}


export let clientState = writable({
    waitingForMyEvent: false,
    status: 'starting up',
    loading: false,
})

export const lastMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export const allVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
export const visualActionSources: Writable<VisualActionSourceInClient[]> = writable([])
export const currentAnimationIndex: Writable<number> = writable(999)
export const currentAnimationsWithData: Writable<BattleAnimation[]> = writable([])
export const subAnimationStage: Writable<'start' | 'fire' | 'sentHome'> = writable('start')
export const convoStateForEachVAS: Writable<Map<VisualActionSourceId, ConvoState>> = writable(new Map())
export const latestSlotButtonInput: Writable<EquipmentSlot | 'none'> = writable('none')
export const lastUnitClicked: Writable<UnitId | 'background' | undefined> = writable()
export const visualLandscape: Writable<LandscapeImage> = writable('plains')
export const visualOpacity = writable(false)
export const visualSceneLabel = writable('nowhere')


export const allies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
    let calAllies = $allVisualUnitProps.filter((v, i) => v.side == 'hero' && v.name);
    return calAllies;
});
export const enemies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
    return $allVisualUnitProps.filter((p) => p.side == 'enemy');
});
export const vases = derived([visualActionSources, convoStateForEachVAS], ([$visualActionSources, $convoStateForEachVAS]) => {
    return $visualActionSources.filter((s) => {
        let cs = $convoStateForEachVAS.get(s.id)
        if (!cs || cs.kind != 'seen') return false
        return !cs.isLocked
    })
});

export function numberShownOnSlot(itemState: ItemState): string | undefined {
    // if(itemState.stock != undefined && itemState.stock < 1){
    //     return '-'
    // }
    const higherOfCooldownOrWarmup = Math.max(itemState.cooldown, itemState.warmup)
    if (higherOfCooldownOrWarmup > 0) return `${higherOfCooldownOrWarmup}`
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

function getSlotImage(id: ItemId): string {
    if(id == 'unarmed') return fistSlot;
    if (id == 'club') return clubSlot;
    if (id == 'dagger') return daggerSlot;
    if (id == 'fireStaff') return fireballSlot;
    if (id == 'bomb') return fireballSlot;
    if (id == 'poisonDart') return poisonDartSlot;
    if (id == 'bandage') return shieldSlot;
    if (id == 'leatherArmor') return shieldSlot;
    if (id == 'plateMail') return shieldSlot;
    return blankSlot;
}


export let currentAnimation = derived([currentAnimationIndex, currentAnimationsWithData], ([$currentAnimationIndex, $currentAnimationsWithData]) => {
    return $currentAnimationsWithData?.at($currentAnimationIndex)
})

// export const animationCancelled = writable(false)

export function actionsForSlot(lm: MessageFromServer | undefined, equipmentSlot: EquipmentSlot): GameActionSentToClient[] {
    if (!lm) return []
    return lm?.itemActions.filter(ia => ia.slot == equipmentSlot)
}
export let typedInventory = derived([
    lastMsgFromServer,
    waitingForMyAnimation,
    clientState,
], ([
    $lastMsgFromServer,
    $waitingForMyAnimation,
    $clientState,
]) => {
    let map = new Map<EquipmentSlot, ({ itemState: ItemState, disabled: boolean, acts: GameActionSentToClient[], overlayNumber: string | undefined, dots: string, img: string })>()
    if (!$lastMsgFromServer) {
        return map
    }
    for (const [key, value] of Object.entries($lastMsgFromServer.yourInfo.inventory)) {
        let tKey = key as EquipmentSlot
        let acts = actionsForSlot($lastMsgFromServer, tKey)
        let d = (!acts.length || $waitingForMyAnimation || $clientState.waitingForMyEvent)

        map.set(tKey, { itemState: value, disabled: d, acts: acts, overlayNumber: numberShownOnSlot(value), dots: stockDotsOnSlotButton(value), img: getSlotImage(value.itemId) })
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


export type DetailWindow = { kind: 'vup', entity: VisualUnitProps } | { kind: 'vas', entity: VisualActionSourceInClient } | {kind:'bg'}


export const selectedDetail: Readable<DetailWindow | undefined> = derived([
    lastUnitClicked,
    allVisualUnitProps,
    vases,
    convoStateForEachVAS,
], ([$lastUnitClicked,
    $allVisualUnitProps,
    $vases,
    $convoStateForEachVAS,
]) => {

    if($lastUnitClicked == 'background'){
        return {kind:'bg'} satisfies DetailWindow
    }

    let vupAt = $allVisualUnitProps.find(v => v.id == $lastUnitClicked)
    if (vupAt) return { kind: 'vup', entity: vupAt } satisfies DetailWindow

    let vasAt = $vases.find(v => v.id == $lastUnitClicked)
    if (vasAt) return { kind: 'vas', entity: vasAt } satisfies DetailWindow

    // if last unit clicked not valid, fall back to first enemy
    let firstEnemy = $allVisualUnitProps.find(v => v.side == 'enemy')
    if (firstEnemy) return { kind: 'vup', entity: firstEnemy } satisfies DetailWindow

    // if no enemies fall back to first unlocked vas with an unlock action or response

    let firstVas = undefined
    outer: for (const vas of $vases) {
        let cs = $convoStateForEachVAS.get(vas.id)
        if (!cs) continue
        if (cs.kind != 'seen') continue
        for (const act of vas.actionsInClient) {
            firstVas = vas
            break outer
        }
        for (const r of vas.responses) {
            if (cs.lockedResponseHandles.get(r.responseId) == false) {
                firstVas = vas
                break outer
            }
        }
    }
    if (firstVas) {
        return { kind: 'vas', entity: firstVas } satisfies DetailWindow
    }

    // if no unlocked vas fall back to self
    let me = $allVisualUnitProps.at(0)
    if (me) return { kind: 'vup', entity: me } satisfies DetailWindow

    return undefined
})




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

export const selectedVasResponsesToShow = derived([selectedVisualActionSourceState, selectedDetail], ([$selectedVisualActionSourceState, $selectedDetail]) => {
    if (!$selectedDetail || !$selectedVisualActionSourceState || $selectedDetail.kind != 'vas') return []

    return $selectedDetail.entity.responses.filter((r) => {
        if (!r.responseId) return true
        let locked = $selectedVisualActionSourceState.lockedResponseHandles.get(r.responseId)
        return !locked
    })
})
export const selectedVasActionsToShow = derived([selectedVisualActionSourceState, selectedDetail], ([$selectedVisualActionSourceState, $selectedDetail]) => {
    if (!$selectedDetail || !$selectedVisualActionSourceState || $selectedDetail.kind != 'vas') return []

    return $selectedDetail.entity.actionsInClient.filter((r) => {
        return true
        // if(!r.lockHandle)return true
        // let locked = $selectedVisualActionSourceState.lockedResponseHandles.get(r.lockHandle)
        // return !locked
    })
})

export const [sendMelee, receiveMelee] = crossfade({
    duration: 500,
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
        console.log('sync wep wu to ' + lastMsg.yourInfo.inventory.weapon.warmup)

        visualLandscape.set(lastMsg.landscape)
        visualSceneLabel.set(lastMsg.yourInfo.currentSceneDisplay)

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
        allVisualUnitProps.set(newVups)
        // console.log(`${JSON.stringify(lastMsg.visualActionSources.map(v=>v.id))}`)

        for (const vas of lastMsg.visualActionSources) {
            convoStateForEachVAS.update(cs => {
                let existing = cs.get(vas.id)

                // Do something if no state for this vas,
                // or if exists with a new detect step
                // or if it exists but only unseen
                if (!existing || (existing && existing.detectStep != vas.detectStep) || existing.kind == 'notSeen') {
                    // console.log(`init vas state ${vas.id} with unlockable`)
                    let startResponsesLocked = new Map<string, boolean>()
                    for (const resp of vas.responses) {
                        if (resp.responseId) {
                            if (resp.startsLocked) {
                                startResponsesLocked.set(resp.responseId, true)
                            } else {
                                startResponsesLocked.set(resp.responseId, false)
                            }
                        }
                    }

                    // default startsLocked handling
                    let startLocked = vas.startsLocked ?? false

                    // if it's been unlocked already before it's been seen, carry over the locked state
                    if (existing && existing.kind == 'notSeen') {
                        startLocked = existing.isLocked
                    }

                    // If it's a new detect step or it wasn't existing and already has a detect step, consider it advanced
                    let detectStepAdvance = (existing && existing.detectStep != vas.detectStep) || (!existing && vas.detectStep)

                    // vas with advanced detect step always unlocked
                    if (detectStepAdvance) {
                        startLocked = false
                    }

                    //  handle the unlocks on detect step advance
                    if (detectStepAdvance && vas.unlockOnSee) {
                        for (const vId of vas.unlockOnSee) {
                            let toUnlock = cs.get(vId)
                            if (toUnlock) {
                                toUnlock.isLocked = false
                            } else {
                                cs.set(vId, {
                                    kind: 'notSeen',
                                    currentRetort: 'I have not been seen yet',
                                    isLocked: false,
                                    lockedResponseHandles: new Map(),
                                })
                            }
                        }
                    }
                    if (detectStepAdvance && vas.lockOnSee) {
                        for (const vId of vas.lockOnSee) {
                            let toLock = cs.get(vId)
                            if (toLock) {
                                toLock.isLocked = true
                            } else {
                                cs.set(vId, {
                                    kind: 'notSeen',
                                    currentRetort: 'I have not been seen yet',
                                    isLocked: true,
                                    lockedResponseHandles: new Map(),
                                })
                            }
                        }
                    }

                    cs.set(vas.id, {
                        kind: 'seen',
                        currentRetort: vas.startText,
                        detectStep: vas.detectStep,
                        lockedResponseHandles: startResponsesLocked,
                        isLocked: startLocked,
                    })
                }
                return cs
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
    forest: forest,
    stoneDoor: stoneDoor,
    portal:portal,
    signpost: signpost,
    temple: temple,
    club: club,
    dagger: dagger,
    staff: staff,
    potion: potion,
    altar: altar,
    bombPadded: bombpad,
    armorStand: armor,
    general: general,
    druid: druid,
    lady: lady,
    necromancer: necromancer,
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
    let cai = get(currentAnimationIndex)
    if (start) {
        cai = 0
    } else {
        cai++
    }
    currentAnimationIndex.set(cai)

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

    let nextAnim = curAnimations.at(cai)
    if (!nextAnim || !checkAnimationValid(nextAnim)) {
        console.log('invalid next anim!')
        currentAnimationIndex.set(999)
        waitingForMyAnimation.set(false)
        syncVisualsToMsg(latest)
        return
    }



    subAnimationStage.set('start')

    // let the projectiles render at start position
    await tick()

    subAnimationStage.set('fire')
}

function checkAnimationValid(ba: BattleAnimation): boolean {
    let valid = true
    let enemiesToCheck = get(enemies)
    let alliesToCheck = get(allies)
    let vasesToCheck = get(vases)

    let foundSource = enemiesToCheck.some(e => e.id == ba.source) || alliesToCheck.some(a => a.id == ba.source)
    let foundTarget = ba.target == undefined || enemiesToCheck.some(e => e.id == ba.target) || alliesToCheck.some(a => a.id == ba.target) || vasesToCheck.some(v => v.id == ba.target)

    return foundSource && foundTarget
}


export function heroSprite(weapon: ItemId) {
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
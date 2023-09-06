import type { Flag, HeroName, MiscPortrait, PlayerInClient } from "$lib/server/users";
import type { UnitId, BattleAnimation, EnemyInClient, EnemyName, GameActionSentToClient, AnySprite, LandscapeImage, VisualActionSourceId, SignupResponse } from "$lib/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";

import type { ItemId, ItemState, QuickbarSlot } from '$lib/server/items';
import { crossfade } from "svelte/transition";
import { expoInOut, linear, quadInOut, quintInOut, quintOut } from "svelte/easing";
import { tick } from "svelte";
import type { EnemyTemplateId } from "$lib/server/enemies";
import type { MessageFromServer } from "$lib/server/messaging";
import type { VisualActionSourceInClient } from "$lib/server/logic";
import { anySprites, enemyPortraits, enemySprites, getHeroPortrait, getSlotImage, heroSprites } from "./assets";


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
    tilt?:boolean;
    displayHp: number;
    maxHp: number;
    side: 'hero' | 'enemy'
    actual: UnitDetails;
    actionsThatCanTargetMe: GameActionSentToClient[]
}



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
    loading: true,
})

export let triedSignupButTaken: Writable<string | undefined> = writable(undefined)

export const lastMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export const allVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
export const visualActionSources: Writable<VisualActionSourceInClient[]> = writable([])
export const currentAnimationIndex: Writable<number> = writable(999)
export const currentAnimationsWithData: Writable<BattleAnimation[]> = writable([])
export const subAnimationStage: Writable<'start' | 'fire' | 'sentHome'> = writable('start')
export const convoStateForEachVAS: Writable<Map<VisualActionSourceId, ConvoState>> = writable(new Map())
export const latestSlotButtonInput: Writable<ItemId | undefined> = writable(undefined)
export const lastUnitClicked: Writable<UnitId | 'background' | undefined> = writable()
export const visualLandscape: Writable<LandscapeImage> = writable('plains')
export const visualOpacity = writable(false)
export const visualSceneLabel = writable('nowhere')
export const successcreds : Writable<SignupResponse | undefined> = writable(undefined)


export const allies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
    let calAllies = $allVisualUnitProps.filter((v, i) => v.side == 'hero' && v.name);
    return calAllies;
});
export const enemies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
    return $allVisualUnitProps.filter((p) => p.side == 'enemy');
});
export const vasesToShow = derived([visualActionSources, convoStateForEachVAS], ([$visualActionSources, $convoStateForEachVAS]) => {
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



export let currentAnimation = derived([currentAnimationIndex, currentAnimationsWithData], ([$currentAnimationIndex, $currentAnimationsWithData]) => {
    return $currentAnimationsWithData?.at($currentAnimationIndex)
})

// export const animationCancelled = writable(false)

export function actionsForSlot(lm: MessageFromServer | undefined, iId: ItemId): GameActionSentToClient[] {
    if (!lm) return []
    return lm.itemActions.filter(ia => ia.itemId == iId)
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
    let inventory: { itemState: ItemState, disabled: boolean, acts: GameActionSentToClient[], overlayNumber: string | undefined, dots: string, img: string }[] = []
    if (!$lastMsgFromServer) {
        return inventory
    }
    for (const state of $lastMsgFromServer.yourInfo.inventory) {
        let acts = actionsForSlot($lastMsgFromServer, state.itemId)
        let d = (!acts.length || $waitingForMyAnimation || $clientState.waitingForMyEvent)
        inventory.push({ itemState: state, disabled: d, acts: acts, overlayNumber: numberShownOnSlot(state), dots: stockDotsOnSlotButton(state), img: getSlotImage(state.itemId) })
    }

    return inventory
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
    return $lastMsgFromServer?.itemActions.filter(ia => ia.slot == 'wait' || ia.slot == 'succumb') ?? []
})


export type DetailWindow = { kind: 'vup', entity: VisualUnitProps } | { kind: 'vas', entity: VisualActionSourceInClient } | { kind: 'bg' }


export const selectedDetail: Readable<DetailWindow | undefined> = derived([
    lastUnitClicked,
    allVisualUnitProps,
    vasesToShow,
    convoStateForEachVAS,
], ([$lastUnitClicked,
    $allVisualUnitProps,
    $vases,
    $convoStateForEachVAS,
]) => {

    if ($lastUnitClicked == 'background') {
        return { kind: 'bg' } satisfies DetailWindow
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
    // visualActionSources,
    convoStateForEachVAS,

], ([
    // $lastUnitClicked,
    // $selectedVisualActionSource,
    $selectedDetail,
    // $visualActionSources,
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
        // console.log('sync wep wu to ' + lastMsg.yourInfo.inventory.weapon.warmup)

        visualLandscape.set(lastMsg.landscape)
        visualSceneLabel.set(lastMsg.yourInfo.currentSceneDisplay)

        let newVups: VisualUnitProps[] = []
        // console.log(`syncing hero with poison ${lastMsg.yourInfo.statuses.poison}`)
        newVups.push({
            id: lastMsg.yourInfo.unitId,
            name: lastMsg.yourInfo.heroName,
            src: heroSprites[heroSprite(lastMsg.yourInfo.inventory)],
            maxHp: lastMsg.yourInfo.maxHealth,
            displayHp: lastMsg.yourInfo.health,
            side: 'hero',
            actual: {
                kind: 'player',
                portrait: getHeroPortrait(lastMsg.yourInfo),
                info: structuredClone(lastMsg.yourInfo),
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
                    side: 'enemy',
                    actual: {
                        kind: 'enemy',
                        portrait: enemyPortraits[e.templateId],
                        enemy: structuredClone(e)
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
                    src: heroSprites[heroSprite(p.inventory)],
                    displayHp: p.health,
                    maxHp: p.maxHealth,
                    side: 'hero',
                    actual: {
                        kind: 'player',
                        portrait: getHeroPortrait(p),
                        info: p,
                    },
                    actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target == p.unitId)
                }
            )

        }
        allVisualUnitProps.set(newVups)
        // console.log(`${JSON.stringify(lastMsg.visualActionSources.map(v=>v.id))}`)

        for (const vas of lastMsg.visualActionSources) {
            syncConvoStateToVas(vas)
        }

        visualActionSources.set(lastMsg.visualActionSources)
    }
}

export function syncConvoStateToVas(vas: VisualActionSourceInClient, forceUnlock: boolean = false) {
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
            // let detectStepAdvance = (existing && existing.detectStep != vas.detectStep) || (!existing && vas.detectStep)

            if (forceUnlock) {
                startLocked = false
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

export function changeVasLocked(vId: VisualActionSourceId, unlock: boolean) {

    const vases = get(visualActionSources)
    const found = vases.find(v => v.id == vId)
    convoStateForEachVAS.update(cs => {
        let cState = cs.get(vId)
        if (found) {
            // vas will already have a convo state
            if (!cState) return cs
            if (unlock) {
                cState.isLocked = false
            } else {
                cState.isLocked = true
            }
            console.log('unlocked ' + vId)
        } else {
            if (cState) {
                cState.isLocked = false
            } else {
                cs.set(vId, {
                    kind: 'notSeen',
                    currentRetort: 'I have not been seen yet',
                    isLocked: !unlock,
                    lockedResponseHandles: new Map(),
                })
            }
        }
        return cs
    })
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
            // console.log('playing anims in waiting')
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
    let vasesToCheck = get(vasesToShow)

    let foundSource = enemiesToCheck.some(e => e.id == ba.source) || alliesToCheck.some(a => a.id == ba.source)
    let foundTarget = ba.target == undefined || enemiesToCheck.some(e => e.id == ba.target) || alliesToCheck.some(a => a.id == ba.target) || vasesToCheck.some(v => v.id == ba.target)

    return foundSource && foundTarget
}


export function heroSprite(info: ItemState[]) {

    if (info.some(i => i.itemId == 'club')) return 'ruffian';
    if (info.some(i => i.itemId == 'dagger')) return 'theif';
    if (info.some(i => i.itemId == 'fireStaff')) return 'mage';
    return 'peasant';
}

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
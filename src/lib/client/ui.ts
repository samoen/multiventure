import type { Flag, HeroName, PlayerInClient } from "$lib/server/users";
import type { BattleAnimation, EnemyInClient, GameActionSentToClient, LandscapeImage, SignupResponse, StatusId, UnitId, VisualActionSourceId } from "$lib/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";

import type { ItemId, ItemState } from '$lib/server/items';
import type { VisualActionSourceInClient } from "$lib/server/logic";
import type { MessageFromServer } from "$lib/server/messaging";
import type { SceneDataId } from "$lib/server/scenes";
import { tick } from "svelte";
import { linear, quintInOut, quintOut } from "svelte/easing";
import { crossfade } from "svelte/transition";
import { anySprites, enemySprites, getHeroPortrait, getPortrait, getSlotImage, heroSpriteFromClass } from "./assets";


type HeroSpecificEnemyState = { hName: HeroName, agg: number, sts: { sId: StatusId, count: number }[] }

type UnitDetails = {
    portrait: string
    kind: 'enemy'
    enemy: EnemyInClient
    heroSpecificStates: HeroSpecificEnemyState[]
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
    tilt?: boolean;
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

export type UIVas = VisualActionSourceInClient & { actionsInClient: GameActionSentToClient[] }

export const triedSignupButTaken: Writable<string | undefined> = writable(undefined)
export const source: Writable<EventSource | undefined> = writable(undefined);
export const lastMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export const allVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
export const visualActionSources: Writable<UIVas[]> = writable([])
export const currentAnimationIndex: Writable<number> = writable(999)
export const currentAnimationsWithData: Writable<BattleAnimation[]> = writable([])
export const subAnimationStage: Writable<'start' | 'fire' | 'sentHome'> = writable('start')
export const convoStateForEachVAS: Writable<Map<SceneDataId, Map<VisualActionSourceId, ConvoState>>> = writable(new Map())
export const latestSlotButtonInput: Writable<ItemId | undefined> = writable(undefined)
export const lastUnitClicked: Writable<UnitId | 'background' | undefined> = writable(undefined)
export const visualLandscape: Writable<LandscapeImage> = writable('plains')
export const visualOpacity = writable(false)
export const visualSceneLabel = writable('nowhere')
export const successcreds: Writable<SignupResponse | undefined> = writable(undefined)


export const allies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
    let calAllies = $allVisualUnitProps.filter((v, i) => v.side == 'hero' && v.name);
    return calAllies;
});
export const enemies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
    return $allVisualUnitProps.filter((p) => p.side == 'enemy');
});
export const vasesToShow = derived([visualActionSources, convoStateForEachVAS], ([$visualActionSources, $convoStateForEachVAS]) => {
    return $visualActionSources.filter((s) => {
        let csForE = $convoStateForEachVAS.get(s.scene)
        if (!csForE) return false
        let cs = csForE.get(s.id)
        if (!cs) return false
        return !cs.isLocked
    })
});

export function resetSceneConvos(sceneId: SceneDataId) {
    let vasesToReset = get(visualActionSources).filter(v => v.scene == sceneId)
    convoStateForEachVAS.update(scs => {
        scs.delete(sceneId)
        return scs
    })
    vasesToReset.forEach(v => {
        syncConvoStateToVas(v)
    })
}

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

export type SlotButtonProps = {
    itemState: ItemState,
    disabled: boolean,
    acts: GameActionSentToClient[],
    overlayNumber: string | undefined,
    dots: string,
    img: string
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
    let inventory: SlotButtonProps[] = []
    if (!$lastMsgFromServer) {
        return inventory
    }
    for (const state of $lastMsgFromServer.yourInfo.inventory) {
        let acts = actionsForSlot($lastMsgFromServer, state.stats.id)
        let d = (!acts.length || $waitingForMyAnimation || $clientState.waitingForMyEvent)
        let num = numberShownOnSlot(state)
        let cantUseBecauseCoolWarmStock = num != undefined && !acts.length
        let cantUseBecauseDead =  $lastMsgFromServer.yourInfo.health < 1 && !acts.length && !state.stats.requiresSourceDead
        let include = !cantUseBecauseDead && (acts.length || cantUseBecauseCoolWarmStock)
        if(include){
            inventory.push({
                itemState: state,
                disabled: d,
                acts: acts,
                overlayNumber: num,
                dots: stockDotsOnSlotButton(state),
                img: getSlotImage(state.stats.id)
            })
        }
    }

    return inventory
})

export type DetailWindow = { kind: 'vup', entity: VisualUnitProps } | { kind: 'vas', entity: UIVas } | { kind: 'bg' }


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
        let csForE = $convoStateForEachVAS.get(vas.scene)
        if (!csForE) continue
        let cs = csForE.get(vas.id)
        if (!cs) continue
        // if (cs.kind != 'seen') continue
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
    let csForE = $convoStateForEachVAS.get($selectedDetail.entity.scene)
    if (!csForE) return undefined
    let state = csForE.get($selectedDetail.entity.id)
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
        // console.log(`I am class ${lastMsg.yourInfo.class}`)

        newVups.push({
            id: lastMsg.yourInfo.unitId,
            name: lastMsg.yourInfo.heroName,
            src: heroSpriteFromClass(lastMsg.yourInfo.class),
            maxHp: lastMsg.yourInfo.maxHealth,
            displayHp: lastMsg.yourInfo.health,
            side: 'hero',
            actual: {
                kind: 'player',
                portrait: getHeroPortrait(lastMsg.yourInfo.class),
                info: structuredClone(lastMsg.yourInfo),
            },
            actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target == lastMsg.yourInfo.unitId)
        } satisfies VisualUnitProps
        )

        for (const e of lastMsg.enemiesInScene) {

            let heroSpecifics: HeroSpecificEnemyState[] = []
            for (const ag of e.aggros) {
                let find = e.statuses.filter(s => s.hId == ag.hId)
                let stsForHero: { sId: StatusId, count: number }[] = []
                if (find) {
                    for (const s of find) {
                        stsForHero.push({
                            sId: s.statusId,
                            count: s.count,
                        })
                    }
                }
                let findPlayer: PlayerInClient | undefined = undefined
                if (lastMsg.yourInfo.unitId == ag.hId) {
                    findPlayer = lastMsg.yourInfo
                } else {
                    findPlayer = lastMsg.otherPlayers.find(p => p.unitId == ag.hId)
                }

                if (findPlayer) {
                    heroSpecifics.push({
                        hName: findPlayer.heroName,
                        agg: ag.agg,
                        sts: stsForHero,
                    })
                }

            }

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
                        portrait: e.template.portrait ? getPortrait(e.template.portrait) : enemySprites[e.templateId],
                        enemy: structuredClone(e),
                        heroSpecificStates: heroSpecifics,
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
                    src: heroSpriteFromClass(p.class),
                    displayHp: p.health,
                    maxHp: p.maxHealth,
                    side: 'hero',
                    actual: {
                        kind: 'player',
                        portrait: getHeroPortrait(p.class),
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

        let uiVases = lastMsg.visualActionSources.map(v => {
            let actionsFromVas = lastMsg.vasActions.filter(va => va.vasId == v.id)
            return {
                ...v,
                actionsInClient: actionsFromVas
            } satisfies UIVas

        })

        visualActionSources.set(uiVases)
    }
}

export function syncConvoStateToVas(vas: VisualActionSourceInClient) {
    convoStateForEachVAS.update(cs => {
        let sceneEntry = cs.get(vas.scene)

        if (!sceneEntry) {
            sceneEntry = new Map()
        }
        let existing = sceneEntry.get(vas.id)

        if (existing && existing.detectStep == vas.detectStep) {
            return cs
        }

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

        sceneEntry.set(vas.id, {
            currentRetort: vas.startText,
            detectStep: vas.detectStep,
            lockedResponseHandles: startResponsesLocked,
            isLocked: startLocked,
        })

        cs.set(vas.scene, sceneEntry)
        return cs
    })
}

export function changeVasLocked(vId: VisualActionSourceId, unlock: boolean) {

    const vases = get(visualActionSources)
    const found = vases.find(v => v.id == vId)
    if (!found) return

    convoStateForEachVAS.update(cs => {
        let sceneEntry = cs.get(found.scene)
        if (!sceneEntry) return cs

        let cState = sceneEntry.get(vId)
        // if (found) {
        // vas will already have a convo state
        if (!cState) return cs
        if (unlock) {
            cState.isLocked = false
        } else {
            cState.isLocked = true
        }
        // } 
        // else {
        //     if (cState) {
        //         cState.isLocked = false
        //     } else {
        //         cs.set(vId, {
        //             kind: 'notSeen',
        //             currentRetort: 'I have not been seen yet',
        //             isLocked: !unlock,
        //             lockedResponseHandles: new Map(),
        //         })
        //     }
        // }
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
                        vup.actual.enemy.statuses = vup.actual.enemy.statuses.filter(s => s.statusId != ps.statusId)
                    } else if (vup.actual.kind == 'player') {
                        vup.actual.info.statuses[ps.statusId] = 0;
                    }
                } else {
                    if (ps.count) {
                        if (vup.actual.kind == 'enemy') {
                            let found = vup.actual.enemy.statuses.find(s => s.statusId == ps.statusId && s.hId == anim.triggeredBy)
                            if (found) {
                                found.count += ps.count
                            } else {
                                vup.actual.enemy.statuses.push({
                                    count: ps.count,
                                    hId: anim.triggeredBy,
                                    statusId: ps.statusId
                                })
                            }
                        } else if (vup.actual.kind == 'player') {
                            vup.actual.info.statuses[ps.statusId] = ps.count;
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
    visualOpacity.set(false)
    let curAnimations = get(currentAnimationsWithData)
    let latest = get(lastMsgFromServer)
    if (!latest) {
        console.log('tried next anim but last msg from server undefined!')
        currentAnimationIndex.set(999)
        waitingForMyAnimation.set(false)
        return
    }
    let cai = get(currentAnimationIndex)
    if (start) {
        cai = 0
    } else {
        cai++
    }
    currentAnimationIndex.set(cai)

    if (cai > curAnimations.length - 1) {
        let animsInWaiting = get(animationsInWaiting)
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

            animationsInWaiting.set(undefined)
            syncVisualsToMsg(animsInWaiting.prev)
            startAnimating(animsInWaiting.withAnims)
            return
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

    if (nextAnim.behavior.kind == 'travel' || nextAnim.teleporting) {
        if (nextAnim.source == latest?.yourInfo.unitId) {
            visualOpacity.set(true);
        }
    }

    subAnimationStage.set('start')

    // let the projectiles render at start position
    await tick()

    subAnimationStage.set('fire')
}

function checkAnimationValid(ba: BattleAnimation): boolean {
    let enemiesToCheck = get(enemies)
    let alliesToCheck = get(allies)
    let vasesToCheck = get(vasesToShow)

    let foundSource = enemiesToCheck.some(e => e.id == ba.source) || alliesToCheck.some(a => a.id == ba.source)
    let foundTarget = ba.target == undefined || enemiesToCheck.some(e => e.id == ba.target) || alliesToCheck.some(a => a.id == ba.target) || vasesToCheck.some(v => v.id == ba.target)

    return foundSource && foundTarget
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
        return;
    }

    // someone else's message and we are animating
    if (latest.triggeredBy != latest.yourInfo.heroName && currentAnim != undefined) {
        console.log(`someone else message but ignoring because we are animating: ${JSON.stringify(currentAnim)}`);
        return;
    }

    // anyone's message with no animations and not animating
    if (currentAnim == undefined && !latest.animations.length) {
        // console.log('Anyones message with no animations and not animating, just sync');
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
    // console.log(`starting anims ${JSON.stringify(msgWithAnims.animations)}`);
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
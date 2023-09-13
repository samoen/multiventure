import type { Flag, HeroName, PlayerInClient } from "$lib/server/users";
import { AbAnimatesToUnit, animatesToUnit, type BattleAnimation, type EnemyInClient, type GameActionSentToClient, type HeroId, type LandscapeImage, type SignupResponse, type StatusState, type UnitId, type VisualActionSourceId } from "$lib/utils";
import { derived, get, writable, type Readable, type Writable } from "svelte/store";

import type { ItemId, ItemState } from '$lib/server/items';
import type { VisualActionSourceInClient } from "$lib/server/logic";
import type { MessageFromServer } from "$lib/server/messaging";
import type { SceneDataId } from "$lib/server/scenes";
import { tick } from "svelte";
import { linear, quintInOut, quintOut } from "svelte/easing";
import { crossfade } from "svelte/transition";
import { anySprites, enemySprites, getHeroPortrait, getPortrait, getSlotImage, heroSpriteFromClass } from "./assets";
import type { StatusId } from "$lib/server/statuses";


type HeroSpecificEnemyState = { hName: HeroName, agg: number, sts: StatusState[] }

type UnitDetails = {
    kind: 'enemy'
    entity: EnemyInClient
    heroSpecificStates: HeroSpecificEnemyState[]
} | {
    kind: 'player',
    entity: PlayerInClient
}


export type VisualUnitProps = {
    portrait: string
    sprite: string;
    tilt?: boolean;
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

export const waitingForMyAnimation = writable(false)
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
    let calAllies = $allVisualUnitProps.filter((v) => v.actual.kind == 'player');
    return calAllies;
});
export const enemies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
    return $allVisualUnitProps.filter((p) => p.actual.kind == 'enemy');
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
        let include = true
        if(state.stats.excludeFromDetail && !acts.length){
            include = false
        }

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

    let vupAt = $allVisualUnitProps.find(v => v.actual.entity.unitId == $lastUnitClicked)
    if (vupAt) return { kind: 'vup', entity: vupAt } satisfies DetailWindow

    let vasAt = $vases.find(v => v.id == $lastUnitClicked)
    if (vasAt) return { kind: 'vas', entity: vasAt } satisfies DetailWindow

    // if last unit clicked not valid, fall back to first enemy
    let firstEnemy = $allVisualUnitProps.find(v => v.actual.kind == 'enemy')
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
            if (index == p.actual.entity.unitId) {
                run(p);
            }
            return p;
        });

    })
}

export function syncVisualsToMsg(lastMsgFromServ: MessageFromServer | undefined) {
    
    // do this here for some reason
    waitingForMyAnimation.set(false)
    currentAnimationIndex.set(999)

    const lastMsg = structuredClone(lastMsgFromServ)
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
            sprite: heroSpriteFromClass(lastMsg.yourInfo.class),
            portrait: getHeroPortrait(lastMsg.yourInfo.class),
            actual: {
                kind: 'player',
                entity: lastMsg.yourInfo,
            },
            actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.associateWithUnit == lastMsg.yourInfo.unitId)
        } satisfies VisualUnitProps
        )

        for (const e of lastMsg.enemiesInScene) {

            let heroSpecifics: HeroSpecificEnemyState[] = []
            for (const ag of e.aggros) {
                let find = e.statuses.filter(s => s.hId == ag.hId)
                let stsForHero: StatusState[] = []
                if (find) {
                    for (const s of find) {
                        stsForHero.push({
                            statusId: s.statusId,
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
                        hName: findPlayer.displayName,
                        agg: ag.agg,
                        sts: stsForHero,
                    })
                }

            }

            newVups.push(
                {
                    sprite: enemySprites[e.templateId],
                    portrait: e.template.portrait ? getPortrait(e.template.portrait) : enemySprites[e.templateId],
                    actual: {
                        kind: 'enemy',
                        entity: e,
                        heroSpecificStates: heroSpecifics,
                    },
                    actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.associateWithUnit == e.unitId)
                } satisfies VisualUnitProps
            )
        }
        for (const p of lastMsg.otherPlayers) {
            newVups.push(
                {
                    sprite: heroSpriteFromClass(p.class),
                    portrait: getHeroPortrait(p.class),
                    actual: {
                        kind: 'player',
                        entity: p,
                    },
                    actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.associateWithUnit == p.unitId)
                }
            )

        }
        allVisualUnitProps.set(newVups)
        // console.log(`${JSON.stringify(lastMsg.visualActionSources.map(v=>v.id))}`)

        for (const vas of lastMsg.visualActionSources) {
            syncConvoStateToVas(vas)
        }

        let uiVases = lastMsg.visualActionSources.map(v => {
            let actionsFromVas = lastMsg.vasActions.filter(va => va.associateWithUnit == v.id)
            let uiVas = {
                ...v,
                actionsInClient: actionsFromVas
            } satisfies UIVas
            return uiVas
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
        // vas will already have a convo state
        if (!cState) return cs
        if (unlock) {
            cState.isLocked = false
        } else {
            cState.isLocked = true
        }
        return cs
    })
}

export function handleModifyHealth(anim:BattleAnimation, strikeNumber:number, oneShot:boolean = false):{died:UnitId[]}{
    const result : {died:UnitId[]}= {died:[]}
    if (anim.alsoDamages) {
        for (const other of anim.alsoDamages) {
            updateUnit(other.target, (vup) => {
                let amt = other.amount.at(strikeNumber) ?? 0
                if(oneShot){
                    amt = other.amount.reduce((a,b)=>a+b,0)
                }
                // if(singleStrike && other.strikes && other.strikes > 0)amt = amt / other.strikes
                vup.actual.entity.health -= amt;
                if(vup.actual.entity.health > vup.actual.entity.maxHealth)vup.actual.entity.health = vup.actual.entity.maxHealth
                if(vup.actual.entity.health < 1)vup.actual.entity.health = 0
                if (vup.actual.entity.health < 1) {
                    result.died.push(vup.actual.entity.unitId);
                }
            });
        }
    }
    return result
}

export function handleModAggros(anim:BattleAnimation, myId:HeroId){
    if (anim.alsoModifiesAggro) {
        for (const other of anim.alsoModifiesAggro) {
            const findMyAggroMod = other.forHeros.find(fh =>fh.hId == myId)

            if (findMyAggroMod) {
                updateUnit(other.target, (vup) => {
                    if (vup.actual.kind == 'enemy') {
                        vup.actual.entity.myAggro += findMyAggroMod.amount;
                        if (vup.actual.entity.myAggro > 100) vup.actual.entity.myAggro = 100;
                        if (vup.actual.entity.myAggro < 0) vup.actual.entity.myAggro = 0;
                    }
                });
            }
        }
    }
}

export function handlePutsStatuses(anim: BattleAnimation) {
    if (anim.putsStatuses) {
        for (const ps of anim.putsStatuses) {
            updateUnit(ps.target, (vup) => {
                if (ps.remove) {
                    if (vup.actual.kind == 'enemy') {
                        // remove enemy status for all sources
                        vup.actual.entity.statuses = vup.actual.entity.statuses.filter(s => s.statusId != ps.statusId)
                    } else if (vup.actual.kind == 'player') {
                        vup.actual.entity.statuses = vup.actual.entity.statuses.filter(s=>s.statusId != ps.statusId);
                    }
                } else {
                    if (ps.count) {
                        if (vup.actual.kind == 'enemy') {
                            let found = vup.actual.entity.statuses.find(s => s.statusId == ps.statusId && s.hId == anim.triggeredBy)
                            if (found) {
                                if(found.count < ps.count){
                                    found.count = ps.count
                                }
                            } else {
                                vup.actual.entity.statuses.push({
                                    count: ps.count,
                                    hId: anim.triggeredBy,
                                    statusId: ps.statusId
                                })
                            }
                        } else if (vup.actual.kind == 'player') {
                            let found = vup.actual.entity.statuses.find(s=>s.statusId == ps.statusId)
                            if(found){
                                if(found.count < ps.count){
                                    found.count = ps.count;
                                }
                            }else{
                                vup.actual.entity.statuses.push({statusId:ps.statusId,count:ps.count})
                            }
                            
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
                await new Promise(r => setTimeout(r, 300))
            }
            syncVisualsToMsg(latest)
            console.log('finished animating')
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

    let foundSource = enemiesToCheck.some(e => e.actual.entity.unitId == ba.source) || alliesToCheck.some(a => a.actual.entity.unitId == ba.source)
    let foundTarget = false
    const cb = ba.behavior
    if(AbAnimatesToUnit(cb)){
        foundTarget = enemiesToCheck.some(e => e.actual.entity.unitId == cb.animateTo) || alliesToCheck.some(a => a.actual.entity.unitId == cb.animateTo) || vasesToCheck.some(v => v.id == cb.animateTo)
    }else{
        foundTarget = true
    }

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

    // my message with no animations
    if (latest.triggeredBy === latest.yourInfo.unitId && !latest.animations.length && currentAnim != undefined) {
        console.log('my message with no animations, but we are animating. Ignore, it will be synced when current anims finish');
        return;
    }

    // someone else's message and we are animating
    if (latest.triggeredBy != latest.yourInfo.unitId && currentAnim != undefined) {
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
        latest.triggeredBy == latest.yourInfo.unitId
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
    if (msgWithAnims.animations.length && msgWithAnims.triggeredBy == msgWithAnims.yourInfo.unitId) {
        console.log('start waiting my anim');
        waitingForMyAnimation.set(true);
    }
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
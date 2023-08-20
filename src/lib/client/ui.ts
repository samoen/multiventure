import type { HeroName } from "$lib/server/users";
import type { AnimationTarget, BattleAnimation, EnemyInClient, EnemyName, ExtraSprite, GameActionSentToClient, MessageFromServer, OtherPlayerInfo } from "$lib/utils";
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
import type { EquipmentSlot, ItemId, ItemIdForSlot } from '$lib/server/items.js';
import { crossfade } from "svelte/transition";
import { expoInOut, linear, quadInOut, quintInOut, quintOut } from "svelte/easing";
import { tick } from "svelte";
import type { EnemyTemplateId } from "$lib/server/enemies";


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
    kind: 'me',
    portrait: string,
    // me: { myHealth: number, 
    // myName: HeroName }
};

export let clientState = writable({
    waitingForMyEvent: true,
    status: 'starting up',
})
export let waitingForMyAnimation = writable(false)

export type VisualUnitProps = {
    name: string;
    src: string;
    // hp: number;
    displayHp: number
    maxHp: number;
    aggro?: number;
    side: 'hero' | 'enemy'
    index: number;
    actual: UnitDetails;
    actionsThatCanTargetMe: GameActionSentToClient[]
}

export const enemySprites = {
    goblin: spearman,
    rat: rat,
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

export let currentAnimationIndex: Writable<number> = writable(0)

export type AnimationWithData = BattleAnimation & {
    sourceIndex:number,
    targetIndex?:number,
    alsoDmgsProps: { targetIndex: number, amount: number }[]
}

export const currentAnimationsWithData: Writable<AnimationWithData[] | undefined> = writable()

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
export const lastUnitClicked: Writable<number> = writable(0)

export const selectedDetail = derived([lastUnitClicked
    , allVisualUnitProps
], ([$lastUnitClicked
    , $alliesVisualUnitProps
]) => {

    let props = $alliesVisualUnitProps

    let vupAt = props.at($lastUnitClicked)
    if (!vupAt) {
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

// export let animationQueue: Writable<
// (
// BattleAnimation[]
// &{done:boolean})
// > = writable([])

let enemyPortraits = {
    hobGoblin: gruntPortrait,
    rat: gruntPortrait,
    goblin: gruntPortrait,
    fireGremlin: gruntPortrait,
    troll: gruntPortrait
} satisfies Record<EnemyTemplateId, string>;

export function updateUnit(index: number, run: (vup: VisualUnitProps) => void) {
    allVisualUnitProps.update((old) => {
        return old.map((p, j) => {
            if (index == j) {
                run(p);
            }
            return p;
        });
    });
}

export function syncVisualsToMsg(lastMsg: MessageFromServer) {
    // let lastMsg = get(lastMsgFromServer)
    if (!lastMsg) {
        console.log('tried to sync with bad msg')
    }
    if (lastMsg) {
        // let actsWithIs: ClientGameActionWithIndex[] = lastMsg.itemActions.map((cga) => {
        //     return {
        //         cga: cga,
        //         targetIndex: 999
        //     }
        // })


        let newVups: VisualUnitProps[] = []
        let i = 0
        // heroVisualUnitProps.set(
        newVups.push({
            name: lastMsg.yourName,
            src: heroSprites[heroSprite(lastMsg.yourWeapon?.itemId)],
            maxHp: lastMsg.yourMaxHp,
            displayHp: lastMsg.yourHp,
            side: 'hero',
            index: i,
            actual: {
                kind: 'me',
                portrait: peasantPortrait,
            },
            actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target && a.target.name == lastMsg.yourName && a.target.side == 'hero')
        } satisfies VisualUnitProps
        )
        // actsWithIs
        //     .filter(a => { a.cga.target && a.cga.target.name == lastMsg.yourName && a.cga.target.side == 'hero' })
        //     .forEach(a => {
        //         a.targetIndex = 0
        //     })
        // if(myActs)myActs.targetIndex = 0

        for (const e of lastMsg.enemiesInScene) {
            i++
            newVups.push(
                // enemiesVisualUnitProps.set(lastMsg.enemiesInScene.map((e,i) => {
                // return 
                {
                    name: e.name,
                    src: enemySprites[e.templateId],
                    displayHp: e.health,
                    maxHp: e.maxHealth,
                    aggro: e.myAggro,
                    side: 'enemy',
                    index: i,
                    actual: {
                        kind: 'enemy',
                        portrait: enemyPortraits[e.templateId],
                        enemy: e
                    },
                    actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target && a.target.name == e.name && a.target.side == 'enemy')
                } satisfies VisualUnitProps
                // })
                // )
            )
            // actsWithIs
            //     .filter(a => { a.cga.target && a.cga.target.name == e.name && a.cga.target.side == 'enemy' })
            //     .forEach(a => {
            //         a.targetIndex = i
            //     })
        }
        for (const p of lastMsg.otherPlayers) {
            if (p.currentScene == lastMsg.yourScene) {
                i++
                newVups.push(
                    // alliesVisualUnitProps.set(
                    // lastMsg.otherPlayers
                    // .filter(p => p.currentScene == lastMsg.yourScene)
                    // .map((p,i) => {
                    // return 
                    {
                        name: p.heroName,
                        src: heroSprites[heroSprite(p.weapon.itemId)],
                        displayHp: p.health,
                        maxHp: p.maxHealth,
                        side: 'hero',
                        index: i,
                        actual: {
                            kind: 'otherPlayer',
                            portrait: peasantPortrait,
                            other: p,
                        },
                        actionsThatCanTargetMe: lastMsg.itemActions.filter(a => a.target && a.target.name == p.heroName && a.target.side == 'hero')
                    }
                    // }))

                )
                // actsWithIs
                // .filter(a => { a.cga.target && a.cga.target.name == p.heroName && a.cga.target.side == 'hero' })
                // .forEach(a => {
                //     a.targetIndex = i
                // })
            }

        }
        let sel = get(selectedDetail)

        console.log('syncing, setting new props and selected index')
        allVisualUnitProps.set(newVups)

        // find the previous selected detail in new units, set last index clicked
        if (sel) {
            let sel2 = sel
            let indexOfPrevDetail = newVups.findIndex(v => v.name == sel2.name && v.side == sel2.side)
            if (indexOfPrevDetail == -1) {
                lastUnitClicked.set(0)
                console.log('old detail not in new list')
            } else {
                lastUnitClicked.set(indexOfPrevDetail)
            }
        } else {
            console.log('old detail was undefined')
            lastUnitClicked.set(0)
        }
    }
}

export const extraSprites: Record<ExtraSprite, string> = {
    arrow: arrow,
    bomb: bomb,
    flame: arrow,
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

export async function nextAnimationIndex(start: boolean) {
    if (start) {
        currentAnimationIndex.set(0)

    } else {
        currentAnimationIndex.update(o => {
            return o + 1
        })

    }

    let lm = get(lastMsgFromServer)
    let cai = get(currentAnimationIndex)
    if (!lm) return
    if (cai > lm.animations.length - 1) {
        console.log('animations done, sync to recent')
        waitingForMyAnimation.set(false)
        syncVisualsToMsg(lm)
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
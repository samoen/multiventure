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
import { crossfade } from "svelte/transition";
import { quintOut } from "svelte/easing";


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


export const lastMsgFromServer: Writable<MessageFromServer | undefined> = writable();
export const previousMsgFromServer: Writable<MessageFromServer | null> = writable(null);
export const selectedDetail: Writable<UnitDetails | null> = writable(null)
export const heroVisualUnitProps: Writable<VisualUnitProps> = writable()
export let enemiesVisualUnitProps: Writable<VisualUnitProps[]> = writable([])
export let currentAnimation: Writable<BattleAnimation | undefined> = writable(undefined)
export let currentAnimationIndex: Writable<number> = writable(0)
export const animationSpeed = writable(3000)
export const animationCancelled = writable(false)

export const [send, receive] = crossfade({
    duration: (d) => Math.sqrt(d * get(animationSpeed)),

    fallback(node, params) {
        // const style = getComputedStyle(node);
        // const transform = style.transform === 'none' ? '' : style.transform;

        return {
            duration: 0,
            // easing: quintOut,
            // css: (t) => `
            //     transform: ${transform} scale(${t});
            //     opacity: ${t}
            // `
        };
    }
});
// export let animationQueue: Writable<
// (
    // BattleAnimation[]
// &{done:boolean})
// > = writable([])
export function syncVisualsToLatest(lastMsg : MessageFromServer | undefined) {
    // let lastMsg = get(lastMsgFromServer)
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
        })
        )
    }
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
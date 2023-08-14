import type { HeroName } from "$lib/server/users";
import type { EnemyInClient, EnemyName, GameActionSentToClient, MessageFromServer, OtherPlayerInfo } from "$lib/utils";
import { writable, type Writable } from "svelte/store";
import peasantPortrait from '$lib/assets/portraits/peasant.webp';
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

export const lastMsgFromServer: Writable<MessageFromServer | null> = writable(null);
export const selectedDetail: Writable<UnitDetails | null> = writable(null)

lastMsgFromServer.subscribe((l) => {
    if (l) {
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
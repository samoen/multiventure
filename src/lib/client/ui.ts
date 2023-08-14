import type { GameActionSentToClient } from "$lib/utils";
import { writable } from "svelte/store";

// export let waitingForMyEvent = true;
// export let status = 'starting up';

export let clientState = writable({
    waitingForMyEvent: true,
    status:'starting up',
    selectedUnit : null as (string | null),
})

export async function choose(chosen: GameActionSentToClient) {
    clientState.update((s)=>{
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
        clientState.update((s)=>{

            s.waitingForMyEvent = false;
            s.status = 'playing';
            return s
        })
        return;
    }
    clientState.update(s=>{
        s.status = 'waiting for my event';
        return s
    })
}
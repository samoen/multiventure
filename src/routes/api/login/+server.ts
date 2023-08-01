import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isJoin, type PlayerState, type User } from '$lib';
import { FAKE_LATENCY, players } from '$lib/server/gameState';

export const POST: RequestHandler = async (r) => {
    let msg = await r.request.json()
    if(!isJoin(msg)){
        return json('malformed login', { status: 400 });
    }
    // if(players.has(msg.join) && players.get(msg.join).connectionState){
    //     return json('hero already connected', {status:401})
    // }
    console.log('logging in ' + msg.join)
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY))

    // new user
    if(!players.has(msg.join)){
        players.set(msg.join,{connectionState:null, playerState: {heroName:msg.join,in:'forest'} satisfies PlayerState} satisfies User)
    }
    r.cookies.set('hero', msg.join,{ path: '/' })

    return json({yes:'good'});
};
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAttack, isTravel, type MsgFromServer, type PlayerState } from '$lib';
import { FAKE_LATENCY, getAvailableActionsForPlayer, locations, players, sendEveryoneWorld } from '$lib/server/gameState';


export const POST = (async (r) => {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY))
    let msg = await r.request.json()
    
    //console.log('got move ' + JSON.stringify(msg))
    if(!isTravel(msg) && !isAttack(msg)){
        return json('malformed move', { status: 400 });
    }
    let hero = r.cookies.get('hero');
    if(!hero || !players.has(hero)){
        return json('hero not found', { status: 401 });
    }
    let player = players.get(hero)
    if(isTravel(msg)){
        console.log(`${hero} wants to go to ${msg.go}`)
        let validActions = getAvailableActionsForPlayer(player.playerState).map((awd)=>JSON.stringify(awd.action))
        if (!validActions.includes(JSON.stringify(msg))){
                return json({err:'situation has changed, cannot',thing: msg}, { status: 401 });
        }
        player.playerState.in = msg.go

        // let nextplace = locations[pstate.in].options[msg.option].go
        // players.get(from).playerState.in = nextplace
    }

    // tiny timeout so endpoint returns before the event messages get sent
    setTimeout(()=>{
        sendEveryoneWorld()
    },FAKE_LATENCY)

    return json({sucess:"yessir"});
}) satisfies RequestHandler;

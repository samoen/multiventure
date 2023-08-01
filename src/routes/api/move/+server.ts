import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isChoose, isJoin, type MsgFromServer, type PlayerState } from '$lib';
import { locations, players, sendEveryoneWorld } from '$lib/server/gameState';


export const POST = (async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    let msg = await r.request.json()
    
    //console.log('got move ' + JSON.stringify(msg))

    if(!isChoose(msg)){
        return json('malformed move', { status: 400 });
    }
    let from = r.cookies.get('hero');
    if(!from || !players.has(from)){
        return json('hero not found', { status: 401 });
    }
        console.log(`${from} chose ${msg.option}`)
        let pstate : PlayerState = players.get(from).playerState
        let nextplace = locations[pstate.in].options[msg.option].go
        players.get(from).playerState.in = nextplace
        sendEveryoneWorld()

        return json({good:"yep"});
    // return json({
    //     yourName:from,
    //     players:Array.from(players.values()),
    //     scene:locations[players.get(from).in]
    // } satisfies MsgFromServer
    // }
}) satisfies RequestHandler;

// let areas = [
//     'forest', 'castle'

import type { MsgFromServer, PlayerState, Scene, User } from "$lib";

// ]

export const players = new Map<string,User>()

const textEncoder = new TextEncoder();
// let users = new Map<User, Set<Controller>>();
// let users : ChatUser[] = [];

export function sendEveryoneWorld() {
  for (const user of players.values()) {
    if(user.connectionState && user.connectionState.con){
        let msg : MsgFromServer = {
            yourName:user.playerState.heroName,
            players:Array.from(players.values()).map((u)=>{return u.playerState}),
            scene:locations[players.get(user.playerState.heroName).playerState.in]
        }
        user.connectionState.con.enqueue(encode(`world`,msg))
    }
  }
};

export function encode(event: string, data: Object) {
  return textEncoder.encode(`event:${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const locations = {
    'forest':{
        text:'you are in a forest',
        options:[
            {
                go:'castle',
                desc:'hike to the castle'
            },
    ]},
    'castle':{
        text:'you are at the castle',
        options:[
            {
                go:'forest',
                desc:'screw this go back to forest'
                
            },
            {
                go:'throne',
                desc:'yeye approach the throne'
        
            }
    ]},
    'throne':{
        text:'you are at the throne room',
        options:[
            {
                go:'forest',
                desc:'run to the forest'
                
            },
    ]},
} satisfies Record<string,Scene>

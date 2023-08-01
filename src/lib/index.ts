import type { locations } from "./server/gameState"

export type MsgFromServer = {
    yourName:string,
    players:PlayerState[],
    sceneText:string,
    actions:GameActionWithDescription[]
}

export function isMsgFromServer(msg:Object):msg is MsgFromServer{
    return "yourName" in msg
}

export type User = {
    connectionState:{ip:string, con:Controller}
    playerState:PlayerState
}

export type Controller = ReadableStreamController<unknown>;

export type PlayerState = {
    heroName:string
    in:LocationKey
}

// type MsgFromClient = JoinGame | ChooseOption

export type LocationKey = keyof typeof locations
export type Scene = typeof locations[LocationKey]
// export type Scene = {
//     text:string,
//     options:GameActionWithDescription[]
// }

export type GameActionWithDescription = {
    desc:string,
    action:GameAction   
}

export type GameAction = Travel | Attack
export type Travel = {
    go:LocationKey
}
export function isTravel(msg:Object): msg is Travel{
    return "go" in msg
}
export type Attack = {
    who:string
}
export function isAttack(msg:Object): msg is Attack{
    return "who" in msg
}

export type JoinGame = {
    join:string
}

export function isJoin(msg:Object): msg is JoinGame{
    // return msg.hasOwnProperty('join')
    return "join" in msg
}


// export type ChooseOption = {
    // name:string,
    // option:number
// }



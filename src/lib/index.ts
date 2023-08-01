
export type MsgFromServer = {
    yourName:string,
    players:PlayerState[],
    scene:Scene,
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

type LocationKey = 'forest' | 'castle' | 'throne'

export type Scene = {
    text:string,
    options:Option[]
}

export type Option = {
    go:LocationKey,
    desc:string,
}

export type JoinGame = {
    join:string
}

export function isJoin(msg:Object): msg is JoinGame{
    // return msg.hasOwnProperty('join')
    return "join" in msg
}

export function isChoose(msg:Object): msg is ChooseOption{
    // return msg.hasOwnProperty('option')
    return "option" in msg
}

export type ChooseOption = {
    // name:string,
    option:number
}



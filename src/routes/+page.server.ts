import { players } from '$lib/server/gameState';
import type { PageServerLoad } from './$types';

export const load = (async (r) => {
	console.log('running page server load');
	let heroName = r.cookies.get('hero');
	if (!heroName) {
		return {
			loggedIn: false
		};
	}
	if (!players.has(heroName)) {
		console.log('cookie hero not present in player list');
		r.cookies.delete('hero', { path: '/' });
		return {
			loggedIn: false
		};
	}

	// let st : MsgFromServer = {
	//             yourName:heroName,
	//             players:Array.from(players.values()).map((u)=>{return u.playerState}),
	//             scene:locations[players.get(heroName).playerState.in]
	//         }

	return {
		loggedIn: true,
		LoggedInAs: heroName
		// state: st,
	};
}) satisfies PageServerLoad;

// async function sleep(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms))
//   }

//   export const actions = {
//     login: async (r) => {
//       const formData = await r.request.formData()
//       const loginAs = String(formData.get('join'))

//       if (!loginAs) {
//         return fail(400, { missing: true })
//       }

//       await sleep(1000)
//       if(!players.has(loginAs)){
//         players.set(loginAs,{heroName:loginAs,in:'forest'} satisfies PlayerState)
//     }

//      r.cookies.set('hero', loginAs,{ path: '/' })

//     //   addTodo(todo)

//       return { success: true }
//     },
//     // logout: async ({ request }) => {
//     //   const formData = await request.formData()
//     //   const todoId = Number(formData.get('id'))
//     //   removeTodo(todoId)
//     // },
//   }

// export const actions = {
//     default: async (event) => {

//     }
// } satisfies Actions;

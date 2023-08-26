import { activePlayers, users } from '$lib/server/users';
import type { DataFirstLoad } from '$lib/utils';
import type { PageServerLoad } from './$types';

// This runs on the server once when the page is first requested
export const load = (async (r) => {
	console.log('running page server load');
	let dtl : DataFirstLoad = {}
	// Check cookie to enable auto-subscribe
	
	let uid = r.cookies.get('uid')
	let hero = r.cookies.get('hero')
	if (!uid || !hero) {
		// let guestNumber = 1
		// for (const existingHero of users){

		// }
		dtl.cookieMissing = true
		return dtl
	}

	let player = users.get(uid)
	if (!player) {
		console.log(`cookie ${uid} not present in player list ${JSON.stringify(Array.from(users.keys()).map(k=>k))}`);
		dtl.noPlayer = true
		dtl.yourHeroCookie = hero

		return dtl
	}
	if(player.heroName != hero){
		dtl.noMatch = true
		return dtl
	}

		dtl.readyToSubscribe=true
		dtl.userId = uid
	return dtl
	
	// return {
	// 	loggedIn: true,
	// 	loggedInAs: heroName,
	// 	hadCookie: true,
	// 	cookie: uid
	// };
}) satisfies PageServerLoad;

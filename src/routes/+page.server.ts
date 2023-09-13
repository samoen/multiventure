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
		dtl.cookieMissing = true
		return dtl
	}
	dtl.yourHeroCookie = hero
	dtl.userId = uid

	let player = users.get(uid)
	if (!player) {
		console.log(`cookie ${uid} not present in player list ${JSON.stringify(Array.from(users.keys()).map(k=>k))}`);
		dtl.noPlayer = true
		return dtl
	}
	if(player.displayName != hero){
		dtl.noMatch = true
		return dtl
	}

	dtl.readyToSubscribe=true
	return dtl
	
	// return {
	// 	loggedIn: true,
	// 	loggedInAs: heroName,
	// 	hadCookie: true,
	// 	cookie: uid
	// };
}) satisfies PageServerLoad;

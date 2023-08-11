import { activePlayers, users } from '$lib/server/users';
import type { PageServerLoad } from './$types';

// This runs on the server once when the page is first requested
export const load = (async (r) => {
	console.log('running page server load');

	// Check cookie to enable auto-subscribe
	
	let uid = r.cookies.get('uid')
	let hero = r.cookies.get('hero')
	if (!uid || !hero) {
		return {
			cookieMissing:true
		};
	}

	let player = users.get(uid)
	if (!player) {
		console.log(`cookie ${uid} not present in player list ${JSON.stringify(Array.from(users.keys()).map(k=>k))}`);
		return {
			noPlayer:true,
			yourHeroCookie:hero,
		};
	}
	if(player.heroName != hero){
		return{
			noMatch:true
		}
	}

	return {
		readyToSubscribe:true,
	}
	
	// return {
	// 	loggedIn: true,
	// 	loggedInAs: heroName,
	// 	hadCookie: true,
	// 	cookie: uid
	// };
}) satisfies PageServerLoad;

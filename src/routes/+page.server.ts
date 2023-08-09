import { activePlayers, users } from '$lib/server/users';
import type { PageServerLoad } from './$types';

// This runs on the server once when the page is first requested
export const load = (async (r) => {
	console.log('running page server load');

	// Check cookie to enable auto-login
	let heroName = r.cookies.get('hero');
	if (!heroName) {
		return {
			loggedIn: false,
			loggedInAs:'noone',
			hadCookie: false,
			cookie: 'noone',
		};
	}
	if (!users.has(heroName)) {
		console.log(`cookie hero ${heroName} not present in player list ${JSON.stringify(activePlayers().map(p=>p.heroName))}`);
		// r.cookies.delete('hero', { path: '/' });
		return {
			loggedIn: false,
			loggedInAs:'noone',
			hadCookie: true,
			cookie: heroName
		};
	}
	
	return {
		loggedIn: true,
		loggedInAs: heroName,
		hadCookie: true,
		cookie: heroName
	};
}) satisfies PageServerLoad;

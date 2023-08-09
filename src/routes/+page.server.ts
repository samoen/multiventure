import { users } from '$lib/server/users';
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
		};
	}
	if (!users.has(heroName)) {
		console.log('cookie hero not present in player list');
		r.cookies.delete('hero', { path: '/' });
		return {
			loggedIn: false,
			loggedInAs:'noone',
		};
	}

	return {
		loggedIn: true,
		loggedInAs: heroName
	};
}) satisfies PageServerLoad;

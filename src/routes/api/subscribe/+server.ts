import { activePlayers, activePlayersInScene, users } from '$lib/server/users';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FAKE_LATENCY, encode, pushHappening, sendEveryoneWorld } from '$lib/server/messaging';
import { enterSceneOrWakeup, updateAllPlayerActions } from '$lib/server/logic';

export const GET: RequestHandler = async (event) => {
	try {
		await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
		// let ip: string;
		// try {
		// 	ip = event.getClientAddress();
		// } catch (e) {
		// 	return json({ error: 'no ip' }, { status: 401 })
		// }
		const from = event.cookies.get('hero');
		const fromId = event.cookies.get('uid');
		console.log(`stream requested by: ${from} ${fromId}`);
		if (!from) {
			return json({ error: 'need hero cookie to start a stream' }, { status: 401 });
		}
		if (!fromId) {
			return json({ error: 'need uid cookie to start a stream' }, { status: 401 });
		}
		const player = users.get(fromId);
		if (!player) {
			return json({ error: 'hero not found' }, { status: 401 });
		}
		if (player.heroName != from) {
			return json({ error: 'cookie hero not matching hero from cookie id' }, { status: 401 });
		}
		console.log(`returning readableString for ${player.heroName}, current connections ${JSON.stringify(activePlayers().map(p => p.heroName))}`)
		if (player.connectionState != null && player.connectionState.stream != null) {
			// return json({ error: 'user already connected' }, { status: 401 });
			// if (player.connectionState.con != null) {
			console.log(`${player.heroName} subscribing but already subscribed`);
			try{
				player.connectionState.con?.close()
			}catch(e){
				console.log('failed to close')
			}

			// player.connectionState.con.enqueue(encode('closing', {}));

			// // wait for old subscriber to cancel. Improve this
			// await new Promise((r) => {
			// 	setTimeout(r, 1000);
			// }); 
			// }

			// player.connectionState = null;
		}
		player.connectionState = {
			// ip: null,
			con: null,
			stream: null
		};

		let rs = new ReadableStream({
			start: (c) => {
				if (!player || !player.connectionState) return
				console.log(`stream started for hero ${player.heroName}`);
				// player.connectionState.ip = ip;
				player.connectionState.con = c;
				pushHappening(`${player.heroName} joined the game`)
				setTimeout(() => {
					// modifyEnemies()
					enterSceneOrWakeup(player)
					updateAllPlayerActions()
					sendEveryoneWorld(from);
					if (player.connectionState && player.connectionState.con) {
						player.connectionState.con.enqueue(encode(`firstack`, { yes: 'okk' }));
						// player.animations = []
					}
				}, 1);
			},
			cancel: (reason) => {
				console.log(`stream cancel handle for hero ${player.heroName}`);
				if (reason) console.log(`reason: ${reason}`)
				// try {
				// 	if(player.connectionState && player.connectionState.con){
				// 		player.connectionState.con.close();
				// 	}
				//     console.log(`stream cancel handler successfully closed controller for ${ip} ${from}`);
				// } catch (e) {
				//     console.log(`stream cancel handler failed to close controller for ${ip} ${from} because ${e}`);
				// }
				pushHappening(`${player.heroName} left the game`)
				player.connectionState = null;

				setTimeout(() => {
					// modifyEnemies()
					sendEveryoneWorld(from);
				}, 1);
			}
		});
		player.connectionState.stream = rs;

		return new Response(rs, {
			headers: {
				connection: 'keep-alive',
				'cache-control': 'no-store',
				'content-type': 'text/event-stream'
			}
		});
	} catch (e) {
		console.log('caught error during subscribe')
		console.error(e)
		return json({ oops: true }, { status: 500 })
	}
};


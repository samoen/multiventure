import { FAKE_LATENCY, pushHappening, sendEveryoneWorld, updateAllPlayerActions } from '$lib/server/messaging';
import { activePlayers, users } from '$lib/server/users';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activeEnemies, modifiedEnemyHealth } from '$lib/server/enemies';
import { scenes } from '$lib/server/scenes';

export const GET: RequestHandler = async (event) => {
	try {
		await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY));
		let ip: string;
		try {
			ip = event.getClientAddress();
		} catch (e) {
			return json({ error: 'no ip' }, { status: 401 })
		}
		const from = event.cookies.get('hero');
		console.log(`stream requested by: ${ip} ${from}`);
		if (!from) {
			return json({ error: 'need hero cookie to start a stream' }, { status: 401 });
		}
		const player = users.get(from);
		if (!player) {
			return json({ error: 'hero not found' }, { status: 401 });
		}
		console.log(`returning readableString for ${player.heroName}, current connections ${JSON.stringify(activePlayers().map(p=>p.heroName))}`)
		if (player.connectionState != null && player.connectionState.stream != null) {
			// return json({ error: 'user already connected' }, { status: 401 });
			// if (player.connectionState.con != null) {
			console.log(`${player.heroName} subscribing but already subscribed`);
			player.connectionState.con?.close()
			
			// player.connectionState.con.enqueue(encode('closing', {}));

			// // wait for old subscriber to cancel. Improve this
			// await new Promise((r) => {
			// 	setTimeout(r, 1000);
			// }); 
			// }

			// player.connectionState = null;
		}
		player.connectionState = {
			ip: null,
			con: null,
			stream: null
		};

		let rs = new ReadableStream({
			start: (c) => {
				if (!player || !player.connectionState) return
				console.log(`stream started with: ${ip}, hero ${player.heroName}`);
				player.connectionState.ip = ip;
				player.connectionState.con = c;
				pushHappening('----');
				pushHappening(`${player.heroName} joined the game`)
				for(const enemy of activeEnemies){
					if(!scenes.get(enemy.currentScene)?.solo){
						let percentHealthBefore = enemy.currentHealth / enemy.maxHealth
						enemy.maxHealth = modifiedEnemyHealth(enemy.template.baseHealth)
						enemy.currentHealth = percentHealthBefore * enemy.maxHealth
					}
				}
				updateAllPlayerActions()
				setTimeout(() => {
					sendEveryoneWorld(from);
				}, 1);
			},
			cancel: (reason) => {
				console.log(`stream cancel handle for ${ip} ${player.heroName}`);
				if(reason) console.log(`reason: ${reason}`)
				// try {
				// 	if(player.connectionState && player.connectionState.con){
				// 		player.connectionState.con.close();
				// 	}
				//     console.log(`stream cancel handler successfully closed controller for ${ip} ${from}`);
				// } catch (e) {
				//     console.log(`stream cancel handler failed to close controller for ${ip} ${from} because ${e}`);
				// }
				pushHappening(`----`)
				pushHappening(`${player.heroName} left the game`)
				player.connectionState = null;
				setTimeout(() => {
					sendEveryoneWorld(from);
				}, 1);
			}
		});
		player.connectionState.stream = rs;

		// setTimeout(()=>{
		// 	if(
		// 		(player.connectionState != null && player.connectionState.stream != null && !player.connectionState?.stream?.locked)				
		// 		){
		// 			console.log(`${player.heroName} subscribed but afterwards the stream is not locked`)
		// 		}
		// },1000)
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

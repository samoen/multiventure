import type { Controller } from '$lib/utils';
import { players, sendEveryoneWorld } from '$lib/server/gameState';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	await new Promise((resolve) => setTimeout(resolve, 500));
	let controller: Controller;
	const ip = event.getClientAddress();
	const from = event.cookies.get('hero');
	console.log(`stream requested by: ${ip} ${from}`);
	if (!from || !players.has(from)) {
		// console.log('hey')
		return json({ error: 'need hero cookie to start a stream' }, { status: 401 });
	}
	const player = players.get(from);
	if (player.connectionState != null) {
		player.connectionState.con.close();
		player.connectionState = null;
		// return json({error:'hero is already connected'},{status:400})
	}
	// let i = new ReadableStream()

	return new Response(
		new ReadableStream({
			start: async (c) => {
				console.log(`stream started with: ${ip}, hero ${from}`);
				controller = c;
				player.connectionState = { ip: ip, con: controller };
				sendEveryoneWorld();
			},
			cancel: () => {
				console.log(`stream cancelled by ${ip}`);
				try {
					controller.close();
				} catch (e) {
					console.log(`failed to close controller ${e}`);
				}
				// users = users.filter((u)=>{
				//   return u.con !== controller
				// })
				player.connectionState = null;
				// players.forEach((p)=>{
				//     if(p.connectionState.con == controller){
				//         p.connectionState = null
				//     }
				// })
			}
		}),
		{
			headers: {
				connection: 'keep-alive',
				'cache-control': 'no-store',
				'content-type': 'text/event-stream'
			}
		}
	);
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { users } from '$lib/server/users';
import { encode, sendEveryoneWorld } from '$lib/server/messaging';

export const GET: RequestHandler = async (event) => {
	await new Promise((resolve) => setTimeout(resolve, 500));
	const ip = event.getClientAddress();
	const from = event.cookies.get('hero');
	console.log(`stream requested by: ${ip} ${from}`);
	if (!from || !users.has(from)) {
		return json({ error: 'need hero cookie to start a stream' }, { status: 401 });
	}
	const player = users.get(from);
	if(!player){
		return json({ error: 'hero not found' }, { status: 401 });
	}
	if (player?.connectionState != null) {
		if (player.connectionState.con != null) {
			console.log(`${from} subscribing but already subscribed. sending close message`);
			player.connectionState.con.enqueue(encode('closing', {}));
			
			// wait for old subscriber to cancel. Improve this
			await new Promise((r) => {
				setTimeout(r, 1000);
			}); 
		}

		player.connectionState = null;
	}
	player.connectionState = {
		ip: null,
		con: null,
		stream: null
	};

	let rs = new ReadableStream({
		start: async (c) => {
			if(!player || !player.connectionState)return
			console.log(`stream started with: ${ip}, hero ${from}`);
			player.connectionState.ip = ip;
			player.connectionState.con = c;
			setTimeout(() => {
				sendEveryoneWorld(from);
			}, 1);
		},
		cancel: () => {
			console.log(`stream cancel handle for ${ip} ${from}`);
			// try {
			//     controller.close();
			// } catch (e) {
			//     console.log(`stream cancel handler failed to close controller for ${ip} ${from} because ${e}`);
			// }
			player.connectionState = null;
			setTimeout(() => {
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
};

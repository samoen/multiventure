import {
	encode,
	players,
	sendEveryoneWorld,
	type ServerSentEventController
} from '$lib/server/gameState';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	await new Promise((resolve) => setTimeout(resolve, 500));
	const ip = event.getClientAddress();
	const from = event.cookies.get('hero');
	console.log(`stream requested by: ${ip} ${from}`);
	if (!from || !players.has(from)) {
		// console.log('hey')
		return json({ error: 'need hero cookie to start a stream' }, { status: 401 });
	}
	const player = players.get(from);
	if (player.connectionState != null) {
		if (player.connectionState.con != null) {
			console.log(`${from} subscribing but already subscribed. sending close message`);
			player.connectionState.con.enqueue(encode('closing', {}));
			await new Promise((r) => {
				setTimeout(r, 1000);
			}); // wait for old subscriber to cancel
		}

		player.connectionState = null;
	}
	player.connectionState = {
		ip: null,
		con: null,
		stream: null
	};
	// let controller: ServerSentEventController;
	let rs = new ReadableStream({
		start: async (c) => {
			console.log(`stream started with: ${ip}, hero ${from}`);
			// controller = c;
			player.connectionState.ip = ip;
			// player.connectionState.con = controller;
			player.connectionState.con = c;
			sendEveryoneWorld();
		},
		cancel: () => {
			console.log(`stream cancel handle for ${ip} ${from}`);

			// try {
			//     controller.close();
			// } catch (e) {
			//     console.log(`stream cancel handler failed to close controller for ${ip} ${from} because ${e}`);
			// }
			player.connectionState = null;
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

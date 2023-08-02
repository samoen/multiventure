<script lang="ts">
	import {
		isMsgFromServer,
		type GameAction,
		type MsgFromServer
	} from '$lib';
	import { onMount } from 'svelte';

	export let data;
	let loginInput: string;
	let source: EventSource;
	let lastMsgFromServer: MsgFromServer;

	async function choose(act: GameAction) {
		loading = true;
		status = 'waiting for action';
		let f = await fetch('/api/move', {
			method: 'POST',
			body: JSON.stringify(act)
		});
		if (!f.ok) {
			// let res = await f.json();
			// console.log(res);
			loading = false;
			status = 'playing';
			return;
		}
		status = 'waiting for event';

		// invalidateAll();
		// lastMsgFromServer = res;
	}

	function subscribeEvents() {
		source = new EventSource('/api/subscribe');
		source.addEventListener('world', (e) => {
			let sMsg = JSON.parse(e.data);
			if (!isMsgFromServer(sMsg)) {
				console.log('malformed event from server');
				return;
			}
			lastMsgFromServer = sMsg;
			status = 'playing';
			loading = false;
		});
		source.addEventListener('error', (e) => {
			console.log('source error');
			status = 'recovering from source error hopefully..';
			// source.close();
		});
	}
	let status = 'mounting';
	onMount(() => {
		console.log('mounted with ' + JSON.stringify(data));
		if (data.loggedIn && !source) {
			status = 'auto logging in';
			subscribeEvents();
		} else {
			status = 'need manual login';
			loading = false;
		}
	});

	// onDestroy(() => {
	//     console.log('destroying page')
	// });

	async function logOut() {
		// document.cook .cookies.remove('hero')
		loading = true;
		status = 'waiting for logout';
		let f = await fetch('/api/logout', { method: 'POST' });
		// let r = await f.json()
		if (source.readyState != source.CLOSED) {
			console.log('closing con from browser');
			source.close();
		}
		lastMsgFromServer = null;
		source = null;
		status = 'need manual login';
		loading = false;
	}

	let loading = true;
</script>

<p>status: {status}</p>
{#if loading}
	<p>loading...</p>
{/if}

{#if !loading && lastMsgFromServer == null}
	<p>Welcome! Please log in with your hero name:</p>
	<input type="text" bind:value={loginInput} />
	<button
		disabled={!loginInput}
		on:click={async () => {
			if (!loginInput) return;
			loading = true;
			status = 'waiting for login';
			let joincall = await fetch('/api/login', {
				method: 'POST',
				body: JSON.stringify({ join: loginInput }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			let res = await joincall.json();
			loginInput = '';
			// loading = false
			// invalidateAll()
			if (joincall.ok) {
				status = 'waiting for first world';
				subscribeEvents();
			} else {
				console.log('joincall not ok');
			}

			// }
		}}>Log in</button
	>
{/if}

<!-- {#if source && source.readyState == source.OPEN}
<p>
    source is open
</p> 
{/if} -->

{#if lastMsgFromServer && (!source || source.readyState != source.OPEN)}
	<p>event source got closed.. if stuck here there's a bug</p>
{/if}

{#if !loading && lastMsgFromServer && source && source.readyState == source.OPEN}
	<p>
		I am {lastMsgFromServer.yourName}
		<button on:click={logOut}>log out</button>
	</p>
	<p>players:</p>
	{#each lastMsgFromServer.players as p}
		<p>
			{p.heroName} is in {p.in}
		</p>
		<p />{/each}
	scene:
	<p>{lastMsgFromServer.sceneText}</p>
	{#each lastMsgFromServer.actions as op, i}
		<button on:click={() => choose(op.action)}>{op.desc}</button>
	{/each}
{/if}

<script lang="ts">
	import {
		isMsgFromServer,
		type GameAction,
		type MsgFromServer,
		type GameActionSentToClient,

	} from '$lib/utils';
	import { onMount } from 'svelte';

	export let data;
	let loginInput: string;
	let source: EventSource;
	let lastMsgFromServer: MsgFromServer;
	let loading = true;
	let waitingForMyEvent = true;
	let status = 'starting up';

	async function choose(chosen: GameActionSentToClient) {
		waitingForMyEvent = true;
		status = 'submitting action';
		let f = await fetch('/api/action', {
			method: 'POST',
			body: JSON.stringify({id:chosen.id})
		});
		if (!f.ok) {
			// let res = await f.json();
			// console.log(res);
			waitingForMyEvent = false;
			status = 'playing';
			return;
		}
		status = 'waiting for my event';

		// invalidateAll();
		// lastMsgFromServer = res;
	}

	function subscribeEvents() {
		status = 'subscribing to events'
		waitingForMyEvent = true
		source = new EventSource('/api/subscribe');

		source.addEventListener('world', (e) => {

			let sMsg = JSON.parse(e.data);
			if (!isMsgFromServer(sMsg)) {
				console.log('malformed event from server');
				return;
			}
			lastMsgFromServer = sMsg;
			if (waitingForMyEvent && sMsg.triggeredBy == sMsg.yourName) {
				status = 'playing';
				waitingForMyEvent = false
				loading = false
			}
		});
		source.addEventListener('closing', (e) => {
			console.log('got closing msg');
			source.close();
			status = 'you logged in elsewhere, connection closed';
			lastMsgFromServer = null;
		});
		source.addEventListener('error', (e) => {
			console.log('source error');
			status = 'recovering from source error hopefully..';
			// source.close();
		});
	}
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
		lastMsgFromServer = null;
		loading = true;
		status = 'submitting logout';
		let f = await fetch('/api/logout', { method: 'POST' });
		// let r = await f.json()
		status = 'unsubscribing from events'
		if (source.readyState != source.CLOSED) {
			console.log('closing con from browser');
			source.close();
		}
		source = null;
		status = 'need manual login';
		loading = false;
	}

</script>

<h3>status: {status}</h3>
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
			status = 'submitting login';
			let joincall = await fetch('/api/login', {
				method: 'POST',
				body: JSON.stringify({ join: loginInput }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			// let res = await joincall.json();
			loginInput = '';
			if (joincall.ok) {
				status = 'waiting for first event';
				subscribeEvents();
			} else {
				console.log('joincall not ok');
			}
		}}>Log in</button
	>
{/if}

{#if lastMsgFromServer && (!source || source.readyState != source.OPEN)}
	<p>event source got closed.. if stuck here there's a bug</p>
{/if}

{#if lastMsgFromServer && source && source.readyState == source.OPEN}
	<p>
		I am {lastMsgFromServer.yourName}
		<button on:click={logOut}>log out</button>
	</p>
	<h3>Other Players:</h3>
	{#each lastMsgFromServer.otherPlayers as p}
		<p>
			{p.heroName} is in {p.currentScene} with {p.health}hp
			{p.inventory.length > 0 ? `carrying ${p.inventory}` : ''}
		</p>
		<p />
	{/each}
	<h3>{lastMsgFromServer.yourName}:</h3>
	<p>Health: {lastMsgFromServer.yourHp}</p>
	<p>Inventory: {lastMsgFromServer.yourInventory}</p>
	<p>Current Scene: {lastMsgFromServer.yourScene}</p>
	<h3>Scene:</h3>
	{#each lastMsgFromServer.sceneTexts as t}
		<p>{t}</p>
	{/each}
	{#each lastMsgFromServer.actions as op, i}
		<button 
			on:click={() => choose(op)}
			disabled={waitingForMyEvent}
			>
			{op.buttonText}
		</button>
	{/each}
{/if}

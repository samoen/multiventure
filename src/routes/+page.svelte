<script lang="ts">
	import { isMsgFromServer, type MessageFromServer, type GameActionSentToClient } from '$lib/utils';
	import { onMount, tick } from 'svelte';

	export let data;
	let loginInput: string;
	let source: EventSource | null;
	let lastMsgFromServer: MessageFromServer | null;
	let loading = true;
	let waitingForMyEvent = true;
	let status = 'starting up';

	async function choose(chosen: GameActionSentToClient) {
		waitingForMyEvent = true;
		status = 'submitting action';
		let f = await fetch('/api/action', {
			method: 'POST',
			body: JSON.stringify({ buttonText: chosen.buttonText })
		});

		if (f.status > 399) {
			// let res = await f.json();
			console.log('action submit failed');
			waitingForMyEvent = false;
			status = 'playing';
			return;
		}
		status = 'waiting for my event';

		// invalidateAll();
		// lastMsgFromServer = res;
	}
	let happenings: HTMLElement;

	function subscribeEventsIfNotAlready() {
		if (source != null && source.readyState != EventSource.CLOSED) {
			console.log('no need to subscribe');
			return;
		}
		status = 'subscribing to events';
		waitingForMyEvent = true;
		try{
			source = new EventSource('/api/subscribe');
		}catch(e){
			console.log('failed to source')
			console.error(e)
			return
		}
		source.onerror = function (ev) {
			console.error(`event source error ${JSON.stringify(ev)}`, ev);
			status = 'Event source errored, need manual action';
			this.close();
			lastMsgFromServer = null;
			loading = false;
		};

		source.addEventListener('world', async (e) => {
			let sMsg = JSON.parse(e.data);
			if (!isMsgFromServer(sMsg)) {
				console.log('malformed event from server');
				return;
			}
			lastMsgFromServer = sMsg;
			if (waitingForMyEvent && sMsg.triggeredBy == sMsg.yourName) {
				status = 'playing';
				waitingForMyEvent = false;
				loading = false;
			}
			await tick();
			if (happenings) happenings.scroll({ top: happenings.scrollHeight, behavior: 'smooth' });
		});
		source.addEventListener('closing', (e) => {
			console.log('got closing msg');
			source?.close();
			status = 'you logged in elsewhere, connection closed';
			lastMsgFromServer = null;
		});
	}
	let runTimeData : {loggedIn:boolean,loggedInAs:string} | undefined;
	onMount(() => {
		runTimeData = structuredClone(data)
		console.log('mounted with ssr data ' + JSON.stringify(data));
		// console.log('source ' + h)
		// h = 'blah'
		if (runTimeData.loggedIn) {
			console.log(`ssr data says cookie ${runTimeData.loggedInAs} is good. auto-subscribing..`);
			// if(source == null){
			status = 'auto subscribing';
			subscribeEventsIfNotAlready();
			// }
		} else {
			status = 'need manual login';
			loading = false;
		}
	});

	async function logOut() {
		lastMsgFromServer = null;
		loading = true;
		status = 'submitting logout';
		let f = await fetch('/api/logout', { method: 'POST' });
		// let r = await f.json()
		status = 'unsubscribing from events';
		if (source?.readyState != source?.CLOSED) {
			console.log('closing con from browser');
			source?.close();
		}
		source = null;
		status = 'need manual login';
		loading = false;
	}
	async function logIn(){
		if (!loginInput) return;
			loading = true;
			status = 'submitting login';
			let usrName = loginInput
			loginInput = '';
			
			let joincall = await fetch('/api/login', {
				method: 'POST',
				body: JSON.stringify({ join: usrName }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			let res = await joincall.json();
			if(
				"alreadyConnected" in res 
				&& typeof res.alreadyConnected == 'boolean'
				&& res.alreadyConnected
				){
					console.log('login response says already connected')
					// location.reload()
			}

			if (joincall.ok) {
				runTimeData = {loggedIn:true, loggedInAs:usrName}
				status = 'waiting for first event';
				subscribeEventsIfNotAlready();
			} else {
				console.log('joincall not ok');
			}
	}
</script>

<h3>Status: {status}</h3>
{#if loading}
	<p>loading...</p>
{/if}
<br>
{#if !loading && lastMsgFromServer == null}
	<p>Welcome! Please log in with your hero name:</p>
	<input type="text" bind:value={loginInput} />
	<button
		disabled={!loginInput}
		on:click={logIn}>Log in</button
	>
{/if}

{#if lastMsgFromServer && (!source || source.readyState != source.OPEN)}
	<p>event source got closed.. if stuck here there's a bug</p>
{/if}

{#if lastMsgFromServer && source && source.readyState == source.OPEN}
<!-- <h3>Scene Texts:</h3> -->
<div class="sceneTexts">
	{#each lastMsgFromServer.sceneTexts as t}
	<p class="sceneText">{t}</p>
	{/each}
</div>
<div class='sceneButtons'>
		{#each lastMsgFromServer.actions as op, i}
		{#if op.section == 'scene'}
		<button on:click={() => choose(op)} disabled={waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/if}
			{/each}
		</div>
	<br>
	{#if lastMsgFromServer.actions.some(a=>a.section == 'item')}
	<div class='actionButtons'>
		{#each lastMsgFromServer.actions as op, i}
			{#if op.section == 'item'}
				<button on:click={() => choose(op)} disabled={waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/if}
			{/each}
		</div>
		
	{/if}
	<h3>My Hero:</h3>
	<p>
		Logged in as {lastMsgFromServer.yourName}
		<button on:click={logOut}>log out</button>
	</p>
	<p>
		{lastMsgFromServer.yourScene}, {lastMsgFromServer.yourHp}hp, {lastMsgFromServer
			.yourWeapon.itemId}
		{lastMsgFromServer.yourWeapon.cooldown || ''}
		{lastMsgFromServer.yourUtility.itemId}
		{lastMsgFromServer.yourUtility.cooldown || ''}
		{lastMsgFromServer.yourBody.itemId}
		{lastMsgFromServer.yourBody.cooldown || ''}
	</p>
	<p>{lastMsgFromServer.playerFlags} {lastMsgFromServer.globalFlags}</p>
	<h3>Nearby Enemies:</h3>
	{#each lastMsgFromServer.enemiesInScene as e}
		<p>
			<strong>{e.name}</strong> Health: {e.health}, Aggro: {e.myAggro}
		</p>
		<p />
		{/each}
	<h3>Recent happenings:</h3>
	<div class="happenings" bind:this={happenings}>
		{#each lastMsgFromServer.happenings as h}
		<p>{h}</p>
		{/each}
	</div>
	<h3>Other Players:</h3>
	{#each lastMsgFromServer.otherPlayers as p}
		<p>
			{p.heroName} is in {p.currentScene} with {p.health}hp
		</p>
		<p />
	{/each}
{/if}

<style>
	:global(body) {
		background-color: aliceblue;
	}
	h3 {
		margin-top: 15px;
		margin-bottom: 1px;
	}
	.happenings {
		display: inline-block;
		background-color: lightblue;
		max-height: 150px;
		padding-right: 10px;
		border: 1px solid black;
		overflow-y: auto;
		min-width: 150px;
	}
	button {
		margin: 5px;
	}
	p {
		margin: 5px;
	}
	.happenings > p {
		margin: 2px;
	}
	.sceneText {
		white-space: pre-wrap;
	}
	.sceneTexts {
		height: calc(340px - 20vw);
		overflow-y: auto;
		border: 1px solid black;
		background-color: lightblue;
	}
	.sceneButtons{
		display: inline-block;
		margin-top:10px;
		margin-bottom:10px;
		background-color: cadetblue;
		border: 1px solid black;
	}
	.actionButtons{
		display: inline-block;
		background-color: beige;
		border: 1px solid black;
	}

</style>

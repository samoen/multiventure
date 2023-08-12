<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { isMsgFromServer, type MessageFromServer, type GameActionSentToClient } from '$lib/utils';
	import { onMount, tick } from 'svelte';

	export let data;
	let signupInput: string;
	let signInNameInput: string;
	let signInIdInput: string;
	let source: EventSource | null;
	let lastMsgFromServer: MessageFromServer | null;
	let loading = true;
	let waitingForMyEvent = true;
	let status = 'starting up';
	let happenings: HTMLElement;
	let sceneTexts: HTMLElement;
	let autoSignup: boolean = true;

	onMount(() => {
		console.log('mounted with ssr data ' + JSON.stringify(data));

		if (data.readyToSubscribe) {
			console.log(`ssr data says cookies are good. auto-subscribing..`);
			status = 'auto subscribing';
			subscribeEventsIfNotAlready();
		} else if (data.noPlayer && data.yourHeroCookie && autoSignup) {
			console.log(`ssr data says my hero cookie not matching anyone, doing auto signup..`);
			status = 'auto signup';
			signUp(data.yourHeroCookie);
		} else {
			status = 'need manual login';
			loading = false;
		}
	});

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
	}

	function subscribeEventsIfNotAlready() {
		if (source != null && source.readyState != EventSource.CLOSED) {
			console.log('no need to subscribe');
			return;
		}
		status = 'subscribing to events';
		waitingForMyEvent = true;
		try {
			source = new EventSource('/api/subscribe');
		} catch (e) {
			console.log('failed to source');
			console.error(e);
			return;
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
			if (sceneTexts) sceneTexts.scroll({ top: sceneTexts.scrollHeight, behavior: 'smooth' });
		});
		source.addEventListener('closing', (e) => {
			console.log('got closing msg');
			source?.close();
			status = 'you logged in elsewhere, connection closed';
			lastMsgFromServer = null;
		});
		console.log('subscribed');
	}

	async function deleteHero() {
		loading = true;
		status = 'submitting hero delete';
		let f = await fetch('/api/delete', { method: 'POST' });
		if(!f.ok){
			console.log('failed delete hero request')
		}
		// let r = await f.json()
		leaveGame()
	}
	function leaveGame(){
		lastMsgFromServer = null;
		status = 'unsubscribing from events';
		if (source?.readyState != source?.CLOSED) {
			console.log('closing con from browser');
			source?.close();
		}
		source = null;
		status = 'need manual login';
		loading = false;
	}

	async function signUp(usrName: string) {
		let joincall = await fetch('/api/signup', {
			method: 'POST',
			body: JSON.stringify({ join: usrName }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		let res = await joincall.json();
		if (
			typeof res == 'object' &&
			'alreadyConnected' in res &&
			typeof res.alreadyConnected == 'boolean' &&
			res.alreadyConnected
		) {
			console.log('login response says already connected');
			// location.reload()
		}

		if (joincall.ok) {
			// if we were to re-mount (hot-reload) after this point, page data would be misleading
			invalidateAll();
			// location.reload()
			// joinedAs = usrName
			status = 'waiting for first event';
			subscribeEventsIfNotAlready();
		} else {
			console.log('joincall not ok');
			status = 'signup failed, need manual';
			loading = false;
		}
	}
	
	function signUpButtonClicked() {
		if (!signupInput) return;
		loading = true;
		status = 'submitting sign up';
		let usrName = signupInput;
		signupInput = '';
		
		signUp(usrName);
	}

	async function signInButtonClicked(){
		loading = true;
		status = 'submitting login';
		let loginCall = await fetch('/api/login', {
			method: 'POST',
			body: JSON.stringify({ heroName: signInNameInput, userId: signInIdInput }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if(!loginCall.ok){
			console.log('login nope')
			loading = false
		}
		signInIdInput = ''
		signInNameInput = ''
		// let res = await loginCall.json();
		invalidateAll()
		status = 'waiting for first event';
		subscribeEventsIfNotAlready();
	}
</script>

<h3>Status: {status}</h3>
{#if loading}
	<p>loading...</p>
{/if}
<br />
{#if !loading && lastMsgFromServer == null}
	<p>Welcome! Please sign up with your hero name:</p>
	<input type="text" bind:value={signupInput} />
	<button disabled={!signupInput} on:click={signUpButtonClicked}>Sign Up</button>
	
	<p>Or Login with your hero name and the userID generated when you signed up:</p>
	<label for="signInName">name</label>
	<input id="signInName" type="text" bind:value={signInNameInput} />
	<label for="signInId">Id</label>
	<input id="signInId"type="text" bind:value={signInIdInput} />
	<button disabled={!signInNameInput || !signInIdInput} on:click={signInButtonClicked}>Login</button>
{/if}

{#if lastMsgFromServer && (!source || source.readyState != source.OPEN)}
	<p>event source got closed.. if stuck here there's a bug</p>
{/if}

{#if lastMsgFromServer && source && source.readyState == source.OPEN}
	<!-- <h3>Scene Texts:</h3> -->
	<div class="sceneTexts" bind:this={sceneTexts}>
		{#each lastMsgFromServer.sceneTexts as t}
			<p class="sceneText">{t}</p>
			<br />
		{/each}
	</div>
	{#if lastMsgFromServer.sceneActions.length}
		<div class="sceneButtons">
			{#each lastMsgFromServer.sceneActions as op, i}
				<button on:click={() => choose(op)} disabled={waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/each}
		</div>
	{/if}
	<br />
	{#if lastMsgFromServer.itemActions.length}
		<div class="actionButtons">
			{#each lastMsgFromServer.itemActions as op, i}
				<button on:click={() => choose(op)} disabled={waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/each}
		</div>
	{/if}
	<h3>{lastMsgFromServer.yourName}:</h3>
	<p>
		Health: {lastMsgFromServer.yourHp}hp
	</p>
	<p>
		Weapon:
		{lastMsgFromServer.yourWeapon.itemId}
		{lastMsgFromServer.yourWeapon.cooldown
			? `cooldown: ${lastMsgFromServer.yourWeapon.cooldown}`
			: ''}
		{lastMsgFromServer.yourWeapon.warmup ? `warmup:${lastMsgFromServer.yourWeapon.warmup}` : ''}
	</p>
	<p>
		Utility: {lastMsgFromServer.yourUtility.itemId}
	</p>
	<p>
		Armor: {lastMsgFromServer.yourBody.itemId}
		{lastMsgFromServer.yourBody.cooldown ? `cooldown:${lastMsgFromServer.yourBody.cooldown}` : ''}
		{lastMsgFromServer.yourBody.warmup ? `warmup:${lastMsgFromServer.yourBody.warmup}` : ''}
	</p>
	<p>
		Location: {lastMsgFromServer.yourScene}
	</p>
	<!-- <p>{lastMsgFromServer.playerFlags} {lastMsgFromServer.globalFlags}</p> -->
	<h3>Nearby Enemies:</h3>
	{#each lastMsgFromServer.enemiesInScene as e}
		<p>
			<strong>{e.name}</strong> Health: {e.health}, Aggro: {e.myAggro}, statuses: {JSON.stringify(
				e.statuses
			)}
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
	<p>
		Logged in as {lastMsgFromServer.yourName} uid: {data.userId} 
		<button on:click={()=>{
			lastMsgFromServer = null
			leaveGame()
		}}>Log Out</button>
		<button on:click={deleteHero}>Delete Hero</button>
	</p>
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
		margin-top: 0px;
		margin-bottom: 0px;
	}
	.sceneTexts {
		height: calc(450px - 20vw);
		/* height: 5; */
		overflow-y: auto;
		border: 1px solid black;
		background-color: lightblue;
		padding: 10px;
	}
	.sceneButtons {
		display: inline-block;
		margin-top: 10px;
		margin-bottom: 10px;
		background-color: cadetblue;
		border: 1px solid black;
	}
	.actionButtons {
		display: inline-block;
		background-color: beige;
		border: 1px solid black;
	}
</style>

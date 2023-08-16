<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		isMsgFromServer,
		type MessageFromServer,
		type GameActionSentToClient,
		type EnemyName
	} from '$lib/utils';
	import { onMount, tick } from 'svelte';
	import peasant from '$lib/assets/peasant.png';
	import peasantPortrait from '$lib/assets/portraits/peasant.webp';
	import gruntPortrait from '$lib/assets/portraits/grunt.webp';
	import spearman from '$lib/assets/spearman.png';
	import rat from '$lib/assets/giant-rat.png';
	import grunt from '$lib/assets/grunt.png';
	import troll from '$lib/assets/young-ogre.png';
	import ruffian from '$lib/assets/ruffian.png';
	import rogue from '$lib/assets/rogue.png';
	import fireghost from '$lib/assets/fireghost.png';
	import theif from '$lib/assets/thief.png';
	import mage from '$lib/assets/mage.png';
	import type { ItemId, ItemIdForSlot } from '$lib/server/items.js';
	import Unit from '$lib/Components/Unit.svelte';
	import {
	animationCancelled,
	animationSpeed,
		choose,
		clientState,
		currentAnimation,
		currentAnimationIndex,
		enemiesVisualUnitProps,
		alliesVisualUnitProps,
		enemySprites,
		heroSprite,
		heroSprites,
		heroVisualUnitProps,
		lastMsgFromServer,
		previousMsgFromServer,
		selectedDetail,
		syncVisualsToLatest,
		type VisualUnitProps
	} from '$lib/client/ui';
	import type { EnemyTemplateId } from '$lib/server/enemies.js';
	import { crossfade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import VisualUnit from '$lib/Components/VisualUnit.svelte';
	import { get } from 'svelte/store';

	export let data;
	let signupInput: string;
	let signInNameInput: string;
	let signInIdInput: string;
	let source: EventSource | null;

	let loading = true;

	// let unitsDetails: UnitDetails[] = [];

	let happenings: HTMLElement;
	let sceneTexts: HTMLElement;
	let autoSignup: boolean = true;

	let enemyPortraits = {
		hobGoblin: gruntPortrait,
		rat: gruntPortrait,
		goblin: gruntPortrait,
		fireGremlin: gruntPortrait,
		troll: gruntPortrait
	} satisfies Record<EnemyTemplateId, string>;

	onMount(() => {
		console.log('mounted with ssr data ' + JSON.stringify(data));

		if (data.readyToSubscribe) {
			console.log(`ssr data says cookies are good. auto-subscribing..`);
			$clientState.status = 'auto subscribing';
			subscribeEventsIfNotAlready();
		} else if (data.noPlayer && data.yourHeroCookie && autoSignup) {
			console.log(`ssr data says my hero cookie not matching anyone, doing auto signup..`);
			$clientState.status = 'auto signup';
			signUp(data.yourHeroCookie);
		} else {
			$clientState.status = 'need manual login';
			loading = false;
		}
	});

	function subscribeEventsIfNotAlready() {
		if (source != null && source.readyState != EventSource.CLOSED) {
			console.log('no need to subscribe');
			return;
		}
		$clientState.status = 'subscribing to events';
		$clientState.waitingForMyEvent = true;
		try {
			source = new EventSource('/api/subscribe');
		} catch (e) {
			console.log('failed to source');
			console.error(e);
			return;
		}
		source.onerror = function (ev) {
			console.error(`event source error ${JSON.stringify(ev)}`, ev);
			$clientState.status = 'Event source errored, need manual action';
			this.close();
			$lastMsgFromServer = undefined;
			loading = false;
		};

		source.addEventListener('world', async (e) => {
			let sMsg = JSON.parse(e.data);
			if (!isMsgFromServer(sMsg)) {
				console.log('malformed event from server');
				return;
			}

			let prevMsg = structuredClone($lastMsgFromServer);
			$lastMsgFromServer = sMsg;
			if ($clientState.waitingForMyEvent && sMsg.triggeredBy == sMsg.yourName) {
				$clientState.status = 'playing';
				$clientState.waitingForMyEvent = false;
				loading = false;
			}

			console.log(`got animations: ${JSON.stringify(sMsg.animations)}`);
			console.log(`current when got ${JSON.stringify($currentAnimation)}`)
			
			// first message or no animations just sync instant
			if(
				!prevMsg
			|| (!sMsg.animations.length && $currentAnimation == undefined)
			){
				syncVisualsToLatest($lastMsgFromServer)
			}
			
			if(sMsg.animations.length && $currentAnimation != undefined && sMsg.triggeredBy == sMsg.yourName){
				// this msg was triggered by us, cancel current animation and prepare for new animation
				console.log(`cancelling animation`)
				$animationCancelled = true
				$currentAnimation = undefined
				syncVisualsToLatest(prevMsg)
				await tick()
				await new Promise(r=>setTimeout(r,100))
				$animationCancelled = false
				// syncVisualsToLatest(prevMsg)
			}

			console.log(`precheck start anim ${JSON.stringify($currentAnimation)}`)
			if(sMsg.animations.length && $currentAnimation == undefined){
				// new animations and we aren't animating, start animating
				console.log('starting anim')
				// $animationSpeed = 3000
				$lastMsgFromServer.enemiesInScene.forEach((e) => {
					let findInPrevious = $enemiesVisualUnitProps.find((pe) => pe.name == e.name);
					if (!findInPrevious) {
						$enemiesVisualUnitProps.push({
							name: e.name,
							src: enemySprites[e.templateId],
							hp: e.health,
							displayHp: e.health,
							maxHp: e.maxHealth
						});
					}
				});
				
				for (const enemyProps of $enemiesVisualUnitProps) {
					let findInNew = $lastMsgFromServer?.enemiesInScene.find((ne) => ne.name == enemyProps.name);
					if (!findInNew) {
						enemyProps.hp = 0;
					} else {
						enemyProps.hp = findInNew.health;
					}
				}
				$currentAnimationIndex = 0;
				$currentAnimation = $lastMsgFromServer.animations.at($currentAnimationIndex);
			}

			// wait for dom elements to be populated
			await tick();
			if (happenings) happenings.scroll({ top: happenings.scrollHeight, behavior: 'smooth' });
			if (sceneTexts) sceneTexts.scroll({ top: sceneTexts.scrollHeight, behavior: 'smooth' });
		});
		source.addEventListener('closing', (e) => {
			console.log('got closing msg');
			source?.close();
			$clientState.status = 'you logged in elsewhere, connection closed';
			$lastMsgFromServer = undefined;
		});
		console.log('subscribed');
	}

	async function deleteHero() {
		loading = true;
		$clientState.status = 'submitting hero delete';
		let f = await fetch('/api/delete', { method: 'POST' });
		if (!f.ok) {
			console.log('failed delete hero request');
		}
		// let r = await f.json()
		leaveGame();
	}
	function leaveGame() {
		$lastMsgFromServer = undefined;
		$clientState.status = 'unsubscribing from events';
		if (source?.readyState != source?.CLOSED) {
			console.log('closing con from browser');
			source?.close();
		}
		source = null;
		$clientState.status = 'need manual login';
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
			$clientState.status = 'waiting for first event';
			subscribeEventsIfNotAlready();
		} else {
			console.log('joincall not ok');
			$clientState.status = 'signup failed, need manual';
			loading = false;
		}
	}
	function findVisualUnitProps(name: string): VisualUnitProps | undefined {
		if (name == $lastMsgFromServer?.yourName) {
			return $heroVisualUnitProps;
		}
		let en = $enemiesVisualUnitProps.find((e) => name == e.name);
		if (en) return en;

		let ally = $alliesVisualUnitProps.find((e) => name == e.name);
		if (ally) return ally;
	}

	function signUpButtonClicked() {
		if (!signupInput) return;
		loading = true;
		$clientState.status = 'submitting sign up';
		let usrName = signupInput;
		signupInput = '';

		signUp(usrName);
	}

	async function signInButtonClicked() {
		loading = true;
		$clientState.status = 'submitting login';
		let loginCall = await fetch('/api/login', {
			method: 'POST',
			body: JSON.stringify({ heroName: signInNameInput, userId: signInIdInput }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if (!loginCall.ok) {
			console.log('login nope');
			loading = false;
		}
		signInIdInput = '';
		signInNameInput = '';
		// let res = await loginCall.json();
		invalidateAll();
		$clientState.status = 'waiting for first event';
		subscribeEventsIfNotAlready();
	}
</script>

<!-- <h3>Status: {clientState.status}</h3> -->
{#if loading}
	<p>loading...</p>
{/if}
<br />
{#if !loading && $lastMsgFromServer == null}
	<p>Welcome! Please sign up with your hero name:</p>
	<input type="text" bind:value={signupInput} />
	<button disabled={!signupInput} on:click={signUpButtonClicked}>Sign Up</button>

	<p>Or Login with your hero name and the userID generated when you signed up:</p>
	<label for="signInName">name</label>
	<input id="signInName" type="text" bind:value={signInNameInput} />
	<label for="signInId">Id</label>
	<input id="signInId" type="text" bind:value={signInIdInput} />
	<button disabled={!signInNameInput || !signInIdInput} on:click={signInButtonClicked}>Login</button
	>
{/if}

{#if $lastMsgFromServer && (!source || source.readyState != source.OPEN)}
	<p>event source got closed.. if stuck here there's a bug</p>
{/if}

{#if $lastMsgFromServer && source && source.readyState == source.OPEN}
	<!-- <h3>Scene Texts:</h3> -->
	<div class="sceneTexts" bind:this={sceneTexts}>
		{#each $lastMsgFromServer.sceneTexts as t}
			<p class="sceneText">{t}</p>
			<br />
		{/each}
	</div>
	{#if $lastMsgFromServer.sceneActions.length}
		<div class="sceneButtons">
			{#each $lastMsgFromServer.sceneActions as op, i}
				<button on:click={() => choose(op)} disabled={$clientState.waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/each}
		</div>
	{/if}
	<br />
	{#if $lastMsgFromServer.itemActions.length}
		<div class="actionButtons">
			{#each $lastMsgFromServer.itemActions as op, i}
				<button on:click={() => choose(op)} disabled={$clientState.waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/each}
		</div>
	{/if}
	<button
		on:click={() => {
			// $heroVisualUnitProps.animating = !$heroVisualUnitProps.animating
			// $currentAnimation = {source:'werdd',target:'Gorlak'}
		}}>start animating</button
	>
	<button
		on:click={() => {
			$animationSpeed = 0
			$currentAnimation = undefined
			$animationCancelled = true
		}}>cancel animate</button
	>
	<div class="visual">
		<div class="units">
			<Unit
				host={$currentAnimation?.source == $lastMsgFromServer.yourName
					? undefined
					: $heroVisualUnitProps}
				guest={$currentAnimation?.target == $lastMsgFromServer.yourName
					? findVisualUnitProps($currentAnimation.source)
					: undefined}
				acts={$lastMsgFromServer.itemActions.filter(
					(ia) =>
						ia &&
						ia.target &&
						((ia.target.kind == 'friendly' &&
							ia.target.targetName == $lastMsgFromServer?.yourName) ||
							ia.target.kind == 'onlySelf')
				)}
				clicky={() => {
					if ($lastMsgFromServer) {
						$selectedDetail = {
							kind: 'me',
							portrait: peasantPortrait,
							me: {
								myName: $lastMsgFromServer.yourName,
								myHealth: $lastMsgFromServer.yourHp
							}
						};
					}
				}}
			/>

			{#each $alliesVisualUnitProps as p}
				<Unit
					host={$currentAnimation?.source == p.name ? undefined : p}
					guest={p.name == $currentAnimation?.target
						? findVisualUnitProps($currentAnimation.source)
						: undefined}
					acts={$lastMsgFromServer.itemActions.filter(
						(ia) =>
							ia && ia.target && ia.target.kind == 'friendly' && ia.target.targetName == p.name
					)}
					clicky={() => {
						// if ($lastMsgFromServer) {
						// 	$selectedDetail = {
						// 		portrait: peasantPortrait,
						// 		other: p,
						// 		kind: 'otherPlayer'
						// 	};
						// }
					}}
				/>
			{/each}
		</div>
		<div class="units">
			{#each $enemiesVisualUnitProps as e}
				<Unit
					host={$currentAnimation?.source == e.name ? undefined : e}
					guest={e.name == $currentAnimation?.target
						? findVisualUnitProps($currentAnimation.source)
						: undefined}
					flipped={true}
					acts={$lastMsgFromServer.itemActions.filter(
						(ia) =>
							ia &&
							ia.target &&
							((ia.target.kind == 'targetEnemy' && ia.target.targetName == e.name) ||
								ia.target.kind == 'anyEnemy')
					)}
					clicky={() => {
						// $selectedDetail = {
						// 	kind: 'enemy',
						// 	enemy: e,
						// 	portrait: enemyPortraits[e.templateId]
						// };
					}}
				/>
			{/each}
		</div>
	</div>
	<div class="selectedDetails">
		<div class="selectedPortrait">
			<img class="portrait" src={$selectedDetail?.portrait} alt="portrait" />
		</div>
		<div class="selectedStats">
			{#if $selectedDetail?.kind == 'me'}
				<p>
					name: {$selectedDetail?.me.myName ?? ''}
				</p>
				<p>
					health : {$selectedDetail?.me.myHealth}/{$lastMsgFromServer.yourMaxHp}
				</p>
			{/if}
			{#if $selectedDetail?.kind == 'otherPlayer'}
				other
			{/if}
			{#if $selectedDetail?.kind == 'enemy'}
				stuff
			{/if}
		</div>
	</div>
	<h3>{$lastMsgFromServer.yourName}:</h3>
	<p>
		Health: {$lastMsgFromServer.yourHp}hp
	</p>
	<p>
		Weapon:
		{$lastMsgFromServer.yourWeapon.itemId}
		{$lastMsgFromServer.yourWeapon.cooldown
			? `cooldown: ${$lastMsgFromServer.yourWeapon.cooldown}`
			: ''}
		{$lastMsgFromServer.yourWeapon.warmup ? `warmup:${$lastMsgFromServer.yourWeapon.warmup}` : ''}
	</p>
	<p>
		Utility: {$lastMsgFromServer.yourUtility.itemId +
			', stock: ' +
			$lastMsgFromServer.yourUtility.stock}
	</p>
	<p>
		Armor: {$lastMsgFromServer.yourBody.itemId}
		{$lastMsgFromServer.yourBody.cooldown ? `cooldown:${$lastMsgFromServer.yourBody.cooldown}` : ''}
		{$lastMsgFromServer.yourBody.warmup ? `warmup:${$lastMsgFromServer.yourBody.warmup}` : ''}
	</p>
	<p>
		Location: {$lastMsgFromServer.yourScene}
	</p>
	<!-- <p>{$lastMsgFromServer.playerFlags} {$lastMsgFromServer.globalFlags}</p> -->
	<h3>Nearby Enemies:</h3>
	{#each $lastMsgFromServer.enemiesInScene as e}
		<p>
			<strong>{e.name}:</strong>
			{e.templateId}, Health: {e.health}, Aggro: {e.myAggro}, statuses: {JSON.stringify(e.statuses)}
		</p>
		<p />
	{/each}
	<h3>Recent happenings:</h3>
	<div class="happenings" bind:this={happenings}>
		{#each $lastMsgFromServer.happenings as h}
			<p>{h}</p>
		{/each}
	</div>
	<h3>Other Players:</h3>
	{#each $lastMsgFromServer.otherPlayers as p}
		<p>
			{p.heroName} is in {p.currentScene} with {p.health}hp
		</p>
		<p />
	{/each}
	<p>
		Logged in as {$lastMsgFromServer.yourName} uid: {data.userId}
		<button
			on:click={() => {
				$lastMsgFromServer = undefined;
				leaveGame();
			}}>Log Out</button
		>
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
		height: calc(400px - 20vw);
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

	.units {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 10px;
	}
	.visual {
		background-color: burlywood;
		display: flex;
		justify-content: space-around;
	}
	.selectedDetails {
		background-color: beige;
		display: inline-flex;
	}
	.selectedPortrait {
		width: 100px;
		height: 100px;
		background-color: blueviolet;
	}
	.selectedPortrait > img {
		height: 100%;
		width: 100%;
	}
	.selectedStats {
		background-color: aquamarine;
	}
</style>

<script lang="ts">
	import Unit from '$lib/Components/Unit.svelte';
	import minimap from '$lib/assets/ui/minimap.png';
	import sidebar from '$lib/assets/ui/sidebar.png';
	import {
		allVisualUnitProps,
		allies,
		centerFieldTarget,
		changeVasLocked,
		choose,
		clientState,
		convoStateForEachVAS,
		currentAnimation,
		currentAnimationIndex,
		enemies,
		handleHealAnimations,
		handleModAggros,
		handleDamageAnimation,
		handlePutsStatuses,
		lastMsgFromServer,
		lastUnitClicked,
		latestSlotButtonInput,
		nextAnimationIndex,
		receiveCenter,
		resetSceneConvos,
		selectedDetail,
		selectedVasActionsToShow,
		selectedVasResponsesToShow,
		selectedVisualActionSourceState,
		source,
		subAnimationStage,
		successcreds,
		triedSignupButTaken,
		typedInventory,
		vasesToShow,
		visualActionSources,
		visualLandscape,
		visualOpacity,
		visualSceneLabel,
		waitingForMyAnimation,
		worldReceived,

		handleResetAggro

	} from '$lib/client/ui';
	import type { MessageFromServer } from '$lib/server/messaging';
	import { onMount, tick } from 'svelte';
	import { flip } from 'svelte/animate';

	import { invalidateAll } from '$app/navigation';
	import UnitStats from '$lib/Components/UnitStats.svelte';
	import VisualActionSource from '$lib/Components/VisualActionSource.svelte';
	import { anySprites, getLandscape, getPortrait } from '$lib/client/assets';
	import { isSignupResponse, type DataFirstLoad } from '$lib/utils';
	import { writable, type Writable } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import boomSound from '$lib/assets/sfx/boom.wav'

	export let data: DataFirstLoad;
	let signupInput: string;
	let signInNameInput: string;
	let signInIdInput: string;
	let happenings: HTMLElement;
	let sceneTexts: HTMLElement;

	// set these true in dev
	let autoSignup = true;
	let autoContinue = true;

	let sourceErrored: Writable<boolean> = writable(false);

	onMount(async () => {
		console.log('mounted with ssr data ' + JSON.stringify(data));

		// In dev sometimes the page mounts but the page data is old and innaccurate
		await invalidateAll();
		console.log('invalidated, now have ssr data ' + JSON.stringify(data));
		// In dev sometimes we mount with existing state and messes up our flow
		if ($successcreds || $lastMsgFromServer || $source) {
			console.log(' mounted with existing state. clearing state');
			leaveGame();
			// wait for old source to close
			await new Promise((r) => setTimeout(r, 300));
			// invalidateAll()
			// location.reload()
			// return
		}

		if (data.readyToSubscribe && data.yourHeroCookie && data.userId) {
			$clientState.status = 'mounted with valid cookies to continue as';
			$successcreds = {
				alreadyConnected: false,
				needsAuth: '',
				yourHeroName: data.yourHeroCookie,
				yourId: data.userId
			};
			if (autoContinue) {
				console.log(`doing autocontinue..`);
				subscribeEventsIfNotAlready();
				return;
			}
			$clientState.loading = false;
			return;
		}

		if (data.noPlayer && data.yourHeroCookie && autoSignup) {
			console.log(`doing auto signup..`);
			$clientState.status = 'auto signup';
			signUp(data.yourHeroCookie);
			return;
		}

		$clientState.status = 'mounted, need manual login';
		$clientState.loading = false;
	});

	function isMsgFromServer(msg: any): msg is MessageFromServer {
		if(typeof msg == 'object'){
			return 'triggeredBy' in msg;
		}
		return false
	}

	lastMsgFromServer.subscribe((m) => {
		scrollHappenings();
	});

	async function scrollHappenings() {
		// wait for dom elements to be populated
		await tick();
		if (happenings) happenings.scroll({ top: happenings.scrollHeight, behavior: 'smooth' });
		if (sceneTexts) sceneTexts.scroll({ top: sceneTexts.scrollHeight, behavior: 'smooth' });
	}

	function onSourceError(this:EventSource, ev: MessageEvent<any>){
		if ($source == undefined) {
			console.log(' got error while source undefined, weird..');
		}
		if ($source !== this) {
			console.log('got error from a different source ');
		}
		// $source = es;
		console.log(`event source error ${JSON.stringify(ev)}`, ev);
		$clientState.status = 'Event source errored';
		$sourceErrored = true;
		$clientState.loading = false;
		leaveGame();
	}

	function onSourceAck(this: EventSource, ev: MessageEvent<any>) {
		if ($source == undefined) {
			console.log('got ack while source undefined, weird..');
		}
		if ($source !== this) {
			console.log('got ack from a different source');
		}
		// $source = this;
		$sourceErrored = false;
		getWorld();
		$clientState.loading = false;
	}

	function onSourceMsg(this: EventSource, ev: MessageEvent<any>) {
		// console.log('got msg from source and source is ' + $source);
		if ($source == undefined) {
			console.log(' got msg while source undefined, weird..');
		}
		if ($source !== this) {
			console.log('got msg from a different source');
		}
		// $source = this;
		$sourceErrored = false;
		let sMsg : any = JSON.parse(ev.data);
		if (!isMsgFromServer(sMsg)) {
			console.log('malformed event from server');
			return;
		}
		worldReceived(sMsg);
		$clientState.loading = false;
	}

	function subscribeEventsIfNotAlready() {
		if (
			$source != undefined
			// && $source.readyState != EventSource.CLOSED
		) {
			console.log('no need to subscribe');
			$clientState.status = 'no need to subscribe';
			$clientState.loading = false;
			return;
		}
		$clientState.loading = true;
		$clientState.status = 'subscribing to events';
		console.log('subscribing...');
		try {
			$source = new EventSource('/api/subscribe');
		} catch (e) {
			$clientState.status = 'failed to source';
			$clientState.loading = false;
			console.log('failed to source');
			console.log(e);
			return;
		}
		$source.addEventListener('error', onSourceError);

		$source.addEventListener('firstack', onSourceAck);

		$source.addEventListener('world', onSourceMsg);

		// $source.addEventListener('closing', (e) => {
		// 	console.log('server requested close source');
		// 	$clientState.status = 'server asked to close source';
		// 	leaveGame();
		// });

		console.log('subscribed');
		$clientState.status = 'done subscribing';
	}

	async function getWorld() {
		$clientState.loading = true;
		$clientState.status = 'getting initial world';
		try {
			let r = await fetch('/api/world', { method: 'POST' });
			let sMsg = await r.json();
			if (!isMsgFromServer(sMsg)) {
				console.log('malformed event from server');
				$clientState.status = 'bad get world';
				$clientState.loading = false;
				return;
			}
			worldReceived(sMsg);
			$clientState.loading = false;
			$clientState.status = 'received initial world';
		} catch (e) {
			console.log('failed to get world');
			$clientState.status = 'failed to get world';
			leaveGame()
			return;
		}
	}

	async function deleteHero() {
		$clientState.loading = true;
		$clientState.status = 'submitting hero delete';
		let f = await fetch('/api/delete', { method: 'POST' });
		if (!f.ok) {
			console.log('failed delete hero request');
		}
		// let r = await f.json()
		leaveGame();
	}
	function leaveGame() {
		$clientState.waitingForMyEvent = false;
		$source?.close();
		$source = undefined;
		$successcreds = undefined;
		$triedSignupButTaken = undefined;
		$waitingForMyAnimation = false;
		$lastMsgFromServer = undefined;
		$currentAnimationIndex = 999;
		$subAnimationStage = 'start';
		$convoStateForEachVAS.clear();
		$visualActionSources = [];
		$allVisualUnitProps = [];
		$latestSlotButtonInput = undefined;
		$lastUnitClicked = undefined;
		$clientState.status = 'left game';
		$clientState.loading = false;
		invalidateAll();
	}

	async function guestSignUp() {
		let joincall: Response | undefined = undefined;
		try {
			joincall = await fetch('/api/guestsignup', {
				method: 'POST',
				body: JSON.stringify({ hi: 'yes' }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (e) {
			console.log('failed to fetch guestsignup');
			console.log(e);
			$clientState.status = 'signup failed, need manual';
			$clientState.loading = false;
			return;
		}
		let res = await joincall.json();
		if (!joincall.ok) {
			$clientState.status = 'signup failed, need manual';
			$clientState.loading = false;
			return;
		}
		if (!isSignupResponse(res)) {
			$clientState.status = 'signup bad response';
			$clientState.loading = false;
			return;
		}
		console.log(`guest sign up response ${JSON.stringify(res)}`);

		$successcreds = res;

		$clientState.status = 'we signed up as guest, subscribing';
		subscribeEventsIfNotAlready();
	}

	async function signUp(usrName: string) {
		$clientState.loading = true;
		$clientState.status = 'signing up';
		console.log('signing up');
		let joincall: Response | undefined = undefined;
		try {
			joincall = await fetch('/api/signup', {
				method: 'POST',
				body: JSON.stringify({ join: usrName }),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (e) {
			console.log('failed to fetch signup');
			$clientState.status = 'signup failed, need manual';
			$clientState.loading = false;
			return;
		}
		if (!joincall.ok) {
			console.log('signup fail response');
			$clientState.status = 'signup failed, need manual';
			$clientState.loading = false;
			return;
		}
		let res = await joincall.json();

		if (!isSignupResponse(res)) {
			console.log('signup malformed response');
			$clientState.status = 'signup malformed response';
			$clientState.loading = false;
			return;
		}
		console.log(`named sign up response ${JSON.stringify(res)}`);

		if (res.needsAuth.length) {
			signInNameInput = res.needsAuth;
			$triedSignupButTaken = res.needsAuth;
			console.log('signup name taken');
			$clientState.status = 'signup name taken, can try login';
			$clientState.loading = false;
			return;
		}
		$successcreds = res;
		$clientState.status = `successful signup as ${res.yourHeroName}, subscribing`;
		subscribeEventsIfNotAlready();
	}

	function guestSignUpButtonClicked() {
		$clientState.loading = true;
		$clientState.status = 'submitting guest sign up';
		guestSignUp();
	}
	function signUpButtonClicked() {
		if (!signupInput) return;
		$clientState.loading = true;
		$clientState.status = 'submitting sign up';
		let usrName = signupInput;
		signupInput = '';

		signUp(usrName);
	}

	async function signInButtonClicked() {
		$clientState.loading = true;
		$clientState.status = 'submitting login';
		console.log('logging in');
		let loginCall = await fetch('/api/login', {
			method: 'POST',
			body: JSON.stringify({ heroName: signInNameInput, userId: signInIdInput }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		signInIdInput = '';
		signInNameInput = '';
		if (!loginCall.ok) {
			console.log('login call failed');
			$clientState.loading = false;
			$clientState.status = 'failed login call';
			return;
		}
		let res = await loginCall.json();

		if (!isSignupResponse(res)) {
			console.log('login malformed response');
			$clientState.status = 'login malformed response';
			$clientState.loading = false;
			return;
		}
		$successcreds = res;
		// let res = await loginCall.json();
		// invalidateAll();
		console.log('successful login');
		$clientState.status = 'succuessful login';
		subscribeEventsIfNotAlready();
	}
</script>

<!-- <h3>Status: {clientState.status}</h3> -->
{#if $clientState.loading}
	<p>loading...</p>
	<p>{$clientState.status}</p>
{/if}

{#if !$clientState.loading && !$lastMsgFromServer}
	<div class="landing" style="background-image:url({getLandscape('plains')});">
		<div class="landingUnits">
			<img class="landingHero" src={anySprites.general} alt="a bg" />
			<img class="landingHero flipped" src={anySprites.lady} alt="a bg" />
		</div>
		<!-- <div class="landingPortraitAndDialog"> -->
		<!-- <div class="landingPortrait textAlignRight">
				<img src={miscPortraits.general} alt="a portrait" />
			</div> -->
		<div class="landingDialog">
			<p>Welcome hero! What is your name?</p>
			<div class="landingResponses">
				<button on:click={guestSignUpButtonClicked}>My name is Guest</button>
				<div class="myNameIs">
					<button
						disabled={!signupInput || $clientState.waitingForMyEvent || $clientState.loading}
						on:click={signUpButtonClicked}>My name is</button
					>
					<input
						type="text"
						bind:value={signupInput}
						on:keydown={(event) => {
							if (!signupInput || $clientState.waitingForMyEvent || $clientState.loading) {
								return;
							}
							if (event.key === 'Enter') {
								signUpButtonClicked();
								event.preventDefault();
							}
						}}
					/>
				</div>
				{#if $triedSignupButTaken}
					<p>That name is already taken. If it's you, provide the userID:</p>
					<!-- <label for="signInName">name</label> -->
					<input id="signInName" disabled={true} type="text" bind:value={signInNameInput} />
					<!-- <label for="signInId">Id</label> -->
					<input id="signInId" type="text" bind:value={signInIdInput} />
					<button disabled={!signInNameInput || !signInIdInput} on:click={signInButtonClicked}
						>Login</button
					>
				{/if}
				{#if $successcreds}
					<button on:click={subscribeEventsIfNotAlready}
						>Continue as {$successcreds.yourHeroName}</button
					>
				{/if}
			</div>
		</div>
		<!-- <div class="landingPortrait">
				<img class="flipped" src={miscPortraits.lady} alt="a portrait" />
			</div> -->
		<!-- </div> -->
	</div>
	<!-- <input type="text" bind:value={signupInput} /> -->
	<!-- <button disabled={!signupInput} on:click={signUpButtonClicked}>Sign Up</button> -->
{/if}

{#if $lastMsgFromServer && ($source == undefined || $source.readyState != $source.OPEN)}
	<p>{`Weird source: ${$source}, readystate: ${$source ? $source.readyState : ''}`}</p>
{/if}

{#if $lastMsgFromServer}
	<!-- <button on:click={() => {}}>debug something</button> -->
	<div class="wrapGameField">
		<span class="yourSceneLabel">{$visualSceneLabel}</span>
		<!-- style="background-image:url({getLandscape($visualLandscape)});" -->
		<div
			class="visual"
			role="button"
			tabindex="0"
			on:keydown
			on:click={() => {
				// console.log('visual clicked');
				$latestSlotButtonInput = undefined;
				$lastUnitClicked = 'background';
			}}
			class:noOpacity={$visualOpacity}
		>
			<div class="imageBackground">
				<div class="bgAndGrad">
					<img src={getLandscape($visualLandscape)} alt="a landscape" />
					<div class="bgGrad" />
				</div>
			</div>
			<div class="units">
				{#each $allies as p (p.actual.entity.unitId)}
					<div class="unitHolder" animate:flip>
						<Unit hostId={p.actual.entity.unitId} />
					</div>
				{/each}
			</div>
			<div class="centerPlaceHolder projectileSized">
				{#if $centerFieldTarget}
					<div
						class="centerField"
						in:receiveCenter={{ key: 'center' }}
						on:introend={() => {
							if ($currentAnimation != undefined) {
								new Audio(boomSound).play()
								let anim = $currentAnimation;
								handleHealAnimations(anim);
								let hRes = handleDamageAnimation(anim, 0, true);
								let someoneDied = false;
								if (hRes.died.length) {
									someoneDied = true;
								}
								handlePutsStatuses(anim);
								if ($lastMsgFromServer) {
									handleModAggros(anim, $lastMsgFromServer.yourInfo.unitId);
								}
								handleResetAggro(anim)
								nextAnimationIndex(false, someoneDied);
							}
						}}
					>
						<img class="centerImg" src={$centerFieldTarget.projectileImg} alt="a center target" />
					</div>
				{/if}
			</div>
			<div class="units">
				{#each $enemies as e (e.actual.entity.unitId)}
					<div class="unitHolder" animate:flip>
						<Unit hostId={e.actual.entity.unitId} />
					</div>
				{/each}
				{#each $vasesToShow as s (s.id)}
					<div class="vasSpriteHolder" in:fade|local animate:flip>
						<VisualActionSource hostId={s.id} />
						<!-- <img class="vasSprite" src={anySprites[s.sprite]} alt="a place" /> -->
					</div>
				{/each}
			</div>
		</div>
	</div>
	{#if $selectedDetail}
		<div class="selectedDetails" style="background-image:url({sidebar})">
			{#if $selectedDetail.kind == 'vup'}
				<div class="selectedPortrait" style="background-image:url({minimap})">
					<div class="portrait">
						<img src={$selectedDetail.entity.portrait} alt="portrait" />
					</div>
					<div class="underPortrait">
						<strong>
							{$selectedDetail.entity.actual.kind == 'player'
								? $selectedDetail.entity.actual.entity.displayName
								: $selectedDetail.entity.actual.entity.displayName}
						</strong>
					</div>
				</div>
				<div class="vupSelectedRest">
					<div class="selectedStats">
						<UnitStats vu={$selectedDetail.entity} />
					</div>
					<div class="slotButtons">
						{#each $typedInventory as value}
							<button
								class="slotButton"
								class:activeSlotButton={$latestSlotButtonInput == value.itemState.stats.id}
								type="button"
								disabled={value.disabled}
								on:click={() => {
									let slotActions = value.acts;
									if (!slotActions || !slotActions.length) return;
									const oneChoice = slotActions.length == 1;
									const onlyAction = slotActions.at(0);
									if (oneChoice && onlyAction) {
										console.log(onlyAction.buttonText)
										choose(onlyAction);
										$latestSlotButtonInput = undefined;
										return;
									}
									if ($selectedDetail && $selectedDetail.kind == 'vup') {
										let actForSelectedMatchingSlot =
											$selectedDetail.entity.actionsThatCanTargetMe.find((a) => {
												if (a.itemId && a.itemId == value.itemState.stats.id) {
													return true;
												}
											});
										if (actForSelectedMatchingSlot) {
											choose(actForSelectedMatchingSlot);
											$latestSlotButtonInput = undefined;
											return;
										}
									}
									$latestSlotButtonInput = value.itemState.stats.id;
								}}
							>
								<img
									class="slotImg"
									class:halfOpacity={value.disabled}
									src={value.img}
									alt="a slot"
								/>
								<span class="slotCounter">{value.overlayNumber ?? ''}</span>
								<span class="slotItemname">{value.itemState.stats.id}</span>
								<span class="slotStockDots">{value.dots}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
			{#if $selectedVisualActionSourceState && $selectedDetail.kind == 'vas'}
				<div class="selectedPortrait" style="background-image:url({minimap})">
					<div
						class="portrait"
						on:click={() => {
							if (!($selectedDetail && $selectedDetail.kind == 'vas')) {
								return;
							}
							resetSceneConvos($selectedDetail.entity.scene);
						}}
						role="button"
						tabindex="0"
						on:keydown
					>
						<img
							src={$selectedDetail.entity.portrait
								? getPortrait($selectedDetail.entity.portrait)
								: anySprites[$selectedDetail.entity.sprite]}
							alt="place"
						/>
					</div>
					<div class="underPortrait">
						<strong>
							{$selectedDetail.entity.displayName}
						</strong>
					</div>
				</div>
				<div class="selectedRest">
					<div class="vasdPromptAndButtons">
						<div class="vasdPrompt">
							{$selectedVisualActionSourceState.currentRetort ??
								'selected vas has no current retort'}
						</div>
						<div class="vasdButtons">
							{#each $selectedVasActionsToShow as act}
								<button
									type="button"
									class="vasResponse"
									disabled={$clientState.waitingForMyEvent || $waitingForMyAnimation}
									on:click={async () => {
										if (
											!$selectedDetail ||
											$selectedDetail.kind != 'vas' ||
											$waitingForMyAnimation ||
											$clientState.waitingForMyEvent
										) {
											return;
										}
										$lastUnitClicked = $selectedDetail.entity.id;
										$selectedDetail.entity;
										choose(act);

										// $convoStateForEachVAS = $convoStateForEachVAS;
										// $visualActionSources = $visualActionSources;
									}}>{act.buttonText}</button
								>
							{/each}
							{#each $selectedVasResponsesToShow as c}
								<button
									class="vasResponse"
									type="button"
									disabled={$clientState.waitingForMyEvent || $waitingForMyAnimation}
									on:click={() => {
										if (
											!$selectedDetail ||
											$selectedDetail.kind != 'vas' ||
											$clientState.waitingForMyEvent ||
											$waitingForMyAnimation
										)
											return;

										$lastUnitClicked = $selectedDetail.entity.id;
										// let cs = $convoStateForEachVAS.get($selectedDetail.entity.id)
										let state = $selectedVisualActionSourceState;
										if (!state) return;
										if (c.lock) {
											for (const handleToLock of c.lock) {
												state.lockedResponseHandles.set(handleToLock, true);
											}
										}
										if (c.unlock) {
											for (const handleToUnlock of c.unlock) {
												state.lockedResponseHandles.set(handleToUnlock, false);
											}
										}
										if (c.responseId) {
											state.lockedResponseHandles.set(c.responseId, true);
										}
										if (c.unlockVas) {
											for (const handleToUnlock of c.unlockVas) {
												// let csToUnlock = $convoStateForEachVAS.get(handleToUnlock);
												// if (csToUnlock) {
												changeVasLocked(handleToUnlock, true);
												// }
											}
										}
										if (c.lockVas) {
											for (const handleToLock of c.lockVas) {
												// let csToUnlock = $convoStateForEachVAS.get(handleToLock);
												// if (csToUnlock) {
												changeVasLocked(handleToLock, false);
												// }
											}
										}
										if (c.retort) {
											state.currentRetort = c.retort;
										}
										$visualActionSources = $visualActionSources;
										$convoStateForEachVAS = $convoStateForEachVAS;
									}}>{c.responseText}</button
								>
							{/each}
						</div>
					</div>
				</div>
			{/if}
			{#if $selectedDetail.kind == 'bg'}
				<div class="bgButtons">
					<button>Reset Scene</button>
					<button>Give up</button>
					<button>Log out</button>
					<button>Delete Hero</button>
					<button>Event log</button>
				</div>
				<div class="sceneTexts" bind:this={sceneTexts}>
					{#each $lastMsgFromServer.sceneTexts as t}
						<p class="sceneText">{t}</p>
						<br />
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if $lastMsgFromServer.devActions.length}
		<div class="sceneButtons">
			{#each $lastMsgFromServer.devActions as op, i}
				<button on:click={() => choose(op)} disabled={$clientState.waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/each}
		</div>
	{/if}
	<h3>Recent happenings:</h3>
	<div class="happenings" bind:this={happenings}>
		{#each $lastMsgFromServer.happenings as h}
			<p>{h}</p>
		{/each}
	</div>
	<h3>Players in world:</h3>
	{#each $lastMsgFromServer.userList as p}
		<p>
			{p}
		</p>
		<p />
	{/each}
	<p class="textSelectable">
		Logged in as {$successcreds?.yourHeroName} uid: {$successcreds?.yourId}
		<button on:click={leaveGame}>Log Out</button>
		<button on:click={deleteHero}>Delete Hero</button>
	</p>
	<p>
		{JSON.stringify($lastMsgFromServer.playerFlags)}
	</p>
{/if}
<p>
	status: {$clientState.status}
</p>
{#if $sourceErrored}
	<button>source errored</button>
{/if}

<style>
	:global(body) {
		background-color: aliceblue;
		/* padding-inline: 5px; */
		padding: 0;
		margin: 0;
		word-wrap: break-word;
	}
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		user-select: none;
		touch-action: manipulation;
		font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
	}
	.wrapGameField :global(.noOpacity) {
		opacity: 0;
	}
	.wrapGameField :global(.selected) {
		box-shadow: 0 0 20px rgb(0, 0, 0, 0.4);
		border-radius: 10px;
	}
	.wrapGameField :global(.projectileSized) {
		height: clamp(25px, 5vw + 1px, 50px);
		width: clamp(25px, 5vw + 1px, 50px);
	}

	.bgButtons{
		display: flex;
		flex-direction: column;
		gap:5px;
		padding:5px;
		overflow-y: auto;
	}

	.textSelectable {
		user-select: text;
	}

	.landing {
		height: 100svh;
		background-repeat: no-repeat;
		background-size: cover;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.landingUnits {
		/* background-color: aqua; */
		text-align: center;
		white-space: nowrap;
		height: clamp(80px, 30vw, 200px);
	}
	.landingUnits img {
		height: 100%;
	}

	.flipped {
		transform: scaleX(-1);
	}
	/* .landingPortraitAndDialog {
		display: flex;
		justify-content: center;
		height: 30svh;
	}
	.landingPortrait {
		flex-shrink: 1;
		flex-grow: 1;
		max-width: 300px;
	}
	.textAlignRight {
		text-align: right;
	}
	.landingPortrait > img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	} */
	.landingDialog {
		border-radius: 10px;
		background-color: rgb(0, 0, 0, 0.4);
		/* flex-grow:0; */
		/* flex-basis: 30%; */
		/* border:2px solid brown; */
		/* background-color: aqua; */
		/* flex-basis:0; */
		flex-shrink: 1;
		color: white;
		/* display: inline-block; */
		padding: 10px;
	}
	.landingDialog > p {
		font-size: 1.2rem;
		font-weight: bold;
		margin-bottom: 25px;
		/* background-color: aqua; */
	}
	.landingResponses {
		margin-top: 10px;
		display: flex;
		gap: 10px;
		flex-direction: column;
		align-items: flex-start;
	}
	.landingResponses button {
		padding-inline: 5px;
		padding-block: 4px;
		/* white-space: nowrap; */
		border-radius: 5px;
	}
	.myNameIs {
		/* margin:0; */
		/* padding:0; */
		display: inline-flex;
		width: 100%;
		justify-content: flex-start;
		gap: 5px;
		margin-top: 5px;
	}
	.myNameIs button:disabled {
		color: white;
	}
	.myNameIs input {
		flex-shrink: 1;
		flex-grow: 1;
		flex-basis: 0;
		min-width: 10px;
		max-width: 150px;
		width: 100%;
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
		/* margin-top: 5px; */
		/* border: 1px solid brown; */
		height: 30vh;
		overflow-y: auto;
		/* background-color: burlywood; */
		color: white;
		padding: 10px;
	}
	.sceneButtons {
		/* height: 10vh; */
		overflow-y: auto;
		display: block;
		/* margin-top: 4px; */
		/* margin-bottom: 10px; */
		background-color: cadetblue;
		border: 1px solid black;
	}
	.sceneButtons > button {
		margin: 5px;
	}
	/* .actionButtons {
		display: inline-block;
		background-color: beige;
		border: 1px solid black;
	} */
	.yourSceneLabel {
		position: absolute;
		/* position: sticky; */
		/* left: 0; */
		/* top: 0; */
		padding-inline: 6px;
		z-index: 2;
		font-weight: bold;
		border-bottom-right-radius: 15px;
		/* border-bottom: 5px solid brown; */
		border: 3px solid bisque;
		border-top-width: 1px;
		border-left-width: 1px;
		color: brown;
		background-color: beige;
	}
	.wrapGameField {
		height: 70svh;
		overflow-y: auto;
		overflow-x: hidden;
		/* overscroll-behavior: contain; */
		background-color: black;
		/* overflow-x: hidden; */
	}
	.imageBackground {
		/* background-color: burlywood; */
		position: absolute;
		top: 0;
		overflow: hidden;
		height: 100%;
		width: 100%;
	}
	.bgAndGrad {
		position: relative;
	}
	.bgGrad {
		/* z-index:2 */
		position: absolute;
		height: 50px;
		bottom: 0;
		width: 100%;
		background: linear-gradient(to bottom, transparent 0%, black 90%);
	}
	.imageBackground img {
		min-width: 100vw;
		/* object-fit:cover; */
		/* object-position: center; */
		/* margin-inline: auto; */
		/* width:100%; */
	}
	.visual {
		position: relative;
		transition: opacity 0.6s ease-in-out;
		/* background-repeat:no-repeat; */
		/* background-size:auto auto; */
		/* background-attachment:scroll; */
		/* background-position: center center; */
		background-color: black;
		display: grid;
		column-gap: 1px;
		grid-template-columns: 1fr 1fr;
		/* gap:4px; */
		justify-content: center;
		align-items: center;
		/* justify-items:center; */
		/* height: fit-content; */
		height: max-content;
		min-height: 100%;
	}

	/* .unitHolder{ */
	/* background-color: blue; */
	/* } */

	.units {
		display: grid;
		/* background-color: beige; */
		row-gap: 2px;
		/* column-gap: 2px; */
		grid-template-columns: repeat(auto-fit, clamp(120px, 50%, 200px));
		justify-content: center;
		/* align-items: start; */
		z-index: 1;
	}
	.centerPlaceHolder {
		position: absolute;
		/* background-color: aqua; */
		top: 50%;
		left: 50%;
	}
	.centerField {
		height: 100%;
		width: 100%;
	}
	.centerImg {
		height: 100%;
		width: 100%;
	}
	.slotButtons {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 2px;
		/* border: 1px solid brown; */
		align-self: flex-start;
		margin-top: 7px;
	}
	.slotButton {
		position: relative;
		border: none;
		background: none;
		cursor: pointer;
		/* border-radius: 10px; */
	}
	.activeSlotButton {
		box-shadow: 1px 1px 10px yellow;
		border-radius: 10px;
	}
	.slotImg {
		display: block;
		border-radius: 10px;
	}
	.slotItemname {
		position: absolute;
		bottom: 0;
		display: block;
		color: white;
	}
	.slotCounter {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		font-size: 30px;
		z-index: 2;
		color: wheat;
	}
	.halfOpacity {
		opacity: 0.5;
	}
	.slotStockDots {
		z-index: 2;
		color: white;
		position: absolute;
		top: 0;
		left: 3px;
		font-size: 30px;
		font-weight: bold;
		line-height: 1px;
	}
	.selectedDetails {
		/* background-color: transparent; */
		background-repeat: no-repeat;
		background-size: calc(max(100%, 700px)) 100%;
		background-position: left top;

		display: flex;
		position: relative;
		height: 30svh;
	}
	.selectedPortrait {
		background-repeat: no-repeat;
		background-size: 100% 100%;
		min-width: 100px;
		flex-basis: 15%;
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: flex-start;
		overflow: hidden;
	}
	.portrait {
		flex-shrink: 1;
		flex-grow: 1;
		overflow: hidden;
		display: block;
		height: 10svh;
		/* text-align: center; */
		/* margin-bottom: 0; */
		/* vertical-align: bottom; */
		/* border: 1px solid brown; */
		padding-top: 4px;
		padding-inline: 4px;
	}
	.portrait > img {
		display: block;
		height: 100%;
		width: 100%;
		/* margin-inline:auto; */
		object-fit: cover;
	}
	.underPortrait {
		text-align: center;
		/* vertical-align: middle; */
		/* border: 1px solid yellow; */
		white-space: nowrap;
		display: flex;
		justify-content: center;
		align-items: center;
		height: 4svh;
		z-index: 2;
		color: white;
		border-top: none;
		word-wrap: break-word;
		/* font-size: clamp(14px, 2vw + 2px, 19px); */
	}
	.vupSelectedRest {
		flex-basis: 85%;

		height: 100%;
		display: flex;
		gap: 5px;

		padding: 5px;
	}
	.selectedRest {
		flex-basis: 85%;
		height: 100%;

		padding: 10px;
		/* background-color: aqua; */
	}
	.selectedStats {
		/* display: flex; */
		/* flex-wrap: wrap; */
		/* flex-direction: column; */
		/* align-items: flex-start; */
		/* flex-shrink: 1; */
		/* gap:5px; */
		overflow-y: auto;
		/* padding: 5px; */
		min-width: 20vw;
		/* border: 1px solid brown; */
		border-left: none;
		color: white;
	}
	.vasdPromptAndButtons {
		/* padding: 10px; */
		display: flex;
		height: 100%;
		flex-direction: column;
		color: white;
		/* justify-content: space-around; */
		overflow-y: auto;
		/* border: 1px solid brown; */
		border-left: none;
	}
	.vasdPrompt {
		white-space: pre-wrap;
		line-height: 17px;
	}
	.vasSpriteHolder {
		display: grid;
		place-items: center;
	}
	.vasdButtons {
		margin-top: 7px;
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.vasResponse {
		/* font-size:1rem; */
		padding-inline: 0.7em;
		padding-block: 0.6em;
		border: none;
		border-radius: 1px;
		color: white;

		background-color: brown;
		/* background-color: aqua; */
		/* max-width:30ch; */
	}
	.vasResponse:disabled {
		background-color: gray;
	}
</style>

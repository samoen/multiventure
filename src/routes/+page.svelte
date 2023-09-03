<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Unit from '$lib/Components/Unit.svelte';
	import minimap from '$lib/assets/ui/minimap.png'
	import sidebar from '$lib/assets/ui/sidebar.png'
	import {
		convoStateForEachVAS,
		actionsForSlot,
		allVisualUnitProps,
		bodySlotActions,
		centerFieldTarget,
		choose,
		clientState,
		currentAnimation,
		currentAnimationIndex,
		currentAnimationsWithData,
		handlePutsStatuses,
		lastMsgFromServer,
		lastUnitClicked,
		latestSlotButtonInput,
		nextAnimationIndex,
		numberShownOnSlot,
		receiveCenter,
		selectedDetail,
		selectedVisualActionSourceState,
		stockDotsOnSlotButton,
		syncVisualsToMsg,
		typedInventory,
		updateUnit,
		utilitySlotActions,
		visualActionSources,
		slotlessBattleActions,
		waitingForMyAnimation,
		wepSlotActions,
		animationsInWaiting,
		worldReceived,
		visualLandscape,
		visualOpacity,
		visualSceneLabel,
		allies,
		enemies,
		vases,
		selectedVasResponsesToShow,
		selectedVasActionsToShow,


		triedSignupButTaken


	} from '$lib/client/ui';
	import type { MessageFromServer } from '$lib/server/messaging';
	import { onMount, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import blankSlot from '$lib/assets/equipment/blank-attack.png';
	
	import type { BattleAnimation, DataFirstLoad, LandscapeImage } from '$lib/utils';
	import VisualActionSource from '$lib/Components/VisualActionSource.svelte';
	import { fade } from 'svelte/transition';
	import type { ItemId } from '$lib/server/items';
	import { anySprites, getLandscape, miscPortraits } from '$lib/client/assets';

	export let data: DataFirstLoad;
	let signupInput: string;
	let signInNameInput: string;
	let signInIdInput: string;
	let source: EventSource | null;

	// let unitsDetails: UnitDetails[] = [];

	let happenings: HTMLElement;
	let sceneTexts: HTMLElement;
	let autoSignup: boolean = true;

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
			$clientState.loading = false;
		}
	});
	function isMsgFromServer(msg: object): msg is MessageFromServer {
		return 'triggeredBy' in msg;
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

	function subscribeEventsIfNotAlready() {
		if (source != null && source.readyState != EventSource.CLOSED) {
			console.log('no need to subscribe');
			return;
		}
		$clientState.status = 'subscribing to events';
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
			$clientState.loading = false;
		};

		source.addEventListener('firstack', async (e) => {
			getWorld();
		});

		source.addEventListener('world', async (e) => {
			let sMsg = JSON.parse(e.data);
			if (!isMsgFromServer(sMsg)) {
				console.log('malformed event from server');
				return;
			}
			worldReceived(sMsg);
		});
		source.addEventListener('closing', (e) => {
			console.log('got closing msg');
			source?.close();
			$clientState.status = 'you logged in elsewhere, connection closed';
			$lastMsgFromServer = undefined;
		});
		console.log('subscribed');
	}

	async function getWorld() {
		$clientState.loading = true;
		let r = await fetch('/api/world', { method: 'POST' });
		let sMsg = await r.json();
		if (!isMsgFromServer(sMsg)) {
			console.log('malformed event from server');
			return;
		}
		worldReceived(sMsg);
		$clientState.loading = false;
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
		$clientState.status = 'unsubscribing from events';
		if (source?.readyState != source?.CLOSED) {
			console.log('closing con from browser');
			source?.close();
		}
		source = null;
		$lastMsgFromServer = undefined;
		$clientState.status = 'need manual login';
		$clientState.loading = false;
		$currentAnimationIndex = 999;
		$convoStateForEachVAS.clear();
		$visualActionSources = [];
		$allVisualUnitProps = [];
		$latestSlotButtonInput = 'none';
		$lastUnitClicked = undefined;
	}

	async function guestSignUp() {
		let joincall = await fetch('/api/guestsignup', {
			method: 'POST',
			body: JSON.stringify({ hi: 'yes' }),
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
			$clientState.status = 'waiting for first event';
			subscribeEventsIfNotAlready();
		} else {
			console.log('joincall not ok');
			$clientState.status = 'signup failed, need manual';
			$clientState.loading = false;
		}
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
		}else if(res.needAuth){
			signInNameInput = res.needAuth
			$triedSignupButTaken = res.needAuth
			$clientState.status = 'signup name taken, can try login';
			$clientState.loading = false;
		} else {
			console.log('joincall not ok, no recourse');
			$clientState.status = 'signup failed, need manual';
			$clientState.loading = false;
		}
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
		let loginCall = await fetch('/api/login', {
			method: 'POST',
			body: JSON.stringify({ heroName: signInNameInput, userId: signInIdInput }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if (!loginCall.ok) {
			console.log('login nope');
			$clientState.loading = false;
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
{#if $clientState.loading}
	<p>loading...</p>
{/if}
{#if !$clientState.loading && !$lastMsgFromServer}
	<div class='landing' style="background-image:url({getLandscape($visualLandscape)});">
		<div class='landingUnits'>
			<img class="landingHero" src={anySprites.general} alt='a bg'>
			<img class="landingHero flipped" src={anySprites.lady} alt='a bg'>

		</div>
		<div class="landingPortraitAndDialog">
			<div class='landingPortrait textAlignRight'>
				<img src={miscPortraits.general} alt='a portrait'>
			</div>
			<div class="landingDialog">
				<span>
					Welcome hero! What is your name?
				</span>
				<div class="landingResponses">	
					<button on:click={guestSignUpButtonClicked}>My name is Guest</button>
					<div class="myNameIs">
						<button disabled={!signupInput} on:click={signUpButtonClicked}>My name is</button>
						<input type="text" bind:value={signupInput} />
					</div>
					{#if $triedSignupButTaken}
						<p>That name is already taken. If it's you, provide the userID:</p>
						<!-- <label for="signInName">name</label> -->
						<input id="signInName" disabled={true} type="text" bind:value={signInNameInput} />
						<!-- <label for="signInId">Id</label> -->
						<input id="signInId" type="text" bind:value={signInIdInput} />
						<button disabled={!signInNameInput || !signInIdInput} on:click={signInButtonClicked}>Login</button>
					{/if}
				</div>
			</div>
			<div class='landingPortrait'>
				<img class="flipped" src={miscPortraits.lady} alt='a portrait'>
			</div>
		</div>
		
	</div>
	<!-- <input type="text" bind:value={signupInput} /> -->
	<!-- <button disabled={!signupInput} on:click={signUpButtonClicked}>Sign Up</button> -->

{/if}

{#if $lastMsgFromServer && (!source || source.readyState != source.OPEN)}
	<p>event source got closed.. if stuck here there's a bug</p>
{/if}

{#if $lastMsgFromServer}
	<!-- {#if $lastMsgFromServer.itemActions.length}
		<div class="actionButtons">
			{#each $lastMsgFromServer.itemActions as op, i}
				<button on:click={() => choose(op)} disabled={$clientState.waitingForMyEvent}>
					{op.buttonText}
				</button>
			{/each}
		</div>
	{/if} -->
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
				console.log('visual clicked');
				$latestSlotButtonInput = 'none';
				$lastUnitClicked = 'background'
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
				{#each $allies as p (p.id)}
					<div class="unitHolder" animate:flip>
						<Unit hostId={p.id} />
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
								let anim = $currentAnimation;
								let someoneDied = false;
								if ($currentAnimation.alsoDamages) {
									for (const other of $currentAnimation.alsoDamages) {
										updateUnit(other.target, (vup) => {
											vup.displayHp -= other.amount;
											if (vup.displayHp < 1) {
												someoneDied = true;
											}
										});
									}
								}

								handlePutsStatuses(anim);
								if ($currentAnimation.alsoModifiesAggro) {
									for (const other of $currentAnimation.alsoModifiesAggro) {
										if (
											$lastMsgFromServer &&
											other.forHeros.includes($lastMsgFromServer.yourInfo.unitId)
										) {
											updateUnit(other.target, (vup) => {
												if (vup.aggro != undefined) {
													if (other.amount != undefined) {
														vup.aggro += other.amount;
														if (vup.aggro > 100) vup.aggro = 100;
														if (vup.aggro < 0) vup.aggro = 0;
													}
													if (other.setTo != undefined) {
														vup.aggro = other.setTo;
													}
												}
											});
										}
									}
								}
								nextAnimationIndex(false, someoneDied);
							}
						}}
					>
						<img class="centerImg" src={$centerFieldTarget.projectileImg} alt="a center target" />
					</div>
				{/if}
			</div>
			<div class="units">
				{#each $enemies as e (e.id)}
					<div class="unitHolder" animate:flip>
						<Unit hostId={e.id} />
					</div>
				{/each}
				{#each $vases as s (s.id)}
					<div class="vasSpriteHolder" in:fade|local animate:flip>
						<VisualActionSource hostId={s.id} />
						<!-- <img class="vasSprite" src={anySprites[s.sprite]} alt="a place" /> -->
					</div>
				{/each}
			</div>
		</div>
	</div>
	{#if $selectedDetail && $selectedDetail.kind == 'vup'}
		<div class="selectedDetails">
			<div class="selectedPortrait"  style="background-image:url({minimap})">
				<div class="portrait">
					<img src={$selectedDetail.entity.actual.portrait} alt="portrait" />
				</div>
				<div class="underPortrait">
					<strong>
						{$selectedDetail.entity.actual.kind == 'player'
							? $selectedDetail.entity.actual.info.heroName
							: $selectedDetail.entity.actual.enemy.name}
					</strong>
				</div>
			</div>
			<div class="vupSelectedRest"  style="background-image:url({sidebar})">
				<div class="selectedStats">
					{#if $selectedDetail.entity.actual.kind == 'player'}
						<div>
							{$selectedDetail.entity.displayHp}/{$selectedDetail.entity.maxHp} hp
						</div>
						<div>
							{#each Object.entries($selectedDetail.entity.actual.info.statuses) as [key, value]}
								{#if value > 0}
									{`${key} ${value}`}
								{/if}
							{/each}
						</div>

						<!-- <div> -->
						{#each Object.entries($selectedDetail.entity.actual.info.inventory) as [key, value]}
							<div>
								{`${key}: ${value.itemId}`}
							</div>
						{/each}
						<div>
							Agility: {$selectedDetail.entity.actual.info.agility}
						</div>
						<div>
							Strength: {$selectedDetail.entity.actual.info.strength}
						</div>
						<!-- <div>
							<button type="button">show gear</button>
						</div> -->
					{/if}
					{#if $selectedDetail.entity.actual.kind == 'enemy'}
						<div>
							{$selectedDetail.entity.displayHp}/{$selectedDetail.entity.maxHp} hp
						</div>
						<div>
							Template: {$selectedDetail.entity.actual.enemy.templateId}
						</div>
						<div>
							Aggro: {JSON.stringify($selectedDetail.entity.actual.enemy.myAggro)}
						</div>
						<div>
							{#each Object.entries($selectedDetail.entity.actual.enemy.statuses) as [forHero, statuses]}
								{#each Object.entries(statuses) as [key, value]}
									{#if value > 0}
										{`${forHero}: ${key} ${value}, `}
									{/if}
								{/each}
							{/each}
						</div>
					{/if}
				</div>
				<div class="slotButtons">
					{#each $typedInventory as [slot, value]}
						{#if value.overlayNumber != undefined || value.acts.length}
							<button
								class="slotButton"
								class:activeSlotButton={$latestSlotButtonInput == slot}
								type="button"
								disabled={value.disabled}
								on:click={() => {
									let slotActions = value.acts;
									if (!slotActions || !slotActions.length) return;
									const oneChoice = slotActions.length == 1;
									const onlyAction = slotActions.at(0);
									if (oneChoice && onlyAction) {
										choose(onlyAction);
										$latestSlotButtonInput = 'none';
										return;
									}
									if ($selectedDetail && $selectedDetail.kind == 'vup') {
										let actForSelectedMatchingSlot =
											$selectedDetail.entity.actionsThatCanTargetMe.find((a) => {
												if (a.slot && a.slot == slot) {
													return true;
												}
											});
										if (actForSelectedMatchingSlot) {
											choose(actForSelectedMatchingSlot);
											$latestSlotButtonInput = 'none';
											return;
										}
									}
									$latestSlotButtonInput = slot;
								}}
							>
								<img
									class="slotImg"
									class:halfOpacity={value.disabled}
									src={value.img}
									alt="a slot"
								/>
								<span class="slotCounter">{value.overlayNumber ?? ''}</span>
								<span class="slotItemname"
									>{$lastMsgFromServer.yourInfo.inventory[slot].itemId}</span
								>
								<span class="slotStockDots">{value.dots}</span>
							</button>
						{/if}
					{/each}
					{#each $slotlessBattleActions as act}
						<button
							class="slotButton"
							disabled={$waitingForMyAnimation || $clientState.waitingForMyEvent}
							on:click={() => {
								choose(act);
								$latestSlotButtonInput = 'none';
							}}
						>
							<img
								class="slotImg"
								class:halfOpacity={$waitingForMyAnimation || $clientState.waitingForMyEvent}
								src={blankSlot}
								alt="a slot"
							/>
							<span class="slotItemname">{act.buttonText}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
	{#if $selectedVisualActionSourceState && $selectedDetail && $selectedDetail.kind == 'vas'}
		<div class="selectedDetails">
			<div class="selectedPortrait" style="background-image:url({minimap})">
				<div class="portrait">
					<img
						src={$selectedDetail.entity.portrait
							? miscPortraits[$selectedDetail.entity.portrait]
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
			<div class="selectedRest" style="background-image:url({sidebar})">
				<div class="vasdPromptAndButtons">
					<div class="vasdPrompt">
						{$selectedVisualActionSourceState.currentRetort ?? 'selected vas has no current retort'}
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
									await choose(act);
									if ($currentAnimation != undefined) {
										if ($currentAnimation.behavior.kind == 'travel') {
											$visualOpacity = true;
											// await tick()
										}
									}

									$convoStateForEachVAS = $convoStateForEachVAS;
									$visualActionSources = $visualActionSources;
								}}>{act.buttonText}</button
							>
						{/each}
						{#each $selectedVasResponsesToShow as c}
							<button
								class="vasResponse"
								type="button"
								on:click={() => {
									if (!$selectedDetail) return;
									if ($selectedDetail.kind != 'vas') return;

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
											let csToUnlock = $convoStateForEachVAS.get(handleToUnlock);
											if (csToUnlock) {
												csToUnlock.isLocked = false;
											}
										}
									}
									if (c.lockVas) {
										for (const handleToLock of c.lockVas) {
											let csToUnlock = $convoStateForEachVAS.get(handleToLock);
											if (csToUnlock) {
												csToUnlock.isLocked = true;
											}
										}
									}
									if(c.retort){
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
		</div>
		<div />
	{/if}
	{#if $selectedDetail && $selectedDetail.kind == 'bg'}
		<div class="sceneTexts" bind:this={sceneTexts}>
			{#each $lastMsgFromServer.sceneTexts as t}
				<p class="sceneText">{t}</p>
				<br />
			{/each}
		</div>	
	{/if}
	{#if $lastMsgFromServer.sceneActions.length}
		<div class="sceneButtons">
			{#each $lastMsgFromServer.sceneActions as op, i}
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
		Logged in as {$lastMsgFromServer.yourInfo.heroName} uid: {data.userId}
		<button
			on:click={() => {
				$lastMsgFromServer = undefined;
				leaveGame();
			}}>Log Out</button
		>
		<button on:click={deleteHero}>Delete Hero</button>
	</p>
	{JSON.stringify($lastMsgFromServer.playerFlags)}
{/if}

<style>
	:global(body) {
		background-color: aliceblue;
		/* padding-inline: 5px; */
		padding: 0;
		margin: 0;
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

	.textSelectable{
		user-select: text;
	}

	.landing{
		height:100vh;
		background-repeat: no-repeat;
		background-size: cover;
		display: flex;
		flex-direction: column;
		/* align-items: center; */
		justify-content: center;
	}
	.landingUnits{
		/* background-color: aqua; */
		text-align: center;
		white-space: nowrap;
		height:clamp(80px, 30vw, 200px);
	}
	.landingUnits img{
		height:100%;
	}
	
	.flipped{
		transform: scaleX(-1);
	}
	.landingPortraitAndDialog{
		/* border:2px solid brown; */
		display: flex;
		justify-content: center;
		height:30vh;
		/* width:fit-content; */
		/* max-width:100%; */
		background-color: rgb(0, 0, 0, 0.4);
	}
	.landingPortrait{
		/* flex-basis:auto; */
		/* background-color: aqua; */
		flex-shrink:1;
		flex-grow:1;
		max-width:300px;
	}
	.textAlignRight{
		text-align: right;

	}
	.landingPortrait > img{
		/* background-color: red; */
		width:100%;
		height:100%;
		object-fit: cover;

	}
	.landingDialog{
		
		/* flex-grow:0; */
		/* flex-basis: 30%; */
		/* border:2px solid brown; */
		/* background-color: aqua; */
		/* flex-basis:0; */
		flex-shrink: 1;
		font-weight: bold;
		color:white;
		/* display: inline-block; */
		padding:10px;
	}
	.landingResponses{
		margin-top:10px;
		display: flex;
		gap:10px;
		flex-direction: column;
		align-items: flex-start;
	}
	.landingResponses button{
		padding-inline:5px;
		padding-block:4px;
		white-space: nowrap;
		border-radius: 5px;
	}
	.myNameIs{
		/* margin:0; */
		/* padding:0; */
		display: inline-flex;
		width:100%;
		justify-content: flex-start;
		gap:5px;
		margin-top:5px;
	}
	/* .myNameIs button{

	} */
	.myNameIs input{
		flex-shrink:1;
		flex-grow:1;
		flex-basis:0;
		min-width:10px;
		max-width:150px;
		width:100%;
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
		border: 1px solid brown;
		height: 30vh;
		overflow-y: auto;
		background-color: burlywood;
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
		height: 70vh;
		overflow-y: auto;
		overflow-x: hidden;
		/* overscroll-behavior: contain; */
		background-color: black;
		/* overflow-x: hidden; */
	}
	.imageBackground {
		/* background-color: burlywood; */
		position:absolute;
		top:0;
		overflow: hidden;
		height:100%;
		width:100%;
	}
	.bgAndGrad{
		position:relative
	}
	.bgGrad {
		/* z-index:2 */
		position: absolute;
		height: 50px;
		bottom:0;
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
		grid-template-columns: repeat(auto-fit, clamp(100px, 50%, 200px));
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
		align-self:flex-start;
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
		color: gray;
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
		/* background-color: burlywood; */
		display: flex;
		position: relative;
		height: 30vh;
	}
	.selectedPortrait {
		background-repeat: no-repeat;
		background-size: 100% 100%;
		min-width:100px;
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
		height:10vh;
		/* text-align: center; */
		/* margin-bottom: 0; */
		/* vertical-align: bottom; */
		/* border: 1px solid brown; */
		padding-top:4px;
		padding-inline:4px;
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
		display: flex;
		justify-content: center;
		align-items: center;
		height:4vh;
		z-index:2;
		color:white;
		border-top: none;
		word-wrap: break-word;
		/* font-size: clamp(14px, 2vw + 2px, 19px); */
	}
	.vupSelectedRest {
		flex-basis: 85%;

		height: 100%;
		display: flex;
		background-repeat: no-repeat;
		background-size: calc(max(100%,700px)) 100%;
		background-position: left;
	}
	.selectedRest {
		flex-basis: 85%;
		height: 100%;
		background-repeat: no-repeat;
		background-size: calc(max(100%,700px)) 100%;
		background-position: left;
		/* background-color: aqua; */
	}
	.selectedStats {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 5px;
		min-width:20vw;
		/* border: 1px solid brown; */
		border-left: none;
		color:white;
	}
	.vasdPromptAndButtons {
		padding: 10px;
		display: flex;
		height: 100%;
		flex-direction: column;
		color:white;
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
		padding-inline: 6px;
		padding-block: 2px;
		/* max-width:30ch; */
	}
</style>

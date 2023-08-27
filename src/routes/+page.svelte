<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Unit from '$lib/Components/Unit.svelte';
	import {
		convoStateForEachVAS,
		actionsForSlot,
		allVisualUnitProps,
		animationCancelled,
		bodySlotActions,
		centerFieldTarget,
		choose,
		lockedHandles,
		clientState,
		convoBeenSaid,
		currentAnimation,
		currentAnimationIndex,
		currentAnimationsWithData,
		currentConvoPrompt,
		handlePutsStatuses,
		lastMsgFromServer,
		lastUnitClicked,
		latestSlotButtonInput,
		miscPortraits,
		nextAnimationIndex,
		numberShownOnSlot,
		receiveCenter,
		anySprites,
		selectedDetail,
		selectedVisualActionSource,
		selectedVisualActionSourceState,
		stockDotsOnSlotButton,
		syncVisualsToMsg,
		typedInventory,
		updateUnit,
		utilitySlotActions,
		visualActionSources,
		waitButtonAction,
		waitingForMyAnimation,
		wepSlotActions,

		animationsInWaiting

	} from '$lib/client/ui';
	import type { MessageFromServer } from '$lib/server/messaging';
	import { onMount, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { derived, writable, type Writable } from 'svelte/store';
	import plains from '$lib/assets/landscapes/landscape-plain.webp';
	import type { DataFirstLoad } from '$lib/utils';

	export let data : DataFirstLoad;
	let signupInput: string;
	let signInNameInput: string;
	let signInIdInput: string;
	let source: EventSource | null;

	let loading = true;

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
			loading = false;
		}
	});
	export function isMsgFromServer(msg: object): msg is MessageFromServer {
		return 'triggeredBy' in msg;
	}
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
			if ($clientState.waitingForMyEvent && sMsg.triggeredBy == sMsg.yourInfo.heroName) {
				$clientState.status = 'playing';
				$clientState.waitingForMyEvent = false;
				loading = false;
			}
			// console.log(`gotworld`);
			handleAnimationsOnMessage(prevMsg, sMsg);

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

	async function cancelAnimations() {
		console.log(`cancelling animations`);
		// $animationCancelled = true;
		// $currentAnimationIndex = 999;
		
		// let transitions reach their end
		// await tick();

		// $animationCancelled = false;
	}

	function startAnimating(msgWithAnims: MessageFromServer) {
		$currentAnimationsWithData = msgWithAnims.animations;
		// console.log(`starting anims ${JSON.stringify($currentAnimationsWithData)}`);
		nextAnimationIndex(
			true,
			$currentAnimationIndex,
			$currentAnimationsWithData,
			$lastMsgFromServer,
			false,
			$animationCancelled,
			$animationsInWaiting,
		);
	}

	function handleAnimationsOnMessage(
		previous: MessageFromServer | undefined,
		latest: MessageFromServer
	) {
		// console.log(`got animations: ${JSON.stringify(latest.animations)}`);

		// first message just sync instant
		if (!previous) {
			console.log('first message, just sync it');
			if ($currentAnimation) {
				throw Error('first message but animating already, should be impossible')
				// await cancelAnimations();
			}
			syncVisualsToMsg(latest);
			return;
		}

		if (latest.animations.length && latest.triggeredBy == latest.yourInfo.heroName) {
			console.log('start waiting my anim');
			$waitingForMyAnimation = true;
		}

		// my message with no animations
		if (latest.triggeredBy == latest.yourInfo.heroName && !latest.animations.length && $currentAnimation != undefined) {
			console.log('my message with no animations, but we are animating. Ignore, it will be synced when current anims finish');
			// if ($currentAnimation) {
			// 	await cancelAnimations();
			// }
			// syncVisualsToMsg(latest);
			return;
		}

		// someone else's message and we are animating
		if (latest.triggeredBy != latest.yourInfo.heroName && $currentAnimation != undefined) {
			console.log(`someone else message but ignoring because we are animating: ${JSON.stringify($currentAnimation)}`);
			return;
		}

		// anyone's message with no animations and not animating
		if ($currentAnimation == undefined && !latest.animations.length) {
			// await cancelAnimations();
			console.log('Anyones message with no animations and not animating, just sync');
			syncVisualsToMsg(latest);
			return;
		}

		// My message with animations but animation is in progress
		if (
			latest.animations.length &&
			$currentAnimation != undefined &&
			latest.triggeredBy == latest.yourInfo.heroName
		) {
			console.log('My message with anims but we are animating. store these anims to play once current is done');
			animationsInWaiting.set({prev:previous,withAnims:latest})
			// await cancelAnimations();
			// syncVisualsToMsg(previous);
			// await startAnimating(previous, latest);
			return;
		}

		// console.log(`precheck start anim ${JSON.stringify($currentAnimation)}`)

		// new animations and we aren't animating, start animating
		if (latest.animations.length && $currentAnimation == undefined) {
			console.log('anyones message, we not animating. starting');
			// await cancelAnimations();
			syncVisualsToMsg(previous);
			startAnimating(latest);
			return;
		}
		// syncVisualsToMsg(latest);
		console.log('no specific anim handling, ignore');
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

	let allies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
		let calAllies = $allVisualUnitProps.filter((v, i) => v.side == 'hero' && v.name);
		// console.log(`allies: ${JSON.stringify(calAllies)}`)
		return calAllies;
	});
	let enemies = derived(allVisualUnitProps, ($allVisualUnitProps) => {
		return $allVisualUnitProps.filter((p) => p.side == 'enemy');
	});

	// function tInventory(){

	// }
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
		<span class="yourSceneLabel">{$lastMsgFromServer.yourInfo.currentScene}</span>
		<div
			class="visual"
			role="button"
			tabindex="0"
			style="background-image:url({plains});"
			on:keydown
			on:click={() => {
				console.log('visual clicked');
				$latestSlotButtonInput = 'none';
			}}
		>
			<div class="units">
				{#each $allies as p (p.id)}
					<div animate:flip>
						<Unit hostId={p.id} />
					</div>
				{/each}
			</div>
			<div class="centerPlaceHolder">
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
								nextAnimationIndex(
									false,
									$currentAnimationIndex,
									$currentAnimationsWithData,
									$lastMsgFromServer,
									someoneDied,
									$animationCancelled,
									$animationsInWaiting,
								);
							}
						}}
					>
						<img class="centerImg" src={$centerFieldTarget.projectileImg} alt="a center target" />
					</div>
				{/if}
			</div>
			<div class="units">
				{#each $enemies as e (e.id)}
					<div animate:flip>
						<Unit hostId={e.id} />
					</div>
				{/each}
				{#each $visualActionSources.filter(s=>!$lockedHandles.get(s.id)) as s (s.id)}
					<div
						animate:flip
						on:click|preventDefault|stopPropagation={() => {
							$lastUnitClicked = s.id;
							$currentConvoPrompt = undefined;
						}}
						role="button"
						tabindex="0"
						on:keydown
					>
						<img class="vasSprite" src={anySprites[s.sprite]} alt="a place" />
					</div>
				{/each}
			</div>
		</div>
	</div>
	<div class="slotButtons">
		{#each $typedInventory as [key, value]}
			{#if actionsForSlot($lastMsgFromServer, key).length || numberShownOnSlot(value)}
				<button
					class="slotButton"
					class:activeSlotButton={$latestSlotButtonInput == key}
					type="button"
					disabled={!actionsForSlot($lastMsgFromServer, key) ||
						!actionsForSlot($lastMsgFromServer, key).length ||
						$waitingForMyAnimation ||
						$clientState.waitingForMyEvent}
					on:click={() => {
						let wepSlotActions = actionsForSlot($lastMsgFromServer, key);
						if (!wepSlotActions || !wepSlotActions.length) return;
						const oneChoice = wepSlotActions.length == 1;
						const onlyAction = wepSlotActions.at(0);
						if (oneChoice && onlyAction) {
							choose(onlyAction);
							$latestSlotButtonInput = 'none';
							return;
						}
						$latestSlotButtonInput = key;
					}}
					>{$lastMsgFromServer.yourInfo.inventory[key].itemId}
					{numberShownOnSlot($lastMsgFromServer.yourInfo.inventory[key]) ?? ''}
					{stockDotsOnSlotButton($lastMsgFromServer.yourInfo.inventory[key])}
				</button>
			{/if}
		{/each}
		{#if $waitButtonAction}
			<button
				class="slotButton"
				disabled={!$waitButtonAction || $waitingForMyAnimation || $clientState.waitingForMyEvent}
				on:click={() => {
					if ($waitButtonAction) {
						choose($waitButtonAction);
						$latestSlotButtonInput = 'none';
					}
				}}>Wait</button
			>
		{/if}
	</div>
	{#if $selectedDetail}
		{#if $selectedVisualActionSource == undefined}
			<div class="selectedDetails">
				<div class="selectedPortrait">
					<img class="portrait" src={$selectedDetail.actual.portrait} alt="portrait" />
				</div>
				<div class="selectedRest">
					<div class="selectedStats">
						{#if $selectedDetail.actual.kind == 'player'}
							<div>
								<strong>
									{$selectedDetail.actual.info.heroName}
								</strong>
							</div>
							<div>
								{$selectedDetail.displayHp}/{$selectedDetail.maxHp} hp
							</div>
							<div>
								{#each Object.entries($selectedDetail.actual.info.statuses) as [key, value]}
									{#if value > 0}
										{`${key} ${value}`}
									{/if}
								{/each}
							</div>
	
							<!-- <div> -->
							{#each Object.entries($selectedDetail.actual.info.inventory) as [key, value]}
								<div>
									{`${key}: ${value.itemId}`}
								</div>
							{/each}
							<div>
								Agility: {$selectedDetail.actual.info.agility}
							</div>
							<div>
								Strength: {$selectedDetail.actual.info.strength}
							</div>
							<!-- <div>
							<button type="button">show gear</button>
							</div> -->
						{/if}
						{#if $selectedDetail.actual.kind == 'enemy'}
						<div>
							<strong>
								{$selectedDetail.actual.enemy.name}
							</strong>
						</div>	
							<div>
								{$selectedDetail.displayHp}/{$selectedDetail.maxHp} hp
							</div>
							<div>
								Template: {$selectedDetail.actual.enemy.templateId}
							</div>
							<div>
								Aggro: {JSON.stringify($selectedDetail.actual.enemy.myAggro)}
							</div>
							<div>
								{#each Object.entries($selectedDetail.actual.enemy.statuses) as [forHero, statuses]}
									{#each Object.entries(statuses) as [key, value]}
										{#if value > 0}
											{`${forHero}: ${key} ${value}, `}
										{/if}
									{/each}
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
	{#if $selectedVisualActionSourceState && $selectedVisualActionSource}
		<div class="selectedDetails">
			<div class="selectedPortrait">
				<img
					src={$selectedVisualActionSource.portrait
						? miscPortraits[$selectedVisualActionSource.portrait]
						: anySprites[$selectedVisualActionSource.sprite]}
					alt="place"
				/>
			</div>
			<div class="selectedRest">
				<div class="vasdPromptAndButtons">
					<div class="vasdPrompt">
						{$selectedVisualActionSourceState.currentRetort ?? 'selected vas has no current retort'}
					</div>
					<div class="vasdButtons">
						{#each $selectedVisualActionSource.actionsInClient.filter(a=>!a.lockHandle || !$lockedHandles.get(a.lockHandle)) as act}
							<button
								type="button"
								on:click={() => {
									if(!$selectedVisualActionSource)return
									if(act.lock){
										for (const handleToLock of act.lock){
											$lockedHandles.set(handleToLock,true)
										}
									}
									if(act.unlock){
										for (const handleToUnlock of act.unlock){
											$lockedHandles.set(handleToUnlock,false)
										}
									}
									$lockedHandles = $lockedHandles
									$visualActionSources = $visualActionSources
									choose(act.clientAct);
									$lastUnitClicked = undefined;

								}}>{act.clientAct.buttonText}</button
							>
						{/each}
						{#each $selectedVisualActionSource.responses.filter((r) => !r.lockHandle || !$lockedHandles.get(r.lockHandle) ) as c}
							<button
								type="button"
								on:click={() => {
									if (!$lastUnitClicked) return;
									if(c.lock){
										for (const handleToLock of c.lock){
											$lockedHandles.set(handleToLock,true)
										}
									}
									$lockedHandles.set(c.lockHandle,true)
									if(c.unlock){
										for (const handleToUnlock of c.unlock){
											$lockedHandles.set(handleToUnlock,false)
										}
									}

									let state = $convoStateForEachVAS.get($lastUnitClicked);
									if (!state) return;
									state.currentRetort = c.retort;
									$visualActionSources = $visualActionSources
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
		padding-inline: 5px;
	}
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		user-select: none;
		touch-action: manipulation;
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
		height: calc(20vh);
		overflow-y: auto;
		/* height: 5; */
		overflow-y: auto;
		border: 1px solid black;
		background-color: lightblue;
		padding: 10px;
	}
	.sceneButtons {
		/* height: 10vh; */
		overflow-y: auto;
		display: inline-block;
		margin-top: 10px;
		margin-bottom: 10px;
		background-color: cadetblue;
		border: 1px solid black;
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
		height: 40vh;
		position: relative;
		/* margin-block: 5px; */
		/* padding: 3px; */
		background-color: brown;
	}
	.visual {
		background-repeat: no-repeat;
		background-size: cover;
		background-attachment: local;
		background-position: center bottom;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		background-color: burlywood;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		/* gap:4px; */
		/* justify-content: center; */
		align-items: center;
		/* justify-items:; */
		/* height: fit-content; */
		height: 100%;
	}

	.units {
		display: grid;
		/* direction: rtl; */
		/* background-color: beige; */
		/* grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); */
		row-gap: 2px;
		grid-template-columns: repeat(auto-fit, 120px);
		justify-content: center;
		justify-items: center;
		align-items: center;
		/* gap:2px; */
	}
	.centerPlaceHolder {
		height: 30px;
		width: 30px;
		/* background-color: aqua; */
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
		background-color: bisque;
		display: flex;
		justify-content: center;
		/* height:5vh; */
		/* border: 2px solid brown; */
	}
	.slotButton {
		padding: 4px;
	}
	.activeSlotButton {
		border: 5px dotted yellow;
	}
	.selectedDetails {
		background-color: beige;
		display: flex;
		align-items: flex-start;
		height: 20vh;
		/* height:400px; */
	}
	.selectedPortrait {
		/* width: 20vw; */
		flex-basis:20%;
		height: 100%;
		/* background-color: blueviolet; */
		display:flex;
		justify-content: center;
		/* place-items: center; */
		/* overflow:hidden; */
		/* height: 20vh; */
	}
	.selectedPortrait > img {
		object-fit:cover;
		height: 100%;
		/* background-color: brown; */
		/* width:100%; */
		/* width: 100%; */
		/* max-height: 90%; */
		/* max-width: 100%; */
	}
	.selectedRest {
		flex-basis:80%;
		height:100%;
		padding:10px;
		/* width:80vw; */
	}
	.selectedStats {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		overflow-y: auto;
		padding: 5px;
		/* background-color: aquamarine; */
	}
	/* .visualActionSourceDetail { */
		/* display: flex; */
		/* height:15vh; */
		/* background-color: burlywood; */
		/* } */
	.vasdPromptAndButtons {
		display: flex;
		height:100%;
		flex-direction: column;
		/* justify-content: space-around; */
		overflow-y: auto;
	}
	.vasSprite {
		transform: scaleX(-1);
	}
	/* .vasdPrompt{
	}
	.vasdButtons{
		display: flex;
	} */
</style>

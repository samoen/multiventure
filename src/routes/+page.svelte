<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Unit from '$lib/Components/Unit.svelte';
	import {
		allVisualUnitProps,
		animationCancelled,
		bodySlotActions,
		centerFieldTarget,
		choose,
		clientState,
		currentAnimation,
		currentAnimationIndex,
		currentAnimationsWithData,
		handlePutsStatuses,
		lastMsgFromServer,
		latestSlotButtonInput,
		nextAnimationIndex,
		numberShownOnSlot,
		receiveCenter,
		selectedDetail,
		stockDotsOnSlotButton,
		syncVisualsToMsg,
		updateUnit,
		utilitySlotActions,
		waitButtonAction,
		waitingForMyAnimation,
		wepSlotActions
	} from '$lib/client/ui';
	import type { MessageFromServer } from '$lib/server/messaging';
	import { onMount, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { derived } from 'svelte/store';

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
			await handleAnimationsOnMessage(prevMsg, sMsg);

			// wait for dom elements to be populated
			// console.log('tick');
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
		$animationCancelled = true;
		$currentAnimationIndex = 999;
		// $currentAnimation = undefined;
		// console.log('tick');
		await tick();
		// await new Promise((r) => setTimeout(r, 100));
		$animationCancelled = false;
	}

	async function startAnimating(previous: MessageFromServer, latest: MessageFromServer) {
		$currentAnimationsWithData = latest.animations;
		console.log(`starting anims ${JSON.stringify($currentAnimationsWithData)}`);
		nextAnimationIndex(
			true,
			$currentAnimationIndex,
			$currentAnimationsWithData,
			$lastMsgFromServer,
			false
		);
	}

	async function handleAnimationsOnMessage(
		previous: MessageFromServer | undefined,
		latest: MessageFromServer
	) {
		// console.log(`got animations: ${JSON.stringify(latest.animations)}`);

		// first message just sync instant
		if (!previous) {
			console.log('first message');
			if ($currentAnimation) {
				await cancelAnimations();
			}
			syncVisualsToMsg(latest);
			return;
		}

		if (latest.animations.length && latest.triggeredBy == latest.yourInfo.heroName) {
			console.log('start waiting my anim');
			$waitingForMyAnimation = true;
		}

		// my message with no animations
		if (latest.triggeredBy == latest.yourInfo.heroName && !latest.animations.length) {
			console.log('ours with no');
			if ($currentAnimation) {
				await cancelAnimations();
			}
			syncVisualsToMsg(latest);
			return;
		}

		// someone else's message and we are animating
		if (latest.triggeredBy != latest.yourInfo.heroName && $currentAnimation != undefined) {
			console.log(`someone else and animating ${JSON.stringify($currentAnimation)}`);
			return;
		}

		// anyone's message with no animations and not animating
		if ($currentAnimation == undefined && !latest.animations.length) {
			// await cancelAnimations();
			console.log('anyones message with no animations and not animating');
			syncVisualsToMsg(latest);
			return;
		}

		// our message with animations but animation is in progress
		if (
			latest.animations.length &&
			$currentAnimation != undefined &&
			latest.triggeredBy == latest.yourInfo.heroName
		) {
			console.log('ours with anims but in prog');
			await cancelAnimations();
			syncVisualsToMsg(previous);
			await startAnimating(previous, latest);
			return;
		}

		// console.log(`precheck start anim ${JSON.stringify($currentAnimation)}`)

		// new animations and we aren't animating, start animating
		if (latest.animations.length && $currentAnimation == undefined) {
			console.log('anyones message, we not animating. starting');
			// await cancelAnimations();
			syncVisualsToMsg(previous);
			await startAnimating(previous, latest);
			return;
		}
		console.log('no specific anim handling');
		syncVisualsToMsg(latest);
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
						in:receiveCenter={{ key: $animationCancelled ? 10 : 'center' }}
						on:introend={() => {
							if ($currentAnimation != undefined && !$animationCancelled) {
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
														if(vup.aggro > 100)vup.aggro = 100
														if(vup.aggro < 0)vup.aggro = 0
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
									someoneDied
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
			</div>
		</div>
	</div>
	<div class="slotButtons">
		<button
			class="slotButton"
			class:activeSlotButton={$latestSlotButtonInput == 'weapon'}
			type="button"
			disabled={!$wepSlotActions ||
				!$wepSlotActions.length ||
				$waitingForMyAnimation ||
				$clientState.waitingForMyEvent}
			on:click={() => {
				if (!$wepSlotActions || !$wepSlotActions.length) return;
				let onlyAction = $wepSlotActions.at(0);
				if (onlyAction && !onlyAction.target) {
					choose(onlyAction);
					$latestSlotButtonInput = 'none';
					return;
				}
				$latestSlotButtonInput = 'weapon';
			}}
			>{$lastMsgFromServer.yourInfo.inventory.weapon.itemId}
			{numberShownOnSlot($lastMsgFromServer.yourInfo.inventory.weapon) ?? ''}
			{stockDotsOnSlotButton($lastMsgFromServer.yourInfo.inventory.weapon)}
		</button>

		<button
			class="slotButton"
			class:activeSlotButton={$latestSlotButtonInput == 'utility'}
			type="button"
			disabled={!$utilitySlotActions ||
				!$utilitySlotActions.length ||
				$waitingForMyAnimation ||
				$clientState.waitingForMyEvent}
			on:click={() => {
				if (!$utilitySlotActions || !$utilitySlotActions.length) return;
				let onlyAction = $utilitySlotActions.at(0);
				if (onlyAction && !onlyAction.target) {
					choose(onlyAction);
					$latestSlotButtonInput = 'none';
					return;
				}
				$latestSlotButtonInput = 'utility';
			}}
			>{$lastMsgFromServer.yourInfo.inventory.utility.itemId}
			{numberShownOnSlot($lastMsgFromServer.yourInfo.inventory.utility) ?? ''}
			{stockDotsOnSlotButton($lastMsgFromServer.yourInfo.inventory.utility)}
		</button>
		<button
			class="slotButton"
			class:activeSlotButton={$latestSlotButtonInput == 'body'}
			type="button"
			disabled={!$bodySlotActions ||
				!$bodySlotActions.length ||
				$waitingForMyAnimation ||
				$clientState.waitingForMyEvent}
			on:click={() => {
				if (!$bodySlotActions || !$bodySlotActions.length) return;
				let onlyAction = $bodySlotActions.at(0);
				if (onlyAction && !onlyAction.target) {
					choose(onlyAction);
					$latestSlotButtonInput = 'none';
					return;
				}
				$latestSlotButtonInput = 'body';
			}}
			>{$lastMsgFromServer.yourInfo.inventory.body.itemId}
			{numberShownOnSlot($lastMsgFromServer.yourInfo.inventory.body) ?? ''}
			{stockDotsOnSlotButton($lastMsgFromServer.yourInfo.inventory.body)}
		</button>
		<button
			class="slotButton"
			disabled={!$waitButtonAction || $waitingForMyAnimation || $clientState.waitingForMyEvent}
			on:click={() => {
				if ($waitButtonAction) {
					choose($waitButtonAction);
				}
			}}>Wait</button
		>
	</div>
	{#if $selectedDetail}
		<div class="selectedDetails">
			<div class="selectedPortrait">
				<img class="portrait" src={$selectedDetail.actual.portrait} alt="portrait" />
			</div>
			<div class="selectedStats">
				<div>
					<strong>
						{$selectedDetail.name}
					</strong>
				</div>
				<div>
					{$selectedDetail.displayHp}/{$selectedDetail.maxHp} hp
				</div>
				{#if $selectedDetail.actual.kind == 'player'}
					<div>
						Statuses : {JSON.stringify($selectedDetail.actual.info.statuses)}
					</div>
					<!-- <div> -->
						<!-- Agility: {$selectedDetail.actual.info.} -->
					<!-- </div> -->
					<div>
						<button type="button">show gear</button>
					</div>
				{/if}
				{#if $selectedDetail.actual.kind == 'enemy'}
					<div>
						Template: {$selectedDetail.actual.enemy.templateId}
					</div>
					<div>
						Statuses : {JSON.stringify($selectedDetail.actual.enemy.statuses)}
					</div>
					<div>
						Aggro: {JSON.stringify($selectedDetail.actual.enemy.myAggro)}
					</div>
				{/if}
			</div>
		</div>
	{/if}
	<p>{$lastMsgFromServer.playerFlags} {$lastMsgFromServer.globalFlags}</p>
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
		Logged in as {$lastMsgFromServer.yourInfo.heroName} uid: {data.userId}
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
	/* .actionButtons {
		display: inline-block;
		background-color: beige;
		border: 1px solid black;
	} */
	.slotButton {
		padding: 10px;
	}
	.activeSlotButton {
		border: 5px dotted yellow;
	}
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
		height: 30vh;
		position: relative;
		margin-block: 5px;
		padding: 3px;
		background-color: brown;
	}
	.visual {
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
	.selectedDetails {
		/* background-color: beige; */
		display: inline-flex;
	}
	.selectedPortrait {
		width: 100px;
		height: 100px;
		/* background-color: blueviolet; */
	}
	.selectedPortrait > img {
		height: 100%;
		width: 100%;
	}
	/* .selectedStats { */
	/* background-color: aquamarine; */
	/* } */
</style>

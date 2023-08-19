<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Unit from '$lib/Components/Unit.svelte';
	import gruntPortrait from '$lib/assets/portraits/grunt.webp';
	import {
		allVisualUnitProps,
		animationCancelled,
		centerFieldTarget,
		choose,
		clientState,
		currentAnimation,
		currentAnimationIndex,
		currentAnimationsWithData,
		lastMsgFromServer,
		latestSlotButtonInput,
		nextAnimationIndex,
		receiveCenter,
		syncVisualsToMsg,
		waitButtonAction,
		waitingForMyAnimation,
		type AnimationWithData,
		type VisualUnitProps,

		lastUnitClicked,

		selectedDetail,

		wepSlotActions,

		utilitySlotActions,

		bodySlotActions





	} from '$lib/client/ui';
	import type { EnemyTemplateId } from '$lib/server/enemies.js';
	import {
		isMsgFromServer,
		type AnimationTarget,
		type MessageFromServer
	} from '$lib/utils';
	import { onMount, tick } from 'svelte';

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
			console.log(`gotworld`);
			await handleAnimationsOnMessage(prevMsg, sMsg);

			// wait for dom elements to be populated
			console.log('tick');
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
		// console.log(`cancelling animations`)
		$animationCancelled = true;
		$currentAnimationIndex = 999;
		// $currentAnimation = undefined;
		console.log('tick');
		await tick();
		// await new Promise((r) => setTimeout(r, 100));
		$animationCancelled = false;
	}

	function findPropFromAnimationTarget(at: AnimationTarget): VisualUnitProps | undefined {
		if (at.side == 'hero' && at.name == $lastMsgFromServer?.yourName) {
			// return $heroVisualUnitProps;
			$allVisualUnitProps.at(0)
		}
		// if (at.side == 'enemy') {
			// let en = $enemiesVisualUnitProps.find((e) => at.name == e.name);
			// if (en) return en;
		// }
		// if (at.side == 'hero') {
			let ally = $allVisualUnitProps.find((e) => at.name == e.name && at.side == e.side);
			if (ally) return ally;
		// }
		return undefined;
	}

	async function startAnimating(previous: MessageFromServer, latest: MessageFromServer) {
		let newAnimationsWithData : AnimationWithData[] = []
		for(const a of latest.animations){
			let sourceProp = findPropFromAnimationTarget(a.source);
			if(!sourceProp) continue
			let targetProp = a.target ? findPropFromAnimationTarget(a.target) : undefined;
			let alsoDmgsProps: { target: VisualUnitProps; amount: number }[] = [];
			if (a.alsoDamages) {
				for (const alsoDmged of a.alsoDamages) {
					let dmged = findPropFromAnimationTarget(alsoDmged.target);
					if (dmged) {
						alsoDmgsProps.push({
							target: dmged,
							amount: alsoDmged.amount
						});
					}
				}
			}
			let animWithData : AnimationWithData = {
				...a,
				sourceProp: sourceProp,
				targetProp: targetProp,
				alsoDmgsProps: alsoDmgsProps
			};
			newAnimationsWithData.push(animWithData)

		}
		$currentAnimationsWithData = newAnimationsWithData
		// console.log('starting anims');
		await nextAnimationIndex(true);
	}

	async function handleAnimationsOnMessage(
		previous: MessageFromServer | undefined,
		latest: MessageFromServer
	) {
		// console.log(`got animations: ${JSON.stringify(latest.animations)}`);

		// first message just sync instant
		if (!previous) {
			console.log('first message');
			await cancelAnimations();
			syncVisualsToMsg(latest);
			return;
		}

		if (latest.animations.length && latest.triggeredBy == latest.yourName) {
			$waitingForMyAnimation = true;
		}

		// my message with no animations
		if (latest.triggeredBy == latest.yourName && !latest.animations.length) {
			console.log('ours with no');
			await cancelAnimations();
			syncVisualsToMsg(latest);
			return;
		}

		// someone else's message and we are animating
		if (latest.triggeredBy != latest.yourName && $currentAnimation != undefined) {
			console.log(`someone else and animating ${JSON.stringify($currentAnimation)}`);
			return;
		}

		// anyone's message with no animations and not animating
		if ($currentAnimation == undefined && !latest.animations.length) {
			// await cancelAnimations();
			console.log('anyones and nono');
			syncVisualsToMsg(latest);
			return;
		}

		// our message with animations but animation is in progress
		if (
			latest.animations.length &&
			$currentAnimation != undefined &&
			latest.triggeredBy == latest.yourName
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
	<!-- <button on:click={() => {}}>debug something</button> -->
	<div class="wrapGameField">
			<span class="yourSceneLabel">{$lastMsgFromServer.yourScene}</span>
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
				<!-- clicky={() => {
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
					}} -->
				{#if $allVisualUnitProps.length}
					<Unit side={'hero'} hostIndex={0} stableHost={$allVisualUnitProps.at(0)} />
				{/if}

				{#each $allVisualUnitProps.filter( v=> v.side == 'hero' && v.index != 0)  as p}
					<Unit side={'hero'} hostIndex={p.index} stableHost={p} />
				{/each}
			</div>
			<div class="centerPlaceHolder">
				{#if $centerFieldTarget}
					<div
						class="centerField"
						in:receiveCenter={{ key: $animationCancelled ? 10 : 'cen' }}
						on:introend={() => {
							if ($currentAnimation != undefined && !$animationCancelled && $lastMsgFromServer) {
								if ($currentAnimation.alsoDamages) {
									for (const other of $currentAnimation.alsoDmgsProps) {
										if (other.target) {
											let tar = $allVisualUnitProps.at(other.target.index)
											if(tar){
												tar.displayHp -= other.amount
											}
											// other.target.displayHp -= other.amount;
										}
									}
									// $enemiesVisualUnitProps = $enemiesVisualUnitProps;
									$allVisualUnitProps = $allVisualUnitProps;
									// $heroVisualUnitProps = $heroVisualUnitProps;
								}
								nextAnimationIndex(false);
							}
						}}
					>
						<img class="centerImg" src={$centerFieldTarget.projectileImg} alt="a center target" />
					</div>
				{/if}
			</div>
			<div class="units">
				{#each $allVisualUnitProps.filter(p=>p.side=='enemy') as e}
					<Unit side={'enemy'} hostIndex={e.index} stableHost={e} flipped={true} />
				{/each}
			</div>
		</div>
	</div>
	<div class="slotButtons">
		<button
			class="wepSlotButton"
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
			>{$lastMsgFromServer.yourWeapon.itemId}
		</button>

		<button
			class="utilitySlotButton"
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
			>{$lastMsgFromServer.yourUtility.itemId}
		</button>
		<button
			class="bodySlotButton"
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
			>{$lastMsgFromServer.yourBody.itemId}
		</button>
		<button
			class="waitButton"
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
				<p>
					name: {$selectedDetail.name}
				</p>
				<p>
					health : {$selectedDetail.displayHp}/{$selectedDetail.maxHp}
				</p>
				<!-- {#if $lastUnitClicked.actual.kind == 'otherPlayer'}
					other
					{/if}
					{#if $lastUnitClicked.actual.kind == 'enemy'}
					stuff
					{/if} -->
				</div>
			</div>
		{/if}
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
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
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
		background-color: beige;
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
	.selectedStats {
		/* background-color: aquamarine; */
	}
</style>

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
	import arrow from '$lib/assets/arrow.png';
	import type { ItemId, ItemIdForSlot } from '$lib/server/items.js';
	import Unit from '$lib/Components/Unit.svelte';
	import {
		animationCancelled,
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
		syncVisualsToMsg,
		type VisualUnitProps,
		nextAnimationIndex,
		subAnimationStage,
		receiveProj,
		centerFieldTarget,
		findVisualUnitProps,
		receiveCenter,
		wepSlotActions,
		utilitySlotActions,
		bodySlotActions
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

	async function startAnimating(previous: MessageFromServer, latest: MessageFromServer) {
		latest.enemiesInScene.forEach((e) => {
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
		console.log('starting anims');
		await nextAnimationIndex(true);
		// $currentAnimationIndex = 0
		// subAnimationStage.set('start')
	}

	async function handleAnimationsOnMessage(
		previous: MessageFromServer | undefined,
		latest: MessageFromServer
	) {
		console.log(`got animations: ${JSON.stringify(latest.animations)}`);
		// console.log(`current when got ${JSON.stringify($currentAnimation)}`)

		// first message just sync instant
		if (!previous) {
			console.log('first message');
			await cancelAnimations();
			syncVisualsToMsg(latest);
			return;
		}

		// our message with no animations
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

	function allUnitProps(): VisualUnitProps[] {
		if (!$heroVisualUnitProps) return [];
		return [$heroVisualUnitProps, ...$alliesVisualUnitProps, ...$enemiesVisualUnitProps];
	}

	function resetClickableUnits() {
		for (const prop of allUnitProps()) {
			prop.clickableAction = undefined;
		}
	}
	function reactUnitProps() {
		$enemiesVisualUnitProps = $enemiesVisualUnitProps;
		$heroVisualUnitProps = $heroVisualUnitProps;
		$alliesVisualUnitProps = $alliesVisualUnitProps;
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
	<div
		class="visual"
		role="button"
		tabindex="0"
		on:keydown
		on:click={() => {
			console.log('visual clicked');
			resetClickableUnits();
			reactUnitProps();
		}}
	>
		<div class="units">
			<!-- acts={$lastMsgFromServer.itemActions.filter(
				(ia) =>
					ia &&
					ia.target &&
					((ia.target.kind == 'friendly' &&
						ia.target.targetName == $lastMsgFromServer?.yourName) ||
						ia.target.kind == 'onlySelf')
			)} -->
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
			{#if $heroVisualUnitProps}
				<Unit side={'hero'} stableHost={$heroVisualUnitProps} />
			{/if}

			{#each $alliesVisualUnitProps as p}
				<!-- acts={$lastMsgFromServer.itemActions.filter(
						(ia) =>
							ia && ia.target && ia.target.kind == 'friendly' && ia.target.targetName == p.name
					)} -->
				<!-- clicky={() => {
					}} -->
				<Unit side={'hero'} stableHost={p} />
			{/each}
		</div>
		{#if $centerFieldTarget}
			<div
				class="centerField"
				in:receiveCenter={{ key: $animationCancelled ? 10 : 'cen' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled && $lastMsgFromServer) {
						if ($currentAnimation.alsoDamages) {
							for (const other of $currentAnimation.alsoDamages) {
								let otherProps = findVisualUnitProps(
									other.target,
									$lastMsgFromServer,
									$heroVisualUnitProps,
									$enemiesVisualUnitProps,
									$alliesVisualUnitProps
								);
								if (otherProps) {
									otherProps.displayHp -= other.amount;
								}
							}
							$enemiesVisualUnitProps = $enemiesVisualUnitProps;
							$alliesVisualUnitProps = $alliesVisualUnitProps;
							$heroVisualUnitProps = $heroVisualUnitProps;
						}
						// if (
						// 	$currentAnimation.target.name == stableHost.name &&
						// 	$currentAnimation.target.side == side
						// ) {
						console.log(`center reached, nexting`);
						nextAnimationIndex(false);
						// }
					}
				}}
			>
				<img class="centerImg" src={$centerFieldTarget.projectileImg} alt="a center target" />
			</div>
		{/if}
		<div class="units">
			{#each $enemiesVisualUnitProps as e}
				<Unit side={'enemy'} stableHost={e} flipped={true} />
			{/each}
		</div>
	</div>
	<div class="slotButtons">
		<button
			class="wepSlotButton"
			type="button"
			disabled={!$wepSlotActions || !$wepSlotActions.length}
			on:click={() => {
				if (!$wepSlotActions || !$wepSlotActions.length) return;
				let onlyAction = $wepSlotActions.at(0);
				if (onlyAction && !onlyAction.target) {
					choose(onlyAction);
					return;
				}
				resetClickableUnits();
				// console.log(JSON.stringify(wepActions))
				for (const wepAct of $wepSlotActions) {
					if (wepAct.target) {
						let prop = findVisualUnitProps(
							wepAct.target,
							$lastMsgFromServer,
							$heroVisualUnitProps,
							$enemiesVisualUnitProps,
							$alliesVisualUnitProps
						);
						if (prop) {
							prop.clickableAction = wepAct;
						}
					}
				}
				reactUnitProps();
			}}
			>{$lastMsgFromServer.yourWeapon.itemId}
		</button>

		<button
			class="utilitySlotButton"
			type="button"
			disabled={!$utilitySlotActions || !$utilitySlotActions.length}
			on:click={() => {
				if (!$utilitySlotActions || !$utilitySlotActions.length) return;
				let onlyAction = $utilitySlotActions.at(0);
				if (onlyAction && !onlyAction.target) {
					choose(onlyAction);
					return;
				}
				resetClickableUnits();
				// console.log(JSON.stringify(wepActions))
				for (const act of $utilitySlotActions) {
					if (act.target) {
						let prop = findVisualUnitProps(
							act.target,
							$lastMsgFromServer,
							$heroVisualUnitProps,
							$enemiesVisualUnitProps,
							$alliesVisualUnitProps
						);
						if (prop) {
							prop.clickableAction = act;
						}
					}
				}
				reactUnitProps();
			}}
			>{$lastMsgFromServer.yourUtility.itemId}
		</button>
		<button
			class="bodySlotButton"
			type="button"
			disabled={!$bodySlotActions || !$bodySlotActions.length}
			on:click={() => {
				if (!$bodySlotActions || !$bodySlotActions.length) return;
				let onlyAction = $bodySlotActions.at(0);
				if (onlyAction && !onlyAction.target) {
					choose(onlyAction);
					return;
				}
				resetClickableUnits();
				for (const act of $bodySlotActions) {
					if (act.target) {
						let prop = findVisualUnitProps(
							act.target,
							$lastMsgFromServer,
							$heroVisualUnitProps,
							$enemiesVisualUnitProps,
							$alliesVisualUnitProps
						);
						if (prop) {
							prop.clickableAction = act;
						}
					}
				}
				reactUnitProps();
			}}
			>{$lastMsgFromServer.yourBody.itemId}
		</button>
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
	:global(*){
		box-sizing: border-box;
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
		/* gap: 10px; */
	}
	.centerField {
		/* background-color: aqua; */
		height: 60px;
		width: 60px;
		justify-self: center;
		align-self: center;
		display: flex;
		justify-content: center;
		align-content: center;
	}
	.centerImg {
		height: 100%;
		width: 100%;
	}
	.visual {
		background-color: burlywood;
		display: flex;
		justify-content: space-between;
		padding: 50px;
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

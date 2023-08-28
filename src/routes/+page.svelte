<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Unit from '$lib/Components/Unit.svelte';
	import {
		convoStateForEachVAS,
		actionsForSlot,
		allVisualUnitProps,
		bodySlotActions,
		centerFieldTarget,
		choose,
		lockedHandles,
		clientState,
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


		worldReceived



	} from '$lib/client/ui';
	import type { MessageFromServer } from '$lib/server/messaging';
	import { onMount, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { derived, writable, type Writable } from 'svelte/store';
	import plains from '$lib/assets/landscapes/landscape-plain.webp';
	import type { BattleAnimation, DataFirstLoad } from '$lib/utils';
	import VisualActionSource from '$lib/Components/VisualActionSource.svelte';
	import { fade } from 'svelte/transition';

	export let data : DataFirstLoad;
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

	lastMsgFromServer.subscribe(m=>{
		scrollHappenings()
	})
		
	async function scrollHappenings(){
		
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

		source.addEventListener('firstack',async(e)=>{
			getWorld()
		})

		source.addEventListener('world', async (e) => {
			let sMsg = JSON.parse(e.data);
			if (!isMsgFromServer(sMsg)) {
				console.log('malformed event from server');
				return;
			}
			worldReceived(sMsg)
		});
		source.addEventListener('closing', (e) => {
			console.log('got closing msg');
			source?.close();
			$clientState.status = 'you logged in elsewhere, connection closed';
			$lastMsgFromServer = undefined;
		});
		console.log('subscribed');
	}

	async function getWorld(){
		$clientState.loading = true
		let r = await fetch('/api/world', { method: 'POST' })
		let sMsg = await r.json()
		if (!isMsgFromServer(sMsg)) {
			console.log('malformed event from server');
			return;
		}
		worldReceived(sMsg)
		$clientState.loading = false
	}

	async function cancelAnimations() {
		console.log(`cancelling animations`);
		// $animationCancelled = true;
		// $currentAnimationIndex = 999;
		
		// let transitions reach their end
		// await tick();

		// $animationCancelled = false;
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
		$currentAnimationIndex = 999
		$convoStateForEachVAS.clear();
		$visualActionSources = []
		$allVisualUnitProps = []
		$lockedHandles.clear()
		$currentConvoPrompt = undefined
		$latestSlotButtonInput = 'none'
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
			$clientState.loading = false;
		}
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
{#if $clientState.loading}
	<p>loading...</p>
{/if}
<br />
{#if !$clientState.loading && $lastMsgFromServer == null}
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
					<div class="unitHolder" animate:flip>
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
									someoneDied,
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
					<div class="unitHolder" animate:flip>
						<Unit hostId={e.id} />
					</div>
				{/each}
				{#each $visualActionSources.filter(s=>!$lockedHandles.get(s.id)) as s (s.id)}
					<div class="vasSpriteHolder"
						in:fade|local
						animate:flip
					>
						<VisualActionSource hostId={s.id}></VisualActionSource>
						<!-- <img class="vasSprite" src={anySprites[s.sprite]} alt="a place" /> -->
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
		{#each $slotlessBattleActions as act}
			<button
				class="slotButton"
				disabled={!$slotlessBattleActions || $waitingForMyAnimation || $clientState.waitingForMyEvent}
				on:click={() => {
					// if (a) {
						choose(act);
						$latestSlotButtonInput = 'none';
					// }
				}}>{act.buttonText}</button
			>
		{/each}
	</div>
	{#if $selectedDetail && $selectedDetail.kind == 'vup'}
			<div class="selectedDetails">
				<div class="selectedPortrait">
					<img class="portrait" src={$selectedDetail.entity.actual.portrait} alt="portrait" />
				</div>
				<div class="selectedRest">
					<div class="selectedStats">
						{#if $selectedDetail.entity.actual.kind == 'player'}
							<div>
								<strong>
									{$selectedDetail.entity.actual.info.heroName}
								</strong>
							</div>
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
							<strong>
								{$selectedDetail.entity.actual.enemy.name}
							</strong>
						</div>	
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
				</div>
			</div>
	{/if}
	{#if $selectedVisualActionSourceState && $selectedDetail && $selectedDetail.kind == 'vas'}
		<div class="selectedDetails">
			<div class="selectedPortrait">
				<img
					src={$selectedDetail.entity.portrait
						? miscPortraits[$selectedDetail.entity.portrait]
						: anySprites[$selectedDetail.entity.sprite]}
					alt="place"
				/>
			</div>
			<div class="selectedRest">
				<div class="vasdPromptAndButtons">
					<div class="vasdPrompt">
						{$selectedVisualActionSourceState.currentRetort ?? 'selected vas has no current retort'}
					</div>
					<div class="vasdButtons">
						{#each $selectedDetail.entity.actionsInClient.filter(a=>!a.lockHandle || !$lockedHandles.get(a.lockHandle)) as act}
							<button
								type="button"
								disabled={$clientState.waitingForMyEvent}
								on:click={async () => {
									if(!$selectedDetail || $selectedDetail.kind != 'vas')return
									$lastUnitClicked = $selectedDetail.entity.id
									$selectedDetail.entity
									await choose(act.clientAct);
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
									$lastUnitClicked = undefined;
									$lockedHandles = $lockedHandles
									$visualActionSources = $visualActionSources

								}}>{act.clientAct.buttonText}</button
							>
						{/each}
						{#each $selectedDetail.entity.responses.filter((r) => !r.lockHandle || !$lockedHandles.get(r.lockHandle) ) as c}
							<button
								type="button"
								on:click={() => {
									if(!$selectedDetail)return
									$lastUnitClicked = $selectedDetail.entity.id
									if(c.lock){
										for (const handleToLock of c.lock){
											$lockedHandles.set(handleToLock,true)
										}
									}
									if(c.lockHandle){
										$lockedHandles.set(c.lockHandle,true)
									}
									if(c.unlock){
										for (const handleToUnlock of c.unlock){
											$lockedHandles.set(handleToUnlock,false)
										}
									}

									let state = $selectedVisualActionSourceState;
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
		/* padding-inline: 5px; */
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
		/* background-color: brown; */
		overflow-x: hidden;
	}
	.visual {
		background-repeat:repeat-x;
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
		justify-content: center;
		align-items: center;
		/* justify-items:center; */
		/* height: fit-content; */
		height: 100%;
	}

	/* .unitHolder{ */
		/* background-color: blue; */
	/* } */

	.units {
		display: grid;
		/* background-color: beige; */
		row-gap: 2px;
		/* column-gap: 2px; */
		grid-template-columns: repeat(auto-fit, clamp(90px,50%,240px));
		justify-content: center;
		/* align-items: start; */
		
	}
	.centerPlaceHolder {
		/* height: 30px; */
		/* width: 30px; */
		height:clamp(14px,1vw + 12px,30px);
		width:clamp(14px,1vw + 12px,30px);
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
		flex-basis:15%;
		/* height: 100%; */
		/* background-color: blueviolet; */
		/* display:flex; */
		/* justify-content: center; */
		/* width:10vw; */
		height:100%;
		/* place-items: center; */
		/* overflow:hidden; */
		/* height: 20vh; */
	}
	.selectedPortrait > img {
		display:block;
		object-fit:cover;
		/* height: 100%; */
		/* background-color: brown; */
		width:100%;
		height:100%
		/* width: 100%; */
		/* max-height: 90%; */
		/* max-width: 100%; */
	}
	.selectedRest {
		flex-basis:85%;
		height:100%;
		/* padding:10px; */
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
		padding:10px;
		display: flex;
		height:100%;
		flex-direction: column;
		/* justify-content: space-around; */
		overflow-y: auto;
	}
	.vasSpriteHolder{
		display: grid;
		place-items: center;
	}

	/* .vasdPrompt{
	}
	.vasdButtons{
		display: flex;
	} */
</style>

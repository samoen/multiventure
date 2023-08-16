<script lang="ts" context="module">
	const activeId = writable(0);
	let id = 0;
</script>

<script lang="ts">
	import {
		choose,
		clientState,
		currentAnimation,
		currentAnimationIndex,
		heroVisualUnitProps,
		lastMsgFromServer,
		enemiesVisualUnitProps,
		type VisualUnitProps,
		syncVisualsToLatest,
		animationSpeed,
		receive,
		send,

		animationCancelled,

		type Guest,

		type ProjectileProps,

		type Projectile




	} from '$lib/client/ui';
	import type { GameActionSentToClient } from '$lib/utils';
	import { quintOut } from 'svelte/easing';
	import { writable, type Writable } from 'svelte/store';
	import { crossfade } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';
	import { tick } from 'svelte';

	export let host: VisualUnitProps | undefined;
	// export let guest: Writable<VisualUnitProps | undefined> | undefined;
		


	export let guest: Guest;
	export let projectileSource : Projectile
	export let projectileTarget : Projectile

	// function isProjectileProps(guest:Guest) : guest is ProjectileProps{
	// 	return typeof guest == 'object' && 'projectileImg' in guest
	// }

	export let flipped: boolean = false;
	export let acts: GameActionSentToClient[];
	export let clicky: () => void;

	// export let recv
	// export let snd
	$: selected = $activeId === componentId;
	// let selected = false;

	const componentId = ++id;
</script>

<div class="unitAndArea">
	<div
		class="placeHolder"
		on:click={() => {
			clicky();
			// selected = !selected
			if (acts.length) {
				$activeId = componentId;
			}
			// $clientState.selectedUnit =`${flip}${name}`
		}}
		role="button"
		tabindex="0"
		on:keydown
	>
		{#if host}
			<!-- {#if host && !host.animating} -->
			<div
				out:send={{ key: $animationCancelled?0:'movehero' }}
				in:receive={{ key: $animationCancelled?1:'movehero' }}
				on:introend={async () => {
					if (currentAnimation != undefined && !$animationCancelled) {
						$currentAnimationIndex++;
						$currentAnimation = $lastMsgFromServer?.animations.at($currentAnimationIndex);
						if ($currentAnimation == undefined) {
							syncVisualsToLatest($lastMsgFromServer);
						}else{
							await tick()
							$currentAnimation.fired = true
						}
					}
				}}
			>
				<VisualUnit vu={host} {flipped} />
			</div>
		{/if}
	</div>
	<div class="area" style:order={flipped ? 0 : 2}>
		<!-- {#if guest?.animating} -->
		{#if guest}
			<div
				class="placeHolder"
				in:receive={{ key: $animationCancelled?3:'movehero' }}
				out:send={{ key: $animationCancelled?4:'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled) {
						if (host) {
							console.log(host.name + 'animation dmg');
							if ($currentAnimation) host.displayHp -= $currentAnimation?.damage;
							$currentAnimation = undefined;
						}
					}
				}}
			>
				<VisualUnit vu={guest} flipped={!flipped} />
			</div>
			{/if}
			{#if projectileSource}
			<div
				class="projSourceHolder"
				class:startAlignSelf={!flipped} class:endAlignSelf={flipped}
				out:send={{ key: $animationCancelled?7:'proj' }}
			>
				<img class="projectile" src={projectileSource.projectileImg} alt="a projectile">
			</div>
		{/if}
			{#if projectileTarget}
			<div
				class="projHolder"
				class:startAlignSelf={!flipped} class:endAlignSelf={flipped}
				in:receive={{ key: $animationCancelled?8:'proj' }}
				on:introend={async () => {
					if ($currentAnimation != undefined && !$animationCancelled) {
						if (host) {
							console.log(host.name + 'projectile animation dmg');
							if ($currentAnimation) host.displayHp -= $currentAnimation?.damage;
							$currentAnimationIndex++;
							$currentAnimation = $lastMsgFromServer?.animations.at($currentAnimationIndex);
							if ($currentAnimation == undefined) {
								syncVisualsToLatest($lastMsgFromServer);
							}else{
								await tick()
								$currentAnimation.fired = true
							}
						}
					}
				}}
			>
				<img class="projectile" src={projectileTarget.projectileImg} alt="a projectile">
			</div>
		{/if}
		{#if selected}
			<!-- {#if $clientState.selectedUnit === `${flip}${name}`} -->
			<div class="actions" class:startAligned={!flipped} class:endAligned={flipped}>
				{#each acts as a}
					<button
						class="action"
						on:click={() => {
							// selected = false
							$activeId = 0;
							choose(a);
						}}>{a.buttonText}</button
					>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.placeHolder {
		border: 3px solid black;
		order: 1;
		width: 60px;
	}
	.projHolder{
		background-color: aquamarine;
		/* display: none; */
		/* opacity: 0; */
		height:20px;
		width:20px;
	}
	.projSourceHolder{
		background-color: aquamarine;
		/* display: none; */
		/* opacity: 0; */
		height:20px;
		width:20px;
	}
	.projectile {
		height:20px;
		width:20px;
	}
	/* .guest {
		background-color: red;
		height: 40px;
		width: 40px;
	} */

	.action {
		white-space: nowrap;
	}
	.actions {
		display: flex;
		margin-top: 20px;
		flex-direction: column;
	}
	.endAligned {
		align-items: flex-end;
	}
	.startAligned {
		align-items: flex-start;
	}
	.endAlignSelf {
		align-self: flex-end;
	}
	.startAlignSelf {
		align-self: flex-start;
	}
	.unitAndArea {
		display: flex;
		flex-direction: row;
		height: 100px;
	}
	.area {
		background-color: brown;
		width: 60px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
</style>

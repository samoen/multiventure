<!-- <script lang="ts" context="module">
	const activeId = writable(0);
	let id = 0;
</script> -->

<script lang="ts">
	import {
		choose,
		clientState,
		currentAnimation,
		currentAnimationIndex,
		heroVisualUnitProps,
		lastMsgFromServer,
		enemiesVisualUnitProps,
		alliesVisualUnitProps,
		type VisualUnitProps,
		syncVisualsToLatest,
		receiveMelee,
		sendMelee,
		animationCancelled,
		type Guest,
		type ProjectileProps,
		type Projectile,
		receiveProj,
		sendProj
	} from '$lib/client/ui';
	import arrow from '$lib/assets/arrow.png';
	import type { AnimationTarget, GameActionSentToClient } from '$lib/utils';
	import { quintOut } from 'svelte/easing';
	import { derived, writable, type Writable } from 'svelte/store';
	import { crossfade } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';
	import { tick } from 'svelte';


	export let side: 'hero' | 'enemy';
	export let stableHost: VisualUnitProps;

	export let flipped: boolean = false;
	// export let acts: GameActionSentToClient[];
	export let clicky: () => void;

	const hostHome = derived(currentAnimation, ($i) => {
		// let currentAnim = $lastMsgFromServer?.animations.at($i)
		console.log('calc host home');
		let currentAnim = $i;
		if (!currentAnim) return true;
		if (
			currentAnim.projectile == 'melee' &&
			currentAnim.source.side == side &&
			currentAnim.source.name == stableHost.name
		) {
			console.log('host not home');
			return false;
		}
		return true;
	});

	function findVisualUnitProps(at: AnimationTarget): VisualUnitProps | undefined {
		if (at.side == 'hero' && at.name == $lastMsgFromServer?.yourName) {
			return $heroVisualUnitProps;
		}
		if(at.side == 'enemy'){
			let en = $enemiesVisualUnitProps.find((e) => at.name == e.name);
			if (en) return en;
		}
		if(at.side == 'hero'){
			let ally = $alliesVisualUnitProps.find((e) => at.name == e.name);
			if (ally) return ally;
		}
		return undefined
	}

	const dGuest = derived(currentAnimation, ($i) => {
		let currentAnim = $i;
		if (!currentAnim) return undefined;
		if (
			currentAnim.projectile == 'melee' &&
			currentAnim.target.side == side &&
			currentAnim.target.name == stableHost.name
		) {
			return findVisualUnitProps(currentAnim.source);
		}
		return undefined;
	});

	const dProjectileSource = derived(currentAnimation, ($currentAnimation) => {
		if (!$currentAnimation) return undefined;
		if (
			$currentAnimation.projectile == 'arrow' &&
			$currentAnimation.source.name == stableHost.name &&
			$currentAnimation.source.side == side &&
			!$currentAnimation.fired
		) {
			return { projectileImg: arrow };
		}
		return undefined;
	});

	const dProjectileTarget = derived(currentAnimation, ($currentAnimation) => {
		if (!$currentAnimation) return undefined;
		if (
			$currentAnimation?.projectile == 'arrow' &&
			(($currentAnimation?.target.side == side &&
			stableHost.name == $currentAnimation?.target.name)
			|| ($currentAnimation.alsoDamages?.some(ad=>ad.name==stableHost.name && ad.side==side))
			) &&
			$currentAnimation?.fired
		) {
			return { projectileImg: arrow };
		}
		return undefined;
	});

	// export let recv
	// export let snd
	// $: selected = $activeId === componentId;
	// let selected = false;

	// const componentId = ++id;
</script>

<div class="unitAndArea">
	<div
		class="placeHolder"
		on:click={() => {
			clicky();
			// selected = !selected
			// if (acts.length) {
			// 	$activeId = componentId;
			// }
			// $clientState.selectedUnit =`${flip}${name}`
		}}
		role="button"
		tabindex="0"
		on:keydown
	>
		{#if $hostHome}
			<!-- {#if host && !host.animating} -->
			<div
				out:sendMelee={{ key: $animationCancelled ? 0 : 'movehero' }}
				in:receiveMelee={{ key: $animationCancelled ? 1 : 'movehero' }}
				on:introend={async () => {
					if (currentAnimation != undefined && !$animationCancelled) {
						$currentAnimationIndex++;
						$currentAnimation = $lastMsgFromServer?.animations.at($currentAnimationIndex);
						if ($currentAnimation == undefined) {
							syncVisualsToLatest($lastMsgFromServer);
						} else {
							// if next anim is ranged, fire it
							await tick();
							$currentAnimation.fired = true;
						}
					}
				}}
			>
				<VisualUnit vu={stableHost} {flipped} />
			</div>
		{/if}
	</div>
	<div class="area" style:order={flipped ? 0 : 2}>
		<!-- {#if guest?.animating} -->
		{#if $dGuest}
			<div
				class="placeHolder"
				in:receiveMelee={{ key: $animationCancelled ? 3 : 'movehero' }}
				out:sendMelee={{ key: $animationCancelled ? 4 : 'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled) {
							if ($currentAnimation) stableHost.displayHp -= $currentAnimation?.damage;
							$currentAnimation = undefined;
					}
				}}
			>
				<VisualUnit vu={$dGuest} flipped={!flipped} />
			</div>
		{/if}
		{#if $dProjectileSource}
			<!-- {#if $currentAnimation && $currentAnimation.alsoDamages}
			{#each $currentAnimation.alsoDamages as ad}
				<div
					class="projSourceHolder"
					class:startAlignSelf={!flipped}
					class:endAlignSelf={flipped}
					out:sendProj={{ key: $animationCancelled ? 7 : 'proj' }}
				>
					<img 
					class="projectile" class:flipped={flipped} src={$dProjectileSource.projectileImg} alt="a projectile" />
				</div>
				
			{/each}

			{/if} -->
			<div
				class="projSourceHolder"
				class:startAlignSelf={!flipped}
				class:endAlignSelf={flipped}
				out:sendProj={{ key: $animationCancelled ? 7 : 'proj' }}
			>
				<img 
				class="projectile" class:flipped={flipped} src={$dProjectileSource.projectileImg} alt="a projectile" />
			</div>
		{/if}
		{#if $dProjectileTarget}
			<div
				class="projHolder"
				class:startAlignSelf={!flipped}
				class:endAlignSelf={flipped}
				in:receiveProj={{ key: $animationCancelled ? 8 : 'proj' }}
				on:introend={async () => {
					if ($currentAnimation != undefined && !$animationCancelled) {
							if ($currentAnimation) stableHost.displayHp -= $currentAnimation?.damage;
							if($currentAnimation.target.name == stableHost.name && $currentAnimation.target.side == side){
								$currentAnimationIndex++;
								$currentAnimation = $lastMsgFromServer?.animations.at($currentAnimationIndex);
								if ($currentAnimation == undefined) {
									syncVisualsToLatest($lastMsgFromServer);
								} else {
									// if next anim is ranged, fire it
									await tick();
									$currentAnimation.fired = true;
								}
							}
					}
				}}
			>
				<img 
				class="projectile"
				class:flipped={!flipped}
				src={$dProjectileTarget.projectileImg} alt="a projectile" />
			</div>
		{/if}
		<!-- {#if selected}
			<div class="actions" class:startAligned={!flipped} class:endAligned={flipped}>
				{#each acts as a}
					<button
						class="action"
						on:click={() => {
							$activeId = 0;
							choose(a);
						}}>{a.buttonText}</button
					>
				{/each}
			</div>
		{/if} -->
	</div>
</div>

<style>
	.flipped {
		transform: scaleX(-1);
	}
	.placeHolder {
		border: 3px solid black;
		order: 1;
		width: 60px;
	}
	.projHolder {
		background-color: aquamarine;
		/* display: none; */
		/* opacity: 0; */
		height: 20px;
		width: 20px;
	}
	.projSourceHolder {
		background-color: aquamarine;
		/* display: none; */
		/* opacity: 0; */
		height: 20px;
		width: 20px;
	}
	.projectile {
		height: 20px;
		width: 20px;
	}
	/* .guest {
		background-color: red;
		height: 40px;
		width: 40px;
	} */

	/* .action {
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
	} */
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

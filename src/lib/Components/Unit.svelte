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
		syncVisualsToMsg,
		receiveMelee,
		sendMelee,
		animationCancelled,
		type Guest,
		type ProjectileProps,
		type Projectile,
		receiveProj,
		sendProj,
		nextAnimationIndex,
		subAnimationStage,

		extraSprites,

		findVisualUnitProps,

		sendCenter



	} from '$lib/client/ui';
	import arrow from '$lib/assets/arrow.png';
	import type { AnimationTarget, GameActionSentToClient, MessageFromServer } from '$lib/utils';
	import { quintOut } from 'svelte/easing';
	import { derived, writable, type Writable } from 'svelte/store';
	import { crossfade, fade } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';
	import { tick } from 'svelte';

	export let side: 'hero' | 'enemy';
	export let stableHost: VisualUnitProps;
	// console.log('stablehost: ' + JSON.stringify(stableHost))
	export let flipped: boolean = false;
	// export let acts: GameActionSentToClient[];
	// export let clicky: () => void;

	const hostHome = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnim, $subAnimationStage]) => {
			// let currentAnim = $lastMsgFromServer?.animations.at($i)
			// console.log(`current animation is ${$i}`)
			// if(!stableHost) {
			// 	console.log('calced host not home because stablehost undefined');
			// 	return false
			// };
			if (!$currentAnim) {
				// console.log('calc host but anim undefined')
				return true;
			}
			if (
				$currentAnim.behavior == 'melee' &&
				$currentAnim.source.side == side &&
				$currentAnim.source.name == stableHost.name &&
				$subAnimationStage == 'fire'
			) {
				console.log(`host ${stableHost.name} not home`);
				return false;
			}
			// console.log(`host ${stableHost.name} must be home`)
			return true;
		}
	);

	const dGuest = derived(
		[currentAnimation, subAnimationStage, enemiesVisualUnitProps],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior == 'melee' &&
				$currentAnimation.target.side == side &&
				$currentAnimation.target.name == stableHost.name &&
				$subAnimationStage == 'fire'
			) {
				let found = findVisualUnitProps($currentAnimation.source,$lastMsgFromServer, $heroVisualUnitProps, $enemiesVisualUnitProps, $alliesVisualUnitProps);
				if(found){
				// 	found.aggro = 0
					return found
				}
			}
			return undefined;
		}
	);

	const dNoTargetSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'noTarget' &&
				$currentAnimation.source.name == stableHost.name &&
				$currentAnimation.source.side == side &&
				$subAnimationStage == 'start'
			) {
				// if(stableHost.name.startsWith('fireGrem')){
				// 	console.log(`SOURCE ${stableHost.name} source proj`);
				// }
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			// if(stableHost.name.startsWith('fireGrem')){
			// 	console.log(`${stableHost.name} not source proj`);
			// }
			return undefined;
		}
	);
	const dProjectileSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'missile' &&
				$currentAnimation.source.name == stableHost.name &&
				$currentAnimation.source.side == side &&
				$subAnimationStage == 'start'
			) {
				// if(stableHost.name.startsWith('fireGrem')){
				// 	console.log(`SOURCE ${stableHost.name} source proj`);
				// }
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			// if(stableHost.name.startsWith('fireGrem')){
			// 	console.log(`${stableHost.name} not source proj`);
			// }
			return undefined;
		}
	);

	const dProjectileTarget = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			// console.log(`calc target proj ${stableHost.name}`)
			if (
				$currentAnimation.behavior == 'missile' &&
				(($currentAnimation.target.side == side &&
					stableHost.name == $currentAnimation.target.name) 
					// ||
					// $currentAnimation.alsoDamages?.some(
						// (ad) => ad.name == stableHost.name && ad.side == side
					) 
					&&
				$subAnimationStage == 'fire'
			) {
				console.log(`ONTARGET ${stableHost.name} is target proj`);
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			return undefined;
		}
	);

	// export let recv
	// export let snd
	// $: selected = $activeId === componentId;
	// let selected = false;

	// const componentId = ++id;
</script>
<!-- {#if stableHost.clickableAction}
	<p>CLICK ME!</p>
{/if} -->
<div class="unitAndArea">
	<div
		class="placeHolder"
		on:click|preventDefault|stopPropagation={() => {
			// clicky();
			if(stableHost.clickableAction){
				choose(stableHost.clickableAction)
			}
			// selected = !selected
			// if (acts.length) {
			// 	$activeId = componentId;
			// }
			// $clientState.selectedUnit =`${flip}${name}`
		}}
		class:clickable={stableHost.clickableAction}
		role="button"
		tabindex="0"
		on:keydown
	>
		{#if $hostHome}
			<!-- {#if host && !host.animating} -->
			<div
				out:sendMelee={{ key: $animationCancelled ? 0 : 'movehero' }}
				in:receiveMelee={{ key: $animationCancelled ? 1 : 'movehero' }}
				on:introend={() => {
					if (currentAnimation != undefined && !$animationCancelled && $lastMsgFromServer) {
						nextAnimationIndex(false);
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
				on:introend={async () => {
					if ($currentAnimation != undefined && !$animationCancelled) {
						stableHost.displayHp -= $currentAnimation?.damage;
						if($dGuest && $dGuest.aggro){
							let dg = $dGuest
							dg.aggro = 0
							$enemiesVisualUnitProps = $enemiesVisualUnitProps
							await tick()
						}
						
						console.log('sending guest home');
						$subAnimationStage = 'sentHome';
					}
				}}
			>
				<VisualUnit vu={$dGuest} flipped={!flipped} />
			</div>
		{/if}
		{#if $dProjectileSource}
			<div
				class="projSourceHolder"
				out:sendProj={{ key: $animationCancelled ? 7 : 'proj' }}
				class:startAlignSelf={!flipped}
				class:endAlignSelf={flipped}
				in:fade={{duration:1}}
				on:introstart={()=>{
					if(stableHost.aggro){
						stableHost.aggro = 0
					}
				}}
			>
				<img
					class="projectile"
					class:flipped
					src={$dProjectileSource.projectileImg}
					alt="a projectile"
				/>
			</div>
		{/if}
		{#if $dNoTargetSource}
			<div
				class="noTargetSourceHolder"
				class:startAlignSelf={!flipped}
				class:endAlignSelf={flipped}
				in:fade={{duration:1}}
				on:introstart={()=>{
					if(stableHost.aggro){
						stableHost.aggro = 0
					}
				}}
				out:sendCenter={{ key: $animationCancelled ? 11 : 'cen' }}
			>
				<img
					class="noTargetImg"
					class:flipped
					src={$dNoTargetSource.projectileImg}
					alt="a projectile"
				/>
			</div>
		{/if}
		{#if $dProjectileTarget}
			<div
				class="projHolder"
				class:startAlignSelf={!flipped}
				class:endAlignSelf={flipped}
				in:receiveProj={{ key: $animationCancelled ? 8 : 'proj' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled && $lastMsgFromServer) {
						stableHost.displayHp -= $currentAnimation.damage;
						if($currentAnimation.alsoDamages){
							for (const other of $currentAnimation.alsoDamages){
								let otherProps = findVisualUnitProps(other.target,$lastMsgFromServer, $heroVisualUnitProps, $enemiesVisualUnitProps, $alliesVisualUnitProps)
								if(otherProps){
									console.log('hitting other')
									otherProps.displayHp -= other.amount
								}
							}
							$enemiesVisualUnitProps = $enemiesVisualUnitProps
							$alliesVisualUnitProps = $alliesVisualUnitProps
							$heroVisualUnitProps = $heroVisualUnitProps
						}
						// if (
						// 	$currentAnimation.target.name == stableHost.name &&
						// 	$currentAnimation.target.side == side
						// ) {
							console.log(`target ${stableHost.name} reached, nexting`)
							nextAnimationIndex(false);
						// }
					}
				}}
			>
				<img
					class="projectile"
					class:flipped={!flipped}
					src={$dProjectileTarget.projectileImg}
					alt="a projectile"
				/>
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
		border: 3px groove transparent;
		order: 1;
		width: 60px;
		padding:3px;
	}
	.clickable {
		border: 3px groove yellow
	}
	.projHolder {
		/* background-color: aquamarine; */
		/* display: none; */
		/* opacity: 0; */
		height: 20px;
		width: 20px;
	}
	.projSourceHolder {
		/* background-color: aquamarine; */
		/* display: none; */
		/* opacity: 0; */
		height: 20px;
		width: 20px;
	}
	.projectile {
		height: 20px;
		width: 20px;
	}
	.noTargetSourceHolder{
		height:60px;
		width:60px;
	}
	.noTargetImg{
		height:100%;
		width:100%;
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
		/* height: 100px; */
		/* background-color: brown; */
	}
	.area {
		width: 60px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
</style>

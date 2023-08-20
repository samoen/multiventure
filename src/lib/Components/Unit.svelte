<!-- <script lang="ts" context="module">
	const activeId = writable(0);
	let id = 0;
</script> -->

<script lang="ts">
	import {
		allVisualUnitProps,
		animationCancelled,
		choose,
		currentAnimation,
		extraSprites,
		lastMsgFromServer,
		lastUnitClicked,
		latestSlotButtonInput,
		nextAnimationIndex,
		receiveMelee,
		receiveProj,
		sendCenter,
		sendMelee,
		sendProj,
		subAnimationStage,
		type VisualUnitProps,
		selectedDetail,

		updateUnit

	} from '$lib/client/ui';
	import { tick } from 'svelte';
	import { derived } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';

	export let hostIndex: number;

	export let flipped: boolean = false;

	

	const highlightedForAct = derived([latestSlotButtonInput], ([$latestSlotButtonInput]) => {
		if ($latestSlotButtonInput == 'none') return undefined;
		$allVisualUnitProps.at(hostIndex);
		let found = $allVisualUnitProps
			.at(hostIndex)
			?.actionsThatCanTargetMe.find((a) => a.slot == $latestSlotButtonInput);
		return found;
	});

	const hostHome = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnim, $subAnimationStage]) => {
			if (!$currentAnim) {
				return true;
			}
			if (
				$currentAnim.behavior == 'melee' &&
				$currentAnim.sourceIndex == hostIndex &&
				$subAnimationStage == 'fire'
			) {
				return false;
			}
			if($subAnimationStage == 'sentHome')console.log('sent home')
			return true;
		}
	);

	const guestIndex = derived(
		[currentAnimation, subAnimationStage, allVisualUnitProps],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior == 'melee' &&
				$currentAnimation.targetIndex == hostIndex &&
				$subAnimationStage == 'fire'
				) {
				console.log(`new guest ${$currentAnimation.sourceIndex}`)
				return $currentAnimation.sourceIndex;
			}
			return undefined;
		}
	);

	const centerSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'center' &&
				$currentAnimation.sourceIndex == hostIndex &&
				$subAnimationStage == 'start'
			) {
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			return undefined;
		}
	);
	const missileSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'missile' &&
				$currentAnimation.sourceIndex == hostIndex &&
				$subAnimationStage == 'start'
			) {
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			return undefined;
		}
	);

	const dProjectileTarget = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'missile' &&
				$currentAnimation.targetIndex == hostIndex &&
				$subAnimationStage == 'fire'
			) {
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			return undefined;
		}
	);
</script>

<div class="unitAndArea">
	<div
		class="home placeHolder"
		on:click|preventDefault|stopPropagation={() => {
			if ($highlightedForAct) {
				choose($highlightedForAct);
				$latestSlotButtonInput = 'none';
			}
			$lastUnitClicked = hostIndex;
		}}
		class:clickable={$highlightedForAct}
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
				<VisualUnit {hostIndex} {flipped} />
			</div>
		{/if}
	</div>
	<div class="guestArea placeHolder" style:order={flipped ? 0 : 2}>
		{#if $guestIndex != undefined}
			<div
				class="placeHolder"
				in:receiveMelee={{ key: $animationCancelled ? 3 : 'movehero' }}
				out:sendMelee={{ key: $animationCancelled ? 4 : 'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled) {
						let cu = $currentAnimation
						updateUnit(hostIndex,(vup)=>{
							vup.displayHp -= cu.damage
						})
						if($guestIndex == undefined)return
						updateUnit($guestIndex,(vup)=>{
							vup.aggro = 0
						})
						
						$subAnimationStage = 'sentHome';
					}
				}}
			>
				<VisualUnit hostIndex={$guestIndex} flipped={!flipped} />
			</div>
		{/if}
		{#if $missileSource}
			<div
				class="projHolder"
				out:sendProj={{ key: $animationCancelled ? 7 : 'proj' }}
				class:startAlignSelf={!flipped}
				class:endAlignSelf={flipped}
				in:fade={{ duration: 1 }}
				on:introstart={() => {
					updateUnit(hostIndex,(vup)=>{
						vup.aggro = 0
					})
				}}
			>
				<img
					class="projectile"
					class:flipped
					src={$missileSource.projectileImg}
					alt="a projectile"
				/>
			</div>
		{/if}
		{#if $centerSource}
			<div
				class="projHolder"
				class:startAlignSelf={!flipped}
				class:endAlignSelf={flipped}
				in:fade={{ duration: 1 }}
				on:introstart={() => {
					updateUnit(hostIndex,(vup)=>{
						vup.aggro = 0
					})
				}}
				out:sendCenter={{ key: $animationCancelled ? 11 : 'cen' }}
			>
				<img
					class="projectile"
					class:flipped
					src={$centerSource.projectileImg}
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
				on:introend={async () => {
					if ($currentAnimation != undefined && !$animationCancelled) {
						let anim = $currentAnimation
						updateUnit(hostIndex,(vup)=>{
							vup.displayHp -= anim.damage;
						})

						// if ($currentAnimation.alsoDamages) {
							for (const other of $currentAnimation.alsoDmgsProps) {
									updateUnit(other.targetIndex,(vup)=>{
										vup.displayHp -= other.amount
									})
							}
						// }
							for (const other of $currentAnimation.alsoModifiesAggros) {
								if(other.showFor == 'all' || $lastMsgFromServer?.yourName == $currentAnimation.source.name){
									updateUnit(other.targetIndex,(vup)=>{
										if(vup.aggro != undefined){
											if(other.amount != undefined){
												vup.aggro -= other.amount
											}
											if(other.setTo != undefined){
												vup.aggro = other.setTo
											}
										}
									})
								}
							}
						nextAnimationIndex(false);
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
	</div>
</div>

<style>
	.flipped {
		transform: scaleX(-1);
	}
	.home {
		order: 1;
		/* background-color: aqua; */
	}
	.placeHolder {
		border: 3px groove transparent;
		width: 60px;
		height: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.clickable {
		border: 3px groove yellow;
	}
	.projHolder {
		/* background-color: aquamarine; */
		/* display: none; */
		/* opacity: 0; */
		z-index: 2;
		height: 30px;
		width: 30px;
	}
	.projectile {
		/* background-color: aqua; */
		z-index: 2;
		height: 100%;
		width: 100%;
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
		/* height: 100px; */
	}
	.guestArea {
		/* background-color: brown; */
		z-index: 2;
	}
</style>

<!-- <script lang="ts" context="module">
	const activeId = writable(0);
	let id = 0;
</script> -->

<script lang="ts">
	import {
		allVisualUnitProps,
		choose,
		currentAnimation,
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
		updateUnit,
		currentAnimationIndex,
		currentAnimationsWithData,
		handlePutsStatuses,
		animationsInWaiting,
		visualOpacity,

		handleModifyHealth,

		handleModAggros


	} from '$lib/client/ui';
	import { tick } from 'svelte';
	import { derived, writable, type Writable } from 'svelte/store';
	import { blur, fade, fly, scale, slide } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';
	import { stringify } from 'uuid';
	import type { BattleAnimation, UnitId } from '$lib/utils';
	import { anySprites } from '$lib/client/assets';

	export let hostId: UnitId;

	const host = derived([allVisualUnitProps], ([$allVisualUnitProps]) => {
		let nex = $allVisualUnitProps.find((p) => p.actual.entity.unitId == hostId);
		return nex;
	});

	const hostIsNotHero = derived(host, ($host) => {
		if (!$host) return undefined;
		return $host.actual.kind != 'player';
	});

	const highlightedForAct = derived(
		[latestSlotButtonInput, host],
		([$latestSlotButtonInput, $host]) => {
			if ($latestSlotButtonInput == undefined) return undefined;
			let found = $host?.actionsThatCanTargetMe.find((a) => a.itemId == $latestSlotButtonInput);
			return found;
		}
	);

	let boundHostHeight:number
	let placeHoldHeight = 'auto';
	const hostHome = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnim, $subAnimationStage]) => {
			if (!$currentAnim) {
				return true;
			}
			if (
				($currentAnim.behavior.kind == 'melee' || $currentAnim.behavior.kind == 'travel') &&
				$currentAnim.source == hostId &&
				$subAnimationStage == 'fire'
			) {
				// console.log('host leave');
				placeHoldHeight = `${boundHostHeight}px`
				return false;
			}
			return true;
		}
	);

	const guestId = derived(
		[currentAnimation, subAnimationStage, allVisualUnitProps],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior.kind == 'melee' &&
				$currentAnimation.behavior.animateTo == hostId &&
				$subAnimationStage == 'fire'
			) {
				return $currentAnimation.source;
			}
			return undefined;
		}
	);

	const projectileSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				($currentAnimation.behavior.kind == 'missile' ||
					$currentAnimation.behavior.kind == 'center') &&
				$currentAnimation.source == hostId &&
				$subAnimationStage == 'start'
			) {
				return { projectileImg: anySprites[$currentAnimation.behavior.extraSprite] };
			}
			return undefined;
		}
	);

	const projectileSend = derived([currentAnimation], ([$currentAnimation]) => {
		if ($currentAnimation?.behavior.kind == 'missile')
			return { key: 'missile', transition: sendProj };
		if ($currentAnimation?.behavior.kind == 'center')
			return { key: 'center', transition: sendCenter };
		return { key: 'cancelSend', transition: sendProj };
	});
	$: projectileSendTransition = $projectileSend.transition;

	const missileTarget = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior.kind == 'missile' &&
				$currentAnimation.behavior.animateTo == hostId &&
				$subAnimationStage == 'fire'
			) {
				return { projectileImg: anySprites[$currentAnimation.behavior.extraSprite] };
			}
			return undefined;
		}
	);
	const selfInflictSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior.kind == 'selfInflicted' &&
				$currentAnimation.source == hostId &&
				$subAnimationStage == 'start'
			) {
				return { projectileImg: anySprites[$currentAnimation.behavior.extraSprite] };
			}
			return undefined;
		}
	);
</script>

<div class="unitAndArea">
	<div
		class="home placeHolder"
		style="height:{$hostHome ? 'auto' : placeHoldHeight}"
		on:click|preventDefault|stopPropagation={() => {
			if ($highlightedForAct) {
				choose($highlightedForAct);
				$latestSlotButtonInput = undefined;
			}
			$lastUnitClicked = hostId;
		}}
		class:clickable={$highlightedForAct}
		role="button"
		tabindex="0"
		bind:offsetHeight={boundHostHeight}
		on:keydown
	>
		{#if $hostHome}
			<div
				out:sendMelee={{ key: 'movehero' }}
				in:receiveMelee={{ key: 'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined && $subAnimationStage == 'sentHome') {
						nextAnimationIndex(false, false);
					}
				}}
			>
				<VisualUnit {hostId} flip={$hostIsNotHero ?? false} />
			</div>
		{/if}
	</div>
	<div class="guestArea placeHolder" style:order={$hostIsNotHero ? 0 : 2}>
		{#if $guestId != undefined}
			<div
				class="guestHolder"
				in:receiveMelee={{ key: 'movehero' }}
				out:sendMelee={{ key: 'movehero' }}
				on:introend={async () => {
					if ($currentAnimation == undefined || $guestId == undefined) return;
					const anim = $currentAnimation;
					if(anim.alsoDamages){
						let animatedTo = anim.alsoDamages.find(a=>a.target == hostId)
						if(animatedTo){
							for (let i = 0; i < animatedTo.amount.length; i++) {
								updateUnit($guestId, (vup) => {
									vup.tilt = true;
								});
								let stop = false;
								let r = handleModifyHealth(anim,i)
								if(r.died.find(d=>d == hostId)){
									stop = true
								}
								
								await new Promise((r) => setTimeout(r, 100));
								updateUnit($guestId, (vup) => {
									vup.tilt = false;
								});
								if (stop) break;
								await new Promise((r) => setTimeout(r, 200));
							}
						}
					}
					
					handlePutsStatuses(anim);
					if($lastMsgFromServer){
						handleModAggros(anim,$lastMsgFromServer.yourInfo.unitId)
					}
					if ($guestId == undefined) return;
					updateUnit($guestId, (vup) => {
						if (vup.actual.kind == 'enemy') {
							vup.actual.entity.myAggro = 0;
						}
					});
					$subAnimationStage = 'sentHome';
				}}
			>
				<VisualUnit hostId={$guestId} flip={!$hostIsNotHero} />
			</div>
		{/if}
		{#if $projectileSource}
			<!-- in:fade|local={{ duration: 1 }} -->
			<div
				class="projHolder projectileSized"
				out:projectileSendTransition={{ key: $projectileSend.key }}
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				in:fade={{ duration: 0 }}
				on:introstart={() => {
					let anim = $currentAnimation;
					if (!anim) return;
					updateUnit(anim.source, (vup) => {
						if (vup.actual.kind == 'enemy') {
							vup.actual.entity.myAggro = 0;
						}
					});
				}}
			>
				<img
					class="projectile"
					class:flipped={$hostIsNotHero}
					src={$projectileSource.projectileImg}
					alt="a projectile"
				/>
			</div>
		{/if}
		{#if $selfInflictSource}
			<div
				class="projHolder selfInflictSource projectileSized"
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				out:fly|local={{ delay: 0, duration: 600, x: 0, y: -30 }}
				on:outrostart={() => {
					const anim = $currentAnimation;
					if (!anim) return;
					handleModifyHealth(anim,0,true)
					handlePutsStatuses(anim);
					if(!$lastMsgFromServer)return
					handleModAggros(anim,$lastMsgFromServer.yourInfo.unitId)
				}}
				on:outroend={() => {
					nextAnimationIndex(false, false);
				}}
			>
				<img
					class="projectile"
					class:flipped={$hostIsNotHero}
					src={$selfInflictSource.projectileImg}
					alt="a projectile"
				/>
			</div>
		{/if}
		{#if $missileTarget}
			<div
				class="projHolder projectileSized"
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				in:receiveProj={{ key: 'missile' }}
				on:introend={async () => {
					const anim = $currentAnimation;
					if (!anim) return;
					let delayNextStep = false;
					handlePutsStatuses(anim);
					let hRes = handleModifyHealth(anim,0,true);
					if(hRes.died.length){
						delayNextStep = true;
					}
					if($lastMsgFromServer){
						handleModAggros(anim,$lastMsgFromServer?.yourInfo.unitId)
					}
					nextAnimationIndex(false, delayNextStep);
				}}
			>
				<img
					class="projectile"
					class:flipped={!$hostIsNotHero}
					src={$missileTarget.projectileImg}
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
	.unitAndArea {
		display: flex;
		flex-direction: row;
		/* background-color: brown; */
	}
	.home {
		order: 1;
		/* background-color: red; */
	}
	.guestArea {
		/* min-height: 100%; */
		/* display: flex; */
		/* flex-direction: column; */
		z-index: 2;
		position: relative;
		/* overflow: hidden; */
		/* width:50%; */
	}
	.placeHolder {
		border: 2px dashed transparent;
		/* background-color: aqua; */
		border-radius: 10px;
		width: 50%;
	}

	.clickable {
		border: 2px dashed rgba(255, 255, 0, 0.4);
		/* box-shadow: 0 0 10px yellow; */
		/* outline: 2px dashed yellow; */
		/* outline-offset: -7px; */
	}
	.projHolder {
		/* background-color: aquamarine; */
		/* display: none; */
		/* opacity: 0; */
		z-index: 3;
		display: inline;
		top: 40%;
		position: absolute;
	}
	/* .selfInflictSource { */
	/* justify-self: flex-start; */
	/* background-color: chartreuse; */
	/* } */
	.projectile {
		/* background-color: chartreuse; */
		z-index: 3;
		height: 100%;
		width: 100%;
	}
	.startAlignSelf {
		/* align-self: flex-start; */
		left: 0;
	}
	.endAlignSelf {
		align-self: flex-end;
		right: 0;
	}
</style>

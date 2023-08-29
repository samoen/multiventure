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

		anySprites,

		animationsInWaiting,

		visualOpacity




	} from '$lib/client/ui';
	import { tick } from 'svelte';
	import { derived, writable, type Writable } from 'svelte/store';
	import { blur, fade, fly, scale, slide } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';
	import { stringify } from 'uuid';
	import type { BattleAnimation, UnitId } from '$lib/utils';

	export let hostId: UnitId;

	const host = derived([allVisualUnitProps], ([$allVisualUnitProps]) => {
		let nex = $allVisualUnitProps.find((p) => p.id == hostId);
		return nex;
	});

	const hostIsNotHero = derived(host, ($host) => {
		if (!$host) return undefined;
		return $host.side != 'hero';
	});

	const highlightedForAct = derived([latestSlotButtonInput, host], ([$latestSlotButtonInput, $host]) => {
		if ($latestSlotButtonInput == 'none') return undefined;
		let found = $host?.actionsThatCanTargetMe.find((a) => a.slot == $latestSlotButtonInput);
		return found;
	});

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
				console.log('host leave')
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
				$currentAnimation.target == hostId &&
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
				($currentAnimation.behavior.kind == 'missile' || $currentAnimation.behavior.kind == 'center') &&
				$currentAnimation.source == hostId &&
				$subAnimationStage == 'start'
			) {
				return { projectileImg: anySprites[$currentAnimation.behavior.extraSprite] };
			}
			return undefined;
		}
	);

	const projectileSend = derived(
		[currentAnimation],
		([$currentAnimation]) => {
			if ($currentAnimation?.behavior.kind == 'missile') return { key: 'missile', transition: sendProj };
			if ($currentAnimation?.behavior.kind == 'center') return { key: 'center', transition: sendCenter };
			return { key: 'cancelSend', transition: sendProj };
		}
	);
	$: projectileSendTransition = $projectileSend.transition;

	const missileTarget = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior.kind == 'missile' &&
				$currentAnimation.target == hostId &&
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
		on:click|preventDefault|stopPropagation={() => {
			if ($highlightedForAct) {
				choose($highlightedForAct);
				$latestSlotButtonInput = 'none';
			}
			$lastUnitClicked = hostId;
		}}
		class:clickable={$highlightedForAct}
		role="button"
		tabindex="0"
		on:keydown
	>
		{#if $hostHome}
			<div
				out:sendMelee={{ key: 'movehero' }}
				in:receiveMelee={{ key: 'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined &&
					 $subAnimationStage == 'sentHome'
					 
					 ) {
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
				on:introend={() => {
					if ($currentAnimation != undefined) {
						let anim = $currentAnimation;
						updateUnit(hostId, (vup) => {
							vup.displayHp -= anim.damageToTarget ?? 0;
						});
						handlePutsStatuses(anim)
						if ($guestId == undefined) return;
						updateUnit($guestId, (vup) => {
							if(vup.side == 'enemy'){
								vup.aggro = 0;
							}
						});
						$subAnimationStage = 'sentHome';
					}
				}}
			>
				<VisualUnit hostId={$guestId} flip={!$hostIsNotHero} />
			</div>
		{/if}
		{#if $projectileSource}
			<!-- in:fade|local={{ duration: 1 }} -->
			<div
				class="projHolder"
				out:projectileSendTransition={{ key: $projectileSend.key }}
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				on:outroend={() => {
					if($host?.side == 'enemy'){
						updateUnit(hostId, (vup) => {
							vup.aggro = 0;
						});
					}
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
				class="projHolder selfInflictSource"
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				out:fly|local={{ delay: 0, duration: 600, x: 0, y: -30 }}
				on:outrostart={() => {
					if ($currentAnimation != undefined) {
						const anim = $currentAnimation;
						updateUnit(hostId, (vup) => {
							vup.displayHp -= anim.damageToSource ?? 0;
						});
						handlePutsStatuses(anim)
					}
				}}
				on:outroend={()=>{
					nextAnimationIndex(
						false,
						false,
					);
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
			<div class="projHolder"
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				in:receiveProj={{ key: 'missile' }}
				on:introend={async () => {
					if ($currentAnimation != undefined) {
						let anim = $currentAnimation;
						let someoneDied = false;
						updateUnit(hostId, (vup) => {
							vup.displayHp -= anim.damageToTarget ?? 0;
							if (vup.displayHp < 1) {
								someoneDied = true;
							}
						});
						handlePutsStatuses(anim)

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
						if($currentAnimation.alsoModifiesAggro){
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
							someoneDied,
						);
					}
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
		position:relative;
		/* overflow: hidden; */
		/* width:50%; */
	}
	.placeHolder {
		border: 2px dashed transparent;
		width: 50%;
	}
	.clickable {
		border: 2px dashed yellow;
		/* box-shadow: inset 0 0 10px yellow; */
		/* outline: 2px dashed yellow; */
		/* outline-offset: -7px; */
	
	}
	.projHolder {
		/* background-color: aquamarine; */
		/* display: none; */
		/* opacity: 0; */
		z-index: 3;
		display: inline;
		top:40%;
		height:clamp(14px,1vw + 12px,30px);
		width:clamp(14px,1vw + 12px,30px);
		position:absolute;
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
		left:0;
	}
	.endAlignSelf {
		align-self: flex-end;
		right:0;
	}
</style>

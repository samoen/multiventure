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
		updateUnit,
		currentAnimationIndex,
		currentAnimationsWithData,

		handlePutsStatuses

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
				$currentAnim.behavior == 'melee' &&
				$currentAnim.source == hostId &&
				$subAnimationStage == 'fire'
			) {
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
				$currentAnimation.behavior == 'melee' &&
				$currentAnimation.target == hostId &&
				$subAnimationStage == 'fire'
			) {
				console.log(`new guest ${$currentAnimation.source}`);
				return $currentAnimation.source;
			}
			return undefined;
		}
	);

	const projectileSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				($currentAnimation.behavior == 'missile' || $currentAnimation.behavior == 'center') &&
				$currentAnimation.source == hostId &&
				$subAnimationStage == 'start'
			) {
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			return undefined;
		}
	);

	const projectileSend = derived(
		[animationCancelled, currentAnimation],
		([$animationCancelled, $currentAnimation]) => {
			if ($animationCancelled) return { key: 'cancelSend', transition: sendProj };
			if ($currentAnimation?.behavior == 'missile') return { key: 'missile', transition: sendProj };
			if ($currentAnimation?.behavior == 'center') return { key: 'center', transition: sendCenter };
			return { key: 'cancelSend', transition: sendProj };
		}
	);
	$: projectileSendTransition = $projectileSend.transition;

	const missileTarget = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'missile' &&
				$currentAnimation.target == hostId &&
				$subAnimationStage == 'fire'
			) {
				return { projectileImg: extraSprites[$currentAnimation.extraSprite] };
			}
			return undefined;
		}
	);
	const selfInflictSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'selfInflicted' &&
				$currentAnimation.source == hostId &&
				$subAnimationStage == 'start'
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
			$lastUnitClicked = hostId;
		}}
		class:clickable={$highlightedForAct}
		role="button"
		tabindex="0"
		on:keydown
	>
		{#if $hostHome}
			<div
				out:sendMelee={{ key: $animationCancelled ? 0 : 'movehero' }}
				in:receiveMelee={{ key: $animationCancelled ? 1 : 'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled && $lastMsgFromServer) {
						nextAnimationIndex(
							false,
							$currentAnimationIndex,
							$currentAnimationsWithData,
							$lastMsgFromServer,
							false
						);
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
				class="placeHolder"
				in:receiveMelee={{ key: $animationCancelled ? 3 : 'movehero' }}
				out:sendMelee={{ key: $animationCancelled ? 4 : 'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled) {
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
				on:outrostart={() => {
					updateUnit(hostId, (vup) => {
						vup.aggro = 0;
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
				class="projHolder selfInflictSource"
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				out:fly|local={{ delay: 0, duration: 400, x: 0, y: 20 }}
				on:outrostart={() => {
					if ($currentAnimation != undefined && !$animationCancelled) {
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
						$currentAnimationIndex,
						$currentAnimationsWithData,
						$lastMsgFromServer,
						false
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
			<div
				class="projHolder"
				class:startAlignSelf={!$hostIsNotHero}
				class:endAlignSelf={$hostIsNotHero}
				in:receiveProj={{ key: $animationCancelled ? 8 : 'missile' }}
				on:introend={async () => {
					if ($currentAnimation != undefined && !$animationCancelled) {
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
							$currentAnimationIndex,
							$currentAnimationsWithData,
							$lastMsgFromServer,
							someoneDied
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
	.home {
		order: 1;
		/* background-color: aqua; */
	}
	.placeHolder {
		/* background-color: aqua; */
		border: 3px groove transparent;
		width: 60px;
		height: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.clickable {
		border: 3px dotted yellow;
	}
	.projHolder {
		/* background-color: aquamarine; */
		/* display: none; */
		/* opacity: 0; */
		z-index: 2;
		height: 30px;
		width: 30px;
	}
	.selfInflictSource {
		justify-self: flex-start;
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

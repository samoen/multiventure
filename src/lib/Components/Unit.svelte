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
		currentAnimationsWithData
	} from '$lib/client/ui';
	import { tick } from 'svelte';
	import { derived, writable, type Writable } from 'svelte/store';
	import { blur, fade, fly, scale, slide } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';
	import { stringify } from 'uuid';

	export let hostId: string;

	const host = derived([allVisualUnitProps], ([$allVisualUnitProps]) => {
		let nex = $allVisualUnitProps.find((p) => p.id == hostId);
		return nex;
	});

	const hostIsNotHero = derived(host, ($host) => {
		if (!$host) return undefined;
		return $host.side != 'hero';
	});

	const highlightedForAct = derived([latestSlotButtonInput], ([$latestSlotButtonInput]) => {
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
				$currentAnim.sourceIndex == hostId &&
				$subAnimationStage == 'fire'
			) {
				return false;
			}
			return true;
		}
	);

	const guestIndex = derived(
		[currentAnimation, subAnimationStage, allVisualUnitProps],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior == 'melee' &&
				$currentAnimation.targetIndex == hostId &&
				$subAnimationStage == 'fire'
			) {
				console.log(`new guest ${$currentAnimation.sourceIndex}`);
				return $currentAnimation.sourceIndex;
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
				$currentAnimation.sourceIndex == hostId &&
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
				$currentAnimation.targetIndex == hostId &&
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
				$currentAnimation.sourceIndex == hostId &&
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
		{#if $guestIndex != undefined}
			<div
				class="placeHolder"
				in:receiveMelee={{ key: $animationCancelled ? 3 : 'movehero' }}
				out:sendMelee={{ key: $animationCancelled ? 4 : 'movehero' }}
				on:introend={() => {
					if ($currentAnimation != undefined && !$animationCancelled) {
						let cu = $currentAnimation;
						updateUnit(hostId, (vup) => {
							vup.displayHp -= cu.damage;
						});
						if ($guestIndex == undefined) return;
						updateUnit($guestIndex, (vup) => {
							vup.aggro = 0;
						});

						$subAnimationStage = 'sentHome';
					}
				}}
			>
				<VisualUnit hostId={$guestIndex} flip={!$hostIsNotHero} />
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
					let someoneDied = false;
					if ($currentAnimation != undefined && !$animationCancelled) {
						const anim = $currentAnimation;
						updateUnit(hostId, (vup) => {
							vup.displayHp -= anim.damage;
							if (vup.displayHp < 1) {
								someoneDied = true;
							}
						});
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
							vup.displayHp -= anim.damage;
							if(anim.putsStatusOnTarget){
								if(vup.actual.kind == 'enemy'){
									console.log(`putting poison on enemy ${JSON.stringify( vup.actual.enemy.statuses)}`)
									let existingStatusesForSource = vup.actual.enemy.statuses[anim.source.name]
									if(!existingStatusesForSource){
										vup.actual.enemy.statuses[anim.source.name] = {poison:0,rage:0}
									}
									vup.actual.enemy.statuses[anim.source.name].poison = 1
								}else if(vup.actual.kind == 'player'){
									vup.actual.info.statuses['poison'] = 1
								}
							}
							if (vup.displayHp < 1) {
								someoneDied = true;
							}
						});

						// if ($currentAnimation.alsoDamages) {
						for (const other of $currentAnimation.alsoDmgsProps) {
							updateUnit(other.targetIndex, (vup) => {
								vup.displayHp -= other.amount;
								if (vup.displayHp < 1) {
									someoneDied = true;
								}
							});
						}
						// }
						for (const other of $currentAnimation.alsoModifiesAggros) {
							if (
								other.showFor == 'all' ||
								$lastMsgFromServer?.yourInfo.heroName == $currentAnimation.source.name
							) {
								updateUnit(other.targetIndex, (vup) => {
									if (vup.aggro != undefined) {
										if (other.amount != undefined) {
											vup.aggro -= other.amount;
										}
										if (other.setTo != undefined) {
											vup.aggro = other.setTo;
										}
									}
								});
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

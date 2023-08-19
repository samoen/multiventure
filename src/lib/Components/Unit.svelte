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



	} from '$lib/client/ui';
	import { tick } from 'svelte';
	import { derived } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';

	export let side: 'hero' | 'enemy';
	export let stableHost: VisualUnitProps | undefined;
	export let hostIndex : number;


	export let flipped: boolean = false;

	const highlightedForAct = derived(
		[latestSlotButtonInput],
		([$latestSlotButtonInput]) => {
			
			if ($latestSlotButtonInput == 'none') return undefined;
				let found = stableHost?.actionsThatCanTargetMe.find(a=>a.slot == $latestSlotButtonInput)
				return found
		}
	);

	const hostHome = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnim, $subAnimationStage]) => {
			if(!stableHost)return false
			if (!$currentAnim) {
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
		[currentAnimation, subAnimationStage, allVisualUnitProps],
		([$currentAnimation, $subAnimationStage]) => {
			if(!stableHost)return undefined
			if (!$currentAnimation) return undefined;
			if (
				$currentAnimation.behavior == 'melee' &&
				$currentAnimation.target &&
				$currentAnimation.target.side == side &&
				$currentAnimation.target.name == stableHost.name &&
				$subAnimationStage == 'fire'
			) {
				return $currentAnimation.sourceProp
			}
			return undefined;
		}
	);

	const centerSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if(!stableHost)return undefined
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'center' &&
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
	const missileSource = derived(
		[currentAnimation, subAnimationStage],
		([$currentAnimation, $subAnimationStage]) => {
			if(!stableHost)return undefined
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
			if(!stableHost)return undefined
			if (!$currentAnimation || !$currentAnimation.extraSprite) return undefined;
			if (
				$currentAnimation.behavior == 'missile' &&
				$currentAnimation.target &&
				$currentAnimation.target.side == side &&
				stableHost.name == $currentAnimation.target.name &&
				$subAnimationStage == 'fire'
			) {
				// console.log(`ONTARGET ${stableHost.name} is target proj`);
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
			$lastUnitClicked = hostIndex
		}}
		class:clickable={$highlightedForAct}
		role="button"
		tabindex="0"
		on:keydown
	>
		{#if $hostHome && stableHost}
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
	<div class="guestArea placeHolder" style:order={flipped ? 0 : 2}>
		<!-- {#if guest?.animating} -->
		{#if $dGuest}
			<div
				class="placeHolder"
				in:receiveMelee={{ key: $animationCancelled ? 3 : 'movehero' }}
				out:sendMelee={{ key: $animationCancelled ? 4 : 'movehero' }}
				on:introend={async () => {
					if(!stableHost)return
					if ($currentAnimation != undefined && !$animationCancelled) {
						stableHost.displayHp -= $currentAnimation?.damage;
						if ($dGuest && $dGuest.aggro) {
							let i = $dGuest.index
							let guest = $allVisualUnitProps.at(i)
							if(guest)guest.aggro=0
							// let dg = $dGuest;
							// dg.aggro = 0;
							$allVisualUnitProps = $allVisualUnitProps;
							await tick();
						}

						console.log('sending guest home');
						$subAnimationStage = 'sentHome';
					}
				}}
			>
				<VisualUnit vu={$dGuest} flipped={!flipped} />
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
					if(!stableHost)return
					if (stableHost.aggro) {
						stableHost.aggro = 0;
					}
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
					if(!stableHost)return
					if (stableHost.aggro) {
						stableHost.aggro = 0;
					}
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
					if(!stableHost)return false
					if ($currentAnimation != undefined && !$animationCancelled) {
						
						// stableHost.displayHp -= $currentAnimation.damage;
						let host = $allVisualUnitProps.at(hostIndex)
						if(host){
							host.displayHp -= $currentAnimation.damage
						}
						
						if ($currentAnimation.alsoDamages) {
							for (const other of $currentAnimation.alsoDmgsProps) {
								if (other.target) {
									let toDmg = $allVisualUnitProps.at(other.target.index)
									if(toDmg){
										toDmg.displayHp -= other.amount
									}
									// other.target.displayHp -= other.amount;
									
								}
							}
							// needs this for some reason
							// $enemiesVisualUnitProps = $enemiesVisualUnitProps;
							$allVisualUnitProps = $allVisualUnitProps;
							// $heroVisualUnitProps = $heroVisualUnitProps;
						}
						// $lastUnitClicked = $lastUnitClicked
						// await tick()
						// console.log(`target ${stableHost.name} reached, nexting`);
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
		z-index:2;
	}
</style>

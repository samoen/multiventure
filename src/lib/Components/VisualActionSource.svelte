<script lang="ts">
	import {
		allVisualUnitProps,
		anySprites,
		currentAnimation,
		heroSprite,
		heroSprites,
		lastMsgFromServer,
		lastUnitClicked,
		lockedHandles,
		nextAnimationIndex,
		receiveMelee,
		sendMelee,
		subAnimationStage,
		updateUnit,
		visualActionSources,
		visualOpacity
	} from '$lib/client/ui';
	import type { VisualActionSourceId } from '$lib/utils';
	import { derived } from 'svelte/store';
	import VisualUnit from './VisualUnit.svelte';
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { ItemIdForSlot } from '$lib/server/items';

	export let hostId: VisualActionSourceId;
	let pickedup = false;

	const host = derived([visualActionSources], ([$visualActionSources]) => {
		let nex = $visualActionSources.find((p) => p.id == hostId);
		return nex;
	});

	const guestId = derived(
		[currentAnimation, subAnimationStage, allVisualUnitProps],
		([$currentAnimation, $subAnimationStage]) => {
			if (!$currentAnimation) return undefined;
			if (
				($currentAnimation.behavior.kind == 'melee' ||
					$currentAnimation.behavior.kind == 'travel') &&
				$currentAnimation.target == hostId &&
				$subAnimationStage == 'fire'
			) {
				return $currentAnimation.source;
			}
			return undefined;
		}
	);

	async function guestArrived() {
		if ($currentAnimation != undefined && $host != undefined) {
			if ($currentAnimation.behavior.kind == 'travel') {
				$visualOpacity = false;

                let travellerIsMe = $guestId == $lastMsgFromServer?.yourInfo.unitId
                // remove the traveller from visuals
				$allVisualUnitProps = $allVisualUnitProps.filter((v) => v.id != $guestId);
				
                await tick();
				nextAnimationIndex(false, false);
                
                // auto-select something in new scene
                if(travellerIsMe){
                    $lastUnitClicked = undefined
                }
				return;
			}
			if ($currentAnimation.takesItem && $guestId) {
				pickedup = true;
				updateUnit($guestId, (vup) => {
					if ($currentAnimation?.takesItem?.slot == 'weapon') {
						vup.src =
							heroSprites[heroSprite($currentAnimation.takesItem.id as ItemIdForSlot<'weapon'>)];
					}
				});
				await tick();
			}
			$subAnimationStage = 'sentHome';
		}
	}

	function guestReturned() {
		if (!$host || !$currentAnimation) {
			return;
		}

		if ($currentAnimation.takesItem) {
			$lockedHandles.set($host.id, true);
		}
	}
</script>

{#if $host}
	<div class="unitAndArea">
		<div
			class="home placeHolder"
			on:click|preventDefault|stopPropagation={() => {
				if (!$host) return;
				$lastUnitClicked = $host.id;
			}}
			role="button"
			tabindex="0"
			on:keydown
		>
			<div class="nameAndSprite" class:noOpacity={pickedup}>
				<div class="nameHolder">
					<span class="nametag">{$host.id}</span>
				</div>
				<img class="vasSprite flipped" src={anySprites[$host.sprite]} alt="a place" />
				<div class="healthBarPlaceHolder" />
			</div>
		</div>
		<div class="guestArea placeHolder">
			{#if $guestId != undefined}
				<div
					class="guestHolder"
					in:receiveMelee={{ key: 'movehero' }}
					out:sendMelee={{ key: 'movehero' }}
					on:introend={() => {
						guestArrived();
					}}
					on:outroend={() => {
						guestReturned();
					}}
				>
					<VisualUnit hostId={$guestId} flip={false} />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.nameAndSprite {
		transition: opacity 0.3s ease-in-out;
	}
	.healthBarPlaceHolder {
		height: clamp(17px, 1vw + 10px, 30px);
	}
	.nameHolder {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.nametag {
		opacity: 0.6;
		color: white;
		white-space: nowrap;
		/* text-wrap:balance;
		word-wrap: break-word;
		line-break: anywhere; */
		font-weight: bold;
		font-size: 13px;
	}
	.flipped {
		transform: scaleX(-1);
	}
	.placeHolder {
		border: 2px dashed transparent;
		width: 50%;
	}
	.unitAndArea {
		display: flex;
		flex-direction: row;
		/* background-color: brown; */
		width: 100%;
	}
	.home {
		order: 1;
		/* background-color: red; */
	}
	.vasSprite {
		display: block;
		width: 100%;
		/* background-color: aqua; */
		aspect-ratio: 1/1;
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
</style>

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
		visualActionSources,

		currentConvoPrompt

	} from '$lib/client/ui';
	import { tick } from 'svelte';
	import { derived, writable, type Writable } from 'svelte/store';
	import { blur, fade, fly, scale, slide } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';
	import { stringify } from 'uuid';
	import type { BattleAnimation, UnitId, VisualActionSourceId } from '$lib/utils';

	export let hostId: VisualActionSourceId;

	const host = derived([visualActionSources], ([$visualActionSources]) => {
		let nex = $visualActionSources.find((p) => p.id == hostId);
		return nex;
	});

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
</script>

{#if $host}
	<div class="unitAndArea">
		<div
			class="home placeHolder flipped"
			on:click|preventDefault|stopPropagation={() => {
                if(!$host)return
                $lastUnitClicked = $host.id;
				$currentConvoPrompt = undefined;
            }}
			role="button"
			tabindex="0"
			on:keydown
		>
            		<img class="vasSprite" src={anySprites[$host.sprite]} alt="a place" />
		</div>
		<div class="guestArea placeHolder">
			{#if $guestId != undefined}
				<div
					class="guestHolder"
					in:receiveMelee={{ key: 'movehero' }}
					out:sendMelee={{ key: 'movehero' }}
					on:introend={() => {
						if ($currentAnimation != undefined) {
							let anim = $currentAnimation;
							updateUnit(hostId, (vup) => {
								// vup.displayHp -= anim.damageToTarget ?? 0;
							});
							if ($guestId == undefined) return;
							$subAnimationStage = 'sentHome';
						}
					}}
				>
					<VisualUnit hostId={$guestId} flip={false} />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
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
		background-color: brown;
        width:100%;
	}
	.home {
		order: 1;
		background-color: red;
	}
    .vasSprite{
        width:100%;
        background-color: aqua;
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

<script lang="ts">
	import {
		allVisualUnitProps,
		anySprites,
		currentAnimation,
		currentConvoPrompt,
		lastUnitClicked,
		lockedHandles,
		receiveMelee,
		sendMelee,
		subAnimationStage,
		updateUnit,
		visualActionSources
	} from '$lib/client/ui';
	import type { VisualActionSourceId } from '$lib/utils';
	import { derived } from 'svelte/store';
	import VisualUnit from './VisualUnit.svelte';
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';

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
				$currentAnimation.behavior.kind == 'melee' &&
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
			let anim = $currentAnimation;
			// updateUnit(hostId, (vup) => {
			//     // vup.displayHp -= anim.damageToTarget ?? 0;
			// });
			// $lockedHandles.set($host.id,true)
			pickedup = true;
			$visualActionSources = $visualActionSources;
			// await tick()
			// setTimeout(()=>{
			$subAnimationStage = 'sentHome';
			// },200)
			// if ($guestId == undefined) return;
		}
	}
	function guestReturned() {
		if (!$host || !$currentAnimation) {
			return;
		}
		console.log('vas guest outro end');
        if($currentAnimation.takesItem){
            $lockedHandles.set($host.id, true);
        }
	}
</script>

{#if $host}
	<div class="unitAndArea">
		<div
			class="home placeHolder flipped"
			on:click|preventDefault|stopPropagation={() => {
				if (!$host) return;
				$lastUnitClicked = $host.id;
				$currentConvoPrompt = undefined;
			}}
			role="button"
			tabindex="0"
			on:keydown
		>
			{#if !pickedup}
				<img class="vasSprite" out:fade|local src={anySprites[$host.sprite]} alt="a place" />
			{/if}
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
		width: 100%;
	}
	.home {
		order: 1;
		background-color: red;
	}
	.vasSprite {
		width: 100%;
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

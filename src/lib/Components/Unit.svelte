<script lang="ts" context="module">
	const activeId = writable(0);
	let id = 0;
	const [send, receive] = crossfade({
		duration: (d) => Math.sqrt(d * 600),

		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration: 600,
				easing: quintOut,
				css: (t) => `
                    transform: ${transform} scale(${t});
                    opacity: ${t}
                `
			};
		}
	});
</script>

<script lang="ts">
	import { choose, clientState, currentAnimation, currentAnimationIndex, heroVisualUnitProps, lastMsgFromServer, type VisualUnitProps } from '$lib/client/ui';
	import type { GameActionSentToClient } from '$lib/utils';
	import { quintOut } from 'svelte/easing';
	import { writable, type Writable } from 'svelte/store';
	import { crossfade } from 'svelte/transition';
	import VisualUnit from './VisualUnit.svelte';

	export let host: VisualUnitProps | undefined;
	// export let guest: Writable<VisualUnitProps | undefined> | undefined;
	export let guest: VisualUnitProps | undefined;
    export let flipped : boolean = false
	export let acts: GameActionSentToClient[];
	export let clicky: () => void;

	// export let recv
	// export let snd
	$: selected = $activeId === componentId;
	// let selected = false;

	const componentId = ++id;
</script>

<div class="unitAndArea">
	<div
		class="placeHolder"
		on:click={() => {
			clicky();
			// selected = !selected
			if (acts.length) {
				$activeId = componentId;
			}
			// $clientState.selectedUnit =`${flip}${name}`
		}}
		role="button"
		tabindex="0"
		on:keydown
	>
    {#if host}
    <!-- {#if host && !host.animating} -->
        <div out:send={{ key: 'movehero' }} in:receive={{ key: 'movehero' }} on:introend={()=>{
            $currentAnimationIndex++
            $currentAnimation = $lastMsgFromServer?.animations.at($currentAnimationIndex)
        }   }>
            <VisualUnit vu={host} />
        </div>
    {/if}
	</div>
	<div class="area" style:order={flipped ? 0 : 2}>
		<!-- {#if guest?.animating} -->
		{#if guest}
			<div class="placeHolder" in:receive={{ key: 'movehero' }} out:send={{ key: 'movehero' }} on:introend={()=>{
                // if(guest)guest.animating = false
                // guest = guest
                // $heroVisualUnitProps.animating = false
                $currentAnimation = undefined
            }
                }>
				<VisualUnit vu={guest} />
			</div>
		{/if}
		{#if selected}
			<!-- {#if $clientState.selectedUnit === `${flip}${name}`} -->
			<div class="actions" class:startAligned={!flipped} class:endAligned={flipped}>
				{#each acts as a}
					<button
						class="action"
						on:click={() => {
							// selected = false
							$activeId = 0;
							choose(a);
						}}>{a.buttonText}</button
					>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
    .placeHolder{
        border:3px solid black;
        order:1;
        width:60px;
    }
	/* .guest {
		background-color: red;
		height: 40px;
		width: 40px;
	} */

	.action {
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
	}
	.unitAndArea {
		display: flex;
		flex-direction: row;
		height: 100px;
	}
	.area {
		background-color: brown;
		width: 60px;
	}

	
</style>

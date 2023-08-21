<script lang="ts">
	import { allVisualUnitProps, type VisualUnitProps } from '$lib/client/ui';
	import { fade } from 'svelte/transition';

	export let hostId:string;
	$: vu = $allVisualUnitProps.find(v=>v.id == hostId)
	$: hpBar = vu ? (vu.displayHp > 0 ? 100 * (vu.displayHp / vu.maxHp) : 0) : 0
	export let flip:boolean

</script>
{#if vu && (vu.displayHp>0 || vu.side=="hero")}
	<div class="top" out:fade>
		<p>{vu.name}</p>
		<div class="outerHeroSprite">
			<img class="heroSprite" class:flipped={flip} alt="you" src={vu.src} />
		</div>
		<div class="bars">
			<div class="healthbar">
				<div class="healthbar_health" style:width="{hpBar}%" />
			</div>
			{#if vu.side == 'enemy' && vu.aggro != undefined}
				<div class="aggrobar">
					<div class="aggro" style:width="{vu.aggro}%" />
				</div>
			{/if}
		</div>
	</div>
	
{/if}

<style>
	.bars {
		display: flex;
		flex-direction: column;
		/* align-items: center; */
		margin-top: 5px;
		width: 40px;
	}
	.flipped {
		transform: scaleX(-1);
	}
	.top {
		display: flex;
		flex-direction: column;
		align-items: center;
		/* width: 60px; */
		/* height:100px; */
		/* background-color: aqua; */
	}
	.top > p {
		/* text-wrap:balance;
        word-wrap: break-word;
        line-break: anywhere; */
		/* text-align: center; */
		/* line-height:65%; */
		/* background-color: bisque; */
		padding: 0;
		margin: 0;
	}
	.outerHeroSprite {
		overflow: hidden;
		height: 50px;
		width: 50px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.heroSprite {
		object-fit: cover;
	}
	.healthbar {
		/* width:80px; */
		/* align-self: stretch; */
		height: 7px;
		border: 1px solid black;
		/* width: 40px; */
		/* margin-block: 1px; */
	}
	.healthbar_health {
		background-color: green;
		/* width: 60%; */
		height: 100%;
	}
	.aggrobar {
		margin-top: 2px;
		/* width:80px; */
		/* align-self: stretch; */
		height: 4px;
		border: 1px solid black;
		/* width: 40px; */
	}
	.aggro {
		background-color: purple;
		/* width: 60%; */
		height: 100%;
	}
</style>

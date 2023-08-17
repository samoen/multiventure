<script lang="ts">
	import type { VisualUnitProps } from '$lib/client/ui';

	export let vu: VisualUnitProps;
    export let flipped: boolean
	$: hpBar = vu.displayHp > 0 ? 100 * (vu.displayHp / vu.maxHp) : 0;
</script>

<div class="visualHero">
    <p>{vu.name}</p>
    <div class="outerHeroSprite">
        <img class="heroSprite" class:flipped={flipped} alt="you" src={vu.src} />
    </div>
	<div class="bars">
		<div class="healthbar">
			<div class="healthbar_health" style:width="{hpBar}%" />
		</div>
		{#if vu.aggro != undefined}
			<div class="aggrobar">
				<div class="aggro" style:width="{vu.aggro}%" />
			</div>
		{/if}

	</div>

</div>

<style>
	.bars{
		display:flex;
		flex-direction: column;
		align-items: center;
	}
	.flipped {
		transform: scaleX(-1);
	}
    .visualHero {
		display: flex;
		/* order: 2; */
		flex-direction: column;
		gap: 5px;
		align-items: center;
		width: 60px;
		/* height:100px; */
		/* background-color: aqua; */
	}
	.visualHero > p {
		/* height:10px; */
		/* text-wrap:balance;
        word-wrap: break-word;
        line-break: anywhere; */
		/* display: flex;
        flex-direction: column;
        align-items: center; */
		/* max-width: 70px; */
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

		/* place-items:; */
	}
	.heroSprite {
		/* background-color: blue; */
		/* transform: translateX(-10px) translateY(-15px); */
		object-fit: cover;
		/* height:50px; */
		/* width:50px; */
		/* height:auto; */
		/* width: 100%; */
	}
	.healthbar {
		/* width:80px; */
		/* align-self: stretch; */
		height: 7px;
		border: 1px solid black;
		width: 50px;
		margin-block: 1px;
	}
	.healthbar_health {
		background-color: green;
		/* width: 60%; */
		height: 100%;
	}
	.aggrobar {
		margin-block: 1px;
		/* width:80px; */
		/* align-self: stretch; */
		height: 3px;
		border: 1px solid black;
		width: 50px;
	}
	.aggro {
		background-color: purple;
		/* width: 60%; */
		height: 100%;
	}
</style>

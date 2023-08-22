<script lang="ts">
	import { allVisualUnitProps, type VisualUnitProps } from '$lib/client/ui';
	import { fade } from 'svelte/transition';
	import rage from '$lib/assets/rage.png'
	import greenDrip from '$lib/assets/green-drip.png'
	import type { StatusEffect, StatusId, UnitId } from '$lib/utils';

	export let hostId:UnitId;
	$: vu = $allVisualUnitProps.find(v=>v.id == hostId)
	$: hpBar = vu ? (vu.displayHp > 0 ? 100 * (vu.displayHp / vu.maxHp) : 0) : 0
	export let flip:boolean
	let statuses : StatusId[] = []
	$: {
		if(vu?.actual.kind == 'enemy'){
			// statuses = vu.actual.enemy.statuses.map(s=>s.status)
			statuses = []
			if(vu.actual.enemy.statuses){
				// console.log(JSON.stringify(vu.actual.enemy.statuses))
				let arrayOfStatuses = Array.from(Object.values(vu.actual.enemy.statuses))
				// console.log(JSON.stringify(arrayOfStatuses))
				if(arrayOfStatuses.find(s=>s.poison>0)){
					statuses.push('poison')
				}
				if(arrayOfStatuses.find(s=>s.rage>0)){
					statuses.push('rage')
				}
			}
		}
		if(vu?.actual.kind == 'player'){
			statuses = []
			if(vu.actual.info.statuses.poison > 0){
				// console.log('pushing poison visual on player')
				statuses.push('poison')
			}
			if(vu.actual.info.statuses.rage > 0){
				statuses.push('rage')
			}	
		}
	}

	const statusImages : Record<StatusId,string>={
		poison:greenDrip,
		rage:rage,
	}

</script>
{#if vu && !(vu.displayHp<1 && vu.side=="enemy")}
	<div class="top" out:fade|local={{duration:400}}>
		<p>{vu.name}</p>
		<div class="outerHeroSprite">
			<div class="statuses">
				{#each statuses as s}
					<img class="status" alt="status" src={statusImages[s]}>
				{/each}
			</div>
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
	.statuses {
		position: absolute;
		top:0;
		left:0;
		z-index: 2;
	}
	.status{
		display: flex;
		height:10px;
		width:10px;
	}
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
		position:relative;
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

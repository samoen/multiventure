<script lang="ts">
	import { allVisualUnitProps, lastMsgFromServer, type VisualUnitProps } from '$lib/client/ui';
	import { fade } from 'svelte/transition';
	import rage from '$lib/assets/rage.png'
	import bomb from '$lib/assets/bomb.png'
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
				if(arrayOfStatuses.find(s=>s.hidden>0)){
					statuses.push('hidden')
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
			if(vu.actual.info.statuses.hidden > 0){
				statuses.push('hidden')
			}
		}
	}

	const statusImages : Record<StatusId,string>={
		poison:greenDrip,
		rage:rage,
		hidden:bomb,
	}

</script>
{#if vu && !(vu.displayHp<1 && vu.side=="enemy")}
	<div class="top" out:fade|local={{duration:400}}>
		<span
		class='nametag'
		class:bold={vu.name == $lastMsgFromServer?.yourInfo.heroName}
		>{`${vu.name == $lastMsgFromServer?.yourInfo.heroName ? '👤' :''}${vu.name}`}</span>
		<div class="outerHeroSprite">
			<div class="statuses">
				{#each statuses as s}
					<img class="status" alt="status" src={statusImages[s]}>
				{/each}
			</div>
			<img 
			class="heroSprite"
			class:flipped={flip} 
			class:faded={statuses.includes('hidden')}
			alt="you" 
			src={vu.src} />
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
	.top {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		/* height:100%; */
		/* width: 60px; */
		height:100px;
		/* background-color: aqua; */
	}
	.nametag{
		color: transparent;
  		text-shadow: 0 0 0 white;
		opacity: 0.6;
		white-space: nowrap;
		/* text-wrap:balance;
		word-wrap: break-word;
		line-break: anywhere; */
		/* text-align: center; */
		/* line-height:65%; */
		/* background-color: bisque; */
		padding: 0;
		margin: 0;
		font-weight: bold;
		font-size: 13px;
	}
	.faded{
		opacity: 0.5;
	}
	.bold{
		font-weight: bold;
	}
	/* .bold::before{
		content:'\2605';
		color:yellow;
	} */
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
		align-items: center;
		margin-top: 5px;
		width: 40px;
		opacity: 0.7;
	}
	.flipped {
		transform: scaleX(-1);
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
		width:100%;
		/* align-self: stretch; */
		height: 8px;
		border: 2px solid black;
		border-radius: 5px;
		background-color:black;
		/* width: 40px; */
		/* margin-block: 1px; */
	}
	.healthbar_health {
		border-radius: 5px;
		background-color: green;
		/* width: 60%; */
		height: 100%;
	}
	.aggrobar {
		margin-top: 1px;
		border-radius: 5px;
		background-color:black;
		width:85%;
		/* align-self: stretch; */
		height: 6px;
		border: 2px solid black;
		/* width: 40px; */
	}
	.aggro {
		background-color: purple;
		/* width: 60%; */
		height: 100%;
	}
</style>

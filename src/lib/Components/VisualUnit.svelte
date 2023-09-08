<script lang="ts">
	import { statusImages } from '$lib/client/assets';
	import { allVisualUnitProps, lastMsgFromServer, selectedDetail, successcreds, type VisualUnitProps } from '$lib/client/ui';

	import type { StatusEffect, StatusId, UnitId } from '$lib/utils';
	import { tick } from 'svelte';
	import { derived } from 'svelte/store';

	export let hostId: UnitId;
	let shouldDie = false;
	const vu = derived(allVisualUnitProps,($allVisualUnitProps)=>{
		const res = $allVisualUnitProps.find((v) => v.id == hostId);
		return res 
	}) 

	const hpBar = derived(vu,($vu)=>{
		return $vu ? ($vu.displayHp > 0 ? 100 * ($vu.displayHp / $vu.maxHp) : 0) : 0;
	})
	
	vu.subscribe(r=>{
			if (r && (r.side == 'enemy' && r.displayHp < 1)) {
				die();
			}
	})

	async function die() {
		await tick();
		shouldDie = true;
	}
	export let flip: boolean;
	const statuses = derived(vu,($vu)=>{
		let s : StatusId[] = [];
		if(!$vu)return s

		if ($vu.actual.kind == 'enemy') {
			// statuses = $vu.actual.enemy.statuses.map(s=>s.status)
			if ($vu.actual.enemy.statuses) {
				// console.log(JSON.stringify($vu.actual.enemy.statuses))
				// let arrayOfStatuses = Array.from(Object.values($vu.actual.enemy.statuses));
				// console.log(JSON.stringify(arrayOfStatuses))
				if ($vu.actual.enemy.statuses.find((s) => s.statusId == 'poison' && s.count > 0)) {
					s.push('poison');
				}
				if ($vu.actual.enemy.statuses.find((s) => s.statusId == 'rage' && s.count > 0)) {
					s.push('rage');
				}
				if ($vu.actual.enemy.statuses.find((s) => s.statusId == 'hidden' && s.count > 0)) {
					s.push('hidden');
				}
			}
		}
		if ($vu.actual.kind == 'player') {
			if ($vu.actual.info.statuses.poison > 0) {
				// console.log('pushing poison visual on player')
				s.push('poison');
			}
			if ($vu.actual.info.statuses.rage > 0) {
				s.push('rage');
			}
			if ($vu.actual.info.statuses.hidden > 0) {
				s.push('hidden');
			}
		}
		return s
	})

	
</script>

{#if $vu && $successcreds}
	<div class="top" 
	class:noOpacity={shouldDie}
	class:selected={!shouldDie && $selectedDetail && $selectedDetail.kind == 'vup' && $selectedDetail?.entity.id == hostId}
	>
		<div class="nameHolder">
			<span class="selfIndicator"
			>
				{$vu.name == $successcreds.yourHeroName ? '+' : ''}</span>
			<span class="nametag">{$vu.name}</span>
		</div>
		<div class="outerHeroSprite">
			<div class="statuses">
				{#each $statuses as s}
					<img class="status" alt="status" src={statusImages[s]} />
				{/each}
			</div>
			<img
			class="heroSprite"
				class:flipped={flip && !$vu.tilt}
				class:tiltedHero={$vu.tilt && $vu.side == 'hero'}
				class:tiltedEnemy={$vu.tilt && $vu.side == 'enemy'}
				class:faded={$statuses.includes('hidden')}
				alt="you"
				src={$vu.src}
			/>
		</div>
		<div class="bars">
			<div class="healthbar">
				<div class="healthbar_health" style:width="{$hpBar}%" />
			</div>
			{#if $vu.actual.kind == 'enemy'}
				<div class="aggrobar">
					<div class="aggro" style:width="{$vu.actual.enemy.myAggro}%" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.top {
		transition: opacity 0.5s ease-in-out;
	}
	.nameHolder {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.selfIndicator {
		font-size: 50%;
		color: transparent;
		text-shadow: 0 0 0 white;
		opacity: 0.6;
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
	.faded {
		opacity: 0.5;
	}
	.tiltedHero{
		transform: rotate(10deg) translateX(20px) translateY(-5px)
	}
	.tiltedEnemy{
		transform: scaleX(-1) rotate(10deg) translateX(20px) translateY(-5px)
	}
	/* .bold {
		font-weight: bold;
	} */
	/* .bold::before{
		content:'\2605';
		color:yellow;
	} */
	.statuses {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
	}
	.status {
		display: flex;
		height: clamp(14px, 1vw + 10px, 30px);
		/* height: 1vw; */
		/* width: 1vw; */
	}
	.flipped {
		transform: scaleX(-1);
	}
	.outerHeroSprite {
		/* background-color: aqua; */
		position: relative;
		/* display: inline-block; */
		width: 100%;
	}
	.heroSprite {
		display: block;
		/* background-color: blueviolet; */
		width: 100%;
		aspect-ratio: 1/1;
	}
	.bars {
		/* margin-top: 5px; */
		/* height:20%; */
		height: clamp(17px, 1vw + 10px, 30px);
		/* width: 100%; */
		opacity: 0.7;
		/* flex-grow: 1; */
		/* flex-basis: 20%; */
		display: flex;
		flex-direction: column;
		align-items: center;
		/* background-color: chocolate; */
		/* justify-content: center; */
		/* min-height: 30px; */
	}
	.healthbar {
		width: 100%;
		/* align-self: stretch; */
		/* flex-basis:50%; */
		height: 50%;
		/* height:40%; */
		/* flex-grow: 1; */
		/* height: 8px; */
		border: 2px solid black;
		border-radius: 5px;
		background-color: black;
		/* width: 40px; */
		/* margin-block: 1px; */
		/* display: flex; */
		/* position: relative; */
		margin-bottom: 1px;
	}
	.healthbar_health {
		border-radius: 5px;
		background-color: green;
		/* width: 60%; */
		transition: width 0.2s ease-in-out;
		/* position: absolute; */
		/* z-index: 5; */
		height: 100%;
	}
	.aggrobar {
		/* flex-grow: 1; */
		/* flex-basis: 50%; */
		height: 50%;
		border-radius: 5px;
		background-color: black;
		width: 85%;
		/* align-self: stretch; */
		/* height: 6px; */
		border: 2px solid black;
		/* width: 40px; */
	}
	.aggro {
		background-color: purple;
		transition: width 0.2s ease-in-out;
		/* width: 60%; */
		height: 100%;
	}
</style>

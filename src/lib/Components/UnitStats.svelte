<script lang="ts">
	import type { VisualUnitProps } from '$lib/client/ui';
	import heart from '$lib/assets/ui/heart.png';
	import strong from '$lib/assets/ui/strong.png';
	import foot from '$lib/assets/ui/foot.png';
	import teeth from '$lib/assets/ui/teeth.png';
	import brain from '$lib/assets/ui/brain.png';
	import shieldHealth from '$lib/assets/ui/shield-health.png';
	import crossedSwords from '$lib/assets/ui/crossed-swords.png';
	import lightShield from '$lib/assets/ui/light-shield.png';
	import heavyShield from '$lib/assets/ui/heavy-shield.png';
	import type { HeroId } from '$lib/utils';
	import type { HeroName } from '$lib/server/users';
	import ItemStats from './ItemStats.svelte';
	import { getStatusImage } from '$lib/client/assets';

	export let vu: VisualUnitProps;
	// $: enemy = vu.actual.kind == 'enemy' ? vu.actual.entity : undefined;
	$: str =
		vu.actual.kind == 'enemy' ? vu.actual.entity.template.strength : vu.actual.entity.strength;
	let bonusStr = '';
	let bonusAgi = '';
	let bonusMind = ''
	$: {
			if (vu.actual.entity.bonusStats.strength > 0) {
				bonusStr = ` +${vu.actual.entity.bonusStats.strength}`;
			}else{
				bonusStr = ''
			}
			if (vu.actual.entity.bonusStats.agility > 0) {
				bonusAgi = ` +${vu.actual.entity.bonusStats.agility}`;
			}else{
				bonusAgi = ''
			}
			if (vu.actual.entity.bonusStats.mind > 0) {
				bonusMind = ` +${vu.actual.entity.bonusStats.mind}`
			}else{
				bonusMind = ''
			}
	}
	
	$: agi = vu.actual.kind == 'enemy' ? vu.actual.entity.template.agility : vu.actual.entity.agility;
	$: mind = vu.actual.kind == 'enemy' ? vu.actual.entity.template.mind : vu.actual.entity.mind;
	$: aggGain = vu.actual.kind == 'enemy' ? vu.actual.entity.template.aggroGain : 0;
</script>

<div class="top">
	<div class="classTitle">
		{#if vu.actual.kind == 'enemy'}
			{vu.actual.entity.template.id}
		{/if}
		{#if vu.actual.kind == 'player'}
			{vu.actual.entity.class}
		{/if}
	</div>
	<div class="statLine">
		<img src={heart} alt="a heart" />
		<div>{vu.actual.entity.health}</div>
	</div>
	{#if vu.actual.kind == 'player'}
		<div class="statuses">
			{#each vu.actual.entity.statuses as s}
				{#if s.count > 0}
					<div class="statLine">
						<img class="statusIm" src={getStatusImage(s.statusId)} alt="a status" />
						<div>{s.count}</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="stats">
		<div class="statLine">
			<img src={shieldHealth} alt="an icon" />
			<div>{vu.actual.entity.maxHealth}</div>
		</div>
		{#if str > 0 || bonusStr.length}
			<div class="statLine">
				<img src={strong} alt="an icon" />
				<div>{str}{bonusStr}</div>
			</div>
		{/if}
		{#if agi > 0 || bonusAgi.length}
			<div class="statLine">
				<img src={foot} alt="a heart" />
				<div>{agi}{bonusAgi}</div>
			</div>
		{/if}
		{#if mind > 0 || bonusMind.length}
			<div class="statLine">
				<img src={brain} alt="a heart" />
				<div>{mind}{bonusMind}</div>
			</div>
		{/if}
		{#if vu.actual.kind == 'enemy'}
			<div class="statLine">
				<img src={teeth} alt="a heart" />
				<div>{aggGain}</div>
			</div>
		{/if}
	</div>

	<div class="itemStats">
		{#each vu.actual.entity.inventory as itemState}
		{#if itemState.stats && !itemState.stats.excludeFromDetail}
		<ItemStats itemState={itemState} vu={vu} />
		{/if}
		{/each}
	</div>
	{#if vu.actual.kind == 'enemy'}
		{#each vu.actual.heroSpecificStates as hs}
			<p>{hs.hName}</p>
			<div class="statLine">
				<img class="statusIm" src={teeth} alt="a status" />
				<div>{hs.agg}</div>
			</div>
			{#each hs.sts as s}
				<div>
					{#if s.count > 0}
						<div class="statLine">
							<img class="statusIm" src={getStatusImage(s.statusId)} alt="a status" />
							<div>{s.count}</div>
						</div>
					{/if}
				</div>
			{/each}
		{/each}
	{/if}
</div>

<style>
	.top {
		display: inline-block;
	}
	.classTitle {
		font-weight: bold;
		margin-left: 3px;
	}
	.itemStats {
		/* margin-top: 10px; */
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	/* .statuses { */
	/* margin-bottom: 10px; */
	/* } */
	.statusIm {
		height: 18px;
		width: 18px;
	}
	.stats {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin-bottom: 10px;
	}
	.statLine {
		display: inline-flex;
		gap: 5px;
		padding-right: 5px;
		flex-direction: row;
		/* border: 1px solid brown; */
	}
	/* .statLine > img { */
	/* border-right: 1px solid brown; */
	/* } */
</style>

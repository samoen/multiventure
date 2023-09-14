<script lang="ts">
	import type { VisualUnitProps } from '$lib/client/ui';
	import heart from '$lib/assets/ui/heart.png';
	import strong from '$lib/assets/ui/strong.png';
	import foot from '$lib/assets/ui/foot.png';
	import teeth from '$lib/assets/ui/teeth.png';
	import shieldHealth from '$lib/assets/ui/shield-health.png';
	import crossedSwords from '$lib/assets/ui/crossed-swords.png';
	import lightShield from '$lib/assets/ui/light-shield.png';
	import heavyShield from '$lib/assets/ui/heavy-shield.png';
	import { statusImages } from '$lib/client/assets';
	import type { HeroId } from '$lib/utils';
	import type { HeroName } from '$lib/server/users';
	import ItemStats from './ItemStats.svelte';

	export let vu: VisualUnitProps;
	$: enemy = vu.actual.kind == 'enemy' ? vu.actual.entity : undefined;
	$: str =
		vu.actual.kind == 'enemy' ? vu.actual.entity.template.baseDamage : vu.actual.entity.strength;
	let bonusStr = '';
	$: {
		if (vu.actual.kind == 'player') {
			if (vu.actual.entity.bonusStrength > 0) {
				bonusStr = ` +${vu.actual.entity.bonusStrength}`;
			}
		} else {
			bonusStr = '';
		}
	}
	$: agi = vu.actual.kind == 'enemy' ? vu.actual.entity.template.speed : vu.actual.entity.agility;
	$: aggGain = vu.actual.kind == 'enemy' ? vu.actual.entity.template.aggroGain : 0;
	$: strikes = vu.actual.kind == 'enemy' ? vu.actual.entity.template.strikes ?? 1 : 0;
</script>

<div class="top">
	<div class="classTitle">
		{#if vu.actual.kind == 'enemy'}
			{vu.actual.entity.templateId}
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
						<img class="statusIm" src={statusImages[s.statusId]} alt="a status" />
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
		<div class="statLine">
			<img src={strong} alt="an icon" />
			<div>{str}{bonusStr}</div>
		</div>
		{#if strikes > 1}
			<div class="statLine">
				<img src={crossedSwords} alt="a heart" />
				<div>{strikes}</div>
			</div>
		{/if}
		<div class="statLine">
			<img src={foot} alt="a heart" />
			<div>{agi}</div>
		</div>
		{#if vu.actual.kind == 'enemy'}
			<div class="statLine">
				<img src={teeth} alt="a heart" />
				<div>{aggGain}</div>
			</div>
			{#if enemy?.template.damageReduction}
				<div class="statLine">
					<img src={lightShield} alt="a heart" />
					<div>{enemy.template.damageReduction}</div>
				</div>
			{/if}
			{#if enemy?.template.damageLimit}
				<div class="statLine">
					<img src={heavyShield} alt="a heart" />
					<div>{enemy.template.damageLimit}</div>
				</div>
			{/if}
		{/if}
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
							<img class="statusIm" src={statusImages[s.statusId]} alt="a status" />
							<div>{s.count}</div>
						</div>
					{/if}
				</div>
			{/each}
		{/each}
	{/if}
	{#if vu.actual.kind == 'player'}
		<div class="itemStats">
			{#each vu.actual.entity.inventory as itemState}
				{#if itemState.stats && !itemState.stats.excludeFromDetail}
					<ItemStats {itemState} />
				{/if}
			{/each}
		</div>
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

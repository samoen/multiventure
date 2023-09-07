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
	import type { StatusId } from '$lib/utils';

	export let vu: VisualUnitProps;
	$: enemy = vu.actual.kind == 'enemy' ? vu.actual.enemy : undefined;
	$: str =
		vu.actual.kind == 'enemy' ? vu.actual.enemy.template.baseDamage : vu.actual.info.strength;
	$: agi = vu.actual.kind == 'enemy' ? vu.actual.enemy.template.speed : vu.actual.info.agility;
	$: aggGain = vu.actual.kind == 'enemy' ? vu.actual.enemy.template.aggroGain : 0;
	$: strikes = vu.actual.kind == 'enemy' ? vu.actual.enemy.template.strikes ?? 1 : 0;
	let playerStatuses: Map<StatusId, number> = new Map();
	$: {
		if (vu.actual.kind == 'player') {
			playerStatuses = new Map();
			for (let [key, value] of Object.entries(vu.actual.info.statuses)) {
				if (value > 0) {
					let tKey = key as StatusId;
					playerStatuses.set(tKey, value);
				}
			}
		}
	}
	let enemyStatuses: Map<StatusId, number> = new Map();
	$: {
		if (vu.actual.kind == 'enemy') {
			enemyStatuses = new Map();
			for (let [forHero, statuses] of Object.entries(vu.actual.enemy.statuses)) {
                for(let [key, value] of Object.entries(statuses) ){
                    if (value > 0) {
                        let tKey = key as StatusId;
                        let exist = enemyStatuses.get(tKey)
                        if(!exist || exist < value){
                            enemyStatuses.set(tKey, value);
                        }
                    }
                }
			}
		}
	}
</script>

<div class="top">
    {#if vu.actual.kind == 'enemy'}
        <div style="font-weight:bold; margin-bottom:10px;">
            {vu.actual.enemy.templateId}
        </div>
    {/if}
	<!-- <div class="statLine">
        <img src={heart} alt='a heart'>
        <div>{vu.displayHp}</div>
    </div> -->
    <div class="statuses">
        {#if vu.actual.kind == 'enemy'}
                {#each enemyStatuses as [key, value]}
                    {#if value > 0}
                        <div class="statLine">
                            <img class="statusIm" src={statusImages[key]} alt="a status" />
                            <div>{value}</div>
                        </div>
                    {/if}
                {/each}
        {/if}
        {#if vu.actual.kind == 'player'}
                {#each playerStatuses as [key, value]}
                    {#if value > 0}
                        <div class="statLine">
                            <img class="statusIm" src={statusImages[key]} alt="a status" />
                            <div>{value}</div>
                        </div>
                    {/if}
                {/each}
        {/if}

    </div>

    <div class="stats">
        <div class="statLine">
            <img src={shieldHealth} alt="a heart" />
            <div>{vu.maxHp}</div>
        </div>
        <div class="statLine">
            <img src={strong} alt="a heart" />
            <div>{str}</div>
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
</div>

<style>
	.top {
		display: inline-block;
	}
    .statuses{
        margin-bottom: 10px;
    }
	.statusIm {
		height: 18px;
		width: 18px;
	}
	.statLine {
		display: flex;
		gap: 5px;
		padding-right: 5px;
		flex-direction: row;
		border: 1px solid brown;
	}
	.statLine > img {
		border-right: 1px solid brown;
	}
</style>

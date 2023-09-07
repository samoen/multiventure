<script lang="ts">
	import type { VisualUnitProps } from "$lib/client/ui";
    import heart from "$lib/assets/ui/heart.png"
    import strong from "$lib/assets/ui/strong.png"
    import foot from "$lib/assets/ui/foot.png"
    import teeth from "$lib/assets/ui/teeth.png"
    import shieldHealth from "$lib/assets/ui/shield-health.png"


    export let vu : VisualUnitProps
    $: str = vu.actual.kind == 'enemy' ? vu.actual.enemy.template.baseDamage : vu.actual.info.strength
    $: agi = vu.actual.kind == 'enemy' ? vu.actual.enemy.template.speed : vu.actual.info.agility
    $: aggGain = vu.actual.kind == 'enemy' ? vu.actual.enemy.template.aggroGain : 0
</script>

<div class="top">
    <div class="statLine">
        <img src={heart} alt='a heart'>
        <div>{vu.displayHp}</div>
    </div>
    <div class="statLine">
        <img src={shieldHealth} alt='a heart'>
        <div>{vu.maxHp}</div>
    </div>
    <div class="statLine">
        <img src={strong} alt='a heart'>
        <div>{str}</div>
    </div>
    <div class="statLine">
        <img src={foot} alt='a heart'>
        <div>{agi}</div>
    </div>
    {#if vu.actual.kind == 'enemy'}
        <div class="statLine">
            <img src={teeth} alt='a heart'>
            <div>{aggGain}</div>
        </div>
    {/if}

</div>

<style>
    .top{
        display: inline-block;
    }
    .statLine{
        display: flex;
        gap:5px;
        padding-right:5px;
        flex-direction: row;
        border: 1px solid brown;
    }
    .statLine > img{
        border-right: 1px solid brown;
    }
</style>
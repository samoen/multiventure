<script lang="ts">
	import type { ItemState } from '$lib/server/items';
	import crossedSwords from '$lib/assets/ui/crossed-swords.png';
	import lightShield from '$lib/assets/ui/light-shield.png';
	import heavyShield from '$lib/assets/ui/heavy-shield.png';
	import strong from '$lib/assets/ui/strong.png';
	import loading from '$lib/assets/ui/loading.png';
	import candle from '$lib/assets/ui/candle.png';
	import foot from '$lib/assets/ui/foot.png';
	import saw from '$lib/assets/ui/saw.png';
	import teeth from '$lib/assets/ui/teeth.png';
	import crown from '$lib/assets/ui/crown.png';

	export let itemState: ItemState;
</script>
<div class="top">

    <div class='title'>
        <p>
            {itemState.stats.id}
        </p>
    </div>
    {#if itemState.stats}
    <div class="binaryItems">
        {#if itemState.stats.affectStyle && itemState.stats.affectStyle.kind == 'AllEnemy'}
            <!-- <div class="noNumber"> -->
                <img class="binary" src={saw} alt="Splash" />
            <!-- </div> -->
        {/if}
        {#if itemState.stats.grantsImmunity}
            <!-- <div class="noNumber"> -->
                <img class="binary" src={crown} alt="No retaliation" />
            <!-- </div> -->
        {/if}
    </div>
    {/if}
    <div class="stats">
        {#if itemState.stats}
            {#if itemState.stats.baseDmg}
                <div class="statLine">
                    <img src={strong} alt="a heart" />
                    <div>{itemState.stats.baseDmg}</div>
                </div>
            {/if}
            {#if itemState.stats.strikes && itemState.stats.strikes > 1}
                <div class="statLine">
                    <img src={crossedSwords} alt="a heart" />
                    <div>{itemState.stats?.strikes}</div>
                </div>
                
            {/if}
            {#if itemState.stats.speed && itemState.stats.speed > 0}
                <div class="statLine">
                    <img src={foot} alt="a heart" />
                    <div>{itemState.stats.speed}</div>
                </div>
            {/if}
            {#if itemState.stats.provoke && itemState.stats.provoke > 0}
                <div class="statLine">
                    <img src={teeth} alt="a heart" />
                    <div>{itemState.stats.provoke}</div>
                </div>
            {/if}
            {#if itemState.stats.damageReduction}
            <div class="statLine">
                <img src={lightShield} alt="a heart" />
                <div>{itemState.stats.damageReduction}</div>
            </div>
            {/if}
            {#if itemState.stats.damageLimit}
            <div class="statLine">
                <img src={heavyShield} alt="a heart" />
                <div>{itemState.stats.damageLimit}</div>
            </div>
            {/if}
            {#if itemState.stats.cooldown}
            <div class="statLine">
                <img src={loading} alt="a heart" />
                <div>{itemState.stats.cooldown}</div>
            </div>
            {/if}
            {#if itemState.stats.warmup}
            <div class="statLine">
                <img src={candle} alt="a heart" />
                <div>{itemState.stats.warmup}</div>
            </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    .title{
        display: block;
        font-weight: bold;
        margin-left: 3px;
        /* border: 2px solid blue; */
    }
    .stats{
        display: inline-flex;
        flex-direction: column;
    }
	.top {
		display: block;
		/* min-width: 20px;
		min-height: 20px;
		background-color: aqua; */
	}
	.statLine {
		display: flex;
		gap: 5px;
		padding-right: 5px;
		flex-direction: row;
		/* border: 1px solid brown; */
	}
    .binaryItems{
        /* background-color: aqua; */
        display: flex;
        flex-wrap: wrap;
    }
    .binary{
        /* border: 1px solid brown; */
        height:20px;
        width:20px;
        display: inline-block;
    }
	/* .statLine > img { */
		/* border-right: 1px solid brown; */
	/* } */
</style>

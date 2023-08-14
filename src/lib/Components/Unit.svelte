<script lang="ts">
	import { choose, clientState } from "$lib/client/ui";
	import type { GameActionSentToClient } from "$lib/utils";

    export let name:string;
    export let src:string;
    export let hp:number;
    export let maxHp:number;
    export let flip:boolean=false;
    export let acts:GameActionSentToClient[]
    
    // let selected = false;
    $: hpBar = 
		(hp > 0) ? (100*(hp/maxHp)) : 0

</script>
<div class="unitAndArea">
    <div class="visualHero" on:click={()=>{$clientState.selectedUnit =`${flip}${name}` }} on:keydown role="button" tabindex="0">
        <p>{name}</p>
        <div class="outerHeroSprite">
            <img 
            class="heroSprite" 
            class:flipped={flip}
            alt="you" 
            src={src}>
        </div>
        <div class="healthbar">
            <div 
            class="healthbar_health"
            style:width="{hpBar}%"
            ></div>
        </div>
    </div>
    <div 
    class="area"
    style:order={flip ? 1 : 2}
    >
    {#if $clientState.selectedUnit === `${flip}${name}`}
    <div class="actions" class:startAligned={!flip} class:endAligned={flip}>
        {#each acts as a}
            <button class="action" on:click={()=>{
                // selected = false
                choose(a)
                }}>{a.buttonText}</button>
        {/each}

    </div>
        
    {/if}
    </div>

</div>

<style>
    .action{
        white-space: nowrap;
    }
    .actions{
        display: flex;
        margin-top:20px;
        flex-direction: column;
    }
    .endAligned{
        align-items:flex-end;
    }
    .startAligned{
        align-items:flex-start;
    }
    .unitAndArea{
        display: flex;
        flex-direction: row;
        height:100px;
    }
    .area{
        background-color: brown;
        width: 60px;
    }
    .flipped{
		transform: scaleX(-1);
	}
    .visualHero{
		display: flex;
        order:2;
		flex-direction: column;
        gap:5px;
        align-items: center;
		width: 60px;
        /* height:100px; */
        background-color: aqua;
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
		background-color: bisque;
		padding: 0;
		margin:0;
	}
	.outerHeroSprite{
		overflow: hidden;
		height:50px;
		width:50px;
		display:flex;
        justify-content: center;
        align-items: center;
        
		/* place-items:; */
	}
	.heroSprite{
        background-color: blue;
		/* transform: translateX(-10px) translateY(-15px); */
		object-fit: cover;
        /* height:50px; */
        /* width:50px; */
		/* height:auto; */
		/* width: 100%; */
	}
    .healthbar{
		/* width:80px; */
        /* align-self: stretch; */
		height:10px;
		border: 1px solid black;
        width: 60px;
	}
	.healthbar_health{
		background-color: green;
		/* width: 60%; */
		height:100%;
	}
</style>
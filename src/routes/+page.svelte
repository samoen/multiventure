<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { ChooseOption, MsgFromServer } from '$lib';
	import { onDestroy, onMount } from 'svelte';


	export let data;
	let loginInput: string;
    let source: EventSource;
    let lastMsgFromServer : MsgFromServer;

	async function choose(optionNum: number) {
        loading = true
        status = 'waiting for action'
		let f = await fetch('/api/move', {
			method: 'POST',
			body: JSON.stringify({ option: optionNum } satisfies ChooseOption)
		});
		let res = await f.json();
		// invalidateAll();
		// lastMsgFromServer = res;
	}
    function subscribe(){
        source = new EventSource("/api/subscribe");
        source.addEventListener("world", (e) => {
        // isMsgFromServer(e.data)
        let sMsg = JSON.parse(e.data) as MsgFromServer;
        lastMsgFromServer = sMsg;
        status = 'playing'
        loading = false
        });
        source.addEventListener('error',(e)=>{
            console.log('source erroru')
            status = 'recovering from source error'
            source.close()
        })
        // source.addEventListener('')
        
    }
    let status = 'mounting'
	onMount(() => {
		console.log('mounted with ' + JSON.stringify(data));
        if(data.loggedIn && !source){
            status = 'auto logging in'
            subscribe()
        }else{
            status = 'need manual login'
            loading = false
        }
		// if(data.state){
		// lastMsgFromServer = data.state
		// }
	});
    
    // onDestroy(() => {
    //     console.log('destroying page')
    // });

	async function logOut() {
		// document.cook .cookies.remove('hero')
        loading = true
        status = 'waiting for logout'
		let f = await fetch('/api/logout', { method: 'POST' });
		// let r = await f.json()
        lastMsgFromServer = null;
        if(source.readyState != source.CLOSED){
            console.log('closing con from browser')
            source.close();
        }
        source = null;
        status = 'need manual login'
        loading = false
		// invalidateAll();
	}

let loading = true

</script>

<p>status: {status}</p>
{#if loading}
    <p>loading...</p>
    {/if}

{#if !loading && lastMsgFromServer == null}
        <p>Welcome! Please log in with your hero name:</p>
        <input type="text" bind:value={loginInput}>
        <button
        disabled={!loginInput}
            on:click={async () => {
                if (!loginInput) return;
                loading = true
                status = 'waiting for login'
                let joincall = await fetch('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ join: loginInput }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                let res = await joincall.json();
                loginInput = ''
                // loading = false
                // invalidateAll()
                if(joincall.ok){
                    status = 'waiting for first world'
                    subscribe()
                }else{
                    console.log('joincall not ok')
                }
                
                
                // }
            }}>Log in</button
        >
{/if}

{#if source && source.readyState == source.OPEN}
<p>
    source is open
</p> 
{/if}

{#if lastMsgFromServer && (!source || source.readyState != source.OPEN)}
            <p>
                sorry, source got closed
            </p>
{/if}

<!-- {#if data.loggedIn}

<p>
    Logged in as {data.LoggedInAs}
    <button on:click={clearcook}>log out</button>
</p>
{/if} -->

{#if !loading && lastMsgFromServer && source && source.readyState == source.OPEN}
<p>
    I am {lastMsgFromServer.yourName}
    <button on:click={logOut}>log out</button>
</p>
	<p>players:</p>
	{#each lastMsgFromServer.players as p}
		<p>
			{p.heroName} is in {p.in}
		</p>
		<p />{/each}
	scene:
	<p>{lastMsgFromServer.scene.text}</p>
	{#each lastMsgFromServer.scene.options as op, i}
		<button on:click={() => choose(i)}>{op.desc}</button>
	{/each}
{/if}

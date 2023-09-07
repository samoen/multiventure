# Multiventure

A multiplayer text aventure just for fun!

![alt text](https://www.gnu.org/graphics/gplv3-with-text-136x68.png)

Uses:
Assets from [Wesnoth](https://github.com/wesnoth/wesnoth)

[Svelte](https://svelte.dev/)

## Developing

Once you've cloned this repo:

Install dependencies:

```bash
npm install
```

Start a development server on http://localhost:5173/

```bash
npm run dev
```

Or start the server, open the app in a new browser tab and host it on your local network:
```bash
npm run dev -- --open --host
```


player stats:
health
speed - retaliation order
modify weapon stats

weapon traits:
damage
speed
provoke
warmup
cooldown

weapon slot:
club: burst
dagger: multihit
fire staff: warmup
bow: lowp rovoke
xbow: cooldown

utility slot:
bomb sack - stock dmg
medkit - stock heal
poison dart = stock harm

body slot:
light armor - reduce dmg
heavy armor - cap dmg

enemy stats:
hp
damage
warmup / cooldown

anti swarm:
    splash/pierce
    cull
    flat reflect
    flat armor

anti goliath:
    harm dmg %hp
    limit armor
    crit

anti multihitters/aggro gainers
    high provoke
    flat armor

anti burst/low aggro gain:
    limit armor
    low provoke
    protected

cheese:
    stock atk (per battle uses)
    cooldown
    speed + pacifier (reset aggro, give cooldowns)
greed:
    warmup
    summons
    snowball buffs
sandbag:
    loot (steal stock item)
    stock heal
    cooldown protect

want to hit first:
    cursed dagger - crit but takes extra damage on turn of use
want to hit last:
    lifesteal (prevent underheal)
    berzerker - bonus dmg from dmg taken

want to be immune:
    poison
    warmup

enemies ideas:
goblin warcaller - don't prioritize. hard to kill (other goblins make harder), warmup, buffs other goblins aggro gain/ignore flat armor/splash immune
fire gremlin - don't prioritize, splashes it's own team
dark summoner - prioritize, summons, snowball buff greedy
hydra - multihit

team composition:
tanky provoker/healer + glass cannon

Preparation tactics:
defensive (counter with greed) - immune, heal
cheese (counter with defensive) - stock attacks
greed (counter with cheese) - warmup, summons, growing buffs
many hits (ie multihit good against heavy armor. low provoke good against low enemy aggro gain) vs big hits (ie burst/cooldown. good against light armor and high aggro gain)
swarm vs goliath

battle tactics:
minimize overkill/underheal
who to target, focus fire.
coordinate synergy, debuffs
coordinate tanking
enemy nuker aggro high, time protect
manage cooldowns/warmup timing
get stock value

stretch goals:
battle position: backline, melee, infiltrated

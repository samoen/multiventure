# Multiventure

A multiplayer text aventure just for fun!

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

battle position:
backline, melee, infiltrated

player stats:
action points - how much stuff you can do before enemies get a turn
health
speed - move position ap cost. compare to overwatch rating
skill - attack ap cost
weapon damage

enemy stats:
hp
warmup (ap heros spent per action) / cooldown
overwatch rating
damage
range
greed (power increases over time)

extra slot:
light armor - reduce dmg
heavy armor - cap dmg
bomb sack - stock dmg
protection gem - stock protect

weapon traits:
overwatch
incurs overwatch
damage
hits / amount action adds to battle time
splash
per battle uses
cooldown
warmup

axe: range 1, position splash, dmg up
sword: range 1, speed up, skill up
spear: range 2, dmg up
staff: range 2, position splash
bow: range 3

counters:
swarm - splash
heavy hitter - heavyarmor (cap)
many hitter - light armor (dmg down)
greedy turtle - stock
high hp - bonus dmg %hp
high cooldown nuke - stock protect

ideas:
harm
cull



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
health
modify damage/warmup/cooldown/provoke/stock

speed - move position ap cost. compare to overwatch rating

enemy stats:
hp
damage
warmup / cooldown
range
greed (power increases over time)
overwatch rating

extra slot:
light armor - reduce dmg
heavy armor - cap dmg
bomb sack - stock dmg
protection gem - stock protect

weapon traits:
damage
provoke
splash
per battle uses
cooldown
warmup
overwatch
incurs overwatch

axe: range 1, position splash, dmg up
sword: range 1, speed up, skill up
spear: range 2, dmg up
staff: range 2, position splash
bow: range 3
xbow: cooldown/warmup

enemy counters:
swarm - splash
high aggro - high provoke
heavy hitter - heavyarmor (cap)
many hitter - light armor (dmg down)
greedy turtle - stock
high hp - bonus dmg %hp
high cooldown nuke - stock protect

team players:
provoker - tanky high provoke to absord hits





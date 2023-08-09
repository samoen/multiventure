import { activeEnemies, enemyTemplates, spawnEnemy, type EnemyTemplateId } from './enemies';
import { bodyItems, utilityItems, weapons, type ItemIdForSlot } from './items';
import { activePlayersInScene, globalFlags, healPlayer, type Player } from './users';

export type SceneId =
	| 'forest'
	| 'castle'
	| 'throne'
	| 'forestPassage'
	| 'goblinCamp'
	| 'tunnelChamber'
	| 'armory'
	| 'dead';

export type Scene = {
	onEnterScene: (player: Player) => void;
	onVictory?: () => void;
	actions: (player: Player) => void;
};

const dead: Scene = {
	onEnterScene(player) {
		player.sceneTexts.push("You died.")
	},
	actions(player) {
		player.actions.push({
			buttonText: 'OK',
			performAction() {
				player.currentScene = 'forest'
				player.health = player.maxHealth
			},
		})
	}
}

const forest: Scene = {
	onEnterScene(player) {
		if (player.previousScene == 'dead') {
			player.sceneTexts.push("You\n awaken\n in\n a cold sweat with no memory of anything. The world around you seems dark and permeated by an unholy madness. There's a strange sickly smell that seems familiar. The smell of corruption. The smell of death.")
		}
		if (player.previousScene == 'castle') {
			player.sceneTexts.push('Despite your rising panic at the mere thought of entering that hellish maze of rotting plant matter and creatures beyond imagination, you push your way back into the depths.')
		}
		if (player.previousScene == 'forestPassage') {
			player.sceneTexts.push('You get out the passage, and stumble into the surrounding overgrowth')
		}
		if (!player.flags.has('heardAboutHiddenPassage')) {
			player.sceneTexts.push(`You are surrounded by dense undergrowth. With every slight movement you feel sharp foliage digging into your flesh. The forest is green and verdent. It teems with life. The sound of insects buzzing fills the air like the distant screams of the innocent. Unseen creatures shuffle just out of sight, their eyes fixed firmly upon you: the unwanted visitor. There is something distinctly unwell about this place. In the distance you see a castle. You feel you might have seen it before. Perhaps in a dream. Or was it a nightmare?`)
		}
	},
	actions(player: Player) {
		player.actions.push(
			{
				buttonText: 'Hike towards that castle',
				performAction() {
					player.currentScene = 'castle';
				},
			}

		)
		if (player.flags.has('heardAboutHiddenPassage')) {
			player.actions.push(
				{
					buttonText: `Search deep into dense forest`,
					performAction: () => {
						player.currentScene = 'forestPassage';
					}
				}
			)

		}
	}
}

const castle: Scene = {
	onEnterScene(player) {
		if (player.previousScene == 'throne') {
			player.sceneTexts.push('You climb back down those darn steps. So many steps.')
		}
		if (player.previousScene == 'forest') {
			player.sceneTexts.push('You push your way through the piercing thorns and supple branches that seem to whip at your exposed flesh. After hours of arduous travel, you find yourself amongst thatch roof huts and tents. There are few people to be found, and those that are here seem dead behind the eyes. A dirty woman sit by a fire cooking what looks like a rat. You mention the castle and how you might enter, and she merely points a finger towards what appears to be an infinite staircase and turns her face back to the fire. You make your way towards it and ascend.')
		}
		if (!player.flags.has('metArthur')) {
			player.flags.add('metArthur')
			player.sceneTexts.push("This castle contains the memory of great beauty, but it feels long gone. In its place is an emptiness. A confusion. Wherevery ou turn, it feels as though there is an entity just at the periphery of your visual. The sense of something obscene inhabits this place. What should be a structure of strength and security, has become something maddening to the senses.")
			player.sceneTexts.push("From an unknown place appears a voice. 'Hail!' It cries. You reach for a weapon that you suddenly remember you don't posess. While you see know doors, before you materialises a soldier. There is something about his eyes that tell you he is not afflicted by the same condition that seems to have twisted this land. 'I see you have found your way into this once hallowed hall. I would introduce myself, but whatever name I once had no longer has any meaning.'");
			if (player.inventory.utility.itemId == 'empty') {
				player.sceneTexts.push("From his cloak he produces a small object. A bandage. 'You may need this traveller. This land is unkind to strangers.")
				player.inventory.utility.itemId = 'bandage';
			}
			player.sceneTexts.push("As quickly as he arrived, the mysterious warrior disappears back into the walls. You feel that this will not be the last your see of this odd spirit.");
		}
		if (player.flags.has('killedGoblins') && !player.flags.has('sawArthurAfterBattle')) {
			player.flags.add('sawArthurAfterBattle')
			healPlayer(player, 50)
			player.sceneTexts.push("The soldier you passed earlier watches you approach and a smile grows on his face. 'I can smell battle on ye traveller! So you've had your first taste of blood in this foul land? Well I've learnt a trick or two in my time roaming this insane world. Hold still a minute...'. The soldiers face becomes blank for a moment, and in an instant you feel a burning heat passing through your body. As it subsides, you feel energised and repaired. 'That'll set you straight for a bit traveller!' Bellows the soldier as he trundles on his way'.")
		}
	},
	actions(player: Player) {
		player.actions.push(
			{
				buttonText: 'Delve into the forest',
				performAction() {
					player.currentScene = 'forest';
				},
			}
		)
		player.actions.push(
			{
				buttonText: 'Head towards the throne room',
				performAction() {
					player.currentScene = 'throne';
				},
			}
		)
	}
};

const throne: Scene = {
	onEnterScene(player) {
		if (!player.flags.has('heardAboutHiddenPassage')) {
			player.flags.add('heardAboutHiddenPassage')
			player.sceneTexts.push('At the end of the entrace hall to this eldritch structure, you notice a great door. It seems to stretch up into infinity, and you see no handle. As you approach, it seems to crack apart, revealing a dazzling light. You step inside.')
			player.sceneTexts.push("Before you is a great throne. Sitting aside it are two giant sculptures carved from marble. The one of the left depicts an angel, its wings spread to a might span. It wields a sword from which a great fire burns. To the left of the throne is a garoyle, its lips pulled back in a monstrous snarl revealing rows of serrated teeth. One of its arms are raised and it appears to hold a ball of pure electricity which crackles in the dim light. Atop the throne sits an emaciated figure.")
			player.sceneTexts.push("The figure atop the throne opens its mouth and from it emerges something akin to speech, but with the qualities of a dying whisper. 'I am... or was.. the king of this wretched place.' The figure starts, haltingly. 'I... the forest.... there is a passage. Find it and return to me.' The figure falls silent and returns to its corpselike revery.");
		} else if (!player.flags.has('killedGoblins')) {
			player.sceneTexts.push("You hear a voice inside your head that sounds more like the screams of a dying calf than words. It tells you to leave here and not to return until you have discovered the passage in the depths of the forest.")
		} else if (globalFlags.has('placedMedallion')) {
			player.sceneTexts.push("the throne looks different because a player placed the medallion and fought the stranger")
		} else if (globalFlags.has('smashedMedallion')) {
			player.sceneTexts.push("the throne looks different because a player smashed the medallion")
		} else {
			player.sceneTexts.push("You once again approach the throne, but something feels wrong. As you pass between the two mighty sculptures of the warring demon and angel, a powerful energy fills the air. The flame from the angel's sword and the electrical charge from the demon's hand begin to grow in size and reach out towards each other. The rotting body of the king suddenly leaps from it's throne. He screams from from the centre of the skeletal form 'You have proven your worth traveller, but there is a greater threat at hand! The forces of good and evil are no longer in balance! You must take this medallion and complete the ritual before it's too late!' The throne appears to cave in on itself, and a path that leads to the depths of castle appears. You feel you have no choice but to enter.")
		}
	},
	actions(player: Player) {
		const hasDoneMedallion = globalFlags.has('smashedMedallion') || globalFlags.has('placedMedallion')
		const mustGoThroughTunnel = player.flags.has('killedGoblins') && !hasDoneMedallion

		if (!mustGoThroughTunnel) {
			player.actions.push(
				{
					buttonText: 'Take your leave',
					performAction() {
						player.currentScene = 'castle';
					},
				})
		}
		if (mustGoThroughTunnel) {
			player.actions.push(
				{
					buttonText: 'Go through the tunnel leading to the depths',
					performAction() {
						player.currentScene = 'tunnelChamber'
					},

				}

			)
		}
		if (hasDoneMedallion) {
			player.actions.push({
				buttonText: 'Go to armory',
				performAction() {
					player.currentScene = 'armory'
				},
			})
		}
	}
}

const forestPassage: Scene = {
	onEnterScene(player) {
		if (!player.flags.has('gotFreeStarterWeapon')) {
			player.sceneTexts.push("After what feels like hours scrambling in the fetid soil and dodging the bites of the foul crawling creatures that call the forest home, you stumble upon an entrace.")
			player.sceneTexts.push("The walls begin to contort and bend, and from the the strangely organic surface a face begins to form. Its lip start to move. 'You have made it further than most' It creaks. You make as if to run but from the walls come arms that bind you in place. 'Please. I mean you no harm' The walls murmur. In your mind you see the image of a golden sword, and beside it a bow of sturdy but flexible oak. You realise you are being given a choice.");
		} else if (player.previousScene == 'forest') {
			player.sceneTexts.push("It's so dark that you can hardly make out an exit. Feeling around, your hand brush against the walls. They feel warm. As if they were alive.")
		} else if (player.previousScene == 'goblinCamp') {
			player.sceneTexts.push('You leave the camp and squeeze back into the dank passage')
		}
	},
	actions(player: Player) {
		player.actions.push(
			{
				buttonText: 'Leave this stinky passage towards the forest',
				performAction() {
					player.currentScene = 'forest';
				},
			}

		)
		if (!player.flags.has('gotFreeStarterWeapon')) {
			player.actions.push(
				{
					buttonText: 'I am skillful, I choose the bow',
					performAction: () => {
						player.inventory.weapon.itemId = 'shortBow';
						player.flags.add('gotFreeStarterWeapon');
						player.sceneTexts.push("A bow appears before you. You take it");
					}
				}
			)
		}
		if (!player.flags.has('gotFreeStarterWeapon')) {
			player.actions.push(
				{
					buttonText: 'I am mighty, I will take the sword!',
					performAction() {
						player.inventory.weapon.itemId = 'shortSword';
						player.flags.add('gotFreeStarterWeapon');
						player.sceneTexts.push("A shiny sword materializes in your hand!");
					}
				}
			)
		}
		if (player.flags.has('gotFreeStarterWeapon')) {
			player.actions.push(
				{
					buttonText: 'Push through to the end of the passage',
					performAction() {
						player.currentScene = 'goblinCamp'
					},
				}
			)

		}
	}
}

const goblinCamp: Scene = {
	onEnterScene(player) {
		if (!player.flags.has('killedGoblins')) {
			player.sceneTexts.push("Urged on by by your own fear and by some unknown inspiration, you fumble your way through the darkness towards the light. You are blinded as you step through and are greeted with the sight of a ramshackle encampment")
		} else {
			player.sceneTexts.push("You arrive at a familiar camp.")
		}

		if (!player.flags.has('killedGoblins') && !activeEnemies.some(e => e.currentScene == 'goblinCamp')) {
			player.sceneTexts.push("There is a foul stench in the air. Goblins. The telltale signs of the disgusting beasts are everywhere. Various animal carcasses litter the area, and their homes, barely more than logs with tattered cloth strung between, are placed without method around the clearing.")
			for (const playerInScene of activePlayersInScene('goblinCamp')) {
				playerInScene.sceneTexts.push(`Suddendly, A pair of goblins rush out of a tent.. "Hey Gorlak, looks like lunch!" "Right you are Murk. Let's eat!"`)
			}
			spawnEnemy('Gorlak', 'goblin', 'goblinCamp')
			spawnEnemy('Murk', 'goblin', 'goblinCamp')
		}
	},
	onVictory() {
		for (const u of activePlayersInScene('goblinCamp')) {
			u.sceneTexts.push('The goblins were slain!')
			u.flags.add('killedGoblins')
		}
	},
	actions(player: Player) {
		player.actions.push(
			{
				buttonText: 'Escape back through the passage',
				performAction() {
					player.currentScene = 'forestPassage';
				},
			}

		)
	}
}

const tunnelChamber: Scene = {
	onEnterScene(player) {
		if (player.previousScene == 'throne') {
			player.sceneTexts.push("You wend your way down a neverending series of corridors and pathways that seem to go on for an enternity. It becomes narrower and narrower, and the heat becomes almost unbearable. The path suddenly opens into a great chamber.")
		}
		if (!globalFlags.has('placedMedallion') && !globalFlags.has('smashedMedallion')) {
			player.sceneTexts.push("The walls are adorned with arcane symbols that are beyond your comprehension. In the centre of the room is a great altar. You approach it and notice that upon it is an recess that appears to be in the shape of the medallian that was given to you by the king. Suddenly, a great booming voice echoes throughout the chamber. 'STOP TRAVELLER! Stay your hand!'. You stop in your tracks and look over your shoulder. It is a hooded figure. 'Do not heed the call of the mad king! He knows not what he does and acts in accord with a dark force! If you place the medallion upon the altar, you will be bound to the very same forces of evil for all time. Or maybe you'll just die...' He trailed off. You can see the face of the rotting monarch in your minds eye. His face is twisted into a bitter smile that coaxes you to do his bidding. You have a choice.")
		}
	},
	actions(player: Player) {
		if (!globalFlags.has('smashedMedallion') && !globalFlags.has('placedMedallion')) {
			player.actions.push(
				{
					buttonText: "Place the medallion upon the altar",
					performAction() {
						globalFlags.add('placedMedallion')
						for (const allPlayer of activePlayersInScene('tunnelChamber')) {
							allPlayer.sceneTexts.push("The medallion is placed into the altar. The hooded figure turns upon you in a rage")
						}
						for (const allPlayer of activePlayersInScene('throne')) {
							allPlayer.sceneTexts.push("You hear a rumbling from below. The king says 'yay someone placed the medallion. If I just told you to do that, never mind..'  that explains why your actions just changed mid scene. Stragglers can still get their ealier quests from here still. hopefully it makes sense.")
						}
						spawnEnemy('Hooded Figure', 'goblin', 'tunnelChamber')
					},
				}

			)
		}
		if (!globalFlags.has('smashedMedallion') && !globalFlags.has('placedMedallion')) {
			player.actions.push(
				{
					buttonText: "Smash the medallion",
					performAction() {
						globalFlags.add('smashedMedallion')
						for (const playerInChamber of activePlayersInScene('tunnelChamber')) {
							playerInChamber.sceneTexts.push("The medallion got smashed. The hooded figure is pleased with you. You can leave the chamber now")
						}
						for (const playerInThrone of activePlayersInScene('throne')) {
							playerInThrone.sceneTexts.push("You hear the sound of a medallion gettin smashed down below. The situation in here changes.. but not so much that it wouldn't make sense to come here for your earlier quests.. anyway, a new action button probably appeared just now")
						}
					},
				}
			)
		}

		const placedMedallionAndKilledStranger = !activeEnemies.some(e => e.currentScene == 'tunnelChamber') && globalFlags.has('placedMedallion')
		const canLeave = placedMedallionAndKilledStranger || globalFlags.has('smashedMedallion')
		if (canLeave) {
			player.actions.push(
				{
					buttonText: "Return to throne",
					performAction() {
						player.currentScene = 'throne'
					},
				}
			)
		}

	},
}

const armory: Scene = {
	onEnterScene(player) {
		player.sceneTexts.push("Grab some equipment!")
	},
	actions(player) {
		for (const id in weapons) {
			if(id == 'unarmed' || id == player.inventory.weapon.itemId) continue
			player.actions.push({
				buttonText: `Equip Weapon ${id}`,
				grantsImmunity:true,
				performAction() {
					player.inventory.weapon.itemId = id as ItemIdForSlot<'weapon'>
				},
			})
		}
		for (const id in utilityItems) {
			if(id == 'empty' || id == player.inventory.utility.itemId) continue
			player.actions.push({
				buttonText: `Equip Utility ${id}`,
				grantsImmunity:true,
				performAction() {
					player.inventory.utility.itemId = id as ItemIdForSlot<'utility'>
				},
			})
		}
		for (const id in bodyItems) {
			if(id == 'rags' || id == player.inventory.body.itemId) continue
			player.actions.push({
				buttonText: `Equip Body ${id}`,
				grantsImmunity:true,
				performAction() {
					player.inventory.body.itemId = id as ItemIdForSlot<'body'>
				},
			})
		}
		for (const id in enemyTemplates) {
			player.actions.push({
				buttonText: `Spawn ${id}`,
				grantsImmunity:true,
				performAction() {
					spawnEnemy(`${id}${Math.round(Math.random() * 100)}`, id as EnemyTemplateId, 'armory')
				},
			})
		}
	},
}

export const scenes: Record<SceneId, Scene> = {
	dead: dead,
	forest: forest,
	castle: castle,
	throne: throne,
	forestPassage: forestPassage,
	goblinCamp: goblinCamp,
	tunnelChamber: tunnelChamber,
	armory: armory
};

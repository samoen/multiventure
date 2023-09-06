import type { LandscapeImage } from '$lib/utils';
import { enemiesInScene, enemyTemplates, spawnEnemy, type EnemyStatuses, type EnemyTemplateId } from './enemies';
import { equipItem, items, type ItemId } from './items';
import type { VisualActionSource } from './logic';
import { activePlayersInScene, defaultInventory, globalFlags, healPlayer, type HeroName, type Player } from './users';


export const scenes: Map<SceneId, Scene> = new Map()

export type SceneId =
	| `tutorial_${HeroName}`
	| `trainingRoom0_${HeroName}`
	| `trainingRoom1_${HeroName}`
	| `trainingRoom2_${HeroName}`
	| `trainingRoom3_${HeroName}`
	| 'forest'
	| 'castle'
	| 'house'
	| 'throne'
	| 'forestPassage'
	| 'goblinCamp'
	| 'tunnelChamber'
	| 'realmOfMadness'
	| 'armory'
	| 'dead';

export type Scene = {
	displayName: string,
	onEnterScene: (player: Player) => void
	onLeaveScene?: (player: Player) => void
	onBattleJoin?: (player: Player) => void
	onVictory?: (player: Player) => void
	actions: (player: Player) => void
	solo?: boolean
	hasEntered?: Set<HeroName>
	landscape?: LandscapeImage
};

const dead: Scene = {
	displayName: 'The Halls Of the Dead',
	onEnterScene(player) {
		player.sceneTexts.push("You see a bright light and follow it. After a short eternity you decide wandering the halls of the dead is not for you.")
		player.health = player.maxHealth
	},
	actions(player) {

		player.visualActionSources.push({
			unitId: 'vasDeath',
			displayName: 'Death',
			sprite: 'spectre',
			startText: `I'm afraid your dead. Take a portal to go back to the world of the living.`,
			responses:[
				{
					responseId:'howAreYou',
					responseText:`Hows running the underworld treating you?`,
					retort:`Oh you know, same old.`
				}
			],
			actionsWithRequirements: []
		})
		player.visualActionSources.push({
			unitId: 'vasCheckpoint',
			displayName: 'Portal',
			sprite: 'portal',
			startText: `A portal`,
			actionsWithRequirements: [
				{travelTo:player.lastCheckpoint},
				{travelTo:'armory'},
			]
		})
	}
}


const tutorial: Scene = {
	displayName: 'Tutorial',
	onEnterScene(player) {
		player.lastCheckpoint = `tutorial_${player.heroName}`
		player.sceneTexts.push(`You are standing at a castle barracks. Soliders mill around swinging swords and grunting in cool morning air. You see Arthur, the captain of the castle guard marching towards you.`)
	},
	actions(player) {
		player.visualActionSources.push({
			unitId: 'vasSkipTutorial',
			displayName: 'Skip Tutorial',
			sprite: 'portal',
			startText: `True heroes never skip the tutorial..`,
			startsLocked: true,
			actionsWithRequirements: [
			{
				travelTo: 'forest', 
			},
		]
		})

		player.visualActionSources.push({
			unitId: 'vasTutorTutorial',
			displayName: 'Arthur',
			startText: `Look alive recruit! The first day of training can be the most dangerous of a guardsman's career.`,
			responses: [
				{
					responseId: 'scared',
					responseText: `Huh? Danger? I didn't sign up for this!`,
					retort: `Oh, there must have been a mistake. I only train willing recruits in this tutorial. Here's a portal to the real world`,
					unlock:['saidWrong'],
					lock:['cheeky', 'brave', 'open'],
					lockVas:['vasGoTrainTutorial'],
					unlockVas: ['vasSkipTutorial'],
				},
				{
					responseId: 'open',
					responseText: `I'm ready to train sir!`,
					retort: `Ah, you must be ${player.heroName}, welcome aboard. Many great heroes started their journey on the very ground you stand, and they all knew the importance of a good tutorial.`,
					unlock:['brave', 'cheeky'],
					lock:['scared'],
					lockVas:['vasSkipTutorial'],
				},
				{
					responseId: 'cheeky',
					responseText: `Don't break the fourth wall, I'm into serious RPGs.`,
					startsLocked:true,
					retort: `Things will get plenty dark and gritty soon enough. If it makes you feel better I'll tell all the NPCs we've got a serious roleplayer coming through.`,
					unlock:['saidWrong', 'brave'],
					lock:['scared']
				},
				{
					startsLocked:true,
					responseId: 'saidWrong',
					responseText: `I said the wrong thing! Can I reset our conversation?`,
					retort: `Yep, just click my portrait. Conversations are just for fun.`
				},
				{
					startsLocked:true,
					responseId: 'brave',
					responseText: `I tend to breeze through tutorials pretty easily so get on with it.`,
					retort: `Great to hear ${player.heroName}! You can select a unit by tapping or clicking it. When a unit is selected you will see available actions. Select the training room and enter.`,
					unlockVas:['vasGoTrainTutorial'],
					lockVas: ['vasSkipTutorial'],
					lock: ['wantsToSkip', 'scared', 'cheeky', 'saidWrong'],
				},
			],
			sprite: 'general',
			portrait: 'general',
		})
		player.visualActionSources.push({
			unitId: 'vasGoTrainTutorial',
			displayName: 'Training Room',
			startsLocked:true,
			sprite: 'castle',
			startText: `An entrance to a training room. You will fight one rat, just punch it!`,
			actionsWithRequirements: [
				{
					travelTo: `trainingRoom0_${player.heroName}`,
				},
			],
		})

	},
}

const trainingRoom0: Scene = {
	displayName: 'Training Room',
	landscape: 'bridge',
	solo: true,
	onEnterScene(player) {
		// if respawning from checkpoint we already beat the room
		if (player.previousScene == 'dead') {
			this.onVictory && this.onVictory(player)
			return
		}
		player.sceneTexts.push("You enter the training room. It is well worn by many training sessions. The walls are covered in blast marks, dents and splinters.")

		spawnEnemy('Skitters', 'rat', `trainingRoom0_${player.heroName}`)
	},
	actions(player) {
		player.visualActionSources.push({
			unitId: 'vasEquipClub',
			displayName: 'Club',
			sprite: 'club',
			startText: 'A club deals a hefty chunk of damage each hit. That makes it effective against unarmored foes like goblins.',
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'club', }],
		})
		player.visualActionSources.push({
			unitId: 'vasEquipBomb',
			displayName: 'Bomb',
			sprite: 'bombPadded',
			startText: 'A powderbomb deals splash damage and reduces aggro of all nearby enemies. It should clear out the rats nicely.',
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'bomb' }],
		})
		player.visualActionSources.push({
			unitId: 'vasTutor0',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `You punched that rat good! Any questions?`,
			responses: [
				{
					responseId: 'gimmie',
					responseText: `Can I get some equipment?`,
					retort: `Sure, here's some gear. Select the items and and equip. Our training goblin is ready for you. Also there's a bit of a rat problem in there right now..`,
					unlockVas: ['vasEquipClub', `vasEquipBomb`]
				},
				{
					responseId: 'explainAggro',
					responseText: `What's that purple bar beneath the enemies health bar?`,
					retort: `That is the enemy's aggression towards you. It indicates the likelihood of it attacking you on your next action. Some enemies gain aggression faster than others, and some actions provoke more.`,
				},
			]
		})
		player.visualActionSources.push({
			unitId: 'vasGoTrain1',
			displayName: 'Training Room',
			sprite: 'castle',
			startText: `A sign on the door says: 'Glornak's office'`,
			actionsWithRequirements: [
				{
					requiresGear: ['bomb', 'club'],
					travelTo: `trainingRoom1_${player.heroName}`
				}
			]
		})
	},
	onVictory(player) {
		player.lastCheckpoint = `trainingRoom0_${player.heroName}`
	},
}
const trainingRoom1: Scene = {
	displayName: 'Training Room',
	landscape: 'bridge',
	solo: true,
	onEnterScene(player) {
		// if respawning from checkpoint we already beat the room
		if (player.previousScene == 'dead') {
			this.onVictory && this.onVictory(player)
			return
		}
		player.sceneTexts.push("You enter the training room. It is well worn by many training sessions. The walls are covered in blast marks, dents and splinters.")
		player.sceneTexts.push("Glornak: 'Hey you! I've never seen a more pitiful excuse for a guardsman in my life, and I've been working here since Arthur was a recruit! Go, my rats!'")
		player.sceneTexts.push("Squeaky: 'Squeak!'")
		player.sceneTexts.push("Nibbles: 'Reeeeee!'")

		spawnEnemy('Glornak', 'goblin', `trainingRoom1_${player.heroName}`)
		spawnEnemy('Squeaky', 'rat', `trainingRoom1_${player.heroName}`)
		spawnEnemy('Scratchy', 'rat', `trainingRoom1_${player.heroName}`)
		spawnEnemy('Nibbles', 'rat', `trainingRoom1_${player.heroName}`)
	},
	actions(player) {
		player.visualActionSources.push({
			unitId: 'vasTutor1',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `Great job! Questions? Concerns?`,
			responses: [
				{
					responseId:'imhurt',
					responseText:`I'm hurt!`,
					retort:`Here's a potion. It has limited uses in each area, and gets refilled when you travel. Equip it, select yourself and take a sip`,
					unlockVas:['vasEquipBandage']
				},
				{
					responseId:'whyslow',
					responseText:`I attacked the goblin but he hit me first, what's that about?`,
					retort:`An enemy with a higher agility than you will strike first. Some weapons give bonus agility, like this dagger`,
					unlockVas:['vasEquipDagger']
				},
				{
					responseId: 'gimmie',
					responseText: `What's my next battle?`,
					retort: `Your next battle is against armored Hobgoblins. There's a fire gremlin in there too, but save him for last - he's as much a danger to his allies as he is to you. By the way, the hobgoblin named Borgus becomes more dangerous as the battle goes on due to his rage. Kill him as soon as possible!`,
					unlockVas:['vasGoTrain2']
				},
			]
		})
		player.visualActionSources.push({
			unitId: 'vasEquipDagger',
			displayName: 'Dagger',
			sprite: 'dagger',
			startText: 'Hobgoblins wear heavy armor, which limits the amount of damage they take each strike. A dagger strikes multiple times per attack, mitigating their defenses.',
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'dagger' },]
		})
		player.visualActionSources.push({
			unitId: 'vasEquipBandage',
			displayName: 'Potion',
			sprite: 'potion',
			startText: `Use potions when you get low on health.`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'potion' }]
		})
		player.visualActionSources.push({
			unitId: 'vasGoTrain2',
			displayName: 'Training Room',
			sprite: 'castle',
			startsLocked:true,
			startText: `Another door, another training room.`,
			actionsWithRequirements: [
				{
					requiresGear: ['dagger', 'potion'],
					travelTo: `trainingRoom2_${player.heroName}`
				}
			]
		})
	},
	onVictory(player) {
		player.lastCheckpoint = `trainingRoom1_${player.heroName}`
		player.sceneTexts.push("Glornak: 'Ohhhh nooooo. How could I underestimate this recruit. Surely they are the chosen one.'")
		player.sceneTexts.push("Glornak falls down in a very convincing display.")
	},
}

const trainingRoom2: Scene = {
	displayName: 'Training Room',
	solo: true,
	onEnterScene(player) {
		if (player.previousScene == 'dead') {
			this.onVictory && this.onVictory(player)
			return
		}
		let borgusStatuses: EnemyStatuses = new Map()
		borgusStatuses.set(player.unitId, { poison: 0, rage: 5, hidden: 0 })
		player.sceneTexts.push("Borgus: 'Raaargh! What are you hob-doing in MY hob-training room?! How is Glornak by the way? We used to work in the same room but they split us up.'")
		player.sceneTexts.push("Florgus: 'There you go again Morgus, talking about Glornak like I'm not standing right here. And it's OUR training room now remember? Oh Great, another recruit equipped with a dagger..'")
		player.sceneTexts.push("Scortchy: 'Burn! I burn you! REEEE HEEE HEEE'")
		player.sceneTexts.push("Florgus: 'Remember Scortchy, aim for the recruit! Not us!'")
		spawnEnemy('Borgus', 'hobGoblin', `trainingRoom2_${player.heroName}`, borgusStatuses)
		spawnEnemy('Florgus', 'hobGoblin', `trainingRoom2_${player.heroName}`)
		spawnEnemy('Scorchy', 'fireGremlin', `trainingRoom2_${player.heroName}`)
	},
	actions(player) {
		player.visualActionSources.push({
			unitId: 'vasTutor3',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `Brilliant work recruit! Alright, last one. We don't normally do this but I see something great in you. You are going to fight a cave troll. They are slow but powerful.`,
			responses: [
				{
					responseId: 'ok',
					responseText: `I ain't 'fraid of no troll`,
					retort: `Trolls have very high damage and health, this equipment will let you handle him.`,
					unlockVas: ['vasEquipDart', `vasEquipCloak`, `vasEquipStaff`]
				},
				{
					responseId: 'whatifdie',
					responseText: `What if the troll wins the battle?`,
					retort: `It's not a problem, you have a checkpoint right here. If you run out of health, just succumb to your wounds, respawn and try again.`,
				},
			]
		})
		player.visualActionSources.push({
			unitId: 'vasEquipStaff',
			displayName: 'Fire Staff',
			sprite: 'staff',
			startText: `A fire staff will need a while to warmup before using it. Take other actions first.`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'fireStaff' },]
		})
		player.visualActionSources.push({
			unitId: 'vasEquipDart',
			displayName: 'Poison Dart',
			sprite: 'arrow',
			startText: `Poison deals more damage the bigger the enemy. It deals it's damage over 3 turns, so you need to be able to survive that long.`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'poisonDart' }]
		})
		player.visualActionSources.push({
			unitId: 'vasEquipCloak',
			displayName: 'Theif Cloak',
			sprite: 'armorStand',
			startText: `A theif's cloak lets you become hidden, preventing retaliation from enemies. It's a good way to wait for your magic to warm up. Poison your enemy first to get extra value!`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'theifCloak' }]
		})
		player.visualActionSources.push({
			unitId: 'vasGoTrain3',
			displayName: 'Training Room',
			sprite: 'stoneDoor',
			startText: `The next room looks more like a prison cell than a training room. The bones of previous recruits are strewn about the place..`,
			actionsWithRequirements: [
				{
					requiresGear: ['fireStaff', 'poisonDart', 'theifCloak'],
					travelTo: `trainingRoom3_${player.heroName}`
				}
			]
		})
	},
	onVictory(player) {
		player.lastCheckpoint = `trainingRoom2_${player.heroName}`
		player.health = player.maxHealth
	},
}

const trainingRoom3: Scene = {
	displayName: 'Training Room',
	solo: true,
	onEnterScene(player) {
		player.lastCheckpoint = `trainingRoom2_${player.heroName}`
		player.sceneTexts.push("You enter a dark, stinking place. Iron bars slam shut behind you. A giant figure emerges from the darkness.")
		player.sceneTexts.push("Ragor: 'RRRAAAAAAUUUUUUGHHH!'")
		player.sceneTexts.push("You hear Arthur's voice from behind the barred doors.")
		player.sceneTexts.push(`Arthur: You know what, ${player.heroName}? Maybe I was a bit too hasty throwing you in there.. it's more of a day two kind of battle. If I can just find the door key I'll pull you out...'`)
		player.sceneTexts.push(`You hear a set of keys clattering to the ground and Arthur fumbling around`)
		spawnEnemy('Ragor', 'troll', `trainingRoom3_${player.heroName}`)
	},
	actions(player) {
		player.visualActionSources.push({
			unitId: 'vasTutor4',
			displayName: 'Arthur',
			sprite: 'general',
			portrait: 'general',
			startText: `Well done ${player.heroName}! You may be the chosen one after all..`,
			responses: [{
				responseId: 'go',
				responseText: 'Thanks Arthur',
				retort: `Now we can't have you starting the game with all that loot. Please drop your weapon in the box, put your farmer stuff back on, and head through the portal.`,
				unlockVas: ['vasLeaveTutorial'],
			}]
		})
		player.visualActionSources.push({
			unitId: 'vasLeaveTutorial',
			displayName: 'Finish Tutorial',
			sprite: 'portal',
			startText: 'Take this portal to enter the world. Have fun :)',
			startsLocked: true,
			actionsWithRequirements: [{ 
				requiresGear:['fist','belt','rags'],
				travelTo: 'forest' 
			}]
		})
		player.visualActionSources.push({
			unitId: 'vasBox',
			displayName: 'Box',
			sprite: 'box',
			startText: `Drop your weapon into this box.`,
			actionsWithRequirements: [
			{
				pickupItem:'fist'
			},
		]
		})
		player.visualActionSources.push({
			unitId: 'vasBag',
			displayName: 'Empty Bag',
			sprite: 'bag',
			startText: `Your trusty bag. It's empty`,
			actionsWithRequirements: [
			{
				pickupItem:'belt'
			},
		]
		})
		player.visualActionSources.push({
			unitId: 'vasClothes',
			displayName: 'Clothes',
			sprite: 'scarecrow',
			startText: 'Just your old farmers clothes',
			actionsWithRequirements: [
			{
				pickupItem:'rags'
			},
		]
		})
	},
	onVictory(player) {
		player.sceneTexts.push('The mighty beast falls as Arthur finally gets the door open')
		player.health = player.maxHealth
	},
}

export const forest: Scene = {
	displayName: 'Bramblefoot Woods',
	landscape: 'grimForest',
	onEnterScene(player) {
		player.lastCheckpoint = 'forest'
		if (player.previousScene == 'dead' || player.previousScene == `tutorial_${player.heroName}` || player.previousScene == `trainingRoom3_${player.heroName}`) {
			player.sceneTexts.push("You awake in a cold sweat with no memory of anything. \n\nThe world around you seems dark and permeated by an unholy madness. \n\nThere's a strange sickly smell that seems familiar. The smell of corruption. The smell of death.")
		}
		if (player.previousScene == 'castle') {
			player.sceneTexts.push('Despite your rising panic at the mere thought of entering that hellish maze of rotting plant matter and creatures beyond imagination, you push your way back into the depths.')
		}
		if (player.previousScene == 'forestPassage') {
			player.sceneTexts.push('You get out the passage, and stumble into the surrounding overgrowth')
		}
		// if (!player.flags.has('heardAboutHiddenPassage')) {
			player.sceneTexts.push(`You are surrounded by dense undergrowth. With every slight movement you feel sharp foliage digging into your flesh. The forest is green and verdent. It teems with life. The sound of insects buzzing fills the air like the distant screams of the innocent. Unseen creatures shuffle just out of sight, their eyes fixed firmly upon you: the unwanted visitor. There is something distinctly unwell about this place.`)
		// }
	},
	actions(player: Player) {
		player.visualActionSources.push({
			unitId: 'vascastle',
			displayName: 'Castle',
			sprite: 'castle',
			actionsWithRequirements: [{ travelTo: 'castle' }],
			startText: `In the distance you see a castle`,
		})
		player.visualActionSources.push({
			unitId: 'vasForestPassageFromForest',
			displayName: 'Hidden Passage',
			sprite: 'stoneDoor',
			startsLocked: true,
			actionsWithRequirements: [{ requiresFlags: ['heardAboutHiddenPassage'], travelTo: 'forestPassage' }],
			startText: `Delve into the secret passage`,
			detect:[
				{
					flag:'heardAboutHiddenPassage'
				},
			],
		})
	}
}

const castle: Scene = {
	displayName: 'Castle Bramblemore',
	landscape: 'castle',
	onEnterScene(player) {
		if (player.previousScene == 'throne') {
			player.sceneTexts.push('You climb back down those darn steps. So many steps.')
		}
		if (player.previousScene == 'forest') {
			player.sceneTexts.push('You push your way through the piercing thorns and supple branches that seem to whip at your exposed flesh. After hours of arduous travel, you find yourself amongst thatch roof huts and tents. There are few people to be found, and those that are here seem dead behind the eyes. A dirty woman sit by a fire cooking what looks like a rat. You mention the castle and how you might enter, and she merely points a finger towards what appears to be an infinite staircase and turns her face back to the fire. You make your way towards it and ascend.')
		}
		if (player.previousScene == 'house') {
			player.sceneTexts.push('You exit the housing of the greiving mother. The castle looms, and the forest beckons.')
			// player.flags.add('killedGoblins')
		}
		if (player.flags.has('heardAboutHiddenPassage') && !player.flags.has('metArthur')) {
			player.flags.add('metArthur')
			player.sceneTexts.push("From an unknown place appears a voice. 'Hail!' It cries. You reach for a weapon that you suddenly remember you don't posess. While you see know doors, before you materialises a soldier. There is something about his eyes that tell you he is not afflicted by the same condition that seems to have twisted this land. 'I see you have found your way into this once hallowed hall. I would introduce myself, but whatever name I once had no longer has any meaning.'");
			player.sceneTexts.push("As quickly as he arrived, the mysterious warrior disappears back into the walls. You feel that this will not be the last your see of this odd spirit.");
		}
		if (!player.flags.has('heardAboutHiddenPassage')) {
			player.sceneTexts.push("This castle contains the memory of great beauty, but it feels long gone. In its place is an emptiness. A confusion. Wherevery ou turn, it feels as though there is an entity just at the periphery of your visual. The sense of something obscene inhabits this place. What should be a structure of strength and security, has become something maddening to the senses.")
		}
		// if (player.flags.has('killedGoblins') && !player.flags.has('sawArthurAfterBattle')) {
		// 	player.flags.add('sawArthurAfterBattle')
		// 	player.sceneTexts.push("The soldier you passed earlier watches you approach and a smile grows on his face.\n\nArthur: I can smell battle on ye traveller! So you've had your first taste of blood in this foul land?")
		// }
	},
	actions(player: Player) {

		player.visualActionSources.push({
			unitId: 'vasKeep',
			displayName: 'Keep',
			sprite: 'castle',
			responses: [{
				responseId: 'rummage',
				responseText: 'Search around the old barracks',
				unlockVas: ['vasCastleBandage'],
			}],
			actionsWithRequirements: [{ travelTo: 'throne' }],
			startText: `In the center of the castle lies the Bramblemore throne room. Along the path is a long abandoned barracks with broken gear strewn around.`,
		})
		player.visualActionSources.push({
			unitId: 'vasHouse',
			displayName: 'House',
			sprite: 'stoneDoor',
			actionsWithRequirements: [{ travelTo: 'house' }],
			startText: `You see a beautiful little thatched roof cottage. It looks inviting.`,
		})
		player.visualActionSources.push({
			unitId: 'vasCastleBandage',
			displayName: 'Potion',
			sprite: 'potion',
			startText: `You find a potion!`,
			startsLocked: true,
			actionsWithRequirements: [{ pickupItem: 'potion' }]
		})
		player.visualActionSources.push({
			unitId: 'vasForestFromCastle',
			displayName: 'Forest',
			sprite: 'forest',
			actionsWithRequirements: [{ travelTo: 'forest' }],
			startText: `Outside the castle grounds is a forest`,
		})
	}
};

const house: Scene = {
	displayName: `House`,
	landscape: 'bridge',
	onEnterScene(player) {
		if (!player.flags.has('heardAboutHiddenPassage')) {
			player.flags.add('heardAboutHiddenPassage')
			player.sceneTexts.push("The air is sweet with the smell of flowery perfume, but there is a sense of sadness in the air. You notice the door slightly ajar and knock on it quietly. There is no response.\n\nYou gently push the door open and find a woman sitting at a table alone, sobbing silently. Startled, she jumps from her seat. You hold your hands up as in a sign of concilation.")
		}
		else if (!player.flags.has('killedGoblins')) {
			player.sceneTexts.push(`${player.heroName}... why do you return without the blood of those foul goblins on your hands? Leave me. I do not wish to see anyone while they still draw breath.`)
		}
	},
	actions(player) {
		player.visualActionSources.push({
			unitId: 'vasHouseWoman',
			displayName: 'Giselle',
			sprite: 'lady',
			portrait:'lady',
			startText: `Traveller, what is it you do here? Do you not see I grieve? My son... he was murdered by Gorlak and his rowdy band of filthy goblin scum. He was barely a man yet had the stars in his eyes. He sought adventure but found his demise far too soon. Will you avenge him on my behalf? I don't have much but I'm sure I can find somethign to reward you`,
			responses: [
				{
					responseId: `accepted`,
					responseText: `I will`,
					retort: `Thank you kind traveller. There is a passage in the forest hidden from normal view. My son would often go searching in the lands beyond. Search the dark recesses of the forest and you will come upon this place. ${player.heroName}, find those wretched curs and show them no mercy.`,
					lock: ['reward', 'rejected'],
					unlockVas: ['vasLeatherGift', 'vasForestPassageFromForest']
				},
				{
					responseId: `rejected`,
					responseText: `I won't`,
					retort: `Not much of a hero are you?`,
					lock: ['accepted'],
				},
				{
					responseId: `reward`,
					responseText: `What's in it for me?`,
					retort: `My son had this set of leather armour. If only he had been wearing it when he went on his adventure.`,
					unlockVas: ['vasLeatherGift']
				},
			],
			detect: [{
				flag: 'killedGoblins',
				startText: `Dear Sir ${player.heroName}! You return with the stench of goblin blood about yourself. Thank you for obtaining vengence on my behalf.`,
				responses: [
					{
						responseId: 'cool',
						responseText: `All in a day's work ma'am`,
						retort: `I bequeath the armor to you so that my son's legacy may live on. Good luck out there ${player.heroName}`,
						unlockVas:['vasLeatherGift']
					}
				]
			}]
		})
		player.visualActionSources.push({
			unitId: 'vasLeatherGift',
			displayName: 'Reward',
			sprite: 'armorStand',
			startText: `Leather armor reduces the damage of each incoming strike.`,
			startsLocked: true,
			actionsWithRequirements: [
				{
					requiresFlags: ['killedGoblins'],
					pickupItem: 'leatherArmor',
				}
			],
			detect: [{
				flag: 'killedGoblins',
				locked: false,
				startText: `Leather armor reduces the damage of each incoming strike`,
			}]
			
		})

		player.visualActionSources.push({
			unitId: 'vasGoCastle',
			displayName: 'Travel',
			sprite: 'signpost',
			startText: 'Leave the house',
			actionsWithRequirements: [{ travelTo: 'castle' }, { travelTo: 'forest' }]
		})
	},
}
scenes.set('house', house)

const throne: Scene = {
	displayName: 'Bramblemore Throne Room',
	onEnterScene(player) {
		if (player.flags.has('placedMedallion')) {
			player.sceneTexts.push("The dishevelled king turns to you and opens his arms as if to welcome you back.")
		} else if (player.flags.has('smashedMedallion')) {
			player.sceneTexts.push("The dishevelled king turns to you with something akin to a smile on his rotting visage.")
		} else if (!player.flags.has('killedGoblins')) {
			player.sceneTexts.push(`You approach the throne room's mighty doors. Before it stands a guard with a look on his face that could kill a troll'`)
		} else {

			player.sceneTexts.push('At the end of the entrance hall to this eldritch structure, you approach a mighty door guarded by a fearsome warrior.\n\nAs you approach, the door seems to crack apart, revealing a dazzling light. You step inside.')
			player.sceneTexts.push("Before you is a great throne. Sitting aside it are two giant sculptures carved from marble. The one of the left depicts an angel, its wings spread to a might span. It wields a sword from which a great fire burns. To the left of the throne is a garoyle, its lips pulled back in a monstrous snarl revealing rows of serrated teeth. One of its arms are raised and it appears to hold a ball of pure electricity which crackles in the dim light. Atop the throne sits an emaciated figure.")
			player.sceneTexts.push("You approach the throne, but something feels wrong. As you pass between two mighty sculptures of a warring demon and angel, a powerful energy fills the air. The flame from the angel's sword and the electrical charge from the demon's hand begin to grow in size and reach out towards each other. The rotting body of the king suddenly leaps from it's throne. He screams from from the centre of the skeletal form. The throne appears to cave in on itself, and a path that leads to the depths of castle appears. You feel you have no choice but to enter.")
		}
	},
	actions(player: Player) {

		player.visualActionSources.push({
			unitId: 'vasThroneGuard',
			displayName: 'Guard',
			sprite: 'general',
			startText: `What business have you here, stranger? This is the throne room of the mighty king. I suggest you turn back until you have some business here.`,
			responses: [
				{
					responseId: 'ok',
					responseText: 'Fine',
					retort: 'Go do a quest or something',
				}
			],
			detect: [{
				flag: 'killedGoblins',
				startText: `Word of your deeds has reached the king and he has decided to give you and audience.`,
				responses: [{
					responseId: 'thanks',
					responseText: `Great`,
					retort: `You don't see this retort`,
					unlockVas: ['vasKing'],
					lockVas: ['vasThroneGuard']
				}]
			}],
		})

		player.visualActionSources.push({
			unitId: 'vasKing',
			displayName: 'The King',
			startsLocked: true,
			sprite: 'necromancer',
			startText: `You have proven your worth traveller, but there is a greater threat at hand! The forces of good and evil are no longer in balance! You must take this medallion and complete the ritual before it's too late!`,
			responses: [
				{
					responseId: 'yep',
					responseText: 'Yep will do',
					retort: 'Yes good, gooooood...',
					unlockVas: ['vasChamberFromThrone'],
					lock: ['nope'],
				},
				{
					responseId: 'nope',
					responseText: 'No can do, sorry',
					retort: 'Hmm well I think you will find me quite persuasive',
					lock: ['yep'],
					unlockVas: ['vasChamberFromThrone'],
					lockVas: ['vasCastleFromThrone']
				}
			],
			detect: [
				{
					flag: 'smashedMedallion',
					startText: `You have betrayed me stranger. And after I put my faith in you. You will suffer. Prepare yourself, I am sending you to a place from which there is no return.`,
					responses: [{
						responseId: 'ohno',
						responseText: `Oh noooo`,
						retort: 'hehehehe',
					}],
				},
				{
					flag: 'placedMedallion',
					startText: `'Stranger. You have done my bidding, I thank you.`,
					responses: [{
						responseId: 'yep',
						responseText: `Happy to help.`,
						retort: 'I have more tasks for you. I have opened a portal to a place where great treasures are. Go gather some treasure.',
					}],
				},
			],
		})
		player.visualActionSources.push({
			unitId: 'vasRealmFromThrone',
			startsLocked: true,
			displayName: 'Portal',
			sprite: 'portal',
			startText: 'A portal to an unknown realm',
			actionsWithRequirements: [{ travelTo: 'realmOfMadness' }],
			detect:[
				{
				flag:'smashedMedallion'
			},
				{
				flag:'placedMedallion'
			},
		],
		})
		player.visualActionSources.push({
			unitId: 'vasChamberFromThrone',
			startsLocked: true,
			displayName: 'Dungeon',
			sprite: 'temple',
			startText: 'A musty staircase down into the depths of the castle',
			actionsWithRequirements: [{ requiresNotFlags: ['smashedMedallion'], travelTo: 'tunnelChamber' }],
			detect:[
				{
					flag:'smashedMedallion',
					locked:true
				}
			],
		})
		player.visualActionSources.push({
			unitId: 'vasCastleFromThrone',
			displayName: 'Castle Grounds',
			sprite: 'castle',
			startText: 'Go back to the castle grounds',
			actionsWithRequirements: [{
				requiresNotFlags: ['smashedMedallion'],
				travelTo: 'castle'
			}],
			detect:[
				{
					flag:'smashedMedallion',
					locked:true
				}
			],
		})
	}
}

const realmOfMadness: Scene = {
	displayName: 'The Realm of Madness',
	onEnterScene(player) {
		player.sceneTexts.push(`You're stuck in this place`)
	},
	actions(player) {

	},
}
scenes.set('realmOfMadness', realmOfMadness)

const forestPassage: Scene = {
	landscape: 'grimForest',
	displayName: 'Hidden Passage',
	onEnterScene(player) {
		if (!player.flags.has('gotFreeStarterWeapon')) {
			player.sceneTexts.push("After what feels like hours scrambling in the fetid soil and dodging the bites of the foul crawling creatures that call the forest home, you stumble upon an entrace.")
			player.sceneTexts.push("The walls begin to contort and bend, and from the the strangely organic surface a face begins to form. Its lip start to move. The walls murmur. In your mind you see the image of a golden sword, and beside it a bow of sturdy but flexible oak. You realise you are being given a choice.");
		} else if (player.previousScene == 'forest') {
			player.sceneTexts.push("It's so dark that you can hardly make out an exit. Feeling around, your hand brush against the walls. They feel warm. As if they were alive.")
		} else if (player.previousScene == 'goblinCamp') {
			player.sceneTexts.push('You leave the camp and squeeze back into the dank passage')
		}
	},
	actions(player: Player) {
		player.visualActionSources.push({
			unitId: 'vasDweller',
			displayName: 'Forest Dweller',
			startText: `I mean you no harm. You will need a weapon if you want to continue through this passage. Would you like a dagger, or are you more the clubbing sort?`,
			responses: [
				{
					responseId: 'freeDagger',
					responseText: `I choose the dagger`,
					retort: `A fine choice! Stab em up!`,
					unlockVas: ['vasFreeDagger'],
					lock: ['freeClub'],
				},
				{
					responseId: 'freeClub',
					responseText: `I choose the club`,
					retort: `A fine choice! Bludgeon those enemies!`,
					unlockVas: ['vasFreeClub'],
					lock: ['freeDagger'],
				},
			],
			sprite: 'druid',
		})
		player.visualActionSources.push({
			unitId: 'vasFreeClub',
			displayName: 'Club',
			sprite: 'club',
			startText: 'A well worn club',
			startsLocked: true,
			actionsWithRequirements: [{
				pickupItem: 'club',
			}],
		})
		player.visualActionSources.push({
			unitId: 'vasFreeDagger',
			displayName: 'Dagger',
			sprite: 'dagger',
			startText: 'An old rusty dagger',
			startsLocked: true,
			actionsWithRequirements: [
				{
					pickupItem: 'dagger'
				}
			],
		})
		player.visualActionSources.push({
			unitId: 'vasPassageTravel',
			displayName: 'Travel',
			sprite: 'signpost',
			startText: `You are in a passage. At one end you see Bramblefoot Woods. At the other, a campsite`,
			actionsWithRequirements: [
				{
					travelTo: 'forest',
				},
				{
					travelTo: 'goblinCamp',
				},
			],
		})
	}
}

const goblinCamp: Scene = {
	displayName: 'Goblin Campsite',
	onEnterScene(player) {
		if (!player.flags.has('killedGoblins')) {
			player.sceneTexts.push("Urged on by by your own fear and by some unknown inspiration, you fumble your way through the darkness towards the light. You are blinded as you step through and are greeted with the sight of a ramshackle encampment")
		} else {
			player.sceneTexts.push("You arrive at a familiar camp.")
		}

		let existingEnemies = enemiesInScene('goblinCamp').length
		if (!player.flags.has('killedGoblins') && !existingEnemies) {
			player.sceneTexts.push("There is a foul stench in the air. Goblins. The telltale signs of the disgusting beasts are everywhere. Various animal carcasses litter the area, and their homes, barely more than logs with tattered cloth strung between, are placed without method around the clearing.")
			for (const playerInScene of activePlayersInScene('goblinCamp')) {
				playerInScene.sceneTexts.push(`Suddendly, A pair of goblins rush out of a tent.. "Hey Gorlak, looks like lunch!" "Right you are Murk. Let's eat!"`)
			}
			// spawnEnemy('Gorlak', 'goblin', 'goblinCamp')
			spawnEnemy('Camp Rat', 'rat', 'goblinCamp')
			spawnEnemy('Dartah', 'darter', 'goblinCamp')
			spawnEnemy(
				'Murk',
				'goblin',
				'goblinCamp',
				new Map([[player.unitId, { poison: 0, rage: 5, hidden: 0 }]])
			)
		}
	},
	onBattleJoin(player) {
		player.sceneTexts.push('You see heroes fighting goblins here already, you join the fray!')
		let extraGoblinName = player.heroName.split('').reverse().join('')
		spawnEnemy(extraGoblinName, 'goblin', 'goblinCamp')
		for (const playerInScene of activePlayersInScene('goblinCamp')) {
			playerInScene.sceneTexts.push(`${player.heroName} joins the battle, attracting the attention of another goblin - ${extraGoblinName}.`)
		}
	},
	onVictory(player) {
		player.sceneTexts.push('The goblins were slain!')
		player.flags.add('killedGoblins')
	},
	actions(player: Player) {
		player.visualActionSources.push({
			unitId: 'vasCastleFromCamp',
			displayName: 'Travel',
			sprite: 'signpost',
			startText: 'With the goblins slain you are free to travel about the lands',
			actionsWithRequirements: [{ travelTo: 'forestPassage' }, { travelTo: 'castle' }],
		})
	}
}

const tunnelChamber: Scene = {
	displayName: 'Bramblemore Dungeon',
	onEnterScene(player) {
		if (player.previousScene == 'throne') {
			player.sceneTexts.push("You wend your way down a neverending series of corridors and pathways that seem to go on for an enternity. It becomes narrower and narrower, and the heat becomes almost unbearable. The path suddenly opens into a great chamber.")
		}
		if (!player.flags.has('placedMedallion') && !player.flags.has('smashedMedallion')) {
			player.sceneTexts.push("The walls are adorned with arcane symbols that are beyond your comprehension. In the centre of the room is a great altar. You approach it and notice that upon it is an recess that appears to be in the shape of the medallian that was given to you by the king. Suddenly, a great booming voice echoes throughout the chamber. 'STOP TRAVELLER! Stay your hand!'. You stop in your tracks and look over your shoulder. It is a hooded figure. 'Do not heed the call of the mad king! He knows not what he does and acts in accord with a dark force! If you place the medallion upon the altar, you will be bound to the very same forces of evil for all time. Or maybe you'll just die...' He trailed off. You can see the face of the rotting monarch in your minds eye. His face is twisted into a bitter smile that coaxes you to do his bidding. You have a choice.")
		}
	},
	actions(player: Player) {
		player.visualActionSources.push({
			unitId: 'vasDungeonAltar',
			displayName: 'Altar',
			sprite: 'altar',
			startText: `It's the altar the king told me about`,
			actionsWithRequirements: [{
				requiresNotFlags: ['placedMedallion', 'smashedMedallion'],
				setsFlag:'placedMedallion',
				bText:"Place the medallion upon the altar",
				spawnsEnemies:[
					{
						eName:'Hooded Figure',
						eTemp:'hobGoblin',
					},
					{
						eName:'Shootah',
						eTemp:'darter',
					},
				]
			}, {
				requiresNotFlags: ['placedMedallion', 'smashedMedallion'],
				setsFlag:'smashedMedallion',
				bText:'Smash the medallion',
			}
			],
			detect:[
				{
					flag:'smashedMedallion',
					startText:`The altar's energies dissapated`
				},
				{
					flag:'placedMedallion',
					startText:`The medallion was placed on the altar, it opens a secret door, revealing an item`,
				},
			]
		})

		player.visualActionSources.push({
			unitId:'vasAltarReward',
			displayName:'Plate Mail',
			sprite:'armorStand',
			startsLocked:true,
			startText:'Plate mail limits the amount of damage you take from each strike.',
			actionsWithRequirements:[
				{requiresFlags:['placedMedallion'],pickupItem:'plateMail'}
			],
			detect:[
				{
					flag:'placedMedallion',
					locked:false,
				},
			],
		})

		player.visualActionSources.push({
			unitId: 'vasThroneFromDungeon',
			displayName: 'Throne Room',
			sprite: 'castle',
			startText: 'Head back up to the throne room',
			actionsWithRequirements: [{ travelTo: 'throne' }]
		})
	},
}

const armory: Scene = {
	displayName: 'Dev Room',
	onEnterScene(player) {
		player.sceneTexts.push("Grab some equipment!")
	},
	actions(player) {
		for (const item of items) {
			player.sceneActions.push({
				buttonText: `Equip ${item.id}`,
				devAction() {
					equipItem(player, item)
				},
			})
		}
		for (const id in enemyTemplates) {
			player.sceneActions.push({
				buttonText: `Spawn ${id}`,
				devAction() {
					spawnEnemy(`${id}${Math.round(Math.random() * 1000)}`, id as EnemyTemplateId, 'armory')
				},
			})
		}
	},
}


export function addSoloScenes(name: string) {
	let t = Object.assign({}, tutorial)
	scenes.set(`tutorial_${name}`, t)
	scenes.set(`trainingRoom0_${name}`, trainingRoom0)
	scenes.set(`trainingRoom1_${name}`, trainingRoom1)
	scenes.set(`trainingRoom2_${name}`, trainingRoom2)
	scenes.set(`trainingRoom3_${name}`, trainingRoom3)
}

scenes.set('dead', dead)
scenes.set('forest', forest)
scenes.set('castle', castle)
scenes.set('throne', throne)
scenes.set('forestPassage', forestPassage)
scenes.set('goblinCamp', goblinCamp)
scenes.set('tunnelChamber', tunnelChamber)
scenes.set('armory', armory)
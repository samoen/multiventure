import type { GameActionSentToClient, ScenerySprite, VisualActionSourceId } from '$lib/utils';
import { enemiesInScene, enemyTemplates, spawnEnemy, type EnemyTemplateId } from './enemies';
import { bodyItems, utilityItems, weapons, type ItemIdForSlot, items } from './items';
import { activePlayersInScene, globalFlags, healPlayer, type GameAction, type HeroName, type MiscPortrait, type Player } from './users';


export const scenes: Map<SceneId, Scene> = new Map()

export type SceneId =
	| `tutorial_${HeroName}`
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
	onEnterScene: (player: Player) => void
	onBattleJoin?: (player: Player) => void
	onVictory?: (player: Player) => void
	actions: (player: Player) => void
	solo?: boolean
	hasEntered?: Set<HeroName>
	makeSceneFlags?:()=>object
};

export type VisualActionSource = {
	id: VisualActionSourceId
	sprite: ScenerySprite
	portrait?: MiscPortrait
	actions: GameAction[]
	conversation: Conversation
	unlockables: UnlockableAction[]
}

export type VisualActionSourceInClient = {
	id: VisualActionSourceId
	sprite: ScenerySprite
	portrait?: MiscPortrait
	actionsInClient: GameActionSentToClient[]
	conversation: Conversation
	unlockables: UnlockableClientAction[]
}

export function convertVasToClient(vas:VisualActionSource):VisualActionSourceInClient{
	let result = {
		id:vas.id,
		conversation:vas.conversation,
		sprite:vas.sprite,
		portrait:vas.portrait,
		actionsInClient:vas.actions.map(a=>{
			return {
				buttonText:a.buttonText
			}
		}),
		unlockables:vas.unlockables.map(u=>{
			let clientUnlockable : UnlockableClientAction = {
				isLocked:true,
				lockHandle:u.lockHandle,
				clientAct:{
					buttonText:u.serverAct.buttonText
				}
			}
			return clientUnlockable
		})
	}satisfies VisualActionSourceInClient
	return result
}

export type Conversation = {
	startText: string,
	responses: ConversationResponse[]
}

export type UnlockableAction = { 
	lockHandle: string, 
	serverAct: GameAction, 
}

export type UnlockableClientAction = { 
	lockHandle: string, 
	clientAct:GameActionSentToClient, 
	isLocked: boolean 
}

export type ConversationResponse = { 
	lockHandle:string,
	isLocked:boolean,
	responseText: string,
	retort: string,
	unlock?: string[],
	lock?: string[]
 }

const dead: Scene = {
	onEnterScene(player) {
		player.sceneTexts.push("You see a bright light and follow it. After a short eternity you decide wandering the halls of the dead is not for you.")
		player.health = player.maxHealth
	},
	actions(player) {
		player.sceneActions.push({
			buttonText: 'Reincarnate in armory',
			goTo: 'armory',
		})
		// if (player.lastCheckpoint) {
		player.sceneActions.push({
			buttonText: `Reincarnate at checkpoint ${player.lastCheckpoint}`,
			goTo: player.lastCheckpoint,
		})
		// }
	}
}



const tutorial = {
	onEnterScene(player) {
		// player.inventory.body.itemId = 'rags'
		// player.inventory.utility.itemId = 'empty'
		// player.inventory.weapon.itemId = 'unarmed'
		player.sceneTexts.push(`You are standing at a castle barracks. Soliders mill around swinging swords and grunting in cool morning air. You see Arthur, the captain of the castle guard marching towards you.`)
	},
	actions(player) {
		let tutorActions : GameAction[] = []
		if (player.flags.has('approachedRack') && player.inventory.weapon.itemId != 'club') {
			player.visualActionSources.push({
				id: 'vasEquipClub',
				sprite: 'castle',
				actions: [
					{
						buttonText: 'equip club',
						performAction() {
							player.inventory.weapon.itemId = 'club'
						},
					}
				],
				conversation: {
					startText: 'A club deals a hefty chunk of damage each hit. That makes it effective against unarmored foes like goblins.',
					responses: []
				},
				unlockables: [],
			})
		}
		if (player.flags.has('approachedRack') && player.inventory.utility.itemId != 'bomb') {
			player.visualActionSources.push({
				id: 'vasEquipBomb',
				sprite: 'castle',
				actions: [
					{
						buttonText: 'equip bomb',
						performAction() {
							player.inventory.utility.itemId = 'bomb'
						},
					}
				],
				conversation: {
					startText: 'A powderbomb deals splash damage to all nearby enemies. It should clear out the rats nicely.',
					responses: []
				},
				unlockables: [],
			})
		}
		if (player.inventory.utility.itemId == 'bomb' && player.inventory.weapon.itemId == 'club') {
			tutorActions.push({
					buttonText: "'Splash em' and bash em', got it.'",
					goTo: `trainingRoom1_${player.heroName}`
			})
		}
		player.visualActionSources.push({
			id: 'vasTutor',
			actions: tutorActions,
			conversation: {
				startText: `'Look alive recruit! The first day of training can be the most dangerous of a guardsman's life. You must be ${player.heroName}, welcome aboard. In this barracks we wake up early, follow orders, and NEVER skip the tutorial. Many great heroes started their journey on the very ground you stand, and they all knew the importance of a good tutorial.'`,
				responses: [
					{
						lockHandle:'scared',
						isLocked:false,
						responseText: `Huh? Danger... Early mornings?? I didn't sign up for any of this!`,
						retort: `Hmmf, if you think you can weasel your way through this game without enduring hardship you're in for a rude awakening.. anyway it's just a quick tutorial, skip it only with good reason.`,
						unlock: ['wantsToSkip']
					},
					{
						lockHandle:'cheeky',
						isLocked:false,
						responseText: `I would rather you didn't break the fourth wall, I'm into more serious RPGs.`,
						retort: `Lighten up recruit. Things will get plenty dark and gritty soon enough. If it makes you feel better I'll tell all the NPCs we've got a serious roleplayer coming through.`
					},
					{
						lockHandle:'brave',
						isLocked:false,
						responseText: `I tend to breeze through tutorials pretty easily so.. not worried. Get on with it.`,
						retort: `Great to hear ${player.heroName}! Our training goblin is ready for you. Also there's a bit of a rat problem in the training room right now.. so grab some equipment off the rack and let's go.`,
						unlock: [`readyForTutorial`],
						lock: ['wantsToSkip','scared','cheeky'],
					},
				]
			},
			unlockables: [
				{
					lockHandle: 'wantsToSkip',
					serverAct: {
						buttonText: 'Skip Tutorial',
						goTo: 'forest',
					},
				},
				{
					lockHandle: 'readyForTutorial',
					serverAct: {
						buttonText: "Sure, show me the weapons!",
						performAction() {
							player.flags.add('approachedRack')
						},

					},
				}

			],
			sprite: 'general',
			portrait: 'general',
		})

	},
} satisfies Scene

const trainingRoom1 = {
	solo: true,
	onEnterScene(player) {
		player.lastCheckpoint = `tutorial_${player.heroName}`
		if (player.previousScene == 'dead') {
			this.onVictory && this.onVictory(player)
			return
		}
		player.sceneTexts.push("You enter the training room. It is well worn by many training sessions. The walls are covered in blast marks, dents and splinters.")
		player.sceneTexts.push("Glornak: 'Hey you! I've never seen a more pitiful excuse for a guardsman in my life, and I've been working here since Arthur was a recruit! Go, my rats!'")
		player.sceneTexts.push("Skitters: 'Squeak!'")
		player.sceneTexts.push("Nibbles: 'Reeeeee!'")

		spawnEnemy('Glornak', 'goblin', `trainingRoom1_${player.heroName}`)
		spawnEnemy('Skitters', 'rat', `trainingRoom1_${player.heroName}`)
		spawnEnemy('Squeaky', 'rat', `trainingRoom1_${player.heroName}`)
		spawnEnemy('Scratchy', 'rat', `trainingRoom1_${player.heroName}`)
		spawnEnemy('Nibbles', 'rat', `trainingRoom1_${player.heroName}`)
	},
	actions(player) {

		if (player.inventory.utility.itemId == 'bandage' && player.inventory.weapon.itemId == 'dagger') {
			player.sceneActions.push({
				buttonText: "'Yeah yeah, prioritize my targets.. OK I'm ready.'",
				goTo: `trainingRoom2_${player.heroName}`,
			})
		}
		if (player.inventory.weapon.itemId != 'dagger') {
			player.sceneActions.push({
				buttonText: 'Equip Dagger',
				performAction() {
					player.inventory.weapon.itemId = 'dagger'
					player.sceneTexts.push("Hobgoblins wear heavy armor, which limits the amount of damage they take each strike. A dagger strikes multiple times per attack, mitigating their defenses.")
				},
			})
		}
		if (player.inventory.utility.itemId != 'bandage') {
			player.sceneActions.push({
				buttonText: 'Equip Bandage',
				performAction() {
					player.inventory.utility.itemId = 'bandage'
					player.sceneTexts.push("Use that bandage when you get low on health. By the way, the hobgoblin named Borgus becomes more dangerous as the battle goes on due to his rage. Kill him as soon as possible!")
				},
			})
		}
	},
	onVictory(player) {
		player.health = player.maxHealth
		player.sceneTexts.push("Glornak: 'Ohhhh nooooo. How could I underestimate this recruit. Surely they are the chosen one.'")
		player.sceneTexts.push("Glornak falls down in a very convincing display.")
		player.sceneTexts.push("Arthur: 'Great job! Let's switch up your equipment. Your next battle is against armored Hobgoblins. There's a fire gremlin in there too, but save him for last - he's as much a danger to his allies as he is to you.'")
	},
} satisfies Scene

const trainingRoom2: Scene = {
	solo: true,
	onEnterScene(player) {
		player.lastCheckpoint = `trainingRoom1_${player.heroName}`
		if (player.previousScene == 'dead') {
			this.onVictory && this.onVictory(player)
			return
		}
		let borgusStatuses = new Map()
		borgusStatuses.set(player.heroName, { poison: 0, rage: 5 })
		player.sceneTexts.push("Borgus: 'Raaargh! What are you hob-doing in MY hob-training room?! How is Glornak by the way? We used to work in the same room but they split us up.'")
		player.sceneTexts.push("Florgus: 'There you go again Morgus, talking about Glornak like I'm not standing right here. And it's OUR training room now remember? Oh Great, another recruit equipped with a dagger..'")
		player.sceneTexts.push("Scortchy: 'Burn! I burn you! REEEE HEEE HEEE'")
		player.sceneTexts.push("Florgus: 'Remember Scortchy, aim for the recruit! Not us!'")
		spawnEnemy('Borgus', 'hobGoblin', `trainingRoom2_${player.heroName}`, borgusStatuses)
		spawnEnemy('Florgus', 'hobGoblin', `trainingRoom2_${player.heroName}`)
		spawnEnemy('Scorchy', 'fireGremlin', `trainingRoom2_${player.heroName}`)
	},
	actions(player) {
		if (player.inventory.utility.itemId != 'poisonDart') {
			player.sceneActions.push({
				buttonText: 'Equip Poison Dart',
				performAction() {
					player.inventory.utility.itemId = 'poisonDart'
					player.sceneTexts.push("Poison deals more damage the bigger the enemy. It deals it's damage over 3 turns, so you need to be able to survive that long.")
				},
			})
		}
		if (player.inventory.body.itemId != 'theifCloak') {
			player.sceneActions.push({
				buttonText: "Equip Theif's Cloak",
				performAction() {
					player.inventory.body.itemId = 'theifCloak'
					player.sceneTexts.push("A theif's cloak lets you hide for a turn, preventing retaliation from enemies. It's a good way to wait for your weapon to warmup and cooldown. Poison your enemy first to get extra value!")
				},
			})
		}
		if (player.inventory.weapon.itemId != 'fireStaff') {
			player.sceneActions.push({
				buttonText: 'Equip Fire Staff',
				performAction() {
					player.inventory.weapon.itemId = 'fireStaff'
					player.sceneTexts.push("A fire staff takes 3 turns before you can use it. Trolls are slow, so it won't get a chance to retaliate once you land that finishing blast!")
				},
			})
		}
		if (player.inventory.weapon.itemId == 'fireStaff' && player.inventory.body.itemId == 'theifCloak' && player.inventory.utility.itemId == 'poisonDart')
			player.sceneActions.push({
				buttonText: "'Ok, order is important.. Poison, hide, then blast. Ready.'",
				goTo: `trainingRoom3_${player.heroName}`,
			})
	},
	onVictory(player) {
		player.health = player.maxHealth
		player.sceneTexts.push("Arthur: 'Brilliant work recruit! Alright, last one. We don't normally do this but I see something great in you. You are going to fight a cave troll. Trolls have very high damage and health, this equipment will let you handle him.'")
	},
}

const trainingRoom3: Scene = {
	solo: true,
	onEnterScene(player) {
		player.lastCheckpoint = `trainingRoom2_${player.heroName}`
		player.sceneTexts.push("You enter a dark, stinking place. Iron bars slam shut behind you. It looks more like a prison cell than a training room. The bones of previous recruits are strewn about the place. A giant figure emerges from the darkness.")
		player.sceneTexts.push("Ragor: 'RRRAAAAAAUUUUUUGHHH!'")
		player.sceneTexts.push("You hear Arthur's voice from behind the barred doors.")
		player.sceneTexts.push(`Arthur: You know what, ${player.heroName}? Maybe I was a bit too hasty throwing you in there.. it's more of a day two kind of battle. If I can just find the door key I'll pull you out...'`)
		player.sceneTexts.push(`You hear a set of keys clattering to the ground and Arthur fumbling around`)
		spawnEnemy('Ragor', 'troll', `trainingRoom3_${player.heroName}`)
	},
	actions(player) {
		player.sceneActions.push({
			buttonText: 'Thanks for the tips, Arthur. Teleport me to the real game.',
			goTo: 'forest',
		})

	},
	onVictory(player) {
		player.sceneTexts.push('The mighty beast falls as Arthur finally gets the door open')
		player.sceneTexts.push(`Arthur: 'Well done ${player.heroName}! You may be the chosen one after all! Now give all your equipment back, I can't have you starting the game like that.'`)
		player.inventory.body.itemId = 'rags'
		player.inventory.utility.itemId = 'empty'
		player.inventory.weapon.itemId = 'unarmed'
		player.health = player.maxHealth
	},
}

const forest: Scene = {
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
		if (!player.flags.has('heardAboutHiddenPassage')) {
			player.sceneTexts.push(`You are surrounded by dense undergrowth. With every slight movement you feel sharp foliage digging into your flesh. The forest is green and verdent. It teems with life. The sound of insects buzzing fills the air like the distant screams of the innocent. Unseen creatures shuffle just out of sight, their eyes fixed firmly upon you: the unwanted visitor. There is something distinctly unwell about this place.`)
		}
	},
	actions(player: Player) {
		player.sceneActions.push(
			{
				buttonText: 'Hike towards that castle',
				goTo: 'castle',
			}

		)
		player.visualActionSources.push({
			id: 'vascastle',
			sprite: 'castle',
			actions: [{
				buttonText: 'Slog it towards teh castle',
				goTo: 'castle',
			}],
			conversation: {
				startText: `In the distance you see a castle. You feel you might have seen it before. Perhaps in a dream. Or was it a nightmare?`,
				responses: []
			},
			unlockables: [],
		})
		if (player.flags.has('heardAboutHiddenPassage')) {
			player.sceneActions.push(
				{
					buttonText: `Search deep into dense forest`,
					goTo: 'forestPassage',
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
		if (player.previousScene == 'house') {
			player.sceneTexts.push('You exit the housing of the greiving mother. The castle looms, and the forest beckons.')
		}
		if (player.flags.has('heardAboutHiddenPassage') && !player.flags.has('metArthur')) {
			player.flags.add('metArthur')
			player.sceneTexts.push("From an unknown place appears a voice. 'Hail!' It cries. You reach for a weapon that you suddenly remember you don't posess. While you see know doors, before you materialises a soldier. There is something about his eyes that tell you he is not afflicted by the same condition that seems to have twisted this land. 'I see you have found your way into this once hallowed hall. I would introduce myself, but whatever name I once had no longer has any meaning.'");
			if (player.inventory.utility.itemId == 'empty') {
				player.sceneTexts.push("From his cloak he produces a small object. A bandage. 'You may need this traveller. This land is unkind to strangers.")
				player.inventory.utility.itemId = 'bandage';
			}
			player.sceneTexts.push("As quickly as he arrived, the mysterious warrior disappears back into the walls. You feel that this will not be the last your see of this odd spirit.");
		}
		if (!player.flags.has('heardAboutHiddenPassage')) {
			player.sceneTexts.push("This castle contains the memory of great beauty, but it feels long gone. In its place is an emptiness. A confusion. Wherevery ou turn, it feels as though there is an entity just at the periphery of your visual. The sense of something obscene inhabits this place. What should be a structure of strength and security, has become something maddening to the senses.")
		}
		if (player.flags.has('killedGoblins') && !player.flags.has('sawArthurAfterBattle')) {
			player.flags.add('sawArthurAfterBattle')
			healPlayer(player, 50)
			player.sceneTexts.push("The soldier you passed earlier watches you approach and a smile grows on his face.\n\nArthur: I can smell battle on ye traveller! So you've had your first taste of blood in this foul land? Well I've learnt a trick or two in my time roaming this insane world. Hold still a minute...\n\nThe soldier's face becomes blank for a moment, and in an instant you feel a burning heat passing through your body. As it subsides, you feel energised and repaired.\n\nArthur:That'll set you straight for a bit traveller! As he trundles on his way he calls back to you.\n\nArthur: You may be wanting to see the King! Word of your victory travels fast around here.")
		}
	},
	actions(player: Player) {
		player.sceneActions.push({ buttonText: 'Delve into the forest', goTo: 'forest', })
		player.sceneActions.push({ buttonText: 'Go into house', goTo: 'house', })
		player.sceneActions.push(
			{
				buttonText: 'Head towards the throne room',
				goTo: 'throne',
			}
		)
	}
};

const house: Scene = {
	makeSceneFlags(){
		return{
			accepted: false
		}
	},
	onEnterScene(player) {
		if (player.flags.has('killedGoblins')) {
			player.sceneTexts.push(`Dear Sir ${player.heroName}! You return with the stench of goblin blood about yourself. Thank you for obtaining vengence on my behalf. My son had this set of leather armour. If only he had been wearing it when he went on his adventure.\n\nI bequeath it to you so that his legacy may live on. Good luck out there ${player.heroName}`)
		} else
			if (!player.flags.has('heardAboutHiddenPassage')) {
				player.flags.add('heardAboutHiddenPassage')
				player.sceneTexts.push("You come upon a beautiful little thatched roof cottage. The air is sweet with the smell of flowery perfume, but there is a sense of sadness in the air. You notice the door slightly ajar and knock on it quietly. There is no response.\n\nYou gently push the door open and find a woman sitting at a table alone, sobbing silently. Startled, she jumps from her seat. You hold your hands up as in a sign of concilation. 'Traveller, what is it you do here? Do you not see I grieve? My son... he was murdered by Gorlak and his rowdy band of filthy goblin scum. He was barely a man yet had the stars in his eyes. He sought adventure but found his demise far too soon. Will you avenge him on my behalf? I don't have much but I'm sure I can find somethign to reward you")
				// player.sceneTexts.push("The figure atop the throne opens its mouth and from it emerges something akin to speech, but with the qualities of a dying whisper. 'I am... or was.. the king of this wretched place.' The figure starts, haltingly. 'I... the forest.... there is a passage. Find it and return to me.' The figure falls silent and returns to its corpselike revery.");
			}
			else if (!player.flags.has('killedGoblins')) {
				player.sceneTexts.push(`${player.heroName}... why do you return without the blood of those foul goblins on your hands? Leave me. I do not wish to see anyone while they still draw breath.`)
			}
	},
	actions(player) {
		let scene = this
		player.sceneActions.push({ buttonText: 'Leave the house', goTo: 'castle', })
		if (!player.flags.has('acceptedGoblinQuest')) {
			player.sceneActions.push({
				buttonText: `'I will'`,
				performAction() {
					player.flags.add('acceptedGoblinQuest')
					player.sceneTexts.push(`${player.heroName}: 'Good lady. I will do this deed for you. No goblin scum will unpunished for this dark deed. I will return when I have silenced their gibberings.'`)
					player.sceneTexts.push(`Woman: 'Thank you kind traveller. There is a passage in the forest hidden from normal view. My son would often go searching in the lands beyond. Search the dark recesses of the forest and you will come upon this place. ${player.heroName}, find those wretched curs and show them no mercy.'`)
				},
			})
		}
		if (player.flags.has('killedGoblins') && player.inventory.body.itemId != 'leatherArmor') {
			player.sceneActions.push({
				buttonText: 'Accept the gift',
				performAction() {
					player.inventory.body.itemId = 'leatherArmor'
					player.sceneTexts.push(`${player.heroName}: Thank you good lady. I will not let his death be in vain.\n\nYou put on the leather armour and it fits snugly around you. With this, the blows of your enemies will not do nearly so much damage.`)
				},
			})
		}

	},
}
scenes.set('house', house)

const throne: Scene = {
	onEnterScene(player) {
		if (globalFlags.has('placedMedallion')) {
			player.sceneTexts.push("The dishevelled king turns to you and opens his arms as if to welcome you back. 'Stranger. You have done my bidding, but your fate is sealed. I have no time for pathetic weaklings like you. Prepare yourself. I am sending you to a place from which there is no return.")
		} else if (globalFlags.has('smashedMedallion')) {
			player.sceneTexts.push("The dishevelled king turns to you with something akin to a smile on his rotting visage. 'You have betrayed me stranger. And after I put my faith in you. You will suffer. Prepare yourself, I am sending you to the realm of madness.")
		} else if (!player.flags.has('killedGoblins')) {
			player.sceneTexts.push(`You approach the throne room's mighty doors. Before it stands a guard with a look on his face that could kill a troll. 'What business have you here, stranger? This is the throne room of the mighty king. I suggest you turn back until you have some business here.`)
		} else {

			player.sceneTexts.push('At the end of the entrance hall to this eldritch structure, you approach a mighty door guarded by a fearsome warrior.\n\nGuard: Ah. You have returned, traveller. Word of your deeds has reached the king and he has decided to give you and audience.\n\nAs you approach, the door seems to crack apart, revealing a dazzling light. You step inside.')
			player.sceneTexts.push("Before you is a great throne. Sitting aside it are two giant sculptures carved from marble. The one of the left depicts an angel, its wings spread to a might span. It wields a sword from which a great fire burns. To the left of the throne is a garoyle, its lips pulled back in a monstrous snarl revealing rows of serrated teeth. One of its arms are raised and it appears to hold a ball of pure electricity which crackles in the dim light. Atop the throne sits an emaciated figure.")
			player.sceneTexts.push("You approach the throne, but something feels wrong. As you pass between two mighty sculptures of a warring demon and angel, a powerful energy fills the air. The flame from the angel's sword and the electrical charge from the demon's hand begin to grow in size and reach out towards each other. The rotting body of the king suddenly leaps from it's throne. He screams from from the centre of the skeletal form 'You have proven your worth traveller, but there is a greater threat at hand! The forces of good and evil are no longer in balance! You must take this medallion and complete the ritual before it's too late!' The throne appears to cave in on itself, and a path that leads to the depths of castle appears. You feel you have no choice but to enter.")
		}




	},
	actions(player: Player) {
		const hasDoneMedallion = globalFlags.has('smashedMedallion') || globalFlags.has('placedMedallion')
		const mustGoThroughTunnel = player.flags.has('killedGoblins') && !hasDoneMedallion

		if (!mustGoThroughTunnel && !hasDoneMedallion) {
			player.sceneActions.push(
				{
					buttonText: 'Take your leave',
					goTo: 'castle',
				})
		}
		if (mustGoThroughTunnel) {
			player.sceneActions.push(
				{
					buttonText: 'Go through the tunnel leading to the depths',
					goTo: 'tunnelChamber',
				}

			)
		}
		if (hasDoneMedallion) {
			player.sceneActions.push({
				buttonText: 'Brace yourself',
				goTo: 'realmOfMadness',
			})
		}
	}
}

const realmOfMadness: Scene = {
	onEnterScene(player) {
		player.sceneTexts.push('your in the realm')
	},
	actions(player) {

	},
}
scenes.set('realmOfMadness', realmOfMadness)

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
		player.sceneActions.push(
			{
				buttonText: 'Go towards the forest',
				goTo: 'forest',
			}

		)
		if (!player.flags.has('gotFreeStarterWeapon')) {
			player.sceneActions.push(
				{
					buttonText: 'I choose the club',
					performAction: () => {
						player.inventory.weapon.itemId = 'club';
						player.flags.add('gotFreeStarterWeapon');
						player.sceneTexts.push("A bow appears before you, and you snatch it up. You sense danger ahead, a clearing at the end of the tunnel");
					}
				}
			)
		}
		if (!player.flags.has('gotFreeStarterWeapon')) {
			player.sceneActions.push(
				{
					buttonText: 'I choose the dagger',
					performAction() {
						player.inventory.weapon.itemId = 'dagger';
						player.flags.add('gotFreeStarterWeapon');
						player.sceneTexts.push("A shiny sword materializes in your hand! You sense danger ahead, a clearing at the end of the tunnel");
					}
				}
			)
		}
		if (player.flags.has('gotFreeStarterWeapon')) {
			player.sceneActions.push(
				{
					buttonText: 'Push through towards the clearing',
					goTo: 'goblinCamp',
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

		let existingEnemies = enemiesInScene('goblinCamp').length
		if (!player.flags.has('killedGoblins') && !existingEnemies) {
			player.sceneTexts.push("There is a foul stench in the air. Goblins. The telltale signs of the disgusting beasts are everywhere. Various animal carcasses litter the area, and their homes, barely more than logs with tattered cloth strung between, are placed without method around the clearing.")
			for (const playerInScene of activePlayersInScene('goblinCamp')) {
				playerInScene.sceneTexts.push(`Suddendly, A pair of goblins rush out of a tent.. "Hey Gorlak, looks like lunch!" "Right you are Murk. Let's eat!"`)
			}
			spawnEnemy('Gorlak', 'goblin', 'goblinCamp')
			let murkStatuses = new Map()
			murkStatuses.set(player.heroName, { poison: 0, rage: 5 })
			spawnEnemy('Murk', 'goblin', 'goblinCamp', murkStatuses)
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
		player.sceneActions.push(
			{
				buttonText: 'Go back through the passage',
				goTo: 'forestPassage',
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
		const medallionDone = globalFlags.has('smashedMedallion') || globalFlags.has('placedMedallion')
		if (!medallionDone) {
			player.sceneActions.push(
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
						spawnEnemy('Hooded Figure', 'hobGoblin', 'tunnelChamber')
						spawnEnemy('Skritter', 'rat', 'tunnelChamber')
						spawnEnemy('Snivels', 'rat', 'tunnelChamber')
					},
				}
			)
			player.sceneActions.push(
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

		if (medallionDone) {
			player.sceneActions.push(
				{
					buttonText: "Return to throne",
					goTo: 'throne',
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
			if (id == 'unarmed' || id == player.inventory.weapon.itemId) continue
			player.sceneActions.push({
				buttonText: `Equip Weapon ${id}`,
				grantsImmunity: true,
				performAction() {
					const tId = id as ItemIdForSlot<'weapon'>
					player.inventory.weapon.itemId = tId
					player.inventory.weapon.warmup = weapons[tId].warmup ?? 0
					player.inventory.weapon.cooldown = 0
				},
			})
		}
		for (const id in utilityItems) {
			if (id == 'empty'
				// || id == player.inventory.utility.itemId
			) continue
			player.sceneActions.push({
				buttonText: `Equip Utility ${id}`,
				grantsImmunity: true,
				performAction() {
					let typedId = id as ItemIdForSlot<'utility'>
					player.inventory.utility.itemId = typedId
					let baseItem = utilityItems[typedId]
					if (baseItem && baseItem.startStock != undefined) player.inventory.utility.stock = baseItem.startStock
				},
			})
		}
		for (const id in bodyItems) {
			if (id == 'rags' || id == player.inventory.body.itemId) continue
			player.sceneActions.push({
				buttonText: `Equip Body ${id}`,
				grantsImmunity: true,
				performAction() {
					player.inventory.body.itemId = id as ItemIdForSlot<'body'>
				},
			})
		}
		for (const id in enemyTemplates) {
			player.sceneActions.push({
				buttonText: `Spawn ${id}`,
				grantsImmunity: true,
				performAction() {
					spawnEnemy(`${id}${Math.round(Math.random() * 100)}`, id as EnemyTemplateId, 'armory')
				},
			})
		}
	},
}


export function addSoloScenes(name: string) {
	let t = Object.assign({}, tutorial)
	scenes.set(`tutorial_${name}`, t)
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
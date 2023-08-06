import type { ActionGenerator, SelfActionGenerator } from './actions';
import { activeEnemies, enemyTemplates } from './enemies';
import { users, type Player } from './users';

export type SceneKey = 'dead' | 'forest' | 'castle' | 'throne' | 'forestPassage' | 'goblinCamp' | 'tunnelChamber';
export type Scene = {
	onEnterScene: SceneEntry;
	sceneActions: ActionGenerator[];
};

export type SceneEntry = (user: Player, from:SceneKey) => void;

const dead :Scene ={
	onEnterScene(user, from) {
		user.duringSceneTexts.push("You died")
	},
	sceneActions:[
		{
			targeting:'noTarget',
			generate(actor) {
				return {
					buttonText:'respawn',
					performAction() {
						actor.currentScene = 'forest'
					},
				}
			},
		}
	]
}

const forest :Scene =  {
	onEnterScene(user, from) {
		if(from == 'dead'){
			user.duringSceneTexts.push("You awaken in a cold sweat with no memory of anything. The world around you seems dark and permeated by an unholy madness. There's a strange sickly smell that seems familiar. The smell of corruption. The smell of death.")
		}
		if(from == 'castle'){
			user.duringSceneTexts.push('Despite your rising panic at the mere thought of entering that hellish maze of rotting plant matter and creatures beyond imagination, you push your way back into the depths.')
		}
		if(from == 'forestPassage'){
			user.duringSceneTexts.push('You get out the passage, and stumble into the surrounding overgrowth')
		}
		user.duringSceneTexts.push(`You are surrounded by dense undergrowth. With every slight movement you feel sharp foliage digging into your flesh. The forest is green and verdent. It teems with life. The sound of insects buzzing fills the air like the distant screams of the innocent. Unseen creatures shuffle just out of sight, their eyes fixed firmly upon you: the unwanted visitor. There is something distinctly unwell about this place. In the distance you see a castle. You feel you might have seen it before. Perhaps in a dream. Or was it a nightmare?`)
	},
	sceneActions: [
		{
			targeting: 'noTarget',
			generate(actor) {
				return {
					buttonText: 'Hike towards that castle',
					performAction(){
						actor.currentScene = 'castle';
					},
				}
			}
		},
		{
			targeting: 'noTarget',
			generate: (actor: Player) => {
				if (!actor.flags.has('heardAboutHiddenPassage')) return null;
				return {
					buttonText: `Search deep into dense forest`,
					performAction: () => {
						actor.currentScene = 'forestPassage';
					}
				};
			}
		},
]
}

const castle : Scene = {
	onEnterScene(user,from){
		if(from == 'throne'){
			user.duringSceneTexts.push('You climb back down those darn steps. So many steps.')
		}
		if(from == 'forest'){
			user.duringSceneTexts.push('You push your way through the piercing thorns and supple branches that seem to whip at your exposed flesh. After hours of arduous travel, you find yourself amongst thatch roof huts and tents. There are few people to be found, and those that are here seem dead behind the eyes. A dirty woman sit by a fire cooking what looks like a rat. You mention the castle and how you might enter, and she merely points a finger towards what appears to be an infinite staircase and turns her face back to the fire. You make your way towards it and ascend.')
		}
		user.duringSceneTexts.push("This castle contains the memory of great beauty, but it feels long gone. In its place is an emptiness. A confusion. Wherevery ou turn, it feels as though there is an entity just at the periphery of your visual. The sense of something obscene inhabits this place. What should be a structure of strength and security, has become something maddening to the senses.")
		
		if(user.flags.has('killedGoblins')){
			user.health += 50
			user.duringSceneTexts.push("The soldier you passed earlier watches you approach and a smile grows on his face. 'I can smell battle on ye traveller! So you've had your first taste of blood in this foul land? Well I've learnt a trick or two in my time roaming this insane world. Hold still a minute...'. The soldiers face becomes blank for a moment, and in an instant you feel a burning heat passing through your body. As it subsides, you feel energised and repaired. 'That'll set you straight for a bit traveller!' Bellows the soldier as he trundles on his way'.")
		}else if (!user.inventory.includes('bandage')) {
			user.inventory.push('bandage');
			user.duringSceneTexts.push("From an unknown place appears a voice. 'Hail!' It cries. You reach for a weapon that you suddenly remember you don't posess. While you see know doors, before you materialises a soldier. There is something about his eyes that tell you he is not afflicted by the same condition that seems to have twisted this land. 'I see you have found your way into this once hallowed hall. I would introduce myself, but whatever name I once had no longer has any meaning.' From his cloak he produces a small object. A bandage. 'You may need this traveller. This land is unkind to strangers.' As quickly as he arrived, the mysterious warrior disappears back into the walls. You feel that this will not be the last your see of this odd spirit.");
		}
	},
	sceneActions: [
		{
			targeting: 'noTarget',
			generate(actor) {
				return {
					buttonText: 'Delve into the forest',
					performAction(){
						actor.currentScene = 'forest';
					},
				}
			}
		},
		{
			targeting: 'noTarget',
			generate(actor) {
				return {
					buttonText: 'Head towards the throne room',
					performAction(){
						actor.currentScene = 'throne';
					},
				}
			}
		},
	]
};

const throne : Scene = {
	onEnterScene(user,from){
		if(user.flags.has('placedMedallion')){
			user.duringSceneTexts.push( "the throne looks weird because you placed the medallion and fought the stranger")
		}
		if(user.flags.has('smashedMedallion')){
			user.duringSceneTexts.push("the throne is wild and king is powerful because you smashed the medallion")
		}
		if(from == 'castle'){
			user.duringSceneTexts.push('At the end of the entrace hall to this eldritch structure, you notice a great door. It seems to stretch up into infinity, and you see no handle. As you approach, it seems to crack a part, revealing a dazzling light. You step inside.')
		}
		user.duringSceneTexts.push("Before you is a great throne. Sitting aside it are two giant sculptures carved from marple. The one of the left depicts an angel, its wings spread to a might span. It wields a sword from which a great fire burns. To the left of the throne is a garoyle, its lips pulled back in a monstrous snarl revealing rows of serrated teeth. One of its arms are raised and it appears to hold a ball of pure electricity which crackles in the dim light. Atop the throne sits an emaciated figure.")
		if (!user.flags.has('heardAboutHiddenPassage')) {
			user.flags.add('heardAboutHiddenPassage')
			user.duringSceneTexts.push("The figure atop the throne opens its mouth and from it emerges something akin to speech, but with the qualities of a dying whisper. 'I am... or was.. the king of this wretched place.' The figure starts, haltingly. 'I... the forest.... there is a passage. Find it and return to me.' The figure falls silent and returns to its corpselike revery.");
		}
		else if (!user.flags.has('killedGoblins')) {
			user.duringSceneTexts.push("You hear a voice inside your head that sounds more like the screams of a dying calf than words. It tells you to leave here and not to return until you have discovered the passage in the depths of the forest.")
		}
		else {
			user.duringSceneTexts.push("You once again approach the throne, but something feels wrong. As you pass between the two mighty sculptures of the warring demon and angel, a powerful energy fills the air. The flame from the angel's sword and the electrical charge from the demon's hand begin to grow in size and reach out towards each other. The rotting body of the king suddenly leaps from it's throne. He screams from from the centre of the skeletal form 'You have proven your worth traveller, but there is a greater threat at hand! The forces of good and evil are no longer in balance! You must take this medallion and complete the ritual before it's too late!' The throne appears to cave in on itself, and a path that leads to the depths of castle appears. You feel you have no choice but to enter.")
		}
					
	},
	sceneActions: [
		{
			targeting: 'noTarget',
			generate(actor) {
				if(actor.flags.has('killedGoblins')) return null
				return {
					buttonText: 'Take your leave',
					performAction(){
						actor.currentScene = 'castle';
					},
				}
			}
		},
		{
			targeting:'noTarget',
			generate(actor){
				if(!actor.flags.has('killedGoblins')) return null
				return{
					buttonText:'Follow the path leading to the depths',
					performAction() {
						actor.currentScene = 'tunnelChamber'
					},
					
				}
			},
		},
	]
}

const forestPassage : Scene = {
	onEnterScene(user,from){
		if(from == 'forest'){
			user.duringSceneTexts.push( "After what feels like hours scrambling in the fetid soil and dodging the bites of the foul crawling creatures that call the forest home, you stumble upon an entrace.")
		}
		if(from == 'goblinCamp'){
			user.duringSceneTexts.push('You leave the camp and squeeze back into the dank passage')
		}
		user.duringSceneTexts.push( "It's so dark that you can hardly make out an exit. Feeling around, your hand brush against the walls. They feel warm. As if they were alive.")
		if (!user.flags.has('gotFreeStarterWeapon')) {
			user.duringSceneTexts.push("The walls begin to contort and bend, and from the the strangely organic surface a face begins to form. Its lip start to move. 'You have made it further than most' It creaks. You make as if to run but from the walls come arms that bind you in place. 'Please. I mean you no harm' The walls murmur. In your mind you see the image of a golden sword, and beside it a bow of sturdy but flexible oak. You realise you are being given a choice.");
		}
	},
	sceneActions: [
		{
			targeting: 'noTarget',
			generate(actor) {
				return {
					buttonText: 'Leave this stinky passage towards the forest',
					performAction(){
						actor.currentScene = 'forest';
					},
				}
			}
		},
		{
			targeting: 'noTarget',
			generate(actor : Player){
				if (actor.flags.has('gotFreeStarterWeapon')) return null;
				return {
					buttonText: 'I am skillful, I choose the bow',
					performAction: () => {
						actor.inventory.push('shortBow');
						actor.flags.add('gotFreeStarterWeapon');
						actor.duringSceneTexts.push("A bow appears before you. You take it");
					}
				};
			}
		},
		{
			targeting: 'noTarget',
			generate(actor: Player){
				if (actor.flags.has('gotFreeStarterWeapon')) return null;
				return {
					buttonText: 'I am mighty, I will take the sword!',
					performAction(){
						actor.inventory.push('shortSword');
						actor.flags.add('gotFreeStarterWeapon');
						actor.duringSceneTexts.push("A shiny sword materializes in your hand!");
					}
				};
			}
		},
		{
			targeting:'noTarget',
			generate(actor) {
				if(!actor.flags.has('gotFreeStarterWeapon')) return null;
				return {
					buttonText:'Push through to the end of the passage',
					performAction() {
						actor.currentScene = 'goblinCamp'
					},
				}
			},
		}
	]
}

const goblinCamp :Scene = {
	onEnterScene(user,from) {
		if(user.flags.has('killedGoblins')){
			user.duringSceneTexts.push( `You push through to a familiar camp.`)
		}
		if(from == 'forestPassage'){
			user.duringSceneTexts.push("Urged on by by your own fear and by some unknown inspiration, you fumble your way through the darkness towards the light. You are blinded as you step through and are greeted with the site of a ramshackle encampment")
		}
		user.duringSceneTexts.push( "There is a foul stench in the air. Goblins. The telltale signs of the disgusting beasts are everywhere. Various animal carcasses litter the area, and their homes, barely more than logs with tattered cloth strung between, are placed without method around the clearing.")
		
		if(!(activeEnemies.some(e=>e.name=='Gorlak') || activeEnemies.some(e=>e.name=='Murk')) && !user.flags.has('killedGoblins')){
			user.duringSceneTexts.push(`Suddendly, A pair of goblins rush out of a tent.. "Hey Gorlak, looks like lunch!" "Right you are Murk. Let's eat!"`)
			activeEnemies.push({
				name:'Gorlak',
				currentScene: 'goblinCamp',
				currentHealth:20,
				template:enemyTemplates.goblin,
			})
			activeEnemies.push({
				name:'Murk',
				currentScene: 'goblinCamp',
				currentHealth:20,
				template:enemyTemplates.goblin,
			})
		}
	},
	sceneActions:[
		{
			targeting: 'noTarget',
			generate(actor) {
				return {
					buttonText: 'Escape back through the passage',
					performAction(){
						if(!activeEnemies.find(e=>e.name == 'Gorlak') && !activeEnemies.find(e=>e.name == 'Murk')){
							[...users.values()].forEach(user => {
								if(user.currentScene == 'goblinCamp'){
									user.flags.add('killedGoblins')
								}
							});
						}
						actor.currentScene = 'forestPassage';
					},
				}
			}
		}
	]
};

const tunnelChamber : Scene = {
	onEnterScene(user, from) {
		if(from == 'throne'){
			user.duringSceneTexts.push("You wend your way down a neverending series of corridors and pathways that seem to go on for an enternity. It becomes narrower and narrower, and the heat becomes almost unbearable. The path suddenly opens into a great chamber.")
		}
		user.duringSceneTexts.push("The walls are adorned with arcane symbols that are beyond your comprehension. In the centre of the room is a great altar. You approach it and notice that upon it is an recess that appears to be in the shape of the medallian that was given to you by the king. Suddenly, a great booming voice echoes throughout the chamber. 'STOP TRAVELLER! Stay your hand!'. You stop in your tracks and look over your shoulder. It's the stranger from the castle. 'Do not heed the call of the mad king! He knows not what he does and acts in accord with a dark force! If you place the medallion upon the altar, you will be bound to the very same forces of evil for all time. Or maybe you'll just die...' He trailed off. You can see the face of the rotting monarch in your minds eye. His face is twisted into a bitter smile that coaxes you to do his bidding. You have a choice.")
		
	},
	sceneActions:[
		{
			targeting:'noTarget',
			generate(actor) {
				if(actor.flags.has('smashedMedallion') || actor.flags.has('placedMedallion'))return null
				return {
					buttonText:"Place the medallion upon the altar",
					performAction() {
						actor.flags.add('placedMedallion')
						actor.duringSceneTexts.push('you chose to place it!! fight the stranger')
						activeEnemies.push({
							name:'stranger',
							currentHealth:40,
							currentScene:'tunnelChamber',
							template:enemyTemplates.wolf
						})	
					},
				}
			},
		},
		{
			targeting:'noTarget',
			generate(actor) {
				if(!(!activeEnemies.some(e=>e.name == 'stranger') && actor.flags.has('placedMedallion'))) return null
				return {
					buttonText:"Return to throne",
					performAction() {
						actor.currentScene = 'throne'
					},
				}
			},
		},
		{
			targeting:'noTarget',
			generate(actor) {
				if(actor.flags.has('smashedMedallion') || actor.flags.has('placedMedallion'))return null
				return {
					buttonText:"Smash the medallion",
					performAction() {
						actor.flags.add('smashedMedallion')						
					},
				}
			},
		}
	]
}

export const scenes : Record<SceneKey,Scene> = {
	dead:dead,
	forest:forest,
	castle:castle,
	throne: throne,
	forestPassage: forestPassage,
	goblinCamp: goblinCamp,
	tunnelChamber:tunnelChamber,
};

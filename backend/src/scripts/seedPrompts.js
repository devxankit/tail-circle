import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PetPrompt } from '../modules/social/prompt.model.js';
import { connectDatabase } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const questions = [
  'CURRENT MOOD & VIBE',
  'A SHOWER THOUGHT I RECENTLY HAD',
  'MY SIMPLE PLEASURES',
  'FIRST ROUND IS ON ME IF',
  'GREEN FLAGS I LOOK FOR',
  'BEST WAY TO EARN TRUST',
  'DATING ME IS LIKE',
  'MY SECRET SUPERPOWER',
  'MY FAVORITE SUNDAY ACTIVITY',
  'YOU SHOULD KNOW ABOUT ME',
  'MY MOST EMBARRASSING MOMENT',
  'A FUN FACT ABOUT ME',
  'MY GO-TO SNACK',
  'IDEAL PLAYDATE SCENARIO',
  'MY LIFE MOTTO',
  'WHAT MAKES ME TAIL-WAG HAPPY',
  'IF I COULD TALK TO HUMANS FOR 1 MINUTE',
  'MY MORNING ROUTINE INCLUDES',
  'MY FAVORITE TOY',
  'MY PET PEEVE',
  'WHY YOU SHOULD SWIPE RIGHT ON ME',
  'MY STRANGEST HABIT',
  'THE QUICKEST WAY TO MY HEART',
  'AFTER A LONG DAY I LOVE TO',
  'BEST COMPLIMENT I EVER RECEIVED',
];

const categories = [
  'Vibe & Mood',
  'Shower Thoughts',
  'Simple Pleasures',
  'Icebreaker',
  'Fun Fact',
  'Personality',
  'Routine',
  'Superpower',
];

const speciesList = ['all', 'dog', 'cat', 'bird', 'other'];

const temperaments = [
  'Playful', 'Chill', 'Energetic', 'Friendly', 'Curious',
  'Protective', 'Social', 'Calm', 'Couch Potato', 'Smart',
  'Loyal', 'Affectionate', 'Independent', 'Adventurous', 'Gentle',
  'Mischievous', 'Vocal', 'Sassy', 'Loving', 'Alert'
];

const moods = [
  'Happy 😊', 'Playful 🥎', 'Energetic ⚡', 'Sleepy 💤', 'Curious 🔍',
  'Calm 🧘', 'Cuddly 🧸', 'Zoomies 💨', 'Watchful 👁️', 'Hungry 🍖',
  'Spunky ✨', 'Chill 😎', 'Loving ❤️', 'Silly 😜', 'Brave 🦁'
];

// Templates pool grouped by question index & pet context
const templateGenerators = [
  // 0: CURRENT MOOD & VIBE
  (name, species) => [
    `${name} is in 100% zoomie mode today! Looking for a fast running buddy.`,
    `${name} is feeling ultra relaxed today. 90% napping, 10% asking for belly rubs.`,
    `${name} is bursting with happy energy and ready to make 50 new best friends!`,
    `${name} is in full detective mode! Ready to explore every corner of the park.`,
    `${name} is feeling loyal & watchful today. Always keeping an eye out for treats!`,
    `${name} is having a lazy Sunday vibe. Sunbeams and cozy cuddles only.`,
    `${name} is feeling mischievous and ready to fetch every tennis ball in sight!`,
    `${name} is full of goofy energy today, ready to perform tricks for snacks!`,
    `${name} is feeling serene, regal, and ready for gentle strolls in nature.`,
    `${name} is on high alert for squirrel sightings and backyard adventures!`,
  ],
  // 1: A SHOWER THOUGHT I RECENTLY HAD
  (name, species) => [
    `If I fetch the stick, why does the human keep throwing it away?`,
    `Do cats also wonder where the red laser dot goes when it sleeps?`,
    `If I sit politely and tilt my head, does treat probability increase by 100%?`,
    `Why is the mail carrier allowed on the porch every single day without a password?`,
    `If belly rubs feel this good, why aren't humans doing them 24/7?`,
    `If I bark at the vacuum cleaner, am I defending the household from dragons?`,
    `Why do humans wear shoes when paws are already all-terrain?`,
    `What if squeaky toys are actually communicating secret pet messages?`,
    `Is the sunbeam moving across the carpet, or am I moving through time?`,
    `If I drop the ball at your feet, it is a formal invitation to play!`,
  ],
  // 2: MY SIMPLE PLEASURES
  (name, species) => [
    `Belly rubs, squeaky tennis balls, and cold peanut butter cups!`,
    `Sunbathing by the big window while listening to soft lofi beats.`,
    `Crisp morning walks, sniffing every fire hydrant, and meeting friendly dogs.`,
    `Crunchy organic carrots, ear scratches, and long nap sessions.`,
    `Feather teasers, cardboard boxes, and watching birds from the balcony.`,
    `Running full speed on green grass until my tongue flops out!`,
    `Cuddling under warm blankets with my favorite human on rainy days.`,
    `Learning new trick combos and getting rewarded with freeze-dried treats!`,
    `Splashing in water puddles and chasing bubbles at the park.`,
    `Gentle chin scratches and soft head pats after a fun playdate.`,
  ],
  // 3: FIRST ROUND IS ON ME IF
  (name, species) => [
    `You can throw the tennis ball further than 50 feet for ${name}!`,
    `You bring yummy healthy treats and can keep up with ${name}'s energy!`,
    `You let ${name} inspect your shoes and pass the official sniffing check!`,
    `You know the best dog-friendly park with lots of green shade and agility bars.`,
    `You don't mind ${name} stealing half your blanket during cozy movie nights!`,
    `You can guess ${name}'s favorite treat on the very first try!`,
    `You share your cheese tax politely with ${name}.`,
    `You enjoy long sunset walks and high-five paw tricks!`,
    `You let ${name} sit right next to you during coffee patio hangouts.`,
    `You are ready for non-stop tail wags and endless affection!`,
  ],
  // 4: GREEN FLAGS I LOOK FOR
  (name, species) => [
    `Someone who respects that 3 PM is sacred sunbeam nap time.`,
    `A playmate who knows when to zoom and when to just chill in the grass.`,
    `Humans who carry extra dog treats in their pockets at all times!`,
    `Friends who give gentle ear scratches right behind the sweet spot.`,
    `Pals who love outdoor adventures, hiking trails, and fresh air.`,
    `Someone who compliments ${name}'s shiny coat and handsome smile.`,
    `Playmates who share their toys nicely without any growling.`,
    `Pals with calm, happy vibes and lots of positive energy.`,
    `Someone who lets ${name} win at tug-of-war at least once!`,
    `Friends who are always down for a quick afternoon park run.`,
  ],
  // 5: BEST WAY TO EARN TRUST
  (name, species) => [
    `Belly rubs, squeaky toys, and healthy freeze-dried chicken treats! 🍗`,
    `Approach slowly, offer your hand to sniff, and speak in a friendly voice!`,
    `Offer a tiny piece of cheese and let ${name} come to you at their own pace.`,
    `Bring out a brand new squeaky tennis ball and start a game of fetch!`,
    `Gentle head scratches right behind the ears work like magic every time.`,
    `Sit quietly on the floor and let ${name} do a complete curiosity sniff!`,
    `A calm smile, gentle energy, and a pocket full of yummy snacks.`,
    `Play a fun game of hide-and-seek with treats!`,
    `Give endless compliments and soft back pats.`,
    `Respect personal space until ${name} resting head on your lap!`,
  ],
  // 6: DATING ME IS LIKE
  (name, species) => [
    `Having a loyal furry bodyguard who accepts payment strictly in cheese treats.`,
    `Owning a personal 24/7 alarm clock that wakes you up with happy wet kisses!`,
    `Living with a professional olympic zoomie sprinter and champion napper.`,
    `Having a adorable shadow that follows you everywhere, even to the kitchen!`,
    `A non-stop comedy show powered by tail wags and goofy facial expressions.`,
    `Having a cozy warm lap heating pad that purrs or wags with happiness.`,
    `Living with a food inspector who reviews every meal you cook in the kitchen.`,
    `Having an eager fitness trainer who insists on 3 walks a day regardless of weather!`,
    `Having an eternal best friend who is always genuinely happy to see you.`,
    `Living with a sweet cuddle bug who loves unconditional love and ear rubs.`,
  ],
  // 7: MY SECRET SUPERPOWER
  (name, species) => [
    `Hearing a treat bag opening from 3 rooms away through closed doors!`,
    `Mastering the ultimate "puss-in-boots" puppy eyes to get extra snacks.`,
    `Finding the single warmest sunbeam in the house no matter what time of day.`,
    `Transforming into a furry tornado of pure joy whenever my human gets home!`,
    `Catching frisbees in mid-air with 99.9% precision!`,
    `Sniffing out hidden tennis balls under couches in under 10 seconds flat.`,
    `Turning any boring afternoon into an exciting game of chase!`,
    `Sleeping in the most hilarious pretzel positions imaginable.`,
    `Instantly lifting anyone's mood with a sweet head rest on their knee.`,
    `Knowing exact walk time down to the minute without looking at a clock!`,
  ],
  // 8: MY FAVORITE SUNDAY ACTIVITY
  (name, species) => [
    `Running through green trails and making new doggie besties at the park! 🌲🐕`,
    `Sleeping in until 10 AM, followed by a gourmet breakfast and lazy belly rubs.`,
    `Going on a road trip to the beach and splashing in shallow ocean waves!`,
    `Visiting the local pet-friendly farmers market and getting free treat samples.`,
    `Chasing bubbles in the backyard and taking long afternoon naps in the shade.`,
    `Practicing agility jumps and learning fun new tricks with my human!`,
    `Hanging out at a dog-friendly coffee patio while watching the world go by.`,
    `Having an epic playdate with neighbor pets and sharing squeaky toys.`,
    `Exploring new hiking paths and sniffing every interesting tree along the way.`,
    `Curling up on a plush sofa while watching animal documentaries!`,
  ],
  // 9: YOU SHOULD KNOW ABOUT ME
  (name, species) => [
    `${name} takes playtime very seriously and will bring you toys as tokens of affection!`,
    `${name} has a black belt in fetching and will not stop until you say nap time!`,
    `${name} is a gentle soul who loves meeting calm pets and friendly people.`,
    `${name} is super smart and can open cabinet doors if not watched closely!`,
    `${name} loves car rides with the window slightly open to catch fresh breezes.`,
    `${name} is a certified snuggle monster during cool evenings.`,
    `${name} vocalizes happiness with cute little squeaks and soft woofs!`,
    `${name} is extremely loyal and will stand guard by your side during workouts.`,
    `${name} loves playing in water sprinklers on hot summer days!`,
    `${name} is always ready for a spontaneous adventure or park visit.`,
  ],
  // 10: MY MOST EMBARRASSING MOMENT
  (name, species) => [
    `Running full speed toward a reflection of another pet in a full-length mirror!`,
    `Snoozing so hard that I snored loudly during my human's important Zoom call.`,
    `Chasing a laser pointer and slipping gently onto a smooth wooden floor.`,
    `Getting my snout stuck in a cozy cereal box while trying to lick the last crumb!`,
    `Barking fiercely at a coat hanger on the door thinking it was an intruder.`,
    `Missing the couch jump by an inch and acting like I totally meant to land on the rug.`,
    `Getting startled by my own tail wagging against a paper bag!`,
    `Trying to catch a fly in mid-air and doing a dramatic somersault onto the pillow.`,
    `Tripping over my own floppy ears while showing off at the dog park.`,
    `Waking up from a dream with a sudden "boof" and looking around bewildered!`,
  ],
  // 11: A FUN FACT ABOUT ME
  (name, species) => [
    `${name} has a special happy dance where paws tap-dance on the kitchen tiles before mealtime!`,
    `${name} knows over 15 distinct trick commands including 'high-five' and 'roll over'!`,
    `${name} can tell the difference between the sound of the treat jar and regular jars.`,
    `${name} loves watching nature shows with birds and squirrels on the big TV screen.`,
    `${name} tilts head left and right whenever you ask a question in a high voice!`,
    `${name} carries a favorite plush toy to bed every single night without fail.`,
    `${name} has a heart-shaped patch on the fur that everyone admires!`,
    `${name} purrs/wags loudly whenever someone says the magic word "WALK"!`,
    `${name} loves eating icy ice-cubes on warm summer afternoons.`,
    `${name} is a rescue pet who went from timid shelter pup to confident park superstar!`,
  ],
  // 12: MY GO-TO SNACK
  (name, species) => [
    `Organic peanut butter licks, crunchy apple slices, and freeze-dried beef liver!`,
    `Single-ingredient chicken jerky strips and tiny cheese cubes!`,
    `Crisp blueberry rewards after completing a successful trick routine.`,
    `Dehydrated salmon skin bites that make my fur extra soft and shiny!`,
    `Homemade pumpkin biscuits baked with love and whole oats.`,
    `Crunchy watermelon cubes straight out of the fridge on hot days!`,
    `Sweet potato chews that keep my jaws busy for a good 20 minutes.`,
    `Creamy Greek yogurt drops with a touch of honey.`,
    `Carrot sticks that crunch loudly with every bite!`,
    `Tiny bacon-flavored training treats that make me do flips!`,
  ],
  // 13: IDEAL PLAYDATE SCENARIO
  (name, species) => [
    `A fenced grassy park with agility tunnels, tennis balls, and a friendly buddy!`,
    `A quiet backyard hangout with shade, fresh water bowls, and gentle play.`,
    `A scenic lakeside stroll followed by a doggy ice-cream treat at the café.`,
    `An indoor living room play session with plush toys and soft carpet zoomies.`,
    `A group trail walk where everyone sniffs interesting scents together!`,
    `A beach day where we dig holes in the sand and chase gentle waves.`,
    `A patio brunch where pets relax under the table while humans chat!`,
    `Playing fetch in pairs and taking synchronized water breaks.`,
    `A cozy living room nap session after 30 minutes of energetic tag!`,
    `Exploring a brand new pet park with obstacle courses and climbing ramps.`,
  ],
  // 14: MY LIFE MOTTO
  (name, species) => [
    `"Work hard, nap harder, and never turn down a belly rub!"`,
    `"Life is short — chew the toy, chase the ball, and love unconditionally."`,
    `"Every walk is an adventure waiting to happen!"`,
    `"Keep your tail wagging, your ears alert, and your heart open."`,
    `"Stay curious, sniff everything, and leave a little sparkle wherever you go."`,
    `"Eat well, play passionately, and nap in the sun whenever possible."`,
    `"A day without zoomies is a day wasted!"`,
    `"Be the reason someone smiles today — or wags their tail!"`,
    `"Loyalty, love, and endless tennis balls."`,
    `"Live in the moment, forgive quickly, and love fiercely."`,
  ]
];

function generate500Prompts() {
  const generated = [];
  let count = 0;

  // Loop systematically to create 500 distinct prompts
  for (let qIdx = 0; qIdx < questions.length; qIdx++) {
    const questionText = questions[qIdx];
    const categoryText = categories[qIdx % categories.length];
    const getTemplates = templateGenerators[qIdx % templateGenerators.length];

    for (let specIdx = 0; specIdx < speciesList.length; specIdx++) {
      const species = speciesList[specIdx];

      for (let tempIdx = 0; tempIdx < temperaments.length; tempIdx++) {
        if (count >= 500) break;

        const temp = temperaments[tempIdx];
        const mood = moods[(tempIdx + qIdx + specIdx) % moods.length];
        const templates = getTemplates('{name}', species);
        const templateStr = templates[(tempIdx + specIdx) % templates.length];

        generated.push({
          question: questionText,
          answerTemplate: templateStr,
          temperament: temp,
          mood: mood,
          category: categoryText,
          species: species,
          isActive: true,
        });

        count++;
      }
      if (count >= 500) break;
    }
    if (count >= 500) break;
  }

  // Fill remaining up to 500 if loop finished early
  while (generated.length < 500) {
    const idx = generated.length;
    const qText = questions[idx % questions.length];
    const catText = categories[idx % categories.length];
    const getT = templateGenerators[idx % templateGenerators.length];
    const spec = speciesList[idx % speciesList.length];
    const temp = temperaments[idx % temperaments.length];
    const mood = moods[idx % moods.length];
    const tList = getT('{name}', spec);
    const ans = tList[idx % tList.length];

    generated.push({
      question: qText,
      answerTemplate: ans,
      temperament: temp,
      mood: mood,
      category: catText,
      species: spec,
      isActive: true,
    });
  }

  return generated;
}

async function seedPrompts() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('Connected successfully!');

    console.log('Clearing existing pet prompts...');
    await PetPrompt.deleteMany({});

    console.log('Generating 500 curated pet prompts & fun facts...');
    const promptsToSeed = generate500Prompts();

    console.log(`Seeding ${promptsToSeed.length} pet prompts into MongoDB...`);
    const inserted = await PetPrompt.insertMany(promptsToSeed);

    console.log(`✅ Success! Successfully seeded ${inserted.length} pet prompts.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding pet prompts:', error);
    process.exit(1);
  }
}

seedPrompts();

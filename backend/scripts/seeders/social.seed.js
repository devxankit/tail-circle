import { Post, PostComment, MatchProfile } from '../../src/modules/social/social.models.js';

/**
 * Canonical holder of the social mock data — `communityData.js` and
 * `mockProfiles.js` records verbatim (files deleted after wiring).
 * Profiles that were `online: true` in the mock auto-like-back so a
 * right-swipe produces a real match + conversation.
 */
const MOCK_POSTS = [
  { id: 1, author: 'Sarah M.', category: 'Advice', location: 'Indore, MP', content: 'Has anyone tried the new organic beef treats from the TailShop? Max is usually a picky eater but I want to give it a try.', image: null, likes: 24, comments: 2 },
  { id: 2, author: 'David & Luna', category: 'Funny', location: 'Bangalore, KA', content: 'Luna refuses to walk in the rain. She just sits there and judges me. 🐕🌧️', image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80', likes: 156, comments: 2 },
  { id: 3, author: 'Mike P.', category: 'Funny', location: 'Mumbai, MH', content: 'Bought him a ₹50 bed, but the Amazon box is clearly the superior choice. 📦🐈', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80', likes: 342, comments: 1 },
  { id: 4, author: 'Dr. Emily', category: 'Health', location: 'Delhi NCR', content: 'Friendly reminder to check your pets for ticks after walking in tall grass! Summer is peak tick season. Always use preventative care.', image: null, likes: 89, comments: 1 },
  { id: 5, author: 'Alex J.', category: 'Lost & Found', location: 'Central Park, Mumbai', content: 'FOUND: Golden Retriever near Central Park. Very friendly, wearing a red collar but no tag. Currently safe at my place. Please share to find the owner!', image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80', likes: 520, comments: 2 },
  { id: 6, author: 'Jessica W.', category: 'Funny', location: 'Pune, MH', content: 'The face he makes when I say the word "V-E-T". He knows exactly what it spells. 😂', image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80', likes: 215, comments: 1 },
  { id: 7, author: 'Tom H.', category: 'Advice', location: 'Hyderabad, TS', content: 'What are the best puzzle toys for high-energy puppies? My lab is chewing everything in sight.', image: null, likes: 45, comments: 1 },
  { id: 8, author: 'Healthy Paws Clinic', category: 'Health', location: 'Indore, MP', content: 'Did you know that dogs need their teeth brushed too? Dental disease can lead to serious health issues. Start slow with pet-safe toothpaste! 🪥', image: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=600&q=80', likes: 134, comments: 1 },
];

const MOCK_COMMENTS = {
  1: [
    { authorName: 'Rohan K.', text: 'My lab loves them! Great quality and super crunch.' },
    { authorName: 'Priya S.', text: 'Try mixing it with a bit of warm water or broth.' },
  ],
  2: [
    { authorName: 'Ankit A.', text: 'Haha classic husky behavior! Mine does the exact same.' },
    { authorName: 'Neha M.', text: 'Get her a cute yellow raincoat! Works like magic.' },
  ],
  5: [
    { authorName: 'Karan G.', text: 'Shared with local Mumbai pet parent groups!' },
    { authorName: 'Rahul V.', text: 'Hope the owner is found soon!' },
  ],
};

const MOCK_PROFILES = [
  { id: 1, name: 'Luna', type: 'Dog', gender: 'Female', age: 2, distance: 4, breed: 'Siberian Husky', size: 'Large', vaccinationStatus: 'Vaccinated', neutered: 'Yes', activityLevel: 'High', temperament: ['Playful', 'Active', 'Friendly'], compatibility: ['Good With Dogs', 'Good With Families'], purpose: 'Playdate', availability: 'Available This Week', img: '/generated_matches/husky_1_1782415091249.png', photos: ['/generated_matches/husky_1_1782415091249.png', '/generated_matches/husky_2_1782415105031.png', '/generated_matches/husky_3_1782415115081.png', '/generated_matches/husky_4_1782415125938.png'], prompts: [{ question: 'A shower thought I recently had', answer: 'If I fetch the stick, why does the human throw it again?' }, { question: 'My simple pleasures', answer: 'Belly rubs, squeaky toys, and chasing the mailman.' }], tags: ['Vaccinated', 'High Energy', 'Talkative'], online: true },
  { id: 2, name: 'Charlie', type: 'Dog', gender: 'Male', age: 3, distance: 2, breed: 'Golden Retriever', size: 'Large', vaccinationStatus: 'Vaccinated', neutered: 'Yes', activityLevel: 'Medium', temperament: ['Friendly', 'Social', 'Calm'], compatibility: ['Good With Kids', 'Good With Cats', 'Good With Families', 'Good With Dogs'], purpose: 'Walking Partner', availability: 'Available Anytime', img: '/generated_matches/golden_1_1782415137857.png', photos: ['/generated_matches/golden_1_1782415137857.png', '/generated_matches/golden_2_1782415151368.png', '/generated_matches/golden_3_1782415163632.png', '/generated_matches/golden_4_1782415176558.png'], prompts: [{ question: 'First round is on me if', answer: 'You can throw the ball further than 50 feet.' }, { question: 'Green flags I look for', answer: 'Always carries extra treats in their pocket.' }], tags: ['Friendly', 'Loves Water', 'Good Boy'], online: true },
  { id: 3, name: 'Bella', type: 'Dog', gender: 'Female', age: 1.5, distance: 8, breed: 'French Bulldog', size: 'Small', vaccinationStatus: 'Vaccinated', neutered: 'No', activityLevel: 'Low', temperament: ['Calm', 'Stubborn', 'Affectionate'], compatibility: ['Good With Cats', 'Good With Families'], purpose: 'Playdate', availability: 'Available This Week', img: '/generated_matches/frenchie_1_1782415187736.png', photos: ['/generated_matches/frenchie_1_1782415187736.png', '/generated_matches/frenchie_2_1782415199335.png', '/generated_matches/frenchie_3_1782415212282.png', '/generated_matches/frenchie_4_1782415223508.png'], prompts: [{ question: 'I recently discovered that', answer: 'I can sleep 16 hours a day and still be tired.' }, { question: 'My most irrational fear', answer: 'The vacuum cleaner. It is definitely evil.' }], tags: ['Couch Potato', 'Snorter'], online: false },
  { id: 4, name: 'Max', type: 'Dog', gender: 'Male', age: 4, distance: 12, breed: 'German Shepherd', size: 'Large', vaccinationStatus: 'Vaccinated', neutered: 'Yes', activityLevel: 'High', temperament: ['Protective', 'Active', 'Loyal'], compatibility: ['Good With Families', 'Good With Kids'], purpose: 'Training Partner', availability: 'Available Anytime', img: '/generated_matches/gsd_1_1782415235093.png', photos: ['/generated_matches/gsd_1_1782415235093.png', '/generated_matches/gsd_2_1782415248583.png', '/generated_matches/gsd_3_1782415260246.png', '/generated_matches/gsd_1_1782415235093.png'], prompts: [{ question: 'Dating me is like', answer: 'Having a shadow that constantly asks for treats.' }, { question: 'I am looking for', answer: 'Someone to share my zoomies with at 3 AM.' }], tags: ['Protective', 'Trained', 'Loyal'], online: true },
  { id: 5, name: 'Duke', type: 'Dog', gender: 'Male', age: 2.5, distance: 1, breed: 'Golden Retriever', size: 'Large', vaccinationStatus: 'Vaccinated', neutered: 'No', activityLevel: 'High', temperament: ['Smart', 'Friendly', 'Energetic'], compatibility: ['Good With Kids', 'Good With Dogs'], purpose: 'Playdate', availability: 'Available Today', img: '/generated_matches/golden_4_1782415176558.png', photos: ['/generated_matches/golden_4_1782415176558.png', '/generated_matches/golden_3_1782415163632.png', '/generated_matches/golden_2_1782415151368.png', '/generated_matches/golden_1_1782415137857.png'], prompts: [{ question: 'My simple pleasures', answer: 'Swimming in mud puddles and ignoring commands.' }, { question: 'Dating me is like', answer: 'Always having a hyperactive friend.' }], tags: ['Water Dog', 'Big Heart', 'Goofy'], online: true },
];

export async function seedSocial() {
  for (const p of MOCK_POSTS) {
    const post = await Post.findOneAndUpdate(
      { legacyId: p.id },
      {
        $set: {
          legacyId: p.id,
          authorName: p.author,
          category: p.category,
          location: p.location,
          content: p.content,
          image: p.image,
          status: 'visible',
        },
        $setOnInsert: { likesCount: p.likes, commentsCount: p.comments },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const comments = MOCK_COMMENTS[p.id];
    if (comments && comments.length > 0) {
      for (const c of comments) {
        await PostComment.updateOne(
          { postId: post._id, authorName: c.authorName, text: c.text },
          { $setOnInsert: { postId: post._id, authorName: c.authorName, text: c.text } },
          { upsert: true }
        );
      }
    }
  }

  for (const m of MOCK_PROFILES) {
    await MatchProfile.updateOne(
      { legacyId: m.id },
      {
        $set: {
          legacyId: m.id, name: m.name, type: m.type, gender: m.gender, age: m.age,
          distance: m.distance, breed: m.breed, size: m.size,
          vaccinationStatus: m.vaccinationStatus, neutered: m.neutered,
          activityLevel: m.activityLevel, temperament: m.temperament,
          compatibility: m.compatibility, purpose: m.purpose, availability: m.availability,
          img: m.img, photos: m.photos, prompts: m.prompts, tags: m.tags,
          online: true, autoLikesBack: true, active: true,
        },
      },
      { upsert: true }
    );
  }

  return `${MOCK_POSTS.length} posts, ${MOCK_PROFILES.length} match profiles upserted`;
}

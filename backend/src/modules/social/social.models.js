import mongoose from 'mongoose';

/**
 * Social domain: community feed, match profiles/swipes, chat registry and
 * stories. Display fields mirror `communityData.js` / `mockProfiles.js`.
 */

const postSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, required: true }, // display name (seeds have no user)
    authorAvatar: { type: String, default: null },
    location: { type: String, trim: true, default: null },
    category: { type: String, default: 'Advice', index: true },
    content: { type: String, required: true, maxlength: 2000 },
    image: { type: String, default: null },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    status: { type: String, enum: ['visible', 'hidden', 'reported'], default: 'visible' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
postSchema.index({ status: 1, createdAt: -1 });
export const Post = mongoose.model('Post', postSchema);

const postLikeSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
export const PostLike = mongoose.model('PostLike', postLikeSchema);

const postCommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, default: '' },
    authorAvatar: { type: String, default: null },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);
export const PostComment = mongoose.model('PostComment', postCommentSchema);

const postReportSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);
postReportSchema.index({ postId: 1, userId: 1 }, { unique: true });
export const PostReport = mongoose.model('PostReport', postReportSchema);

/**
 * Swipe-deck profiles. Seeded from `mockProfiles.js`; `autoLikesBack` powers
 * demo reciprocity (profiles marked online in the mock like you back, so a
 * right-swipe produces a real match + conversation). Real pet-owned profiles
 * (petId/ownerId) join the deck when users opt their pets in.
 */
const matchProfileSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    type: { type: String, default: 'Dog' },
    gender: { type: String, default: '' },
    age: { type: Number, default: null },
    distance: { type: Number, default: null },
    breed: { type: String, default: '' },
    size: { type: String, default: '' },
    vaccinationStatus: { type: String, default: '' },
    neutered: { type: String, default: '' },
    activityLevel: { type: String, default: '' },
    temperament: { type: [String], default: [] },
    compatibility: { type: [String], default: [] },
    purpose: { type: String, default: '' },
    availability: { type: String, default: '' },
    img: { type: String, default: '' },
    photos: { type: [String], default: [] },
    prompts: { type: [{ _id: false, question: String, answer: String }], default: [] },
    tags: { type: [String], default: [] },
    online: { type: Boolean, default: false },
    autoLikesBack: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const MatchProfile = mongoose.model('MatchProfile', matchProfileSchema);

/** "Report {name}" on a swipe-deck profile. */
const profileReportSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MatchProfile', required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);
export const ProfileReport = mongoose.model('ProfileReport', profileReportSchema);

const swipeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MatchProfile', required: true },
    action: { type: String, enum: ['like', 'pass', 'superlike'], required: true },
  },
  { timestamps: true }
);
swipeSchema.index({ userId: 1, profileId: 1 }, { unique: true });
export const Swipe = mongoose.model('Swipe', swipeSchema);

const matchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MatchProfile', required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
    matchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
matchSchema.index({ userId: 1, profileId: 1 }, { unique: true });
export const Match = mongoose.model('Match', matchSchema);

/**
 * Chat registry (MongoDB = source of truth; Firebase RTDB = live layer).
 * `counterpart` renders the header for conversations whose other side is a
 * seeded profile or shelter rather than a second real account.
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    context: {
      type: String,
      enum: ['match', 'adoption', 'support', 'vendor'],
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null }, // profile / listing
    counterpart: {
      name: { type: String, default: '' },
      image: { type: String, default: '' },
      subtitle: { type: String, default: '' },
    },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    unread: { type: Map, of: Number, default: {} },
    // Real backing for the chat header's Mute/Clear/Block menu — no more
    // buttons that just close the menu and touch nothing.
    mutedBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    blockedBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    clearedAt: { type: Map, of: Date, default: {} }, // per-user "clear chat for me"
  },
  { timestamps: true }
);
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
export const Conversation = mongoose.model('Conversation', conversationSchema);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'location'], default: 'text' },
    text: { type: String, default: '', maxlength: 2000 },
    mediaUrl: { type: String, default: null },
    // Real coordinates for type 'location' — from navigator.geolocation, not
    // a fixed "Central Park Dog Run" string.
    meta: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);
messageSchema.index({ conversationId: 1, createdAt: 1 });
export const Message = mongoose.model('Message', messageSchema);

/** "Report / Block" from the chat header — same shape as PostReport. */
const chatReportSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);
export const ChatReport = mongoose.model('ChatReport', chatReportSchema);

const storySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: '' },
    mediaUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Story = mongoose.model('Story', storySchema);

/** One row per (story, viewer) — powers the real "Viewed By" list/count. */
const storyViewSchema = new mongoose.Schema(
  {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewerName: { type: String, default: '' },
    viewerAvatar: { type: String, default: null },
  },
  { timestamps: true }
);
storyViewSchema.index({ storyId: 1, viewerId: 1 }, { unique: true });
export const StoryView = mongoose.model('StoryView', storyViewSchema);

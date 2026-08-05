import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { invalidate, cacheResponse } from '../../services/cache.service.js';
import { Post, PostLike, PostComment, PostReport } from './social.models.js';

const router = Router();

/** GET /community/posts?category= — public feed (brief cache). */
router.get(
  '/posts',
  cacheResponse('community', 30),
  asyncHandler(async (req, res) => {
    const filter = { status: 'visible', deletedAt: null };
    if (req.query.category && req.query.category !== 'All') filter.category = req.query.category;
    const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(100);
    sendSuccess(res, { data: posts });
  })
);

router.use(authenticate);

/** GET /community/posts/mine/likes — post ids the user liked (heart states). */
router.get(
  '/posts/mine/likes',
  asyncHandler(async (req, res) => {
    const likes = await PostLike.find({ userId: req.user.id }).distinct('postId');
    sendSuccess(res, { data: likes });
  })
);

/** GET /community/posts/mine — current user's published posts. */
router.get(
  '/posts/mine',
  asyncHandler(async (req, res) => {
    const posts = await Post.find({
      $or: [{ authorId: req.user.id }, { authorName: req.user.name }],
      deletedAt: null,
    }).sort({ createdAt: -1 });
    sendSuccess(res, { data: posts });
  })
);

/** POST /community/posts */
router.post(
  '/posts',
  validate(
    z.object({
      content: z.string().trim().min(1).max(2000),
      category: z.string().trim().max(30).default('Advice'),
      location: z.string().trim().max(100).nullable().optional(),
      image: z.string().max(2_000_000).nullable().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const post = await Post.create({
      ...req.body,
      authorId: req.user.id,
      authorName: req.user.name || (req.user.phone ? `User (${req.user.phone.slice(-4)})` : 'User'),
      authorAvatar: req.user.avatarUrl || null,
    });
    await invalidate('community:*');
    sendSuccess(res, { statusCode: 201, message: 'Post published', data: post });
  })
);

/** DELETE /community/posts/:id — delete own post. */
router.delete(
  '/posts/:id',
  asyncHandler(async (req, res) => {
    const result = await Post.updateOne(
      { _id: req.params.id, authorId: req.user.id },
      { $set: { deletedAt: new Date() } }
    );
    if (result.matchedCount === 0) throw ApiError.forbidden('Not authorized to delete this post');
    await invalidate('community:*');
    sendSuccess(res, { message: 'Post deleted' });
  })
);

/** POST /community/posts/:id/like — toggle. */
router.post(
  '/posts/:id/like',
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, status: 'visible' });
    if (!post) throw ApiError.notFound('Post not found');

    const existing = await PostLike.findOne({ postId: post.id, userId: req.user.id });
    let liked;
    if (existing) {
      await PostLike.deleteOne({ _id: existing.id });
      await Post.updateOne({ _id: post.id }, { $inc: { likesCount: -1 } });
      liked = false;
    } else {
      await PostLike.create({ postId: post.id, userId: req.user.id });
      await Post.updateOne({ _id: post.id }, { $inc: { likesCount: 1 } });
      liked = true;
    }
    await invalidate('community:*');
    const fresh = await Post.findById(post.id);
    sendSuccess(res, { data: { liked, likesCount: fresh.likesCount } });
  })
);

/** GET /community/posts/:id/comments */
router.get(
  '/posts/:id/comments',
  asyncHandler(async (req, res) => {
    const comments = await PostComment.find({ postId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(200);
    sendSuccess(res, { data: comments });
  })
);

/** POST /community/posts/:id/comments */
router.post(
  '/posts/:id/comments',
  validate(z.object({ text: z.string().trim().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, status: 'visible' });
    if (!post) throw ApiError.notFound('Post not found');
    const comment = await PostComment.create({
      postId: post.id,
      userId: req.user.id,
      authorName: req.user.name || (req.user.phone ? `User (${req.user.phone.slice(-4)})` : 'User'),
      authorAvatar: req.user.avatarUrl || null,
      text: req.body.text,
    });
    await Post.updateOne({ _id: post.id }, { $inc: { commentsCount: 1 } });
    await invalidate('community:*');
    sendSuccess(res, { statusCode: 201, data: comment });
  })
);

/** POST /community/posts/:id/report — auto-hide after 5 reports. */
router.post(
  '/posts/:id/report',
  validate(z.object({ reason: z.string().trim().max(300).default('') })),
  asyncHandler(async (req, res) => {
    await PostReport.updateOne(
      { postId: req.params.id, userId: req.user.id },
      { $set: { reason: req.body.reason } },
      { upsert: true }
    );
    const reports = await PostReport.countDocuments({ postId: req.params.id });
    if (reports >= 5) {
      await Post.updateOne({ _id: req.params.id }, { $set: { status: 'reported' } });
      await invalidate('community:*');
    }
    sendSuccess(res, { message: 'Report received' });
  })
);

export default router;

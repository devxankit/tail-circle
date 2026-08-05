import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Heart, MessageCircle, MapPin, Trash2, Loader2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchMyPosts, deletePost } from '../../../../../services/social';
import { getStoredUser } from '../../../../../services/auth';

export function MyPosts() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyPosts();
      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setDeletingId(postId);
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err.message || 'Could not delete post');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-right-4 duration-300">
      {/* Top Header */}
      <div className="bg-white px-4 pt-6 pb-4 flex items-center justify-between shadow-sm border-b border-border-light z-10 sticky top-0">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-text-primary ml-2">My Posts</h1>
        </div>
        <button
          onClick={() => navigate('/app/community/create')}
          className="flex items-center gap-1 bg-primary-main text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-primary-dark active:scale-95 transition-all"
        >
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-16 text-primary-main">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-primary-main/10 rounded-full flex items-center justify-center mb-3">
              <FileText size={32} className="text-primary-main" />
            </div>
            <p className="font-bold text-text-primary text-base">No posts published yet</p>
            <p className="text-sm text-text-secondary mt-1 max-w-[260px] leading-relaxed">
              Share advice, funny pet moments, or ask questions to the TailCircle pet community!
            </p>
            <button
              onClick={() => navigate('/app/community/create')}
              className="mt-5 bg-primary-main text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-primary-dark transition-all active:scale-95"
            >
              Create Your First Post
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-1 mb-1">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Published ({posts.length})
              </span>
            </div>

            {posts.map((post) => (
              <div key={post.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-border-light flex flex-col gap-3 relative">
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center bg-primary-light/20">
                      {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt={post.author} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-primary-main to-teal-400 text-white font-extrabold flex items-center justify-center text-sm uppercase">
                          {currentUser?.name ? currentUser.name[0] : (post.author ? post.author[0] : 'U')}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-primary-main/10 text-primary-dark">
                          {post.category}
                        </span>
                        <span className="text-xs text-text-secondary">{post.time}</span>
                      </div>
                      {post.location && (
                        <span className="text-xs font-semibold text-primary-dark flex items-center gap-0.5 mt-0.5">
                          <MapPin size={11} /> {post.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="p-2 text-text-disabled hover:text-error hover:bg-error/10 rounded-full transition-colors shrink-0"
                    title="Delete post"
                  >
                    {deletingId === post.id ? (
                      <Loader2 size={18} className="animate-spin text-error" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>

                {/* Content */}
                <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>

                {/* Attached Image */}
                {post.image && (
                  <div className="w-full h-48 rounded-[16px] overflow-hidden border border-border-light/50">
                    <img src={post.image} alt="Post attachment" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-5 pt-2 border-t border-border-light/60 text-xs font-semibold text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Heart size={16} className="text-error fill-error/20" /> {post.likes} Likes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={16} className="text-primary-main" /> {post.comments} Comments
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

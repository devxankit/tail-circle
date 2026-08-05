import React, { useState, useEffect } from 'react';
import { Search, Plus, Heart, MessageCircle, Share2, MoreHorizontal, Send, Bookmark, MapPin, Flag, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { fetchPosts, toggleLike, fetchComments, addComment as addCommentApi, reportPost, deletePost } from '../../../../services/social';
import { getStoredUser } from '../../../../services/auth';
import { api } from '../../../../services/api';

export function Community() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [activeTab, setActiveTab] = useState('All');
  const tabs = ['All', 'Advice', 'Funny', 'Health', 'Lost & Found'];

  const [posts, setPosts] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({}); // { [postId]: commentsArray }
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  const [animatingPostId, setAnimatingPostId] = useState(null);
  const [bookmarkedPosts, setBookmarkedPosts] = useState({});
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load feed and saved items on mount
  useEffect(() => {
    Promise.all([
      fetchPosts(),
      api.get('/saved-items').then((r) => r.data).catch(() => []),
    ])
      .then(([fetchedPosts, savedItems]) => {
        setPosts(fetchedPosts);
        const savedMap = {};
        savedItems.forEach((s) => {
          savedMap[s.targetId] = true;
        });
        setBookmarkedPosts(savedMap);
      })
      .catch(() => setPosts([]))
      .finally(() => setIsLoadingFeed(false));
  }, []);

  // Handle Bookmarks (persisted to backend SavedItems)
  const handleBookmark = async (postId) => {
    const isCurrentlySaved = !!bookmarkedPosts[postId];
    setBookmarkedPosts((prev) => ({ ...prev, [postId]: !isCurrentlySaved }));

    try {
      if (isCurrentlySaved) {
        await api.delete('/saved-items', {
          data: { targetType: 'product', targetId: postId },
        });
      } else {
        await api.post('/saved-items', {
          targetType: 'product',
          targetId: postId,
        });
      }
    } catch {
      // Revert if API fails
      setBookmarkedPosts((prev) => ({ ...prev, [postId]: isCurrentlySaved }));
    }
  };

  // Handle Likes
  const handleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
    toggleLike(postId)
      .then(({ liked, likesCount }) =>
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isLiked: liked, likes: likesCount } : p)))
      )
      .catch(() => {});
  };

  const handleDoubleTapLike = (post) => {
    if (!post.isLiked) {
      handleLike(post.id);
    }
    setAnimatingPostId(post.id);
    setTimeout(() => {
      setAnimatingPostId(null);
    }, 1000);
  };

  const handleShare = async (post) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author}`,
          text: post.content,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch {
        alert('Could not copy the link — please copy it from the address bar.');
      }
    } else {
      alert('Sharing is not supported on this device.');
    }
  };

  // Open / toggle comments for a post & fetch live comments from backend
  const handleToggleComments = async (postId) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      return;
    }
    setActiveCommentPostId(postId);
    setCommentInput('');

    if (!commentsMap[postId]) {
      setLoadingCommentsPostId(postId);
      try {
        const list = await fetchComments(postId);
        setCommentsMap((prev) => ({ ...prev, [postId]: list }));
      } catch {
        setCommentsMap((prev) => ({ ...prev, [postId]: [] }));
      } finally {
        setLoadingCommentsPostId(null);
      }
    }
  };

  // Add Comment to backend
  const handleAddComment = async (postId) => {
    if (!commentInput.trim()) return;
    const text = commentInput.trim();
    setCommentInput('');

    const tempComment = {
      id: `temp_${Date.now()}`,
      author: currentUser?.name || 'You',
      text,
      time: 'Just now',
    };

    // Optimistic update
    setCommentsMap((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), tempComment],
    }));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p)));

    try {
      await addCommentApi(postId, text);
      const freshComments = await fetchComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: freshComments }));
    } catch {
      /* keep optimistic comment */
    }
  };

  // Report Post
  const handleReportPost = async (postId) => {
    setActiveMenuPostId(null);
    try {
      await reportPost(postId, 'Inappropriate content');
      alert('Thank you. The post has been reported.');
    } catch (err) {
      alert(err.message || 'Report failed');
    }
  };

  // Delete Post (Author only)
  const handleDeletePost = async (postId) => {
    setActiveMenuPostId(null);
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err.message || 'Could not delete post');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="bg-white border-b border-border-light sticky top-0 z-10 pt-4 pb-2">
        <div className="flex justify-between items-center px-4 mb-3 h-10">
          {!isSearchOpen ? (
            <>
              <h1 className="text-xl font-bold text-text-primary">Community</h1>
              <div className="flex gap-4 items-center">
                <button onClick={() => setIsSearchOpen(true)} className="text-text-secondary hover:text-text-primary active:scale-95 transition-transform"><Search size={24} /></button>
                <button 
                  onClick={() => navigate('/app/community/create')}
                  className="text-primary-main hover:text-primary-dark active:scale-95 transition-transform"
                  title="Create Post"
                >
                  <Plus size={28} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex w-full items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300 h-full">
              <div className="flex-1 bg-bg-secondary flex items-center rounded-full px-3 py-2 border border-border-light shadow-inner">
                <Search size={18} className="text-text-secondary mr-2 shrink-0" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search posts or authors..." 
                  className="bg-transparent border-none outline-none w-full text-sm font-medium text-text-primary placeholder:font-normal placeholder:text-text-secondary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} 
                className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {/* Horizontal Tabs */}
        {!isSearchOpen && (
          <div className="flex overflow-x-auto hide-scrollbar px-4 gap-2 pb-2 animate-in fade-in duration-300">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                  activeTab === tab 
                    ? "bg-text-primary text-white border-text-primary" 
                    : "bg-white text-text-secondary border-border-light hover:bg-bg-secondary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="flex flex-col flex-1 overflow-y-auto hide-scrollbar">
        {isLoadingFeed ? (
          <div className="flex justify-center py-16 text-primary-main">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          posts.filter(post => 
            (activeTab === 'All' || post.category === activeTab) &&
            (post.content.toLowerCase().includes(searchQuery.toLowerCase()) || post.author.toLowerCase().includes(searchQuery.toLowerCase()))
          ).map(post => {
            const isMyPost = currentUser && (post.authorId === currentUser._id || post.author === currentUser.name);

            return (
              <div key={post.id} className="bg-white p-4 mb-2 shadow-sm animate-in fade-in duration-300 relative">
                {/* Post Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center bg-primary-light/20">
                      {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt={post.author} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-primary-main to-teal-400 text-white font-extrabold flex items-center justify-center text-sm uppercase">
                          {post.author ? post.author[0] : 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text-primary">
                        {post.author} <span className="text-text-secondary font-normal ml-1">in {post.category}</span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                        <span>{post.time}</span>
                        {post.location && (
                          <span className="font-semibold text-primary-dark flex items-center gap-0.5">
                            <MapPin size={11} /> {post.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Options Menu Toggle */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuPostId((prev) => (prev === post.id ? null : post.id))}
                      className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-bg-secondary"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {/* Options Popup Dropdown */}
                    {activeMenuPostId === post.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setActiveMenuPostId(null)} />
                        <div className="absolute right-0 top-8 bg-white border border-border-light shadow-xl rounded-2xl py-1 z-30 w-36 overflow-hidden animate-in fade-in zoom-in-95">
                          <button
                            onClick={() => handleReportPost(post.id)}
                            className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Flag size={14} className="text-amber-500" /> Report Post
                          </button>
                          {isMyPost && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 flex items-center gap-2 border-t border-slate-100"
                            >
                              <Trash2 size={14} /> Delete Post
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <p className="text-text-primary text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
                
                {post.image && (
                  <div 
                    className="w-full h-64 rounded-xl overflow-hidden mb-3 border border-border-light/50 relative cursor-pointer"
                    onDoubleClick={() => handleDoubleTapLike(post)}
                  >
                    <img src={post.image} alt="Post" className="w-full h-full object-cover select-none pointer-events-none" />
                    
                    {/* Heart Animation */}
                    {animatingPostId === post.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-10">
                        <Heart 
                          size={100} 
                          className="text-white fill-white drop-shadow-2xl animate-in zoom-in-0 fade-in duration-300 fill-mode-forwards opacity-90"
                          style={{ animation: 'bounce-and-fade 1s ease-in-out forwards' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex justify-between items-center pt-3 border-t border-border-light">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors", post.isLiked ? "text-error" : "text-text-secondary hover:text-text-primary")}
                    >
                      <Heart size={20} className={cn("transition-transform active:scale-75", post.isLiked ? "fill-error" : "")} />
                      <span>{post.likes}</span>
                    </button>
                    <button 
                      onClick={() => handleToggleComments(post.id)}
                      className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors", activeCommentPostId === post.id ? "text-primary-main" : "text-text-secondary hover:text-text-primary")}
                    >
                      <MessageCircle size={20} className={activeCommentPostId === post.id ? "fill-primary-main/20" : ""} />
                      <span>{post.comments}</span>
                    </button>
                    <button 
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors active:scale-95"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>

                  <button 
                    onClick={() => handleBookmark(post.id)}
                    className={cn("text-text-secondary hover:text-text-primary transition-colors active:scale-95", bookmarkedPosts[post.id] ? "text-primary-main" : "")}
                    title="Save post"
                  >
                    <Bookmark size={20} className={bookmarkedPosts[post.id] ? "fill-primary-main" : ""} />
                  </button>
                </div>

                {/* Comments Section */}
                {activeCommentPostId === post.id && (
                  <div className="mt-4 pt-4 border-t border-border-light border-dashed animate-in fade-in slide-in-from-top-2">
                    {loadingCommentsPostId === post.id ? (
                      <div className="flex justify-center py-4 text-primary-main">
                        <Loader2 size={20} className="animate-spin" />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5 mb-4 max-h-56 overflow-y-auto hide-scrollbar">
                        {(!commentsMap[post.id] || commentsMap[post.id].length === 0) && (
                          <div className="text-center text-xs text-text-secondary py-2 italic">Be the first to comment!</div>
                        )}
                        {commentsMap[post.id] && commentsMap[post.id].map(c => (
                          <div key={c.id} className="bg-bg-secondary p-3 rounded-2xl text-xs border border-border-light/50 flex gap-2.5 items-start">
                            <div className="w-6 h-6 rounded-full bg-primary-main/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary-main uppercase overflow-hidden mt-0.5">
                              {c.authorAvatar ? (
                                <img src={c.authorAvatar} alt={c.author} className="w-full h-full object-cover" />
                              ) : (
                                c.author ? c.author[0] : 'U'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-text-primary truncate">{c.author}</span>
                                {c.time && <span className="text-[10px] text-text-disabled shrink-0">{c.time}</span>}
                              </div>
                              <p className="text-text-secondary leading-relaxed">{c.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-main/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary-main/20">
                        {currentUser?.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary-main text-xs font-bold uppercase">
                            {currentUser?.name ? currentUser.name[0] : 'U'}
                          </span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        className="flex-1 bg-bg-secondary border border-border-light rounded-full px-4 py-2 text-sm outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main transition-all"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyPress={(e) => { if(e.key === 'Enter') handleAddComment(post.id); }}
                        autoFocus
                      />
                      <button 
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInput.trim()}
                        className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0", commentInput.trim() ? "bg-primary-main text-white shadow-sm hover:bg-primary-dark" : "bg-bg-secondary text-text-disabled")}
                      >
                        <Send size={16} className={commentInput.trim() ? "ml-1" : ""} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {!isLoadingFeed && posts.filter(post => 
          (activeTab === 'All' || post.category === activeTab) &&
          (post.content.toLowerCase().includes(searchQuery.toLowerCase()) || post.author.toLowerCase().includes(searchQuery.toLowerCase()))
        ).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center text-text-disabled">
            <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-text-disabled" />
            </div>
            <p className="font-medium text-text-secondary mb-1">No posts found</p>
            <p className="text-sm">Try searching for something else or check a different category.</p>
          </div>
        )}
      </div>
    </div>
  );
}

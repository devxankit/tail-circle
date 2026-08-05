import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Check, AlertTriangle, ShieldAlert, Trash2, Eye, UserX, MessageSquare, Heart, ThumbsUp, ShieldCheck } from 'lucide-react';
import { fetchAdminPosts, moderateAdminPost } from '../../../../../services/admin';

export function Community() {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('flagged'); // Default to flagged for admin focus
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const initialPosts = [
    {
      id: 'P-501',
      author: 'Rohit Sharma',
      userId: 'U-9901',
      category: 'Health & Diet',
      title: 'Is this brand of puppy kibble safe?',
      content: 'I recently bought a new brand of kibble from a local vendor and my Golden Retriever puppy has been throwing up. Please avoid this brand: PetFoodCo (Lot #9910). Has anyone else faced issues?',
      likes: 24,
      commentsCount: 15,
      flagsCount: 3,
      flagReason: 'Potential Misinformation',
      flagDetails: 'Reported by vendor PetFoodCo as false defamation.',
      status: 'Flagged',
      postedAt: '29 May 2026, 12:40',
      comments: [
        { author: 'Dr. Alok', role: 'Vet', text: 'Please consult your vet immediately. Vomiting can be due to sudden diet transition as well.' },
        { author: 'Meera K', role: 'Pet Owner', text: 'My Golden also had diarrhea with that lot! Thanks for posting!' }
      ]
    },
    {
      id: 'P-502',
      author: 'Karan Malhotra',
      userId: 'U-9852',
      category: 'General',
      title: 'Adopt a stray kitten - Bangalore area!',
      content: 'Found this sweet little Calico kitten near Indira Nagar. She is extremely friendly, around 2 months old. Looking for a loving home. DM for contact details!',
      likes: 142,
      commentsCount: 8,
      flagsCount: 0,
      flagReason: '',
      flagDetails: '',
      status: 'Approved',
      postedAt: '29 May 2026, 09:15',
      comments: [
        { author: 'Siddharth M', role: 'Pet Owner', text: 'Shared in my society groups! Hope she finds a home soon.' }
      ]
    },
    {
      id: 'P-503',
      author: 'Anonymous User',
      userId: 'U-1102',
      category: 'Playdates & Training',
      title: 'DOG TRAINERS ARE A SCAM',
      content: 'All certified trainers on this app are just taking your money. None of them use humane methods. Just beat your dog or use shock collars, it works 100 times faster. Don\'t fall for their friendly positive reinforcement garbage.',
      likes: 1,
      commentsCount: 45,
      flagsCount: 18,
      flagReason: 'Inappropriate / Animal Abuse',
      flagDetails: 'Reported by multiple trainers and users for promoting animal abuse/harmful methods.',
      status: 'Flagged',
      postedAt: '28 May 2026, 21:10',
      comments: [
        { author: 'ProDog Trainer', role: 'Trainer', text: 'This is dangerous and promotes illegal abuse. Positive reinforcement is scientifically proven.' }
      ]
    },
    {
      id: 'P-504',
      author: 'Suman Sen',
      userId: 'U-7741',
      category: 'Pet Adoption',
      title: 'Free Persian Cat Grooming Kit',
      content: 'Selling unused Persian grooming brush and shampoo at a very cheap price. Oh wait, this is not the marketplace but I don\'t care. Contact me on 9988776655.',
      likes: 4,
      commentsCount: 2,
      flagsCount: 2,
      flagReason: 'Spam / Commercial Post',
      flagDetails: 'Violates forum guidelines against selling items outside the shop/marketplace.',
      status: 'Flagged',
      postedAt: '28 May 2026, 15:30',
      comments: []
    }
  ];

  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchAdminPosts().then(setPosts).catch((err) => console.error('Failed to load posts', err));
  }, []);

  const handleApprove = (id) => {
    moderateAdminPost(id, 'restore').catch((err) => console.error('Approve failed', err));
    setPosts(posts.map(p => p.id === id ? { ...p, status: 'Approved', flagsCount: 0 } : p));
    showToast('Post approved and flags cleared');
    if (selectedPost && selectedPost.id === id) {
      setSelectedPost({ ...selectedPost, status: 'Approved', flagsCount: 0 });
    }
    setIsDrawerOpen(false);
  };

  const handleDelete = (id) => {
    moderateAdminPost(id, 'delete').catch((err) => console.error('Delete failed', err));
    setPosts(posts.filter(p => p.id !== id));
    showToast('Post removed from community feed', 'info');
    setIsDrawerOpen(false);
  };

  const handleSuspendUser = (userId, authorName) => {
    showToast(`User ${authorName} (${userId}) has been suspended`, 'warning');
    setIsDrawerOpen(false);
  };

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'flagged') {
      return p.status === 'Flagged';
    }
    return true; // Show all
  });

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             )}
             {toastMessage.type === 'info' && (
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Trash2 size={14}/></div>
             )}
             {toastMessage.type === 'warning' && (
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><UserX size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Community Forum Moderation</h1>
        <p className="text-[13px] text-gray-500 mt-1">Review community posts, flag discussions violating guidelines, and moderate user reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Total Community Members</h3>
          <p className="text-[26px] font-bold text-gray-900">42,850</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">New Discussions Today</h3>
          <p className="text-[26px] font-bold text-[#66B4B1]">184</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Pending Flagged Posts</h3>
          <p className="text-[26px] font-bold text-rose-600">{posts.filter(p => p.status === 'Flagged').length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
          <h3 className="text-[13px] text-gray-500 font-medium">Moderator Resolution Rate</h3>
          <p className="text-[26px] font-bold text-emerald-600">98.4%</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         
         {/* Tabs */}
         <div className="border-b border-gray-200 flex items-center px-4">
            <button 
               onClick={() => setActiveTab('flagged')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'flagged' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <ShieldAlert size={18} className={posts.filter(p => p.status === 'Flagged').length > 0 ? 'text-rose-500' : 'text-gray-400'} />
               Flagged Content ({posts.filter(p => p.status === 'Flagged').length})
            </button>
            <button 
               onClick={() => setActiveTab('all')}
               className={`flex items-center gap-2 px-6 py-4 text-[14px] font-semibold transition border-b-2 ${activeTab === 'all' ? 'border-[#66B4B1] text-[#66B4B1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <MessageSquare size={18} /> All Discussions ({posts.length})
            </button>
         </div>

         {/* Filters */}
         <div className="p-4 border-b border-[#FAF7F2] flex flex-wrap items-center gap-3 bg-gray-50/50">
            <div className="relative min-w-[200px]">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="Search Post content, author..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm" />
            </div>

            <div className="flex items-center gap-2">
               <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[140px]">
                 <option>All Categories</option>
                 <option>Health & Diet</option>
                 <option>General</option>
                 <option>Playdates & Training</option>
                 <option>Pet Adoption</option>
               </select>

               {activeTab === 'flagged' && (
                 <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[150px]">
                   <option>All Flag Reasons</option>
                   <option>Potential Misinformation</option>
                   <option>Inappropriate / Abuse</option>
                   <option>Spam / Commercial</option>
                 </select>
               )}

               <button onClick={() => alert("Action triggered: Filters")} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition flex items-center gap-2">
                  <Filter size={14} /> Filters
               </button>
            </div>
         </div>

         {/* Data Table */}
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
               <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                  <tr>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Post Title</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Author</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Engagement</th>
                     {activeTab === 'flagged' ? (
                       <>
                         <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-rose-600">Flags</th>
                         <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Flag Reason</th>
                       </>
                     ) : (
                       <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                     )}
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#FAF7F2]">
                  {filteredPosts.map(p => (
                     <tr key={p.id} onClick={() => { setSelectedPost(p); setIsDrawerOpen(true); }} className="hover:bg-[#FAF7F2] transition cursor-pointer group">
                        <td className="px-5 py-4 max-w-[280px]">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-gray-900 truncate group-hover:text-[#66B4B1] transition">{p.title}</span>
                              <span className="text-[11px] text-gray-500 font-mono mt-0.5">{p.id}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-gray-800">{p.author}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{p.userId}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4">
                           <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">
                              {p.category}
                           </span>
                        </td>
                        <td className="px-5 py-4">
                           <div className="flex items-center gap-3 text-[12px] text-gray-500">
                              <span className="flex items-center gap-1"><Heart size={12}/> {p.likes}</span>
                              <span className="flex items-center gap-1"><MessageSquare size={12}/> {p.commentsCount}</span>
                           </div>
                        </td>
                        
                        {activeTab === 'flagged' ? (
                          <>
                            <td className="px-5 py-4">
                               <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[11px] font-extrabold">
                                  {p.flagsCount} reports
                               </span>
                            </td>
                            <td className="px-5 py-4">
                               <span className="text-[13px] font-medium text-rose-600 line-clamp-1">{p.flagReason}</span>
                            </td>
                          </>
                        ) : (
                          <td className="px-5 py-4">
                             <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${p.status === 'Flagged' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {p.status}
                             </span>
                          </td>
                        )}

                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                           <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setSelectedPost(p); setIsDrawerOpen(true); }} className="p-1.5 text-gray-400 hover:text-[#66B4B1] hover:bg-[#FAF7F2] rounded transition" title="Preview Discussion">
                                 <Eye size={16} />
                              </button>
                              {p.status === 'Flagged' && (
                                 <button onClick={() => handleApprove(p.id)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition" title="Approve & Clear Flags">
                                    <ShieldCheck size={16} />
                                 </button>
                              )}
                              <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Remove Post">
                                 <Trash2 size={16} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Slide-out Drawer */}
      {isDrawerOpen && selectedPost && (
        <div className="fixed inset-0 z-50 overflow-hidden">
           <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs transition-opacity" onClick={() => setIsDrawerOpen(false)} />
           
           <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-[600px] bg-white border-l border-gray-200 flex flex-col justify-between shadow-2xl animate-slide-in-right">
                 <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
                       <div>
                          <span className="text-[11px] font-bold text-gray-400 font-mono uppercase">Discussion Review</span>
                          <h2 className="text-[18px] font-semibold text-gray-900 mt-1">{selectedPost.id}</h2>
                       </div>
                       <button onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition text-[13px] font-semibold">
                          Close
                       </button>
                    </div>

                    {/* Flag Alert Box */}
                    {selectedPost.status === 'Flagged' && (
                       <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 mb-6">
                          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                          <div className="space-y-1">
                             <h4 className="text-[13px] font-extrabold text-rose-900">Flagged: {selectedPost.flagReason} ({selectedPost.flagsCount} Reports)</h4>
                             <p className="text-[12px] text-rose-700 leading-normal">{selectedPost.flagDetails}</p>
                          </div>
                       </div>
                    )}

                    {/* Author & Meta */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
                       <div>
                          <span className="text-[11px] text-gray-400 font-semibold uppercase">Author</span>
                          <p className="text-[14px] font-bold text-gray-900 mt-0.5">{selectedPost.author}</p>
                          <span className="text-[11px] font-mono text-gray-500">{selectedPost.userId}</span>
                       </div>
                       <div>
                          <span className="text-[11px] text-gray-400 font-semibold uppercase">Posted At</span>
                          <p className="text-[13px] font-semibold text-gray-700 mt-0.5">{selectedPost.postedAt}</p>
                       </div>
                       <div>
                          <span className="text-[11px] text-gray-400 font-semibold uppercase">Forum Category</span>
                          <span className="block mt-1 px-2.5 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-bold text-gray-700 text-center">
                             {selectedPost.category}
                          </span>
                       </div>
                    </div>

                    {/* Post Content */}
                    <div className="space-y-3 mb-8">
                       <h3 className="text-[16px] font-bold text-gray-900 leading-tight">{selectedPost.title}</h3>
                       <div className="bg-[#FAF7F2] rounded-xl p-4 border border-gray-100 text-[13px] text-gray-800 leading-relaxed whitespace-pre-line font-medium">
                          {selectedPost.content}
                       </div>
                    </div>

                    {/* Comments Section */}
                    <div>
                       <h4 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <MessageSquare size={14} /> Comments ({selectedPost.comments.length})
                       </h4>
                       {selectedPost.comments.length > 0 ? (
                          <div className="space-y-3">
                             {selectedPost.comments.map((c, idx) => (
                                <div key={idx} className="p-3 bg-white border border-gray-100 rounded-lg shadow-2xs space-y-1">
                                   <div className="flex justify-between items-center">
                                      <span className="text-[12px] font-bold text-gray-800">{c.author}</span>
                                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-semibold">{c.role}</span>
                                   </div>
                                   <p className="text-[12px] text-gray-600 font-medium">{c.text}</p>
                                </div>
                             ))}
                          </div>
                       ) : (
                          <p className="text-[13px] text-gray-400 italic">No comments on this post yet.</p>
                       )}
                    </div>

                 </div>

                 {/* Moderation Controls Footer */}
                 <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-2">
                    <button 
                      onClick={() => handleSuspendUser(selectedPost.userId, selectedPost.author)}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[13px] font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                       <UserX size={15} /> Suspend User
                    </button>
                    {selectedPost.status === 'Flagged' && (
                       <button 
                         onClick={() => handleApprove(selectedPost.id)}
                         className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                       >
                          <ShieldCheck size={15} /> Keep Post
                       </button>
                    )}
                    <button 
                      onClick={() => handleDelete(selectedPost.id)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                    >
                       <Trash2 size={15} /> Delete Post
                    </button>
                 </div>

              </div>
           </div>
        </div>
      )}

    </div>
  );
}

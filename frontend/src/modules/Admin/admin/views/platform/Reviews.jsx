import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, Check, AlertCircle, Trash2, Eye, MessageSquare, ShieldCheck, CornerDownRight } from 'lucide-react';
import { fetchAdminReviews, moderateAdminReview } from '../../../../../services/admin';

export function Reviews() {
  const [toastMessage, setToastMessage] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [filterRating, setFilterRating] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const initialReviews = [
    {
      id: 'REV-901',
      customer: 'Ananya Hegde',
      targetName: 'Ravi Pet Shop',
      targetType: 'Vendor',
      rating: 5,
      comment: 'Excellent service! Bought a Golden Retriever starter kit and all grooming products were high-quality. Ravi was extremely helpful with advice.',
      status: 'Approved',
      flagged: false,
      flagReason: '',
      date: '29 May 2026, 14:02',
      reply: ''
    },
    {
      id: 'REV-902',
      customer: 'Vikram Seth',
      targetName: 'Pawsome Training Academy',
      targetType: 'Vendor',
      rating: 1,
      comment: 'SCAM! The trainer did not show up for three consecutive sessions, and they refused a refund! Avoid this center at all costs. Shady practices.',
      status: 'Flagged',
      flagged: true,
      flagReason: 'Reported by Vendor for Offensive/False Accusation',
      date: '28 May 2026, 11:20',
      reply: ''
    },
    {
      id: 'REV-903',
      customer: 'Meera Nair',
      targetName: 'Premium Orthopedic Dog Bed',
      targetType: 'Product',
      rating: 4,
      comment: 'The orthopedic bed is soft and fits my older Lab perfectly. However, the cover material seems a bit thin, so I hope it holds up over time.',
      status: 'Approved',
      flagged: false,
      flagReason: '',
      date: '27 May 2026, 16:45',
      reply: 'Thank you for your feedback, Meera! We do sell heavy-duty replacement covers if needed.'
    },
    {
      id: 'REV-904',
      customer: 'Sanjay Dutt',
      targetName: 'Happy Tails Clinic',
      targetType: 'Vendor',
      rating: 2,
      comment: 'Vet was fine, but the wait time was over 2 hours even with an appointment! The reception staff was not helpful at all.',
      status: 'Pending',
      flagged: false,
      flagReason: '',
      date: '26 May 2026, 09:30',
      reply: ''
    },
    {
      id: 'REV-905',
      customer: 'Sneha Jain',
      targetName: 'PetZone Food Dispenser',
      targetType: 'Product',
      rating: 5,
      comment: 'Absolutely amazing automatic food dispenser. Works perfectly with the app and dispenses the exact portions scheduled.',
      status: 'Approved',
      flagged: false,
      flagReason: '',
      date: '25 May 2026, 18:10',
      reply: ''
    }
  ];

  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchAdminReviews().then(setReviews).catch((err) => console.error('Failed to load reviews', err));
  }, []);

  const ratingDistribution = [
    { stars: 5, percentage: 65, count: 1240 },
    { stars: 4, percentage: 20, count: 380 },
    { stars: 3, percentage: 8, count: 152 },
    { stars: 2, percentage: 4, count: 76 },
    { stars: 1, percentage: 3, count: 57 },
  ];

  const handleApprove = (id) => {
    moderateAdminReview(id, 'restore').catch((err) => console.error('Approve failed', err));
    setReviews(reviews.map(r => r.id === id ? { ...r, status: 'Approved', flagged: false, flagReason: '' } : r));
    showToast('Review approved successfully');
    if (selectedReview && selectedReview.id === id) {
      setSelectedReview({ ...selectedReview, status: 'Approved', flagged: false, flagReason: '' });
    }
    setIsDrawerOpen(false);
  };

  const handleDelete = (id) => {
    moderateAdminReview(id, 'hide').catch((err) => console.error('Hide failed', err));
    setReviews(reviews.filter(r => r.id !== id));
    showToast('Review removed from platform', 'info');
    setIsDrawerOpen(false);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!adminReply.trim()) return;

    setReviews(reviews.map(r => r.id === selectedReview.id ? { ...r, reply: adminReply } : r));
    setSelectedReview({ ...selectedReview, reply: adminReply });
    setAdminReply('');
    showToast('Admin response published');
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Flagged': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderStars = (count) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} className={i < count ? 'fill-amber-400' : 'text-gray-200'} />
        ))}
      </div>
    );
  };

  const filteredReviews = reviews.filter(r => {
    if (filterRating !== 'All' && r.rating !== parseInt(filterRating)) return false;
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Trash2 size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Ratings & Reviews Moderation</h1>
        <p className="text-[13px] text-gray-500 mt-1">Monitor product and vendor ratings, handle flagged complaints, and publish official responses</p>
      </div>

      {/* Distribution & Stats Section */}
      <div className="grid grid-cols-12 gap-6 mb-8">
         {/* Summary Stats */}
         <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">Total Reviews</h3>
              <p className="text-[24px] font-bold text-gray-900">1,905</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">Average Rating</h3>
              <div className="flex items-center gap-1.5 mt-1">
                 <p className="text-[24px] font-bold text-gray-900">4.5</p>
                 <Star size={18} className="fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">Flagged Complaints</h3>
              <p className="text-[24px] font-bold text-rose-600">{reviews.filter(r => r.status === 'Flagged').length}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
              <h3 className="text-[13px] text-gray-500 font-medium">Pending Moderation</h3>
              <p className="text-[24px] font-bold text-amber-600">{reviews.filter(r => r.status === 'Pending').length}</p>
            </div>
         </div>

         {/* Distribution Chart */}
         <div className="col-span-12 md:col-span-8 bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm flex flex-col justify-between">
            <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider mb-3">Rating Breakdown & Share</h3>
            <div className="space-y-2">
               {ratingDistribution.map((dist) => (
                  <div key={dist.stars} className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                     <span className="text-[12px] font-bold text-gray-600 w-12 flex items-center gap-1">
                        {dist.stars} <Star size={12} className="fill-amber-400 text-amber-400" />
                     </span>
                     <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#66B4B1] h-2.5 rounded-full" style={{ width: `${dist.percentage}%` }}></div>
                     </div>
                     <span className="text-[11px] text-gray-400 font-medium w-8 text-right">{dist.percentage}%</span>
                     <span className="text-[11px] text-gray-500 font-mono w-14 text-right">({dist.count})</span>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
         {/* Filter Bar */}
         <div className="p-4 border-b border-[#FAF7F2] flex flex-wrap items-center gap-3 bg-gray-50/50">
            <div className="relative min-w-[200px]">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="Search Customer, Review comment..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white shadow-sm" />
            </div>

            <div className="flex items-center gap-2">
               <select 
                 value={filterRating} 
                 onChange={(e) => setFilterRating(e.target.value)}
                 className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[120px]"
               >
                 <option value="All">All Ratings</option>
                 <option value="5">5 Stars</option>
                 <option value="4">4 Stars</option>
                 <option value="3">3 Stars</option>
                 <option value="2">2 Stars</option>
                 <option value="1">1 Star</option>
               </select>

               <select 
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white shadow-sm focus:outline-none focus:border-[#66B4B1] outline-none appearance-none pr-8 cursor-pointer min-w-[120px]"
               >
                 <option value="All">All Statuses</option>
                 <option value="Approved">Approved</option>
                 <option value="Pending">Pending</option>
                 <option value="Flagged">Flagged</option>
               </select>

               <button onClick={() => alert("Action triggered: Filters")} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition flex items-center gap-2">
                  <Filter size={14} /> Filters
               </button>
            </div>
         </div>

         {/* Table */}
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
               <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                  <tr>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Review ID</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor/Product</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Comment Snippet</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                     <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#FAF7F2]">
                  {filteredReviews.map(r => (
                     <tr key={r.id} onClick={() => { setSelectedReview(r); setIsDrawerOpen(true); }} className="hover:bg-[#FAF7F2] transition cursor-pointer group">
                        <td className="px-5 py-4">
                           <span className="text-[13px] font-semibold text-gray-900 group-hover:text-[#66B4B1] transition">{r.id}</span>
                        </td>
                        <td className="px-5 py-4 text-[13px] font-bold text-gray-800">{r.customer}</td>
                        <td className="px-5 py-4">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-gray-700">{r.targetName}</span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">{r.targetType}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4">
                           {renderStars(r.rating)}
                        </td>
                        <td className="px-5 py-4 max-w-[280px]">
                           <p className="text-[13px] text-gray-600 truncate">{r.comment}</p>
                        </td>
                        <td className="px-5 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusBadgeStyle(r.status)}`}>
                              {r.status}
                           </span>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                           <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setSelectedReview(r); setIsDrawerOpen(true); }} className="p-1.5 text-gray-400 hover:text-[#66B4B1] hover:bg-[#FAF7F2] rounded transition" title="Preview Detail">
                                 <Eye size={16} />
                              </button>
                              {r.status !== 'Approved' && (
                                 <button onClick={() => handleApprove(r.id)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition" title="Approve Review">
                                    <ShieldCheck size={16} />
                                 </button>
                              )}
                              <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Delete Review">
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
      {isDrawerOpen && selectedReview && (
        <div className="fixed inset-0 z-50 overflow-hidden">
           <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs transition-opacity" onClick={() => setIsDrawerOpen(false)} />
           
           <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-[600px] bg-white border-l border-gray-200 flex flex-col justify-between shadow-2xl animate-slide-in-right">
                 <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
                       <div>
                          <span className="text-[11px] font-bold text-gray-400 font-mono uppercase">Review Moderation Panel</span>
                          <h2 className="text-[18px] font-semibold text-gray-900 mt-1">{selectedReview.id}</h2>
                       </div>
                       <button onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition text-[13px] font-semibold">
                          Close
                       </button>
                    </div>

                    {/* Alert Flag */}
                    {selectedReview.flagged && (
                       <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 mb-6">
                          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                          <div className="space-y-1">
                             <h4 className="text-[13px] font-extrabold text-rose-900">Review Flagged</h4>
                             <p className="text-[12px] text-rose-700 leading-normal">{selectedReview.flagReason}</p>
                          </div>
                       </div>
                    )}

                    {/* Metadata Card */}
                    <div className="bg-[#FAF7F2] rounded-xl p-5 border border-gray-200 mb-6 space-y-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                             <span className="text-[11px] text-gray-400 font-bold uppercase">Customer</span>
                             <p className="text-[13px] font-bold text-gray-800 mt-0.5">{selectedReview.customer}</p>
                          </div>
                          <div>
                             <span className="text-[11px] text-gray-400 font-bold uppercase">Submitted On</span>
                             <p className="text-[13px] font-semibold text-gray-600 mt-0.5">{selectedReview.date}</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-200/60">
                          <div>
                             <span className="text-[11px] text-gray-400 font-bold uppercase">Target Name</span>
                             <p className="text-[13px] font-bold text-gray-800 mt-0.5">{selectedReview.targetName}</p>
                          </div>
                          <div>
                             <span className="text-[11px] text-gray-400 font-bold uppercase">Target Type</span>
                             <p className="text-[13px] font-semibold text-gray-600 mt-0.5">{selectedReview.targetType}</p>
                          </div>
                       </div>
                    </div>

                    {/* Comment Details */}
                    <div className="space-y-3 mb-8">
                       <div className="flex justify-between items-center">
                          <span className="text-[12px] text-gray-400 font-extrabold uppercase">Rating & Comment</span>
                          {renderStars(selectedReview.rating)}
                       </div>
                       <div className="bg-white p-4 rounded-xl border border-gray-200 text-[13px] text-gray-700 leading-relaxed font-semibold italic">
                          "{selectedReview.comment}"
                       </div>
                    </div>

                    {/* Replies */}
                    <div className="space-y-4">
                       <h4 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare size={14} /> Official Responses
                       </h4>
                       
                       {selectedReview.reply ? (
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                             <CornerDownRight size={16} className="text-[#66B4B1] shrink-0 mt-0.5" />
                             <div>
                                <div className="flex items-center gap-2">
                                   <span className="text-[11px] bg-[#66B4B1] text-white px-2 py-0.2 rounded font-bold">Admin Reply</span>
                                   <span className="text-[10px] text-gray-400">Published</span>
                                </div>
                                <p className="text-[12px] text-gray-700 font-semibold mt-2">{selectedReview.reply}</p>
                             </div>
                          </div>
                       ) : (
                          <form onSubmit={handleSendReply} className="space-y-3">
                             <textarea 
                               value={adminReply}
                               onChange={(e) => setAdminReply(e.target.value)}
                               placeholder="Write an official response to this customer review..."
                               className="w-full h-20 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white resize-none"
                               required
                             />
                             <button onClick={() => alert("Action triggered: Submit Official Response")} type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-lg transition shadow-sm">
                                Submit Official Response
                             </button>
                          </form>
                       )}
                    </div>

                 </div>

                 {/* Moderation Controls Footer */}
                 <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-2">
                    {selectedReview.status !== 'Approved' && (
                       <button 
                         onClick={() => handleApprove(selectedReview.id)}
                         className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                       >
                          <ShieldCheck size={15} /> Approve & Publish
                       </button>
                    )}
                    {selectedReview.status !== 'Flagged' && (
                       <button 
                         onClick={() => {
                            setReviews(reviews.map(r => r.id === selectedReview.id ? { ...r, status: 'Flagged', flagged: true, flagReason: 'Reported by Administrator' } : r));
                            setSelectedReview({ ...selectedReview, status: 'Flagged', flagged: true, flagReason: 'Reported by Administrator' });
                            showToast('Review marked as Flagged', 'warning');
                         }}
                         className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-[13px] font-semibold rounded-lg transition"
                       >
                          Flag Content
                       </button>
                    )}
                    <button 
                      onClick={() => handleDelete(selectedReview.id)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                    >
                       <Trash2 size={15} /> Delete Review
                    </button>
                 </div>

              </div>
           </div>
        </div>
      )}

    </div>
  );
}

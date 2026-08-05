import React, { useState } from 'react';
import { Search, Filter, Send, Calendar, Check, AlertCircle, Eye, Bell, Users, Mail, MessageSquare, Phone, ArrowRight, Share2, Copy } from 'lucide-react';
import { sendAdminBroadcast } from '../../../../../services/admin';

const AUDIENCE_SCOPE = { All: 'All', Customers: 'Users', Vendors: 'Vendors' };

export function Notifications() {
  const [toastMessage, setToastMessage] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('All');
  const [channels, setChannels] = useState({ push: true, email: false, sms: false, inApp: true });
  const [actionLink, setActionLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduleDate, setScheduleDate] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const initialNotifications = [
    {
      id: 'NT-1001',
      title: 'Mega Monsoon Pet Grooming Sale',
      body: 'Get flat 25% off on all premium pet grooming packages this weekend! Use code MONSOON25 at checkout.',
      audience: 'Customers',
      channels: ['Push', 'In-App'],
      status: 'Sent',
      sentAt: '29 May 2026, 10:00',
      stats: { sent: 12450, delivered: 12400, opened: 9860, clicked: 3120 },
      actionLink: 'https://tailcircle.com/grooming-deals',
      imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300'
    },
    {
      id: 'NT-1002',
      title: 'New Service Guidelines for Clinics',
      body: 'Important updates regarding online veterinarian consultation fee deposits and payout schedule changes.',
      audience: 'Vendors',
      channels: ['Email'],
      status: 'Sent',
      sentAt: '28 May 2026, 16:30',
      stats: { sent: 820, delivered: 818, opened: 740, clicked: 412 },
      actionLink: 'https://tailcircle.com/vendor-guidelines',
      imageUrl: ''
    },
    {
      id: 'NT-1003',
      title: 'Verify Your Email Address Now',
      body: 'Verify your TailCircle account details to continue receiving pet vaccination alerts and clinic booking confirmations.',
      audience: 'All',
      channels: ['Push', 'Email', 'In-App'],
      status: 'Sent',
      sentAt: '27 May 2026, 11:15',
      stats: { sent: 24500, delivered: 24350, opened: 18200, clicked: 8900 },
      actionLink: 'https://tailcircle.com/verify-email',
      imageUrl: ''
    },
    {
      id: 'NT-1004',
      title: 'Weekend Dog Event Reminder',
      body: 'Don\'t forget! The Great Bangalore Dog Show starts tomorrow at 9 AM. Have your tickets ready.',
      audience: 'Customers',
      channels: ['Push', 'SMS', 'In-App'],
      status: 'Scheduled',
      sentAt: '30 May 2026, 09:00',
      stats: { sent: 1540, delivered: 0, opened: 0, clicked: 0 },
      actionLink: 'https://tailcircle.com/events/dog-show',
      imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300'
    },
    {
      id: 'NT-1005',
      title: 'System Maintenance Alert',
      body: 'The TailCircle vendor portal will be offline for routine maintenance from 2:00 AM to 4:00 AM IST on June 1st.',
      audience: 'Vendors',
      channels: ['Email', 'SMS'],
      status: 'Scheduled',
      sentAt: '01 Jun 2026, 01:00',
      stats: { sent: 950, delivered: 0, opened: 0, clicked: 0 },
      actionLink: '',
      imageUrl: ''
    }
  ];

  const [notifications, setNotifications] = useState(initialNotifications);

  const handleSendNotification = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Title and body are required', 'error');
      return;
    }

    const selectedChannels = Object.keys(channels).filter(key => channels[key]).map(key => {
      if (key === 'push') return 'Push';
      if (key === 'email') return 'Email';
      if (key === 'sms') return 'SMS';
      if (key === 'inApp') return 'In-App';
      return key;
    });

    if (selectedChannels.length === 0) {
      showToast('Please select at least one delivery channel', 'error');
      return;
    }

    const newNotification = {
      id: `NT-${1000 + notifications.length + 1}`,
      title,
      body,
      audience,
      channels: selectedChannels,
      status: scheduleType === 'immediate' ? 'Sent' : 'Scheduled',
      sentAt: scheduleType === 'immediate' ? new Date().toLocaleString() : scheduleDate || 'Scheduled Date',
      stats: { sent: audience === 'All' ? 25000 : audience === 'Vendors' ? 950 : 18000, delivered: 0, opened: 0, clicked: 0 },
      actionLink,
      imageUrl
    };

    if (scheduleType === 'immediate') {
      sendAdminBroadcast({ scope: AUDIENCE_SCOPE[audience] || 'All', title, message: body })
        .catch((err) => showToast(err?.response?.data?.message || 'Broadcast failed', 'error'));
    }
    setNotifications([newNotification, ...notifications]);
    showToast(scheduleType === 'immediate' ? 'Notification broadcasted successfully!' : 'Notification scheduled successfully!');

    // Reset Form
    setTitle('');
    setBody('');
    setAudience('All');
    setChannels({ push: true, email: false, sms: false, inApp: true });
    setActionLink('');
    setImageUrl('');
    setScheduleType('immediate');
    setScheduleDate('');
  };

  const getAudienceBadgeStyle = (aud) => {
    switch (aud) {
      case 'All': return 'bg-indigo-100 text-indigo-700';
      case 'Vendors': return 'bg-amber-100 text-amber-700';
      case 'Customers': return 'bg-sky-100 text-sky-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Sent': return 'bg-emerald-100 text-emerald-700';
      case 'Scheduled': return 'bg-blue-100 text-blue-700';
      case 'Failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getChannelIcon = (ch) => {
    switch (ch) {
      case 'Push': return <Bell size={12} className="text-purple-600" title="Push Notification" />;
      case 'Email': return <Mail size={12} className="text-blue-600" title="Email Broadcast" />;
      case 'SMS': return <Phone size={12} className="text-emerald-600" title="SMS Alert" />;
      case 'In-App': return <MessageSquare size={12} className="text-amber-600" title="In-App Banner" />;
      default: return null;
    }
  };

  const handleRowClick = (n) => {
    setSelectedNotification(n);
    setIsDrawerOpen(true);
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1500px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             ) : (
                <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><AlertCircle size={14}/></div>
             )}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Push & Campaign Notifications</h1>
        <p className="text-[13px] text-gray-500 mt-1">Send marketing, transactional, and administrative announcements across all user segments</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Send Notification Form */}
        <div className="col-span-12 lg:col-span-5 bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm self-start">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
             <Send size={16} className="text-[#66B4B1]" />
             <h2 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider">Create New Campaign</h2>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4">
             <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Notification Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekend Grooming Special!"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white"
                  required
                />
             </div>

             <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Message Body</label>
                <textarea 
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your notification message body here..."
                  className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white resize-none"
                  required
                />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Target Audience</label>
                   <select 
                     value={audience} 
                     onChange={(e) => setAudience(e.target.value)}
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white appearance-none pr-8 cursor-pointer"
                   >
                      <option value="All">All Users</option>
                      <option value="Customers">Pet Owners</option>
                      <option value="Vendors">Service Vendors</option>
                   </select>
                </div>
                <div>
                   <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Action Link / URL</label>
                   <input 
                     type="text" 
                     value={actionLink}
                     onChange={(e) => setActionLink(e.target.value)}
                     placeholder="e.g., /app/shop"
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white"
                   />
                </div>
             </div>

             <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Delivery Channels</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                   {['push', 'email', 'sms', 'inApp'].map((ch) => (
                      <label key={ch} className={`flex flex-col items-center p-2.5 border rounded-lg cursor-pointer transition ${channels[ch] ? 'border-[#66B4B1] bg-[#FAF7F2]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                         <input 
                           type="checkbox" 
                           checked={channels[ch]} 
                           onChange={(e) => setChannels({ ...channels, [ch]: e.target.checked })}
                           className="hidden" 
                         />
                         <span className="mb-1">{getChannelIcon(ch === 'push' ? 'Push' : ch === 'email' ? 'Email' : ch === 'sms' ? 'SMS' : 'In-App')}</span>
                         <span className="text-[10px] font-bold text-gray-600 capitalize">{ch === 'inApp' ? 'In-App' : ch}</span>
                      </label>
                   ))}
                </div>
             </div>

             <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Notification Banner Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white"
                />
             </div>

             <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Delivery Schedule</label>
                <div className="flex flex-col sm:flex-row gap-4 mb-3">
                   <label className="flex items-center gap-2 text-[13px] text-gray-700 font-semibold cursor-pointer">
                      <input 
                        type="radio" 
                        name="schedule" 
                        value="immediate" 
                        checked={scheduleType === 'immediate'}
                        onChange={() => setScheduleType('immediate')}
                        className="text-[#66B4B1] focus:ring-[#66B4B1]" 
                      />
                      Send Immediately
                   </label>
                   <label className="flex items-center gap-2 text-[13px] text-gray-700 font-semibold cursor-pointer">
                      <input 
                        type="radio" 
                        name="schedule" 
                        value="scheduled"
                        checked={scheduleType === 'scheduled'}
                        onChange={() => setScheduleType('scheduled')}
                        className="text-[#66B4B1] focus:ring-[#66B4B1]" 
                      />
                      Schedule
                   </label>
                </div>
                {scheduleType === 'scheduled' && (
                   <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="datetime-local" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] bg-white"
                      />
                   </div>
                )}
             </div>

             <button onClick={() => alert("Action triggered: {scheduleType === \'immediate\' ? \'Broadcast Notification\' : \'Schedule Broadcast\'}")} type="submit" className="w-full py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm flex items-center justify-center gap-2 mt-4">
                <Send size={15} /> 
                {scheduleType === 'immediate' ? 'Broadcast Notification' : 'Schedule Broadcast'}
             </button>
          </form>
        </div>

        {/* History / Campaigns Table */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
             <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Broadcast Campaigns History</h2>
          </div>

          <div className="overflow-x-auto min-h-[450px]">
             <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2]">
                   <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Campaign</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Audience</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Channels</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date Sent</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                   {notifications.map((n) => (
                      <tr key={n.id} onClick={() => handleRowClick(n)} className="hover:bg-[#FAF7F2] transition cursor-pointer group">
                         <td className="px-4 py-4 max-w-[200px]">
                            <div className="flex flex-col">
                               <span className="text-[13px] font-bold text-gray-900 truncate group-hover:text-[#66B4B1] transition">{n.title}</span>
                               <span className="text-[11px] text-gray-500 font-mono mt-0.5">{n.id}</span>
                            </div>
                         </td>
                         <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getAudienceBadgeStyle(n.audience)}`}>
                               {n.audience}
                            </span>
                         </td>
                         <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                               {n.channels.map((ch, idx) => (
                                  <div key={idx} className="w-5 h-5 rounded bg-gray-50 border border-gray-100 flex items-center justify-center">
                                     {getChannelIcon(ch)}
                                  </div>
                               ))}
                            </div>
                         </td>
                         <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getStatusBadgeStyle(n.status)}`}>
                               {n.status}
                            </span>
                         </td>
                         <td className="px-4 py-4 text-[13px] text-gray-600">{n.sentAt}</td>
                         <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleRowClick(n)} className="p-1.5 text-gray-400 hover:text-[#66B4B1] hover:bg-[#FAF7F2] rounded transition" title="Preview Detail">
                               <Eye size={16} />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* Slide-out Drawer */}
      {isDrawerOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-hidden">
           <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs transition-opacity" onClick={() => setIsDrawerOpen(false)} />
           
           <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-[600px] bg-white border-l border-gray-200 flex flex-col justify-between shadow-2xl animate-slide-in-right">
                 <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
                       <div>
                          <span className="text-[11px] font-bold text-gray-400 font-mono uppercase">Campaign Details</span>
                          <h2 className="text-[18px] font-semibold text-gray-900 mt-1">{selectedNotification.id}</h2>
                       </div>
                       <button onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition text-[13px] font-semibold">
                          Close
                       </button>
                    </div>

                    {/* Stats Summary */}
                    {selectedNotification.status === 'Sent' && (
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                          <div className="text-center">
                             <p className="text-[11px] text-gray-500 font-medium">Sent</p>
                             <p className="text-[15px] font-bold text-gray-800 mt-0.5">{selectedNotification.stats.sent.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[11px] text-gray-500 font-medium">Delivered</p>
                             <p className="text-[15px] font-bold text-blue-600 mt-0.5">{selectedNotification.stats.delivered.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[11px] text-gray-500 font-medium">Opened</p>
                             <p className="text-[15px] font-bold text-purple-600 mt-0.5">
                                {((selectedNotification.stats.opened / selectedNotification.stats.sent) * 100).toFixed(0)}%
                             </p>
                          </div>
                          <div className="text-center">
                             <p className="text-[11px] text-gray-500 font-medium">Clicked</p>
                             <p className="text-[15px] font-bold text-emerald-600 mt-0.5">
                                {((selectedNotification.stats.clicked / selectedNotification.stats.opened) * 100).toFixed(0)}%
                             </p>
                          </div>
                       </div>
                    )}

                    {/* Info List */}
                    <div className="space-y-4 mb-8">
                       <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-[13px] text-gray-500 font-semibold">Status</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeStyle(selectedNotification.status)}`}>
                             {selectedNotification.status}
                          </span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-[13px] text-gray-500 font-semibold">Audience Segment</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getAudienceBadgeStyle(selectedNotification.audience)}`}>
                             {selectedNotification.audience}
                          </span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-[13px] text-gray-500 font-semibold">Channels Broadcaster</span>
                          <div className="flex items-center gap-2">
                             {selectedNotification.channels.map((ch, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-semibold">
                                   {ch}
                                </span>
                             ))}
                          </div>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-gray-50">
                          <span className="text-[13px] text-gray-500 font-semibold">Date & Time</span>
                          <span className="text-[13px] font-semibold text-gray-800">{selectedNotification.sentAt}</span>
                       </div>
                       {selectedNotification.actionLink && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-50">
                             <span className="text-[13px] text-gray-500 font-semibold">Action Link</span>
                             <span className="text-[13px] font-semibold text-[#66B4B1] hover:underline cursor-pointer flex items-center gap-1">
                                {selectedNotification.actionLink} <ArrowRight size={12} />
                             </span>
                          </div>
                       )}
                    </div>

                    {/* Preview Bubble */}
                    <div className="mb-6">
                       <h4 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider mb-3">Live Notification Preview</h4>
                       
                       <div className="bg-gray-100 rounded-xl p-5 border border-gray-200 relative overflow-hidden max-w-sm mx-auto">
                          {/* Mock Phone Notification Bubble */}
                          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-md border border-white flex gap-3">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#66B4B1] to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                <Bell size={18} />
                             </div>
                             <div className="space-y-1 overflow-hidden">
                                <div className="flex justify-between items-center">
                                   <span className="text-[12px] font-bold text-gray-800">TailCircle</span>
                                   <span className="text-[10px] text-gray-400">now</span>
                                </div>
                                <h5 className="text-[13px] font-extrabold text-gray-900 truncate">{selectedNotification.title}</h5>
                                <p className="text-[11px] text-gray-600 leading-snug line-clamp-3">{selectedNotification.body}</p>
                             </div>
                          </div>
                          
                          {selectedNotification.imageUrl && (
                             <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-xs mx-auto">
                                <img src={selectedNotification.imageUrl} alt="Banner" className="w-full h-32 object-cover" />
                             </div>
                          )}
                       </div>
                    </div>

                 </div>

                 {/* Drawer Footer */}
                 <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button 
                      onClick={() => {
                         setTitle(selectedNotification.title);
                         setBody(selectedNotification.body);
                         setAudience(selectedNotification.audience);
                         setActionLink(selectedNotification.actionLink || '');
                         setImageUrl(selectedNotification.imageUrl || '');
                         setIsDrawerOpen(false);
                         showToast('Campaign details copied to composer!');
                      }}
                      className="flex-1 py-2 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-[13px] font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                       <Copy size={14} /> Duplicate Campaign
                    </button>
                    <button 
                      onClick={() => {
                         setIsDrawerOpen(false);
                         showToast('Campaign analytics summary exported to CSV!');
                      }}
                      className="flex-1 py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                    >
                       <Share2 size={14} /> Export Report
                    </button>
                 </div>

              </div>
           </div>
        </div>
      )}

    </div>
  );
}

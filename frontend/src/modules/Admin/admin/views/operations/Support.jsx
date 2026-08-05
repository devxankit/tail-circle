import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, MoreVertical, MessageSquare, AlertTriangle, Clock, CheckCircle, Store, User, Send, Paperclip, XCircle, Trash2, Eye } from 'lucide-react';
import { fetchAdminSupport, replyAdminSupport } from '../../../../../services/admin';

export function Support() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Type: All');
  const [filterStatus, setFilterStatus] = useState('Status: All');
  const [filterPriority, setFilterPriority] = useState('Priority: All');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [replyText, setReplyText] = useState('');
  const actionMenuRef = useRef(null);

  const stats = [
    { title: 'Open Tickets', value: '56', color: 'text-amber-600' },
    { title: 'High Priority', value: '12', color: 'text-red-600' },
    { title: 'Vendor Tickets', value: '18', color: 'text-indigo-600' },
    { title: 'Resolved Today', value: '34', color: 'text-emerald-600' }
  ];

  const initialTickets = [
    {
      id: 'TKT-9910',
      subject: 'Order not delivered but marked as done',
      type: 'Customer',
      name: 'Rahul Sharma',
      phone: '9876543210',
      category: 'Delivery',
      priority: 'High',
      status: 'Open',
      createdDate: '29 May 2025',
      createdTime: '10:30 AM',
      slaStatus: 'SLA Breach in 2h',
      slaColor: 'text-red-600',
      messages: [
        { sender: 'customer', text: 'My order ORD-8821 says delivered but I haven\'t received it yet! Please help.', time: '10:30 AM' }
      ]
    },
    {
      id: 'TKT-9909',
      subject: 'Unable to update catalog pricing',
      type: 'Vendor',
      name: 'Paws & Claws Store',
      phone: '9876112233',
      category: 'Technical',
      priority: 'Medium',
      status: 'In Progress',
      createdDate: '29 May 2025',
      createdTime: '09:15 AM',
      slaStatus: 'SLA: 14h left',
      slaColor: 'text-amber-600',
      messages: [
        { sender: 'vendor', text: 'I am getting an error 500 when trying to save my new prices for Royal Canin bags.', time: '09:15 AM' },
        { sender: 'support', text: 'Hi, we are looking into this. It seems to be a temporary server issue. Will update you shortly.', time: '09:30 AM' }
      ]
    },
    {
      id: 'TKT-9908',
      subject: 'Change my appointment slot',
      type: 'Customer',
      name: 'Sneha Roy',
      phone: '9876543211',
      category: 'Booking',
      priority: 'Low',
      status: 'Open',
      createdDate: '29 May 2025',
      createdTime: '08:45 AM',
      slaStatus: 'SLA: 22h left',
      slaColor: 'text-emerald-600',
      messages: [
        { sender: 'customer', text: 'Can I change my grooming booking BKG-4421 to tomorrow morning?', time: '08:45 AM' }
      ]
    },
    {
      id: 'TKT-9907',
      subject: 'Payout not received for last week',
      type: 'Vendor',
      name: 'Dr. Priya Das',
      phone: '9876112244',
      category: 'Finance',
      priority: 'High',
      status: 'In Progress',
      createdDate: '28 May 2025',
      createdTime: '04:20 PM',
      slaStatus: 'SLA Breach in 1h',
      slaColor: 'text-red-600',
      messages: [
        { sender: 'vendor', text: 'My settlement for the period 20-26 May has not hit my bank account yet.', time: '28 May, 04:20 PM' }
      ]
    },
    {
      id: 'TKT-9906',
      subject: 'App crashing on iOS 17',
      type: 'Customer',
      name: 'Amit Das',
      phone: '9876543212',
      category: 'Technical',
      priority: 'Medium',
      status: 'Resolved',
      createdDate: '27 May 2025',
      createdTime: '11:00 AM',
      slaStatus: 'Resolved',
      slaColor: 'text-gray-500',
      messages: [
        { sender: 'customer', text: 'The app crashes immediately when I try to open the Meal Plans section.', time: '27 May, 11:00 AM' },
        { sender: 'support', text: 'Hi Amit, we have released an update (v2.1.4) that fixes this crash. Please update from the App Store.', time: '28 May, 10:00 AM' }
      ]
    }
  ];

  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    fetchAdminSupport().then(setTickets).catch((err) => console.error('Failed to load tickets', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPriorityPill = (priority) => {
    switch(priority) {
      case 'High': return 'bg-red-50 text-red-700 border border-red-100';
      case 'Medium': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Low': return 'bg-blue-50 text-blue-700 border border-blue-100';
      default: return 'bg-gray-50 text-gray-700 border border-gray-100';
    }
  };

  const getStatusPill = (status) => {
    switch(status) {
      case 'Open': return 'bg-amber-100 text-amber-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Resolved': return 'bg-emerald-100 text-emerald-700';
      case 'Closed': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleActionClick = (e, ticketId) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === ticketId ? null : ticketId);
  };

  const updateTicketStatus = (ticketId, newStatus) => {
    let updatedSla = '';
    let updatedSlaColor = '';
    
    setTickets(tickets.map(t => {
      if (t.id === ticketId) {
         if (newStatus === 'Resolved' || newStatus === 'Closed') {
            updatedSla = newStatus;
            updatedSlaColor = 'text-gray-500';
         } else {
            updatedSla = t.slaStatus;
            updatedSlaColor = t.slaColor;
         }
         return { ...t, status: newStatus, slaStatus: updatedSla, slaColor: updatedSlaColor };
      }
      return t;
    }));

    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus, slaStatus: updatedSla || selectedTicket.slaStatus, slaColor: updatedSlaColor || selectedTicket.slaColor });
    }
    setActionMenuOpen(null);
  };

  const handleDeleteTicket = (ticketId) => {
    const confirmed = window.confirm("Are you sure you want to delete this ticket?");
    if (confirmed) {
      setTickets(tickets.filter(t => t.id !== ticketId));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
      }
    }
    setActionMenuOpen(null);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newMessage = {
      sender: 'support',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (selectedTicket?._id) replyAdminSupport(selectedTicket._id, replyText).catch((err) => console.error('Reply failed', err));

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        return { ...t, messages: [...t.messages, newMessage], status: t.status === 'Open' ? 'In Progress' : t.status };
      }
      return t;
    });

    setTickets(updatedTickets);
    setSelectedTicket({ 
      ...selectedTicket, 
      messages: [...selectedTicket.messages, newMessage],
      status: selectedTicket.status === 'Open' ? 'In Progress' : selectedTicket.status
    });
    setReplyText('');
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(search.toLowerCase()) || 
                          t.subject.toLowerCase().includes(search.toLowerCase()) ||
                          t.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'Type: All' || t.type === filterType;
    const matchesStatus = filterStatus === 'Status: All' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'Priority: All' || t.priority === filterPriority;
    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto relative min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Support Tickets</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">Unified helpdesk for customers and vendors</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Downloading CSV...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.title}</h3>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[100%] sm:min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Ticket ID, subject, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] transition"
          />
        </div>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap"
        >
          <option>Type: All</option>
          <option>Customer</option>
          <option>Vendor</option>
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap"
        >
          <option>Status: All</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
        <select 
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap"
        >
          <option>Priority: All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ticket Details</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reporter</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">SLA Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-[#FAF7F2] transition group cursor-pointer" onClick={() => setSelectedTicket(t)}>
                  <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="px-4 py-4 w-[300px]">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'Vendor' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {t.type === 'Vendor' ? <Store size={14} /> : <User size={14} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900 line-clamp-1" title={t.subject}>{t.subject}</p>
                        <p className="text-[11px] font-bold text-[#66B4B1] hover:underline mt-0.5">{t.id}</p>
                        <p className="text-[10px] font-medium text-gray-400 mt-0.5">{t.createdDate} at {t.createdTime}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-[13px] font-bold text-gray-900">{t.name}</p>
                    <p className="text-[11px] font-medium text-gray-500">{t.phone}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{t.type}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-[12px] font-bold text-gray-600">{t.category}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityPill(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${t.slaColor}`}>
                      {t.slaStatus.includes('Breach') ? <AlertTriangle size={12} /> : t.slaStatus === 'Resolved' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {t.slaStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusPill(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); }} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition">
                        Open
                      </button>
                      <button onClick={(e) => handleActionClick(e, t.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {/* Action Menu */}
                    {actionMenuOpen === t.id && (
                      <div ref={actionMenuRef} className="absolute right-8 top-10 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-20 overflow-hidden text-left py-1">
                        <button onClick={() => { setSelectedTicket(t); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                          <Eye size={14} /> View Ticket
                        </button>
                        <button onClick={() => updateTicketStatus(t.id, 'Resolved')} 
                          className="w-full text-left px-4 py-2 text-[13px] font-bold text-emerald-600 hover:bg-emerald-50 transition flex items-center gap-2">
                          <CheckCircle size={14} /> Mark Resolved
                        </button>
                        <button onClick={() => handleDeleteTicket(t.id)} 
                          className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                          <Trash2 size={14} /> Delete Ticket
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
          <p className="text-[13px] font-bold text-gray-500">Showing {filteredTickets.length > 0 ? 1 : 0}-{Math.min(5, filteredTickets.length)} of {filteredTickets.length} tickets</p>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Action triggered: Previous")} className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-[13px] font-bold text-gray-400 cursor-not-allowed">Previous</button>
            <button onClick={() => alert("Action triggered: Next")} className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-[13px] font-bold text-gray-700 transition">Next</button>
          </div>
        </div>
      </div>

      {/* Side Drawer - Chat Interface */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedTicket(null)} />
          <div className="relative w-full max-w-[600px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white z-10 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedTicket.type === 'Vendor' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {selectedTicket.type === 'Vendor' ? <Store size={18} /> : <User size={18} />}
                 </div>
                 <div>
                   <h3 className="text-[15px] font-black text-gray-900 tracking-tight leading-tight">{selectedTicket.name}</h3>
                   <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-[#66B4B1]">{selectedTicket.id}</span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getPriorityPill(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className={`text-[10px] font-bold ${selectedTicket.slaColor}`}>{selectedTicket.slaStatus}</span>
                   </div>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <select 
                   value={selectedTicket.status}
                   onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                   className={`px-3 py-1.5 border-none rounded-lg text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20 cursor-pointer ${getStatusPill(selectedTicket.status)}`}
                 >
                   <option value="Open">Open</option>
                   <option value="In Progress">In Progress</option>
                   <option value="Resolved">Resolved</option>
                   <option value="Closed">Closed</option>
                 </select>
                 <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                   <XCircle size={20} />
                 </button>
              </div>
            </div>
            
            {/* Subject Banner */}
            <div className="bg-gray-50 border-b border-gray-100 p-4">
               <p className="text-[11px] text-gray-500 font-bold uppercase mb-1">Subject</p>
               <p className="text-[14px] font-bold text-gray-900">{selectedTicket.subject}</p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
               {selectedTicket.messages.map((msg, idx) => {
                 const isSupport = msg.sender === 'support';
                 return (
                   <div key={idx} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${isSupport ? 'bg-[#66B4B1] text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
                        <p className={`text-[13px] leading-relaxed ${isSupport ? 'font-medium' : 'font-medium'}`}>
                          {msg.text}
                        </p>
                        <p className={`text-[10px] mt-2 font-bold ${isSupport ? 'text-teal-100' : 'text-gray-400'}`}>
                          {msg.time} {isSupport ? '• Support Agent' : `• ${selectedTicket.name}`}
                        </p>
                     </div>
                   </div>
                 );
               })}
            </div>
            
            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200 z-10">
               {selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' ? (
                 <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[13px] font-bold text-gray-500">This ticket is {selectedTicket.status}. Re-open to send a message.</p>
                    <button onClick={() => updateTicketStatus(selectedTicket.id, 'Open')} className="mt-2 text-[12px] font-bold text-[#66B4B1] hover:underline">
                      Re-open Ticket
                    </button>
                 </div>
               ) : (
                 <form onSubmit={handleSendReply} className="relative flex items-end gap-2">
                    <button onClick={() => alert("Action triggered: Action")} type="button" className="p-3 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition shrink-0">
                      <Paperclip size={20} />
                    </button>
                    <textarea 
                      placeholder="Type your reply here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[13px] focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] min-h-[50px] max-h-[120px] resize-none"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                    ></textarea>
                    <button onClick={() => alert("Action triggered: Action")} type="submit" disabled={!replyText.trim()} className="p-3 bg-[#66B4B1] text-white rounded-xl hover:bg-[#66B4B1] transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                      <Send size={20} />
                    </button>
                 </form>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

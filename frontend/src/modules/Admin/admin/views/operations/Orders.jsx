import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, Filter, MoreVertical, Eye, MapPin, CheckCircle, Package, Truck, XCircle, RefreshCw, Printer } from 'lucide-react';
import { fetchAdminOrders } from '../../../../../services/admin';

export function Orders() {
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('Summary');
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const actionMenuRef = useRef(null);

  const stats = [
    { title: 'Total Orders Today', value: '127', color: 'text-gray-900' },
    { title: 'Pending', value: '34', color: 'text-amber-600' },
    { title: 'Shipped', value: '58', color: 'text-teal-600' },
    { title: 'Delivered', value: '29', color: 'text-emerald-600' },
    { title: 'Cancelled', value: '6', color: 'text-red-600' }
  ];

  const [orders, setOrders] = useState([]);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchAdminOrders().then(setOrders).catch((err) => console.error('Failed to load orders', err));
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

  const getStatusPill = (status) => {
    switch(status) {
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Confirmed': return 'bg-blue-100 text-blue-700';
      case 'Packed': return 'bg-indigo-100 text-indigo-700';
      case 'Shipped': return 'bg-teal-100 text-teal-700';
      case 'Delivered': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      case 'Return Requested': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentPill = (method) => {
    switch(method) {
      case 'UPI': return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Card': return 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'Wallet': return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'COD': return 'bg-gray-50 text-gray-600 border border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
    setSelectedOrder({ ...selectedOrder, status: newStatus });
    alert(`Status updated to ${newStatus}`);
  };

  const handleCancelOrder = () => {
    const confirmed = window.confirm("Are you sure you want to cancel this order?");
    if (confirmed) {
      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'Cancelled' } : o));
      setSelectedOrder({ ...selectedOrder, status: 'Cancelled' });
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleActionClick = (e, orderId) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === orderId ? null : orderId);
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto relative min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Orders</h1>
          <p className="text-[13px] text-gray-500 mt-1 font-medium">All shop orders across the platform</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Downloading CSV...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => alert("Opening Date Picker...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
            <Calendar size={14} /> Date Range
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
            placeholder="Order ID, customer name, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] transition"
          />
        </div>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Status: All</option>
          <option>Pending</option>
          <option>Confirmed</option>
          <option>Packed</option>
          <option>Shipped</option>
          <option>Delivered</option>
          <option>Cancelled</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Vendor: All</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Payment: All</option>
          <option>UPI</option>
          <option>Card</option>
          <option>Wallet</option>
          <option>COD</option>
        </select>
        <select className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap">
          <option>Sort: Newest</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Delivery</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-[#FAF7F2] transition group cursor-pointer" onClick={() => setSelectedOrder(o)}>
                  <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-[13px] font-bold text-[#66B4B1] hover:underline">{o.id}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                        {o.customerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{o.customerName}</p>
                        <p className="text-[11px] font-medium text-gray-500">For: {o.petName} • {o.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-[13px] font-bold text-gray-900">{o.vendorName}</p>
                    <p className="text-[11px] font-medium text-gray-500">{o.vendorId}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap group relative">
                    <p className="text-[13px] font-bold text-gray-900">{o.itemsCount} {o.itemsCount === 1 ? 'item' : 'items'}</p>
                    <p className="text-[11px] font-medium text-gray-500 w-[120px] truncate">{o.previewItem}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <p className="text-[16px] font-bold text-gray-900">₹{o.amount}</p>
                    <p className="text-[11px] font-bold text-[#66B4B1]">comm ₹{o.commission}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPaymentPill(o.paymentMethod)}`}>
                        {o.paymentMethod}
                      </span>
                      {o.paymentStatus === 'Paid' ? (
                        <CheckCircle size={12} className="text-[#66B4B1]" />
                      ) : o.paymentStatus === 'Pending' ? (
                        <RefreshCw size={12} className="text-amber-500" />
                      ) : (
                        <XCircle size={12} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 w-20 truncate">{o.paymentId}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-[13px] font-bold text-gray-900">{o.orderDate}</p>
                    <p className="text-[11px] font-medium text-gray-500">{o.timeAgo}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusPill(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-[13px] font-bold text-gray-900">{o.courier}</p>
                    {o.eta !== '—' && <p className="text-[11px] font-bold text-[#66B4B1]">{o.eta}</p>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition">
                        View
                      </button>
                      <button onClick={(e) => handleActionClick(e, o.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    
                    {/* Action Menu */}
                    {actionMenuOpen === o.id && (
                      <div ref={actionMenuRef} className="absolute right-8 top-10 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-20 overflow-hidden text-left py-1">
                        <button onClick={() => { setSelectedOrder(o); setActiveTab('Summary'); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                          <Eye size={14} /> View Details
                        </button>
                        <button onClick={() => { window.print(); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:text-[#66B4B1] transition flex items-center gap-2">
                          <Printer size={14} /> Print Invoice
                        </button>
                        <button onClick={() => { 
                            const confirmed = window.confirm("Cancel this order?");
                            if(confirmed) {
                              setOrders(orders.map(order => order.id === o.id ? { ...order, status: 'Cancelled' } : order));
                            }
                            setActionMenuOpen(null);
                          }} 
                          className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                          <XCircle size={14} /> Cancel Order
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
          <p className="text-[13px] font-bold text-gray-500">Showing {filteredOrders.length > 0 ? 1 : 0}-{Math.min(5, filteredOrders.length)} of {filteredOrders.length} orders</p>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Action triggered: Previous")} className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-[13px] font-bold text-gray-400 cursor-not-allowed">Previous</button>
            <button onClick={() => alert("Action triggered: Next")} className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-[13px] font-bold text-gray-700 transition">Next</button>
          </div>
        </div>
      </div>

      {/* Side Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-[600px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedOrder.id}</h3>
                <p className="text-[13px] font-bold text-gray-500 mt-1">{selectedOrder.orderDate} • {selectedOrder.vendorName}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition">
                <XCircle size={20} />
              </button>
            </div>
            
            {/* Drawer Tabs */}
            <div className="flex items-center gap-6 px-6 border-b border-gray-200 bg-white">
              {['Summary', `Items (${selectedOrder.itemsCount})`, 'Timeline', 'Payment', 'Customer'].map((tab) => {
                const baseTabName = tab.startsWith('Items') ? 'Items' : tab;
                const isActive = activeTab === baseTabName || activeTab === tab;
                return (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(baseTabName)}
                    className={`py-4 text-[13px] font-bold transition ${isActive ? 'text-[#66B4B1] border-b-2 border-[#66B4B1]' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
              
              {activeTab === 'Summary' && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Order Items</h4>
                    <div className="space-y-4">
                      {selectedOrder.itemsList.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package size={20} className="text-gray-400" />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-gray-900">{item.name}</p>
                              <p className="text-[11px] font-medium text-gray-500">Qty: {item.qty}</p>
                            </div>
                          </div>
                          <p className="text-[13px] font-bold text-gray-900">₹{item.price}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <div className="flex justify-between text-[13px]">
                      <span className="font-bold text-gray-500">Subtotal</span>
                      <span className="font-bold text-gray-900">₹{selectedOrder.amount}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="font-bold text-gray-500">Delivery Charge</span>
                      <span className="font-bold text-gray-900">₹0</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex justify-between">
                      <span className="text-sm font-black text-gray-900">Total</span>
                      <span className="text-lg font-black text-[#66B4B1]">₹{selectedOrder.amount}</span>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 mt-4 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Platform Commission</span>
                      <span className="text-[13px] font-black text-emerald-600">₹{selectedOrder.commission}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Status Management</h4>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <select 
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-900 focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1]"
                        value={newStatus || selectedOrder.status}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value={selectedOrder.status}>{selectedOrder.status} (Current)</option>
                        {['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(opt => (
                           opt !== selectedOrder.status && <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <button onClick={handleUpdateStatus} className="px-6 py-2.5 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-[13px] font-bold shadow-sm transition">
                        Update Status
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'Items' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">All Items</h4>
                  <div className="space-y-4">
                    {selectedOrder.itemsList.map((item, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package size={24} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-900">{item.name}</p>
                            <p className="text-[11px] font-medium text-gray-500">Price: ₹{item.price} • Qty: {item.qty}</p>
                          </div>
                        </div>
                        <p className="text-[14px] font-black text-gray-900">₹{item.price * item.qty}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Timeline' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Order Timeline</h4>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
                     <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#66B4B1] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                           <CheckCircle size={18} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
                              <h5 className="font-bold text-gray-900 text-[13px]">{selectedOrder.status}</h5>
                              <span className="text-[10px] font-bold text-gray-500">{selectedOrder.timeAgo}</span>
                           </div>
                           <p className="text-[11px] text-gray-500">Order is currently in {selectedOrder.status} state.</p>
                        </div>
                     </div>
                     <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-200 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                           <Truck size={18} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
                              <h5 className="font-bold text-gray-900 text-[13px]">Order Placed</h5>
                              <span className="text-[10px] font-bold text-gray-500">{selectedOrder.orderDate}</span>
                           </div>
                           <p className="text-[11px] text-gray-500">Customer placed the order.</p>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'Payment' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Payment Details</h4>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                        <span className="text-[12px] font-bold text-gray-500">Payment Method</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getPaymentPill(selectedOrder.paymentMethod)}`}>{selectedOrder.paymentMethod}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                        <span className="text-[12px] font-bold text-gray-500">Transaction ID</span>
                        <span className="text-[13px] font-bold text-gray-900">{selectedOrder.paymentId}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                        <span className="text-[12px] font-bold text-gray-500">Payment Status</span>
                        <span className="text-[13px] font-bold text-[#66B4B1] flex items-center gap-1">
                           <CheckCircle size={14} /> {selectedOrder.paymentStatus}
                        </span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[12px] font-bold text-gray-500">Total Amount</span>
                        <span className="text-[15px] font-black text-gray-900">₹{selectedOrder.amount}</span>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'Customer' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Customer Info</h4>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-600">
                      {selectedOrder.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">{selectedOrder.customerName}</p>
                      <p className="text-[12px] font-medium text-gray-500">Pet: {selectedOrder.petName}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Address</p>
                        <p className="text-[13px] font-medium text-gray-800 leading-relaxed">
                           123 Demo Street, Apartment 4B<br/>
                           {selectedOrder.city}, State 400001<br/>
                           Phone: +91 98765 43210
                        </p>
                     </div>
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.03)] z-10 relative">
               <button onClick={handlePrintInvoice} className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition">
                 Print Invoice
               </button>
               <button onClick={handleCancelOrder} className="flex-1 py-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold shadow-sm transition">
                 Cancel Order
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

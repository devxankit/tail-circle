import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { updateShopOrderStatus } from '../../../../services/vendor';
import {
  Search, Filter, Eye, Printer, Download, MapPin,
  CreditCard, Package, Truck, CheckCircle, XCircle, X
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

// UI label -> real backend status the vendor is allowed to move an order to.
const TARGET_STATUS = {
  Packed: 'packed',
  Dispatched: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

export function OrdersView() {
  const { orders, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
                          o.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (order, newStatusLabel) => {
    setUpdating(true);
    try {
      await updateShopOrderStatus(order._id || order.id, TARGET_STATUS[newStatusLabel]);
      await refresh();
      const MSG = {
        Packed: `Order ${order.id} accepted & packed.`,
        Dispatched: `Order ${order.id} dispatched.`,
        Delivered: `Order ${order.id} marked as delivered!`,
        Cancelled: `Order ${order.id} has been cancelled.`,
      };
      addToast({ message: MSG[newStatusLabel] || 'Order updated', type: newStatusLabel === 'Cancelled' ? 'warning' : 'success' });
      setSelectedOrder(null);
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not update the order', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintInvoice = (order) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
            .brand { font-size: 24px; font-weight: 900; }
            .brand span { color: #f05a2a; }
            .invoice-meta { text-align: right; }
            .invoice-meta h2 { font-size: 28px; font-weight: 900; color: #0f172a; }
            .invoice-meta p { color: #64748b; font-size: 13px; margin-top: 4px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
            .info-box { background: #f8fafc; border-radius: 12px; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; padding: 12px 16px; background: #f1f5f9; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
            td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .total-row { background: #0f172a; color: white; }
            .total-row td { font-weight: 900; font-size: 16px; border: none; }
            .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .badge-paid { background: #d1fae5; color: #065f46; }
            .badge-cod { background: #fef3c7; color: #92400e; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 24px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">Tail<span>Circle</span> <small style="font-size:12px;color:#94a3b8;font-weight:600;">SHOP PARTNER</small></div>
            <div class="invoice-meta">
              <h2>INVOICE</h2>
              <p>${order.id}</p>
              <p>Date: ${order.date}</p>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <p class="section-title">Bill To</p>
              <p style="font-weight:700;font-size:15px;">${order.customer}</p>
              <p style="color:#64748b;font-size:13px;margin-top:4px;">123, Palm Grove Apartments<br/>Indiranagar, Bangalore - 560038</p>
            </div>
            <div class="info-box">
              <p class="section-title">Order Details</p>
              <p style="font-size:13px;"><strong>Delivery Type:</strong> ${order.deliveryType}</p>
              <p style="font-size:13px;margin-top:4px;"><strong>Payment:</strong> 
                <span class="badge ${order.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-cod'}">${order.paymentStatus}</span>
              </p>
              <p style="font-size:13px;margin-top:4px;"><strong>Status:</strong> ${order.status}</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>
              <tr><td>Products & Items (${order.id})</td><td>${order.products}</td><td>₹${order.total}</td></tr>
              <tr class="total-row"><td colspan="2">TOTAL AMOUNT</td><td>₹${order.total}</td></tr>
            </tbody>
          </table>
          <div class="footer">
            <p>Thank you for shopping with us! For any queries, contact support@tailcircle.com</p>
            <p style="margin-top:6px;">TailCircle Shop Vendor · Generated on ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownloadInvoice = (order) => {
    const content = `INVOICE\n${'='.repeat(50)}\nOrder ID: ${order.id}\nDate: ${order.date}\nCustomer: ${order.customer}\nDelivery Type: ${order.deliveryType}\nPayment: ${order.paymentStatus}\nStatus: ${order.status}\n${'─'.repeat(50)}\nProducts (${order.products} items)\n${'─'.repeat(50)}\nTOTAL AMOUNT: ₹${order.total}\n${'='.repeat(50)}\nTailCircle Shop Vendor\nGenerated: ${new Date().toLocaleDateString('en-IN')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Invoice_${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast({ message: `Invoice for ${order.id} downloaded!`, type: 'success' });
  };

  return (
    <div className="space-y-6 relative h-full">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Order Management</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Process and track customer orders.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Order ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm transition cursor-pointer appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Packed">Packed</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Order Details</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Customer</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Amount & Payment</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Delivery</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition group cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="py-4 px-6">
                    <p className="text-sm font-black text-slate-900">{order.id}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{order.date}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-900">{order.customer}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{order.products} items</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-black text-slate-900">₹{order.total}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full", order.paymentStatus === 'Paid' ? "bg-emerald-500" : "bg-amber-500")} />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{order.paymentStatus}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-semibold text-slate-700">{order.deliveryType}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", 
                      order.status === 'New' ? "bg-amber-100 text-amber-700" :
                      order.status === 'Packed' ? "bg-blue-100 text-blue-700" :
                      order.status === 'Dispatched' ? "bg-indigo-100 text-indigo-700" :
                      order.status === 'Delivered' ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                        title="View Details"
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(order); }}
                        title="Download Invoice"
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Search size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">No orders found</h3>
              <p className="text-sm text-slate-500">Try adjusting your search filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl relative flex flex-col animate-in slide-in-from-right">
            
            {/* Drawer Header */}
            <div className="h-20 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
              <div>
                <h2 className="text-lg font-black text-slate-900">{selectedOrder.id}</h2>
                <p className="text-xs font-semibold text-slate-500">{selectedOrder.date}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Status Tracker */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Status</h3>
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm"><CheckCircle size={14} /></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">New</span>
                  </div>
                  <div className={cn("flex-1 h-1 rounded-full mx-2", ['Packed','Dispatched','Delivered'].includes(selectedOrder.status) ? "bg-emerald-500" : "bg-slate-200")} />
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm", ['Packed','Dispatched','Delivered'].includes(selectedOrder.status) ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-200 text-slate-300")}><Package size={14} /></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Packed</span>
                  </div>
                  <div className={cn("flex-1 h-1 rounded-full mx-2", ['Dispatched','Delivered'].includes(selectedOrder.status) ? "bg-emerald-500" : "bg-slate-200")} />
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-sm", ['Dispatched','Delivered'].includes(selectedOrder.status) ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-200 text-slate-300")}><Truck size={14} /></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Dispatched</span>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer & Delivery</h3>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">{selectedOrder.customer.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedOrder.customer}</p>
                      <p className="text-xs font-medium text-slate-500">+91 9876543210</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex items-start gap-3">
                    <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">123, Palm Grove Apartments, Indiranagar, Bangalore - 560038</p>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase">{selectedOrder.deliveryType} Delivery</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Summary</h3>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CreditCard size={16} /> {selectedOrder.paymentStatus === 'Paid' ? 'Prepaid (UPI)' : 'Cash on Delivery'}
                    </div>
                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", selectedOrder.paymentStatus === 'Paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Items ({selectedOrder.products})</span>
                      <span>₹{selectedOrder.total}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-black pt-2 border-t border-slate-100 text-lg">
                      <span>Total Amount</span>
                      <span>₹{selectedOrder.total}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Actions */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-3">
              {selectedOrder.status === 'New' && (
                <button disabled={updating} onClick={() => updateOrderStatus(selectedOrder, 'Packed')} className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  <Package size={16} /> Accept & Pack Order
                </button>
              )}
              {selectedOrder.status === 'Packed' && (
                <button disabled={updating} onClick={() => updateOrderStatus(selectedOrder, 'Dispatched')} className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  <Truck size={16} /> Mark as Dispatched
                </button>
              )}
              {selectedOrder.status === 'Dispatched' && (
                <button disabled={updating} onClick={() => updateOrderStatus(selectedOrder, 'Delivered')} className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  <CheckCircle size={16} /> Mark as Delivered
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => handleDownloadInvoice(selectedOrder)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={16} /> Invoice
                </button>
              </div>
              {selectedOrder.status === 'New' && (
                <button disabled={updating} onClick={() => updateOrderStatus(selectedOrder, 'Cancelled')} className="w-full py-2 text-red-600 hover:text-red-700 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60">
                  <XCircle size={14} /> Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

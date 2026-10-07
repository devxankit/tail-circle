import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { updateShopOrderStatus } from '../../../../services/vendor';
import { formatDateTime } from '../utils/formatDate';
import {
  Search, Eye, Printer, Download, MapPin,
  CreditCard, Package, Truck, CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import {
  SearchBar, FilterChips, ListCard, StatusBadge, EmptyState, StickyActionBar, PrimaryButton,
  CardAction, SectionLabel, useSubScreen,
} from '../../vendor/mobile';

const ORDER_TONE = { New: 'warning', Packed: 'info', Dispatched: 'primary', Delivered: 'success', Cancelled: 'error' };

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

  // An opened order is its own screen (it was a side drawer): Back closes it.
  useSubScreen(selectedOrder ? { title: selectedOrder.id, onBack: () => setSelectedOrder(null) } : null);

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
      addToast({ message: err?.response?.data?.message || err?.message || 'Could not update the order', type: 'error' });
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
              <p>Date: ${formatDateTime(order.date)}</p>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <p class="section-title">Bill To</p>
              <p style="font-weight:700;font-size:15px;">${order.customer}</p>
              <p style="color:#64748b;font-size:13px;margin-top:4px;">${order.address || 'Address not provided'}${order.phone ? `<br/>${order.phone}` : ''}</p>
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
              <tr><td>Your items (${order.id})</td><td>${order.products}</td><td>₹${order.total}</td></tr>
              <tr class="total-row"><td colspan="2">YOUR EARNINGS</td><td>₹${order.total}</td></tr>
              ${order.isSharedOrder ? `<tr><td colspan="3" style="font-size:11px;color:#b45309;">Shared basket — the customer paid ₹${order.orderTotal} in total across all sellers.</td></tr>` : ''}
            </tbody>
          </table>
          <div class="footer">
            <p>Thank you for shopping with us! For any queries, contact Contact@tailcircle.in</p>
            <p style="margin-top:6px;">TailCircle Shop Partner · Generated on ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownloadInvoice = (order) => {
    const content = `INVOICE\n${'='.repeat(50)}\nOrder ID: ${order.id}\nDate: ${formatDateTime(order.date)}\nCustomer: ${order.customer}\nPhone: ${order.phone || '-'}\nAddress: ${order.address || '-'}\nDelivery Type: ${order.deliveryType}\nPayment: ${order.paymentStatus}\nStatus: ${order.status}\n${'─'.repeat(50)}\nProducts (${order.products} items)\n${'─'.repeat(50)}\nTOTAL AMOUNT: ₹${order.total}\n${'='.repeat(50)}\nTailCircle Shop Partner\nGenerated: ${new Date().toLocaleDateString('en-IN')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Invoice_${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast({ message: `Invoice for ${order.id} downloaded!`, type: 'success' });
  };

  /* ── Order detail ── */
  if (selectedOrder) {
    const reached = (list) => list.includes(selectedOrder.status);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-text-secondary">{formatDateTime(selectedOrder.date)}</p>
          <StatusBadge label={selectedOrder.status} tone={ORDER_TONE[selectedOrder.status] || 'neutral'} />
        </div>

        {/* Status Tracker */}
        <div>
          <SectionLabel>Order Status</SectionLabel>
          <div className="bg-white p-4 rounded-[20px] flex items-center justify-between border border-border-light shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-success text-white flex items-center justify-center shadow-sm"><CheckCircle size={16} /></div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">New</span>
            </div>
            <div className={cn("flex-1 h-1 rounded-full mx-2 -mt-5", reached(['Packed','Dispatched','Delivered']) ? "bg-success" : "bg-border-light")} />
            <div className="flex flex-col items-center gap-2">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shadow-sm", reached(['Packed','Dispatched','Delivered']) ? "bg-success text-white" : "bg-white border-2 border-border-light text-text-disabled")}><Package size={16} /></div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">Packed</span>
            </div>
            <div className={cn("flex-1 h-1 rounded-full mx-2 -mt-5", reached(['Dispatched','Delivered']) ? "bg-success" : "bg-border-light")} />
            <div className="flex flex-col items-center gap-2">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shadow-sm", reached(['Dispatched','Delivered']) ? "bg-success text-white" : "bg-white border-2 border-border-light text-text-disabled")}><Truck size={16} /></div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">Dispatched</span>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div>
          <SectionLabel>Customer & Delivery</SectionLabel>
          <div className="bg-white border border-border-light rounded-[20px] p-4 space-y-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center text-text-primary font-bold shrink-0">{selectedOrder.customer.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold text-text-primary">{selectedOrder.customer}</p>
                {selectedOrder.phone ? (
                  <a href={`tel:${selectedOrder.phone}`} className="text-xs font-medium text-[#4C8684]">{selectedOrder.phone}</a>
                ) : (
                  <p className="text-xs font-medium text-text-secondary">No phone number on the order</p>
                )}
              </div>
            </div>
            <div className="border-t border-border-light pt-3 flex items-start gap-3">
              <MapPin size={16} className="text-text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary">{selectedOrder.address || 'No delivery address on the order'}</p>
                <p className="text-xs font-bold text-text-secondary mt-1 uppercase">{selectedOrder.deliveryType} Delivery</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div>
          <SectionLabel>Payment Summary</SectionLabel>
          <div className="bg-white border border-border-light rounded-[20px] p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-border-light gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <CreditCard size={16} /> {selectedOrder.paymentStatus === 'Paid' ? 'Prepaid (UPI)' : 'Cash on Delivery'}
              </div>
              <StatusBadge label={selectedOrder.paymentStatus} tone={selectedOrder.paymentStatus === 'Paid' ? 'success' : 'warning'} />
            </div>
            <div className="space-y-2 text-sm">
              {/* The lines this seller is actually fulfilling. A basket can
                  also carry another seller's goods or the platform's own,
                  which are none of this vendor's business. */}
              {(selectedOrder.items || []).map((it, i) => (
                <div key={i} className="flex justify-between text-text-primary font-medium gap-3">
                  <span className="min-w-0 truncate">
                    {it.name}{it.size ? ` · ${it.size}` : ''} × {it.qty}
                  </span>
                  <span className="shrink-0">₹{it.total}</span>
                </div>
              ))}
              {!(selectedOrder.items || []).length && (
                <div className="flex justify-between text-text-primary font-medium">
                  <span>Items ({selectedOrder.products})</span>
                  <span>₹{selectedOrder.total}</span>
                </div>
              )}
              <div className="flex justify-between text-text-primary font-black pt-2 border-t border-border-light text-lg">
                <span>Your earnings</span>
                <span>₹{selectedOrder.total}</span>
              </div>
              {selectedOrder.isSharedOrder && (
                <p className="text-[11px] font-semibold text-text-primary bg-warning/10 border border-warning/25 rounded-xl p-2.5 leading-snug">
                  This basket also contains items sold by someone else. The customer paid
                  ₹{selectedOrder.orderTotal} in total; the ₹{selectedOrder.total} above is your part of it.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice */}
        <div className="flex gap-2">
          <CardAction tone="outline" icon={Printer} className="flex-1" onClick={() => handlePrintInvoice(selectedOrder)}>Print</CardAction>
          <CardAction tone="outline" icon={Download} className="flex-1" onClick={() => handleDownloadInvoice(selectedOrder)}>Invoice</CardAction>
        </div>

        {selectedOrder.status === 'New' && (
          <button disabled={updating} onClick={() => updateOrderStatus(selectedOrder, 'Cancelled')} className="w-full min-h-[44px] text-error font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60">
            <XCircle size={16} /> Cancel Order
          </button>
        )}

        {['New', 'Packed', 'Dispatched'].includes(selectedOrder.status) && (
          <StickyActionBar>
            {selectedOrder.status === 'New' && (
              <PrimaryButton tone="dark" disabled={updating} loading={updating} icon={Package} onClick={() => updateOrderStatus(selectedOrder, 'Packed')}>
                Accept & Pack Order
              </PrimaryButton>
            )}
            {selectedOrder.status === 'Packed' && (
              <PrimaryButton tone="dark" disabled={updating} loading={updating} icon={Truck} onClick={() => updateOrderStatus(selectedOrder, 'Dispatched')}>
                Mark as Dispatched
              </PrimaryButton>
            )}
            {selectedOrder.status === 'Dispatched' && (
              <PrimaryButton tone="dark" disabled={updating} loading={updating} icon={CheckCircle} onClick={() => updateOrderStatus(selectedOrder, 'Delivered')}>
                Mark as Delivered
              </PrimaryButton>
            )}
          </StickyActionBar>
        )}
      </div>
    );
  }

  /* ── Order list ── */
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Order Management</h2>
        <p className="text-xs text-text-secondary mt-1">Process and track customer orders.</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by Order ID or Name..." />

      <FilterChips
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: 'All', label: 'All Statuses' },
          'New', 'Packed', 'Dispatched', 'Delivered', 'Cancelled',
        ]}
      />

      {filteredOrders.length === 0 ? (
        <EmptyState icon={Search} title="No orders found" text="Try adjusting your search filters." />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <ListCard
              key={order.id}
              title={order.id}
              subtitle={`${formatDateTime(order.date)} · ${order.customer}`}
              badge={<StatusBadge label={order.status} tone={ORDER_TONE[order.status] || 'neutral'} />}
              amount={`₹${order.total}`}
              onClick={() => setSelectedOrder(order)}
              meta={[
                { label: 'Items', value: `${order.products} items` },
                {
                  label: 'Payment',
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full", order.paymentStatus === 'Paid' ? "bg-success" : "bg-warning")} />
                      {order.paymentStatus}
                    </span>
                  ),
                },
                { label: 'Delivery', value: order.deliveryType },
              ]}
              footer={(
                <>
                  <CardAction icon={Eye} className="flex-1" onClick={() => setSelectedOrder(order)}>View Details</CardAction>
                  <CardAction icon={Download} className="flex-1" onClick={() => handleDownloadInvoice(order)}>Invoice</CardAction>
                </>
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

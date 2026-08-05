import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Send,
  ScanLine,
  X,
  CheckCircle2,
  User,
  CreditCard,
  Landmark,
  QrCode,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  fetchWallet,
  fetchWalletTransactions,
  topupWallet,
  sendMoney,
  payMerchant,
} from '../../../../services/wallet';

export function Wallet() {
  const navigate = useNavigate();

  // Wallet balance + transactions come from the API (rupees).
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  const refreshWallet = async () => {
    const [w, txns] = await Promise.all([fetchWallet(), fetchWalletTransactions()]);
    setBalance(w.balance);
    setTransactions(txns);
  };

  useEffect(() => {
    refreshWallet().catch(() => {});
  }, []);

  // Modal State: 'add' | 'send' | 'pay' | null
  const [activeModal, setActiveModal] = useState(null);
  
  // Form States
  const [amountToAdd, setAmountToAdd] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  
  const [selectedContact, setSelectedContact] = useState(null);
  const [amountToSend, setAmountToSend] = useState('');
  const [sendNote, setSendNote] = useState('');
  
  const [scanStep, setScanStep] = useState('scan'); // 'scan' | 'confirm'
  const [scannedMerchant, setScannedMerchant] = useState(null);
  const [amountToPay, setAmountToPay] = useState('');

  // Process States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);

  // Real chat contacts (was 4 invented names) — quick-pick only; the phone
  // field below is what actually reaches a real recipient's wallet.
  const [contacts, setContacts] = useState([]);
  useEffect(() => {
    import('../../../../services/social').then(({ fetchConversations }) =>
      fetchConversations()
        .then((conversations) =>
          setContacts(
            conversations
              .filter((c) => c.counterpart?.name)
              .slice(0, 8)
              .map((c) => ({ id: c._id, name: c.counterpart.name, role: c.counterpart.subtitle || 'Chat', image: c.counterpart.image }))
          )
        )
        .catch(() => setContacts([]))
    );
  }, []);
  const [sendPhone, setSendPhone] = useState('');

  // Add money submit handler — opens the Razorpay sheet, credits on confirm.
  const handleAddMoney = async (e) => {
    e.preventDefault();
    const val = parseFloat(amountToAdd);
    if (isNaN(val) || val <= 0) return;

    setIsProcessing(true);
    try {
      await topupWallet(val);
      await refreshWallet();
      setIsProcessing(false);
      setProcessSuccess(true);
      setTimeout(() => {
        setProcessSuccess(false);
        setActiveModal(null);
        setAmountToAdd('500');
      }, 1500);
    } catch {
      setIsProcessing(false); // cancelled / failed — stay on the form
    }
  };

  // Send money submit handler — either a real phone number (reaches an
  // actual registered user's wallet) or a quick-pick contact (a labeled
  // outgoing transaction only, same as the backend's documented "demo
  // contact" transfer mode).
  const handleSendMoney = async (e) => {
    e.preventDefault();
    const val = parseFloat(amountToSend);
    const recipientName = selectedContact?.name || sendPhone;
    if (!recipientName || isNaN(val) || val <= 0 || val > balance) return;

    setIsProcessing(true);
    try {
      await sendMoney({
        phone: sendPhone || undefined,
        name: selectedContact?.name,
        title: `Sent to ${recipientName}`,
        amount: val,
        note: sendNote,
      });
      await refreshWallet();
      setIsProcessing(false);
      setProcessSuccess(true);
      setTimeout(() => {
        setProcessSuccess(false);
        setActiveModal(null);
        setSelectedContact(null);
        setSendPhone('');
        setAmountToSend('');
        setSendNote('');
      }, 1500);
    } catch (err) {
      setIsProcessing(false);
      alert(err.message || 'Could not send money — please try again.');
    }
  };

  // No camera/QR-decoding integration exists — this used to fake a scan
  // result (fixed merchant + fixed ₹249 amount) after a spinner. Real manual
  // entry instead: the merchant is whatever UPI ID the user actually typed,
  // and the amount is genuinely theirs to enter on the confirm step.
  const [manualUpiId, setManualUpiId] = useState('');
  const handleManualUpiEntry = (e) => {
    e.preventDefault();
    if (!manualUpiId.trim()) return;
    setScannedMerchant({ name: manualUpiId.trim(), upiId: manualUpiId.trim() });
    setAmountToPay('');
    setScanStep('confirm');
  };

  // Confirm Scan Pay handler
  const handlePayMerchant = async () => {
    const val = parseFloat(amountToPay);
    if (isNaN(val) || val <= 0 || val > balance) return;

    setIsProcessing(true);
    try {
      await payMerchant({
        merchantId: scannedMerchant.upiId,
        name: scannedMerchant.name,
        title: `Paid to ${scannedMerchant.name}`,
        amount: val,
      });
      await refreshWallet();
      setIsProcessing(false);
      setProcessSuccess(true);
      setTimeout(() => {
        setProcessSuccess(false);
        setActiveModal(null);
        setScannedMerchant(null);
        setScanStep('scan');
        setAmountToPay('');
      }, 1500);
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary absolute inset-0 z-50 animate-in slide-in-from-bottom-full text-text-primary">
      {/* Header */}
      <div className="flex items-center px-4 py-4 bg-bg-secondary sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-border-light transition-colors text-text-primary">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary ml-2">Wallet</h1>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-6 px-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-tr from-[#4C8684] to-[#80C1BF] text-white p-6 rounded-[32px] shadow-lg relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
          
          <p className="text-sm font-medium opacity-80 mb-1">Available Balance</p>
          <h2 className="text-4xl font-black mb-6">₹{balance.toFixed(2)}</h2>
          
          <div className="flex justify-between items-center opacity-85 text-xs font-mono tracking-wider">
            <span>TailCircle Wallet</span>
            <span>TailCircle Pay</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-around bg-white p-4 rounded-[24px] shadow-sm mb-6 border border-border-light">
          <button onClick={() => setActiveModal('add')} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-primary-light/20 text-primary-main flex items-center justify-center group-hover:bg-primary-main group-hover:text-white transition-colors">
              <Plus size={24} />
            </div>
            <span className="text-xs font-semibold text-text-primary">Add</span>
          </button>
          
          <button onClick={() => setActiveModal('send')} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-primary-light/20 text-primary-main flex items-center justify-center group-hover:bg-primary-main group-hover:text-white transition-colors">
              <Send size={20} />
            </div>
            <span className="text-xs font-semibold text-text-primary">Send</span>
          </button>
          
          <button onClick={() => setActiveModal('pay')} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-primary-light/20 text-primary-main flex items-center justify-center group-hover:bg-primary-main group-hover:text-white transition-colors">
              <ScanLine size={20} />
            </div>
            <span className="text-xs font-semibold text-text-primary">Pay</span>
          </button>
        </div>

        {/* Transactions list header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text-primary">Recent Activity</h3>
          <button className="text-sm font-semibold text-primary-main">See All</button>
        </div>

        {/* Transaction entries */}
        <div className="space-y-3">
          {transactions.map(t => (
            <div key={t.id} className="bg-white p-4 rounded-[20px] flex items-center border border-border-light shadow-sm">
              <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-xl shrink-0">
                {t.icon}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <h4 className="font-bold text-text-primary text-sm leading-tight truncate">{t.title}</h4>
                <p className="text-xs text-text-secondary mt-1">{t.date}</p>
              </div>
              <div className="text-right pl-2 shrink-0">
                <span className={`font-black text-sm ${t.type === 'credit' ? 'text-success' : 'text-text-primary'}`}>
                  {t.type === 'credit' ? '+' : '-'}₹{Math.abs(t.amount).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- ADD MONEY MODAL --- */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => !isProcessing && !processSuccess && setActiveModal(null)} />
          <div className="bg-white rounded-t-3xl p-6 relative z-10 animate-in slide-in-from-bottom-full pb-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>
            
            {processSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                  <CheckCircle2 size={56} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-slate-950">Money Added Successfully!</h3>
                <p className="text-slate-500 text-sm mt-1">₹{parseFloat(amountToAdd).toFixed(2)} added to your wallet.</p>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-main rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-bold text-sm">Processing Payment Securely...</p>
              </div>
            ) : (
              <form onSubmit={handleAddMoney} className="flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-extrabold text-slate-900">Add Money</h2>
                  <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enter Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={amountToAdd}
                    onChange={(e) => setAmountToAdd(e.target.value)}
                    placeholder="Enter amount to add" 
                    className="w-full bg-slate-50 border border-slate-200 h-14 rounded-2xl px-4 font-black text-xl outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main"
                  />
                  <div className="flex gap-2 mt-1">
                    {['100', '500', '1000', '2000'].map(preset => (
                      <button 
                        key={preset}
                        type="button"
                        onClick={() => setAmountToAdd(preset)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                          amountToAdd === preset 
                            ? 'bg-primary-main border-primary-main text-white' 
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        +₹{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === 'upi' ? 'border-primary-main bg-primary-light/5' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <Smartphone className={paymentMethod === 'upi' ? "text-primary-main" : "text-slate-400"} size={22} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">UPI / Mobile App</p>
                        <p className="text-[10px] text-slate-400">Google Pay, PhonePe, Paytm</p>
                      </div>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === 'card' ? 'border-primary-main bg-primary-light/5' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <CreditCard className={paymentMethod === 'card' ? "text-primary-main" : "text-slate-400"} size={22} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Credit / Debit Card</p>
                        <p className="text-[10px] text-slate-400">Pay with any saved or new card via Razorpay</p>
                      </div>
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl mt-2 text-base">
                  Proceed to Pay ₹{parseFloat(amountToAdd || 0).toFixed(2)}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- SEND MONEY MODAL --- */}
      {activeModal === 'send' && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => !isProcessing && !processSuccess && setActiveModal(null)} />
          <div className="bg-white rounded-t-3xl p-6 relative z-10 animate-in slide-in-from-bottom-full pb-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>

            {processSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                  <CheckCircle2 size={56} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-slate-950">Payment Sent Successfully!</h3>
                <p className="text-slate-500 text-sm mt-1">₹{parseFloat(amountToSend).toFixed(2)} sent to {selectedContact?.name || sendPhone}.</p>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-main rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-bold text-sm">Transferring Funds...</p>
              </div>
            ) : (
              <form onSubmit={handleSendMoney} className="flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-extrabold text-slate-900">Send Money</h2>
                  <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                {/* Recipient Selection */}
                {contacts.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Chats</label>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                      {contacts.map(c => {
                        const isSel = selectedContact?.id === c.id;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => { setSelectedContact(c); setSendPhone(''); }}
                            className={`flex flex-col items-center p-3 rounded-2xl border shrink-0 transition-all ${
                              isSel ? 'border-primary-main bg-primary-light/10 ring-2 ring-primary-main/10' : 'border-slate-100 bg-slate-50'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm mb-2">
                              {c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-400" />}
                            </div>
                            <span className="text-xs font-bold text-slate-900 leading-tight w-20 text-center truncate">{c.name.split(' ')[0]}</span>
                            <span className="text-[9px] text-slate-400 truncate w-20 text-center">{c.role}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Real recipient by phone number */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Or Send by Phone Number</label>
                  <input
                    type="tel"
                    value={sendPhone}
                    onChange={(e) => { setSendPhone(e.target.value); setSelectedContact(null); }}
                    placeholder="Recipient's phone number"
                    className="w-full bg-slate-50 border border-slate-200 h-12 rounded-xl px-3 text-sm outline-none focus:border-primary-main"
                  />
                </div>

                {/* Amount input */}
                {(selectedContact || sendPhone) && (
                  <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                        <span className="text-xs font-bold text-slate-400">Available: ₹{balance.toFixed(2)}</span>
                      </div>
                      <input 
                        type="number"
                        required
                        max={balance}
                        value={amountToSend}
                        onChange={(e) => setAmountToSend(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full bg-slate-50 border border-slate-200 h-14 rounded-2xl px-4 font-black text-xl outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main"
                      />
                      {parseFloat(amountToSend) > balance && (
                        <p className="text-xs text-error font-bold mt-1">Insufficient wallet balance.</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note (Optional)</label>
                      <input 
                        type="text"
                        value={sendNote}
                        onChange={(e) => setSendNote(e.target.value)}
                        placeholder="What is this transfer for?"
                        className="w-full bg-slate-50 border border-slate-200 h-12 rounded-xl px-3 text-sm outline-none focus:border-primary-main"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={!amountToSend || parseFloat(amountToSend) <= 0 || parseFloat(amountToSend) > balance}
                      className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl mt-2 text-base disabled:opacity-50 disabled:shadow-none"
                    >
                      Send ₹{parseFloat(amountToSend || 0).toFixed(2)} to {selectedContact ? selectedContact.name.split(' ')[0] : sendPhone}
                    </Button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- SCAN & PAY QR MODAL --- */}
      {activeModal === 'pay' && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => !isProcessing && !processSuccess && setActiveModal(null)} />
          <div className="bg-white rounded-t-3xl p-6 relative z-10 animate-in slide-in-from-bottom-full pb-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>

            {processSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                  <CheckCircle2 size={56} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-slate-950">Payment Successful!</h3>
                <p className="text-slate-500 text-sm mt-1">₹{parseFloat(amountToPay).toFixed(2)} paid to {scannedMerchant?.name}.</p>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-main rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary font-bold text-sm">Processing Payment securely...</p>
              </div>
            ) : scanStep === 'scan' ? (
              <div className="flex flex-col items-center gap-6">
                <div className="flex justify-between items-center w-full">
                  <h2 className="text-xl font-extrabold text-slate-900">Scan QR Code</h2>
                  <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                {/* Camera-based QR decoding isn't wired up yet — shown as a
                    dormant viewfinder, with a real manual UPI entry below
                    rather than a button that fakes a successful scan. */}
                <div className="w-64 h-64 bg-slate-950 rounded-3xl relative overflow-hidden border-4 border-slate-800 flex items-center justify-center shadow-lg">
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-primary-main rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-primary-main rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-primary-main rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-primary-main rounded-br-lg"></div>

                  <QrCode size={96} className="text-slate-700 opacity-60" />
                </div>

                <p className="text-slate-400 text-xs text-center font-medium px-6 leading-relaxed">
                  Camera scanning isn't available yet — enter the merchant's UPI ID below instead.
                </p>

                <form onSubmit={handleManualUpiEntry} className="w-full flex flex-col gap-3">
                  <input
                    type="text"
                    required
                    value={manualUpiId}
                    onChange={(e) => setManualUpiId(e.target.value)}
                    placeholder="merchant@upi"
                    className="w-full bg-slate-50 border border-slate-200 h-12 rounded-xl px-4 text-sm font-medium outline-none focus:border-primary-main"
                  />
                  <Button
                    type="submit"
                    disabled={!manualUpiId.trim()}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Continue to Pay
                  </Button>
                </form>
              </div>
            ) : (
              // Confirm Merchant Scan payment step
              <div className="flex flex-col gap-5 animate-in slide-in-from-right-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-extrabold text-slate-900">Verify & Pay</h2>
                  <button type="button" onClick={() => { setScanStep('scan'); setScannedMerchant(null); }} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={20} />
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-4 items-center">
                  <div className="w-12 h-12 bg-primary-light/20 text-primary-main rounded-xl flex items-center justify-center">
                    <QrCode size={24} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{scannedMerchant.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{scannedMerchant.upiId}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount to Pay (₹)</label>
                    <span className="text-xs font-bold text-slate-400">Available: ₹{balance.toFixed(2)}</span>
                  </div>
                  <input 
                    type="number"
                    required
                    max={balance}
                    value={amountToPay}
                    onChange={(e) => setAmountToPay(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-slate-50 border border-slate-200 h-14 rounded-2xl px-4 font-black text-xl outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main"
                  />
                  {parseFloat(amountToPay) > balance && (
                    <p className="text-xs text-error font-bold mt-1">Insufficient wallet balance.</p>
                  )}
                </div>

                <Button 
                  onClick={handlePayMerchant}
                  disabled={!amountToPay || parseFloat(amountToPay) <= 0 || parseFloat(amountToPay) > balance}
                  className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl mt-2 text-base disabled:opacity-50"
                >
                  Pay ₹{parseFloat(amountToPay || 0).toFixed(2)} Securely
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

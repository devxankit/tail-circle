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

  const contacts = [
    { id: 1, name: 'Dr. Sarah Jenkins', role: 'Veterinarian', avatar: '🩺' },
    { id: 2, name: 'Aakash Sharma', role: 'Groomer', avatar: '✂️' },
    { id: 3, name: 'Emma Watson', role: 'Pet Playdate', avatar: '🐕' },
    { id: 4, name: 'TailShop Store', role: 'Supplies Partner', avatar: '🛍️' }
  ];

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

  // Send money submit handler
  const handleSendMoney = async (e) => {
    e.preventDefault();
    const val = parseFloat(amountToSend);
    if (!selectedContact || isNaN(val) || val <= 0 || val > balance) return;

    setIsProcessing(true);
    try {
      await sendMoney({
        name: selectedContact.name,
        icon: selectedContact.avatar,
        title: `Sent to ${selectedContact.name}`,
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
        setAmountToSend('');
        setSendNote('');
      }, 1500);
    } catch {
      setIsProcessing(false);
    }
  };

  // Scan QR simulator handler (camera/QR is a genuine client concern).
  const handleSimulateScan = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setScannedMerchant({
        name: 'TailCircle Shop Counter #3',
        upiId: 'tailcircle@paytm'
      });
      setAmountToPay('249.00');
      setScanStep('confirm');
    }, 1000);
  };

  // Confirm Scan Pay handler
  const handlePayMerchant = async () => {
    const val = parseFloat(amountToPay);
    if (isNaN(val) || val <= 0 || val > balance) return;

    setIsProcessing(true);
    try {
      await payMerchant({
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
      {/* CSS Animation Injector for Laser Scanner */}
      <style>{`
        @keyframes scanLine {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>

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
            <span>**** **** **** 4829</span>
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
                        <p className="text-[10px] text-slate-400">Saved Visa Card ending 4829</p>
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
                <p className="text-slate-500 text-sm mt-1">₹{parseFloat(amountToSend).toFixed(2)} sent to {selectedContact?.name}.</p>
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
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Contact</label>
                  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                    {contacts.map(c => {
                      const isSel = selectedContact?.id === c.id;
                      return (
                        <button 
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedContact(c)}
                          className={`flex flex-col items-center p-3 rounded-2xl border shrink-0 transition-all ${
                            isSel ? 'border-primary-main bg-primary-light/10 ring-2 ring-primary-main/10' : 'border-slate-100 bg-slate-50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-lg mb-2">
                            {c.avatar}
                          </div>
                          <span className="text-xs font-bold text-slate-900 leading-tight w-20 text-center truncate">{c.name.split(' ')[0]}</span>
                          <span className="text-[9px] text-slate-400">{c.role}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount input */}
                {selectedContact && (
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
                      Send ₹{parseFloat(amountToSend || 0).toFixed(2)} to {selectedContact.name.split(' ')[0]}
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

                {/* QR Scanner view screen box simulator */}
                <div className="w-64 h-64 bg-slate-950 rounded-3xl relative overflow-hidden border-4 border-slate-800 flex items-center justify-center shadow-lg">
                  {/* Glowing Laser Red scan line */}
                  <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_#34D399] z-10" style={{ animation: 'scanLine 2.5s ease-in-infinite' }}></div>
                  
                  {/* Simulated corner frames */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-primary-main rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-primary-main rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-primary-main rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-primary-main rounded-br-lg"></div>
                  
                  <QrCode size={96} className="text-slate-700 opacity-60 animate-pulse" />
                </div>

                <p className="text-slate-400 text-xs text-center font-medium px-6 leading-relaxed">
                  Hold your camera up to a merchant's TailCircle Pay QR code to complete payments automatically.
                </p>

                <Button 
                  onClick={handleSimulateScan} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2"
                >
                  <SparklesIcon /> Simulate Successful Scan
                </Button>
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

// Quick component for sparkle icon
function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z"/>
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>
    </svg>
  );
}

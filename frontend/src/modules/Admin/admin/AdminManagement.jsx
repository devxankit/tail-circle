import React, { useState } from 'react';
import { UserCheck, ShieldAlert, Heart, Landmark, ClipboardList, Check, Trash2, Edit, Plus, Star, X, Settings } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export function AdminManagement() {
  const [activeTab, setActiveTab] = useState('users');

  // Modal triggers
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [rejectReason, setRejectReason] = useState('Incomplete documents');
  const [customRejectText, setCustomRejectText] = useState('');

  // 1. User Moderation state
  const [users, setUsers] = useState([
    { id: 'USR-001', name: 'Rahul Kumar', email: 'rahul@example.com', city: 'Indore', pets: 3, status: 'Active', kyc: 'Verified' },
    { id: 'USR-002', name: 'Aisha Khan', email: 'aisha@example.com', city: 'Mumbai', pets: 2, status: 'Pending', kyc: 'Pending' },
    { id: 'USR-003', name: 'Priya Dev', email: 'priya@example.com', city: 'Pune', pets: 1, status: 'Active', kyc: 'Verified' }
  ]);

  // 2. Pet Breed Builder state
  const [breeds, setBreeds] = useState([
    { id: 1, species: 'Dog', breed: 'Golden Retriever', status: 'Approved' },
    { id: 2, species: 'Dog', breed: 'German Shepherd', status: 'Approved' },
    { id: 3, species: 'Cat', breed: 'Persian Cat', status: 'Approved' }
  ]);
  const [newBreed, setNewBreed] = useState({ species: 'Dog', breed: '' });

  // 3. Vendor Auditing KYC state
  const [vendors, setVendors] = useState([
    { id: 'VND-101', name: 'Happy Paws Clinic', type: 'Doctor', doc: 'Practice_License.pdf', commission: '10', status: 'Pending' },
    { id: 'VND-102', name: 'Gourmet Pet Foods', type: 'Meal', doc: 'Food_Safety_Cert.pdf', commission: '12', status: 'Pending' },
    { id: 'VND-103', name: 'Max Daycare Store', type: 'Shop', doc: 'Shop_Registry.pdf', commission: '15', status: 'Verified' }
  ]);

  // 4. Saturday Trials config
  const [trialRules, setTrialRules] = useState({
    limitOnePerClient: true,
    saturdayDeliveryRouting: true,
    trialPricing: '250',
    trialActive: true
  });

  // 5. Feeds & Moderation state
  const [reports, setReports] = useState([
    { id: 'RPT-501', type: 'Post Feed', content: 'Unrelated advertisement spam', reason: 'Commercial Spam', reporter: 'Aisha Khan' },
    { id: 'RPT-502', type: 'Review Comment', content: 'Foul language used in seller rating', reason: 'Abusive language', reporter: 'Rahul Kumar' }
  ]);

  // 6. CMS Banners & FAQ state
  const [banners, setBanners] = useState([
    { id: 1, title: 'Summer Monsoon Discounts: 15% OFF', slot: 'Home Hero', active: true },
    { id: 2, title: 'Register Saturday Free Meal Trials', slot: 'Services Page', active: true }
  ]);
  const [newBanner, setNewBanner] = useState({ title: '', slot: 'Home Hero' });

  // 7. Financials and settlements state
  const [refunds, setRefunds] = useState([
    { id: 'TXN-901', customer: 'Rahul Kumar', amount: '₹1,500', reason: 'Event cancelled', status: 'Pending Approve' },
    { id: 'TXN-902', customer: 'Priya Dev', amount: '₹850', reason: 'Incorrect product sizing shipped', status: 'Pending Approve' }
  ]);

  // Helper actions
  const handleToggleUserStatus = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' } : u));
  };

  const handleVerifyKyc = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, kyc: 'Verified' } : u));
  };

  const handleAddBreed = (e) => {
    e.preventDefault();
    if (!newBreed.breed) return;
    setBreeds(prev => [...prev, { id: Date.now(), species: newBreed.species, breed: newBreed.breed, status: 'Approved' }]);
    setNewBreed({ species: 'Dog', breed: '' });
  };

  const handleVendorApproval = (id, verify) => {
    if (verify) {
      setVendors(prev => prev.map(v => v.id === id ? { ...v, status: 'Verified' } : v));
    } else {
      setSelectedVendor(id);
      setRejectModalOpen(true);
    }
  };

  const handleRejectConfirm = () => {
    setVendors(prev => prev.filter(v => v.id !== selectedVendor));
    setRejectModalOpen(false);
    setSelectedVendor(null);
    setCustomRejectText('');
  };

  const handleVendorCommission = (id, rate) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, commission: rate } : v));
  };

  const handleDismissReport = (id) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleCreateBanner = (e) => {
    e.preventDefault();
    if (!newBanner.title) return;
    setBanners(prev => [...prev, { id: Date.now(), title: newBanner.title, slot: newBanner.slot, active: true }]);
    setNewBanner({ title: '', slot: 'Home Hero' });
  };

  const handleApproveRefund = (id) => {
    setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: 'Settled' } : r));
  };

  return (
    <div className="space-y-6">
      {/* 7 tabs command bar */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'users', label: 'Users Moderation' },
          { id: 'pets', label: 'Pet Breed Builder' },
          { id: 'vendors', label: 'KYC Partner Audits' },
          { id: 'trials', label: 'Meal Trial Config' },
          { id: 'moderation', label: 'Feeds Moderation' },
          { id: 'cms', label: 'CMS Banners' },
          { id: 'financials', label: 'Refund approvals' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === tab.id ? 'border-purple-600 text-purple-600 font-extrabold' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render sub-dashboard cards depending on tab */}

      {/* 1. USERS MODERATION */}
      {activeTab === 'users' && (
        <DataTable
          columns={[
            { key: 'id', label: 'User ID' },
            { key: 'name', label: 'Client Name', sortable: true },
            { key: 'email', label: 'Email Coordinate' },
            { key: 'city', label: 'City Location' },
            { key: 'pets', label: 'Pets Profiles', sortable: true },
            {
              key: 'kyc',
              label: 'KYC Status',
              render: (row) => (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                  row.kyc === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {row.kyc}
                </span>
              )
            },
            {
              key: 'status',
              label: 'State',
              render: (row) => (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                  row.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {row.status}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Audit Operation',
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  {row.kyc === 'Pending' && (
                    <button
                      onClick={() => handleVerifyKyc(row.id)}
                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Verify KYC
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleUserStatus(row.id)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                      row.status === 'Active' 
                        ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                    }`}
                  >
                    {row.status === 'Active' ? 'Suspend' : 'Un-Suspend'}
                  </button>
                </div>
              )
            }
          ]}
          data={users}
          searchKey="name"
          searchPlaceholder="Search owners name..."
        />
      )}

      {/* 2. PET BREED DICTIONARY */}
      {activeTab === 'pets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DataTable
              columns={[
                { key: 'species', label: 'Pet Species', sortable: true },
                { key: 'breed', label: 'Breed Reference', sortable: true },
                { key: 'status', label: 'Vetting status' },
                {
                  key: 'actions',
                  label: 'Action',
                  render: (row) => (
                    <button
                      onClick={() => setBreeds(prev => prev.filter(b => b.id !== row.id))}
                      className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-50 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                }
              ]}
              data={breeds}
              searchKey="breed"
              searchPlaceholder="Search breed dictionary..."
            />
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
              Register New Breed Map
            </h4>
            <form onSubmit={handleAddBreed} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Species Type *</label>
                <select
                  value={newEvent.species}
                  onChange={(e) => setNewBreed({ ...newBreed, species: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                >
                  <option value="Dog">Dog Species</option>
                  <option value="Cat">Cat Species</option>
                  <option value="Bird">Bird Species</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Breed Sub-Name *</label>
                <input
                  type="text"
                  required
                  value={newBreed.breed}
                  onChange={(e) => setNewBreed({ ...newBreed, breed: e.target.value })}
                  placeholder="e.g. Rottweiler"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Save Breed</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. VENDOR AUDITING */}
      {activeTab === 'vendors' && (
        <DataTable
          columns={[
            { key: 'name', label: 'Business Partner Name', sortable: true },
            { key: 'type', label: 'Module Category' },
            { 
              key: 'doc', 
              label: 'Vetting Documents',
              render: (row) => (
                <button className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer">
                  {row.doc}
                </button>
              )
            },
            {
              key: 'commission',
              label: 'Platform Commission (%)',
              render: (row) => (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={row.commission}
                    onChange={(e) => handleVendorCommission(row.id, e.target.value)}
                    className="w-14 px-1 py-0.5 border border-gray-200 rounded text-center text-xs font-bold"
                  />
                  <span className="text-xs font-medium text-gray-400">%</span>
                </div>
              )
            },
            {
              key: 'status',
              label: 'KYC Vetting',
              render: (row) => (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                  row.status === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {row.status}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Audit Decision',
              render: (row) => (
                row.status === 'Pending' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleVendorApproval(row.id, true)}
                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Approve Partner
                    </button>
                    <button
                      onClick={() => handleVendorApproval(row.id, false)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-semibold hover:bg-red-700 transition cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400 font-bold flex items-center gap-0.5">
                    <Check size={12} className="text-emerald-500" /> Vetted
                  </span>
                )
              )
            }
          ]}
          data={vendors}
          searchKey="name"
          searchPlaceholder="Search pending partner applications..."
        />
      )}

      {/* 4. SATURDAY TRIALS CONFIG */}
      {activeTab === 'trials' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-xl">
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-6 pb-2 border-b border-gray-100">
            Saturday Meal Subscription Defaults
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div>
                <p className="text-xs font-bold text-gray-800 uppercase">Limit: One free trial per client</p>
                <p className="text-xs text-gray-400 mt-0.5">Lock subscription trials strictly to a single account allocation</p>
              </div>
              <input
                type="checkbox"
                checked={trialRules.limitOnePerClient}
                onChange={(e) => setTrialRules({ ...trialRules, limitOnePerClient: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div>
                <p className="text-xs font-bold text-gray-800 uppercase">Saturday dispatch routing</p>
                <p className="text-xs text-gray-400 mt-0.5">Enforce system to queue meal dispatches exclusively on Saturdays</p>
              </div>
              <input
                type="checkbox"
                checked={trialRules.saturdayDeliveryRouting}
                onChange={(e) => setTrialRules({ ...trialRules, saturdayDeliveryRouting: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div>
                <p className="text-xs font-bold text-gray-800 uppercase">Default trial setup pricing (₹)</p>
                <p className="text-xs text-gray-400 mt-0.5">Registration validation fees charged for initiating free trial</p>
              </div>
              <input
                type="number"
                value={trialRules.trialPricing}
                onChange={(e) => setTrialRules({ ...trialRules, trialPricing: e.target.value })}
                className="w-20 px-2 py-1 border border-gray-200 rounded text-center text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. FEEDS & REVIEWS MODERATION */}
      {activeTab === 'moderation' && (
        <DataTable
          columns={[
            { key: 'type', label: 'Vetting Type', sortable: true },
            { key: 'content', label: 'Reported Content Details' },
            { key: 'reason', label: 'Violation Filed', sortable: true },
            { key: 'reporter', label: 'Flagged By' },
            {
              key: 'actions',
              label: 'Moderation Control',
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setReports(prev => prev.filter(r => r.id !== row.id))}
                    className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-semibold hover:bg-red-700 transition cursor-pointer"
                  >
                    Remove Post
                  </button>
                  <button
                    onClick={() => handleDismissReport(row.id)}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-semibold hover:bg-gray-200 transition cursor-pointer"
                  >
                    Dismiss Report
                  </button>
                </div>
              )
            }
          ]}
          data={reports}
          emptyMessage="Flagged review comments clean."
        />
      )}

      {/* 6. CMS BANNERS & FAQS */}
      {activeTab === 'cms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DataTable
              columns={[
                { key: 'title', label: 'Promotion Banner Title', sortable: true },
                { key: 'slot', label: 'Display Slot Placement' },
                {
                  key: 'active',
                  label: 'Status Toggle',
                  render: (row) => (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[10px] font-bold uppercase inline-block">
                      Active
                    </span>
                  )
                },
                {
                  key: 'actions',
                  label: 'Action',
                  render: (row) => (
                    <button
                      onClick={() => setBanners(prev => prev.filter(b => b.id !== row.id))}
                      className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-50 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                }
              ]}
              data={banners}
            />
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
              Publish Banners Promotion
            </h4>
            <form onSubmit={handleCreateBanner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Display Placement Slot *</label>
                <select
                  value={newBanner.slot}
                  onChange={(e) => setNewBanner({ ...newBanner, slot: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                >
                  <option value="Home Hero">Home Hero Top</option>
                  <option value="Services Page">Services Page banner</option>
                  <option value="Shop Sidebar">Shop Sidebar Promo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  placeholder="e.g. Free Grooming consultation Sat"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Upload Banner</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. FINANCIALS & REFUNDS */}
      {activeTab === 'financials' && (
        <DataTable
          columns={[
            { key: 'id', label: 'Transaction ID' },
            { key: 'customer', label: 'Client Name', sortable: true },
            { key: 'amount', label: 'Escrow Amount', sortable: true },
            { key: 'reason', label: 'Reason Filed' },
            {
              key: 'status',
              label: 'Escrow State',
              render: (row) => (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                  row.status === 'Settled' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                }`}>
                  {row.status}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Refund Decision',
              render: (row) => (
                row.status === 'Pending Approve' ? (
                  <button
                    onClick={() => handleApproveRefund(row.id)}
                    className="px-2.5 py-1 bg-purple-600 text-white rounded text-[10px] font-semibold hover:bg-purple-700 transition cursor-pointer"
                  >
                    Approve Refund
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-400 font-bold flex items-center gap-0.5">
                    <Check size={12} className="text-emerald-500" /> Settled
                  </span>
                )
              )
            }
          ]}
          data={refunds}
          searchKey="customer"
          searchPlaceholder="Search customer refunds query..."
        />
      )}

      {/* Vendor KYC Rejection Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Pending Partner KYC"
        footer={(
          <>
            <button
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg text-gray-500 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Reject Partner
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Rejection Reason Category *</label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            >
              <option value="Incomplete documents">Incomplete licensing documents</option>
              <option value="Invalid credentials">Invalid registration certificates</option>
              <option value="Policy violation">Terms of use violations</option>
              <option value="Other">Other Reasons</option>
            </select>
          </div>

          {rejectReason === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Rejection Details *</label>
              <textarea
                required
                value={customRejectText}
                onChange={(e) => setCustomRejectText(e.target.value)}
                placeholder="List down details of rejection to inform partner email coordinates."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[90px] bg-white"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
export default AdminManagement;
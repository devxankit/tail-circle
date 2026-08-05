import React, { useState, useMemo, useEffect } from 'react';
import { Search, FileText, CheckCircle, XCircle, AlertTriangle, Eye, RefreshCw, X, Download, UserCheck } from 'lucide-react';
import { StatusBadge, ActionMenu, PageHeader, StatCard, Pagination } from '../../components/VendorShared';
import { fetchAllAdminDocuments, verifyAdminDocument } from '../../../../../services/admin';

export function VendorDocuments() {
  const [documents, setDocuments] = useState([]);

  const load = () => fetchAllAdminDocuments().then(setDocuments).catch(() => {});
  useEffect(() => { load(); }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('All Document Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [vendorTypeFilter, setVendorTypeFilter] = useState('All Vendor Types');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  const [selectedDoc, setSelectedDoc] = useState(null);

  const persistDoc = async (id, action) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    try { await verifyAdminDocument(doc.vendorId, doc.kind, action); } catch { load(); }
  };

  const handleVerifyDoc = (id) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'Verified', verifiedBy: 'Admin' } : d));
    persistDoc(id, 'verify');
  };

  const handleRejectDoc = (id) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'Rejected', verifiedBy: 'Admin' } : d));
    persistDoc(id, 'reject');
  };

  const handleRequestReupload = (id) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'Re-upload', verifiedBy: '—' } : d));
    persistDoc(id, 'reupload');
  };

  const getOptions = (doc) => {
    const base = [
      { label: 'View Document', icon: FileText, onClick: () => setSelectedDoc(doc) }
    ];
    if (doc.status !== 'Verified') {
      base.push({ label: 'Verify', icon: CheckCircle, onClick: () => handleVerifyDoc(doc.id) });
    } else {
      base.push({ label: 'Re-verify', icon: RefreshCw, onClick: () => handleVerifyDoc(doc.id) });
    }
    if (doc.status === 'Pending') {
      base.push({ label: 'Reject', icon: XCircle, danger: true, onClick: () => handleRejectDoc(doc.id) });
    }
    if (doc.status === 'Rejected') {
      base.push({ label: 'Request Re-upload', icon: AlertTriangle, onClick: () => handleRequestReupload(doc.id) });
    }
    return base;
  };

  const getDocStatusBadge = (status) => {
    if (status === 'Verified') return <span className="flex items-center gap-1.5 text-[#66B4B1] font-bold text-sm"><CheckCircle size={16} /> Verified</span>;
    if (status === 'Pending') return <span className="flex items-center gap-1.5 text-amber-500 font-bold text-sm"><div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"/> Pending</span>;
    if (status === 'Rejected') return <span className="flex items-center gap-1.5 text-red-500 font-bold text-sm"><XCircle size={16} /> Rejected</span>;
    if (status === 'Re-upload') return <span className="flex items-center gap-1.5 text-amber-600 font-bold text-sm"><AlertTriangle size={16} /> Re-upload</span>;
    return null;
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = d.vendor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.docType.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchDocType = docTypeFilter === 'All Document Types' || 
                           (docTypeFilter === 'License' && d.docType.toLowerCase().includes('license')) ||
                           (docTypeFilter === 'ID Proof' && d.docType.toLowerCase().includes('proof')) ||
                           (docTypeFilter === 'GST' && d.docType.toLowerCase().includes('gst'));
      
      const matchStatus = statusFilter === 'All Status' || 
                           d.status === statusFilter || 
                           (statusFilter === 'Re-upload Requested' && d.status === 'Re-upload');
      
      const matchVendorType = vendorTypeFilter === 'All Vendor Types' || d.type === vendorTypeFilter;

      return matchSearch && matchDocType && matchStatus && matchVendorType;
    });
  }, [documents, searchQuery, docTypeFilter, statusFilter, vendorTypeFilter]);

  const stats = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter(d => d.status === 'Verified').length;
    const pending = documents.filter(d => d.status === 'Pending').length;
    const rejected = documents.filter(d => d.status === 'Rejected' || d.status === 'Re-upload').length;
    return { total, verified, pending, rejected };
  }, [documents]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Vendor Documents" 
        subtitle="Document verification center" 
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard title="Total Documents" value={stats.total} />
        <StatCard title="Verified" value={stats.verified} />
        <StatCard title="Pending Review" value={stats.pending} />
        <StatCard title="Rejected/Re-upload" value={stats.rejected} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 mb-6">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search vendor or doc..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20 focus:border-[#66B4B1] transition"
            />
          </div>
          <div className="flex flex-col sm:flex-row flex-1 gap-2 sm:gap-3 w-full">
            <select 
              value={docTypeFilter} 
              onChange={(e) => setDocTypeFilter(e.target.value)} 
              className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20"
            >
              <option>All Document Types</option>
              <option>License</option>
              <option>ID Proof</option>
              <option>GST</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20"
            >
              <option>All Status</option>
              <option>Verified</option>
              <option>Pending</option>
              <option>Rejected</option>
              <option>Re-upload Requested</option>
            </select>
            <select 
              value={vendorTypeFilter} 
              onChange={(e) => setVendorTypeFilter(e.target.value)} 
              className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#66B4B1]/20"
            >
              <option>All Vendor Types</option>
              <option>Shop</option>
              <option>Meal</option>
              <option>Doctor</option>
              <option>Event</option>
              <option>Memorial</option>
            </select>
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden divide-y md:divide-y-0 md:gap-4 md:p-4 divide-gray-100">
          {paginatedDocuments.length > 0 ? paginatedDocuments.map((d) => (
            <div key={d.id} className="p-4 md:rounded-2xl md:border md:border-[#FAF7F2] flex flex-col gap-3.5 bg-white transition shadow-sm md:shadow-none">
              
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 leading-tight mb-0.5">
                      {d.docType}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">{d.vendor}</p>
                  </div>
                </div>
                <ActionMenu options={getOptions(d)} />
              </div>

              {/* Tags/Info Row */}
              <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[52px]">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">{d.type}</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                  {d.date}
                </span>
                {getDocStatusBadge(d.status)}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-100 pl-0 sm:pl-[52px]">
                <button onClick={() => setSelectedDoc(d)} className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[13px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10">
                  <FileText size={14} /> View PDF
                </button>
                <button onClick={() => setSelectedDoc(d)} className="flex-1 py-2 bg-[#66B4B1] text-white hover:bg-[#66B4B1] rounded-lg text-[13px] font-bold transition flex items-center justify-center shadow-sm shadow-[#66B4B1]/10">
                  Review
                </button>
              </div>
              
            </div>
          )) : (
            <div className="p-8 md:col-span-2 text-center text-gray-500 font-medium text-sm">
              No matching documents found.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Document Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Uploaded On</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Verified By</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedDocuments.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{d.vendor}</td>
                  <td className="px-6 py-4 text-sm text-gray-505 font-medium whitespace-nowrap">{d.type}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">{d.docType}</td>
                  <td className="px-6 py-4 text-sm text-gray-505 whitespace-nowrap">{d.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => setSelectedDoc(d)} 
                      className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                    >
                      <FileText size={16} /> View PDF
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getDocStatusBadge(d.status)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-400 whitespace-nowrap">{d.verifiedBy}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button 
                        onClick={() => setSelectedDoc(d)} 
                        className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-bold hover:bg-[#FAF7F2] transition whitespace-nowrap"
                      >
                        Review
                      </button>
                      <ActionMenu options={getOptions(d)} />
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedDocuments.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500 font-medium">No matching documents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalPages > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Show</span>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#66B4B1]">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span>entries</span>
            </div>
            
            <Pagination 
              current={currentPage} 
              total={filteredDocuments.length} 
              pages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </div>

      {/* Slide-out Drawer for Document Reviewing */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedDoc(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">{selectedDoc.docType}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{selectedDoc.vendor} • {selectedDoc.type}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Status</span>
                  <div className="flex items-center">
                    {getDocStatusBadge(selectedDoc.status)}
                  </div>
                </div>
                {selectedDoc.verifiedBy !== '—' && (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Verified By</span>
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-1"><UserCheck size={14} className="text-[#66B4B1]" /> {selectedDoc.verifiedBy}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Document Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">File Name</span>
                    <span className="text-xs font-mono font-bold text-gray-800 truncate block">{selectedDoc.docUrl}</span>
                  </div>
                  <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Upload Date</span>
                    <span className="text-xs font-bold text-gray-800 block">{selectedDoc.date}</span>
                  </div>
                </div>
              </div>

              {/* Document Preview — links to the real uploaded file, no fake preview. */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Document Preview</h4>
                <div className="border border-gray-200 rounded-2xl bg-gray-50 flex flex-col items-center justify-center p-8 text-center h-48 border-dashed">
                  <FileText size={48} className="text-gray-400 mb-3" />
                  <p className="text-sm font-bold text-gray-700">{selectedDoc.docUrl}</p>
                  {selectedDoc.url ? (
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 transition"
                    >
                      <Download size={14} /> Open File
                    </a>
                  ) : (
                    <p className="text-[11px] text-rose-500 mt-1">No file URL on record — nothing to open.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              {selectedDoc.status === 'Pending' || selectedDoc.status === 'Re-upload' ? (
                <>
                  <button 
                    onClick={() => { handleRejectDoc(selectedDoc.id); setSelectedDoc(null); }} 
                    className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition"
                  >
                    Reject Document
                  </button>
                  <button 
                    onClick={() => { handleVerifyDoc(selectedDoc.id); setSelectedDoc(null); }} 
                    className="flex-1 py-3 bg-[#66B4B1] hover:bg-[#66B4B1] text-white rounded-xl text-sm font-bold transition"
                  >
                    Approve Document
                  </button>
                </>
              ) : selectedDoc.status === 'Verified' ? (
                <>
                  <button 
                    onClick={() => { handleRejectDoc(selectedDoc.id); setSelectedDoc(null); }} 
                    className="flex-1 py-3 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    Revoke & Reject
                  </button>
                  <button 
                    onClick={() => { handleRequestReupload(selectedDoc.id); setSelectedDoc(null); }} 
                    className="flex-1 py-3 bg-white border border-amber-200 hover:bg-amber-50 text-amber-600 rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    Request Re-upload
                  </button>
                </>
              ) : selectedDoc.status === 'Rejected' ? (
                <button 
                  onClick={() => { handleRequestReupload(selectedDoc.id); setSelectedDoc(null); }} 
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition"
                >
                  Request Re-upload
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

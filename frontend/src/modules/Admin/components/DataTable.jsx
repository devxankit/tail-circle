import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, Filter, X } from 'lucide-react';
import { cn } from '../../../modules/user/utils/cn';

export function DataTable({ 
  columns = [], 
  data = [], 
  searchPlaceholder = "Search records...", 
  searchKey = "", 
  filterKey = "", 
  filterOptions = [], 
  emptyMessage = "No records found"
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Handle Filtering, Searching and Sorting
  const filteredData = useMemo(() => {
    let result = [...data];

    // Filter query
    if (activeFilter !== 'All' && filterKey) {
      result = result.filter(item => {
        const value = item[filterKey];
        return String(value).toLowerCase() === activeFilter.toLowerCase();
      });
    }

    // Search query
    if (searchQuery.trim() && searchKey) {
      result = result.filter(item => {
        const value = item[searchKey];
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        // Strip out currencies or special characters if sorting numbers
        if (typeof valA === 'string' && valA.startsWith('₹')) {
          valA = parseFloat(valA.replace(/[₹,]/g, '')) || 0;
          valB = parseFloat(valB.replace(/[₹,]/g, '')) || 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, activeFilter, searchKey, filterKey, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const startIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredData.length);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col h-full relative">
      {/* Top Header Actions (Search & Filter) */}
      {(searchKey || filterKey) && (
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
          
          {searchKey && (
            <div className="relative flex-1 w-full max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 text-[16px] sm:text-xs border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 bg-white placeholder-gray-400 font-medium"
              />
            </div>
          )}

          {/* Desktop/Tablet Filter */}
          {filterKey && filterOptions.length > 0 && (
            <>
              {/* Mobile Filter Trigger */}
              <button 
                className="w-full sm:hidden flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-full text-[16px] font-bold text-gray-700 bg-white"
                onClick={() => setMobileFilterOpen(true)}
              >
                <Filter size={16} /> Filters
              </button>

              <div className="hidden sm:flex items-center gap-2.5 self-end sm:self-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Filter By</span>
                <div className="relative">
                  <select
                    value={activeFilter}
                    onChange={(e) => {
                      setActiveFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none pl-4 pr-10 py-2.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 bg-white cursor-pointer font-bold text-gray-600"
                  >
                    <option value="All">All Categories</option>
                    {filterOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown size={14} />
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mobile Filter Bottom Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-gray-900/60 backdrop-blur-sm sm:hidden" onClick={() => setMobileFilterOpen(false)}>
          <div className="bg-white w-full rounded-t-2xl shadow-xl animate-in slide-in-from-bottom-full duration-250 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              <button onClick={() => { setActiveFilter('All'); setCurrentPage(1); }} className="text-sm font-bold text-purple-600">
                Clear All
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 min-h-[44px] text-[16px] border border-gray-200 rounded-lg focus:outline-none bg-gray-50 font-medium text-gray-800"
              >
                <option value="All">All Categories</option>
                {filterOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="p-5 border-t border-gray-100 flex flex-col gap-3">
              <button onClick={() => setMobileFilterOpen(false)} className="w-full py-3.5 bg-purple-600 text-white rounded-xl text-[16px] font-bold shadow-sm active:scale-[0.98] transition-transform min-h-[44px]">
                Apply Filters
              </button>
              <button onClick={() => setMobileFilterOpen(false)} className="w-full py-3.5 text-gray-500 font-bold text-[16px] active:scale-[0.98] transition-transform min-h-[44px]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table & Cards Container */}
      <div className="flex-1 overflow-x-auto min-h-[250px] bg-gray-50/10 sm:bg-transparent p-4 sm:p-0">
        
        {paginatedData.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table */}
            <table className="w-full text-left border-collapse hidden sm:table">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/20">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none",
                        col.sortable && "cursor-pointer hover:bg-gray-50 hover:text-gray-700 transition"
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && <ArrowUpDown size={12} className="text-gray-300" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((row, rIdx) => (
                  <tr key={row.id || rIdx} className="hover:bg-gray-50/20 transition-colors duration-150">
                    {columns.map((col) => (
                      <td key={col.key} className="p-4 text-xs font-semibold text-gray-700 max-w-xs truncate">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card List */}
            <div className="flex flex-col gap-3 sm:hidden">
              {paginatedData.map((row, rIdx) => {
                // Heuristic: identify common keys for title, status, actions
                const titleCol = columns.find(c => ['name', 'title', 'id', 'customer', 'petName'].includes(c.key)) || columns[0];
                const statusCol = columns.find(c => ['status', 'kyc', 'state'].includes(c.key));
                const actionCol = columns.find(c => ['actions', 'action'].includes(c.key));
                
                // Exclude mapped columns from metrics
                const metricCols = columns.filter(c => c !== titleCol && c !== statusCol && c !== actionCol);

                return (
                  <div key={row.id || rIdx} className="bg-white border border-[#FAF7F2] rounded-xl p-4 w-full shadow-sm">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-gray-50">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-black shrink-0">
                           {String(row[titleCol.key] || '').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-[15px] font-bold text-gray-900 truncate">
                            {titleCol.render ? titleCol.render(row) : row[titleCol.key]}
                          </p>
                        </div>
                      </div>
                      {statusCol && (
                        <div className="shrink-0">
                          {statusCol.render ? statusCol.render(row) : row[statusCol.key]}
                        </div>
                      )}
                    </div>

                    {/* Metric Rows (2 columns) */}
                    {metricCols.length > 0 && (
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4">
                        {metricCols.map(col => (
                          <div key={col.key} className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{col.label}</span>
                            <span className="text-[13px] font-semibold text-gray-700 truncate">
                              {col.render ? col.render(row) : row[col.key]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions Row */}
                    {actionCol && (
                      <div className="pt-3 border-t border-gray-50 flex items-center justify-end gap-2 w-full min-h-[44px]">
                        {actionCol.render(row)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider hidden sm:block">
            Showing <span className="text-gray-700">{startIndex}</span> to{" "}
            <span className="text-gray-700">{endIndex}</span> of{" "}
            <span className="text-gray-700">{filteredData.length}</span> entries
          </p>

          {/* Desktop/Tablet Pagination */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full border transition cursor-pointer",
                  currentPage === page
                    ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/10"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Mobile Pagination */}
          <div className="flex sm:hidden items-center justify-between w-full gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex-1 flex items-center justify-center gap-1 min-h-[44px] border border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white active:scale-[0.98] disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-xs font-bold text-gray-500 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex-1 flex items-center justify-center gap-1 min-h-[44px] border border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white active:scale-[0.98] disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
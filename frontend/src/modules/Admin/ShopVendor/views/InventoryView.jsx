import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { adjustShopStock, createShopProduct } from '../../../../services/vendor';
import {
  Package, AlertTriangle, ArrowDownToLine, RefreshCcw,
  Search, Plus, X, Upload
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function InventoryView() {
  const { products, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateReason, setUpdateReason] = useState('Restock');
  const [savingStock, setSavingStock] = useState(false);
  const [uploading, setUploading] = useState(false);

  const lowStockCount = products.filter(p => p.stock <= p.alertLimit).length;
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesStock = showOnlyLowStock ? p.stock <= p.alertLimit : true;
    return matchesSearch && matchesStock;
  });

  const handleUpdateStock = async () => {
    if (!updateAmount) return;
    const amount = parseInt(updateAmount, 10);
    const signedDelta = (updateReason === 'Restock' || updateReason === 'Return') ? amount : -amount;

    setSavingStock(true);
    try {
      const updated = await adjustShopStock(selectedProduct._id || selectedProduct.id, { delta: signedDelta });
      await refresh();
      const isNowLow = updated.stock <= updated.alertLimit;
      addToast({
        message: isNowLow && updated.stock > 0
          ? `Stock updated for ${selectedProduct.name}. Warning: now below alert limit!`
          : updated.stock === 0
            ? `${selectedProduct.name} is now OUT OF STOCK!`
            : `Stock updated for ${selectedProduct.name}. New level: ${updated.stock} units.`,
        type: updated.stock === 0 ? 'error' : isNowLow ? 'warning' : 'success'
      });
      setSelectedProduct(null);
      setUpdateAmount('');
      setUpdateReason('Restock');
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not update stock', type: 'error' });
    } finally {
      setSavingStock(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Price', 'Stock', 'Status'];
    const csvRows = [
      headers.join(','),
      ...products.map(p => [
        p.id, 
        `"${p.name.replace(/"/g, '""')}"`, 
        p.sku, 
        p.category, 
        p.price, 
        p.stock, 
        p.status
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Expects the same columns handleExportCSV writes: ID,Name,SKU,Category,Price,Stock,Status.
  // ID is ignored (a new product is always created); rows missing Name/Price/Stock are skipped.
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file) return;

    const text = await file.text();
    const [, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const rows = lines.map((line) => line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((v) => v.replace(/^"|"$/g, '').trim()) || []);
    const parsed = rows
      .map(([, name, sku, category, price, stock]) => ({ name, sku, category, price, stock }))
      .filter((r) => r.name && r.price && r.stock);

    if (!parsed.length) {
      addToast({ message: 'No valid rows found in that file (need Name, Price, Stock).', type: 'error' });
      return;
    }

    setUploading(true);
    try {
      for (const row of parsed) {
        await createShopProduct({
          name: row.name,
          category: row.category || 'Accessories',
          price: Number(row.price),
          discountPrice: Number(row.price),
          stock: Number(row.stock),
          sku: row.sku || undefined,
        });
      }
      await refresh();
      addToast({ message: `Imported ${parsed.length} product${parsed.length === 1 ? '' : 's'}.`, type: 'success' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Bulk import failed partway through', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 relative h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Inventory & Stock</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Track quantities and manage low stock alerts.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="file" 
            id="csvUpload" 
            className="hidden" 
            accept=".csv"
            onChange={handleBulkUpload}
          />
          <button
            onClick={() => document.getElementById('csvUpload').click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-slate-50 transition cursor-pointer disabled:opacity-60"
          >
            <Upload size={16} /> {uploading ? 'Importing…' : 'Bulk Upload'}
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <ArrowDownToLine size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-900">Attention: {lowStockCount} items are low on stock!</h3>
              <p className="text-xs font-semibold text-red-700">Please restock them to avoid losing sales.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            {showOnlyLowStock ? "View All Items" : "View Low Stock"}
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search inventory by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Item</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Available Stock</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Reserved</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 max-w-[250px] truncate">{product.name}</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className={cn("text-base font-black", product.stock <= 0 ? "text-red-600" : product.stock <= product.alertLimit ? "text-amber-600" : "text-slate-900")}>
                        {product.stock}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Units</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-bold text-slate-500">0</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", 
                      product.stock > product.alertLimit ? "bg-emerald-100 text-emerald-700" : 
                      product.stock > 0 ? "bg-amber-100 text-amber-700" : 
                      "bg-red-100 text-red-700"
                    )}>
                      {product.stock > product.alertLimit ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setSelectedProduct(product)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Update Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">Update Stock</h3>
              <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <img src={selectedProduct.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-white" />
                <div>
                  <p className="text-sm font-bold text-slate-900 line-clamp-1">{selectedProduct.name}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Current Stock: <span className="font-black text-slate-700">{selectedProduct.stock}</span></p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Adjustment Reason</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Restock', 'Damage', 'Return', 'Correction'].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setUpdateReason(reason)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold transition border cursor-pointer",
                        updateReason === reason ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Quantity (+ / -)</label>
                <input 
                  type="number"
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-900 focus:outline-none focus:border-slate-400 transition"
                />
              </div>

              <button
                onClick={handleUpdateStock}
                disabled={!updateAmount || savingStock}
                className="w-full py-3.5 bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition shadow-lg cursor-pointer flex justify-center items-center gap-2"
              >
                <RefreshCcw size={16} className={savingStock ? 'animate-spin' : ''} /> {savingStock ? 'Updating…' : 'Update Inventory'}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { adjustShopStock, createShopProduct } from '../../../../services/vendor';
import {
  Package, AlertTriangle, ArrowDownToLine, RefreshCcw,
  Upload
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import {
  SearchBar, StatusBadge, EmptyState, BottomSheet, PrimaryButton, CardAction, fieldClass, labelClass,
} from '../../vendor/mobile';

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
      addToast({ message: err?.response?.data?.message || err?.message || 'Could not update stock', type: 'error' });
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
      addToast({ message: err?.response?.data?.message || err?.message || 'Bulk import failed partway through', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Inventory & Stock</h2>
        <p className="text-xs text-text-secondary mt-1">Track quantities and manage low stock alerts.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="file"
          id="csvUpload"
          className="hidden"
          accept=".csv"
          onChange={handleBulkUpload}
        />
        <CardAction
          tone="outline"
          icon={Upload}
          className="flex-1"
          onClick={() => document.getElementById('csvUpload').click()}
          disabled={uploading}
        >
          {uploading ? 'Importing…' : 'Bulk Upload'}
        </CardAction>
        <CardAction tone="primary" icon={ArrowDownToLine} className="flex-1" onClick={handleExportCSV}>
          Export CSV
        </CardAction>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="bg-white border border-error/30 rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-text-primary">Attention: {lowStockCount} items are low on stock!</h3>
              <p className="text-xs font-semibold text-text-secondary">Please restock them to avoid losing sales.</p>
            </div>
          </div>
          <button
            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
            className="mt-3 w-full h-11 bg-error text-white text-sm font-bold rounded-xl transition cursor-pointer"
          >
            {showOnlyLowStock ? "View All Items" : "View Low Stock"}
          </button>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search inventory by name or SKU..." />

      {filteredProducts.length === 0 ? (
        <EmptyState icon={Package} text="No items match." />
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-bg-primary overflow-hidden shrink-0 border border-border-light">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-text-primary truncate">{product.name}</p>
                  <p className="text-[11px] font-semibold text-text-secondary mt-0.5">{product.sku}</p>
                  <StatusBadge
                    className="mt-1.5"
                    label={product.stock > product.alertLimit ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                    tone={product.stock > product.alertLimit ? 'success' : product.stock > 0 ? 'warning' : 'error'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border-light">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Available Stock</p>
                  <p className={cn("text-lg font-black leading-tight", product.stock <= 0 ? "text-error" : product.stock <= product.alertLimit ? "text-warning" : "text-text-primary")}>
                    {product.stock} <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Units</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Reserved</p>
                  <p className="text-lg font-black leading-tight text-text-secondary">0</p>
                </div>
              </div>
              <CardAction className="w-full mt-3" onClick={() => setSelectedProduct(product)}>
                Update Stock
              </CardAction>
            </div>
          ))}
        </div>
      )}

      {/* Update Stock sheet */}
      <BottomSheet
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title="Update Stock"
        footer={(
          <PrimaryButton
            tone="dark"
            onClick={handleUpdateStock}
            disabled={!updateAmount || savingStock}
            icon={RefreshCcw}
            loading={savingStock}
          >
            {savingStock ? 'Updating…' : 'Update Inventory'}
          </PrimaryButton>
        )}
      >
        {selectedProduct && (
          <div className="space-y-5 pb-2">
            <div className="flex items-center gap-3 bg-bg-primary p-3 rounded-2xl border border-border-light">
              <img src={selectedProduct.image} alt="" className="w-12 h-12 rounded-xl object-cover bg-white" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary line-clamp-1">{selectedProduct.name}</p>
                <p className="text-xs font-semibold text-text-secondary mt-1">Current Stock: <span className="font-black text-text-primary">{selectedProduct.stock}</span></p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Adjustment Reason</label>
              <div className="grid grid-cols-2 gap-2">
                {['Restock', 'Damage', 'Return', 'Correction'].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setUpdateReason(reason)}
                    className={cn(
                      "min-h-[44px] px-4 rounded-xl text-sm font-bold transition border cursor-pointer",
                      updateReason === reason ? "bg-text-primary text-white border-text-primary shadow-md" : "bg-white text-text-secondary border-border-light"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Quantity (+ / -)</label>
              <input
                type="number"
                inputMode="numeric"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                placeholder="e.g. 50"
                className={cn(fieldClass, 'text-lg font-black')}
              />
            </div>
          </div>
        )}
      </BottomSheet>

    </div>
  );
}

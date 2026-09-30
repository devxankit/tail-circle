import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { createShopProduct, updateShopProduct, deleteShopProduct, uploadVendorFile } from '../../../../services/vendor';
import {
  Search, Plus, MoreVertical, Edit2, Copy, Trash2,
  CheckCircle, AlertCircle, Image as ImageIcon, Loader2, Camera
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import {
  SearchBar, StatusBadge, CardAction, EmptyState, StickyActionBar, PrimaryButton,
  FormSection, FieldPair, fieldClass, labelClass, useConfirm, useSubScreen,
  FilterSheet, FilterOptions,
} from '../../vendor/mobile';

export function ProductsView() {
  const location = useLocation();
  const { products, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewState, setViewState] = useState(location.state?.openAdd ? 'add' : 'list'); // 'list' | 'add' | 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const confirm = useConfirm();
  // The add/edit form is its own screen: Back returns to the catalogue.
  useSubScreen(viewState !== 'list'
    ? { title: viewState === 'add' ? 'Add New Product' : 'Edit Product', onBack: () => setViewState('list') }
    : null);

  useEffect(() => {
    if (location.state?.openAdd) {
      openForm(null);
      // Clean up state so refresh doesn't reopen it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Pet Food',
    sku: '',
    price: '',
    discountPrice: '',
    stock: '',
    alertLimit: '5',
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&auto=format&fit=crop' // placeholder
  });

  const openForm = (product = null) => {
    setSelectedProduct(product);
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || 'Pet Food',
        sku: product.sku || '',
        price: product.price || '',
        discountPrice: product.discountPrice || '',
        stock: product.stock || '',
        alertLimit: product.alertLimit || '5',
        image: product.image || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&auto=format&fit=crop'
      });
      setViewState('edit');
    } else {
      setFormData({
        name: '',
        category: 'Pet Food',
        sku: '',
        price: '',
        discountPrice: '',
        stock: '',
        alertLimit: '5',
        image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=300&auto=format&fit=crop'
      });
      setViewState('add');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.stock) {
      addToast({ message: 'Please fill in required fields (Name, Price, Stock).', type: 'warning' });
      return;
    }

    const payload = {
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      discountPrice: formData.discountPrice ? Number(formData.discountPrice) : Number(formData.price),
      stock: Number(formData.stock),
      sku: formData.sku || undefined,
      image: formData.image,
      status: Number(formData.stock) > 0 ? 'Active' : 'Out of Stock',
    };

    setSaving(true);
    try {
      if (viewState === 'add') {
        await createShopProduct(payload);
        addToast({ message: 'Product created successfully!', type: 'success' });
      } else {
        await updateShopProduct(selectedProduct._id || selectedProduct.id, payload);
        addToast({ message: 'Product updated successfully!', type: 'success' });
      }
      await refresh();
      setViewState('list');
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not save the product', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const filterCount = [statusFilter, stockFilter, categoryFilter].filter((f) => f !== 'All').length;

  const filteredProducts = products.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'All' || p.status === statusFilter) &&
    (categoryFilter === 'All' || p.category === categoryFilter) &&
    (stockFilter === 'All' ||
      (stockFilter === 'Out of stock' && Number(p.stock) <= 0) ||
      (stockFilter === 'Low stock' && Number(p.stock) > 0 && Number(p.stock) <= Number(p.alertLimit)) ||
      (stockFilter === 'In stock' && Number(p.stock) > Number(p.alertLimit)))
  );

  const handleDelete = async (product) => {
    if (!(await confirm({ title: 'Are you sure you want to delete this product?', message: product.name, confirmLabel: 'Delete', danger: true }))) return;
    try {
      await deleteShopProduct(product._id || product.id);
      await refresh();
      addToast({ message: 'Product deleted.', type: 'info' });
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not delete the product', type: 'error' });
    }
  };

  if (viewState === 'add' || viewState === 'edit') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-text-secondary px-1">Fill in the product details below.</p>

        <FormSection title="Product details">
            <div>
              <label className={labelClass}>Product Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={fieldClass} placeholder="e.g. Premium Dog Food" />
            </div>

            <div>
              <label className={labelClass}>Category *</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={cn(fieldClass, 'cursor-pointer')}>
                <option>Pet Food</option>
                <option>Toys</option>
                <option>Accessories</option>
                <option>Grooming Products</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>SKU</label>
              <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className={fieldClass} placeholder="e.g. SKU-12345" />
            </div>
        </FormSection>

        <FormSection title="Pricing & stock">
            <FieldPair>
              <div>
                <label className={labelClass}>Price (₹) *</label>
                <input type="number" inputMode="decimal" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={fieldClass} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Discount Price (₹)</label>
                <input type="number" inputMode="decimal" value={formData.discountPrice} onChange={e => setFormData({...formData, discountPrice: e.target.value})} className={fieldClass} placeholder="0.00" />
              </div>
            </FieldPair>

            <FieldPair>
              <div>
                <label className={labelClass}>Stock Quantity *</label>
                <input type="number" inputMode="numeric" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className={fieldClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Low Stock Alert Limit</label>
                <input type="number" inputMode="numeric" value={formData.alertLimit} onChange={e => setFormData({...formData, alertLimit: e.target.value})} className={fieldClass} placeholder="5" />
              </div>
            </FieldPair>
        </FormSection>

        <FormSection title="Product Image">
            <div>
              <input 
                type="file" 
                id="imageUpload" 
                className="hidden" 
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  e.target.value = null;
                  if (!file) return;
                  setUploadingImage(true);
                  try {
                    const url = await uploadVendorFile(file, 'shop-products');
                    setFormData(prev => ({ ...prev, image: url }));
                    addToast({ message: 'Image uploaded successfully.', type: 'info' });
                  } catch (err) {
                    addToast({ message: err?.response?.data?.message || 'Could not upload image', type: 'error' });
                  } finally {
                    setUploadingImage(false);
                  }
                }}
              />
              <div
                onClick={() => document.getElementById('imageUpload').click()}
                className="border-2 border-dashed border-accent-teal/50 rounded-[20px] p-5 flex flex-col items-center justify-center bg-bg-primary active:bg-bg-secondary transition cursor-pointer"
              >
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <Loader2 size={24} className="animate-spin text-text-secondary" />
                    <p className="text-xs font-bold text-text-secondary">Uploading image...</p>
                  </div>
                ) : formData.image ? (
                  <div className="relative w-40 h-40 rounded-2xl overflow-hidden mb-3 border border-border-light">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    {/* Always shown: a phone has no hover to reveal it. */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/55 flex items-center justify-center gap-1.5 py-2">
                      <Camera size={14} className="text-white" />
                      <p className="text-white text-xs font-bold">Change Image</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                    <ImageIcon size={24} className="text-text-secondary" />
                  </div>
                )}
                {!uploadingImage && (
                  <>
                    <p className="text-sm font-bold text-text-primary">Tap to upload image</p>
                    <p className="text-xs font-semibold text-text-secondary mt-1">PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
            </div>
        </FormSection>

        <StickyActionBar>
          <PrimaryButton tone="soft" className="flex-none px-5" onClick={() => setViewState('list')}>
            Cancel
          </PrimaryButton>
          <PrimaryButton onClick={handleSave} disabled={saving} loading={saving}>
            {viewState === 'add' ? 'Publish Product' : 'Save Changes'}
          </PrimaryButton>
        </StickyActionBar>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Product Catalog</h2>
          <p className="text-xs text-text-secondary mt-1">Manage your shop's inventory and listings.</p>
        </div>
        <button
          onClick={() => openForm(null)}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search products..." onFilter={() => setFiltersOpen(true)} filterCount={filterCount} />

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={() => { setStatusFilter('All'); setStockFilter('All'); setCategoryFilter('All'); }}
      >
        <FilterOptions label="Status" value={statusFilter} onChange={setStatusFilter} options={['All', 'Active', 'Inactive']} />
        <FilterOptions label="Stock" value={stockFilter} onChange={setStockFilter} options={['All', 'In stock', 'Low stock', 'Out of stock']} />
        {categories.length > 0 && (
          <FilterOptions label="Category" value={categoryFilter} onChange={setCategoryFilter} options={['All', ...categories]} />
        )}
      </FilterSheet>

      {filteredProducts.length === 0 ? (
        <EmptyState icon={Search} title="No products found" text="Try adjusting your search or add a new product." />
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const low = product.stock <= product.alertLimit;
            return (
              <div key={product.id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
                <div className="p-4 flex gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-bg-primary border border-border-light overflow-hidden shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[15px] font-bold text-text-primary leading-snug line-clamp-2">{product.name}</p>
                      <StatusBadge status={product.status} tone={product.status === 'Active' ? 'success' : 'neutral'} />
                    </div>
                    <p className="text-[11px] font-semibold text-text-secondary mt-0.5">SKU: {product.sku} · {product.category}</p>
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="text-[15px] font-black text-text-primary">₹{product.discountPrice || product.price}</p>
                        {product.discountPrice && <p className="text-[10px] font-bold text-text-secondary line-through">₹{product.price}</p>}
                      </div>
                      <div className={cn('flex items-center gap-1 text-xs font-bold', low ? 'text-error' : 'text-text-secondary')}>
                        {low && <AlertCircle size={14} />}
                        {product.stock} in stock
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-border-light">
                  <CardAction icon={Edit2} className="flex-1" onClick={() => openForm(product)}>Edit</CardAction>
                  <CardAction icon={Trash2} tone="danger" onClick={() => handleDelete(product)}>Delete</CardAction>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

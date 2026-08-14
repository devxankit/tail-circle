import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useShopVendor } from '../context/ShopVendorContext';
import { useToast } from '../components/Toast';
import { createShopProduct, updateShopProduct, deleteShopProduct, uploadVendorFile } from '../../../../services/vendor';
import {
  Search, Plus, Filter, MoreVertical, Edit2, Copy, Trash2,
  CheckCircle, AlertCircle, Image as ImageIcon, X, Loader2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function ProductsView() {
  const location = useLocation();
  const { products, refresh } = useShopVendor();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [viewState, setViewState] = useState(location.state?.openAdd ? 'add' : 'list'); // 'list' | 'add' | 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (product) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewState('list')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer"
          >
            <X size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{viewState === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
            <p className="text-sm font-semibold text-slate-500">Fill in the product details below.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Product Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition" placeholder="e.g. Premium Dog Food" />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Category *</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition cursor-pointer">
                <option>Pet Food</option>
                <option>Toys</option>
                <option>Accessories</option>
                <option>Grooming Products</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">SKU</label>
              <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition" placeholder="e.g. SKU-12345" />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Price (₹) *</label>
              <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition" placeholder="0.00" />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Discount Price (₹)</label>
              <input type="number" value={formData.discountPrice} onChange={e => setFormData({...formData, discountPrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition" placeholder="0.00" />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Stock Quantity *</label>
              <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition" placeholder="0" />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Low Stock Alert Limit</label>
              <input type="number" value={formData.alertLimit} onChange={e => setFormData({...formData, alertLimit: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 transition" placeholder="5" />
            </div>

            <div className="space-y-4 col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Product Image</label>
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
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
              >
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 size={24} className="animate-spin text-slate-500" />
                    <p className="text-xs font-bold text-slate-600">Uploading image...</p>
                  </div>
                ) : formData.image ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden mb-4 border border-slate-200 group">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <p className="text-white text-xs font-bold">Change Image</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <ImageIcon size={24} className="text-slate-400" />
                  </div>
                )}
                {!uploadingImage && (
                  <>
                    <p className="text-sm font-bold text-slate-700">Click to upload image</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-4">
            <button 
              onClick={() => setViewState('list')}
              className="px-6 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-black shadow-lg transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {viewState === 'add' ? 'Publish Product' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalog</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage your shop's inventory and listings.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition shadow-sm"
            />
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm transition cursor-pointer shrink-0">
            <Filter size={16} />
          </button>
          <button 
            onClick={() => openForm(null)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer shrink-0"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Product</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Category</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Pricing</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Stock</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 max-w-[200px] truncate">{product.name}</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">SKU: {product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-700">{product.category}</td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-900">₹{product.discountPrice || product.price}</p>
                    {product.discountPrice && <p className="text-[10px] font-bold text-slate-400 line-through">₹{product.price}</p>}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", product.stock <= product.alertLimit ? "text-red-600" : "text-slate-700")}>
                        {product.stock}
                      </span>
                      {product.stock <= product.alertLimit && <AlertCircle size={14} className="text-red-500" />}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", 
                      product.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {product.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openForm(product)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition cursor-pointer"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Search size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">No products found</h3>
              <p className="text-sm text-slate-500">Try adjusting your search or add a new product.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

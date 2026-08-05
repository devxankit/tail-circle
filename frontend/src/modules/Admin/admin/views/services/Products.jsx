import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Plus, Star, MoreVertical, Copy, Image as ImageIcon, Check, X, Filter, Edit, Eye, Trash2, Settings, UploadCloud } from 'lucide-react';
import { fetchAdminProducts, createAdminProduct, updateAdminProduct, deleteAdminProduct } from '../../../../../services/admin';

export function Products() {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const actionMenuRef = useRef(null);
  
  const [newProduct, setNewProduct] = useState({ name: '', category: '', vendor: '', price: '', mrp: '', stock: '' });
  const [selectedImages, setSelectedImages] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const stats = [
    { title: 'Total', value: '1,840' },
    { title: 'Active', value: '1,712' },
    { title: 'Out of Stock', value: '89' },
    { title: 'Categories', value: '8' },
    { title: 'Avg', value: '★ 4.2' }
  ];

  const initialProducts = [
    {
      id: 1, name: 'Royal Canin Adult Dog Food', sku: 'SKU-RC001', vendor: 'Ravi Pet Shop', city: 'Mumbai',
      category: 'Pet Food', price: 1200, mrp: 1330, discount: 10, stock: 48, sold: 214, trend: 'up',
      rating: 4.6, reviews: 89, status: 'Active'
    },
    {
      id: 2, name: 'Kong Classic Dog Toy', sku: 'SKU-KG001', vendor: 'Paws & Claws', city: 'Jaipur',
      category: 'Toys', price: 850, mrp: null, discount: 0, stock: 23, sold: 67, trend: 'up',
      rating: 4.8, reviews: 124, status: 'Active'
    },
    {
      id: 3, name: 'Pet Grooming Kit Pro', sku: 'SKU-GK002', vendor: 'FurLove Shop', city: 'Chennai',
      category: 'Grooming', price: 450, mrp: null, discount: 0, stock: 0, sold: 31, trend: 'none',
      rating: 4.1, reviews: 28, status: 'Out of Stock'
    },
    {
      id: 4, name: 'Adjustable Dog Collar', sku: 'SKU-AC003', vendor: 'PetZone India', city: 'Kochi',
      category: 'Accessories', price: 320, mrp: null, discount: 0, stock: 156, sold: 89, trend: 'up',
      rating: 4.3, reviews: 41, status: 'Active'
    },
    {
      id: 5, name: 'VetCare Joint Supplement', sku: 'SKU-VS001', vendor: 'Ravi Pet Shop', city: 'Mumbai',
      category: 'Supplements', price: 680, mrp: null, discount: 0, stock: 7, sold: 18, trend: 'down',
      rating: 4.5, reviews: 12, status: 'Active'
    },
    {
      id: 6, name: 'Tick Control Shampoo', sku: 'SKU-TS004', vendor: 'PetZone India', city: 'Kochi',
      category: 'Medicines', price: 280, mrp: null, discount: 0, stock: 89, sold: 102, trend: 'up',
      rating: 4.2, reviews: 56, status: 'Active'
    },
    {
      id: 7, name: 'Cat Scratching Post', sku: 'SKU-CP005', vendor: 'FurLove Shop', city: 'Chennai',
      category: 'Accessories', price: 550, mrp: null, discount: 0, stock: 34, sold: 28, trend: 'none',
      rating: 4.0, reviews: 19, status: 'Active'
    },
    {
      id: 8, name: 'Puppy Training Clicker', sku: 'SKU-TC006', vendor: 'Paws & Claws', city: 'Jaipur',
      category: 'Training', price: 120, mrp: null, discount: 0, stock: 0, sold: 41, trend: 'none',
      rating: 4.7, reviews: 31, status: 'Out of Stock'
    }
  ];

  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchAdminProducts().then(setProducts).catch((err) => console.error('Failed to load products', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'Pet Food': return 'bg-[#FAF7F2] text-[#599D9A]';
      case 'Accessories': return 'bg-[#FAF7F2] text-[#599D9A]';
      case 'Toys': return 'bg-[#FAF7F2] text-[#D96B5B]';
      case 'Grooming': return 'bg-[#FAF7F2] text-[#599D9A]';
      case 'Medicines': return 'bg-[#FAF7F2] text-[#D96B5B]';
      case 'Supplements': return 'bg-[#FAF7F2] text-[#599D9A]';
      case 'Housing': return 'bg-[#FAF7F2] text-[#5A5552]';
      case 'Training': return 'bg-[#FAF7F2] text-[#D96B5B]';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Inactive': return 'bg-gray-100 text-gray-700';
      case 'Out of Stock': return 'bg-red-100 text-red-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const copySku = (sku, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku);
    showToast('SKU Copied to clipboard', 'info');
  };

  const handleActionClick = (e, id) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === id ? null : id);
  };

  const toggleProductStatus = (id) => {
    const target = products.find(p => p.id === id);
    if (!target) return;
    const active = target.status !== 'Active';
    updateAdminProduct(id, { active }).catch((err) => console.error('Toggle failed', err));
    setProducts(products.map(p => {
      if (p.id === id) {
        const newStatus = active ? 'Active' : 'Inactive';
        showToast(`Product status changed to ${newStatus}`);
        return { ...p, status: newStatus, active };
      }
      return p;
    }));
    setActionMenuOpen(null);
  };

  const handleDeleteProduct = (id) => {
    deleteAdminProduct(id).catch((err) => console.error('Delete failed', err));
    setProducts(products.filter(p => p.id !== id));
    setActionMenuOpen(null);
    showToast('Product removed', 'info');
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setSelectedImages(prev => [...prev, ...filesArray].slice(0, 5));
    }
  };

  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleSaveProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      alert("Please enter product name and price");
      return;
    }
    createAdminProduct({
      name: newProduct.name,
      category: newProduct.category || 'Food',
      price: Number(newProduct.price),
      mrp: newProduct.mrp ? Number(newProduct.mrp) : Number(newProduct.price),
      stock: Number(newProduct.stock) || 0,
    })
      .then((saved) => {
        setProducts((prev) => [saved, ...prev]);
        setIsDrawerOpen(false);
        showToast('Product saved successfully');
        setNewProduct({ name: '', category: '', vendor: '', price: '', mrp: '', stock: '' });
        setSelectedImages([]);
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Failed to save product', 'error'));
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1400px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             {toastMessage.type === 'success' && <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>}
             {toastMessage.type === 'info' && <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Check size={14}/></div>}
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Products</h1>
          <p className="text-[13px] text-gray-500 mt-1">1,840 products listed</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => alert("Downloading CSV...")} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg hover:bg-white transition shadow-sm bg-white">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
            <h3 className="text-[13px] text-gray-500 mb-1">{s.title}</h3>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[250px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search product name, SKU, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] transition"
          />
        </div>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none focus:border-[#66B4B1]">
          <option>Category ▾</option>
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none focus:border-[#66B4B1]">
          <option>Vendor ▾</option>
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none focus:border-[#66B4B1]">
          <option>Status ▾</option>
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none focus:border-[#66B4B1]">
          <option>Sort ▾</option>
        </select>
        <button onClick={() => alert("Action triggered: Price ₹__ to ₹__")} className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white hover:bg-gray-50 transition">
          Price ₹__ to ₹__
        </button>
        <button onClick={() => alert("Action triggered: Clear Filters")} className="px-4 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition">
          Clear Filters
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#FAF7F2] overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead className="bg-[#FAF7F2] border-b border-[#FAF7F2] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-12 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[200px]">Product</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">SKU</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[130px]">Vendor</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[130px]">Category</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">Price</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Stock</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Sold (MTD)</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[90px]">Rating</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[110px]">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[120px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAF7F2] transition group cursor-pointer">
                  <td className="px-4 py-4 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                         <ImageIcon size={20} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2">{p.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate w-32">Product description...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 group/sku cursor-pointer" onClick={(e) => copySku(p.sku, e)}>
                      <span className="text-[12px] font-mono text-gray-600">{p.sku}</span>
                      <Copy size={12} className="text-gray-300 group-hover/sku:text-[#66B4B1] transition opacity-0 group-hover:opacity-100" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[13px] text-gray-900">{p.vendor}</p>
                    <p className="text-[11px] text-gray-500">{p.city}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getCategoryStyle(p.category)}`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[14px] font-medium text-gray-900">₹{p.price}</p>
                    {p.discount > 0 && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-gray-400 line-through">MRP ₹{p.mrp}</span>
                        <span className="text-[10px] text-red-600 font-semibold">-{p.discount}%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {p.stock === 0 ? (
                      <span className="text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out of stock</span>
                    ) : p.stock <= 50 ? (
                      <span className="text-[12px] text-amber-600 font-medium flex items-center gap-1">
                        {p.stock} units <span className="text-[10px]">⚠</span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-emerald-600 font-medium">{p.stock} units</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                       <span className="text-[13px] font-medium text-gray-900">{p.sold}</span>
                       {p.trend === 'up' && <span className="text-[10px] text-emerald-500">↑</span>}
                       {p.trend === 'down' && <span className="text-[10px] text-red-500">↓</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-[12px] font-medium text-gray-900">{p.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">({p.reviews} reviews)</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => alert("Action triggered: View")} className="px-3 py-1.5 border border-[#66B4B1] text-[#66B4B1] rounded-lg text-[11px] font-semibold hover:bg-[#FAF7F2] transition">
                        View
                      </button>
                      <button onClick={(e) => handleActionClick(e, p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {/* Action Menu */}
                    {actionMenuOpen === p.id && (
                      <div ref={actionMenuRef} className="absolute right-8 top-10 bg-white border border-gray-200 rounded-lg shadow-lg w-40 z-20 overflow-hidden text-left py-1">
                        <button onClick={() => alert("Action triggered: Edit")} className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                          <Edit size={14} /> Edit
                        </button>
                        <button onClick={() => toggleProductStatus(p.id)} className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                          <Settings size={14} /> Toggle Status
                        </button>
                        <button onClick={() => alert("Action triggered: View Reviews")} className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                          <Star size={14} /> View Reviews
                        </button>
                        <button onClick={() => alert("Action triggered: Adjust Stock")} className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                          <Filter size={14} /> Adjust Stock
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-[600px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Product Name</label>
                  <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] outline-none" placeholder="Enter product name" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">Category</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] outline-none">
                      <option value="">Select category</option>
                      <option value="Pet Food">Pet Food</option>
                      <option value="Toys">Toys</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">Vendor</label>
                    <select value={newProduct.vendor} onChange={e => setNewProduct({...newProduct, vendor: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] outline-none">
                      <option value="">Select vendor</option>
                      <option value="Ravi Pet Shop">Ravi Pet Shop</option>
                      <option value="Paws & Claws">Paws & Claws</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 border border-gray-200 p-3 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">SKU</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50" placeholder="SKU-AUTO-001" />
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <div className="w-9 h-5 bg-[#66B4B1] rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                    </div>
                    <span className="text-[12px] text-gray-600">Auto-generate</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                    <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px]" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">MRP (₹)</label>
                    <input type="number" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px]" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">Discount %</label>
                    <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50" placeholder="Auto" readOnly />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px]" placeholder="0" />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] outline-none" placeholder="Product description..."></textarea>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-2">Product Images (Max 5)</label>
                  
                  {selectedImages.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {selectedImages.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg bg-gray-100 shrink-0 border border-gray-200 overflow-hidden">
                          <img src={img} alt="preview" className="w-full h-full object-cover" />
                          <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition block">
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                       <UploadCloud size={20} className="text-gray-500" />
                    </div>
                    <p className="text-[13px] font-medium text-gray-700">Drag & drop images here</p>
                    <p className="text-[11px] text-gray-400 mt-1">or click to browse from device</p>
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">Product Status</p>
                    <p className="text-[11px] text-gray-500">Enable or disable product visibility</p>
                  </div>
                  <div className="w-10 h-6 bg-[#66B4B1] rounded-full relative cursor-pointer">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
              <button onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveProduct} className="px-6 py-2 bg-[#66B4B1] text-white rounded-lg text-[13px] font-medium hover:bg-[#66B4B1] transition">
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

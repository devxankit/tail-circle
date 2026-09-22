import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Sparkles,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Tag,
  Smile,
  Zap,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  fetchAdminPrompts,
  createAdminPrompt,
  updateAdminPrompt,
  deleteAdminPrompt,
} from '../../../../../services/admin';

export function PetPromptsAdminView() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [toast, setToast] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [form, setForm] = useState({
    question: '',
    answerTemplate: '',
    temperament: 'Any',
    mood: 'Any',
    species: 'all',
    category: 'Fun Fact',
    isActive: true,
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminPrompts({
        species: selectedSpecies !== 'all' ? selectedSpecies : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: search || undefined,
        limit: 2000,
      });
      setPrompts(Array.isArray(data) ? data : data.prompts || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch pet prompts:', err);
      showToast('Failed to load prompts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [selectedSpecies, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPrompts();
  };

  const openCreateModal = () => {
    setEditingPrompt(null);
    setForm({
      question: '',
      answerTemplate: '',
      temperament: 'Any',
      mood: 'Any',
      species: 'all',
      category: 'Fun Fact',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prompt) => {
    setEditingPrompt(prompt);
    setForm({
      question: prompt.question || '',
      answerTemplate: prompt.answerTemplate || '',
      temperament: prompt.temperament || 'Any',
      mood: prompt.mood || 'Any',
      species: prompt.species || 'all',
      category: prompt.category || 'Fun Fact',
      isActive: prompt.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answerTemplate.trim()) {
      showToast('Question and answer template are required', 'error');
      return;
    }

    try {
      if (editingPrompt) {
        await updateAdminPrompt(editingPrompt._id || editingPrompt.id, form);
        showToast('Prompt updated successfully!');
      } else {
        await createAdminPrompt(form);
        showToast('New pet prompt created successfully!');
      }
      setIsModalOpen(false);
      loadPrompts();
    } catch (err) {
      console.error('Failed to save prompt:', err);
      showToast(err.response?.data?.message || 'Failed to save prompt', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    try {
      await deleteAdminPrompt(id);
      showToast('Prompt deleted successfully!');
      loadPrompts();
    } catch (err) {
      console.error('Failed to delete prompt:', err);
      showToast('Failed to delete prompt', 'error');
    }
  };

  const handleToggleActive = async (prompt) => {
    try {
      const targetId = prompt._id || prompt.id;
      await updateAdminPrompt(targetId, { isActive: !prompt.isActive });
      showToast(`Prompt ${!prompt.isActive ? 'activated' : 'deactivated'}`);
      loadPrompts();
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('Failed to change status', 'error');
    }
  };

  const filteredPrompts = prompts.filter((p) => {
    if (selectedStatus === 'active' && !p.isActive) return false;
    if (selectedStatus === 'inactive' && p.isActive) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.question?.toLowerCase().includes(term) ||
      p.answerTemplate?.toLowerCase().includes(term) ||
      p.temperament?.toLowerCase().includes(term) ||
      p.mood?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  });

  // Calculate Pagination Slices
  const totalItems = filteredPrompts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedPrompts = filteredPrompts.slice(startIndex, endIndex);

  const totalCount = prompts.length;
  const activeCount = prompts.filter((p) => p.isActive).length;
  const dogCount = prompts.filter((p) => p.species === 'dog' || p.species === 'all').length;
  const catCount = prompts.filter((p) => p.species === 'cat' || p.species === 'all').length;

  return (
    <div className="p-6 space-y-6 bg-[#FDFBF7] min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-white font-medium flex items-center gap-2 transition-all ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#66B4B1]/10 text-[#66B4B1]">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Pet Prompts & Fun Facts
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Manage dynamic prompts, fun facts, and profile starters for pet match profiles
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#66B4B1] hover:bg-[#55a3a0] text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>Add New Prompt</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Prompts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Prompts</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dog Suitable</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{dogCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Tag size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cat Suitable</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{catCount}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Smile size={22} />
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by question, answer template, mood..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#66B4B1] transition-colors"
            />
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Filter size={16} />
            <span className="font-medium">Species:</span>
            <select
              value={selectedSpecies}
              onChange={(e) => {
                setSelectedSpecies(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-[#66B4B1]"
            >
              <option value="all">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="bird">Birds</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <span className="font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-[#66B4B1]"
            >
              <option value="all">All Categories</option>
              <option value="Vibe & Mood">Vibe & Mood</option>
              <option value="Fun Fact">Fun Fact</option>
              <option value="Simple Pleasures">Simple Pleasures</option>
              <option value="Shower Thoughts">Shower Thoughts</option>
              <option value="Personality">Personality</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <span className="font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 text-sm focus:outline-none focus:border-[#66B4B1]"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prompts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#66B4B1]"></div>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="text-center py-16">
            <HelpCircle size={44} className="mx-auto text-gray-300 mb-2" />
            <h3 className="text-base font-semibold text-gray-700">No pet prompts found</h3>
            <p className="text-gray-400 text-sm mt-1">
              Try updating your search query or create a new prompt.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-[#FAF7F2] border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Question / Heading
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Answer Template
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Species
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Filters (Temp / Mood)
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedPrompts.map((prompt) => {
                    const promptId = prompt._id || prompt.id;
                    return (
                      <tr key={promptId} className="hover:bg-gray-50/80 transition-colors">
                        {/* Question */}
                        <td className="px-5 py-4">
                          <span className="font-bold text-[13px] text-gray-900 tracking-wide">
                            {prompt.question}
                          </span>
                        </td>

                        {/* Answer Template */}
                        <td className="px-5 py-4 max-w-xs sm:max-w-md">
                          <p className="text-[13px] text-gray-700 italic font-medium truncate" title={prompt.answerTemplate}>
                            "{prompt.answerTemplate}"
                          </p>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                            {prompt.category || 'Fun Fact'}
                          </span>
                        </td>

                        {/* Species */}
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-md text-[12px] font-semibold capitalize">
                            {prompt.species === 'all' ? 'All Pets' : prompt.species}
                          </span>
                        </td>

                        {/* Filters (Temperament & Mood) */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 text-[11px]">
                            <span className="text-gray-600">
                              Temp: <strong className="text-gray-800">{prompt.temperament}</strong>
                            </span>
                            <span className="text-gray-600">
                              Mood: <strong className="text-gray-800">{prompt.mood}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleToggleActive(prompt)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                              prompt.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${prompt.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {prompt.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(prompt)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Prompt"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(promptId)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Prompt"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span>
                  Showing <strong>{totalItems > 0 ? startIndex + 1 : 0}</strong> to{' '}
                  <strong>{endIndex}</strong> of <strong>{totalItems}</strong> prompts
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#66B4B1]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                {/* Dynamic Page Buttons */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && page - prev > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentPage === page
                                ? 'bg-[#66B4B1] text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal (Light Theme) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#FAF7F2]">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                <Sparkles size={20} className="text-[#66B4B1]" />
                <span>{editingPrompt ? 'Edit Pet Prompt' : 'Create New Pet Prompt'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Question / Heading <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CURRENT MOOD & VIBE"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#66B4B1]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Answer Template <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs text-[#66B4B1] font-semibold">Use {'{name}'} for pet's name</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="e.g. {name} is bursting with happy energy and ready for fun playdates!"
                  value={form.answerTemplate}
                  onChange={(e) => setForm({ ...form, answerTemplate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#66B4B1]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#66B4B1]"
                  >
                    <option value="Vibe & Mood">Vibe & Mood</option>
                    <option value="Fun Fact">Fun Fact</option>
                    <option value="Simple Pleasures">Simple Pleasures</option>
                    <option value="Shower Thoughts">Shower Thoughts</option>
                    <option value="Personality">Personality</option>
                    <option value="Icebreaker">Icebreaker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Species
                  </label>
                  <select
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-[#66B4B1]"
                  >
                    <option value="all">All Species (Dogs & Cats & More)</option>
                    <option value="dog">Dog Only</option>
                    <option value="cat">Cat Only</option>
                    <option value="bird">Bird Only</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Temperament Filter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Playful, Friendly, Calm, Any"
                    value={form.temperament}
                    onChange={(e) => setForm({ ...form, temperament: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#66B4B1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Mood Filter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Energetic, Chill, Zoomies, Any"
                    value={form.mood}
                    onChange={(e) => setForm({ ...form, mood: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#66B4B1]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#66B4B1]"></div>
                </label>
                <span className="text-sm font-semibold text-gray-800">
                  Active (available for matching deck prompts)
                </span>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#66B4B1] hover:bg-[#55a3a0] text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
                >
                  {editingPrompt ? 'Save Changes' : 'Create Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PetPromptsAdminView;

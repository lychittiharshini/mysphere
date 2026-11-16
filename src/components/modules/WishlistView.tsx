import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  ExternalLink,
  Gift,
  ImagePlus,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  formatMoney,
  getCurrencyOption,
  SUPPORTED_CURRENCIES,
} from '../../lib/currency';
import { deleteStoragePath, uploadUserImage } from '../../lib/storage';
import type { WishlistItem, WishlistPriority, WishlistStatus } from '../../types/mysphere';

const WISHLIST_CATEGORIES = [
  'Tech',
  'Books',
  'Study Gear',
  'Fashion',
  'Home',
  'Fitness',
  'Travel',
  'Gifts',
  'Other',
];

const STATUS_OPTIONS: WishlistStatus[] = ['Want', 'Planning to Buy', 'Purchased'];
const PRIORITIES: WishlistPriority[] = ['high', 'medium', 'low'];


function safeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export const WishlistView: React.FC = () => {
  const { user, privateInfo, updateCurrencyPreference } = useAuth();
  const { wishlist, addWishlistItem, updateWishlistItem, deleteWishlistItem } = useData();
  const { showToast, confirmDialog } = useToast();

  const activeCurrency = getCurrencyOption(privateInfo?.currency);
  const formatCurrency = (val: number) => formatMoney(val, activeCurrency.code);

  const [viewMode, setViewMode] = useState<'active' | 'purchased' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | WishlistPriority>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WishlistItem | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [category, setCategory] = useState('Tech');
  const [priority, setPriority] = useState<WishlistPriority>('medium');
  const [status, setStatus] = useState<WishlistStatus>('Want');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(() => {
    const totalCount = wishlist.length;
    const purchasedItems = wishlist.filter((item) => item.status === 'Purchased');
    const pendingItems = wishlist.filter((item) => item.status !== 'Purchased');
    const estimatedPendingCost = pendingItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalAllCost = wishlist.reduce((sum, item) => sum + (item.price || 0), 0);
    return {
      totalCount,
      purchasedCount: purchasedItems.length,
      pendingCount: pendingItems.length,
      estimatedPendingCost,
      totalAllCost,
    };
  }, [wishlist]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const priorityRank: Record<WishlistPriority, number> = { high: 0, medium: 1, low: 2 };

    return [...wishlist]
      .filter((item) => {
        if (viewMode === 'active' && item.status === 'Purchased') return false;
        if (viewMode === 'purchased' && item.status !== 'Purchased') return false;
        if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
        if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
        if (q) {
          const matchName = item.name.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchCat = item.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'Purchased' && b.status !== 'Purchased') return 1;
        if (a.status !== 'Purchased' && b.status === 'Purchased') return -1;
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
  }, [wishlist, viewMode, categoryFilter, priorityFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setPrice('');
    setProductUrl('');
    setCategory('Tech');
    setPriority('medium');
    setStatus('Want');
    setImageUrl('');
    setImagePath('');
    setModalOpen(true);
  };

  const openEdit = (item: WishlistItem) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price > 0 ? String(item.price) : '');
    setProductUrl(item.productUrl);
    setCategory(item.category || 'Other');
    setPriority(item.priority);
    setStatus(item.status);
    setImageUrl(item.imageUrl || '');
    setImagePath(item.imagePath || '');
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadUserImage(user.uid, 'wishlist', file);
      if (imagePath && imagePath !== editing?.imagePath) {
        void deleteStoragePath(imagePath);
      }
      setImageUrl(uploaded.url);
      setImagePath(uploaded.path);
      showToast('Product image uploaded.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image upload failed.', 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (imagePath && imagePath !== editing?.imagePath) {
      void deleteStoragePath(imagePath);
    }
    setImageUrl('');
    setImagePath('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const numericPrice = Math.max(0, Number.parseFloat(price) || 0);
    setSaving(true);
    try {
      if (editing) {
        if (editing.imagePath && editing.imagePath !== imagePath) {
          void deleteStoragePath(editing.imagePath);
        }
        await updateWishlistItem(editing.id, {
          name: name.trim(),
          description: description.trim(),
          price: numericPrice,
          productUrl: productUrl.trim(),
          imageUrl,
          imagePath,
          category,
          priority,
          status,
        });
        showToast('Wishlist item updated.', 'success');
      } else {
        await addWishlistItem({
          name: name.trim(),
          description: description.trim(),
          price: numericPrice,
          productUrl: productUrl.trim(),
          imageUrl,
          imagePath,
          category,
          priority,
          status,
        });
        showToast('Added to your wishlist.', 'success');
      }
      setModalOpen(false);
    } catch {
      showToast('Could not save wishlist item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (item: WishlistItem, nextStatus: WishlistStatus) => {
    try {
      await updateWishlistItem(item.id, { status: nextStatus });
      showToast(
        nextStatus === 'Purchased'
          ? `Marked "${item.name}" as purchased!`
          : `Updated status to ${nextStatus}.`,
        'success'
      );
    } catch {
      showToast('Could not update status.', 'error');
    }
  };

  const handleDelete = async (item: WishlistItem) => {
    const ok = await confirmDialog({
      title: 'Delete wishlist item?',
      description: `Remove "${item.name}" from your wishlist?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteWishlistItem(item);
    showToast('Wishlist item removed.', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
            Personal Wishlist
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Save products you want, upload photos, track estimated costs, and log purchased items.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Select currency"
            value={activeCurrency.code}
            onChange={(e) => {
              const code = e.target.value;
              void updateCurrencyPreference(code).then(() => {
                const opt = getCurrencyOption(code);
                showToast(`Currency set to ${opt.name} (${opt.symbol}).`, 'success');
              });
            }}
            className="px-3 py-2.5 rounded-xl liquid-glass text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} · {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-md shadow-violet-600/20 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Items</span>
            <Gift className="w-4 h-4 text-violet-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {summary.totalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">saved in wishlist</p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Estimated Pending Cost</span>
            <ShoppingBag className="w-4 h-4 text-pink-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {formatCurrency(summary.estimatedPendingCost)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(summary.totalAllCost)} total value
          </p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Purchased Items</span>
            <PackageCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {summary.purchasedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">completed buys</p>
        </div>

        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Still Pending</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">
            {summary.pendingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">waiting to buy</p>
        </div>
      </div>

      {/* Filters & View Tabs */}
      <div className="liquid-glass rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'active', label: `Active (${summary.pendingCount})` },
              { id: 'purchased', label: `Purchased History (${summary.purchasedCount})` },
              { id: 'all', label: `All (${summary.totalCount})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setViewMode(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === t.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/8'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/75 dark:bg-slate-900/65 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/75 dark:bg-slate-900/75 text-xs text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Categories</option>
            {WISHLIST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'All' | WishlistPriority)}
            className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/12 bg-white/75 dark:bg-slate-900/75 text-xs text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center">
          <Gift className="w-8 h-8 text-violet-500 mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {wishlist.length === 0
              ? 'Your wishlist is empty. Add your first desired item!'
              : 'No items match your current filter.'}
          </p>
          {wishlist.length === 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
            >
              Add your first wishlist item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const extUrl = safeExternalUrl(item.productUrl);
            const isPurchased = item.status === 'Purchased';
            return (
              <article
                key={item.id}
                className="liquid-glass rounded-2xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div>
                  {/* Image Banner */}
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-violet-500/12 via-indigo-500/10 to-pink-500/12 overflow-hidden flex items-center justify-center border-b border-slate-200/60 dark:border-white/10">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <ShoppingBag className="w-8 h-8" />
                        <span className="text-xs">{item.category}</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium backdrop-blur-md border ${
                          item.priority === 'high'
                            ? 'bg-rose-500/85 text-white border-rose-400/50'
                            : item.priority === 'medium'
                              ? 'bg-amber-500/85 text-white border-amber-400/50'
                              : 'bg-slate-800/75 text-white border-white/20'
                        }`}
                      >
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg bg-slate-900/65 text-white hover:bg-slate-900 backdrop-blur-md cursor-pointer"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="p-1.5 rounded-lg bg-slate-900/65 text-white hover:bg-rose-600 backdrop-blur-md cursor-pointer"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                          {item.category}
                        </p>
                        <h2 className="mt-0.5 font-display text-base font-semibold text-slate-950 dark:text-white truncate">
                          {item.name}
                        </h2>
                      </div>
                      <span className="font-mono text-base font-semibold text-slate-950 dark:text-white tabular-nums shrink-0">
                        {formatCurrency(item.price)}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-200/60 dark:border-white/8 flex items-center justify-between gap-2">
                  <select
                    value={item.status}
                    onChange={(e) =>
                      void handleQuickStatus(item, e.target.value as WishlistStatus)
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      isPurchased
                        ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        : item.status === 'Planning to Buy'
                          ? 'border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300'
                          : 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                    }`}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    {!isPurchased && (
                      <button
                        type="button"
                        onClick={() => void handleQuickStatus(item, 'Purchased')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 text-xs font-medium cursor-pointer"
                        title="Mark as purchased"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Bought</span>
                      </button>
                    )}
                    {extUrl && (
                      <a
                        href={extUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200/80 dark:border-white/12"
                      >
                        <span>Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="liquid-glass w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                {editing ? 'Edit Wishlist Item' : 'Add Wishlist Item'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Product Image (JPG, PNG, WebP)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => void handleImageUpload(e)}
                  className="hidden"
                />
                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/15 aspect-[16/9] bg-slate-900/20">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-xs font-medium cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/90 text-white text-xs font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full py-6 rounded-xl border border-dashed border-slate-300 dark:border-white/20 hover:border-violet-500 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                        <span className="text-xs">Uploading image...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-violet-500" />
                        <span className="text-xs">Click to upload product image (max 10 MB)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Price ({activeCurrency.symbol} {activeCurrency.code})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="299.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                  >
                    {WISHLIST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as WishlistPriority)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as WishlistStatus)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Product Link (optional)
                </label>
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why you want it, preferred specs, color..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white/85 dark:bg-slate-900/80 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium cursor-pointer"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add to Wishlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

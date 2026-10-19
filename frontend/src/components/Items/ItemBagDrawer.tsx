import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  X,
  Check,
  RotateCcw,
  Info,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import {
  itemPocketsQueryOptions,
  itemEffectQueryOptions,
  type ItemPocketSchema,
  type PocketItemSchema,
} from '../../api/queries';
import { getPocketMeta, getItemSpriteUrl } from './ItemBagDrawer.utils';

export interface SelectedItemPayload {
  id: number;
  name: string;
  identifier?: string | null;
  category?: string;
}

export interface ItemBagDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (item: SelectedItemPayload) => void;
  selectedItemId?: number | null;
  title?: string;
  onlyHoldable?: boolean;
}

interface FlatItemWithCategory extends PocketItemSchema {
  categoryName: string;
  pocketId: number;
  pocketName: string;
}

const ItemCard: React.FC<{
  item: FlatItemWithCategory;
  isSelected: boolean;
  onSelect?: () => void;
  onInspect: () => void;
  PocketIcon: React.ComponentType<{ size?: number; className?: string }>;
}> = ({ item, isSelected, onSelect, onInspect, PocketIcon }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const spriteUrl = getItemSpriteUrl(item.identifier, item.name);
  const handlePrimary = onSelect || onInspect;

  return (
    <div
      className={`group relative flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
        isSelected
          ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 hover:border-white/10'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden relative mt-0.5">
        {!imgFailed ? (
          <img
            src={spriteUrl}
            alt=""
            aria-hidden="true"
            onError={() => setImgFailed(true)}
            className="w-7 h-7 object-contain drop-shadow"
            loading="lazy"
          />
        ) : (
          <PocketIcon size={18} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={handlePrimary}
            aria-label={`Select ${item.name}`}
            aria-pressed={isSelected}
            className="text-xs font-bold text-white capitalize truncate group-hover:text-indigo-200 hover:underline transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            {item.name.replace(/-/g, ' ')}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            {isSelected && (
              <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                <Check size={10} strokeWidth={3} />
              </span>
            )}
            <button
              type="button"
              aria-label={`Inspect ${item.name} details`}
              onClick={onInspect}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Info size={13} />
            </button>
          </div>
        </div>
        <span className="text-[10px] text-indigo-400/80 font-medium block truncate">
          {item.categoryName}
        </span>
        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-snug">
          {item.short_effect || 'No effect description available.'}
        </p>
      </div>
    </div>
  );
};

const ItemDetailView: React.FC<{
  item: FlatItemWithCategory;
  onBack: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}> = ({ item, onBack, onSelect, isSelected }) => {
  const { data: effectData, isPending } = useQuery(itemEffectQueryOptions(item.id));
  const spriteUrl = getItemSpriteUrl(item.identifier, item.name);
  const meta = getPocketMeta(item.pocketId, item.pocketName);
  const PocketIcon = meta.icon;

  const shortEffect = item.short_effect || effectData?.short_effect || null;
  const fullEffect = effectData?.effect || null;

  return (
    <div data-testid="item-detail-view" className="space-y-4 px-6 py-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-2"
      >
        ← Back to items
      </button>

      <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="w-16 h-16 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center shrink-0">
          <img src={spriteUrl} alt={item.name} className="w-10 h-10 object-contain drop-shadow" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white capitalize">{item.name.replace(/-/g, ' ')}</h3>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {item.categoryName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <PocketIcon size={14} className="text-slate-400" />
            <span>{meta.label}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Short Summary</span>
          <p data-testid="item-short-effect" className="text-xs text-slate-200">
            {shortEffect || 'No effect description available.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Effect Detail</span>
          {isPending ? (
            <p className="text-xs text-slate-400 animate-pulse">Loading detailed effect...</p>
          ) : (
            <p data-testid="item-full-effect" className="text-xs text-slate-200 leading-relaxed">
              {fullEffect || shortEffect || 'No additional effect details available.'}
            </p>
          )}
        </div>
      </div>

      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
            isSelected
              ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
          }`}
        >
          {isSelected ? '✓ Currently Equipped' : 'Equip This Item'}
        </button>
      )}
    </div>
  );
};

export const ItemBagDrawer: React.FC<ItemBagDrawerProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  selectedItemId,
  title = 'Trainer Bag',
  onlyHoldable = false,
}) => {
  const [selectedPocketId, setSelectedPocketId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<FlatItemWithCategory | null>(null);

  const {
    data: pockets,
    isPending,
    isError,
    refetch,
  } = useQuery(itemPocketsQueryOptions());

  // Flatten items for active pocket and search
  const { currentCategories, filteredItems, totalMatches } = useMemo(() => {
    if (!pockets || pockets.length === 0) {
      return { currentCategories: [], filteredItems: [], totalMatches: 0 };
    }

    const active = pockets.find((p) => p.id === selectedPocketId) || pockets[0];
    const categories = active.categories || [];
    const query = searchQuery.trim().toLowerCase();

    const itemsToFilter: FlatItemWithCategory[] = [];

    if (query) {
      pockets.forEach((pkt) => {
        pkt.categories.forEach((cat) => {
          cat.items.forEach((item) => {
            if (onlyHoldable && !item.is_holdable) return;
            if (
              item.name.toLowerCase().includes(query) ||
              cat.name.toLowerCase().includes(query) ||
              (item.identifier && item.identifier.toLowerCase().includes(query))
            ) {
              itemsToFilter.push({
                ...item,
                categoryName: cat.name,
                pocketId: pkt.id,
                pocketName: pkt.name,
              });
            }
          });
        });
      });
    } else {
      active.categories.forEach((cat) => {
        if (!selectedCategory || cat.name === selectedCategory) {
          cat.items.forEach((item) => {
            if (onlyHoldable && !item.is_holdable) return;
            itemsToFilter.push({
              ...item,
              categoryName: cat.name,
              pocketId: active.id,
              pocketName: active.name,
            });
          });
        }
      });
    }

    return {
      currentPocket: active,
      currentCategories: categories,
      filteredItems: itemsToFilter,
      totalMatches: itemsToFilter.length,
    };
  }, [pockets, selectedPocketId, searchQuery, selectedCategory, onlyHoldable]);

  const handleSelect = (item: FlatItemWithCategory) => {
    if (onSelectItem) {
      onSelectItem({
        id: item.id,
        name: item.name,
        identifier: item.identifier,
        category: item.categoryName,
      });
      onClose();
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={() => {
        setInspectItem(null);
        onClose();
      }}
      title={title}
      description="Browse items by pocket or search across the entire inventory."
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col flex-1 min-h-0 space-y-4 pt-1 pb-4">
        {inspectItem ? (
          <ItemDetailView
            item={inspectItem}
            onBack={() => setInspectItem(null)}
            onSelect={onSelectItem ? () => handleSelect(inspectItem) : undefined}
            isSelected={selectedItemId === inspectItem.id}
          />
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative px-6">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items by name or category..."
                  aria-label="Search items"
                  className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 text-slate-400 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Pocket Navigation Tabs (Pills) */}
            {!searchQuery && pockets && pockets.length > 0 && (
              <div className="px-6">
                <div
                  role="tablist"
                  aria-label="Item Pockets"
                  className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
                >
                  {pockets.map((pocket: ItemPocketSchema) => {
                    const meta = getPocketMeta(pocket.id, pocket.name);
                    const IconComponent = meta.icon;
                    const isSelected = selectedPocketId === pocket.id;
                    const itemCount = pocket.categories.reduce((acc, cat) => acc + cat.items.length, 0);

                    return (
                      <button
                        key={pocket.id}
                        role="tab"
                        type="button"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedPocketId(pocket.id);
                          setSelectedCategory(null);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/5'
                        }`}
                      >
                        <IconComponent aria-hidden="true" size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                        <span>{meta.label}</span>
                        <span
                          aria-hidden="true"
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {itemCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Pills (Sub-filter within pocket) */}
            {!searchQuery && currentCategories.length > 1 && (
              <div className="px-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    selectedCategory === null
                      ? 'bg-white/20 text-white'
                      : 'bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  All Categories
                </button>
                {currentCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      selectedCategory === cat.name
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40'
                        : 'bg-white/[0.02] text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.name} ({cat.items.length})
                  </button>
                ))}
              </div>
            )}

            {/* Search status notification */}
            {searchQuery && (
              <div className="px-6 text-xs text-slate-400 flex items-center justify-between">
                <span>
                  Found <strong className="text-white">{totalMatches}</strong> matching item
                  {totalMatches === 1 ? '' : 's'} across all pockets
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Reset Search
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 max-h-[50vh] min-h-[280px]">
              {isPending && (
                <div
                  data-testid="item-bag-loading"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5"
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse"
                    />
                  ))}
                </div>
              )}

              {isError && (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-rose-400 font-semibold">Failed to load item inventory.</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all border border-white/10"
                  >
                    <RotateCcw size={14} /> Retry
                  </button>
                </div>
              )}

              {!isPending && !isError && filteredItems.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <p className="text-sm font-medium">No items found.</p>
                  {searchQuery && (
                    <p className="text-xs text-slate-400">
                      Try adjusting your search terms or clearing the filter.
                    </p>
                  )}
                </div>
              )}

              {!isPending && !isError && filteredItems.length > 0 && (
                <div
                  data-testid="item-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pb-2"
                >
                  {filteredItems.map((item) => {
                    const meta = getPocketMeta(item.pocketId, item.pocketName);
                    const PocketIcon = meta.icon;
                    const isSelected = selectedItemId === item.id;

                    return (
                      <ItemCard
                        key={`${item.pocketId}-${item.categoryName}-${item.id}`}
                        item={item}
                        isSelected={isSelected}
                        onSelect={onSelectItem ? () => handleSelect(item) : undefined}
                        onInspect={() => setInspectItem(item)}
                        PocketIcon={PocketIcon}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
};

export default ItemBagDrawer;

import { useEffect, useMemo, useState } from 'react';
import ApiService from '../api/apiService';
import StripeCheckoutModal from './StripeCheckoutModal';
import { trackPartsOrdered } from '../utils/clarityTracking';
import { ga4PartsOrdered } from '../utils/ga4DataLayer';
import {
  Wrench, Search, ChevronLeft, Package, ClipboardList,
  Trash2, Loader2, AlertCircle
} from 'lucide-react';

type CatalogTab = 'model' | 'number';

interface OrderPartsModalProps {
  onClose: () => void;
  onOrdered: () => void;
}

const OrderPartsModal = ({ onClose, onOrdered }: OrderPartsModalProps) => {
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [noActiveJob, setNoActiveJob] = useState(false);

  const [partsSearch, setPartsSearch] = useState({
    tab: 'model' as CatalogTab,
    query: '',
    modelResults: [] as any[],
    selectedModel: null as any,
    results: [] as any[],
    searching: false,
  });
  const [cart, setCart] = useState<any[]>([]);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [partsAvailability, setPartsAvailability] = useState<Record<string, boolean>>({});
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);

  // Silently attach the order to the tech's current active job — the backend
  // requires an assignment id for model search, availability checks, and order
  // creation, but we don't surface a job-picker step per the design.
  useEffect(() => {
    const loadActiveJob = async () => {
      setLoadingAssignments(true);
      try {
        const res = await ApiService.getMyAssignments();
        const list = Array.isArray(res?.data) ? res.data : [];
        const openJobs = list.filter((a: any) =>
          !['completed', 'cancelled', 'canceled'].includes(String(a.status || '').toLowerCase())
        );
        if (openJobs.length > 0) {
          setSelectedJob(openJobs[0]);
        } else {
          setNoActiveJob(true);
        }
      } catch (e) {
        console.error('Failed to load active job for parts order:', e);
        setNoActiveJob(true);
      } finally {
        setLoadingAssignments(false);
      }
    };
    loadActiveJob();
  }, []);

  const assignmentNumId = useMemo(
    () => Number(selectedJob?.id) || Number(String(selectedJob?.id || '').replace(/\D/g, '')) || 0,
    [selectedJob]
  );

  const handlePartsSearch = async () => {
    if (!partsSearch.query.trim()) return;
    setPartsSearch(prev => ({ ...prev, searching: true }));
    try {
      if (partsSearch.tab === 'model') {
        const res = await ApiService.searchModels(assignmentNumId, partsSearch.query);
        const models = res?.data?.models || (Array.isArray(res?.data) ? res.data : []);
        setPartsSearch(prev => ({ ...prev, modelResults: res?.success ? models : [], selectedModel: null, results: [], searching: false }));
      } else {
        const res = await ApiService.searchPartsByPartNo(partsSearch.query);
        const rawItems = res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
        const parts = rawItems.map((item: any) => {
          const sellPrice = item.itemSellingPrice || item.sellPrice || '';
          const price = parseFloat(sellPrice || item.unitPrice || item.price || '0') || 0;
          return {
            itemId: item.itemId || item.partNo,
            partNo: item.partNo,
            name: item.itemDescription || item.name || '',
            description: item.productGroupName || item.description || '',
            price,
            sellPrice,
            available: item.itemAvailabilityStatus ? item.itemAvailabilityStatus === 'PIA' : item.available !== false,
            productGroupId: item.productGroupId || '',
            imageUrl: item.itemImageUrl || '',
          };
        });
        setPartsSearch(prev => ({ ...prev, modelResults: [], selectedModel: null, results: parts, searching: false }));
      }
    } catch (e) {
      console.error('Parts search failed:', e);
      setPartsSearch(prev => ({ ...prev, results: [], searching: false }));
    }
  };

  const handleSelectModel = async (model: any) => {
    setPartsSearch(prev => ({ ...prev, selectedModel: model, searching: true }));
    try {
      const partsRes = await ApiService.getModelParts(assignmentNumId, model.modelId);
      const rawItems = partsRes?.data?.items || partsRes?.data?.parts || (Array.isArray(partsRes?.data) ? partsRes.data : []);
      const parts = rawItems.map((item: any) => {
        const sellPrice = item.itemSellingPrice || item.sellPrice || '';
        const price = parseFloat(sellPrice || item.unitPrice || item.price || '0') || 0;
        return {
          itemId: item.itemId,
          partNo: item.partNo,
          name: item.itemDescription || item.name || '',
          description: item.productGroupName || item.description || '',
          price,
          sellPrice,
          available: item.itemAvailabilityStatus === 'PIA',
          productGroupId: item.productGroupId || '',
          imageUrl: item.itemImageUrl || '',
        };
      });
      setPartsSearch(prev => ({ ...prev, results: parts, searching: false }));
    } catch (e) {
      console.error('getModelParts failed:', e);
      setPartsSearch(prev => ({ ...prev, results: [], searching: false }));
    }
  };

  const handleAddToCart = (part: any) => {
    const cartKey = part.itemId || part.partNo;
    setCart(prev => {
      const existing = prev.find(i => (i.itemId || i.partNo) === cartKey);
      if (existing) {
        return prev.map(i => (i.itemId || i.partNo) === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const resolvedPrice = parseFloat(part.sellPrice || String(part.price) || '0') || 0;
      return [...prev, { ...part, price: resolvedPrice, sellPrice: part.sellPrice || String(resolvedPrice), quantity: 1 }];
    });
    setAvailabilityChecked(false);
    setPartsAvailability({});
    setPartsError(null);
  };

  const handleUpdateCartQty = (cartKey: string, amount: number) => {
    setCart(prev => prev.map(item => (
      (item.itemId || item.partNo) === cartKey ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item
    )));
    setAvailabilityChecked(false);
    setPartsAvailability({});
    setPartsError(null);
  };

  const handleRemoveFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(i => (i.itemId || i.partNo) !== cartKey));
  };

  const handleCheckAvailability = async () => {
    if (cart.length === 0) return;
    setCheckingAvailability(true);
    setPartsError(null);
    try {
      const partsPayload = cart.map(item => ({
        itemId: item.itemId || '',
        partNo: item.partNo,
        productGroupId: item.productGroupId || '',
        quantity: item.quantity,
      }));
      const res = await ApiService.checkPartsAvailability(assignmentNumId, partsPayload);
      const availableParts = Array.isArray(res?.data?.availableParts) ? res.data.availableParts : Array.isArray(res?.data?.parts) ? res.data.parts : [];
      const availablePartNos = new Set(availableParts.map((p: any) => p.partNo || p.itemId));
      const availMap: Record<string, boolean> = {};
      cart.forEach(item => { availMap[item.partNo] = availablePartNos.has(item.partNo); });
      setPartsAvailability(availMap);
      const unavailableCount = cart.filter(item => !availMap[item.partNo]).length;
      setAvailabilityChecked(true);
      setPartsError(unavailableCount > 0
        ? 'One or more parts in your cart are currently unavailable. Remove them or check back later, then try again.'
        : null);
    } catch (e) {
      console.error('Availability check failed:', e);
      setPartsError('Failed to check parts availability. Please try again.');
      setAvailabilityChecked(false);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl h-[90vh] md:h-[550px] shadow-2xl flex flex-col md:flex-row overflow-hidden text-gray-700">

        {/* Left Column */}
        <div className="flex-grow flex flex-col overflow-hidden p-4 md:p-6 md:border-r border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4 shrink-0">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                title="Close"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Wrench className="h-5 w-5 text-blue-600" />
              <span>Sears 1099 Parts Catalog Search</span>
            </h3>
            {!loadingAssignments && !noActiveJob && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPartsSearch(prev => ({ ...prev, tab: 'model', query: '', results: [], modelResults: [], selectedModel: null }))}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-colors cursor-pointer ${
                    partsSearch.tab === 'model' ? 'bg-blue-600/10 border-blue-500 text-blue-600' : 'bg-transparent border-gray-200 text-gray-500'
                  }`}
                >
                  Search by Model
                </button>
                <button
                  onClick={() => setPartsSearch(prev => ({ ...prev, tab: 'number', query: '', results: [], modelResults: [], selectedModel: null }))}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-colors cursor-pointer ${
                    partsSearch.tab === 'number' ? 'bg-blue-600/10 border-blue-500 text-blue-600' : 'bg-transparent border-gray-200 text-gray-500'
                  }`}
                >
                  Search by Part No.
                </button>
              </div>
            )}
          </div>

          {loadingAssignments ? (
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            </div>
          ) : noActiveJob ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center py-20 text-gray-400 text-xs italic bg-gray-50/30 rounded-xl border border-gray-200 px-8">
                No active job found to attach this parts order to. Claim or start a job first, then order parts for it.
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4 shrink-0">
                <input
                  type="text"
                  placeholder={partsSearch.tab === 'model' ? 'Enter Model (e.g. VA6013)...' : 'Enter Part Number (e.g. 13516)...'}
                  value={partsSearch.query}
                  onChange={(e) => { const val = e.target.value; setPartsSearch(prev => ({ ...prev, query: val })); }}
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handlePartsSearch()}
                />
                <button
                  onClick={handlePartsSearch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search</span>
                </button>
              </div>

              <div className="flex-grow overflow-y-auto space-y-2.5">
                {partsSearch.searching ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                  </div>
                ) : partsSearch.tab === 'model' && !partsSearch.selectedModel && partsSearch.modelResults.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-gray-500 font-semibold">Showing {partsSearch.modelResults.length} compatible model{partsSearch.modelResults.length > 1 ? 's' : ''}</p>
                    {partsSearch.modelResults.map((model: any) => (
                      <div key={model.modelId} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                            <Wrench className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-gray-900">{model.modelNo}</p>
                            <p className="text-[11px] text-gray-500">{model.modelDescription || model.productTypeName || ''}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">{model.brand}</span>
                            <span className="text-[10px] text-gray-400 ml-2">{model.productTypeName || model.applianceType || ''}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectModel(model)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Select Model
                        </button>
                      </div>
                    ))}
                  </div>
                ) : partsSearch.results.length === 0 && !partsSearch.selectedModel ? (
                  <div className="text-center py-20 text-gray-400 text-xs italic bg-gray-50/30 rounded-xl border border-gray-200">
                    Type a query (e.g. model <span className="font-mono text-blue-500">VA6013</span> or part <span className="font-mono text-blue-500">13516</span>) and press Search.
                  </div>
                ) : partsSearch.results.length === 0 && partsSearch.selectedModel ? (
                  <div className="text-center py-20 text-gray-400 text-xs italic bg-gray-50/30 rounded-xl border border-gray-200">
                    No parts found for model <span className="font-mono text-blue-500">{partsSearch.selectedModel.modelNo}</span>.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {partsSearch.selectedModel && (
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] text-gray-500 font-semibold">Parts for model: <span className="font-mono text-blue-500">{partsSearch.selectedModel.modelNo}</span></p>
                        <button
                          onClick={() => setPartsSearch(prev => ({ ...prev, selectedModel: null, results: [] }))}
                          className="text-[10px] text-blue-600 hover:text-blue-500 font-bold cursor-pointer"
                        >
                          ← Back to Models
                        </button>
                      </div>
                    )}
                    {partsSearch.results.map((part, idx) => (
                      <div key={`${part.itemId || part.partNo}-${idx}`} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {part.imageUrl ? (
                            <img src={part.imageUrl} alt={part.name} className="w-10 h-10 object-contain rounded border border-gray-100 shrink-0 bg-gray-50" />
                          ) : (
                            <div className="w-10 h-10 rounded border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-gray-900">{part.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">Part #{part.partNo}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">{part.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(part)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 rounded-lg text-[10px] font-bold text-blue-600 transition-colors cursor-pointer shrink-0"
                        >
                          Add to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Cart */}
        {!loadingAssignments && !noActiveJob && (
          <div className="w-full md:w-[300px] shrink-0 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col justify-between overflow-hidden">
            <div className="p-5 border-b border-gray-200 shrink-0">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                <span>Order Shopping Cart</span>
              </h4>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic text-center py-10">Cart is empty</p>
              ) : (
                cart.map(item => {
                  const isChecked = item.partNo in partsAvailability;
                  const isAvailable = partsAvailability[item.partNo];
                  return (
                    <div
                      key={item.itemId || item.partNo}
                      className={`p-3 rounded-xl flex flex-col gap-2 relative border ${
                        isChecked && !isAvailable
                          ? 'bg-rose-50 border-rose-300'
                          : isChecked && isAvailable
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() => handleRemoveFromCart(item.itemId || item.partNo)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-center gap-2.5">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-9 h-9 object-contain rounded border border-gray-100 shrink-0 bg-white" />
                        ) : (
                          <div className="w-9 h-9 rounded border border-gray-100 bg-white flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-bold text-gray-900 truncate pr-5">{item.name}</p>
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Part #{item.partNo}</p>
                        </div>
                      </div>
                      {isChecked && (
                        <div>
                          {isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 border border-green-300 rounded-full text-[9px] font-bold text-green-700">
                              ✓ Available
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 border border-rose-300 rounded-full text-[9px] font-bold text-rose-600">
                                ✕ Unavailable
                              </span>
                              <p className="text-[9px] text-rose-500 mt-1">This part is currently out of stock and cannot be ordered.</p>
                            </>
                          )}
                        </div>
                      )}
                      {(!isChecked || isAvailable) && (
                        <div className="flex items-center justify-end mt-1">
                          <div className="flex items-center border border-gray-200 rounded bg-white overflow-hidden">
                            <button
                              onClick={() => handleUpdateCartQty(item.itemId || item.partNo, -1)}
                              className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2.5 text-[10px] font-bold text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateCartQty(item.itemId || item.partNo, 1)}
                              className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white shrink-0 space-y-3">
              {partsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-rose-600">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{partsError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Cart Items</span>
                <span className="text-gray-900">{cartItemCount} item{cartItemCount !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={handleCheckAvailability}
                  disabled={cart.length === 0 || checkingAvailability}
                  className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[10px] font-extrabold text-gray-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 w-full"
                >
                  {checkingAvailability ? 'Checking...' : 'Check Parts Availability'}
                </button>
                {availabilityChecked && !partsError && cart.length > 0 && (
                  <button
                    onClick={() => setShowStripeCheckout(true)}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer w-full flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-gray-500 py-1 transition-colors cursor-pointer block"
              >
                Cancel Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {showStripeCheckout && (
      <StripeCheckoutModal
        cart={cart.map(item => ({
          ...item,
          price: parseFloat(item.sellPrice || item.price || '0') || 0,
          sellPrice: item.sellPrice || String(item.price || '0'),
          productGroupId: item.productGroupId || '',
        }))}
        assignmentId={String(selectedJob?.id || '')}
        onClose={() => setShowStripeCheckout(false)}
        onSuccess={() => {
          setShowStripeCheckout(false);
          trackPartsOrdered(String(selectedJob?.id || ''));
          ga4PartsOrdered(String(selectedJob?.id || ''), cart.length, cart.map(item => ({ partNo: item.partNo, name: item.name })));
          onOrdered();
          onClose();
        }}
        onOrderMore={() => {
          setShowStripeCheckout(false);
          setCart([]);
          setAvailabilityChecked(false);
          setPartsAvailability({});
          setPartsError(null);
        }}
      />
    )}
    </>
  );
};

export default OrderPartsModal;

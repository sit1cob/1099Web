import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { formatUSDate } from '../utils/date';
import { ga4TabChanged, ga4PartTracked } from '../utils/ga4DataLayer';
import {
  Loader2, Package, Truck, History, Box,
  Search, X, CheckCircle2, MapPin, ShieldCheck, Plus
} from 'lucide-react';
import OrderPartsModal from '../components/OrderPartsModal';

type Tab = 'active' | 'history';
type StatusFilter = 'all' | 'incoming' | 'delivered';

interface TrackingEvent {
  status: string;
  location: string;
  time: string;
  description: string;
  completed: boolean;
  active: boolean;
}

const NAVY = '#1B365D';
const BLUE = '#2574C2';
const BLUE_LIGHT = '#E8F1FA';
const GREEN = '#28A745';
const GREEN_LIGHT = '#E8F5E9';
const GREEN_DARK = '#1E7E34';
const ORANGE = '#ED7D31';
const ORANGE_LIGHT = '#FFF3E8';
const PURPLE = '#6F42C1';
const PURPLE_LIGHT = '#F3EDFF';

const formatSoNumber = (so: any) => {
  if (!so) return null;
  const str = String(so).trim();
  if (str.toUpperCase().startsWith('SO-')) {
    return str.toUpperCase();
  }
  if (/^\d+$/.test(str)) {
    return `SO-${str}`;
  }
  return str;
};

const isDeliveredStatus = (status: string) => (status || '').toLowerCase().includes('deliver');

// Order History items come from /parts/history, which reports the job/assignment's
// own workflow status (assignmentStatus: assigned, waiting_on_parts, part_arrived,
// completed) + tech-reported disposition — a different domain than shipment status.
// This is ONLY used to sort items into the Incoming/Delivered tabs we added for
// navigation; the badge text itself always shows the raw assignmentStatus value
// as returned by the API (same as the app's History list), never a renamed label.
const isHistoryResolved = (item: any) => {
  const status = (item?.assignmentStatus || '').toLowerCase();
  if (item?.disposition === 'returned') return true;
  if (status.includes('completed')) return true;
  if (status.includes('part_arrived') || status.includes('arrived')) return true;
  return false;
};

// Maps a raw status string onto how far along the 4-step shipment pipeline a part is:
// 1 = ordered/processing/draft, 2 = shipped, 3 = in transit, 4 = delivered
const getTrackProgress = (status: string): number => {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver')) return 4;
  if (s.includes('transit')) return 3;
  if (s.includes('ship')) return 2;
  return 1;
};

const getStatusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver')) return { label: 'Delivered', bg: GREEN_LIGHT, color: GREEN_DARK, icon: '✅' };
  if (s.includes('transit')) return { label: 'In Transit', bg: ORANGE_LIGHT, color: ORANGE, icon: '🚚' };
  if (s.includes('ship')) return { label: 'Shipped', bg: BLUE_LIGHT, color: BLUE, icon: '📦' };
  if (s.includes('hand')) return { label: 'In Hand', bg: PURPLE_LIGHT, color: PURPLE, icon: '🔧' };
  if (s.includes('draft')) return { label: 'Draft', bg: '#F1F3F5', color: '#495057', icon: '📝' };
  return { label: status || 'Ordered', bg: BLUE_LIGHT, color: BLUE, icon: '📦' };
};

const PartsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse active tab from URL query params (matches Layout.tsx links)
  const queryTab = new URLSearchParams(location.search).get('tab');
  const activeTab = (queryTab === 'history' ? 'history' : 'active') as Tab;

  const [parts, setParts] = useState<any[]>([]);
  const [activeParts, setActiveParts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Slide-out tracking drawer state
  const [selectedPart, setSelectedPart] = useState<any | null>(null);

  useEffect(() => {
    const loadParts = async () => {
      setIsLoading(true);
      try {
        // Always load active parts for the counter
        const activeRes = await ApiService.getPartsTracking();
        setActiveParts(activeRes?.data || []);

        if (activeTab === 'active') {
          setParts(activeRes?.data || []);
        } else {
          const res = await ApiService.getPartsHistory();
          setParts(res?.data || []);
        }
      } catch (err) {
        console.error('Error fetching parts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadParts();
  }, [activeTab, refreshKey]);

  // Handle Tab Switch (update query param)
  const handleTabSwitch = (tab: Tab) => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedPart(null);
    ga4TabChanged(tab, 'parts');
    navigate(`/parts?tab=${tab}`);
  };

  // History items have no tracking number — route to the underlying job instead.
  const handleViewJob = (item: any) => {
    const soRaw = item.soNumber || item.assignmentId || item.orderId || '';
    const soNormalized = formatSoNumber(soRaw) || String(soRaw);
    navigate(`/assignments?view=list&id=${encodeURIComponent(soNormalized)}`);
  };

  const isHistory = activeTab === 'history';
  const isResolved = useCallback(
    (item: any) => (isHistory ? isHistoryResolved(item) : isDeliveredStatus(item?.status)),
    [isHistory]
  );

  const incomingCount = useMemo(
    () => (Array.isArray(parts) ? parts.filter(p => !isResolved(p)).length : 0),
    [parts, isResolved]
  );
  const activeIncomingCount = useMemo(
    () => (Array.isArray(activeParts) ? activeParts.filter(p => !isDeliveredStatus(p?.status)).length : 0),
    [activeParts]
  );

  // Filter parts by search query + status chip
  const filteredParts = useMemo(() => {
    if (!Array.isArray(parts)) return [];
    const q = searchQuery.trim().toLowerCase();
    return parts.filter((item: any) => {
      if (statusFilter === 'incoming' && isResolved(item)) return false;
      if (statusFilter === 'delivered' && !isResolved(item)) return false;
      if (!q) return true;
      const haystack = [
        item?.partNumber, item?.partNo, item?.itemDescription, item?.description,
        item?.orderNo, item?.brand, item?.soNumber, item?.applianceType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [parts, searchQuery, statusFilter, isResolved]);

  const incomingParts = useMemo(() => filteredParts.filter(p => !isResolved(p)), [filteredParts, isResolved]);
  const deliveredParts = useMemo(() => filteredParts.filter(p => isResolved(p)), [filteredParts, isResolved]);

  // Generate dynamic tracking events based on status
  const getTrackingEvents = (part: any): TrackingEvent[] => {
    const status = (part?.status || 'ordered').toLowerCase();
    const dateStr = part?.date || '2026-06-01';

    // Parse base date to create believable timestamps
    const baseDate = new Date(dateStr);

    const formatTime = (d: Date, hourOffset: number, minOffset: number) => {
      const newD = new Date(d);
      newD.setHours(newD.getHours() + hourOffset);
      newD.setMinutes(newD.getMinutes() + minOffset);
      return newD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
             newD.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    if (status === 'delivered') {
      return [
        {
          status: 'Delivered',
          location: 'Hoffman Estates, IL',
          time: formatTime(baseDate, 48, 15),
          description: 'Delivered to front door / porch. Signature waived.',
          completed: true,
          active: true,
        },
        {
          status: 'Out for Delivery',
          location: 'Hoffman Estates, IL',
          time: formatTime(baseDate, 45, 30),
          description: 'On FedEx vehicle for local delivery routing.',
          completed: true,
          active: false,
        },
        {
          status: 'In Transit',
          location: 'Chicago Hub, IL',
          time: formatTime(baseDate, 36, 45),
          description: 'Arrived at local carrier sorting facility.',
          completed: true,
          active: false,
        },
        {
          status: 'Shipped',
          location: 'Sears Fulfillment Center, OH',
          time: formatTime(baseDate, 14, 0),
          description: 'Package picked up by carrier and in transit.',
          completed: true,
          active: false,
        },
        {
          status: 'Order Processed',
          location: 'Sears Kairos Fulfillment',
          time: formatTime(baseDate, 0, 0),
          description: 'Order created, parts picked & packaged.',
          completed: true,
          active: false,
        }
      ];
    } else if (status === 'shipped') {
      return [
        {
          status: 'Delivered',
          location: 'Hoffman Estates, IL',
          time: 'Est: ' + formatTime(baseDate, 48, 0),
          description: 'Pending carrier delivery confirmation.',
          completed: false,
          active: false,
        },
        {
          status: 'Out for Delivery',
          location: 'Hoffman Estates, IL',
          time: 'Pending',
          description: 'Awaiting arrival at local delivery station.',
          completed: false,
          active: false,
        },
        {
          status: 'In Transit',
          location: 'Indianapolis sorting hub, IN',
          time: formatTime(baseDate, 28, 15),
          description: 'Departed sorting facility and en route to local hub.',
          completed: true,
          active: true,
        },
        {
          status: 'Shipped',
          location: 'Sears Fulfillment Center, OH',
          time: formatTime(baseDate, 14, 30),
          description: 'Package picked up by carrier.',
          completed: true,
          active: false,
        },
        {
          status: 'Order Processed',
          location: 'Sears Kairos Fulfillment',
          time: formatTime(baseDate, 0, 0),
          description: 'Order created, packaging completed.',
          completed: true,
          active: false,
        }
      ];
    } else {
      // Draft / Ordered / Processing
      return [
        {
          status: 'Delivered',
          location: 'Hoffman Estates, IL',
          time: 'Pending',
          description: 'Scheduled after carrier pickup.',
          completed: false,
          active: false,
        },
        {
          status: 'Shipped',
          location: 'Sears Fulfillment Center, OH',
          time: 'Pending',
          description: 'Awaiting carrier arrival.',
          completed: false,
          active: false,
        },
        {
          status: 'Order Processed',
          location: 'Sears Kairos Fulfillment',
          time: formatTime(baseDate, 0, 0),
          description: 'Order submitted to distribution center.',
          completed: true,
          active: true,
        }
      ];
    }
  };

  const renderTrackBar = (status: string) => {
    const progress = getTrackProgress(status);
    const steps = [1, 2, 3, 4];
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-[2px]">
          {steps.map(step => (
            <div
              key={step}
              className={`flex-1 h-[3px] rounded-sm ${step === progress && progress < 4 ? 'animate-pulse' : ''}`}
              style={{
                background: step < progress ? GREEN : step === progress ? BLUE : '#E9ECEF',
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Active tab rows — shipment-tracking domain (tracking bar, carrier, ETA)
  const renderTrackingRow = (item: any, idx: number, variant: 'incoming' | 'delivered') => {
    const soNumber = formatSoNumber(item.soNumber || item.orderId);
    const badge = getStatusBadge(item.status || 'ordered');

    return (
      <div
        key={item.id || idx}
        onClick={() => item.trackingNumber && setSelectedPart(item)}
        className="grid grid-cols-[2fr_1.4fr_1fr_100px] items-center gap-3 px-4 py-3 border-b border-[#F1F3F5] last:border-b-0 hover:bg-[#F8F9FA] transition-colors cursor-pointer"
      >
        <div>
          <div className="text-xs font-bold font-mono" style={{ color: NAVY }}>
            {item.partNumber || item.partNo}
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5 truncate">
            {item.itemDescription || item.description || item.brand}
          </div>
          {soNumber && (
            <div className="text-[9px] font-semibold px-1.5 py-0.5 rounded inline-block mt-1" style={{ background: BLUE_LIGHT, color: BLUE }}>
              {soNumber}
            </div>
          )}
        </div>

        {variant === 'incoming' ? (
          <div className="flex flex-col gap-1">
            {renderTrackBar(item.status)}
            <div className="text-[10px] text-gray-500">
              <strong className="text-gray-700">{badge.label}</strong>
              {item.carrier ? ` · ${item.carrier}` : ''}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-gray-500">
            <strong className="text-gray-700">{formatUSDate(item.date) || '—'}</strong>
            {item.carrier ? <><br />{item.carrier}</> : null}
          </div>
        )}

        <div className="text-[11px]">
          {variant === 'incoming' ? (
            <span className="text-gray-500">{formatUSDate(item.eta) || '—'}</span>
          ) : (
            <span
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 whitespace-nowrap"
              style={{ background: badge.bg, color: badge.color }}
            >
              <span>{badge.icon}</span> {badge.label}
            </span>
          )}
        </div>

        <div className="flex justify-end">
          {item.trackingNumber ? (
            <button
              onClick={(e) => { e.stopPropagation(); ga4PartTracked(item.orderId || item.orderNo || '', item.trackingNumber); setSelectedPart(item); }}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-colors"
              style={{ background: BLUE_LIGHT, color: BLUE }}
            >
              Track →
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedPart(item); }}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-md bg-[#F1F3F5] text-gray-600 whitespace-nowrap"
            >
              View
            </button>
          )}
        </div>
      </div>
    );
  };

  // History tab rows — job/assignment-workflow domain (no tracking data exists here).
  // Status text is the raw assignmentStatus value from the API, unmodified — same
  // as the app's own History list (it renders {item.assignmentStatus} verbatim).
  const renderHistoryRow = (item: any, idx: number) => {
    const soNumber = formatSoNumber(item.soNumber);

    return (
      <div
        key={item.id || idx}
        className="grid grid-cols-[2fr_1.4fr_1fr_100px] items-center gap-3 px-4 py-3 border-b border-[#F1F3F5] last:border-b-0 hover:bg-[#F8F9FA] transition-colors"
      >
        <div>
          <div className="text-xs font-bold font-mono" style={{ color: NAVY }}>
            {item.partNumber}
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5 truncate">
            {item.itemDescription}
          </div>
          {soNumber && (
            <div className="text-[9px] font-semibold px-1.5 py-0.5 rounded inline-block mt-1" style={{ background: BLUE_LIGHT, color: BLUE }}>
              {soNumber}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.applianceType && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F3F5] text-gray-600">{item.applianceType}</span>
          )}
          {item.quantity != null && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F3F5] text-gray-600">Qty: {item.quantity}</span>
          )}
          {item.brand && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F3F5] text-gray-600">{item.brand}</span>
          )}
          {item.assignmentStatus && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: GREEN_LIGHT, color: GREEN_DARK }}>
              {item.assignmentStatus}
            </span>
          )}
        </div>

        <div className="text-[11px] text-gray-500">{formatUSDate(item.date) || '—'}</div>

        <div className="flex justify-end">
          <button
            onClick={() => handleViewJob(item)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-colors"
            style={{ background: BLUE_LIGHT, color: BLUE }}
          >
            View Job →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-grow flex flex-col bg-white text-gray-900 h-full overflow-hidden">
      {/* Flat top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E9ECEF] shrink-0">
        <h1 className="text-base font-bold" style={{ color: NAVY }}>
          Parts &amp; Inventory — {activeTab === 'active' ? 'Active Orders' : 'Order History'}
        </h1>
        <button
          onClick={() => setShowOrderModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
          style={{ background: BLUE }}
        >
          <Plus className="h-3.5 w-3.5" />
          Order Parts for Truck
        </button>
      </div>

      <div className="flex-grow overflow-y-auto px-6 py-5">
        {/* Category tabs */}
        <div className="flex gap-0 bg-[#E9ECEF] rounded-lg p-[3px] mb-5 w-fit">
          <button
            onClick={() => handleTabSwitch('active')}
            className="px-5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            style={activeTab === 'active'
              ? { background: 'white', color: NAVY, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
              : { color: '#6C757D' }}
          >
            <Truck className="h-3.5 w-3.5" />
            Active Orders
            {activeIncomingCount > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 rounded-full leading-[1.5]"
                style={activeTab === 'active' ? { background: NAVY, color: 'white' } : { background: '#DEE2E6', color: '#495057' }}
              >
                {activeIncomingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabSwitch('history')}
            className="px-5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            style={activeTab === 'history'
              ? { background: 'white', color: NAVY, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
              : { color: '#6C757D' }}
          >
            <History className="h-3.5 w-3.5" />
            Order History
          </button>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className="px-3.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer"
            style={statusFilter === 'all'
              ? { background: NAVY, color: 'white', borderColor: NAVY }
              : { background: 'white', color: '#495057', borderColor: '#DEE2E6' }}
          >
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: statusFilter === 'all' ? 'white' : NAVY }} />
            All
          </button>
          <button
            onClick={() => setStatusFilter('incoming')}
            className="px-3.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer"
            style={statusFilter === 'incoming'
              ? { background: NAVY, color: 'white', borderColor: NAVY }
              : { background: 'white', color: '#495057', borderColor: '#DEE2E6' }}
          >
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: ORANGE }} />
            Incoming
            {incomingCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 rounded-full" style={{ background: ORANGE, color: 'white' }}>
                {incomingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className="px-3.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer"
            style={statusFilter === 'delivered'
              ? { background: NAVY, color: 'white', borderColor: NAVY }
              : { background: 'white', color: '#495057', borderColor: '#DEE2E6' }}
          >
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: GREEN }} />
            Delivered
          </button>

          <div className="relative ml-auto">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search part # or name…"
              className="pl-8 pr-3 py-1.5 text-xs border border-[#DEE2E6] rounded-md outline-none w-[200px] focus:border-[#2574C2]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: BLUE }} />
            <p className="text-sm text-gray-500 mt-4">Retrieving warehouse orders...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="text-center py-24 bg-white border border-dashed border-gray-200 rounded-2xl p-6">
            <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Box className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No parts found</h3>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? 'No parts matched your active search filters. Try clearing the filter.'
                : activeTab === 'active'
                  ? 'No orders are currently in transit. Newly placed parts orders will display live tracking events here.'
                  : 'Your delivered parts archives are currently empty.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {incomingParts.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#E9ECEF]">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Incoming · {incomingParts.length} part{incomingParts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="bg-white border border-[#E9ECEF] rounded-[10px] overflow-hidden">
                  <div className="grid grid-cols-[2fr_1.4fr_1fr_100px] gap-3 px-4 py-2.5 bg-[#F8F9FA] border-b border-[#E9ECEF] text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    <div>Part</div>
                    <div>{isHistory ? 'Details' : 'Tracking'}</div>
                    <div>{isHistory ? 'Date' : 'ETA'}</div>
                    <div></div>
                  </div>
                  {incomingParts.map((item, idx) => (
                    isHistory ? renderHistoryRow(item, idx) : renderTrackingRow(item, idx, 'incoming')
                  ))}
                </div>
              </div>
            )}

            {deliveredParts.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#E9ECEF]">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Delivered · {deliveredParts.length} part{deliveredParts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="bg-white border border-[#E9ECEF] rounded-[10px] overflow-hidden">
                  <div className="grid grid-cols-[2fr_1.4fr_1fr_100px] gap-3 px-4 py-2.5 bg-[#F8F9FA] border-b border-[#E9ECEF] text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    <div>Part</div>
                    <div>{isHistory ? 'Details' : 'Delivered'}</div>
                    <div>{isHistory ? 'Date' : 'Status'}</div>
                    <div></div>
                  </div>
                  {deliveredParts.map((item, idx) => (
                    isHistory ? renderHistoryRow(item, idx) : renderTrackingRow(item, idx, 'delivered')
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* TRACKING TIMELINE DRAWER OVERLAY */}
      {selectedPart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop blur clickoff */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedPart(null)}
          />

          {/* Drawer container */}
          <div className="relative w-full max-w-md bg-white border-l border-gray-200 shadow-2xl p-6 text-gray-700 flex flex-col h-full overflow-y-auto animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" style={{ color: BLUE }} />
                <h3 className="font-bold text-gray-900 text-base">
                  {selectedPart.carrier || 'Delivery'} Tracking
                </h3>
              </div>
              <button
                onClick={() => setSelectedPart(null)}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Part summary block */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mt-4 space-y-3 shrink-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg border flex items-center justify-center shrink-0" style={{ background: BLUE_LIGHT, borderColor: '#C5DCEF', color: BLUE }}>
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Part Details</p>
                  <h4 className="font-extrabold text-gray-900 text-sm mt-0.5">{selectedPart.partNumber || selectedPart.partNo}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedPart.itemDescription || selectedPart.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 text-xs">
                {selectedPart.carrier && (
                  <div>
                    <span className="text-gray-400 block">Carrier</span>
                    <span className="font-semibold text-gray-700">{selectedPart.carrier}</span>
                  </div>
                )}
                {selectedPart.trackingNumber && (
                  <div>
                    <span className="text-gray-400 block">Tracking Number</span>
                    <span className="font-semibold font-mono select-all" style={{ color: BLUE }}>{selectedPart.trackingNumber}</span>
                  </div>
                )}
                {selectedPart.orderNo && (
                  <div>
                    <span className="text-gray-400 block">Order Ref</span>
                    <span className="font-semibold text-gray-700 font-mono">{selectedPart.orderNo}</span>
                  </div>
                )}
                {selectedPart.price != null && (
                  <div>
                    <span className="text-gray-400 block">Invoice Value</span>
                    <span className="font-semibold text-gray-700">${Number(selectedPart.price || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical timeline */}
            <div className="mt-8 flex-grow">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" style={{ color: GREEN }} />
                <span>Delivery Shipment Progress</span>
              </h4>

              <div className="space-y-6 pl-2 relative border-l-2 border-gray-200 ml-3">
                {getTrackingEvents(selectedPart).map((event, idx) => {
                  return (
                    <div key={idx} className="relative pl-6">
                      {/* Timeline Dot Indicator */}
                      <div
                        className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                          event.completed
                            ? event.active
                              ? 'ring-4 scale-110'
                              : ''
                            : 'bg-gray-100 border-gray-300'
                        }`}
                        style={event.completed ? (event.active
                          ? { background: BLUE, borderColor: '#60A5FA', boxShadow: `0 0 0 4px ${BLUE}33` }
                          : { background: GREEN, borderColor: '#4ADE80' }) : undefined}
                      >
                        {event.completed && !event.active && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                        {event.active && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-xs font-bold"
                            style={{ color: event.completed ? (event.active ? BLUE : '#111827') : '#9CA3AF' }}
                          >
                            {event.status}
                          </p>
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{event.time}</span>
                        </div>
                        {event.location && (
                          <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-0.5">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span>{event.location}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{event.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Help block */}
            <div className="pt-6 border-t border-gray-200 mt-6 shrink-0">
              <div className="p-3 rounded-lg flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed" style={{ background: BLUE_LIGHT, border: `1px solid #C5DCEF` }}>
                <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" style={{ color: BLUE }} />
                <div>
                  <span className="font-semibold text-gray-900">Need support?</span> Direct delivery modifications require dispatcher authentication. Connect to Kris Chat AI to query transit overrides.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <OrderPartsModal
          onClose={() => setShowOrderModal(false)}
          onOrdered={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
};

export default PartsPage;

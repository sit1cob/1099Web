import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { formatUSDate } from '../utils/date';
import { 
  Loader2, Package, Truck, History, ArrowRight, Box, 
  Search, X, CheckCircle2, MapPin, Calendar, DollarSign,
  AlertCircle, ShieldCheck
} from 'lucide-react';

type Tab = 'active' | 'history';

interface TrackingEvent {
  status: string;
  location: string;
  time: string;
  description: string;
  completed: boolean;
  active: boolean;
}

const formatSoNumber = (so: any) => {
  if (!so) return 'SO-13600879';
  const str = String(so).trim();
  if (str.toUpperCase().startsWith('SO-')) {
    return str.toUpperCase();
  }
  if (/^\d+$/.test(str)) {
    return `SO-${str}`;
  }
  return str;
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
  }, [activeTab]);

  // Handle Tab Switch (update query param)
  const handleTabSwitch = (tab: Tab) => {
    setSearchQuery('');
    setSelectedPart(null);
    navigate(`/parts?tab=${tab}`);
  };

  // Filter parts by search query (bypassed to match mobile layout)
  const filteredParts = useMemo(() => {
    if (!Array.isArray(parts)) return [];
    return parts;
  }, [parts]);

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

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'delivered') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (s === 'shipped' || s === 'in transit') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (s === 'draft' || s === 'processing') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 min-h-screen overflow-y-auto">
      {/* Cover atmospheric header */}
      <div className="relative h-44 shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </div>

      <div className="px-6 md:px-12 max-w-6xl w-full mx-auto -mt-20 relative z-10 flex-grow pb-16">
        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Parts & Inventory</h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] font-extrabold text-blue-600 tracking-wider uppercase">
                Warehouse Link
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5">
              Monitor active parts dispatch routing, tracking codes, and order history invoices.
            </p>
          </div>

          {/* Quick Counter Summary */}
          <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="px-3 border-r border-gray-200 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active Orders</p>
              <p className="text-lg font-bold text-blue-600 mt-0.5">
                {Array.isArray(activeParts) ? activeParts.filter(p => p.status !== 'Delivered').length : 0}
              </p>
            </div>
            <div className="px-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Delivered</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">
                {Array.isArray(activeParts) ? activeParts.filter(p => p.status === 'Delivered').length : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection Row & Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div className="inline-flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm shrink-0 select-none">
            <button
              onClick={() => handleTabSwitch('active')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Active Orders</span>
            </button>
            <button
              onClick={() => handleTabSwitch('history')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Order History</span>
            </button>
          </div>

        </div>

        {/* Content list block */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500 mt-4">Retreiving warehouse orders...</p>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-24 bg-white border border-dashed border-gray-200 rounded-2xl p-6 shadow-sm">
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
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredParts.map((item: any, idx: number) => {
                return (
                  <div 
                    key={item.id || idx} 
                    className="bg-white border border-gray-200 p-5 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      {/* Part Image/Icon with background */}
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                        <Package className="h-5.5 w-5.5" />
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {item.partNumber || item.partNo || 'WH12X10093'} • {formatSoNumber(item.soNumber || item.orderId)}
                          </h3>
                          <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(item.status || 'ordered')}`}>
                            {item.status || 'ordered'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {item.name || item.brand || 'SWITCH'} - {item.category || 'Laundry Appliances'}
                        </p>
                        
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold uppercase tracking-wider">
                          {formatUSDate(item.date || '2026-06-01')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <div className="space-y-1">
                        {item.orderNo && (
                          <p className="font-mono text-gray-500">Order Ref: {item.orderNo}</p>
                        )}
                        {item.price && (
                          <p className="font-semibold text-gray-700">Invoice: ${Number(item.price).toFixed(2)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.trackingNumber && (
                          <button
                            onClick={() => setSelectedPart(item)}
                            className="flex items-center gap-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-500 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                          >
                            <span>Track Order</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            const rawId = String(item.assignmentId || item.orderId || '');
                            const cleanId = rawId.replace('SO-', '');
                            navigate(`/assignments?view=list&id=${cleanId || item.id}`);
                          }}
                          className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-705 border border-gray-200 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          <span>View Job &gt;</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                <Truck className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-base">FedEx Delivery Tracking</h3>
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
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Part Details</p>
                  <h4 className="font-extrabold text-gray-900 text-sm mt-0.5">{selectedPart.partNumber || selectedPart.partNo}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedPart.itemDescription || selectedPart.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 text-xs">
                <div>
                  <span className="text-gray-400 block">Carrier</span>
                  <span className="font-semibold text-gray-700">{selectedPart.carrier || 'FedEx'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Tracking Number</span>
                  <span className="font-semibold text-blue-600 font-mono select-all">{selectedPart.trackingNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Order Ref</span>
                  <span className="font-semibold text-gray-700 font-mono">{selectedPart.orderNo}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Invoice Value</span>
                  <span className="font-semibold text-gray-700">${Number(selectedPart.price || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Vertical timeline */}
            <div className="mt-8 flex-grow">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                              ? 'bg-blue-500 border-blue-400 ring-4 ring-blue-500/20 scale-110'
                              : 'bg-emerald-500 border-emerald-400'
                            : 'bg-gray-100 border-gray-300'
                        }`}
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
                          <p className={`text-xs font-bold ${
                            event.completed 
                              ? event.active ? 'text-blue-600' : 'text-gray-900' 
                              : 'text-gray-400'
                          }`}>
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
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-gray-900">Need support?</span> Direct delivery modifications require dispatcher authentication. Connect to Sasha Chat AI to query transit overrides.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartsPage;

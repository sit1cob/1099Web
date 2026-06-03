import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApiService from '../api/apiService';
import { mockDb } from '../api/mockData';
import { formatUSDate } from '../utils/date';
import {
  Wrench, MapPin, Calendar, Clock, Phone, AlertTriangle, 
  CheckCircle, Navigation, PlayCircle, Loader2, ArrowRight, 
  ClipboardList, Plus, Search, Trash2, X, AlertCircle, 
  Sparkles, Check, RefreshCw, Camera, ChevronRight, CheckSquare, Square,
  Copy, Refrigerator, ArrowLeft, User, FileText, Package, ExternalLink,
  ChevronLeft, Truck, MessageSquare
} from 'lucide-react';


import { RESCHEDULE_REASONS } from '../types/reschedule.types';

const COMPLETION_TYPES = [
  'Completed', 'Rescheduled – With Part', 'Rescheduled – Without Part',
  'Customer Not Home', 'Cancel at Door', 'Estimate Declined',
];

const REPAIR_TYPES = ['Service Attempt', 'Standard Repair', 'Major Repair', 'Sealed System Repair'];
const REPAIR_CODES = ['No Fault Found', 'Mechanical Failure', 'Electrical/Control', 'Sealed System', 'Part Replacement', 'User Education', 'Other'];

const CNH_REASONS = ['No Answer at Door', 'Customer Not Home', 'Customer Cancelled Day Of', 'Locked Out / No Access', 'Wrong Address Provided'];
const CANCEL_REASONS = ['Customer Declined Service', 'Unsafe Working Conditions', 'Appliance Not Accessible', 'Customer Not Present and No Access', 'Other Safety Concern'];
const ESTIMATE_DECLINE_REASONS = ['Cost Too High', 'Customer Willing to Repair Themselves', 'Customer Wants Replacement Instead', 'Warranty/Authorization Issues', 'Other'];

const STATUS_TABS = ['All', 'Assigned', 'In Progress', 'Available', 'Non-Sears Job'];

const DOT_COLORS: Record<string, string> = {
  All: '',
  Assigned: 'bg-[#2372BE]',
  'In Progress': 'bg-[#E57725]',
  Available: 'bg-[#28A745]',
  'Non-Sears Job': 'bg-[#F59E0B]',
};

const getStatusStyle = (status: string) => {
  const s = status.toUpperCase().replace(/\s+/g, '_');
  switch (s) {
    case 'ASSIGNED':
      return { bg: 'bg-[#2372BE]', text: 'text-white' };
    case 'ARRIVED':
    case 'IN_PROGRESS':
      return { bg: 'bg-[#E57725]', text: 'text-white' };
    case 'PART_ARRIVED':
    case 'WAITING_ON_PARTS':
    case 'PART_ORDER':
    case 'RESCHEDULED':
      return { bg: 'bg-[#FF7052]', text: 'text-white' };
    case 'COMPLETED':
      return { bg: 'bg-[#16A34A]', text: 'text-white' };
    case 'AVAILABLE':
      return { bg: 'bg-[#28A745]', text: 'text-white' };
    case 'NON_SEARS':
      return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E] border border-amber-200/50' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
};

const getStatusAccentColor = (status: string) => {
  const s = status.toUpperCase().replace(/\s+/g, '_');
  switch (s) {
    case 'IN_PROGRESS':
    case 'ARRIVED':
    case 'PART_ARRIVED':
    case 'WAITING_ON_PARTS':
    case 'PART_ORDER':
    case 'RESCHEDULED':
      return '#E57725'; // orange/amber
    case 'ASSIGNED':
      return '#2372BE'; // blue
    case 'COMPLETED':
    case 'AVAILABLE':
      return '#16A34A'; // green
    case 'NON_SEARS':
      return '#F59E0B'; // yellow/gold
    default:
      return '#CBD5F5';
  }
};


const AssignmentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State variables
  const [assignments, setAssignments] = useState<any[]>([]);
  const [nonShsJobs, setNonShsJobs] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Tab View: list or calendar
  const viewType = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('view') === 'calendar' ? 'calendar' : 'list';
  }, [location.search]);

  // Read selected job from query params if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    if (idParam) {
      setSelectedId(idParam);
    }
  }, [location.search]);

  // Modals & Drawers trigger states
  const [showLogNonSears, setShowLogNonSears] = useState(false);
  const [nonSearsReview, setNonSearsReview] = useState(false);
  const [showArrivedConfirm, setShowArrivedConfirm] = useState(false);
  const [showTrackPartsModal, setShowTrackPartsModal] = useState(false);
  const [showTrackDetailModal, setShowTrackDetailModal] = useState(false);
  const [selectedTrackPart, setSelectedTrackPart] = useState<any>(null);
  const [trackDetailBackToSummary, setTrackDetailBackToSummary] = useState(false);
  const [showApplianceDrawer, setShowApplianceDrawer] = useState(false);
  const [showRescheduleWizard, setShowRescheduleWizard] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Success states
  const [successMsg, setSuccessMsg] = useState<{ title: string; desc: string; type: 'reschedule' | 'complete' } | null>(null);

  // Form states
  const [nonSearsForm, setNonSearsForm] = useState({
    source: '',
    sourceOther: '',
    appliance: '',
    brand: '',
    jobChannel: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    issue: '',
    notes: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    startHour: '6',
    startMinute: '00',
    startPeriod: 'PM',
    duration: '1 hour',
    zipCode: '',
    clientType: 'Homeowner'
  });

  const [applianceForm, setApplianceForm] = useState({
    brand: '',
    model: '',
    serial: '',
    issue: '',
    scanning: false
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    step: 1,
    reason: RESCHEDULE_REASONS[0] || 'Customer Not Home / No-Show',
    notes: '',
    photoUploaded: false,
    selectedDate: '2026-06-03',
    selectedTimeSlot: '12:00 PM - 4:00 PM'
  });

  const [partsSearch, setPartsSearch] = useState({
    tab: 'model', // model or number
    query: '',
    results: [] as any[],
    searching: false
  });
  const [cart, setCart] = useState<any[]>([]);
  const [partsError, setPartsError] = useState<string | null>(null);

  const [completeForm, setCompleteForm] = useState({
    completionType: 'Completed',
    repairType: 'Service Attempt',
    repairCode: 'No Fault Found',
    notes: '',
    photoUploaded: false,
    acknowledged: false,
    rescheduleReason: RESCHEDULE_REASONS[0] || '',
    nextAppointment: '',
    cnhReason: CNH_REASONS[0] || '',
    cancelReason: CANCEL_REASONS[0] || '',
    estimateDeclineReason: ESTIMATE_DECLINE_REASONS[0] || ''
  });

  // Canvas ref for signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [copiedModel, setCopiedModel] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Parts tracking states and logic
  const [activeJobParts, setActiveJobParts] = useState<any[]>([]);
  const [loadingActiveJobParts, setLoadingActiveJobParts] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const loadActiveJobParts = async () => {
    if (!selectedId) return;
    setLoadingActiveJobParts(true);
    try {
      const res = await ApiService.getAssignmentParts(selectedId);
      if (res.success) {
        setActiveJobParts(res.data || []);
      }
    } catch (e) {
      console.error("Failed to load active job parts", e);
    } finally {
      setLoadingActiveJobParts(false);
    }
  };

  useEffect(() => {
    loadActiveJobParts();
  }, [selectedId, assignments]);

  const loadTrackingDetails = async (part: any) => {
    if (!part || !selectedId) return;
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingData(null);
    try {
      const trackingNo = part.trackingNumber || part.shipmentTrackingNumber;
      if (!trackingNo) {
        setTrackingError("No tracking number available for this part");
        setTrackingLoading(false);
        return;
      }
      const res = await ApiService.getStatusByTrackingNo(selectedId, { trackingNumber: trackingNo });
      setTrackingData(res?.data || res);
    } catch (e: any) {
      console.error(e);
      setTrackingError(e?.message || "Failed to load tracking details");
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (showTrackDetailModal && selectedTrackPart) {
      loadTrackingDetails(selectedTrackPart);
    }
  }, [showTrackDetailModal, selectedTrackPart]);

  // Load assignments, non-SHS jobs, and available jobs
  const loadData = async () => {
    setIsLoading(true);
    try {
      let firstId: string | null = null;
      const res = await ApiService.getMyAssignments();
      if (res.success) {
        setAssignments(res.data || []);
        if (res.data && res.data.length > 0) {
          firstId = res.data[0].id;
        }
      }
      const nonShsRes = await ApiService.getNonShsJobs();
      if (nonShsRes.success) {
        setNonShsJobs(nonShsRes.data || []);
        if (!firstId && nonShsRes.data && nonShsRes.data.length > 0) {
          firstId = nonShsRes.data[0].id;
        }
      }
      const availRes = await ApiService.getAvailableJobs();
      if (availRes.success) {
        setAvailableJobs(availRes.data || []);
        if (!firstId && availRes.data && availRes.data.length > 0) {
          firstId = String(availRes.data[0].id || availRes.data[0].soNumber);
        }
      }
      if (!selectedId && firstId) {
        setSelectedId(firstId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter assignments, available jobs, and non-Sears jobs
  const filtered = useMemo(() => {
    let list: any[] = [];
    const mappedSears = assignments.map(a => ({ ...a, _type: 'sears' as const }));
    const mappedAvail = availableJobs.map(j => ({
      id: String(j.id || j.soNumber),
      soNumber: j.soNumber,
      status: 'available',
      scheduledDate: j.scheduledDate,
      _type: 'available' as const,
      job: {
        id: String(j.id || j.soNumber),
        soNumber: j.soNumber,
        customerName: 'Available Job',
        customerCity: j.customerCity,
        customerState: j.customerState,
        customerZip: j.customerZip || '60192',
        applianceType: j.applianceType || j.appliance,
        manufacturerBrand: j.manufacturerBrand || j.brand,
        scheduledDate: j.scheduledDate,
        scheduledTimeWindow: j.scheduledTimeWindow,
        priority: false,
      }
    }));
    const mappedNonSears = nonShsJobs.map(n => ({
      id: n.id || `non-shs-${Date.now()}`,
      soNumber: `External (${n.source})`,
      status: 'non_sears',
      scheduledDate: (n.scheduledAt || '').split('T')[0],
      scheduledArrival: n.scheduledAt,
      _type: 'non-sears' as const,
      job: {
        id: n.id,
        soNumber: `External (${n.source})`,
        customerName: `Non-Sears (${n.source})`,
        customerCity: 'External Location',
        customerState: '',
        customerZip: '',
        applianceType: n.appliance,
        manufacturerBrand: n.brand,
        scheduledDate: (n.scheduledAt || '').split('T')[0],
        scheduledTimeWindow: n.scheduledAt ? new Date(n.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
        priority: false,
        notes: n.notes,
        issue: n.issue,
      }
    }));

    if (activeTab === 'All') {
      list = [...mappedSears, ...mappedAvail, ...mappedNonSears];
    } else if (activeTab === 'Assigned') {
      list = mappedSears.filter(a => (a.status || '').toLowerCase() === 'assigned');
    } else if (activeTab === 'In Progress') {
      list = mappedSears.filter(a => ['arrived', 'in_progress', 'part_order', 'rescheduled'].includes((a.status || '').toLowerCase()));
    } else if (activeTab === 'Available') {
      list = mappedAvail;
    } else if (activeTab === 'Non-Sears Job') {
      list = mappedNonSears;
    }

    if (searchQuery.trim()) {
      const rawQ = searchQuery.toLowerCase().trim();
      const normalizedQ = rawQ.replace(/^so[-#\s]*/g, '');
      list = list.filter(a => {
        const soNum = (a.soNumber || '').toLowerCase();
        const jobSoNum = (a.job?.soNumber || '').toLowerCase();
        const aId = String(a.id || '').toLowerCase();
        const jobId = String(a.job?.id || '').toLowerCase();

        return (
          soNum.includes(rawQ) ||
          jobSoNum.includes(rawQ) ||
          aId.includes(rawQ) ||
          jobId.includes(rawQ) ||
          (normalizedQ && soNum.includes(normalizedQ)) ||
          (normalizedQ && jobSoNum.includes(normalizedQ)) ||
          (normalizedQ && aId.includes(normalizedQ)) ||
          (normalizedQ && jobId.includes(normalizedQ)) ||
          (a.job?.customerName || '').toLowerCase().includes(rawQ) ||
          (a.job?.customerCity || '').toLowerCase().includes(rawQ) ||
          (a.job?.applianceType || '').toLowerCase().includes(rawQ)
        );
      });
    }

    // Helper to parse date string into a Date object for sorting
    const parseDate = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    };

    // Sort by date descending (newer dates first) to match mobile app logic
    list.sort((a, b) => {
      const dateA = parseDate(a.scheduledArrival || a.job?.scheduledDate || a.scheduledDate || a.assignedAt);
      const dateB = parseDate(b.scheduledArrival || b.job?.scheduledDate || b.scheduledDate || b.assignedAt);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    return list;
  }, [assignments, availableJobs, nonShsJobs, activeTab, searchQuery]);

  const activeJobDetails = useMemo(() => {
    if (!selectedId) return null;
    const mappedSears = assignments.map(a => ({ ...a, _type: 'sears' as const }));
    const mappedAvail = availableJobs.map(j => ({
      id: String(j.id || j.soNumber),
      soNumber: j.soNumber,
      status: 'available',
      scheduledDate: j.scheduledDate,
      _type: 'available' as const,
      job: {
        id: String(j.id || j.soNumber),
        soNumber: j.soNumber,
        customerName: 'Available Job',
        customerCity: j.customerCity,
        customerState: j.customerState,
        customerZip: j.customerZip || '60192',
        applianceType: j.applianceType || j.appliance,
        manufacturerBrand: j.manufacturerBrand || j.brand,
        scheduledDate: j.scheduledDate,
        scheduledTimeWindow: j.scheduledTimeWindow,
        priority: false,
      }
    }));
    const mappedNonSears = nonShsJobs.map(n => ({
      id: n.id || `non-shs-${Date.now()}`,
      soNumber: `External (${n.source})`,
      status: 'non_sears',
      scheduledDate: (n.scheduledAt || '').split('T')[0],
      _type: 'non-sears' as const,
      job: {
        id: n.id,
        soNumber: `External (${n.source})`,
        customerName: `Non-Sears (${n.source})`,
        customerCity: 'External Location',
        customerState: '',
        customerZip: '',
        applianceType: n.appliance,
        manufacturerBrand: n.brand,
        scheduledDate: (n.scheduledAt || '').split('T')[0],
        scheduledTimeWindow: n.scheduledAt ? new Date(n.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
        priority: false,
        notes: n.notes,
        issue: n.issue,
      }
    }));
    const combined = [...mappedSears, ...mappedAvail, ...mappedNonSears];
    return combined.find(a => String(a.id) === String(selectedId)) || null;
  }, [assignments, availableJobs, nonShsJobs, selectedId]);

  const activeAssignments = useMemo(() => {
    return assignments.filter(a => !['completed', 'cancelled', 'customer_not_home', 'estimate_declined'].includes((a.status || '').toLowerCase()));
  }, [assignments]);

  const statusCount = (status: string) => {
    if (status === 'All') return activeAssignments.length + availableJobs.length + nonShsJobs.length;
    if (status === 'Assigned') return activeAssignments.filter(a => (a.status || '').toLowerCase() === 'assigned').length;
    if (status === 'In Progress') return activeAssignments.filter(a => ['arrived', 'in_progress', 'part_order', 'rescheduled'].includes((a.status || '').toLowerCase())).length;
    if (status === 'Available') return availableJobs.length;
    if (status === 'Non-Sears Job') return nonShsJobs.length;
    return 0;
  };

  // Log Non-Sears Job
  const handleLogNonSears = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let hour24 = parseInt(nonSearsForm.startHour);
      if (nonSearsForm.startPeriod === 'PM' && hour24 !== 12) hour24 += 12;
      if (nonSearsForm.startPeriod === 'AM' && hour24 === 12) hour24 = 0;
      const payload = {
        scheduledAt: `${nonSearsForm.scheduledDate}T${String(hour24).padStart(2, '0')}:${nonSearsForm.startMinute}:00.000Z`,
        source: nonSearsForm.source === 'Someone Else' ? (nonSearsForm.sourceOther || 'Someone Else') : nonSearsForm.source,
        appliance: nonSearsForm.appliance,
        brand: nonSearsForm.brand,
        jobChannel: nonSearsForm.jobChannel,
        customerName: nonSearsForm.customerName,
        customerPhone: nonSearsForm.customerPhone,
        customerAddress: nonSearsForm.customerAddress,
        issue: nonSearsForm.issue,
        notes: nonSearsForm.notes,
        duration: nonSearsForm.duration,
        zipCode: nonSearsForm.zipCode,
        clientType: nonSearsForm.clientType
      };
      await ApiService.logNonShsJob(payload);
      setShowLogNonSears(false);
      // Reset form
      setNonSearsForm({
        source: '',
        sourceOther: '',
        appliance: '',
        brand: '',
        jobChannel: '',
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        issue: '',
        notes: '',
        scheduledDate: new Date().toISOString().slice(0, 10),
        startHour: '6',
        startMinute: '00',
        startPeriod: 'PM',
        duration: '1 hour',
        zipCode: '',
        clientType: 'Homeowner'
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Status handlers
  const handleMarkArrived = async () => {
    if (!selectedId) return;
    try {
      await ApiService.updateAssignmentStatus(selectedId, 'arrived');
      setShowArrivedConfirm(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Scan Appliance details (OCR simulation)
  const handleScanAppliance = () => {
    setApplianceForm(prev => ({ ...prev, scanning: true }));
    setTimeout(() => {
      setApplianceForm({
        brand: 'Speed Queen',
        model: 'VA6013',
        serial: 'SQ98402948',
        issue: 'Washing machine clutch slipping and leaking fluid',
        scanning: false
      });
    }, 1500);
  };

  const handleSaveAppliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      await ApiService.updateApplianceInfo(selectedId, {
        applianceBrandname: applianceForm.brand,
        applianceModel: applianceForm.model,
        applianceSerial: applianceForm.serial,
        applianceIssue: applianceForm.issue,
        status: 'in_progress'
      });
      setShowApplianceDrawer(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Reschedule wizard flow
  const handleNextRescheduleStep = () => {
    setRescheduleForm(prev => ({ ...prev, step: 2 }));
  };

  const handleConfirmReschedule = async () => {
    if (!selectedId) return;
    try {
      const formattedDate = `${rescheduleForm.selectedDate}T${rescheduleForm.selectedTimeSlot.includes('8:00') ? '08:00' : rescheduleForm.selectedTimeSlot.includes('12:00') ? '12:00' : '16:00'}:00.000Z`;
      await ApiService.rescheduleAssignment(selectedId, {
        reasonCode: rescheduleForm.reason,
        requestedArrivalDate: formattedDate,
        notes: rescheduleForm.notes,
        source: 'vendor_portal'
      });
      
      setShowRescheduleWizard(false);
      setRescheduleForm({
        step: 1,
        reason: 'parts_delayed',
        notes: '',
        photoUploaded: false,
        selectedDate: '2026-06-03',
        selectedTimeSlot: '12:00 PM - 4:00 PM'
      });
      setSuccessMsg({
        title: 'Service Rescheduled Successfully',
        desc: `Job order has been updated to next available window on ${rescheduleForm.selectedDate} (${rescheduleForm.selectedTimeSlot}). Customer notified via automated SMS.`,
        type: 'reschedule'
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Parts search & cart flow
  const handlePartsSearch = async () => {
    setPartsSearch(prev => ({ ...prev, searching: true }));
    try {
      let res: any;
      if (partsSearch.tab === 'model') {
        res = await ApiService.searchModels(Number(selectedId), partsSearch.query);
        if (res.success && res.data && res.data[0]) {
          // get parts for model
          const partsRes = await ApiService.getModelParts(Number(selectedId), res.data[0].modelId);
          if (partsRes.success) {
            setPartsSearch(prev => ({ ...prev, results: partsRes.data || [], searching: false }));
          }
        } else {
          setPartsSearch(prev => ({ ...prev, results: [], searching: false }));
        }
      } else {
        res = await ApiService.searchPartsByPartNo(partsSearch.query);
        if (res.success) {
          setPartsSearch(prev => ({ ...prev, results: res.data || [], searching: false }));
        } else {
          setPartsSearch(prev => ({ ...prev, results: [], searching: false }));
        }
      }
    } catch (e) {
      console.error(e);
      setPartsSearch(prev => ({ ...prev, results: [], searching: false }));
    }
  };

  const handleAddToCart = (part: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.partNo === part.partNo);
      if (existing) {
        return prev.map(i => i.partNo === part.partNo ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...part, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (partNo: string, amount: number) => {
    setCart(prev => prev.map(item => {
      if (item.partNo === partNo) {
        return { ...item, quantity: Math.max(1, item.quantity + amount) };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (partNo: string) => {
    setCart(prev => prev.filter(i => i.partNo !== partNo));
  };

  // Parts stock/availability check
  const handleCheckAvailability = () => {
    const hasClutchOil = cart.some(item => item.name === 'CLUTCH OIL' || item.partNo === '13516');
    if (hasClutchOil) {
      setPartsError(
        '⚠️ Error: CLUTCH OIL (Part #13516) is out of stock in the regional warehouse. Estimated back-order delay is 5 days. Rescheduling job is required.'
      );
    } else {
      setPartsError(null);
      alert('Parts availability check passed! All selected parts are in stock in the dispatch warehouse.');
    }
  };

  const handleAddPartsToJob = async () => {
    if (!selectedId) return;
    try {
      for (const item of cart) {
        await ApiService.addPart(selectedId, {
          partNo: item.partNo,
          quantity: item.quantity,
          brand: item.brand || 'Speed Queen',
          itemDescription: item.name || item.description,
          sourceType: 'ordered',
          draft: partsError ? true : false,
          price: item.price || 15.00
        });
      }
      // If clutch oil (partsError active), mark job as part_order and launch reschedule
      if (partsError) {
        await ApiService.updateAssignmentStatus(selectedId, 'part_order');
        setShowPartsModal(false);
        setCart([]);
        setPartsError(null);
        // Prompt reschedule
        setShowRescheduleWizard(true);
        setRescheduleForm(prev => ({
          ...prev,
          step: 1,
          reason: 'parts_delayed',
          notes: 'CLUTCH OIL #13516 on backorder. Need to return when part arrives.'
        }));
      } else {
        setShowPartsModal(false);
        setCart([]);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Complete job (Signature pad drawing functions)
  useEffect(() => {
    if (showCompleteModal) {
      setHasSignature(false);
      // Use setTimeout to ensure the DOM has updated and canvasRef is populated
      setTimeout(() => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
          }
        }
      }, 50);
    }
  }, [showCompleteModal]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    // get coordinates
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleCompleteJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      const normalizeCT = (v: string) => (v || '').trim().toLowerCase().replace(/\u2013|\u2014/g, '-').replace(/\s+/g, ' ');
      const ctType = normalizeCT(completeForm.completionType);
      const isCompleteRescheduled = ctType.includes('rescheduled');
      const isCompleteCNH = ctType === 'customer not home';
      const isCompleteCancelAtDoor = ctType === 'cancel at door';
      const isCompleteEstimateDeclined = ctType === 'estimate declined';
      const isCompleteCompleted = ctType === 'completed';

      const isCustomerAcknowledgeRequired = isCompleteCompleted || isCompleteEstimateDeclined;
      const isSignatureRequired = isCustomerAcknowledgeRequired;
      const isPhotoRequired = false;

      if (isCompleteRescheduled && !completeForm.rescheduleReason) {
        alert('Reschedule reason is required');
        return;
      }
      if (isCompleteRescheduled && !completeForm.nextAppointment) {
        alert('Next appointment is required');
        return;
      }
      if (isCompleteCNH && !completeForm.cnhReason) {
        alert('Customer Not Home reason is required');
        return;
      }
      if (isCompleteCancelAtDoor && !completeForm.cancelReason) {
        alert('Cancel reason is required');
        return;
      }
      if (isCompleteEstimateDeclined && !completeForm.estimateDeclineReason) {
        alert('Estimate decline reason is required');
        return;
      }
      if (isCustomerAcknowledgeRequired && !completeForm.acknowledged) {
        alert('Customer acknowledgment is required');
        return;
      }
      if (isSignatureRequired && !hasSignature) {
        alert('Customer signature is required');
        return;
      }

      const payload: any = {
        status: isCompleteCompleted ? 'completed' : isCompleteRescheduled ? 'rescheduled' : isCompleteCNH ? 'customer_not_home' : isCompleteCancelAtDoor ? 'cancelled' : isCompleteEstimateDeclined ? 'estimate_declined' : 'completed',
        serviceAttemptType: completeForm.repairType,
        completionNotes: completeForm.notes,
        completionType: completeForm.completionType,
        repairCode: completeForm.repairCode,
        customerAcknowledged: isCustomerAcknowledgeRequired ? completeForm.acknowledged : false
      };

      if (isCompleteRescheduled) {
        payload.rescheduleReason = completeForm.rescheduleReason;
        payload.nextAppointment = completeForm.nextAppointment;
      }
      if (isCompleteCNH) {
        payload.cnhReason = completeForm.cnhReason;
      }
      if (isCompleteCancelAtDoor) {
        payload.cancelReason = completeForm.cancelReason;
      }
      if (isCompleteEstimateDeclined) {
        payload.estimateDeclineReason = completeForm.estimateDeclineReason;
      }

      await ApiService.updateAssignmentStatusV3(selectedId, payload);

      setShowCompleteModal(false);
      // Reset form
      setCompleteForm({
        completionType: 'Completed',
        repairType: 'Service Attempt',
        repairCode: 'No Fault Found',
        notes: '',
        photoUploaded: false,
        acknowledged: false,
        rescheduleReason: RESCHEDULE_REASONS[0] || '',
        nextAppointment: '',
        cnhReason: CNH_REASONS[0] || '',
        cancelReason: CANCEL_REASONS[0] || '',
        estimateDeclineReason: ESTIMATE_DECLINE_REASONS[0] || ''
      });
      setSuccessMsg({
        title: 'Job Order Status Updated',
        desc: `Service order status has been updated to ${completeForm.completionType}.`,
        type: 'complete'
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Quick helper: check if non-sears is on a day
  const getNonSearsJobsForDay = (dateStr: string) => {
    return nonShsJobs.filter(j => {
      if (!j || !j.scheduledAt) return false;
      const s = String(j.scheduledAt);
      if (s.startsWith(dateStr)) return true;
      try {
        const d = new Date(j.scheduledAt);
        if (!isNaN(d.getTime())) {
          return d.toISOString().startsWith(dateStr);
        }
      } catch (e) {}
      return false;
    });
  };

  const getSearsJobsForDay = (dateStr: string) => {
    return assignments.filter(a => {
      const checkStr = (val: any) => {
        if (!val) return false;
        const s = String(val);
        if (s.startsWith(dateStr)) return true;
        try {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            return d.toISOString().startsWith(dateStr);
          }
        } catch (e) {}
        return false;
      };
      return checkStr(a.scheduledDate) || checkStr(a.job?.scheduledDate) || checkStr(a.scheduledArrival);
    });
  };

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 overflow-hidden h-full">
      
      {/* Top Main Grid Split: Left pane List/Calendar, Right pane details */}
      <div className="flex-grow flex overflow-hidden">
        
        {/* Left Column Workspace */}
        <div className="w-full lg:w-[450px] shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <span>My Assignments</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{statusCount('All')} total active orders</p>
              </div>
              
              {/* Log Non-Sears Job Trigger */}
              <button
                onClick={() => setShowLogNonSears(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg text-xs font-bold text-blue-600 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Non-Sears</span>
              </button>
            </div>
            
          </div>

          {/* List or Calendar Sub-Router tabs */}
          <div className="px-5 pt-3 border-b border-gray-200 shrink-0 flex items-center justify-between bg-gray-50/50">
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/assignments?view=list')}
                className={`pb-2.5 px-2 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                  viewType === 'list' ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => navigate('/assignments?view=calendar')}
                className={`pb-2.5 px-2 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                  viewType === 'calendar' ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Weekly Calendar
              </button>
            </div>

            {/* List count badge */}
            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 font-bold mb-2">
              {viewType === 'list' ? `${filtered.length} Jobs` : (() => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                const mon = new Date(today);
                mon.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
                const sun = new Date(mon);
                sun.setDate(mon.getDate() + 6);
                const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return `${mNames[mon.getMonth()]} ${mon.getDate()}-${sun.getDate()}`;
              })()}
            </span>
          </div>

          {/* LIST VIEW SUB-TAB PANEL */}
          {viewType === 'list' && (
            <div className="flex-grow flex flex-col overflow-hidden">
              
              {/* Dynamic Status Pill Filters */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 shrink-0 overflow-x-auto flex gap-1.5 scrollbar-none">
                {STATUS_TABS.map(tab => {
                  const count = statusCount(tab);
                  const isActive = activeTab === tab;
                  const dot = DOT_COLORS[tab];
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                          : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {!isActive && dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                      <span>{tab === 'Part Order' ? 'Parts' : tab}</span>
                      <span className={isActive ? 'text-gray-900/80' : 'text-gray-400'}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Route Sequence Suggestion optimization Banner */}
              <div className="p-3 border-b border-blue-100 bg-blue-50 flex items-start gap-2.5 shrink-0 select-none">
                <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div className="text-[11px] leading-relaxed text-blue-700">
                  <span className="font-extrabold text-blue-800">Sasha Route Intelligence:</span> Suggested sequence optimizes drive time. Map Joe Matteo <span className="font-mono">SO-13694840</span> first, then Joe Matteo <span className="font-mono">SO-13694841</span> to save 12 mins.
                </div>
              </div>

              {/* Scrollable list items */}
              <div className="flex-grow overflow-y-auto p-4 space-y-2.5">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm">
                    <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
                    <span>No assignments match criteria</span>
                  </div>
                ) : (
                  filtered.map(a => {
                    const isSel = String(a.id) === String(selectedId);
                    const status = a.status || 'assigned';
                    const accentColor = getStatusAccentColor(status);
                    const pillStyle = getStatusStyle(status);
                    const rawSo = a.job?.soNumber || a.soNumber || a.id;
                    const soNumber = String(rawSo).trim().toUpperCase().startsWith('SO-')
                      ? String(rawSo).trim().toUpperCase()
                      : `SO-${String(rawSo).trim()}`;
                    const dateStr = a.scheduledDate || a.job?.scheduledDate;
                    const applianceType = a.job?.applianceType || a.job?.appliance || 'Service Job';
                    const customerName = a.job?.customerName || '';
                    
                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          setSelectedId(a.id);
                          navigate(`/assignments?view=list&id=${a.id}`);
                        }}
                        style={{
                          borderLeftColor: accentColor,
                          borderLeftWidth: '4px',
                          borderLeftStyle: 'solid'
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                          isSel
                            ? 'bg-blue-50 border-blue-300 shadow-md shadow-blue-100'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {/* Glow left border for selected item */}
                        {isSel && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                        )}

                        <div className="space-y-2.5">
                          {/* Top row: status pill and SO number */}
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider whitespace-nowrap ${pillStyle.bg} ${pillStyle.text}`}>
                              {status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold font-mono">
                              {soNumber}
                            </span>
                          </div>

                          {/* Customer/Job details */}
                          <div>
                            <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                              {customerName ? `${customerName} • ` : ''}{applianceType}
                            </p>
                            
                            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                              <span>
                                {[a.job?.customerAddress, a.job?.customerCity, a.job?.customerState].filter(Boolean).join(', ')}
                              </span>
                            </p>
                          </div>

                          {/* Info chips row with distance, date, and priority */}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {a._type !== 'non-sears' && (
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {a.job?.distance || '4.2'} mi
                                </span>
                              )}
                              {dateStr && (
                                <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatUSDate(dateStr)}
                                </span>
                              )}
                              {a.job?.priority && (
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Priority
                                </span>
                              )}
                            </div>
                            <ArrowRight className={`h-4 w-4 transition-transform ${isSel ? 'text-blue-600 translate-x-0.5' : 'text-gray-400 group-hover:text-gray-600'}`} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* WEEKLY CALENDAR VIEW SUB-TAB PANEL */}
          {viewType === 'calendar' && (
            <div className="flex-grow flex flex-col overflow-hidden">
              
              {/* Route Tip block */}
              <div className="p-3.5 border-b border-indigo-950 bg-indigo-950/20 text-[11px] leading-relaxed text-indigo-300 select-none shrink-0 flex items-start gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400 shrink-0 animate-pulse mt-0.5" />
                <div>
                  <span className="font-extrabold text-indigo-200">Sasha Schedule Insight:</span> 
                  "Tuesday has 2 jobs scheduled in Hoffman Estates. Claiming available jobs in Schaumburg or Palatine for Wednesday June 3 fits perfectly inside your route limits."
                </div>
              </div>

              {/* Weekly grid list */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {(() => {
                  const today = new Date();
                  const dayOfWeek = today.getDay(); // 0=Sun,1=Mon...
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // go back to Monday
                  return Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    const dateStr = d.toISOString().slice(0, 10);
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return { name: dayNames[d.getDay()], date: dateStr, label: `${dayNames[d.getDay()]} ${monthNames[d.getMonth()]} ${d.getDate()}` };
                  });
                })().map(day => {
                  const searsJobs = getSearsJobsForDay(day.date);
                  const nonSears = getNonSearsJobsForDay(day.date);
                  const totalCount = searsJobs.length + nonSears.length;
                  const isToday = day.date === new Date().toISOString().slice(0, 10);

                  return (
                    <div 
                      key={day.date}
                      className={`p-3 rounded-xl border ${
                        isToday 
                          ? 'bg-gray-50 border-blue-500/30' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-2 mb-2">
                        <span className={`text-xs font-extrabold tracking-wide uppercase ${isToday ? 'text-blue-400' : 'text-gray-500'}`}>
                          {day.label} {isToday && '• Today'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">{totalCount} Assigned</span>
                      </div>

                      {totalCount === 0 ? (
                        <p className="text-[11px] text-gray-400 italic py-1 px-1">No appointments scheduled</p>
                      ) : (
                        <div className="space-y-2">
                                          {/* Sears Jobs */}
                          {searsJobs.map(job => {
                            const isSel = String(job.id) === String(selectedId);
                            return (
                              <div
                                key={job.id}
                                onClick={() => {
                                  setSelectedId(job.id);
                                  navigate(`/assignments?view=calendar&id=${job.id}`);
                                }}
                                className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between gap-3 group transition-all ${
                                  isSel
                                    ? 'bg-blue-50 border-blue-300 shadow-sm shadow-blue-100/50'
                                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200/85'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  <div>
                                    <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {job.job?.customerName || 'Customer'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{job.job?.applianceType || 'Appliance'} • {job.job?.scheduledTimeWindow || 'Slot'}</p>
                                  </div>
                                </div>
                                <StatusBadge status={job.status || 'assigned'} />
                              </div>
                            );
                          })}

                          {/* Non-Sears Jobs */}
                          {nonSears.map(ns => {
                            const isSel = String(ns.id) === String(selectedId);
                            return (
                              <div
                                key={ns.id}
                                onClick={() => {
                                  setSelectedId(ns.id);
                                  navigate(`/assignments?view=calendar&id=${ns.id}`);
                                }}
                                className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                  isSel
                                    ? 'bg-blue-50 border-blue-300 shadow-sm shadow-blue-100/50'
                                    : 'bg-indigo-950/20 border-indigo-900/30 hover:bg-indigo-950/30'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-indigo-300">
                                        Non-Sears Job
                                      </p>
                                      <span className="text-[9px] bg-indigo-500/25 text-indigo-400 px-1 border border-indigo-500/40 rounded font-semibold uppercase tracking-wider">
                                        {ns.source}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{ns.appliance || 'Dryer'} • {ns.issue || 'Service'}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-gray-400">External</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

        {/* Right Detail Pane Column */}
        <div className="flex-grow flex flex-col bg-gray-50 overflow-hidden relative">
          
          {!activeJobDetails ? (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_50%)] pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 mb-5 shadow-lg relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <Wrench className="h-7 w-7 text-gray-400 relative z-10" />
              </div>
              <h3 className="text-base font-bold text-gray-900 tracking-wide">No Service Order Selected</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
                Select an active 1099 assignment from the sidebar directory to view customer information, specifications, order catalog parts, or audit completions.
              </p>
            </div>
          ) : (
            <div className="flex-grow flex flex-col overflow-hidden">
              
              {/* Detail Header Toolbar */}
              <div className="p-6 border-b border-gray-200/80 bg-white shrink-0 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-500/10">
                    {(activeJobDetails.job?.applianceType || '').toLowerCase().includes('refriger') ? (
                      <Refrigerator className="h-6 w-6" />
                    ) : (
                      <Wrench className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">
                        {activeJobDetails.job?.applianceType?.toUpperCase() || 'SERVICE ASSIGNMENT'}
                      </h3>
                      {activeJobDetails.job?.priority && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-extrabold rounded-md uppercase tracking-wider shadow-sm">
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
                      <span className="text-blue-400">
                        SERVICE ORDER: {(() => {
                          const rawSo = activeJobDetails.job?.soNumber || activeJobDetails.soNumber || activeJobDetails.id;
                          return String(rawSo).trim().toUpperCase().startsWith('SO-')
                            ? String(rawSo).trim().toUpperCase()
                            : `SO-${String(rawSo).trim()}`;
                        })()}
                      </span>
                      <StatusBadge status={activeJobDetails.status || 'assigned'} />
                    </div>
                  </div>
                </div>

                {/* Main workflow progression action triggers */}
                <div className="flex items-center gap-2">
                  
                  {activeJobDetails._type === 'available' && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await ApiService.claimJob(activeJobDetails.id, { notes: '', action: 'accept' });
                          if (res.success) {
                            alert('Job claimed successfully!');
                            loadData();
                          } else {
                            alert(res.message || 'Failed to claim job');
                          }
                        } catch (err: any) {
                          alert(err.message || 'Failed to claim job');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:scale-[1.02] duration-200"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Claim Job</span>
                    </button>
                  )}

                  {activeJobDetails._type === 'non-sears' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-bold shadow-inner select-none">
                      <span>External Job</span>
                    </div>
                  )}

                  {activeJobDetails._type === 'sears' && activeJobDetails.status === 'assigned' && (
                    <>
                      <button
                        onClick={() => setShowArrivedConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:bg-blue-500/10 bg-transparent text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.02] duration-200"
                      >
                        <Navigation className="h-4 w-4" />
                        <span>Mark Arrived</span>
                      </button>
                      
                      <button
                        onClick={() => setShowCompleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-650 to-indigo-650 hover:from-blue-600 hover:to-indigo-600 border border-blue-500/25 hover:border-blue-400/30 text-gray-900 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:scale-[1.02] duration-200"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Job Completed</span>
                      </button>
                    </>
                  )}

                  {activeJobDetails._type === 'sears' && (
                    <button
                      onClick={() => setShowApplianceDrawer(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:bg-blue-500/10 bg-transparent text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.02] duration-200"
                    >
                      <PlayCircle className="h-4 w-4" />
                      <span>Scan & Edit Appliance</span>
                    </button>
                  )}

                  {activeJobDetails._type === 'sears' && ['arrived', 'in_progress'].includes(activeJobDetails.status) && (
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-650 to-indigo-650 hover:from-blue-600 hover:to-indigo-600 border border-blue-500/25 hover:border-blue-400/30 text-gray-900 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:scale-[1.02] duration-200"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Job Completed</span>
                    </button>
                  )}

                  {activeJobDetails._type === 'sears' && (activeJobDetails.status === 'in_progress' || activeJobDetails.status === 'arrived') && (
                    <>
                      <button
                        onClick={() => setShowPartsModal(true)}
                        className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-100 bg-transparent text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.02] duration-200"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Parts</span>
                      </button>

                      <button
                        onClick={() => setShowRescheduleWizard(true)}
                        className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-100 bg-transparent text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.02] duration-200"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        onClick={() => setShowCompleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-650 to-teal-650 hover:from-emerald-600 hover:to-teal-600 border border-emerald-500/25 hover:border-emerald-400/30 text-gray-900 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10 hover:scale-[1.02] duration-200"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete Job</span>
                      </button>
                    </>
                  )}

                  {activeJobDetails._type === 'sears' && activeJobDetails.status === 'part_order' && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl shadow-inner">
                        Awaiting Back-ordered Parts
                      </span>
                      <button
                        onClick={() => setShowRescheduleWizard(true)}
                        className="flex items-center gap-2 px-3.5 py-2 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:bg-blue-500/10 bg-transparent text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.02] duration-200"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Reschedule Appointment</span>
                      </button>
                    </div>
                  )}

                  {activeJobDetails._type === 'sears' && activeJobDetails.status === 'completed' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold shadow-inner select-none">
                      <CheckCircle className="h-4 w-4" />
                      <span>Job Completed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Content Space */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                
                {/* Visual Grid: Left Side Customer / Job, Right Side Guidelines */}
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  
                  {/* Customer Information Card */}
                  <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-6 space-y-6 relative overflow-visible group min-w-0">
                    <div className="flex items-center border-b border-gray-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-blue-500 rounded-full" />
                        <h4 className="font-extrabold text-[10px] text-blue-400 tracking-[0.2em] uppercase">Client Information</h4>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-5">
                      <div className="flex-grow space-y-4">
                        <div className="space-y-1">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Client Name</p>
                          <p className="text-sm font-extrabold text-gray-900">{activeJobDetails.job?.customerName || 'Customer'}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Phone Number</p>
                          <div className="flex items-center gap-2.5">
                            <p className="text-sm font-extrabold text-gray-900">{activeJobDetails.job?.customerPhone || 'N/A'}</p>
                            {activeJobDetails.job?.customerPhone && (
                              <>
                                <a 
                                  href={`tel:${activeJobDetails.job?.customerPhone}`}
                                  className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 hover:border-blue-500/50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all shadow-sm"
                                  title="Call Customer"
                                >
                                  <Phone className="h-3.5 w-3.5 fill-current/5" />
                                </a>
                                <a 
                                  href={`sms:${activeJobDetails.job?.customerPhone}`}
                                  className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 hover:border-blue-500/50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all shadow-sm"
                                  title="SMS Customer"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Service Location</p>
                          <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                            {activeJobDetails.job?.customerAddress || ''}<br />
                            {activeJobDetails.job?.customerCity || ''}, {activeJobDetails.job?.customerState || ''} {activeJobDetails.job?.customerZip || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Guidelines Card */}
                  <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-indigo-500 rounded-full" />
                        <h4 className="font-extrabold text-[10px] text-indigo-400 tracking-[0.2em] uppercase">Appointment Guidelines</h4>
                      </div>
                      <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded-full uppercase tracking-wider">MANDATORY</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="bg-gray-50/80 border border-gray-200/85 p-3.5 flex items-center gap-3 rounded-xl shadow-sm transition-all hover:bg-gray-100 hover:border-gray-300">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                          <Calendar className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                          <p className="text-xs font-extrabold text-gray-900 mt-1">
                            {formatUSDate(activeJobDetails.scheduledDate || activeJobDetails.job?.scheduledDate)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50/80 border border-gray-200/85 p-3.5 flex items-center gap-3 rounded-xl shadow-sm transition-all hover:bg-gray-100 hover:border-gray-300">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <Clock className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Time Slot</p>
                          <p className="text-xs font-extrabold text-gray-900 mt-1">
                            {activeJobDetails.job?.scheduledTimeWindow || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Guidelines checklist */}
                    {activeJobDetails._type === 'sears' && activeJobDetails.guidelines && activeJobDetails.guidelines.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200/60">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-3">SHS Service Guidelines</p>
                        <div className="space-y-2.5">
                          {activeJobDetails.guidelines.map((guide: any) => (
                            <div 
                              key={guide.id}
                              className={`border rounded-xl p-3.5 flex items-start gap-3 transition-all cursor-pointer select-none ${
                                guide.checked 
                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-50' 
                                  : 'bg-gray-50/60 border-gray-200 hover:bg-white hover:border-gray-300'
                              }`}
                              onClick={() => {
                                // toggle checklist item in local state
                                setAssignments(prev => prev.map(a => {
                                  if (String(a.id) === String(selectedId)) {
                                    return {
                                      ...a,
                                      guidelines: a.guidelines.map((g: any) => g.id === guide.id ? { ...g, checked: !g.checked } : g)
                                    };
                                  }
                                  return a;
                                }));
                              }}
                            >
                              {guide.checked ? (
                                <div className="w-5 h-5 rounded-lg bg-blue-600 border border-blue-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-blue-500/10 transition-all">
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-lg border border-gray-300 hover:border-gray-400 bg-white shrink-0 mt-0.5 transition-all" />
                              )}
                              <div>
                                <p className={`text-xs font-bold transition-all ${guide.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{guide.text}</p>
                                {guide.subtext && (
                                  <p className={`text-[11px] mt-1 leading-normal transition-all ${guide.checked ? 'text-gray-400' : 'text-gray-500'}`}>{guide.subtext}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Service History Card */}
                  <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-teal-500 rounded-full" />
                        <h4 className="font-extrabold text-[10px] text-teal-400 tracking-[0.2em] uppercase">Service History</h4>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 italic">No service history available</p>
                  </div>

                  {/* SHS Service Guidelines */}
                  <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-6 space-y-4 md:col-span-2">
                    <div className="text-center space-y-1">
                      <h4 className="font-bold text-base text-gray-900">SHS Service Guidelines</h4>
                      <p className="text-xs text-gray-400 italic">These are recommended best practices, not requirements.</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        'Introduce yourself as servicing on behalf of Sears Home Services',
                        'Wear shoe covers and lay down a work mat',
                        'Explain diagnosis and repair plan before starting',
                        'Take before/after photos',
                        'Clean work area when finished',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded bg-emerald-500 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Appliance Specs / Brand / Model information */}
                  <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-6 space-y-6 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-blue-500 rounded-full" />
                        <h4 className="font-bold text-[10px] text-blue-400 tracking-[0.2em] uppercase">Appliance Specifications</h4>
                      </div>
                      {activeJobDetails._type === 'sears' && (
                        <button
                          onClick={() => setShowApplianceDrawer(true)}
                          className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Scan/Edit Spec</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gray-50/80 border border-gray-200 p-4 rounded-xl flex flex-col gap-1 transition-all hover:bg-gray-100 hover:border-gray-300">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Brand</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-1">{activeJobDetails.job?.manufacturerBrand || 'FRIGIDAIRE'}</p>
                      </div>

                      <div className="bg-gray-50/80 border border-gray-200 p-4 rounded-xl flex flex-col gap-1 transition-all hover:bg-gray-100 hover:border-gray-300">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Issue</p>
                        <p className="text-xs font-semibold text-gray-900 mt-1 line-clamp-3" title={activeJobDetails.job?.serviceDescription}>{activeJobDetails.job?.serviceDescription || activeJobDetails.job?.issue || '-'}</p>
                      </div>

                      <div className="bg-gray-50/80 border border-gray-200 p-4 rounded-xl flex flex-col gap-1 transition-all hover:bg-gray-100 hover:border-gray-300 relative group/spec">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Model</p>
                        <div className="flex items-center justify-between gap-1.5 mt-1.5">
                          <p className="text-xs font-extrabold text-gray-900 font-mono tracking-tight bg-gray-100 py-0.5 px-2 rounded border border-gray-200">{activeJobDetails.job?.applianceModel || '-'}</p>
                          {activeJobDetails.job?.applianceModel && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(activeJobDetails.job.applianceModel);
                                setCopiedModel(true);
                                setTimeout(() => setCopiedModel(false), 2050);
                              }}
                              className="text-gray-500 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
                              title="Copy Model Number"
                            >
                              {copiedModel ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50/80 border border-gray-200 p-4 rounded-xl flex flex-col gap-1 transition-all hover:bg-gray-100 hover:border-gray-300">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Serial</p>
                        <p className="text-xs font-extrabold text-gray-900 mt-1.5 font-mono tracking-tight bg-gray-100 py-0.5 px-2 rounded border border-gray-200 self-start">{activeJobDetails.job?.applianceSerial || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Parts Ordered list section */}
                  {['assigned', 'arrived', 'in_progress', 'completed', 'part_order', 'rescheduled'].includes(activeJobDetails.status) && (
                    <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-6 space-y-6 md:col-span-2">
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-3 bg-blue-500 rounded-full" />
                          <h4 className="font-bold text-[10px] text-blue-400 tracking-[0.2em] uppercase">Parts Ordered for this Job</h4>
                        </div>
                        {['arrived', 'in_progress'].includes(activeJobDetails.status) && (
                          <button
                            onClick={() => setShowPartsModal(true)}
                            className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Parts</span>
                          </button>
                        )}
                      </div>

                      {/* Mock list of parts on current job */}
                      <PartsListSection 
                        jobId={activeJobDetails.id} 
                        assignments={assignments} 
                        setAssignments={setAssignments} 
                        onTrackParts={() => {
                          setSelectedTrackPart(null);
                          setTrackDetailBackToSummary(false);
                          setShowTrackPartsModal(true);
                        }}
                        onTrackDetail={(part) => {
                          setSelectedTrackPart(part);
                          setTrackDetailBackToSummary(false);
                          setShowTrackDetailModal(true);
                        }}
                      />
                    </div>
                  )}

                  {/* Ask Sasha Chat Shortcut */}
                  {['arrived', 'in_progress'].includes(activeJobDetails.status) && (
                    <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-5 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 duration-300">
                      {/* Decorative blur blob */}
                      <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute -left-10 -top-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-lg">
                          <Sparkles className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">Need Diagnostic Assistance?</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-normal">Ask Sasha AI for repair tips, wiring diagrams, and parts advice for this model.</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => window.location.href = `/chat?query=how%20to%20diagnose%20model%20${activeJobDetails.job?.applianceModel || 'VA6013'}`}
                        className="relative z-10 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                      >
                        Consult Sasha AI
                      </button>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ── MODALS AND DRAWERS ── */}

      {/* 1. Log Non-Sears Job Dialog Modal */}
      {showLogNonSears && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl text-gray-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-gray-200 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{nonSearsReview ? 'Looks good?' : 'Log Non-Sears Job'}</h3>
              <button onClick={() => { setShowLogNonSears(false); setNonSearsReview(false); }} className="text-gray-500 hover:text-gray-900 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            {nonSearsReview ? (
              <div className="flex-grow overflow-y-auto px-6 py-4">
                <p className="text-xs text-gray-500 mb-4">Confirm the details below to log this job</p>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {[
                    { label: 'Date', value: nonSearsForm.scheduledDate === new Date().toISOString().slice(0, 10) ? 'Today' : nonSearsForm.scheduledDate },
                    { label: 'Source', value: nonSearsForm.source === 'Someone Else' ? (nonSearsForm.sourceOther || 'Someone Else') : nonSearsForm.source },
                    { label: 'Appliance', value: nonSearsForm.appliance },
                    { label: 'Brand', value: nonSearsForm.brand || '—' },
                    { label: 'Issue', value: nonSearsForm.issue || '—' },
                    { label: 'Time', value: `${nonSearsForm.startHour}:${nonSearsForm.startMinute} ${nonSearsForm.startPeriod} · ${nonSearsForm.duration}` },
                    { label: 'Zip', value: nonSearsForm.zipCode || '—' },
                    { label: 'Client', value: nonSearsForm.clientType },
                    { label: 'Channel', value: nonSearsForm.jobChannel || '—' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-500">{row.label}</span>
                      <span className="text-xs font-bold text-gray-900">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    No conflicts with your SHS schedule
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setNonSearsReview(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { handleLogNonSears(e as any); setNonSearsReview(false); }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Add to Schedule
                  </button>
                </div>
              </div>
            ) : (
            
            <form onSubmit={(e) => { e.preventDefault(); setNonSearsReview(true); }} className="flex-grow overflow-y-auto px-6 py-4 space-y-5">

              {/* Source - Where's this job from? */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{`Where's this job from?`}</label>
                <select
                  required
                  value={nonSearsForm.source}
                  onChange={(e) => setNonSearsForm({ ...nonSearsForm, source: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select source...</option>
                  <option value="Frontdoor / AHS">Frontdoor / AHS</option>
                  <option value="HomeAdvisor / Angi">HomeAdvisor / Angi</option>
                  <option value="Neighborly">Neighborly</option>
                  <option value="Home Warranty Company">Home Warranty Company</option>
                  <option value="Direct / Repeat Customer">Direct / Repeat Customer</option>
                  <option value="Someone Else">Someone Else</option>
                </select>
                {nonSearsForm.source === 'Someone Else' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter source name or details..."
                    value={nonSearsForm.sourceOther}
                    onChange={(e) => setNonSearsForm({ ...nonSearsForm, sourceOther: e.target.value })}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                  />
                )}
              </div>

              {/* Appliance Category - What appliance? */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">What appliance?</label>
                <select
                  required
                  value={nonSearsForm.appliance}
                  onChange={(e) => setNonSearsForm({ ...nonSearsForm, appliance: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select appliance...</option>
                  <option value="Refrigerator">Refrigerator</option>
                  <option value="Washer">Washer</option>
                  <option value="Dryer">Dryer</option>
                  <option value="Dishwasher">Dishwasher</option>
                  <option value="Range / Oven">Range / Oven</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Water Heater">Water Heater</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Brand - Which brand? */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Which brand?</label>
                <select
                  value={nonSearsForm.brand}
                  onChange={(e) => setNonSearsForm({ ...nonSearsForm, brand: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select brand...</option>
                  <option value="Kenmore">Kenmore</option>
                  <option value="Samsung">Samsung</option>
                  <option value="LG">LG</option>
                  <option value="Whirlpool">Whirlpool</option>
                  <option value="GE">GE</option>
                  <option value="Maytag">Maytag</option>
                  <option value="KitchenAid">KitchenAid</option>
                  <option value="Bosch">Bosch</option>
                  <option value="Frigidaire">Frigidaire</option>
                  <option value="Amana">Amana</option>
                  <option value="Electrolux">Electrolux</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* How did this job come in? */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">How did this job come in?</label>
                <select
                  value={nonSearsForm.jobChannel}
                  onChange={(e) => setNonSearsForm({ ...nonSearsForm, jobChannel: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select channel...</option>
                  <option value="App dispatch">App dispatch</option>
                  <option value="Phone call">Phone call</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>

              {/* Customer Info */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Information</label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={nonSearsForm.customerName}
                    onChange={(e) => setNonSearsForm({ ...nonSearsForm, customerName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={nonSearsForm.customerPhone}
                      onChange={(e) => setNonSearsForm({ ...nonSearsForm, customerPhone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Service Address"
                      value={nonSearsForm.customerAddress}
                      onChange={(e) => setNonSearsForm({ ...nonSearsForm, customerAddress: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={nonSearsForm.scheduledDate}
                    onChange={(e) => setNonSearsForm({ ...nonSearsForm, scheduledDate: e.target.value })}
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Start Time</label>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={nonSearsForm.startHour}
                      onChange={(e) => setNonSearsForm({ ...nonSearsForm, startHour: e.target.value })}
                      className="w-12 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2.5 text-xs text-gray-900 text-center outline-none focus:border-blue-500 transition-colors"
                    />
                    <span className="text-xs font-bold text-gray-500">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={nonSearsForm.startMinute}
                      onChange={(e) => setNonSearsForm({ ...nonSearsForm, startMinute: e.target.value.padStart(2, '0') })}
                      className="w-12 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2.5 text-xs text-gray-900 text-center outline-none focus:border-blue-500 transition-colors"
                    />
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 ml-1">
                      <button
                        type="button"
                        onClick={() => setNonSearsForm({ ...nonSearsForm, startPeriod: 'AM' })}
                        className={`px-2.5 py-2 text-xs font-bold transition-colors ${nonSearsForm.startPeriod === 'AM' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setNonSearsForm({ ...nonSearsForm, startPeriod: 'PM' })}
                        className={`px-2.5 py-2 text-xs font-bold transition-colors ${nonSearsForm.startPeriod === 'PM' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration & Zip Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</label>
                  <select
                    value={nonSearsForm.duration}
                    onChange={(e) => setNonSearsForm({ ...nonSearsForm, duration: e.target.value })}
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="30 minutes">30 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                    <option value="2.5 hours">2.5 hours</option>
                    <option value="3 hours">3 hours</option>
                    <option value="4 hours">4 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Zip Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 60193"
                    value={nonSearsForm.zipCode}
                    onChange={(e) => setNonSearsForm({ ...nonSearsForm, zipCode: e.target.value })}
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Client Type */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client Type</label>
                <select
                  value={nonSearsForm.clientType}
                  onChange={(e) => setNonSearsForm({ ...nonSearsForm, clientType: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Homeowner">Homeowner</option>
                  <option value="Property Manager">Property Manager</option>
                  <option value="Home Warranty">Home Warranty</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Issue Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">What was the issue?</label>
                <p className="text-[10px] text-gray-400 mt-0.5 mb-1.5">Short description — e.g. &quot;Not cooling&quot; or &quot;Won&apos;t drain&quot;</p>
                <textarea
                  rows={2}
                  required
                  placeholder={"e.g. Not cooling, Won\u0027t start..."}
                  value={nonSearsForm.issue}
                  onChange={(e) => setNonSearsForm({ ...nonSearsForm, issue: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 resize-none transition-colors"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Private Notes</label>
                <textarea
                  rows={2}
                  placeholder="Customer requested a phone confirmation call 15 mins prior..."
                  value={nonSearsForm.notes}
                  onChange={(e) => setNonSearsForm({ ...nonSearsForm, notes: e.target.value })}
                  className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 resize-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowLogNonSears(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!nonSearsForm.source || !nonSearsForm.appliance}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Log External Job
                </button>
              </div>
            </form>
            )
            }
          </div>
        </div>
      )}

      {/* 2. Mark Arrived Confirmation Modal */}
      {showArrivedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-gray-700">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-amber-500" />
              <span>Confirm Arrival?</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Are you physically present at {activeJobDetails?.job?.customerAddress || 'the service address'}? This will notify the customer via automated SMS updates.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                onClick={() => setShowArrivedConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                onClick={handleMarkArrived}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-gray-900 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Yes, Mark Arrived
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Scan & Edit Appliance specifications Slide-out Drawer */}
      {showApplianceDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/40">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              <span>Appliance Specification Details</span>
            </h3>
            <button onClick={() => setShowApplianceDrawer(false)} className="text-gray-500 hover:text-gray-900 cursor-pointer"><X className="h-5 w-5" /></button>
          </div>

          <form onSubmit={handleSaveAppliance} className="flex-grow flex flex-col justify-between overflow-hidden">
            <div className="p-6 space-y-5 overflow-y-auto flex-grow">
              
              {/* Scan simulation Button */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <p className="text-xs text-blue-700 leading-relaxed font-semibold">
                  OCR Label Scanner: Scan manufacturer bar-tag to automatically populate brand, model, and serial details.
                </p>
                <button
                  type="button"
                  onClick={handleScanAppliance}
                  disabled={applianceForm.scanning}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {applianceForm.scanning ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                      <span>Scanning tag with camera...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4.5 w-4.5" />
                      <span>Scan Appliance Label Tag</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Manufacturer Brand</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenmore, Speed Queen"
                  value={applianceForm.brand}
                  onChange={(e) => setApplianceForm({ ...applianceForm, brand: e.target.value })}
                  className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Model Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VA6013"
                  value={applianceForm.model}
                  onChange={(e) => setApplianceForm({ ...applianceForm, model: e.target.value })}
                  className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Serial Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SQ98402948"
                  value={applianceForm.serial}
                  onChange={(e) => setApplianceForm({ ...applianceForm, serial: e.target.value })}
                  className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Issue Diagnosed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain diagnosed failure in detail..."
                  value={applianceForm.issue}
                  onChange={(e) => setApplianceForm({ ...applianceForm, issue: e.target.value })}
                  className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowApplianceDrawer(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Save Details & Start Repair
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Reschedule 2-Step wizard Drawer */}
      {showRescheduleWizard && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/40">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Reschedule Wizard (Step {rescheduleForm.step}/2)</span>
            </h3>
            <button 
              onClick={() => {
                setShowRescheduleWizard(false);
                setRescheduleForm(prev => ({ ...prev, step: 1 }));
              }} 
              className="text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-grow flex flex-col justify-between overflow-hidden">
            <div className="p-6 space-y-5 overflow-y-auto flex-grow">
              
              {/* STEP 1: Reason and notes */}
              {rescheduleForm.step === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Reason for Rescheduling</label>
                    <select
                      value={rescheduleForm.reason}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                      className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                    >
                      {RESCHEDULE_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Service Photo Proof (Optional)</label>
                    <div className="mt-1.5 border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/60 rounded-xl p-6 text-center cursor-pointer">
                      {rescheduleForm.photoUploaded ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <Check className="h-6 w-6 text-emerald-400" />
                          <p className="text-xs text-gray-600 font-semibold">Reschedule proof photo uploaded</p>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setRescheduleForm(prev => ({ ...prev, photoUploaded: true }))}
                          className="flex flex-col items-center gap-2"
                        >
                          <Camera className="h-6 w-6 text-gray-400" />
                          <p className="text-xs text-gray-500">Click to upload location photo (appliance bar code / street view)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Internal Reschedule Notes</label>
                    <textarea
                      rows={4}
                      placeholder="Add details regarding reschedule justification..."
                      value={rescheduleForm.notes}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, notes: e.target.value })}
                      className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </>
              )}

              {/* STEP 2: Date & slot selection */}
              {rescheduleForm.step === 2 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Select New Date Slot</label>
                    <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
                      {Array.from({ length: 30 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() + i + 1);
                        return d.toISOString().slice(0, 10);
                      }).map(date => {
                        const isSel = rescheduleForm.selectedDate === date;
                        return (
                          <div
                            key={date}
                            onClick={() => setRescheduleForm({ ...rescheduleForm, selectedDate: date })}
                            className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                              isSel 
                                ? 'bg-blue-600/10 border-blue-500 text-gray-900' 
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wider">
                              {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </p>
                            <p className="text-sm font-extrabold mt-1">
                              {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Select New Appointment Window</label>
                    <div className="space-y-2">
                      {['8:00 AM - 12:00 PM', '12:00 PM - 4:00 PM', '4:00 PM - 8:00 PM'].map(slot => {
                        const isSel = rescheduleForm.selectedTimeSlot === slot;
                        return (
                          <div
                            key={slot}
                            onClick={() => setRescheduleForm({ ...rescheduleForm, selectedTimeSlot: slot })}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSel 
                                ? 'bg-blue-600/10 border-blue-500 text-gray-900' 
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-xs font-bold">{slot}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSel ? 'border-blue-500 bg-blue-600' : 'border-gray-300'
                            }`}>
                              {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] leading-relaxed text-blue-700">
                    💡 <span className="font-extrabold">Route Check:</span> Rescheduling to June 3rd (12-4 PM) matches your other scheduled service order in Hoffman Estates. Driving distance is minimized.
                  </div>
                </>
              )}

            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              {rescheduleForm.step === 2 ? (
                <button
                  type="button"
                  onClick={() => setRescheduleForm(prev => ({ ...prev, step: 1 }))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRescheduleWizard(false);
                    setRescheduleForm(prev => ({ ...prev, step: 1 }));
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {rescheduleForm.step === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextRescheduleStep}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Select Window
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmReschedule}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Confirm Reschedule
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Parts / Catalog search Modal with Out-Of-Stock error logic */}
      {showPartsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl h-[550px] shadow-2xl flex overflow-hidden text-gray-700">
            
            {/* Left Column: Search & results catalog */}
            <div className="flex-grow flex flex-col overflow-hidden p-6 border-r border-gray-200">
              
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4 shrink-0">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-500" />
                  <span>Sears 1099 Parts Catalog Search</span>
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPartsSearch(prev => ({ ...prev, tab: 'model', query: 'VA6013' }))}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-colors cursor-pointer ${
                      partsSearch.tab === 'model' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-transparent border-gray-200 text-gray-500'
                    }`}
                  >
                    Search by Model
                  </button>
                  <button
                    onClick={() => setPartsSearch(prev => ({ ...prev, tab: 'number', query: '13516' }))}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-colors cursor-pointer ${
                      partsSearch.tab === 'number' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-transparent border-gray-200 text-gray-500'
                    }`}
                  >
                    Search by Part No.
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="flex gap-2 mb-4 shrink-0">
                <input
                  type="text"
                  placeholder={partsSearch.tab === 'model' ? 'Enter Model (e.g. VA6013)...' : 'Enter Part Number (e.g. 13516)...'}
                  value={partsSearch.query}
                  onChange={(e) => setPartsSearch({ ...partsSearch, query: e.target.value })}
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

              {/* Results display catalog */}
              <div className="flex-grow overflow-y-auto space-y-2.5">
                {partsSearch.searching ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
                  </div>
                ) : partsSearch.results.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 text-xs italic bg-gray-50/30 rounded-xl border border-gray-200">
                    Type a query (e.g. model <span className="font-mono text-blue-400">VA6013</span> or part <span className="font-mono text-blue-400">13516</span>) and press Search.
                  </div>
                ) : (
                  partsSearch.results.map((part) => (
                    <div 
                      key={part.itemId || part.partNo}
                      className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-gray-900">{part.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">Part #{part.partNo}</span>
                          {!part.available && (
                            <span className="px-1.5 py-0.2 bg-rose-500/20 border border-rose-500/40 rounded text-[8px] font-bold text-rose-400 tracking-wider">
                              OUT OF STOCK
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{part.description}</p>
                        <p className="text-xs font-semibold text-blue-400 mt-1">${part.price.toFixed(2)}</p>
                      </div>

                      <button
                        onClick={() => handleAddToCart(part)}
                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/30 hover:border-blue-500 rounded-lg text-[10px] font-bold text-blue-400 transition-colors cursor-pointer"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Cart list sidebar & Availability Checker */}
            <div className="w-[300px] shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col justify-between overflow-hidden">
              <div className="p-5 border-b border-gray-200 shrink-0">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-blue-400" />
                  <span>Order Shopping Cart</span>
                </h4>
              </div>

              {/* Cart List */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic text-center py-10">Cart is empty</p>
                ) : (
                  cart.map(item => (
                    <div 
                      key={item.partNo}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-2 relative"
                    >
                      <button 
                        onClick={() => handleRemoveFromCart(item.partNo)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div>
                        <p className="text-[11px] font-bold text-gray-900 truncate pr-5">{item.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.2">Part #{item.partNo}</p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-blue-400 font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                        
                        {/* Qty selectors */}
                        <div className="flex items-center border border-gray-200 rounded bg-white overflow-hidden">
                          <button 
                            onClick={() => handleUpdateCartQty(item.partNo, -1)}
                            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-bold"
                          >
                            -
                          </button>
                          <span className="px-2.5 text-[10px] font-bold text-gray-900">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateCartQty(item.partNo, 1)}
                            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer controls & errors */}
              <div className="p-4 border-t border-gray-200 bg-gray-50/60 shrink-0 space-y-3">
                {partsError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{partsError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>Cart Items Total</span>
                  <span className="text-gray-900">${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCheckAvailability}
                    disabled={cart.length === 0}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[10px] font-extrabold text-gray-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Check Stock
                  </button>
                  <button
                    onClick={handleAddPartsToJob}
                    disabled={cart.length === 0}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {partsError ? 'Order & Reschedule' : 'Submit Parts'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowPartsModal(false);
                    setCart([]);
                    setPartsError(null);
                  }}
                  className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-gray-500 py-1 transition-colors cursor-pointer block"
                >
                  Cancel Order
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 6. Complete Job Closeout Two-Column Audit Modal with Signature Canvas */}
      {showCompleteModal && (() => {
        const normalizeCT = (v: string) => (v || '').trim().toLowerCase().replace(/\u2013|\u2014/g, '-').replace(/\s+/g, ' ');
        const ctType = normalizeCT(completeForm.completionType);
        const isCompleteRescheduled = ctType.includes('rescheduled');
        const isCompleteCNH = ctType === 'customer not home';
        const isCompleteCancelAtDoor = ctType === 'cancel at door';
        const isCompleteEstimateDeclined = ctType === 'estimate declined';
        const isCompleteCompleted = ctType === 'completed';

        const isCustomerAcknowledgeRequired = isCompleteCompleted || isCompleteEstimateDeclined;
        const isSignatureRequired = isCustomerAcknowledgeRequired;
        const isPhotoRequired = false;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl shadow-2xl p-6 text-gray-700">
              
              <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span>Job Closure Verification Audit</span>
                </h3>
                <button onClick={() => setShowCompleteModal(false)} className="text-gray-500 hover:text-gray-900 cursor-pointer"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={handleCompleteJob} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1: Close details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Type *</label>
                    <select
                      value={completeForm.completionType}
                      onChange={(e) => setCompleteForm({ ...completeForm, completionType: e.target.value })}
                      className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                    >
                      {COMPLETION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Repair Type *</label>
                    <select
                      value={completeForm.repairType}
                      onChange={(e) => setCompleteForm({ ...completeForm, repairType: e.target.value })}
                      className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                    >
                      {REPAIR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Repair Code *</label>
                    <select
                      value={completeForm.repairCode}
                      onChange={(e) => setCompleteForm({ ...completeForm, repairCode: e.target.value })}
                      className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                    >
                      {REPAIR_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Conditional fields based on selected completion type */}
                  {isCompleteRescheduled && (
                    <div className="space-y-4 border-t border-gray-100 pt-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Reschedule Reason *</label>
                        <select
                          value={completeForm.rescheduleReason}
                          onChange={(e) => setCompleteForm({ ...completeForm, rescheduleReason: e.target.value })}
                          className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                        >
                          {RESCHEDULE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Next Appointment *</label>
                        <input
                          type="datetime-local"
                          required
                          value={completeForm.nextAppointment}
                          onChange={(e) => setCompleteForm({ ...completeForm, nextAppointment: e.target.value })}
                          className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                  {isCompleteCNH && (
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Not Home Reason *</label>
                      <select
                        value={completeForm.cnhReason}
                        onChange={(e) => setCompleteForm({ ...completeForm, cnhReason: e.target.value })}
                        className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                      >
                        {CNH_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                  {isCompleteCancelAtDoor && (
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Cancel Reason *</label>
                      <select
                        value={completeForm.cancelReason}
                        onChange={(e) => setCompleteForm({ ...completeForm, cancelReason: e.target.value })}
                        className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                      >
                        {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                  {isCompleteEstimateDeclined && (
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Estimate Decline Reason *</label>
                      <select
                        value={completeForm.estimateDeclineReason}
                        onChange={(e) => setCompleteForm({ ...completeForm, estimateDeclineReason: e.target.value })}
                        className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500"
                      >
                        {ESTIMATE_DECLINE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Column 2: Upload photo and Signature Canvas */}
                <div className="space-y-4 flex flex-col">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Upload Repair Photo (Optional)
                    </label>
                    <div className="border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/60 rounded-xl p-4 text-center cursor-pointer">
                      {completeForm.photoUploaded ? (
                        <div className="flex flex-col items-center gap-1">
                          <Check className="h-5 w-5 text-emerald-400" />
                          <p className="text-[11px] text-gray-600 font-semibold">Repair validation photo uploaded</p>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setCompleteForm(prev => ({ ...prev, photoUploaded: true }))}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <Camera className="h-5 w-5 text-gray-400" />
                          <p className="text-[10px] text-gray-500">
                            {isPhotoRequired ? 'Click to upload REQUIRED photo' : 'Click to upload completed resolution photo'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Notes *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Add notes about the job completion / closeout..."
                      value={completeForm.notes}
                      onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                      className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Customer acknowledgment check */}
                  {isCustomerAcknowledgeRequired && (
                    <div className="flex items-start gap-2.5 py-1.5 select-none">
                      <input
                        type="checkbox"
                        id="ack"
                        checked={completeForm.acknowledged}
                        onChange={(e) => setCompleteForm({ ...completeForm, acknowledged: e.target.checked })}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-200 bg-gray-50 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="ack" className="text-[10px] leading-normal text-gray-500 cursor-pointer">
                        Customer Acknowledge * (I confirm that the client {activeJobDetails?.job?.customerName || 'customer'} has verified this work resolution).
                      </label>
                    </div>
                  )}

                  {/* Signature HTML5 Canvas Pad */}
                  {isSignatureRequired && (
                    <div className="flex-grow flex flex-col">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Client Signature Acknowledgment *
                      </label>
                      <div className="relative flex-grow border border-gray-200 rounded-xl bg-gray-50 overflow-hidden min-h-[120px] flex items-center justify-center">
                        <canvas
                          ref={canvasRef}
                          width={320}
                          height={120}
                          className="absolute inset-0 w-full h-full cursor-crosshair"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        {!hasSignature && (
                          <span className="text-[10px] text-gray-400 select-none pointer-events-none">Draw Client Signature Here</span>
                        )}
                        
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="absolute right-2.5 bottom-2.5 px-2 py-0.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[9px] font-bold text-gray-500 transition-colors z-20 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-gray-200 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-gray-900 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Submit Completion Audit
                  </button>
                </div>

              </form>
            </div>
          </div>
        );
      })()}

      {/* 7. Success Banner Overlay notification for reschedule / completion success */}
      {successMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center text-gray-700">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <Check className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{successMsg.title}</h3>
            <p className="mt-2 text-xs text-gray-500 leading-normal">{successMsg.desc}</p>

            <button
              onClick={() => setSuccessMsg(null)}
              className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Close Notification
            </button>
          </div>
        </div>
      )}

      {/* Track Parts Summary Modal */}
      {showTrackPartsModal && activeJobDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Track Parts</h3>
              </div>
              <button
                onClick={() => setShowTrackPartsModal(false)}
                className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200/80 hover:border-gray-300 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {loadingActiveJobParts ? (
                <div className="flex items-center justify-center py-10 gap-2 text-xs text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span>Loading parts info...</span>
                </div>
              ) : activeJobParts.filter(p => !p.isDraft && p.status !== 'Draft' && p.status !== 'draft').length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">No Shipped Parts</p>
                  <p className="text-[11px] text-gray-400 mt-1">There are no ordered parts with tracking information on this job.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 leading-normal">
                    Select a part below to view detailed carrier shipping status and tracking timeline.
                  </p>
                  <div className="space-y-2.5">
                    {activeJobParts
                      .filter(p => !p.isDraft && p.status !== 'Draft' && p.status !== 'draft')
                      .map((p) => {
                        const isDelivered = p.status === 'Delivered';
                        const statusColor = isDelivered 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/25';
                        
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedTrackPart(p);
                              setTrackDetailBackToSummary(true);
                              setShowTrackPartsModal(false);
                              setShowTrackDetailModal(true);
                            }}
                            className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/40 hover:bg-gray-50/80 hover:border-gray-300 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-600/5 border border-blue-500/15 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                                <Package className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-gray-900 group-hover:text-blue-400 transition-colors">
                                  {p.itemDescription || 'Replacement Part'}
                                </h5>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">Part #{p.partNumber} • Qty {p.quantity}</p>
                                {p.trackingNumber && (
                                  <p className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1">
                                    <span className="text-[9px] uppercase font-bold text-gray-500">{p.carrier || 'FedEx'}</span>
                                    <span>{p.trackingNumber}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${statusColor}`}>
                                {p.status}
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track Order Detail (Timeline) Modal */}
      {showTrackDetailModal && selectedTrackPart && activeJobDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                {trackDetailBackToSummary ? (
                  <button
                    onClick={() => {
                      setShowTrackDetailModal(false);
                      setShowTrackPartsModal(true);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200/80 hover:border-gray-300 rounded-lg transition-colors cursor-pointer mr-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <Truck className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Track Order</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadTrackingDetails(selectedTrackPart)}
                  className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200/80 hover:border-gray-300 rounded-lg transition-colors cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw className={`h-4 w-4 ${trackingLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowTrackDetailModal(false)}
                  className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200/80 hover:border-gray-300 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Part Info Summary */}
              <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/35 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/5 border border-blue-500/15 flex items-center justify-center text-blue-450 shrink-0">
                  <Package className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-900">
                    {selectedTrackPart.itemDescription || 'Replacement Part'}
                  </h5>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Part #{selectedTrackPart.partNumber} • Qty {selectedTrackPart.quantity}</p>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tracking Timeline</h4>
                
                {trackingLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2.5 text-xs text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span>Contacting carrier network...</span>
                  </div>
                ) : trackingError ? (
                  <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{trackingError}</span>
                  </div>
                ) : (
                  (() => {
                    const firstPackage = trackingData?.packages?.[0] || trackingData?.packages?.item?.[0];
                    const activities: any[] = firstPackage?.activities || firstPackage?.activities?.item || [];
                    const serviceName: string | undefined = trackingData?.service;
                    const pickUpDateRaw: string | undefined = trackingData?.pickUpDate;
                    const trackingNumberToShow = selectedTrackPart.trackingNumber || firstPackage?.trackingNo || 'N/A';

                    if (activities.length === 0) {
                      return (
                        <p className="text-xs text-gray-400 italic py-4">No tracking events reported by carrier yet.</p>
                      );
                    }

                    return (
                      <div className="space-y-5">
                        {/* Timeline Tree */}
                        <div className="space-y-0 pl-1.5">
                          {activities.map((activity, index) => {
                            const isLast = index === activities.length - 1;
                            const isDelivered = (activity.status || '').toLowerCase().includes('delivered');
                            
                            // Date formatting
                            let dateLabel = activity.date;
                            if (activity.date) {
                              let year: number, month: number, day: number;
                              const raw = activity.date;
                              if (raw.length === 8) {
                                year = Number(raw.substring(0, 4));
                                month = Number(raw.substring(4, 6)) - 1;
                                day = Number(raw.substring(6, 8));
                                const d = new Date(year, month, day);
                                if (!isNaN(d.getTime())) {
                                  dateLabel = formatUSDate(d);
                                }
                              } else {
                                dateLabel = formatUSDate(raw) || raw;
                              }
                            }
                            
                            // Time formatting
                            const timeRaw: string | undefined = activity.time;
                            let timeLabel: string | null = null;
                            if (timeRaw && timeRaw.length === 6) {
                              const h = Number(timeRaw.substring(0, 2));
                              const m = Number(timeRaw.substring(2, 4));
                              const d = new Date();
                              d.setHours(h, m, 0, 0);
                              timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                            }

                            const address = activity.address;
                            const city = address?.city;
                            const state = address?.stateProvinceCode || address?.state;
                            const locationLabel = [city, state].filter(Boolean).join(', ');

                            return (
                              <div key={`${activity.status}-${index}`} className="flex gap-4 min-h-[50px] relative">
                                {/* Left column: Icon and Connector Line */}
                                <div className="flex flex-col items-center shrink-0">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border ${
                                      isDelivered 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    }`}
                                  >
                                    {isDelivered ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : (
                                      <Truck className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                  {!isLast && (
                                    <div className="w-[1.5px] bg-gray-100 absolute top-6 bottom-0 left-[11px]" />
                                  )}
                                </div>
                                {/* Right column: Content */}
                                <div className="pb-4">
                                  <h5 className="font-extrabold text-xs text-gray-900 leading-none">{activity.status}</h5>
                                  <p className="text-[10px] text-gray-500 mt-1.5 leading-normal">
                                    {[dateLabel, timeLabel, locationLabel].filter(Boolean).join(' • ')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Shipment Details Box */}
                        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 text-[11px]">
                          <h4 className="font-bold text-gray-500 uppercase text-[9px] tracking-wider mb-2">Shipping Information</h4>
                          <div className="flex justify-between py-0.5">
                            <span className="text-gray-400">Tracking Number</span>
                            <span className="font-mono text-gray-600">{trackingNumberToShow}</span>
                          </div>
                          {pickUpDateRaw && (
                            <div className="flex justify-between py-0.5">
                              <span className="text-gray-400">Pickup Date</span>
                              <span className="text-gray-600">
                                {(() => {
                                  let dateLabel = pickUpDateRaw;
                                  if (pickUpDateRaw.length === 8) {
                                    const year = Number(pickUpDateRaw.substring(0, 4));
                                    const month = Number(pickUpDateRaw.substring(4, 6)) - 1;
                                    const day = Number(pickUpDateRaw.substring(6, 8));
                                    const d = new Date(year, month, day);
                                    if (!isNaN(d.getTime())) {
                                      dateLabel = formatUSDate(d);
                                    }
                                  } else {
                                    dateLabel = formatUSDate(pickUpDateRaw) || pickUpDateRaw;
                                  }
                                  return dateLabel;
                                })()}
                              </span>
                            </div>
                          )}
                          {serviceName && (
                            <div className="flex justify-between py-0.5">
                              <span className="text-gray-400">Service Courier</span>
                              <span className="font-bold text-emerald-400">{serviceName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};



// Parts list display sub-component
const PartsListSection = ({ 
  jobId, 
  assignments, 
  setAssignments,
  onTrackParts,
  onTrackDetail
}: { 
  jobId: string; 
  assignments: any[]; 
  setAssignments: React.Dispatch<React.SetStateAction<any[]>>;
  onTrackParts: () => void;
  onTrackDetail: (part: any) => void;
}) => {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadParts = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getAssignmentParts(jobId);
      if (res.success) {
        setParts(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParts();
  }, [jobId, assignments]); // reload when assignments updates

  const handleDeletePart = async (part: any) => {
    try {
      const res = await ApiService.deletePart(jobId, part.orderId, part.id);
      if (res.success) {
        loadParts();
        // Also update main list
        const a = mockDb.getAssignment(jobId);
        if (a) {
          // just force reload
          setAssignments(prev => [...prev]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-4 text-xs text-gray-400"><Loader2 className="h-4 w-4 animate-spin text-blue-500" /> Fetching parts checklist...</div>;

  const hasTrackableParts = parts.some(p => !p.isDraft && p.status !== 'Draft' && p.status !== 'draft' && p.trackingNumber);

  return (
    <div className="space-y-3">
      {hasTrackableParts && (
        <div className="flex justify-end">
          <button
            onClick={onTrackParts}
            className="text-[11px] font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-all border border-amber-500/25 px-3 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer shadow-sm hover:scale-[1.01]"
          >
            <Truck className="h-3.5 w-3.5 text-amber-500" />
            <span>Track All Parts</span>
          </button>
        </div>
      )}

      {parts.length === 0 ? (
        <div className="border border-dashed border-gray-200/80 bg-gray-50 rounded-2xl py-8 px-4 text-center flex flex-col items-center justify-center">
          <Package className="h-7 w-7 text-gray-400 mb-2.5" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">No Parts Added</p>
          <p className="text-[11px] text-gray-400 mt-1 max-w-[280px] leading-relaxed">No parts have been ordered or assigned to this service order yet.</p>
        </div>
      ) : (
        <div className="border border-gray-200/80 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-400 font-bold uppercase bg-gray-50 tracking-wider">
                <th className="p-3.5">Part Details</th>
                <th className="p-3.5">Qty</th>
                <th className="p-3.5">Carrier / Order #</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {parts.map((p) => {
                const statusCls = p.status === 'Delivered' 
                  ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                  : p.status === 'Shipped' 
                    ? 'bg-blue-500/10 text-blue-450 border-blue-500/20' 
                    : 'bg-gray-100 text-gray-500 border-gray-200';

                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-gray-900">{p.partNumber}</p>
                    </td>
                    <td className="p-3.5 font-bold text-gray-600">{p.quantity}</td>
                    <td className="p-3.5">
                      <p className="text-gray-600 font-mono">{p.orderNo || '-'}</p>
                      {p.trackingNumber && (
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.carrier || 'FedEx'}: {p.trackingNumber}</p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${statusCls}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {p.isDraft || p.status === 'Draft' || p.status === 'draft' ? (
                        <button
                          onClick={() => handleDeletePart(p)}
                          className="p-1.5 text-gray-400 hover:text-rose-450 hover:bg-gray-50 border border-gray-200 hover:border-gray-200 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : p.trackingNumber ? (
                        <button
                          onClick={() => onTrackDetail(p)}
                          className="px-2.5 py-1 text-[10px] font-extrabold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Truck className="h-3 w-3" />
                          <span>Track</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold pr-2">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toUpperCase().replace(/\s+/g, '_');
  let cls = '';
  switch (s) {
    case 'ASSIGNED':
      cls = 'bg-[#2372BE] text-white';
      break;
    case 'ARRIVED':
    case 'IN_PROGRESS':
      cls = 'bg-[#E57725] text-white';
      break;
    case 'PART_ARRIVED':
    case 'WAITING_ON_PARTS':
    case 'PART_ORDER':
    case 'RESCHEDULED':
      cls = 'bg-[#FF7052] text-white';
      break;
    case 'COMPLETED':
      cls = 'bg-[#16A34A] text-white';
      break;
    case 'AVAILABLE':
      cls = 'bg-[#28A745] text-white';
      break;
    case 'NON_SEARS':
      cls = 'bg-[#FEF3C7] text-[#92400E] border border-amber-200/50';
      break;
    default:
      cls = 'bg-gray-100 text-gray-600 border-gray-200';
  }
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default AssignmentsPage;

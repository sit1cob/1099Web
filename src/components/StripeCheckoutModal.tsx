import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CheckCircle, Loader2, Package, MapPin, AlertCircle, CreditCard, Truck, Clock, Zap, ExternalLink, ShoppingCart, Settings } from 'lucide-react';
import ApiService from '../api/apiService';
import { STRIPE_CONFIG } from '../utils/config';

const stripePromise = loadStripe(STRIPE_CONFIG.PUBLISHABLE_KEY);

type ShippingMode = 'Normal' | 'Priority' | 'Expedite';
type Step = 'summary' | 'payment' | 'success';

interface CartItem {
  itemId: string;
  partNo: string;
  name: string;
  description?: string;
  price: number;
  sellPrice?: string;
  quantity: number;
  productGroupId: string;
  imageUrl?: string;
}

export interface StripeCheckoutModalProps {
  cart: CartItem[];
  assignmentId: string;
  onClose: () => void;
  onSuccess: () => void;
  onOrderMore?: () => void;
}

const SHIPPING_OPTIONS: { mode: ShippingMode; label: string; days: string; Icon: React.FC<any> }[] = [
  { mode: 'Normal',   label: 'Standard', days: '5–7 days', Icon: Truck },
  { mode: 'Priority', label: 'Priority',  days: '2–3 days', Icon: Clock },
  { mode: 'Expedite', label: 'Expedite',  days: '1–2 days', Icon: Zap  },
];

const DEFAULT_SHIPPING  = 15.99;
const DEFAULT_TAX_RATE  = 0.0825;

const extractItemParts = (itemId = '') => ({
  div: String(parseInt(itemId.substring(0, 4) || '0') || 0).padStart(3, '0'),
  pls: itemId.substring(4, 7) || '',
});

// ── Inner form — must live inside <Elements> ──────────────────────
interface PaymentFormProps {
  total: number;
  onSuccess: (paymentIntent: any) => void;
  onError: (msg: string) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ total, onSuccess, onError, submitting, setSubmitting }) => {
  const stripe   = useStripe();
  const elements = useElements();

  const handlePay = async () => {
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    try {
      const { error: submitErr } = await elements.submit();
      if (submitErr) { onError(submitErr.message || 'Invalid payment details'); return; }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) { onError(error.message || 'Payment failed. Please try again.'); }
      else if (paymentIntent) { onSuccess(paymentIntent); }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PaymentElement options={{ layout: 'tabs', defaultValues: { billingDetails: { address: { country: 'US' } } } }} />
      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || !stripe || !elements}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /><span>Processing payment...</span></>
        ) : (
          <span>Pay ${total.toFixed(2)}</span>
        )}
      </button>
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────
const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({ cart, assignmentId, onClose, onSuccess, onOrderMore }) => {
  const navigate = useNavigate();
  const [step,            setStep]            = useState<Step>('summary');
  const [shippingMode,    setShippingMode]    = useState<ShippingMode>('Priority');
  const [shipping,        setShipping]        = useState(DEFAULT_SHIPPING);
  const [shippingTax,     setShippingTax]     = useState(0);
  const [tax,             setTax]             = useState(0);
  const [ead,             setEad]             = useState<string | null>(null);
  const [loadingPricing,  setLoadingPricing]  = useState(false);
  const [clientSecret,    setClientSecret]    = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [vendorProfile,   setVendorProfile]   = useState<any>(null);
  const [successData,     setSuccessData]     = useState<any>(null);

  const subtotal = cart.reduce((s, i) => {
    const price = parseFloat(i.sellPrice ?? String(i.price)) || 0;
    return s + price * i.quantity;
  }, 0);
  const total    = parseFloat((subtotal + shipping + shippingTax + tax).toFixed(2));

  // Load vendor profile once
  useEffect(() => {
    ApiService.getVendorProfile().then(res => {
      if (res?.success && res.data) setVendorProfile(res.data);
    });
  }, []);

  // Re-fetch EAD pricing whenever shippingMode or vendorProfile changes
  useEffect(() => {
    if (!vendorProfile || cart.length === 0) return;
    fetchPricing();
  }, [shippingMode, vendorProfile]);

  // Initialise tax with default while waiting for API
  useEffect(() => {
    setTax(parseFloat((subtotal * DEFAULT_TAX_RATE).toFixed(2)));
  }, [subtotal]);

  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      const partDetails = cart.map(item => {
        const { div, pls } = extractItemParts(item.itemId);
        return { div, pls, partNumber: item.partNo, quantity: item.quantity };
      });
      const res = await ApiService.getEadShipping({
        stateCode:   vendorProfile?.state || vendorProfile?.stateCode || '',
        zipCode:     vendorProfile?.zipCode || vendorProfile?.zip || '',
        totalAmount: parseFloat(subtotal.toFixed(2)),
        shippingMode,
        partDetails,
      });
      if (res?.success && res.data) {
        const d = res.data;
        setShipping(parseFloat(d.shippingCharge ?? d.shippingCost ?? DEFAULT_SHIPPING));
        setShippingTax(parseFloat(d.shippingTax ?? 0));
        setTax(parseFloat(d.taxAmount ?? (subtotal * DEFAULT_TAX_RATE).toFixed(2)));
        setEad(d.parts?.[0]?.eadDate ?? d.estimatedArrivalDate ?? d.ead ?? null);
      }
      // else: silently use defaults — same as Android (swallow the error)
    } catch (err) {
      console.error('Failed to fetch shipping info:', err);
      // Don't show error to user — defaults will be used
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!cart.length) { setError('Cart is empty.'); return; }
    setLoadingPricing(true);
    setError(null);
    try {
      const cents = Math.round(total * 100);
      const items = cart.map(i => ({ partNo: i.partNo, quantity: i.quantity, price: i.price }));
      const res = await ApiService.createPaymentIntent(cents, items, { assignmentId });
      const cs  = res?.data?.clientSecret || res?.clientSecret;
      const pid = res?.data?.paymentIntentId || res?.paymentIntentId;
      if (!cs) throw new Error('Failed to create payment intent. Please try again.');
      setClientSecret(cs);
      setPaymentIntentId(pid || '');
      setStep('payment');
    } catch (e: any) {
      setError(e.message || 'Payment initialization failed.');
    } finally {
      setLoadingPricing(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    setError(null);
    try {
      // 5a — resolve npjCustomerNo from vendorProfile (already loaded), PATCH only as fallback
      let npjCustomerNo = vendorProfile?.npjCustomerNo
        || vendorProfile?.npjCustomerId
        || vendorProfile?.npjCustomerNo
        || '';
      if (!npjCustomerNo) {
        const profileRes = await ApiService.updateVendorProfileForOrder({});
        npjCustomerNo = profileRes?.data?.npjCustomerNo
          || profileRes?.data?.npjCustomerId
          || '';
      }

      // 5b — create direct part order
      // firstName/lastName: split vendorProfile.name (single field from API)
      const nameParts  = (vendorProfile?.name || '').trim().split(' ');
      const firstName  = nameParts[0] || '';
      const lastName   = nameParts.slice(1).join(' ') || firstName;

      // emailAddress: primary from profile, fallback to dashboard technician_email
      let emailAddress = vendorProfile?.email || '';
      if (!emailAddress) {
        const now   = new Date();
        const from  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const to    = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                        .toISOString().split('T')[0];
        const dashRes = await ApiService.getDashboardV2(from, to);
        emailAddress  = dashRes?.data?.technician_email || '';
      }

      const partDetails = cart.map(item => {
        const { pls } = extractItemParts(item.itemId);
        const partAmount = parseFloat(item.sellPrice ?? String(item.price)) || 0;
        return {
          partAmount,
          quantity:       item.quantity,
          pls,
          productGroupId: item.productGroupId || '',
          itemId:         item.itemId || item.partNo,
          partNo:         item.partNo,
          itemDescription: item.name || '',
        };
      });

      const phone = vendorProfile?.mobile || vendorProfile?.phone || vendorProfile?.dayPhoneNo || '';
      const orderRes = await ApiService.createDirectPartOrder({
        npjCustomerNo,
        firstName,
        lastName,
        emailAddress,
        dayPhoneNo:            phone,
        eveningPhoneNo:        vendorProfile?.eveningPhoneNo || phone,
        addressLine1:          vendorProfile?.addressLine1 || '',
        city:                  vendorProfile?.city || '',
        stateCode:             vendorProfile?.state || vendorProfile?.stateCode || '',
        zipCode:               vendorProfile?.zipCode || '',
        countryCode:           'US',
        paymentAmt:            parseFloat(total.toFixed(2)),
        stripePaymentIntentId: paymentIntentId || paymentIntent?.id || '',
        shippingMode,
        partDetails,
      });

      const shippingDays = shippingMode === 'Normal' ? '5–7 days' : shippingMode === 'Priority' ? '2–3 days' : '1–2 days';
      const shippingModeLabel = shippingMode === 'Normal' ? 'Standard' : shippingMode === 'Priority' ? 'Priority' : 'Expedite';

      const rawEadDate = orderRes?.data?.eadDate || ead || null;
      const formatEad = (s: string | null) => {
        if (!s) {
          const d = new Date(); d.setDate(d.getDate() + 3);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };

      setSuccessData({
        orderId:      orderRes?.data?.orderRefNo || orderRes?.data?.partOrderNo || orderRes?.data?.orderId || orderRes?.data?.orderNumber || `ORD-${Date.now()}`,
        date:         new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        deliveryEst:  formatEad(rawEadDate),
        shippingDays,
        shippingModeLabel,
        address:      [vendorProfile?.addressLine1, vendorProfile?.city,
                       `${vendorProfile?.state} ${vendorProfile?.zipCode}`].filter(Boolean).join(', '),
        city:         vendorProfile?.city || '',
      });
      setStep('success');
    } catch (e: any) {
      setError('Payment succeeded but order creation failed: ' + (e.message || 'Unknown error'));
    }
  };

  const handlePaymentError = (msg: string) => setError(msg);

  const addressStr = vendorProfile
    ? [vendorProfile.addressLine1, vendorProfile.city,
       `${vendorProfile.state || ''} ${vendorProfile.zipCode || ''}`.trim()]
        .filter(Boolean).join(', ')
    : '';

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header (hidden on success) */}
        {step !== 'success' && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">
                {step === 'summary' ? 'Order Summary' : 'Payment'}
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {step === 'summary'
                  ? `${cart.length} item${cart.length !== 1 ? 's' : ''} · FieldForce Parts`
                  : 'Secure · Powered by Stripe'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-grow">

          {/* ── STEP: Summary ─────────────────────────────────── */}
          {step === 'summary' && (
            <div className="p-5 space-y-5">

              {/* Order items */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Order Items</p>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.itemId || item.partNo} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-9 h-9 object-contain rounded-lg bg-white border border-gray-100 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Part #{item.partNo} · Qty {item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-900 shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping method */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Shipping Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {SHIPPING_OPTIONS.map(({ mode, label, days, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setShippingMode(mode)}
                      className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        shippingMode === mode
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mx-auto mb-1 ${shippingMode === mode ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className="text-[11px] font-bold">{label}</p>
                      <p className={`text-[9px] mt-0.5 ${shippingMode === mode ? 'text-blue-500' : 'text-gray-400'}`}>{days}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipping address */}
              {addressStr && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Shipping Address</p>
                  <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-700">{addressStr}</p>
                  </div>
                </div>
              )}

              {/* Price breakdown */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Shipping</span>
                  <span>{loadingPricing ? <Loader2 className="h-3 w-3 animate-spin inline" /> : `$${shipping.toFixed(2)}`}</span>
                </div>
                {!loadingPricing && shippingTax > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Shipping Tax</span><span>${shippingTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tax</span>
                  <span>{loadingPricing ? <Loader2 className="h-3 w-3 animate-spin inline" /> : `$${tax.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={loadingPricing}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loadingPricing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Preparing...</span></>
                  : <><CreditCard className="h-4 w-4" /><span>Pay ${total.toFixed(2)}</span></>}
              </button>
            </div>
          )}

          {/* ── STEP: Payment ─────────────────────────────────── */}
          {step === 'payment' && clientSecret && (
            <div className="p-5 space-y-5">
              {/* Compact order header */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    {cart.length} part{cart.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {SHIPPING_OPTIONS.find(o => o.mode === shippingMode)?.label} shipping · {SHIPPING_OPTIONS.find(o => o.mode === shippingMode)?.days}
                  </p>
                </div>
                <p className="text-sm font-bold text-blue-600">${total.toFixed(2)}</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb', borderRadius: '12px' } } }}
              >
                <PaymentForm
                  total={total}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  submitting={submitting}
                  setSubmitting={setSubmitting}
                />
              </Elements>

              <button
                type="button"
                onClick={() => { setStep('summary'); setError(null); }}
                disabled={submitting}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors cursor-pointer disabled:opacity-40"
              >
                ← Back to order summary
              </button>
            </div>
          )}

          {/* ── STEP: Success ─────────────────────────────────── */}
          {step === 'success' && successData && (
            <div className="flex flex-col">
              {/* Green success header */}
              <div className="bg-emerald-600 px-6 py-8 text-center shrink-0">
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full mb-4">
                  <CheckCircle className="h-3 w-3" />
                  Payment Confirmed
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-white font-bold text-xl">Order Placed Successfully</h2>
                {successData.city && (
                  <p className="text-emerald-200 text-xs mt-1">Ships to {successData.city}</p>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Address row */}
                {successData.address && (
                  <div className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                    <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
                    <span className="text-xs text-gray-700">{successData.address}</span>
                  </div>
                )}

                {/* Order details */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Order Details</p>
                  <div className="space-y-2.5">
                    {[
                      ['Order ID',     successData.orderId],
                      ['Date',         successData.date],
                      ['Shipping',     `${successData.shippingModeLabel} · ${successData.shippingDays}`],
                      ...(successData.deliveryEst ? [['Delivery Est.', successData.deliveryEst]] : []),
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-semibold text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ordered parts + price summary */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ordered Parts</p>
                  <div className="space-y-3 mb-4">
                    {cart.map(item => (
                      <div key={item.itemId || item.partNo} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-blue-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-xs text-gray-900">{item.name}</p>
                            <p className="text-gray-400 text-[10px]">Qty {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-xs text-gray-900 shrink-0">${(parseFloat(item.sellPrice ?? String(item.price)) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs text-gray-500"><span>Shipping</span><span>${shipping.toFixed(2)}</span></div>
                    {shippingTax > 0 && (
                      <div className="flex justify-between text-xs text-gray-500"><span>Shipping Tax</span><span>${shippingTax.toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between text-xs text-gray-500"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total Paid</span>
                      <span className="text-blue-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* What happens next */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 mb-3">What happens next</p>
                  <div className="space-y-3">
                    {[
                      { Icon: Settings, text: 'Your order is being processed by our vendor network.' },
                      { Icon: Truck,    text: 'Tracking info will appear in Parts & Inventory once shipped.' },
                      { Icon: MapPin,   text: `Parts delivered to ${successData.address}.` },
                    ].map(({ Icon, text }) => (
                      <div key={text} className="flex items-start gap-3 text-xs text-blue-700">
                        <Icon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <button
                  type="button"
                  onClick={() => { onSuccess(); onClose(); navigate('/parts'); }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Parts &amp; Inventory
                </button>
                <button
                  type="button"
                  onClick={() => onOrderMore ? onOrderMore() : onClose()}
                  className="w-full py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Order More Parts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;

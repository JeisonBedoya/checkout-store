import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  closeCheckout,
  setCardInfo,
  setDeliveryInfo,
  goToSummary,
  createTransaction,
} from '../../store/slices/checkoutSlice';
import { CardInfo, DeliveryInfo, CardBrand } from '../../types';
import { detectCardBrand, formatCardNumber, validateLuhn } from '../../utils/card.utils';
import './PaymentModal.css';

const VISA_LOGO = (
  <svg viewBox="0 0 38 24" className="card-brand-logo" aria-label="Visa">
    <rect width="38" height="24" rx="4" fill="#1A1F71" />
    <text x="4" y="17" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="Arial">VISA</text>
  </svg>
);

const MC_LOGO = (
  <svg viewBox="0 0 38 24" className="card-brand-logo" aria-label="Mastercard">
    <rect width="38" height="24" rx="4" fill="#252525" />
    <circle cx="14" cy="12" r="8" fill="#EB001B" />
    <circle cx="24" cy="12" r="8" fill="#F79E1B" />
    <path d="M19 6.8a8 8 0 0 1 0 10.4A8 8 0 0 1 19 6.8z" fill="#FF5F00" />
  </svg>
);

interface Errors {
  number?: string;
  holder?: string;
  expMonth?: string;
  expYear?: string;
  cvc?: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

export default function PaymentModal() {
  const dispatch = useAppDispatch();
  const { selectedProduct, quantity, loading, error, step } = useAppSelector((s) => s.checkout);

  const [card, setCard] = useState<CardInfo>({
    number: '',
    holder: '',
    expMonth: '',
    expYear: '',
    cvc: '',
    brand: 'unknown',
  });

  const [delivery, setDelivery] = useState<DeliveryInfo>({
    email: '',
    name: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    country: 'CO',
    postalCode: '',
    legalId: '',
    legalIdType: 'CC',
  });

  const [errors, setErrors] = useState<Errors>({});
  const [showCvc, setShowCvc] = useState(false);

  if (step !== 'card-form') return null;

  const validate = (): boolean => {
    const e: Errors = {};
    const cleanNumber = card.number.replace(/\s/g, '');
    if (!validateLuhn(cleanNumber)) e.number = 'Invalid card number';
    if (!card.holder.trim()) e.holder = 'Name is required';
    if (!card.expMonth || parseInt(card.expMonth) < 1 || parseInt(card.expMonth) > 12)
      e.expMonth = 'Invalid month';
    if (!card.expYear || card.expYear.length < 2) e.expYear = 'Invalid year';
    if (!card.cvc || card.cvc.length < 3) e.cvc = 'Invalid CVC';
    if (!/\S+@\S+\.\S+/.test(delivery.email)) e.email = 'Valid email required';
    if (!delivery.name.trim()) e.name = 'Name is required';
    if (!delivery.phone.trim()) e.phone = 'Phone is required';
    if (!delivery.address.trim()) e.address = 'Address is required';
    if (!delivery.city.trim()) e.city = 'City is required';
    if (!delivery.region.trim()) e.region = 'Region is required';
    if (!delivery.postalCode.trim()) e.postalCode = 'Postal code is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    dispatch(setCardInfo(card));
    dispatch(setDeliveryInfo(delivery));
    dispatch(createTransaction());
  };

  const brand: CardBrand = detectCardBrand(card.number);

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) dispatch(closeCheckout()); }}>
      <div className="modal animate-slideUp" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <button className="btn btn-ghost modal-close" onClick={() => dispatch(closeCheckout())} aria-label="Close">✕</button>
          <div>
            <h2>Payment Details</h2>
            <p className="modal-subtitle">{selectedProduct?.name} × {quantity}</p>
          </div>
        </div>

        <div className="modal-body">
          {/* Credit Card Preview */}
          <div className={`cc-preview ${brand !== 'unknown' ? brand : ''}`}>
            <div className="cc-brand">
              {brand === 'visa' && VISA_LOGO}
              {brand === 'mastercard' && MC_LOGO}
              {brand === 'unknown' && <span className="cc-brand-placeholder">💳</span>}
            </div>
            <div className="cc-number-display">
              {card.number ? card.number.padEnd(19, '·').replace(/ /g, ' ') : '•••• •••• •••• ••••'}
            </div>
            <div className="cc-bottom">
              <div>
                <div className="cc-label">Card Holder</div>
                <div className="cc-value">{card.holder || 'YOUR NAME'}</div>
              </div>
              <div>
                <div className="cc-label">Expires</div>
                <div className="cc-value">
                  {card.expMonth || 'MM'}/{card.expYear || 'YY'}
                </div>
              </div>
            </div>
          </div>

          {/* Card Fields */}
          <section className="modal-section">
            <h3>Card Information</h3>

            <div className="form-group">
              <label className="form-label">Card Number</label>
              <div className="input-icon-wrapper">
                <input
                  className={`form-input ${errors.number ? 'error' : ''}`}
                  value={card.number}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value);
                    setCard((c) => ({ ...c, number: formatted, brand: detectCardBrand(formatted) }));
                    if (errors.number) setErrors((er) => ({ ...er, number: undefined }));
                  }}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  maxLength={19}
                />
                <span className="input-icon">
                  {brand === 'visa' && VISA_LOGO}
                  {brand === 'mastercard' && MC_LOGO}
                </span>
              </div>
              {errors.number && <span className="form-error">{errors.number}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Card Holder Name</label>
              <input
                className={`form-input ${errors.holder ? 'error' : ''}`}
                value={card.holder}
                onChange={(e) => {
                  setCard((c) => ({ ...c, holder: e.target.value.toUpperCase() }));
                  if (errors.holder) setErrors((er) => ({ ...er, holder: undefined }));
                }}
                placeholder="JOHN DOE"
                autoComplete="cc-name"
              />
              {errors.holder && <span className="form-error">{errors.holder}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Month</label>
                <input
                  className={`form-input ${errors.expMonth ? 'error' : ''}`}
                  value={card.expMonth}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setCard((c) => ({ ...c, expMonth: v }));
                    if (errors.expMonth) setErrors((er) => ({ ...er, expMonth: undefined }));
                  }}
                  placeholder="MM"
                  inputMode="numeric"
                  maxLength={2}
                />
                {errors.expMonth && <span className="form-error">{errors.expMonth}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input
                  className={`form-input ${errors.expYear ? 'error' : ''}`}
                  value={card.expYear}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCard((c) => ({ ...c, expYear: v }));
                    if (errors.expYear) setErrors((er) => ({ ...er, expYear: undefined }));
                  }}
                  placeholder="YY"
                  inputMode="numeric"
                  maxLength={4}
                />
                {errors.expYear && <span className="form-error">{errors.expYear}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">CVC</label>
                <div className="input-icon-wrapper">
                  <input
                    className={`form-input ${errors.cvc ? 'error' : ''}`}
                    value={card.cvc}
                    type={showCvc ? 'text' : 'password'}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCard((c) => ({ ...c, cvc: v }));
                      if (errors.cvc) setErrors((er) => ({ ...er, cvc: undefined }));
                    }}
                    placeholder="•••"
                    inputMode="numeric"
                    maxLength={4}
                  />
                  <button
                    type="button"
                    className="cvc-toggle"
                    onClick={() => setShowCvc((s) => !s)}
                    aria-label={showCvc ? 'Hide CVC' : 'Show CVC'}
                  >
                    {showCvc ? '🙈' : '👁'}
                  </button>
                </div>
                {errors.cvc && <span className="form-error">{errors.cvc}</span>}
              </div>
            </div>
          </section>

          {/* Delivery Fields */}
          <section className="modal-section">
            <h3>Delivery Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  value={delivery.name}
                  onChange={(e) => {
                    setDelivery((d) => ({ ...d, name: e.target.value }));
                    if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                  }}
                  placeholder="John Doe"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  value={delivery.email}
                  type="email"
                  onChange={(e) => {
                    setDelivery((d) => ({ ...d, email: e.target.value }));
                    if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                  }}
                  placeholder="john@example.com"
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className={`form-input ${errors.phone ? 'error' : ''}`}
                value={delivery.phone}
                inputMode="tel"
                onChange={(e) => {
                  setDelivery((d) => ({ ...d, phone: e.target.value }));
                  if (errors.phone) setErrors((er) => ({ ...er, phone: undefined }));
                }}
                placeholder="+57 300 000 0000"
              />
              {errors.phone && <span className="form-error">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                className={`form-input ${errors.address ? 'error' : ''}`}
                value={delivery.address}
                onChange={(e) => {
                  setDelivery((d) => ({ ...d, address: e.target.value }));
                  if (errors.address) setErrors((er) => ({ ...er, address: undefined }));
                }}
                placeholder="Calle 34 # 56 - 78"
              />
              {errors.address && <span className="form-error">{errors.address}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className={`form-input ${errors.city ? 'error' : ''}`}
                  value={delivery.city}
                  onChange={(e) => {
                    setDelivery((d) => ({ ...d, city: e.target.value }));
                    if (errors.city) setErrors((er) => ({ ...er, city: undefined }));
                  }}
                  placeholder="Bogotá"
                />
                {errors.city && <span className="form-error">{errors.city}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input
                  className={`form-input ${errors.region ? 'error' : ''}`}
                  value={delivery.region}
                  onChange={(e) => {
                    setDelivery((d) => ({ ...d, region: e.target.value }));
                    if (errors.region) setErrors((er) => ({ ...er, region: undefined }));
                  }}
                  placeholder="Bogotá D.C."
                />
                {errors.region && <span className="form-error">{errors.region}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  className={`form-input ${errors.postalCode ? 'error' : ''}`}
                  value={delivery.postalCode}
                  inputMode="numeric"
                  onChange={(e) => {
                    setDelivery((d) => ({ ...d, postalCode: e.target.value }));
                    if (errors.postalCode) setErrors((er) => ({ ...er, postalCode: undefined }));
                  }}
                  placeholder="110111"
                />
                {errors.postalCode && <span className="form-error">{errors.postalCode}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Legal ID</label>
                <input
                  className="form-input"
                  value={delivery.legalId}
                  inputMode="numeric"
                  onChange={(e) => setDelivery((d) => ({ ...d, legalId: e.target.value }))}
                  placeholder="1234567890"
                />
              </div>
            </div>
          </section>

          {error && (
            <div className="modal-error">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Creating order…</> : 'Review Order →'}
          </button>
        </div>
      </div>
    </div>
  );
}

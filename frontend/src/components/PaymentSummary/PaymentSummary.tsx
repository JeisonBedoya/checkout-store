import { useAppDispatch, useAppSelector } from '../../store';
import { goBackToCardForm, processPayment } from '../../store/slices/checkoutSlice';
import { formatCurrency, maskCardNumber } from '../../utils/card.utils';
import './PaymentSummary.css';

export default function PaymentSummary() {
  const dispatch = useAppDispatch();
  const { step, selectedProduct, quantity, cardInfo, pendingTransaction, loading, error } =
    useAppSelector((s) => s.checkout);

  if (step !== 'summary' || !pendingTransaction || !cardInfo || !selectedProduct) return null;

  const productAmount = pendingTransaction.amountInCents;
  const baseFee = pendingTransaction.baseFeeInCents;
  const deliveryFee = pendingTransaction.deliveryFeeInCents;
  const total = pendingTransaction.totalAmountInCents;

  return (
    <div className="overlay">
      <div className="summary-sheet animate-slideUp" role="dialog" aria-modal="true">
        <div className="summary-handle" />

        <div className="summary-header">
          <h2>Order Summary</h2>
          <p className="summary-ref">Ref: {pendingTransaction.reference}</p>
        </div>

        <div className="summary-body">
          {/* Product */}
          <div className="summary-product">
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
              className="summary-product-img"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=80';
              }}
            />
            <div className="summary-product-info">
              <p className="summary-product-name">{selectedProduct.name}</p>
              <p className="summary-product-qty">Qty: {quantity}</p>
            </div>
            <p className="summary-product-price">{formatCurrency(productAmount)}</p>
          </div>

          {/* Fees breakdown */}
          <div className="summary-fees">
            <div className="fee-row">
              <span>Product subtotal</span>
              <span>{formatCurrency(productAmount)}</span>
            </div>
            <div className="fee-row">
              <span>Base fee</span>
              <span>{formatCurrency(baseFee)}</span>
            </div>
            <div className="fee-row">
              <span>Delivery fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="fee-row total-row">
              <span>Total</span>
              <span className="total-amount">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="summary-payment-method">
            <span className="pm-label">Paying with</span>
            <span className="pm-value">
              {cardInfo.brand !== 'unknown' && (
                <span className={`pm-brand ${cardInfo.brand}`}>
                  {cardInfo.brand === 'visa' ? 'VISA' : 'Mastercard'}
                </span>
              )}
              {maskCardNumber(cardInfo.number)}
            </span>
          </div>

          {error && (
            <div className="summary-error">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        <div className="summary-footer">
          <button className="btn btn-outline" onClick={() => dispatch(goBackToCardForm())} disabled={loading}>
            ← Edit
          </button>
          <button
            className="btn btn-primary pay-now-btn"
            onClick={() => dispatch(processPayment())}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> Processing…</>
            ) : (
              `Pay ${formatCurrency(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

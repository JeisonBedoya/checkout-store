import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearCheckout } from '../../store/slices/checkoutSlice';
import { updateProductStock } from '../../store/slices/productsSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { formatCurrency } from '../../utils/card.utils';
import './TransactionResult.css';

export default function TransactionResult() {
  const dispatch = useAppDispatch();
  const { step, completedTransaction, error, selectedProduct } = useAppSelector((s) => s.checkout);

  const isProcessing = step === 'processing';
  const isResult = step === 'result';

  // Refresh products after result
  useEffect(() => {
    if (isResult && completedTransaction?.status === 'APPROVED') {
      if (completedTransaction.productId) {
        // optimistic stock update
        dispatch(updateProductStock({
          productId: completedTransaction.productId,
          newStock: -1, // will be corrected by fetch
        }));
      }
      // refetch products to get correct stock
      setTimeout(() => dispatch(fetchProducts()), 1500);
    }
  }, [isResult, completedTransaction?.status]);

  if (!isProcessing && !isResult) return null;

  // Processing state
  if (isProcessing) {
    return (
      <div className="overlay">
        <div className="result-sheet animate-fadeIn">
          <div className="processing-state">
            <div className="processing-ring">
              <div className="spinner dark large-spinner" />
            </div>
            <h2>Processing Payment</h2>
            <p>Please wait, do not close this window…</p>
          </div>
        </div>
      </div>
    );
  }

  const approved = completedTransaction?.status === 'APPROVED';
  const declined = completedTransaction?.status === 'DECLINED';

  const handleClose = () => {
    dispatch(clearCheckout());
    dispatch(fetchProducts());
  };

  return (
    <div className="overlay">
      <div className="result-sheet animate-slideUp" role="dialog" aria-modal="true">
        <div className="result-icon-wrapper">
          {approved && <div className="result-icon success">✓</div>}
          {declined && <div className="result-icon error">✕</div>}
          {!approved && !declined && <div className="result-icon warning">!</div>}
        </div>

        <div className="result-content">
          <h2 className={`result-title ${approved ? 'success' : 'error'}`}>
            {approved ? 'Payment Approved!' : declined ? 'Payment Declined' : 'Transaction Error'}
          </h2>

          <p className="result-message">
            {approved
              ? `Your order has been placed. ${selectedProduct?.name} will be delivered to your address.`
              : error || 'Your payment could not be processed. Please try again.'}
          </p>

          {completedTransaction && (
            <div className="result-details">
              <div className="detail-row">
                <span>Reference</span>
                <span className="detail-value mono">{completedTransaction.reference}</span>
              </div>
              {completedTransaction.gatewayTransactionId && (
                <div className="detail-row">
                  <span>Transaction ID</span>
                  <span className="detail-value mono">{completedTransaction.gatewayTransactionId}</span>
                </div>
              )}
              <div className="detail-row">
                <span>Status</span>
                <span className={`status-chip ${completedTransaction.status.toLowerCase()}`}>
                  {completedTransaction.status}
                </span>
              </div>
              {approved && (
                <div className="detail-row">
                  <span>Total Paid</span>
                  <span className="detail-value bold">
                    {formatCurrency(completedTransaction.totalAmountInCents)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="result-footer">
          <button className="btn btn-primary" onClick={handleClose}>
            {approved ? '← Back to Store' : '← Try Again'}
          </button>
        </div>
      </div>
    </div>
  );
}

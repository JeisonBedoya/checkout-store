import { Provider } from 'react-redux';
import { store } from './store';
import Header from './components/Layout/Header';
import ProductGrid from './components/ProductCard/ProductGrid';
import PaymentModal from './components/PaymentModal/PaymentModal';
import PaymentSummary from './components/PaymentSummary/PaymentSummary';
import TransactionResult from './components/TransactionResult/TransactionResult';
import './App.css';

function AppInner() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <ProductGrid />
        </div>
      </main>
      {/* Modals / overlays */}
      <PaymentModal />
      <PaymentSummary />
      <TransactionResult />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}

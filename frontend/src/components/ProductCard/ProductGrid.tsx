import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchProducts } from '../../store/slices/productsSlice';
import { openCheckout } from '../../store/slices/checkoutSlice';
import { Product } from '../../types';
import ProductCard from './ProductCard';
import './ProductGrid.css';

export default function ProductGrid() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.products);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleBuy = (product: Product, quantity: number) => {
    dispatch(openCheckout({ product, quantity }));
  };

  if (loading) {
    return (
      <div className="grid-loading">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card skeleton-card">
            <div className="skeleton skeleton-img" />
            <div className="skeleton-body">
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text short" />
              <div className="skeleton skeleton-text" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid-error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load products</h3>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ width: 'auto', marginTop: 8 }} onClick={() => dispatch(fetchProducts())}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="product-grid-section">
      <div className="grid-header">
        <h1>Our Products</h1>
        <p className="grid-subtitle">{items.length} items available</p>
      </div>
      <div className="product-grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} onBuy={handleBuy} />
        ))}
      </div>
    </section>
  );
}

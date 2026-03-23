import { useState } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/card.utils';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onBuy: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onBuy }: ProductCardProps) {
  const [qty, setQty] = useState(1);
  const isOutOfStock = product.stock === 0;

  return (
    <article className="product-card card">
      <div className="product-img-wrapper">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="product-img"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400';
          }}
        />
        <span className={`stock-badge ${isOutOfStock ? 'out' : product.stock <= 3 ? 'low' : 'ok'}`}>
          {isOutOfStock ? 'Out of stock' : `${product.stock} left`}
        </span>
        <span className="category-badge">{product.category}</span>
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>

        <div className="product-footer">
          <div className="product-price">
            <span className="price-value">{formatCurrency(product.price)}</span>
            <span className="price-unit">/ unit</span>
          </div>

          {!isOutOfStock && (
            <div className="qty-row">
              <div className="qty-control">
                <button
                  className="qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >−</button>
                <span className="qty-value">{qty}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  aria-label="Increase quantity"
                >+</button>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary buy-btn"
            disabled={isOutOfStock}
            onClick={() => onBuy(product, qty)}
          >
            {isOutOfStock ? 'Unavailable' : (
              <>
                <span>💳</span>
                Pay with credit card
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

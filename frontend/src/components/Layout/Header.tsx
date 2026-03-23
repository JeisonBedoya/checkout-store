import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🛍</span>
            <span className="logo-text">CheckoutStore</span>
          </div>
          <p className="header-tagline">Premium tech, fast delivery</p>
        </div>
      </div>
    </header>
  );
}

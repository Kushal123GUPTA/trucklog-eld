/**
 * Header Component
 * Sticky navigation bar with branding and links.
 */

export default function Header() {
  return (
    <header className="header" id="app-header">
      <div className="container header__inner">
        <div className="header__brand">
          <span className="header__logo">🚛</span>
          <div>
            <div className="header__title">TruckLog ELD</div>
            <div className="header__subtitle">Trip Planner & ELD Log Generator</div>
          </div>
        </div>

        <nav className="header__nav">
          <a href="#trip-form" className="header__link header__link--active">
            Trip Planner
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header__link"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

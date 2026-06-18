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
      </div>
    </header>
  );
}

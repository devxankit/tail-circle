import React from 'react';

export function Topbar({ onCtaClick }) {
  return (
    <header className="topbar" aria-label="Primary navigation">
      <a className="brand" href="#" aria-label="Tail Circle home">
        <span className="brand-mark" aria-hidden="true"></span>
        <span className="brand-name">
          <span className="teal">Tail</span> <span className="coral">Circle</span>
        </span>
      </a>

      <nav className="desktop-nav" aria-label="Main menu">
        <a href="#services">Services</a>
        <a href="#why">Why Tail Circle</a>
        <a href="#app">Get the app</a>
        <a
          className="nav-cta"
          href="#app"
          onClick={(e) => onCtaClick && onCtaClick('Download App', e)}
        >
          Download App
        </a>
      </nav>
    </header>
  );
}

export default Topbar;

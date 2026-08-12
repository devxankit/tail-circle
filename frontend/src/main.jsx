import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './services/offline'

// ==========================================
// GLOBAL COPY-PROTECTION EVENT LISTENERS
// ==========================================
if (typeof window !== 'undefined') {
  const isEditableElement = (el) => {
    if (!el || typeof el.getAttribute !== 'function') return false;
    const tagName = el.tagName;
    const isEditable = el.getAttribute('contenteditable') === 'true';
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || isEditable;
  };

  // Prevent copying text
  document.addEventListener('copy', (e) => {
    if (!isEditableElement(e.target)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent cutting text
  document.addEventListener('cut', (e) => {
    if (!isEditableElement(e.target)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent right-click / context menu (disables long-press context menus on iOS & Android)
  document.addEventListener('contextmenu', (e) => {
    if (!isEditableElement(e.target)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent dragging images or text blocks
  document.addEventListener('dragstart', (e) => {
    if (!isEditableElement(e.target)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent text selection initialization on non-editable elements
  document.addEventListener('selectstart', (e) => {
    if (!isEditableElement(e.target)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Instant Selection-Clear Shield: If selection somehow triggers, clear it immediately
  document.addEventListener('selectionchange', () => {
    const activeElement = document.activeElement;
    if (activeElement && isEditableElement(activeElement)) {
      return;
    }
    
    // Clear selection if it occurs on standard layout components
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '') {
      try {
        selection.removeAllRanges();
      } catch (err) {
        // Fallback for safety
      }
    }
  });
}

// Offline support: precached shell + user pages, cached GET responses.
registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

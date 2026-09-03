import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorScreen } from './components/error/ErrorScreen';
import { classifyError, isChunkLoadError, makeReference } from './components/error/errorCopy';
import { homeFor } from './components/error/homeRoute';

/**
 * Last line of defence for a render that throws.
 *
 * Instead of the white screen (or a stack trace) a thrown component used to
 * produce, the user gets an illustrated screen, a sentence in plain language
 * and a way out. The stack goes to the console under a reference code that is
 * also shown on screen, so a support report can be tied back to a log line.
 *
 * Two things it deliberately does beyond catching:
 *
 *  - Resets on navigation. Without this a single bad screen poisons the whole
 *    session: the boundary stays in its error state and every later route
 *    renders it too, which looks exactly like the app being dead.
 *  - Recognises a failed chunk download. After a redeploy an open tab asks for
 *    a bundle that no longer exists; "Try again" can never fix that, so the
 *    screen offers a reload and says a new version is ready instead of
 *    blaming an error.
 */
class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, reference: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error, reference: makeReference() };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey === state.resetKey) return null;
    // Navigated somewhere new — drop the failure so the next screen gets a
    // clean render rather than inheriting the last one's error.
    return { resetKey: props.resetKey, error: null, reference: null };
  }

  componentDidCatch(error, info) {
    console.error(
      `[ErrorBoundary ${this.state.reference ?? ''}] ${error?.message ?? error}`,
      error,
      info?.componentStack
    );
  }

  handleRetry = () => this.setState({ error: null, reference: null });

  render() {
    const { error, reference } = this.state;
    if (!error) return this.props.children;

    const copy = classifyError(error);
    const staleBundle = isChunkLoadError(error);

    const actions = staleBundle
      ? [{ label: 'Reload', onClick: () => window.location.reload() }]
      : [
          { label: 'Try again', onClick: this.handleRetry },
          { label: 'Go home', variant: 'outline', onClick: this.props.onGoHome },
        ];

    return (
      <ErrorScreen
        variant={copy.variant}
        title={copy.title}
        message={copy.message}
        actions={actions}
        reference={reference}
        error={error}
      />
    );
  }
}

/** Router-aware wrapper — supplies the reset key and the way home. */
export function ErrorBoundary({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorBoundaryInner
      resetKey={location.pathname}
      onGoHome={() => navigate(homeFor(location.pathname), { replace: true })}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

export default ErrorBoundary;

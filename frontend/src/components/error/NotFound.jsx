import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorScreen } from './ErrorScreen';
import { homeFor } from './homeRoute';

/**
 * Catch-all 404. Reached when no route matched — a mistyped URL, a stale
 * bookmark, or a deep link to something that has since moved.
 */
export function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorScreen
      variant="notFound"
      title="This trail goes nowhere"
      message="We followed the paw prints and came up empty. That page may have moved, or the link was mistyped."
      actions={[
        {
          label: 'Take me home',
          onClick: () => navigate(homeFor(location.pathname), { replace: true }),
        },
        // A 404 is usually reached from a working page, so going back is a real
        // way out — unless this URL was the entry point and there is no back.
        ...(typeof window !== 'undefined' && window.history.length > 1
          ? [{ label: 'Go back', variant: 'outline', onClick: () => navigate(-1) }]
          : []),
      ]}
    />
  );
}

export default NotFound;

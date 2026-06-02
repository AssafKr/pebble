import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { legacySearchToPath } from '../lib/routes';

/** Redirect old `?issue=&view=` URLs to path-based routes. */
export function LegacySearchRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = legacySearchToPath(location.search);
    if (path) {
      navigate(path, { replace: true });
    }
  }, [location.search, navigate]);

  return null;
}

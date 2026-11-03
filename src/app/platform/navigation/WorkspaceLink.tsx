import { useEffect } from 'react';
import { Link, useLocation, type LinkProps } from 'react-router';

export const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/');
function crossesBoundary(path: string) {
  const target = import.meta.env.VITE_FRONTEND_APP;
  return target === 'member' ? isAdminPath(path) : target === 'admin' ? !isAdminPath(path) : false;
}
export function WorkspaceLink(props: LinkProps) {
  const path = typeof props.to === 'string' ? props.to.split(/[?#]/)[0] : props.to.pathname || '';
  const crossing = path.startsWith('/') && crossesBoundary(path);
  return <Link {...props} reloadDocument={props.reloadDocument || crossing} discover={crossing ? 'none' : props.discover} />;
}
// Also handles programmatic navigation originating from a shared auth flow.
export function CrossAppNavigation() {
  const location = useLocation();
  useEffect(() => {
    if (crossesBoundary(location.pathname)) window.location.replace(location.pathname + location.search + location.hash);
  }, [location.pathname, location.search, location.hash]);
  return null;
}

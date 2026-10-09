export const provisioningPortalUrl = (origin: string) => {
  const url = new URL(origin);
  url.port = '8443';
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.href;
};

// Cross-port storage is isolated: transfer only to the tab we opened, never a URL.
export const openAuthenticatedProvisioningPortal = (token?: string) => {
  const url = new URL(provisioningPortalUrl(window.location.origin));
  url.searchParams.set('controller-login', '1');
  const portal = window.open(url.href, '_blank');
  if (!portal) return;
  const onMessage = (event: MessageEvent) => {
    if (event.source !== portal || event.origin !== url.origin ||
        event.data?.type !== 'openwifi-portal-ready' || typeof event.data?.nonce !== 'string') return;
    portal.postMessage({ type: 'openwifi-controller-session', nonce: event.data.nonce, token: token ?? '' }, url.origin);
    cleanup();
  };
  const cleanup = () => {
    window.removeEventListener('message', onMessage);
    window.clearTimeout(timer);
  };
  window.addEventListener('message', onMessage);
  const timer = window.setTimeout(cleanup, 15000);
};

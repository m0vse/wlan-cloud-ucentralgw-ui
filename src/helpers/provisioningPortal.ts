export const provisioningPortalUrl = (origin: string) => {
  const url = new URL(origin);
  url.port = '8443';
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.href;
};

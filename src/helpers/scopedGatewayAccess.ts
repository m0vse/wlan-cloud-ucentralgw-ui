export const scopedGatewayCapabilities = (user?: { userRole: string; securityPolicy: string }): Set<string> => {
  if (!user?.securityPolicy || user.securityPolicy.length > 65536) return new Set();
  try {
    const policy = JSON.parse(user.securityPolicy);
    if (policy.version !== 1 || !Array.isArray(policy.grants) || !policy.grants.length || policy.grants.length > 256)
      return new Set();
    if (!policy.grants.every((grant: { scopeType: string; scopeId: string; includeDescendants: boolean; capabilities: unknown[] }) =>
      grant && ['entity', 'venue'].includes(grant.scopeType) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(grant.scopeId) &&
      typeof grant.includeDescendants === 'boolean' && Array.isArray(grant.capabilities) &&
      grant.capabilities.length > 0 && grant.capabilities.every((capability) => typeof capability === 'string')))
      return new Set();
    return new Set(policy.grants.flatMap((grant: { capabilities: string[] }) => grant.capabilities));
  } catch { return new Set(); }
};

// Navigation eligibility; the API authorizes every record and action.
export const canAccessGatewayRoute = (user: { userRole: string; securityPolicy: string } | undefined,
  route: { id: string }) => {
  if (!user) return false;
  if (user.userRole === 'root' || route.id === 'account-page') return true;
  const capabilities = scopedGatewayCapabilities(user);
  if (['devices-group', 'devices-table', 'device-page'].includes(route.id)) return capabilities.has('devices.read');
  if (['firmware-group', 'firmware-table'].includes(route.id)) return capabilities.has('firmware.read');
  return false;
};

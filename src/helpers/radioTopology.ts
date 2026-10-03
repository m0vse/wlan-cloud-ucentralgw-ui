export type RadioTopology = {
  active: 'dual-4x4' | 'single-8x8';
  desired: 'dual-4x4' | 'single-8x8';
  pending: boolean;
  recorded: number;
};
const modes = ['dual-4x4', 'single-8x8'];
export const readRadioTopology = (snapshot: any): RadioTopology | undefined => {
  const topology = snapshot?.data?.unit?.cambium?.radio_topology;
  if (!topology || !modes.includes(topology.active) || !modes.includes(topology.desired) ||
      typeof topology.reboot_required !== 'boolean' || !Number.isFinite(snapshot?.recorded)) return undefined;
  return { active: topology.active, desired: topology.desired,
    pending: topology.reboot_required || topology.active !== topology.desired, recorded: snapshot.recorded };
};
export const topologyLabel = (mode: string) => mode === 'single-8x8' ? 'single 8×8' : 'dual 4×4';
export const isTopologyDevice = (device?: { compatible?: string; manufacturer?: string; firmware?: string }) =>
  /xv3[-_ ]?8|TIP-thor/i.test(`${device?.compatible ?? ''} ${device?.manufacturer ?? ''} ${device?.firmware ?? ''}`);
export const mergeRadioTopology = (previous: RadioTopology | undefined, incoming: RadioTopology | undefined) =>
  !incoming || (previous && incoming.recorded <= previous.recorded) ? previous : incoming;

export type RebootRequirement = { pending: boolean; recorded: number; flags: Record<string, boolean>; reason?: string };
export const readRebootRequirement = (snapshot: any): RebootRequirement | undefined => {
  if (!Number.isFinite(snapshot?.recorded)) return undefined;
  const unit = snapshot?.data?.unit;
  const flags: Record<string, boolean> = {};
  if (typeof unit?.reboot_required === 'boolean') flags.unit = unit.reboot_required;
  if (typeof unit?.cambium?.reboot_required === 'boolean') flags.cambium = unit.cambium.reboot_required;
  const topology = readRadioTopology(snapshot);
  if (topology) flags.topology = topology.pending;
  if (!Object.keys(flags).length) return undefined;
  return { flags, recorded: snapshot.recorded, pending: Object.values(flags).some(Boolean),
    reason: topology?.pending ? `5 GHz: ${topologyLabel(topology.active)} → ${topologyLabel(topology.desired)}` : undefined };
};
export const mergeRebootRequirement = (previous: RebootRequirement | undefined, incoming: RebootRequirement | undefined): RebootRequirement | undefined => {
  if (!incoming || (previous && incoming.recorded <= previous.recorded)) return previous;
  // Missing fields or command acknowledgements cannot clear an outstanding reason.
  const flags = { ...previous?.flags, ...incoming.flags };
  const pending = Object.values(flags).some(Boolean);
  return { ...incoming, flags, pending, reason: pending ? incoming.reason ?? previous?.reason : undefined };
};

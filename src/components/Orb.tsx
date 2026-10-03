import type { OrbState } from "../models";
import { useStore } from "../storage/AppStore";
export function Orb({
  state = "idle",
  small = false,
}: {
  state?: OrbState;
  small?: boolean;
}) {
  const { settings } = useStore();
  return (
    <div
      aria-hidden="true"
      className={`orb-wrap ${small ? "orb-small" : ""} intensity-${settings.intensity} state-${state}`}
    >
      <div className="orb-aura" />
      <div className="orb-orbit orbit-one" />
      <div className="orb-orbit orbit-two" />
      <div className="orb">
        <div className="orb-texture" />
        <div className="orb-wave wave-one" />
        <div className="orb-wave wave-two" />
        <div className="orb-shine" />
      </div>
    </div>
  );
}

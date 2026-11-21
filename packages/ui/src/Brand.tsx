import judgeUrl from "../assets/wingman-judge.png";
import logoUrl from "../assets/wingman-logo-dark.svg";

export function BrandLogo() {
  return <img className="wingman-logo" src={logoUrl} width="508" height="112" alt="Wingman" />;
}

export function WingmanMascot({ className = "" }: { className?: string }) {
  return (
    <img
      className={`wingman-mascot ${className}`}
      src={judgeUrl}
      width="420"
      height="420"
      alt="Wingman's pigeon judge holding up an evidence sheet"
    />
  );
}

export function VerdictLegend() {
  return (
    <div className="verdict-legend" aria-label="Evidence verdicts">
      <span>
        <i className="legend-symbol legend-supported" aria-hidden="true">
          ✓
        </i>{" "}
        Checks out.
      </span>
      <span>
        <i className="legend-symbol legend-uncertain" aria-hidden="true">
          !
        </i>{" "}
        Jury’s still out.
      </span>
      <span>
        <i className="legend-symbol legend-contradicted" aria-hidden="true">
          ×
        </i>{" "}
        Spectacular miss.
      </span>
    </div>
  );
}

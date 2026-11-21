import judgeUrl from "../assets/wingman-judge.png";
import markUrl from "../assets/wingman-mark.svg";

export function BrandMark() {
  return (
    <img className="wingman-mark" src={markUrl} width="36" height="36" alt="" aria-hidden="true" />
  );
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

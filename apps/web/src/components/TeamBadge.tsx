import type { Team } from "@npl/cricket-core";

/** Team logo in a square tile; falls back to the short name when no logo is on file. */
export function TeamBadge({ team, size = 48 }: { team: Team; size?: number }) {
  if (team.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="badge" src={team.logo} alt={`${team.name} logo`} width={size} height={size} loading="lazy" decoding="async" />;
  }
  return (
    <span className="badge badge--type display" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {team.shortName}
    </span>
  );
}

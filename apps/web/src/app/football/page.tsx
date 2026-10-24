import type { Metadata } from "next";

export const metadata: Metadata = { title: "Football", description: "Premier League, Champions League, La Liga, Serie A, Bundesliga, Ligue 1, World Cup and Euros." };

/** Competitions we will cover, in the order Rohit chose. Filled from the football-data.org feed once connected. */
export const FOOTBALL = [
  { code: "PL", name: "Premier League", area: "England" },
  { code: "CL", name: "UEFA Champions League", area: "Europe" },
  { code: "PD", name: "La Liga", area: "Spain" },
  { code: "SA", name: "Serie A", area: "Italy" },
  { code: "BL1", name: "Bundesliga", area: "Germany" },
  { code: "FL1", name: "Ligue 1", area: "France" },
  { code: "WC", name: "FIFA World Cup", area: "World" },
  { code: "EC", name: "UEFA European Championship", area: "Europe" },
];

export default function Football() {
  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Tables · fixtures · results · top scorers</p>
          <h1 className="display">Football</h1>
          <p className="lead muted">Europe&rsquo;s top leagues and the big international tournaments, alongside our cricket.</p>
        </div>
      </section>
      <section className="bone section">
        <div className="wrap">
          <div className="notice" style={{ marginBottom: 32 }}>
            <strong>Connecting the football feed.</strong>
            <span className="muted">Tables, fixtures and results appear here as soon as our licensed data feed is switched on. Nothing below is placeholder data.</span>
          </div>
          <div className="comp-grid">
            {FOOTBALL.map((c) => (
              <div key={c.code} className="comp-card comp-card--soon">
                <span className="comp-short display">{c.code}</span>
                <span className="comp-name">{c.name}</span>
                <span className="label muted">{c.area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

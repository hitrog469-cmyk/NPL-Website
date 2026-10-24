/** Brand and feature switches. Rename the brand here and nowhere else. */
export const SITE = {
  name: "Sports Sathi",
  shortName: "SS",
  tagline: "Independent cricket and football statistics",
  independence: "Independent sports statistics and fan platform; not an official league or team site.",
  timezone: "Asia/Kathmandu",
  /**
   * The competition that leads the homepage. Change this when the focus moves
   * (e.g. to the IPL in April); everything else stays one tab away.
   */
  featured: { sport: "cricket", id: "npl", label: "NPL 2026", name: "Nepal Premier League" },
} as const;

/**
 * Feature flags. A flag stays off until the feature meets the exit
 * conditions: real data, responsive design, empty/error states, tests,
 * source label and a demo path.
 */
export const FLAGS = {
  nepaliLabels: false, // awaiting Rohit's review of the NE dictionary
  teams: true,
  players: false,
  liveScoring: true,
  rewind: false,
  lab: false,
  studio: false,
} as const;

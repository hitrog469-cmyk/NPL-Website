/** Brand and feature switches. Rename the brand here and nowhere else. */
export const SITE = {
  name: "NPL Data Desk",
  shortName: "NDD",
  tagline: "Independent Nepal Premier League statistics",
  independence: "Independent NPL statistics and creator platform; not an official league site.",
  timezone: "Asia/Kathmandu",
} as const;

/**
 * Feature flags. A flag stays off until the feature meets the exit
 * conditions: real data, responsive design, empty/error states, tests,
 * source label and a demo path.
 */
export const FLAGS = {
  nepaliLabels: false, // awaiting Rohit's review of the NE dictionary
  teams: false,
  players: false,
  liveScoring: false,
  rewind: false,
  lab: false,
  studio: false,
} as const;

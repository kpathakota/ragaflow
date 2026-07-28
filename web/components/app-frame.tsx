/**
 * The mobile-shaped frame for the interactive app surfaces (session player,
 * track lists, explore, profile, auth). These screens are designed as a phone
 * experience, so on desktop they stay boxed at 430px against a darker desk.
 *
 * Deliberately NOT applied to the content pages (`/`, `/landing`, `/privacy`,
 * `/terms`, `/support`) — those are public entry points people reach from a
 * search result or the App Store listing, and they lay out full-width.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return <div className="app-frame">{children}</div>;
}

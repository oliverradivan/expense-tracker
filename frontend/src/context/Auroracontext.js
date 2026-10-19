import { createContext } from 'react'

// Set by <AuroraShell>. null means "no shell mounted", so each
// <AuroraBackground> draws its own layer instead.
export const AuroraContext = createContext(null)

// Defaults to true so pages work without a swipe deck / router wrapper.
// If you ever keep several pages mounted at once, wrap each one in
// <AuroraPageActive.Provider value={isThisPageVisible}>.
export const AuroraPageActive = createContext(true)
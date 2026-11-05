import type { BriefData } from "./contracts.ts";
import type { SelectedVenue, VenueSearch } from "./venues.ts";

export function proposalVenueContext(
  brief: { version: number; data: Pick<BriefData, "venue"> },
  state: {
    selectedVenue: SelectedVenue | null;
    venueSearch: VenueSearch | null;
  },
) {
  const venue =
    state.selectedVenue?.briefVersion === brief.version
      ? state.selectedVenue
      : null;
  return {
    source: venue ? ("selected" as const) : ("brief" as const),
    location: venue
      ? `${venue.venue.name}, ${venue.venue.address}`
      : brief.data.venue,
    selectedVenueId: venue?.venue.id ?? null,
    briefVersion: brief.version,
    selectionRequired:
      !venue && state.venueSearch?.briefVersion === brief.version,
    venue,
  };
}

export function proposalLocationMatches(
  saved:
    | {
        source: "selected" | "brief";
        location: string;
        selectedVenueId: string | null;
        briefVersion: number;
      }
    | undefined,
  current: ReturnType<typeof proposalVenueContext>,
) {
  // Older snapshots remain readable/editable; their original venue provenance is unknown.
  return (
    !saved ||
    (!current.selectionRequired &&
      saved.source === current.source &&
      saved.location === current.location &&
      saved.selectedVenueId === current.selectedVenueId &&
      saved.briefVersion === current.briefVersion)
  );
}

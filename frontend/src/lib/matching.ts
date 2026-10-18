import type { Buyer, Property } from "./types";

/** Buyers may go up to this much over their stated budget. */
const BUDGET_TOLERANCE = 0.05;

export type MatchReason = { label: string; ok: boolean };

export type Match = {
  /** False when a hard requirement fails — the pair is not shown. */
  ok: boolean;
  /** Higher is better; only meaningful when ok. */
  score: number;
  /** Short reasons shown as chips (✓ ממ״ד, מעט מעל התקציב…). */
  reasons: MatchReason[];
};

type BuyerReq = Pick<
  Buyer,
  | "preferred_neighborhoods"
  | "max_budget"
  | "min_rooms"
  | "floor_min"
  | "floor_max"
  | "property_type"
  | "needs_balcony"
  | "needs_elevator"
  | "needs_safe_room"
>;

type PropertyFacts = Pick<
  Property,
  | "status"
  | "neighborhood"
  | "current_price"
  | "rooms"
  | "floor"
  | "property_type"
  | "has_balcony"
  | "has_elevator"
  | "has_safe_room"
>;

const FEATURES = [
  { need: "needs_safe_room", has: "has_safe_room", label: "ממ״ד" },
  { need: "needs_elevator", has: "has_elevator", label: "מעלית" },
  { need: "needs_balcony", has: "has_balcony", label: "מרפסת" },
] as const;

const NO_MATCH: Match = { ok: false, score: 0, reasons: [] };

/**
 * Does this property fit what this buyer is looking for?
 * Hard requirements (area, budget, rooms, floor, type, "must" features) decide `ok`;
 * "nice to have" features and price headroom raise the score.
 */
export function matchBuyerToProperty(buyer: BuyerReq, property: PropertyFacts): Match {
  if (property.status !== "active") return NO_MATCH;

  const reasons: MatchReason[] = [];
  let score = 0;

  if (buyer.preferred_neighborhoods.length > 0) {
    if (!property.neighborhood || !buyer.preferred_neighborhoods.includes(property.neighborhood)) return NO_MATCH;
    score += 2;
  }

  if (buyer.max_budget != null) {
    if (property.current_price == null) return NO_MATCH;
    const limit = buyer.max_budget * (1 + BUDGET_TOLERANCE);
    if (property.current_price > limit) return NO_MATCH;
    if (property.current_price > buyer.max_budget) {
      reasons.push({ label: "מעט מעל התקציב", ok: false });
    } else {
      // Up to 2 points for headroom under the budget.
      score += 2 * (1 - property.current_price / buyer.max_budget) + 1;
    }
  }

  if (buyer.min_rooms != null) {
    if (property.rooms == null || property.rooms < buyer.min_rooms) return NO_MATCH;
    if (property.rooms > buyer.min_rooms) score += 0.5;
  }

  if (buyer.floor_min != null || buyer.floor_max != null) {
    if (property.floor == null) return NO_MATCH;
    if (buyer.floor_min != null && property.floor < buyer.floor_min) return NO_MATCH;
    if (buyer.floor_max != null && property.floor > buyer.floor_max) return NO_MATCH;
  }

  if (buyer.property_type && property.property_type && buyer.property_type !== property.property_type) return NO_MATCH;

  for (const f of FEATURES) {
    const need = buyer[f.need];
    const has = property[f.has];
    if (need === "must") {
      if (!has) return NO_MATCH;
      reasons.push({ label: f.label, ok: true });
    } else if (need === "nice") {
      reasons.push({ label: f.label, ok: has });
      if (has) score += 1;
    }
  }

  return { ok: true, score, reasons };
}

import type { Database } from "./supabase/database.types";

type PublicSchema = Database["public"];
export type TableName = keyof PublicSchema["Tables"];
export type Row<T extends TableName> = PublicSchema["Tables"][T]["Row"];
export type Enum<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

/** commission_split is hidden from the table (admin reads it via useCommissionRates). */
export type Profile = Omit<Row<"profiles">, "commission_split">;
export type OfficeAgent = Row<"office_agents">;
export type Buyer = Row<"buyers">;
export type BuyerNote = Row<"buyer_notes">;
export type Property = Row<"properties">;
export type MarketListing = Row<"market_listings">;
export type OwnerDetails = Row<"property_owner_details">;
export type Viewing = Row<"buyer_property_viewings">;
export type Task = Row<"tasks">;
export type Notification = Row<"notifications">;
export type Transaction = Row<"financial_transactions">;
export type Candidate = Row<"candidates">;
export type Deal = Row<"deals">;

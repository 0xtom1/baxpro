import { sql } from "drizzle-orm";
import { pgTable, pgSchema, text, varchar, integer, timestamp, boolean, jsonb, serial, doublePrecision, char, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const baxusSchema = pgSchema("baxus");

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  displayName: text("display_name"),
  baxusWallet: varchar("baxus_wallet", { length: 44 }),
  smsConsent: boolean("sms_consent").default(false).notNull(),
  emailConsent: boolean("email_consent").default(false).notNull(),
  seenNotificationSetup: boolean("seen_notification_setup").default(false).notNull(),
  isVip: boolean("is_vip").default(false).notNull(),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  matchStrings: text("match_strings").array().notNull(),
  matchAll: boolean("match_all").default(false).notNull(),
  maxPrice: integer("max_price").notNull(),
  bottledYearMin: integer("bottled_year_min"),
  bottledYearMax: integer("bottled_year_max"),
  ageMin: integer("age_min"),
  ageMax: integer("age_max"),
  matchingAssetsString: varchar("matching_assets_string", { length: 200 }),
  matchingAssetsLastUpdated: timestamp("matching_assets_last_updated", { withTimezone: false }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listingsFeed = baxusSchema.table("listings_feed", {
  id: serial("id").primaryKey(),
  assetId: char("asset_id", { length: 44 }).notNull(),
  price: doublePrecision("price").notNull(),
  listedDate: timestamp("listed_date").notNull(),
  addedDate: timestamp("added_date").defaultNow().notNull(),
});

export const assets = baxusSchema.table("assets", {
  assetIdx: serial("asset_idx").primaryKey(),
  assetId: char("asset_id", { length: 44 }).notNull(),
  baxusIdx: integer("baxus_idx"),
  name: text("name").notNull(),
  price: doublePrecision("price"),
  bottledYear: integer("bottled_year"),
  age: integer("age"),
  producer: text("producer"),
  isListed: boolean("is_listed"),
  listedDate: timestamp("listed_date"),
  assetJson: jsonb("asset_json").notNull(),
  metadataJson: jsonb("metadata_json"),
  addedDate: timestamp("added_date").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  countUpdated: integer("count_updated").default(1).notNull(),
});

export const dimActivityTypes = baxusSchema.table("dim_activity_types", {
  activityTypeIdx: serial("activity_type_idx").primaryKey(),
  activityTypeCode: varchar("activity_type_code", { length: 50 }),
  activityTypeName: varchar("activity_type_name", { length: 100 }),
});

export const activityFeed = baxusSchema.table("activity_feed", {
  activityIdx: serial("activity_idx").primaryKey(),
  activityTypeIdx: integer("activity_type_idx").notNull(),
  assetIdx: integer("asset_idx").notNull(),
  price: doublePrecision("price"),
  activityDate: timestamp("activity_date").defaultNow().notNull(),
  signature: varchar("signature", { length: 89 }),
});

export const alertMatches = pgTable("alert_matches", {
  matchIdx: serial("match_idx").primaryKey(),
  alertId: varchar("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
  listingSource: varchar("listing_source", { length: 50 }).notNull(),
  activityIdx: integer("activity_idx").notNull(),
  assetIdx: integer("asset_idx").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailLogs = pgTable("email_logs", {
  emailIdx: serial("email_idx").primaryKey(),
  matchIdx: integer("match_idx"),
  userId: varchar("user_id").notNull(),
  assetIdx: integer("asset_idx").notNull(),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  responseCode: integer("response_code"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const alertAssets = pgTable("alert_assets", {
  alertId: varchar("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
  activityIdx: integer("activity_idx").notNull().references(() => activityFeed.activityIdx, { onDelete: "cascade" }),
}, (table) => [
  unique("alert_assets_alert_id_activity_idx_unique").on(table.alertId, table.activityIdx),
]);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertListingsFeedSchema = createInsertSchema(listingsFeed).omit({
  id: true,
  addedDate: true,
});

export const insertAlertMatchSchema = createInsertSchema(alertMatches).omit({
  matchIdx: true,
  createdAt: true,
});

export const insertAlertAssetSchema = createInsertSchema(alertAssets);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertListingsFeed = z.infer<typeof insertListingsFeedSchema>;
export type ListingsFeed = typeof listingsFeed.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type InsertAlertMatch = z.infer<typeof insertAlertMatchSchema>;
export type AlertMatch = typeof alertMatches.$inferSelect;
export type ActivityFeed = typeof activityFeed.$inferSelect;
export type DimActivityType = typeof dimActivityTypes.$inferSelect;
export type InsertAlertAsset = z.infer<typeof insertAlertAssetSchema>;
export type AlertAsset = typeof alertAssets.$inferSelect;

export type ActivityFeedWithDetails = {
  activityIdx: number;
  activityTypeIdx: number;
  assetIdx: number;
  price: number | null;
  activityDate: Date;
  signature: string | null;
  activityTypeName: string | null;
  activityTypeCode: string | null;
  assetName: string;
  assetId: string;
  producer: string | null;
  isListed: boolean | null;
};

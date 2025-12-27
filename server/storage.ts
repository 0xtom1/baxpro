// server/storage.ts
import { type User, type InsertUser, type Alert, type InsertAlert, type Asset, type ActivityFeedWithDetails, users, alerts, assets } from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, sql } from "drizzle-orm";

export type UpdateUser = Partial<InsertUser> & { lastLoginAt?: Date };

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User | undefined>;

  getAlertsByUserId(userId: string): Promise<Alert[]>;
  getAllAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, alert: Partial<InsertAlert>): Promise<Alert | undefined>;
  deleteAlert(id: string): Promise<boolean>;

  getAssetByAssetId(assetId: string): Promise<Asset | undefined>;
  getAssetByAssetIdx(assetIdx: number): Promise<Asset | undefined>;
  getActivityFeed(limit?: number, offset?: number): Promise<ActivityFeedWithDetails[]>;
  getActivityFeedCount(): Promise<number>;
  
  matchAlertToAssets(alertId: string): Promise<{ matched: number; matchingAssetsString: string }>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, providerId)));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, update: UpdateUser): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAlertsByUserId(userId: string): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.userId, userId));
  }

  async getAllAlerts(): Promise<Alert[]> {
    return db.select().from(alerts);
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }

  async updateAlert(id: string, update: Partial<InsertAlert>): Promise<Alert | undefined> {
    const [alert] = await db.update(alerts)
      .set(update)
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async deleteAlert(id: string): Promise<boolean> {
    const result = await db.delete(alerts).where(eq(alerts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAssetByAssetId(assetId: string): Promise<Asset | undefined> {
    // asset_id is char(44) so we need to pad the input to match
    const paddedAssetId = assetId.padEnd(44, ' ');
    const [asset] = await db.select().from(assets).where(eq(assets.assetId, paddedAssetId));
    return asset;
  }

  async getAssetByAssetIdx(assetIdx: number): Promise<Asset | undefined> {
    const result = await db.execute<any>(
      `SELECT * FROM baxus.v_assets WHERE asset_idx = ${assetIdx}`
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      assetIdx: row.asset_idx,
      assetId: row.asset_id,
      baxusIdx: row.baxus_idx,
      name: row.name,
      price: row.price,
      bottledYear: row.bottled_year,
      age: row.age,
      producer: row.producer,
      isListed: row.is_listed,
      listedDate: row.listed_date,
      assetJson: row.asset_json,
      metadataJson: row.metadata_json,
      addedDate: row.added_date,
      lastUpdated: row.last_updated,
      countUpdated: row.count_updated,
    };
  }

  async getActivityTypes(): Promise<{ activityTypeIdx: number; activityTypeCode: string; activityTypeName: string }[]> {
    const results = await db.execute<{ activity_type_idx: number; activity_type_code: string; activity_type_name: string }>(
      `SELECT activity_type_idx, activity_type_code, activity_type_name FROM baxus.dim_activity_types ORDER BY activity_type_name`
    );
    return results.rows.map((r: any) => ({
      activityTypeIdx: r.activity_type_idx,
      activityTypeCode: r.activity_type_code,
      activityTypeName: r.activity_type_name,
    }));
  }

  async getActivityFeed(limit: number = 50, offset: number = 0, activityTypeCode?: string): Promise<ActivityFeedWithDetails[]> {
    let query = `SELECT * FROM baxus.v_activity_feed`;
    if (activityTypeCode) {
      query += ` WHERE activity_type_code = '${activityTypeCode}'`;
    }
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const results = await db.execute<ActivityFeedWithDetails>(query);
    
    return results.rows.map((r: any) => ({
      activityIdx: r.activity_idx,
      activityTypeIdx: r.activity_type_idx,
      assetIdx: r.asset_idx,
      price: r.price,
      activityDate: r.activity_date,
      signature: r.signature,
      activityTypeCode: r.activity_type_code,
      activityTypeName: r.activity_type_name,
      assetId: r.asset_id ?? '',
      assetName: r.asset_name ?? 'Unknown',
      producer: r.producer,
      isListed: r.is_listed,
    }));
  }

  async getActivityFeedCount(activityTypeCode?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM baxus.v_activity_feed`;
    if (activityTypeCode) {
      query += ` WHERE activity_type_code = '${activityTypeCode}'`;
    }
    const results = await db.execute<{ count: string }>(query);
    return parseInt(results.rows[0]?.count ?? '0', 10);
  }

  async getProducers(): Promise<{ producerIdx: number; producerName: string }[]> {
    const results = await db.execute<any>(
      `SELECT producer_idx, producer_name FROM baxus.producers ORDER BY producer_name`
    );
    return results.rows.map((r: any) => ({
      producerIdx: r.producer_idx,
      producerName: r.producer_name,
    }));
  }

  async getBrandsByProducer(producerIdx: number): Promise<{ brandIdx: number; brandName: string }[]> {
    const results = await db.execute<any>(
      `SELECT brand_idx, brand_name FROM baxus.brands WHERE producer_idx = ${producerIdx} ORDER BY brand_name`
    );
    return results.rows.map((r: any) => ({
      brandIdx: r.brand_idx,
      brandName: r.brand_name,
    }));
  }

  async getSubBrandsByBrand(brandIdx: number): Promise<{ subBrandIdx: number; subBrandName: string | null }[]> {
    const results = await db.execute<any>(
      `SELECT sub_brand_idx, sub_brand_name FROM baxus.sub_brands WHERE brand_idx = ${brandIdx} ORDER BY sub_brand_name NULLS LAST`
    );
    return results.rows.map((r: any) => ({
      subBrandIdx: r.sub_brand_idx,
      subBrandName: r.sub_brand_name,
    }));
  }

  async getBrandHierarchy(producerIdx?: number, brandIdx?: number, subBrandIdx?: number): Promise<any[]> {
    let query = `
      SELECT v.*, b.reviewed_by 
      FROM baxus.v_brands v
      JOIN baxus.brands b ON v.brand_idx = b.brand_idx
      WHERE 1=1
    `;
    if (producerIdx) query += ` AND v.producer_idx = ${producerIdx}`;
    if (brandIdx) query += ` AND v.brand_idx = ${brandIdx}`;
    if (subBrandIdx) query += ` AND v.sub_brand_idx = ${subBrandIdx}`;
    query += ` ORDER BY v.producer_name, v.brand_name, v.sub_brand_name NULLS LAST`;

    const results = await db.execute<any>(query);
    return results.rows.map((r: any) => ({
      producerIdx: r.producer_idx,
      producerName: r.producer_name,
      brandIdx: r.brand_idx,
      brandName: r.brand_name,
      subBrandIdx: r.sub_brand_idx,
      subBrandName: r.sub_brand_name,
      assetCount: parseInt(r.asset_count, 10),
      reviewedBy: r.reviewed_by,
    }));
  }

  async updateBrandName(brandIdx: number, newName: string): Promise<{ success: boolean; error?: string }> {
    const checkQuery = `
      SELECT COUNT(*) as count FROM baxus.brands b1
      JOIN baxus.brands b2 ON b1.producer_idx = b2.producer_idx
      WHERE b1.brand_idx = ${brandIdx} AND b2.brand_name = '${newName.replace(/'/g, "''")}' AND b2.brand_idx != ${brandIdx}
    `;
    const checkResult = await db.execute<any>(checkQuery);
    if (parseInt(checkResult.rows[0]?.count, 10) > 0) {
      return { success: false, error: "A brand with this name already exists for this producer" };
    }
    await db.execute(`UPDATE baxus.brands SET brand_name = '${newName.replace(/'/g, "''")}' WHERE brand_idx = ${brandIdx}`);
    return { success: true };
  }

  async updateSubBrandName(subBrandIdx: number, newName: string | null): Promise<{ success: boolean; error?: string }> {
    const escapedName = newName ? `'${newName.replace(/'/g, "''")}'` : 'NULL';
    const checkQuery = `
      SELECT COUNT(*) as count FROM baxus.sub_brands sb1
      JOIN baxus.sub_brands sb2 ON sb1.brand_idx = sb2.brand_idx
      WHERE sb1.sub_brand_idx = ${subBrandIdx} 
        AND ${newName ? `sb2.sub_brand_name = ${escapedName}` : 'sb2.sub_brand_name IS NULL'}
        AND sb2.sub_brand_idx != ${subBrandIdx}
    `;
    const checkResult = await db.execute<any>(checkQuery);
    if (parseInt(checkResult.rows[0]?.count, 10) > 0) {
      return { success: false, error: "A sub-brand with this name already exists for this brand" };
    }
    await db.execute(`UPDATE baxus.sub_brands SET sub_brand_name = ${escapedName} WHERE sub_brand_idx = ${subBrandIdx}`);
    return { success: true };
  }

  async getSubBrandWithAssets(subBrandIdx: number): Promise<{ subBrand: any; assets: any[]; sharedAttributes: Record<string, any> } | null> {
    const subBrandQuery = `
      SELECT 
        sb.sub_brand_idx, sb.sub_brand_name,
        b.brand_idx, b.brand_name,
        p.producer_idx, p.producer_name
      FROM baxus.sub_brands sb
      JOIN baxus.brands b ON sb.brand_idx = b.brand_idx
      JOIN baxus.producers p ON b.producer_idx = p.producer_idx
      WHERE sb.sub_brand_idx = ${subBrandIdx}
    `;
    const subBrandResult = await db.execute<any>(subBrandQuery);
    if (subBrandResult.rows.length === 0) return null;
    
    const row = subBrandResult.rows[0];
    const subBrand = {
      subBrandIdx: row.sub_brand_idx,
      subBrandName: row.sub_brand_name,
      brandIdx: row.brand_idx,
      brandName: row.brand_name,
      producerIdx: row.producer_idx,
      producerName: row.producer_name,
    };

    const assetsQuery = `
      SELECT bottle_name, bottle_age, bottled_year, asset_count
      FROM baxus.v_bottle_releases_assets
      WHERE sub_brand_idx = ${subBrandIdx}
      ORDER BY bottle_name
    `;
    const assetsResult = await db.execute<any>(assetsQuery);
    const assets = assetsResult.rows.map((r: any) => ({
      name: r.bottle_name,
      age: r.bottle_age,
      bottledYear: r.bottled_year,
      assetCount: parseInt(r.asset_count, 10),
    }));

    const sharedAttrsQuery = `
      SELECT key, value
      FROM baxus.v_bottle_releases_shared_sub_brand_attributes
      WHERE sub_brand_idx = ${subBrandIdx}
      ORDER BY key
    `;
    const sharedAttrsResult = await db.execute<any>(sharedAttrsQuery);
    const sharedAttributes: Record<string, any> = {};
    for (const r of sharedAttrsResult.rows) {
      let val = r.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch {}
      }
      sharedAttributes[r.key] = val;
    }

    return { subBrand, assets, sharedAttributes };
  }

  async getBrandWithSubBrands(brandIdx: number): Promise<{ brand: any; subBrands: any[]; allSubBrands: any[]; sharedAttributes: Record<string, any> } | null> {
    const brandQuery = `
      SELECT 
        b.brand_idx, b.brand_name,
        b.reviewed_by, b.reviewed_at,
        p.producer_idx, p.producer_name
      FROM baxus.brands b
      JOIN baxus.producers p ON b.producer_idx = p.producer_idx
      WHERE b.brand_idx = ${brandIdx}
    `;
    const brandResult = await db.execute<any>(brandQuery);
    if (brandResult.rows.length === 0) return null;
    
    const row = brandResult.rows[0];
    const brand = {
      brandIdx: row.brand_idx,
      brandName: row.brand_name,
      producerIdx: row.producer_idx,
      producerName: row.producer_name,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
    };

    // Sub-brands with assets (INNER JOIN to filter out zero-asset sub-brands)
    const subBrandsQuery = `
      SELECT sb.sub_brand_idx, sb.sub_brand_name, v.asset_count
      FROM baxus.sub_brands sb
      INNER JOIN (
        SELECT sub_brand_idx, SUM(asset_count) as asset_count
        FROM baxus.v_bottle_releases_assets
        GROUP BY sub_brand_idx
      ) v ON v.sub_brand_idx = sb.sub_brand_idx
      WHERE sb.brand_idx = ${brandIdx}
      ORDER BY sb.sub_brand_name
    `;
    const subBrandsResult = await db.execute<any>(subBrandsQuery);
    const subBrands = subBrandsResult.rows.map((r: any) => ({
      subBrandIdx: r.sub_brand_idx,
      subBrandName: r.sub_brand_name,
      assetCount: parseInt(r.asset_count, 10),
    }));

    // All sub-brands including those with zero assets (for move dialog)
    const allSubBrandsQuery = `
      SELECT sb.sub_brand_idx, sb.sub_brand_name, COALESCE(v.asset_count, 0) as asset_count
      FROM baxus.sub_brands sb
      LEFT JOIN (
        SELECT sub_brand_idx, SUM(asset_count) as asset_count
        FROM baxus.v_bottle_releases_assets
        GROUP BY sub_brand_idx
      ) v ON v.sub_brand_idx = sb.sub_brand_idx
      WHERE sb.brand_idx = ${brandIdx}
      ORDER BY sb.sub_brand_name
    `;
    const allSubBrandsResult = await db.execute<any>(allSubBrandsQuery);
    const allSubBrands = allSubBrandsResult.rows.map((r: any) => ({
      subBrandIdx: r.sub_brand_idx,
      subBrandName: r.sub_brand_name,
      assetCount: parseInt(r.asset_count, 10),
    }));

    const sharedAttrsQuery = `
      SELECT key, value
      FROM baxus.v_bottle_releases_shared_brand_attributes
      WHERE brand_idx = ${brandIdx}
      ORDER BY key
    `;
    const sharedAttrsResult = await db.execute<any>(sharedAttrsQuery);
    const sharedAttributes: Record<string, any> = {};
    for (const r of sharedAttrsResult.rows) {
      let val = r.value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch {}
      }
      sharedAttributes[r.key] = val;
    }

    return { brand, subBrands, allSubBrands, sharedAttributes };
  }

  async moveBottlesToSubBrand(fromSubBrandIdx: number, toSubBrandIdx: number): Promise<number> {
    const query = `
      UPDATE baxus.bottle_releases
      SET sub_brand_idx = ${toSubBrandIdx}
      WHERE sub_brand_idx = ${fromSubBrandIdx}
    `;
    const result = await db.execute<any>(query);
    return result.rowCount || 0;
  }

  async setBrandReviewStatus(brandIdx: number, reviewedBy: string | null): Promise<void> {
    if (reviewedBy) {
      const escapedName = reviewedBy.replace(/'/g, "''");
      await db.execute(`UPDATE baxus.brands SET reviewed_by = '${escapedName}', reviewed_at = NOW() WHERE brand_idx = ${brandIdx}`);
    } else {
      await db.execute(`UPDATE baxus.brands SET reviewed_by = NULL, reviewed_at = NULL WHERE brand_idx = ${brandIdx}`);
    }
  }

  async matchAlertToAssets(alertId: string): Promise<{ matched: number; matchingAssetsString: string }> {
    // Get the alert details
    const alert = await this.getAlert(alertId);
    if (!alert) {
      return { matched: 0, matchingAssetsString: '' };
    }

    // Helper to build conditions and params for a given starting param index
    const buildConditions = (startIndex: number): { conditions: string[]; params: any[]; nextIndex: number } => {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = startIndex;

      // Price filter uses activity_feed price (use explicit null check to allow 0 as valid value)
      if (alert.maxPrice !== null && alert.maxPrice !== undefined) {
        conditions.push(`af.price <= $${paramIndex}`);
        params.push(alert.maxPrice);
        paramIndex++;
      }

      // Bottled year filter
      if (alert.bottledYearMin !== null && alert.bottledYearMax !== null) {
        conditions.push(`a.bottled_year BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(alert.bottledYearMin, alert.bottledYearMax);
        paramIndex += 2;
      } else if (alert.bottledYearMin !== null) {
        conditions.push(`a.bottled_year >= $${paramIndex}`);
        params.push(alert.bottledYearMin);
        paramIndex++;
      } else if (alert.bottledYearMax !== null) {
        conditions.push(`a.bottled_year <= $${paramIndex}`);
        params.push(alert.bottledYearMax);
        paramIndex++;
      }

      // Age filter
      if (alert.ageMin !== null && alert.ageMax !== null) {
        conditions.push(`a.age BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(alert.ageMin, alert.ageMax);
        paramIndex += 2;
      } else if (alert.ageMin !== null) {
        conditions.push(`a.age >= $${paramIndex}`);
        params.push(alert.ageMin);
        paramIndex++;
      } else if (alert.ageMax !== null) {
        conditions.push(`a.age <= $${paramIndex}`);
        params.push(alert.ageMax);
        paramIndex++;
      }

      // Match strings filter (name matching) using parameterized LIKE
      // Strip special characters (commas, apostrophes, etc.) from both sides for comparison
      if (alert.matchStrings && alert.matchStrings.length > 0) {
        const likeConditions: string[] = [];
        for (const s of alert.matchStrings) {
          // Remove special characters from search string before passing as parameter
          const normalizedSearch = s.replace(/[^a-zA-Z0-9\s]/g, '');
          // Compare normalized asset name against normalized search string
          likeConditions.push(`LOWER(REGEXP_REPLACE(a.name, '[^a-zA-Z0-9\\s]', '', 'g')) LIKE LOWER($${paramIndex})`);
          params.push(`%${normalizedSearch}%`);
          paramIndex++;
        }
        
        if (alert.matchAll) {
          conditions.push(`(${likeConditions.join(' AND ')})`);
        } else {
          conditions.push(`(${likeConditions.join(' OR ')})`);
        }
      }

      // Only match activity records with price
      conditions.push(`af.price IS NOT NULL`);

      return { conditions, params, nextIndex: paramIndex };
    };

    // Use a transaction to ensure atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing matches for this alert
      await client.query('DELETE FROM alert_assets WHERE alert_id = $1', [alertId]);

      // Build conditions for INSERT query (starts at $2, $1 is alertId)
      const insertBuild = buildConditions(2);
      const insertWhereClause = insertBuild.conditions.length > 0 ? `WHERE ${insertBuild.conditions.join(' AND ')}` : '';
      const insertParams = [alertId, ...insertBuild.params];

      // Insert matching activity records with parameterized query
      // Join to dim_activity_types to filter for NEW_LISTING activity type
      const insertQuery = `
        INSERT INTO alert_assets (alert_id, activity_idx)
        SELECT $1, af.activity_idx
        FROM baxus.assets a
        JOIN baxus.activity_feed af ON af.asset_idx = a.asset_idx
        JOIN baxus.dim_activity_types dat ON dat.activity_type_idx = af.activity_type_idx
          AND dat.activity_type_code = 'NEW_LISTING'
        ${insertWhereClause}
        ON CONFLICT DO NOTHING
      `;

      const insertResult = await client.query(insertQuery, insertParams);
      const matched = insertResult.rowCount || 0;

      // Build matching assets string with time range
      // Oldest listing date in activity feed is June 25, 2025 (hardcoded for performance)
      let matchingAssetsString = 'No matches';
      if (matched > 0) {
        const now = new Date();
        const oldest = new Date('2025-06-25');
        const monthsDiff = Math.max(1, Math.ceil((now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        matchingAssetsString = `${matched} match${matched === 1 ? '' : 'es'} in the last ${monthsDiff} month${monthsDiff === 1 ? '' : 's'}`;
      }

      // Update the alert with the matching info
      await client.query(
        'UPDATE alerts SET matching_assets_string = $1, matching_assets_last_updated = $2 WHERE id = $3',
        [matchingAssetsString.substring(0, 200), new Date(), alertId]
      );

      await client.query('COMMIT');

      return { matched, matchingAssetsString };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const storage = new DbStorage();
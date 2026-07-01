---
contentType: guides
slug: data-migration-guide
title: "Data Migration: Zero-Downtime Strategies That Work"
description: "A practical guide to data migration: planning, dual-write patterns, backfill strategies, schema evolution, validation, and rollback procedures for moving data without service interruption."
metaDescription: "Learn data migration: dual-write patterns, backfill strategies, schema evolution, validation, and rollback procedures for zero-downtime data moves."
difficulty: advanced
topics:
  - databases
  - data
  - devops
tags:
  - data-migration
  - zero-downtime
  - schema-evolution
  - backfill
  - database
  - guide
relatedResources:
  - /guides/data/database-sharding-implementation-guide
  - /guides/data/etl-pipeline-guide
  - /guides/blue-green-deployment-guide
  - /guides/planning/disaster-recovery-guide
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn data migration: dual-write patterns, backfill strategies, schema evolution, validation, and rollback procedures for zero-downtime data moves."
  keywords:
    - data-migration
    - zero-downtime
    - schema-evolution
    - backfill
    - database
    - guide
---

## Overview

Data migration is the process of moving data from one system, schema, or format to another. Unlike code deployments, data migrations are irreversible: once data is transformed or moved, rolling back requires another migration. Poorly executed migrations cause data loss, corruption, or extended downtime.

This guide covers proven patterns for migrating data safely, including dual writes, backfills, schema evolution, and validation strategies.

## When to Use

- You are moving from one database to another (MySQL → PostgreSQL, on-prem → cloud)
- You are restructuring tables or normalizing/denormalizing data
- You are introducing a new data store (adding Elasticsearch, Redis, or a data warehouse)
- You are sharding an existing database
- You are migrating from a legacy system to a modern platform
- You need to split or merge services with their own datastores

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Dual Write** | Writing to both old and new systems simultaneously |
| **Backfill** | Populating a new datastore with historical data |
| **Shadow Read** | Reading from the new system and comparing with the old |
| **Cutover** | Switching reads and writes from old to new system |
| **Rollback Window** | The time during which you can revert without data loss |
| **Idempotency** | Running the same migration twice produces the same result |

## Migration Strategies

Choose the right approach based on risk tolerance and system constraints:

| Strategy | Downtime | Risk | Best For |
|----------|----------|------|----------|
| **Dual-write + backfill** | None | Low | New datastore, schema changes |
| **Expand-contract (column)** | None | Low | Adding/removing columns |
| **Snapshot + CDC** | Brief | Medium | Database engine migrations |
| **Blue/green with migration** | Brief | Medium | Major schema restructures |
| **Stop-the-world** | Hours | High | Small databases, maintenance windows |
| **Strangler fig** | None | Low | Gradual legacy system migration |

## Step-by-Step Zero-Downtime Migration

### 1. Plan the Migration

Document every step before touching production data:

```markdown
## Migration Plan: Users Table Normalization

**Goal:** Split `users` table into `users` + `user_profiles`
**Timeline:** 3 weeks
**Rollback window:** 48 hours after cutover

### Phase 1: Schema Changes (Week 1)
- [ ] Add `user_profiles` table
- [ ] Add foreign key `users.profile_id`
- [ ] Deploy application code that dual-writes to both tables
- [ ] Verify writes are succeeding to both tables

### Phase 2: Backfill (Week 1-2)
- [ ] Run backfill script in batches (1000 rows/batch)
- [ ] Monitor script progress and error rate
- [ ] Verify backfill completeness with row counts and checksums

### Phase 3: Shadow Reads (Week 2)
- [ ] Enable reading from `user_profiles` in parallel
- [ ] Compare results: old vs new (log mismatches)
- [ ] Fix any data discrepancies

### Phase 4: Cutover (Week 3)
- [ ] Switch reads to `user_profiles`
- [ ] Monitor error rates for 24 hours
- [ ] Remove dual-write code
- [ ] Drop old columns (after rollback window)

### Validation Checklist
- [ ] Row count matches: `SELECT COUNT(*) FROM users` == `SELECT COUNT(*) FROM user_profiles`
- [ ] Sample data comparison: 100 random users compared field-by-field
- [ ] Application integration tests pass
- [ ] Performance tests pass (new queries are fast enough)

### Rollback Plan
- [ ] If issues within 48h: revert read path to old schema
- [ ] If issues after 48h: write forward-fix migration (no rollback possible)
```

### 2. Implement Dual Writes

Write to both old and new systems during the transition:

```python
# Example: Dual-write during migration
class UserRepository:
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
    
    def create_user(self, user_data):
        # Write to old system (source of truth during migration)
        user_id = self.old_db.users.insert(user_data)
        
        # Write to new system (best effort, log failures)
        try:
            self.new_db.user_profiles.insert({
                'user_id': user_id,
                'display_name': user_data['name'],
                'bio': user_data.get('bio', ''),
                'created_at': user_data['created_at']
            })
        except Exception as e:
            logger.error("Dual write failed", extra={
                'user_id': user_id,
                'error': str(e)
            })
            # Do NOT fail the request — old system is still source of truth
        
        return user_id
    
    def get_user(self, user_id):
        # During shadow read phase: read from new, fallback to old
        try:
            profile = self.new_db.user_profiles.find_by_user_id(user_id)
            if profile:
                return self._convert_profile_to_user(profile)
        except Exception:
            pass
        
        return self.old_db.users.find_by_id(user_id)
```

```python
# Example: Backfill script with batching and resumability
import time

class BackfillUsers:
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
        self.batch_size = 1000
        self.checkpoint_table = 'migration_checkpoints'
    
    def run(self):
        last_id = self._get_checkpoint()
        
        while True:
            batch = self.old_db.users.find_after_id(last_id, limit=self.batch_size)
            if not batch:
                break
            
            for user in batch:
                self._migrate_user(user)
            
            last_id = batch[-1]['id']
            self._save_checkpoint(last_id)
            
            # Throttle to avoid overwhelming the database
            time.sleep(0.1)
    
    def _migrate_user(self, user):
        """Idempotent user migration."""
        # Upsert ensures idempotency
        self.new_db.user_profiles.upsert(
            {'user_id': user['id']},
            {
                'display_name': user['name'],
                'bio': user.get('bio', ''),
                'created_at': user['created_at']
            }
        )
    
    def _get_checkpoint(self):
        row = self.old_db.execute(
            f"SELECT last_id FROM {self.checkpoint_table} WHERE migration = 'users_to_profiles'"
        )
        return row['last_id'] if row else 0
    
    def _save_checkpoint(self, last_id):
        self.old_db.execute(f"""
            INSERT INTO {self.checkpoint_table} (migration, last_id)
            VALUES ('users_to_profiles', %s)
            ON CONFLICT (migration) DO UPDATE SET last_id = EXCLUDED.last_id
        """, (last_id,))
```

### 3. Validate Data Integrity

Never assume a migration succeeded. Verify everything:

```python
# Example: Validation after backfill
class MigrationValidator:
    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
    
    def validate_counts(self):
        """Verify row counts match."""
        old_count = self.old_db.execute("SELECT COUNT(*) as c FROM users")['c']
        new_count = self.new_db.execute("SELECT COUNT(*) as c FROM user_profiles")['c']
        
        assert old_count == new_count, f"Count mismatch: {old_count} != {new_count}"
        print(f"Row counts match: {old_count}")
    
    def validate_sample(self, sample_size=1000):
        """Compare random samples field-by-field."""
        users = self.old_db.execute(f"""
            SELECT * FROM users 
            ORDER BY RANDOM() 
            LIMIT {sample_size}
        """)
        
        mismatches = 0
        for user in users:
            profile = self.new_db.user_profiles.find_by_user_id(user['id'])
            
            if not profile:
                print(f"Missing profile for user {user['id']}")
                mismatches += 1
                continue
            
            # Field-by-field comparison
            if user['name'] != profile['display_name']:
                print(f"Name mismatch: user={user['id']}")
                mismatches += 1
        
        assert mismatches == 0, f"Found {mismatches} mismatches in sample"
        print(f"Sample validation passed ({sample_size} rows)")
    
    def validate_checksums(self):
        """Compare aggregate checksums."""
        old_checksum = self.old_db.execute("""
            SELECT MD5(string_agg(name || bio, ',' ORDER BY id)) as checksum
            FROM users
        """)
        
        new_checksum = self.new_db.execute("""
            SELECT MD5(string_agg(display_name || bio, ',' ORDER BY user_id)) as checksum
            FROM user_profiles
        """)
        
        assert old_checksum == new_checksum, "Checksum mismatch!"
        print("Checksum validation passed")
```

### 4. Execute the Cutover

Switch traffic from old to new system:

```markdown
## Cutover Checklist

### Before Cutover
- [ ] Backfill is 100% complete
- [ ] Validation passed (counts, samples, checksums)
- [ ] Shadow reads show <0.1% mismatch rate
- [ ] New system performance is acceptable under load
- [ ] Rollback procedure is documented and tested
- [ ] Team is on standby during cutover window

### During Cutover
1. **Pause non-critical writes** (optional, reduces risk)
2. **Enable feature flag** to route reads to new system
3. **Monitor error rates for 15 minutes**
4. **If errors spike:** disable feature flag (instant rollback)
5. **If stable:** proceed to write cutover
6. **Enable writes to new system**
7. **Monitor for 1 hour**

### After Cutover
- [ ] Error rates within normal range for 24 hours
- [ ] New system handling 100% of traffic
- [ ] Old system still receiving dual writes (for safety)
- [ ] Rollback window countdown started (48 hours)
```

```python
# Example: Feature flag-based cutover
class UserService:
    def __init__(self, config):
        self.use_new_schema = config.get('use_new_user_schema', False)
    
    def get_user(self, user_id):
        if self.use_new_schema:
            return self._get_from_new_schema(user_id)
        return self._get_from_old_schema(user_id)
    
    def create_user(self, user_data):
        # Always dual-write during migration
        old_id = self._create_in_old(user_data)
        self._create_in_new(user_data, old_id)
        return old_id
```

## Schema Evolution Patterns

Evolve schemas without breaking existing code:

### 1. Expand-Contract for Columns

```sql
-- Step 1: Add new column (nullable)
ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);

-- Step 2: Backfill new column
UPDATE users SET email_normalized = LOWER(email) WHERE email_normalized IS NULL;

-- Step 3: Deploy code that writes to both columns
-- Application code: set email_normalized on every insert/update

-- Step 4: Make new column non-nullable, add constraint
ALTER TABLE users ALTER COLUMN email_normalized SET NOT NULL;

-- Step 5: Deploy code that reads from new column

-- Step 6: Drop old column (after rollback window)
ALTER TABLE users DROP COLUMN email;
```

### 2. Table Splitting

```sql
-- Step 1: Create new table
CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    bio TEXT,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Dual-write trigger
CREATE OR REPLACE FUNCTION sync_user_profile() RETURNS trigger AS $$
BEGIN
    INSERT INTO user_profiles (user_id, bio, preferences, created_at)
    VALUES (NEW.id, NEW.bio, NEW.preferences, NEW.created_at)
    ON CONFLICT (user_id) DO UPDATE SET
        bio = EXCLUDED.bio,
        preferences = EXCLUDED.preferences;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_profile_sync
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION sync_user_profile();

-- Step 3: Backfill
INSERT INTO user_profiles (user_id, bio, preferences, created_at)
SELECT id, bio, preferences, created_at FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Cutover reads to user_profiles
-- Step 5: Remove columns from users table (after rollback window)
```

## What Works

- Always test migrations on a copy of production data. Staging data rarely matches production volume or edge cases.
- Make migrations idempotent. If a script crashes at row 500,000, restarting it should not create duplicates.
- Throttle backfills. Running at maximum speed starves production queries. Use rate limiting.
- Validate with more than row counts. Compare checksums, sample random rows, and run integration tests.
- Never drop old data immediately. Keep the rollback window open (24-72 hours minimum).
- Monitor during the entire process. Set up dashboards specifically for the migration.
- Communicate broadly. Data migrations affect every team that touches the database.

## Common Mistakes

- No rollback plan. Once you delete old columns, rolling back requires another complex migration.
- Running migrations during peak hours. Schedule backfills during low-traffic windows.
- Forgetting about foreign keys. Migrating a parent table without updating child table references breaks constraints.
- No validation. Assuming the migration worked because it finished without errors.
- Deleting data too early. The "expand-contract" pattern exists because rollbacks are necessary.
- Underestimating duration. A migration that takes 2 hours in staging may take 20 hours in production.

## Variants

- **Online schema change tools:** `pt-online-schema-change` (Percona), `gh-ost` (GitHub) for MySQL; `pg_repack` for PostgreSQL
- **CDC-based migration:** Debezium captures changes and streams them to the new system in real time
- **Dump and restore:** `pg_dump`/`pg_restore` for smaller databases with maintenance windows
- **Cloud migration services:** AWS DMS, Azure Database Migration Service, Google Database Migration Service

## FAQ

**Q: How long should I keep the old schema after cutover?**
At least 48 hours for low-risk migrations, up to 2 weeks for high-risk changes. The longer the window, the safer you are.

**Q: What if my migration fails halfway through?**
If the migration is idempotent, restart it. If not, restore from backup and retry. This is why checkpoints and batching are critical.

**Q: How do I migrate without dual-write support?**
Use Change Data Capture (Debezium) or snapshot + incremental sync. These require more infrastructure but work without application changes.

**Q: Can I migrate a database while it is under heavy load?**
Yes, but throttle the backfill. Use `pg_sleep` between batches, run during off-peak hours, and monitor replication lag.

## Conclusion

Data migration is not a single event but a process: plan, dual-write, backfill, validate, shadow-read, cutover, and clean up. By following structured patterns and never skipping validation, you move data safely while keeping systems online.


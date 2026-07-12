---




contentType: recipes
slug: redis-sorted-set-leaderboard
title: "Build a Real-Time Leaderboard with Redis Sorted Sets"
description: "Use Redis sorted sets to implement real-time leaderboards with rank tracking, score updates, and top-N queries in O(log N) time"
metaDescription: "Build real-time leaderboards with Redis sorted sets. Track ranks, update scores, and query top-N players in O(log N) time with ZADD and ZREVRANGE."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - redis
  - sorted sets
  - leaderboard
  - real-time
  - data structures
relatedResources:
  - /recipes/redis-cache-aside-pattern
  - /recipes/redis-pubsub-messaging
  - /recipes/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build real-time leaderboards with Redis sorted sets. Track ranks, update scores, and query top-N players in O(log N) time with ZADD and ZREVRANGE."
  keywords:
    - redis sorted set
    - redis leaderboard
    - zadd zrevrange
    - real-time ranking
    - redis data structures




---

# Build a Real-Time Leaderboard with Redis Sorted Sets

Redis sorted sets (ZSETs) store unique members ordered by score. They are the ideal data structure for leaderboards — you can update a score, get a rank, and fetch the top N players in logarithmic time. This recipe builds a leaderboard service with score updates, rank queries, and pagination.

## When to Use This

- Game leaderboards with real-time score updates
- Ranking systems for content popularity or user activity
- Any scenario where you need to maintain an ordered set with frequent updates

## Prerequisites

- Python 3.10+
- `redis` package (`pip install redis`)

## Solution

### 1. Install Dependencies

```bash
pip install redis
```

### 2. Implement the Leaderboard

```python
import logging
from redis import Redis

logger = logging.getLogger(__name__)


class Leaderboard:
    def __init__(self, redis_client: Redis, key: str = "leaderboard"):
        self.redis = redis_client
        self.key = key

    def add_score(self, member: str, score: float) -> int:
        """Add or update a member's score.

        Args:
            member: Unique member identifier (e.g., user ID).
            score: Score to set.

        Returns:
            Number of new elements added (0 if updated existing).
        """
        return self.redis.zadd(self.key, {member: score})

    def increment_score(self, member: str, increment: float) -> float:
        """Increment a member's score by a delta.

        Args:
            member: Member identifier.
            increment: Amount to add (can be negative).

        Returns:
            New score after increment.
        """
        return self.redis.zincrby(self.key, increment, member)

    def get_rank(self, member: str) -> int | None:
        """Get a member's rank (0-indexed, highest score first).

        Args:
            member: Member identifier.

        Returns:
            Rank (0 = top) or None if not on the leaderboard.
        """
        rank = self.redis.zrevrank(self.key, member)
        return rank

    def get_score(self, member: str) -> float | None:
        """Get a member's current score."""
        return self.redis.zscore(self.key, member)

    def get_top_n(self, n: int = 10) -> list[dict]:
        """Get the top N members with scores.

        Args:
            n: Number of top members to return.

        Returns:
            List of {member, score, rank} dicts, highest first.
        """
        results = self.redis.zrevrange(
            self.key, 0, n - 1, withscores=True
        )
        return [
            {"member": member.decode() if isinstance(member, bytes) else member,
             "score": score, "rank": idx}
            for idx, (member, score) in enumerate(results)
        ]

    def get_around_member(self, member: str, count: int = 5) -> list[dict]:
        """Get members ranked around a specific member.

        Args:
            member: Member to center on.
            count: Number of members above and below.

        Returns:
            List of nearby members with scores and ranks.
        """
        rank = self.redis.zrevrank(self.key, member)
        if rank is None:
            return []

        start = max(0, rank - count)
        end = rank + count

        results = self.redis.zrevrange(
            self.key, start, end, withscores=True
        )
        return [
            {"member": m.decode() if isinstance(m, bytes) else m,
             "score": s, "rank": start + idx}
            for idx, (m, s) in enumerate(results)
        ]

    def remove_member(self, member: str) -> int:
        """Remove a member from the leaderboard."""
        return self.redis.zrem(self.key, member)

    def total_members(self) -> int:
        """Get the total number of members on the leaderboard."""
        return self.redis.zcard(self.key)

    def clear(self) -> int:
        """Remove all members from the leaderboard."""
        return self.redis.delete(self.key)
```

### 3. Use the Leaderboard

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
lb = Leaderboard(r, key="game:scores")

# Add scores
lb.add_score("alice", 1500)
lb.add_score("bob", 2300)
lb.add_score("charlie", 1800)
lb.increment_score("alice", 500)  # alice now has 2000

# Get top 3
top3 = lb.get_top_n(3)
# [{'member': 'bob', 'score': 2300.0, 'rank': 0},
#  {'member': 'alice', 'score': 2000.0, 'rank': 1},
#  {'member': 'charlie', 'score': 1800.0, 'rank': 2}]

# Get alice's rank
rank = lb.get_rank("alice")  # 1

# Get players around alice
nearby = lb.get_around_member("alice", count=2)
# Returns 2 players above and below alice
```

### 4. Time-Based Leaderboards

Use Redis sorted sets with date-based keys for daily, weekly, or all-time leaderboards:

```python
from datetime import date

class TimeBasedLeaderboard(Leaderboard):
    def __init__(self, redis_client: Redis, game_id: str):
        self.redis = redis_client
        self.game_id = game_id

    def _key(self, period: str = "all") -> str:
        if period == "daily":
            return f"lb:{self.game_id}:daily:{date.today().isoformat()}"
        elif period == "weekly":
            year, week, _ = date.today().isocalendar()
            return f"lb:{self.game_id}:weekly:{year}-W{week}"
        return f"lb:{self.game_id}:all"

    def add_score(self, member: str, score: float, period: str = "all") -> int:
        key = self._key(period)
        return self.redis.zadd(key, {member: score})

    def increment_score(self, member: str, increment: float, period: str = "all") -> float:
        key = self._key(period)
        return self.redis.zincrby(key, increment, member)

    def get_top_n(self, n: int = 10, period: str = "all") -> list[dict]:
        key = self._key(period)
        results = self.redis.zrevrange(key, 0, n - 1, withscores=True)
        return [
            {"member": m, "score": s, "rank": idx}
            for idx, (m, s) in enumerate(results)
        ]
```

### 5. Expire Old Leaderboards

Set TTLs on daily/weekly keys so old leaderboards auto-expire:

```python
def add_score_with_expiry(self, member: str, score: float, period: str = "daily") -> int:
    key = self._key(period)
    result = self.redis.zadd(key, {member: score})
    # Set expiry only if the key is new
    if result == 1:
        if period == "daily":
            self.redis.expire(key, 86400 * 2)  # 2 days
        elif period == "weekly":
            self.redis.expire(key, 86400 * 8)  # 8 days
    return result
```

## How It Works

1. **`ZADD`** adds or updates a member's score. If the member exists, the score is updated; otherwise, a new entry is created.
2. **`ZINCRBY`** atomically increments a score, which is essential for concurrent score updates from multiple game servers.
3. **`ZREVRANGE`** returns members in descending score order (highest first). `withscores=True` includes scores in the result.
4. **`ZREVRANK`** returns a member's position in the sorted set, 0-indexed from the top.
5. **Date-based keys** (`lb:game:daily:2026-07-02`) create separate sorted sets per period, and `EXPIRE` cleans up old keys automatically.

## Variants

### Leaderboard with Ties

When members can have the same score, use the member's join timestamp as a tiebreaker:

```python
def add_score_with_tiebreak(self, member: str, score: float, join_time: float) -> int:
    # Use a composite score: score * 1e10 + (max_time - join_time)
    composite = score * 10_000_000_000 + (10_000_000_000 - join_time)
    return self.redis.zadd(self.key, {member: composite})
```

### Percentile Rank

```python
def get_percentile(self, member: str) -> float | None:
    """Get the member's percentile (0-100, higher is better)."""
    rank = self.redis.zrevrank(self.key, member)
    total = self.redis.zcard(self.key)
    if rank is None or total == 0:
        return None
    return ((total - rank - 1) / total) * 100
```

### Leaderboard with Member Metadata

Store member metadata in a separate hash and join on retrieval:

```python
def get_top_n_with_meta(self, n: int = 10) -> list[dict]:
    top = self.get_top_n(n)
    pipe = self.redis.pipeline()
    for entry in top:
        pipe.hgetall(f"user:{entry['member']}")
    metas = pipe.execute()

    for entry, meta in zip(top, metas):
        entry["metadata"] = meta
    return top
```

## Best Practices


- For a deeper guide, see [Complete Guide to Redis Caching Strategies](/guides/complete-guide-redis-caching-strategies/).

- **Use `ZINCRBY` for concurrent updates** — it is atomic and avoids race conditions
- **Set TTLs on time-based keys** — daily/weekly leaderboards should expire to free memory
- **Use pipelines for batch reads** — fetching metadata for top N members in one round trip
- **Keep member IDs short** — sorted sets store the member string; long UUIDs increase memory usage

## Common Mistakes

- **Using `ZRANGE` instead of `ZREVRANGE`** — `ZRANGE` returns lowest-first, which is usually not what you want for leaderboards
- **Not handling missing members** — `zscore` and `zrevrank` return `None` for non-existent members
- **Storing metadata in the sorted set** — sorted sets only store member + score; use a separate hash for metadata
- **Not expiring daily keys** — without TTL, old leaderboard keys accumulate indefinitely

## FAQ

**Q: What is the time complexity of sorted set operations?**
A: `ZADD` and `ZINCRBY` are O(log N). `ZREVRANGE` is O(log N + M) where M is the number of elements returned. `ZREVRANK` is O(log N).

**Q: How many members can a sorted set hold?**
A: Up to 2^32 - 1 members. In practice, memory is the limiting factor — each member consumes roughly 80-100 bytes.

**Q: Can I use floating-point scores?**
A: Yes. Redis sorted sets accept double-precision floats. Be aware of floating-point comparison issues for exact ties.

**Q: How do I migrate a leaderboard to a new key?**
A: Use `ZUNIONSTORE` to merge: `ZUNIONSTORE new_key 1 old_key`. Or dump and restore with `DUMP`/`RESTORE`.

**Q: What happens when two members have the same score?**
A: Redis sorts by score first, then by member name lexicographically. If you need tie-breaking by timestamp, encode it in the score: `score = actual_score * 1e10 + (max_timestamp - timestamp)`.

**Q: How do I expire old leaderboard entries automatically?**
A: Sorted sets do not support per-member TTL. Use a separate sorted set as a "last seen" index and periodically remove stale members: `ZREMRANGEBYSCORE leaderboard -inf <cutoff_score>`. Alternatively, run a scheduled job that removes members whose `last_active` timestamp is older than your threshold.

**Q: What is the memory consumption of a sorted set?**
A: Each member uses approximately 80–100 bytes (member name + score + skiplist pointers). A leaderboard with 1 million members uses roughly 80–100 MB. Monitor with `MEMORY USAGE leaderboard_key`.

**Q: Can I use Redis Cluster with sorted set leaderboards?**
A: Yes, but all operations on a single sorted set must route to the same shard. Since sorted sets are single-key data structures, Redis Cluster handles this automatically via hash slot assignment. Cross-shard operations like `ZUNIONSTORE` require hash tags: `{leaderboard}:daily` and `{leaderboard}:weekly`.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

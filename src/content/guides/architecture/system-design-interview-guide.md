---





contentType: guides
slug: system-design-interview-guide
title: "System Design Interview Guide: Key Concepts"
description: "A practical guide to system design interviews: scalability, databases, caching, load balancing, microservices, and how to structure your answer."
metaDescription: "System design interview guide: scalability, databases, caching, load balancing, microservices. Learn to structure answers for tech interviews."
difficulty: advanced
topics:
  - architecture
  - performance
tags:
  - architecture
  - distributed-systems
  - guide
  - performance
  - scalability
relatedResources:
  - /guides/software-architecture-guide
  - /guides/kubernetes-basics-guide
  - /patterns/cache-aside-pattern
  - /recipes/microservices-communication
  - /recipes/retry-backoff
  - /recipes/workflow-engine
  - /recipes/cdn-edge-caching
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "System design interview guide: scalability, databases, caching, load balancing, microservices. Learn to structure answers for tech interviews."
  keywords:
    - system design interview
    - system design guide
    - distributed systems interview
    - scalability interview questions
    - design twitter
    - design url shortener





---

# System Design Interview Guide

## Introduction

System design interviews evaluate your ability to architect growth-ready, reliable, and maintainable systems. Unlike coding interviews, there is no single correct answer. The goal is to demonstrate structured thinking, trade-off analysis, and depth of technical knowledge.

## Interview Structure

A strong answer follows a 4S framework:

### 1. Scope (2-3 minutes)

Clarify requirements before designing:

#### Functional Requirements

- What capabilities must the system support?
- What are the core use cases?

#### Non-Functional Requirements

- Scale: How many users? Requests per second?
- Latency: What is the acceptable response time?
- Availability: What uptime is required (99.9%, 99.99%)?
- Consistency vs. availability: Can we tolerate eventual consistency?

#### Example
> "Design a URL shortener like bit.ly."
> - Functional: Shorten URL, redirect, custom aliases, analytics
> - Scale: 100M new URLs/day, 10B reads/day
> - Latency: <50ms for redirects
> - Availability: 99.99%

### 2. Sketch (10-15 minutes)

Draw a high-level design with the major components:

```
Client → Load Balancer → API Servers → Cache → Database
              ↓
        Message Queue → Analytics Workers
```

Key components to consider:
- Load Balancer: Distributes traffic (round-robin, least connections)
- API Gateway: Authentication, rate limiting, routing
- Application Servers: Stateless, horizontally growth-ready
- Cache: Redis, Memcached for hot data
- Database: SQL vs. NoSQL choice
- Message Queue: Kafka, RabbitMQ for async processing
- CDN: Static assets and edge caching
- Object Storage: S3 for files/images

### 3. Scale (10-15 minutes)

Identify bottlenecks and propose solutions:

| Bottleneck | Solution |
|-----------|----------|
| Read-heavy traffic | Cache + CDN + read replicas |
| Write-heavy traffic | Sharding + message queues |
| Single point of failure | Multi-AZ, replication, failover |
| Slow queries | Indexes, denormalization, search indexes |
| Large file storage | Object storage (S3) + presigned URLs |

#### Back-of-the-Envelope Calculations

```
100M URLs/day = ~1,160 writes/second (peak ~3,000/s)
10B reads/day = ~115,000 reads/second (peak ~300,000/s)

URL record: short_code (6 bytes) + long_url (500 bytes) + metadata (100 bytes)
≈ 600 bytes per URL

Daily storage: 100M × 600B = 60 GB/day
Yearly storage: ~22 TB/year
```

### 4. Solidify (5 minutes)

Address edge cases and operational concerns:
- Monitoring: Latency, error rate, throughput metrics
- Security: Rate limiting, input validation, DDoS protection
- Data retention: Archival policies, GDPR deletion
- Disaster recovery: Backups, point-in-time recovery

## Core Concepts

### Horizontal vs. Vertical Scaling

| | Vertical | Horizontal |
|---|----------|------------|
| **Approach** | Bigger machine | More machines |
| **Limit** | Hardware ceiling | Near unlimited |
| **Cost** | Expensive per unit | Cheaper per unit |
| **Downtime** | Usually requires | Rolling, no downtime |
| **Complexity** | Simple | Requires load balancing, distributed state |

### Database Sharding

Partition data across multiple databases to distribute load:

```
Shard by user_id % 4:
  User 1 → Shard 0
  User 2 → Shard 1
  User 3 → Shard 2
  User 4 → Shard 3
  User 5 → Shard 0
```

#### Shard Key Selection Criteria

- High cardinality (many distinct values)
- Even distribution (avoid hotspots)
- Query locality (most queries include the shard key)

### Caching Strategies

| Strategy | How It Works | Use Case |
|----------|-------------|----------|
| **Cache-Aside** | App checks cache, loads from DB on miss | Read-heavy, app controls logic |
| **Read-Through** | Cache fetches from DB transparently | Simpler app logic |
| **Write-Through** | Writes update cache and DB simultaneously | Strong consistency |
| **Write-Behind** | Writes go to cache, async flush to DB | Write-heavy, tolerates delay |

### CAP Theorem

In a distributed system, you can only guarantee two of three:

- Consistency: All nodes see the same data simultaneously
- Availability: Every request receives a response
- Partition Tolerance: The system continues operating despite network failures

#### Practical Implication

Network partitions are unavoidable, so you choose between CP (consistent) or AP (available) systems.

## Common Design Problems

| Problem | Key Challenges |
|---------|---------------|
| **URL Shortener** | Hash collisions, high read volume, analytics |
| **Twitter Feed** | [Fan-out](/guides/architecture/event-driven-architecture-guide) (push vs. pull), timeline generation |
| **Chat System** | [Real-time delivery](/recipes/serverless/real-time-websockets), presence, message ordering |
| **Search Engine** | Indexing, ranking, query parsing |
| **Video Streaming** | [CDN](/recipes/performance/cdn-edge-caching), adaptive bitrate, encoding |
| **Rate Limiter** | [Token bucket vs. sliding window](/recipes/api/rate-limiting), distributed state |

## What Works

- Start simple, then add complexity only when justified
- State assumptions explicitly. Interviewers evaluate your reasoning.
- Discuss trade-offs. Every decision has pros and cons.
- Use concrete numbers. Back-of-the-envelope math shows rigor.
- Know your tech stack. Don't propose technologies you can't explain.
- Practice with a timer. 45 minutes goes fast.

## Common Mistakes

- Jumping into a detailed database schema before clarifying requirements
- Ignoring non-functional requirements (scale, availability)
- Proposing technologies without understanding them (e.g., "use Kafka" without knowing why)
- Not discussing trade-offs (e.g., [SQL vs. NoSQL](/guides/databases/nosql-database-selection-guide))
- Forgetting [monitoring](/recipes/devops/prometheus-monitoring-alerts), [security](/guides/security/security-best-practices-guide), and operational concerns
- Designing for infinite scale when the requirements don't justify it

## Frequently Asked Questions

**Q: How deep should I go into a technology?**
A: Deep enough to explain why you chose it and its limitations. If you mention Redis, be ready to explain eviction policies and persistence options.

**Q: Should I mention specific cloud providers?**
A: Use generic terms ("object storage" instead of "S3") unless the interviewer asks for specifics. This shows architectural thinking independent of vendors.

**Q: What if I don't know a technology the interviewer asks about?**
A: Be honest. Say "I'm not familiar with X, but I'd approach it by..." and describe the problem space and how you'd evaluate solutions.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Design a URL Shortener

```text
Problem: Design a URL shortener like bit.ly
Requirements:
  Functional: Shorten URL, redirect, custom aliases, analytics
  Scale: 100M new URLs/day, 10B reads/day
  Latency: < 50ms for redirects
  Availability: 99.99%

Step 1: Capacity estimation
  Writes: 100M/day = ~1,160/s (peak ~3,000/s)
  Reads: 10B/day = ~115,000/s (peak ~300,000/s)
  Read:Write ratio = 100:1

  Storage per URL:
    short_code: 7 bytes (base62)
    long_url: 500 bytes average
    user_id: 8 bytes
    created_at: 8 bytes
    metadata: 50 bytes
    Total: ~573 bytes per record

  Daily storage: 100M x 573B = ~57 GB/day
  Yearly storage: ~21 TB/year
  5-year storage: ~105 TB

Step 2: API design
  POST /api/v1/shorten
    Body: { "url": "https://example.com/...", "custom_alias": "my-link" }
    Response: { "short_url": "https://s.io/my-link", "code": "my-link" }

  GET /:code
    Response: 301 redirect to long_url
    Headers: Cache-Control: public, max-age=31536000

  GET /api/v1/stats/:code
    Response: { "clicks": 12345, "unique_visitors": 8900, ... }

Step 3: Short code generation
  Option A: Base62 encoding of auto-increment ID
    - ID 1 -> "1", ID 1000000 -> "15FTI"
    - Pro: No collisions, sortable
    - Con: Predictable (someone can enumerate URLs)

  Option B: MD5 hash + first 7 chars
    - hash(long_url + user_id) -> take first 7 chars of base62
    - Pro: Same URL = same code (deduplication)
    - Con: Collision risk (need retry logic)

  Option C: Distributed counter (Snowflake ID)
    - 64-bit ID: timestamp + worker_id + sequence
    - Base62 encode -> 11 chars, take first 7
    - Pro: No coordination needed, collision-free
    - Con: Longer codes than necessary

  Decision: Option A with XOR obfuscation to prevent enumeration

Step 4: Data model
  PostgreSQL (write-optimized) + Redis (cache) + Cassandra (analytics)

  -- PostgreSQL: URL mapping
  CREATE TABLE url_mappings (
      short_code VARCHAR(7) PRIMARY KEY,
      long_url TEXT NOT NULL,
      user_id BIGINT,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      INDEX idx_long_url (long_url)
  );

  -- Cassandra: Click analytics (write-heavy)
  CREATE TABLE click_events (
      short_code TEXT,
      clicked_at TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      PRIMARY KEY (short_code, clicked_at)
  ) WITH CLUSTERING ORDER BY (clicked_at DESC);

Step 5: Architecture diagram
  Client -> CDN (edge redirect cache)
    -> Load Balancer
      -> API Servers (stateless, auto-scaled)
        -> Redis (cache lookup, 95% hit rate)
        -> PostgreSQL (write + cache miss)
        -> Kafka (async click events)
          -> Analytics Consumer -> Cassandra

Step 6: Caching strategy
  - Redis cache: short_code -> long_url (TTL: 24h)
  - CDN cache: 301 redirects cached at edge (TTL: 1 year)
  - Cache hit rate target: > 95% (only 5% hits PostgreSQL)
  - Cache invalidation: on URL update, delete from Redis + CDN purge

Step 7: Sharding (year 2+)
  Shard by short_code hash: 16 shards
  Each shard: 1 master + 3 read replicas
  Write capacity: 16 x 3,000 = 48,000 writes/s
  Read capacity: 16 x 20,000 = 320,000 reads/s (with replicas)

Step 8: Operational concerns
  - Monitoring: redirect latency, cache hit rate, error rate
  - Alerting: p99 > 100ms, cache hit < 90%, error rate > 0.1%
  - Backup: PostgreSQL PITR + daily S3 snapshot
  - Disaster recovery: Multi-AZ, RPO < 1 min, RTO < 15 min
```

### How do I estimate storage and bandwidth in an interview?

Start with the numbers given in the requirements. Calculate daily writes and reads. Multiply by record size to get daily storage. Multiply by 365 for yearly. Add 20% overhead for indexes and metadata. For bandwidth, multiply requests/second by average response size. State your assumptions explicitly and round to make math easier. Interviewers care about the process, not exact numbers.

---
contentType: guides
slug: system-design-interview-guide
title: "System Design Interview Guide — Key Concepts"
description: "A practical guide to system design interviews: scalability, databases, caching, load balancing, microservices, and how to structure your answer."
metaDescription: "System design interview guide: scalability, databases, caching, load balancing, microservices. Learn to structure answers for tech interviews."
difficulty: advanced
topics:
  - architecture
  - performance
tags:
  - system-design
  - interview
  - scalability
  - distributed-systems
  - architecture
  - guide
relatedResources:
  - /guides/architecture/software-architecture-guide
  - /guides/devops/kubernetes-basics-guide
  - /patterns/design/cache-aside-pattern
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

System design interviews evaluate your ability to architect scalable, reliable, and maintainable systems. Unlike coding interviews, there is no single correct answer. The goal is to demonstrate structured thinking, trade-off analysis, and depth of technical knowledge.

## Interview Structure

A strong answer follows a 4S framework:

### 1. Scope (2-3 minutes)

Clarify requirements before designing:

**Functional requirements:**
- What features must the system support?
- What are the core use cases?

**Non-functional requirements:**
- Scale: How many users? Requests per second?
- Latency: What is the acceptable response time?
- Availability: What uptime is required (99.9%, 99.99%)?
- Consistency vs. availability: Can we tolerate eventual consistency?

**Example:**
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
- **Load Balancer**: Distributes traffic (round-robin, least connections)
- **API Gateway**: Authentication, rate limiting, routing
- **Application Servers**: Stateless, horizontally scalable
- **Cache**: Redis, Memcached for hot data
- **Database**: SQL vs. NoSQL choice
- **Message Queue**: Kafka, RabbitMQ for async processing
- **CDN**: Static assets and edge caching
- **Object Storage**: S3 for files/images

### 3. Scale (10-15 minutes)

Identify bottlenecks and propose solutions:

| Bottleneck | Solution |
|-----------|----------|
| Read-heavy traffic | Cache + CDN + read replicas |
| Write-heavy traffic | Sharding + message queues |
| Single point of failure | Multi-AZ, replication, failover |
| Slow queries | Indexes, denormalization, search indexes |
| Large file storage | Object storage (S3) + presigned URLs |

**Back-of-the-envelope calculations:**

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
- **Monitoring**: Latency, error rate, throughput metrics
- **Security**: Rate limiting, input validation, DDoS protection
- **Data retention**: Archival policies, GDPR deletion
- **Disaster recovery**: Backups, point-in-time recovery

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

**Shard key selection criteria:**
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

- **Consistency**: All nodes see the same data simultaneously
- **Availability**: Every request receives a response
- **Partition Tolerance**: The system continues operating despite network failures

**Practical implication:** Network partitions are unavoidable, so you choose between CP (consistent) or AP (available) systems.

## Common Design Problems

| Problem | Key Challenges |
|---------|---------------|
| **URL Shortener** | Hash collisions, high read volume, analytics |
| **Twitter Feed** | Fan-out (push vs. pull), timeline generation |
| **Chat System** | Real-time delivery, presence, message ordering |
| **Search Engine** | Indexing, ranking, query parsing |
| **Video Streaming** | CDN, adaptive bitrate, encoding |
| **Rate Limiter** | Token bucket vs. sliding window, distributed state |

## Best Practices

- **Start simple**, then add complexity only when justified
- **State assumptions explicitly** — interviewers evaluate your reasoning
- **Discuss trade-offs** — every decision has pros and cons
- **Use concrete numbers** — back-of-the-envelope math shows rigor
- **Know your tech stack** — don't propose technologies you can't explain
- **Practice with a timer** — 45 minutes goes fast

## Common Mistakes

- Jumping into a detailed database schema before clarifying requirements
- Ignoring non-functional requirements (scale, availability)
- Proposing technologies without understanding them (e.g., "use Kafka" without knowing why)
- Not discussing trade-offs (e.g., SQL vs. NoSQL)
- Forgetting monitoring, security, and operational concerns
- Designing for infinite scale when the requirements don't justify it

## Frequently Asked Questions

**Q: How deep should I go into a technology?**
A: Deep enough to explain why you chose it and its limitations. If you mention Redis, be ready to explain eviction policies and persistence options.

**Q: Should I mention specific cloud providers?**
A: Use generic terms ("object storage" instead of "S3") unless the interviewer asks for specifics. This shows architectural thinking independent of vendors.

**Q: What if I don't know a technology the interviewer asks about?**
A: Be honest. Say "I'm not familiar with X, but I'd approach it by..." and describe the problem space and how you'd evaluate solutions.

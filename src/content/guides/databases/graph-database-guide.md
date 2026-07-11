---
contentType: guides
slug: graph-database-guide
title: "Graph Databases — Neo4j and Property Graph Modeling"
description: "A practical guide to graph databases: property graph model, Cypher query language, modeling patterns, and when to choose Neo4j over relational databases."
metaDescription: "Learn graph databases: property graph model, Cypher queries, modeling patterns. When to choose Neo4j over relational for connected data problems."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - graph-database
  - neo4j
  - cypher
  - property-graph
  - relationships
  - connected-data
  - recommendation-engine
  - guide
relatedResources:
  - /guides/nosql-patterns-guide
  - /guides/vector-database-guide
  - /guides/database-design-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn graph databases: property graph model, Cypher queries, modeling patterns. When to choose Neo4j over relational for connected data problems."
  keywords:
    - graph-database
    - neo4j
    - cypher
    - property-graph
    - connected-data
    - guide
---

## Overview

Graph databases store data as nodes (entities) and edges (relationships), making them ideal for problems where connections between data points are as important as the data itself. Social networks, fraud detection, recommendation engines, and knowledge graphs all benefit from native graph storage. Neo4j, the leading property graph database, uses the Cypher query language and achieves constant-time traversals regardless of graph depth — something relational databases struggle with due to join explosion.

## When to Use

- Relationships are the primary query concern, not just attributes
- You need to traverse many hops efficiently (friend-of-friend, supply chain)
- Schema is fluid and new relationship types emerge frequently
- Pathfinding, centrality, or community detection is required
- A relational model would require excessive self-joins or junction tables

## Property Graph Model

| Element | Description | Example |
|---------|-------------|---------|
| **Node** | Entity with labels and properties | `(p:Person {name: "Alice", age: 30})` |
| **Relationship** | Typed, directed connection with properties | `[:FRIENDS {since: 2020}]` |
| **Label** | Categorizes nodes | `:Person`, `:Product`, `:Order` |
| **Property** | Key-value attribute on node or relationship | `name`, `since`, `amount` |

## Cypher Basics

```cypher
-- Create nodes and a relationship
CREATE (alice:Person {name: 'Alice', city: 'NYC'})
CREATE (bob:Person {name: 'Bob', city: 'LA'})
CREATE (alice)-[:FRIENDS {since: 2020}]->(bob);

-- Find friends of friends
MATCH (alice:Person {name: 'Alice'})-[:FRIENDS*2]->(fof:Person)
WHERE fof <> alice
RETURN DISTINCT fof.name;

-- Shortest path between two people
MATCH p=shortestPath(
    (a:Person {name: 'Alice'})-[:FRIENDS|COLLEAGUE*]-(b:Person {name: 'Zoe'})
)
RETURN p;
```

## Real-World Patterns

### Recommendation Engine

```cypher
-- Collaborative filtering: people who bought X also bought Y
MATCH (u:User)-[:BOUGHT]->(p:Product {name: 'Widget'})
MATCH (u)-[:BOUGHT]->(other:Product)
WHERE other <> p
RETURN other.name, count(*) as popularity
ORDER BY popularity DESC
LIMIT 5;
```

### Fraud Detection

```cypher
-- Detect circular money transfers ( layering )
MATCH path=(a:Account)-[:TRANSFERRED_TO*3..5]->(a)
RETURN path;
```

### Access Control

```cypher
-- Check if user has access through group membership
MATCH (u:User {id: 123})-[:MEMBER_OF*0..]->(g:Group)-[:CAN_ACCESS]->(r:Resource {id: 'doc-1'})
RETURN count(r) > 0 as has_access;
```

## Graph vs Relational

| Query type | Relational | Graph |
|------------|------------|-------|
| 1-hop lookup | JOIN | Direct edge traversal |
| 3+ hop traversal | Multiple JOINs, slow | Constant-time per hop |
| Path finding | Recursive CTE, complex | Native shortestPath |
| Schema evolution | ALTER TABLE | Add labels/relationships dynamically |

## Common Mistakes

- **Modeling everything as a graph** — simple tabular data is often better in a relational database
- **Ignoring direction** — relationships have direction in property graphs; design queries accordingly
- **Missing indexes** — create indexes on properties you search frequently (e.g., `CREATE INDEX ON :Person(email)`)
- **Deep traversals without limits** — unconstrained variable-length paths can consume excessive resources
- **Storing large properties on relationships** — keep relationship properties small; use nodes for rich data

## FAQ

**When should I NOT use a graph database?**
When relationships are shallow (1-2 hops), data is highly structured and static, or you need strong ACID transactions across the entire graph. Relational databases handle these well.

**Can I run graph queries on PostgreSQL?**
Yes, with extensions like Apache AGE or recursive CTEs, but performance degrades with graph depth. For deep traversals, a native graph database is better.

**What is RDF vs property graph?**
RDF is a W3C standard for semantic graphs (triples). Property graphs (Neo4j, Amazon Neptune) are more developer-friendly with labeled nodes, typed relationships, and properties on both.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Social Network with Neo4j

```text
System: Professional social network (Neo4j 5.x)
Volume: 2M users, 15M connections, 50M interactions
Requirements: Connection search, recommendations, community analysis

Data model:
  Nodes: Person, Company, Skill, Group, Post
  Relationships: KNOWS, WORKS_AT, HAS_SKILL, MEMBER_OF, POSTED, LIKES

  (:Person {name, email, title, location})
  (:Company {name, industry, size})
  (:Skill {name, category})
  (:Group {name, description})

  [:KNOWS {since, strength}]
  [:WORKS_AT {since, role}]
  [:HAS_SKILL {level: 1-5}]
  [:MEMBER_OF {joinedAt}]

Key queries:

  -- Degree of separation between two people
  MATCH p = shortestPath(
    (a:Person {email: "alice@example.com"})-[:KNOWS*]-(b:Person {email: "bob@example.com"})
  )
  RETURN length(p) AS degrees, nodes(p) AS path

  -- Connection recommendations (friends of friends not connected)
  MATCH (me:Person {email: "alice@example.com"})-[:KNOWS]-(friend)-[:KNOWS]-(fof)
  WHERE NOT (me)-[:KNOWS]-(fof) AND me <> fof
  WITH fof, count(friend) AS mutual_count
  ORDER BY mutual_count DESC
  RETURN fof.name, fof.title, mutual_count
  LIMIT 10

  -- Community detection (Louvain algorithm)
  CALL gds.louvain.stream("socialGraph")
  YIELD nodeId, communityId
  RETURN gds.util.asNode(nodeId).name AS person, communityId
  ORDER BY communityId, person

  -- People with complementary skills in the same city
  MATCH (me:Person {email: "alice@example.com"})-[:HAS_SKILL]->(mySkill)
  MATCH (other:Person)-[:HAS_SKILL]->(theirSkill)
  WHERE me.location = other.location
    AND me <> other
    AND NOT (mySkill = theirSkill)
    AND NOT (me)-[:KNOWS]-(other)
  WITH other, collect(DISTINCT theirSkill.name) AS complementary_skills
  RETURN other.name, other.title, complementary_skills
  LIMIT 5

Indexes and optimization:
  CREATE INDEX person_email IF NOT EXISTS FOR (p:Person) ON (p.email)
  CREATE INDEX person_location IF NOT EXISTS FOR (p:Person) ON (p.location)
  CREATE INDEX company_name IF NOT EXISTS FOR (c:Company) ON (c.name)

  CREATE CONSTRAINT person_email_unique IF NOT EXISTS
  FOR (p:Person) REQUIRE p.email IS UNIQUE

Performance:
  | Query | Neo4j time | PostgreSQL equivalent |
  |-------|-----------|----------------------|
  | Friends of friends (2 hops) | 2ms | 45ms (2 JOINs) |
  | Degree of separation (up to 5) | 15ms | >2s (5 recursive JOINs) |
  | Community detection | 800ms | N/A (requires external algorithm) |
  | Connection recommendations | 12ms | 300ms (3 JOINs + subquery) |

Lessons learned:
  - Neo4j shines at deep traversals (3+ hops)
  - For 1-2 hops, PostgreSQL with JOINs is sufficient
  - Indexes are critical even in graphs
  - Limit variable-length traversal depth to avoid explosion
  - Use GDS algorithms for whole-graph analysis
```

### How do I model hierarchies in a graph?

Use recursive relationships with variable depth. For example, an org chart: `(:Employee)-[:REPORTS_TO*]->(:Manager)`. For trees, use the tree pattern with a `[:CHILD_OF]` relationship. To query all descendants: `MATCH (parent)-[:CHILD_OF*]->(descendant)`. For ancestors: `MATCH (descendant)<-[:CHILD_OF*]-(ancestor)`.






































































End of document. Review and update quarterly.
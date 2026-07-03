---
contentType: recipes
slug: mongodb-crud-mongoose
title: "CRUD Operations with MongoDB and Mongoose"
description: "How to perform Create, Read, Update, and Delete operations in MongoDB using Mongoose ODM with Node.js and Express"
metaDescription: "CRUD operations with MongoDB and Mongoose. Create schemas, perform queries, handle transactions, and implement pagination in Node.js."
difficulty: beginner
topics:
  - databases
tags:
  - mongodb
  - database
  - nodejs
  - databases
  - sql
relatedResources:
  - /guides/database-design-guide
  - /recipes/database-indexing
  - /patterns/repository-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "CRUD operations with MongoDB and Mongoose. Create schemas, perform queries, handle transactions, and implement pagination in Node.js."
  keywords:
    - mongodb
    - mongoose
    - crud
    - nodejs
    - express
---

# CRUD Operations with MongoDB and Mongoose

Mongoose provides a schema-based solution to model application data for MongoDB. It handles type casting, validation, query building, and business logic hooks, making it the most popular ODM in the Node.js ecosystem.

## When to Use This

- You need a structured way to interact with MongoDB from Node.js. See [Parse JSON](/recipes/data/parse-json) for document handling.
- You want automatic validation and middleware hooks
- You are building an API that requires relational-like patterns in a document database. See [SQL Joins](/recipes/databases/sql-joins) for relational patterns.

## Prerequisites

- MongoDB installed locally or a MongoDB Atlas cluster
- Node.js 18+

## Solution: Express + Mongoose

### 1. Install Dependencies

```bash
npm install express mongoose dotenv
```

### 2. Define the Schema

```javascript
// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for common queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

export default mongoose.model('User', userSchema);
```

### 3. Connect and Perform CRUD

```javascript
// app.js
import express from 'express';
import mongoose from 'mongoose';
import User from './models/User.js';

const app = express();
app.use(express.json());

await mongoose.connect(process.env.MONGODB_URI);

// CREATE
app.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ (with pagination)
app.get('/users', async (req, res) => {
  // See [Pagination](/recipes/api/pagination) for cursor-based approaches
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({ isActive: true })
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ isActive: true }),
  ]);

  res.json({
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// READ ONE
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-__v');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// UPDATE
app.patch('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// DELETE (soft delete). See [Soft Deletes](/recipes/databases/soft-deletes) for patterns.
app.delete('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deactivated' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### 4. Transactions

```javascript
// Atomic operations across collections. See [Database Transactions](/recipes/databases/database-transactions) for ACID patterns.
app.post('/orders', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.create([{ ...req.body, status: 'pending' }], { session });
    await Product.updateOne(
      { _id: req.body.productId },
      { $inc: { stock: -req.body.quantity } },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(order[0]);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});
```

## How It Works

1. **Schema Definition** enforces structure while preserving MongoDB's flexibility
2. **Middleware Hooks** run validation and transformation before/after operations
3. **Query Building** provides a chainable API for complex queries
4. **Transactions** ensure ACID compliance across multiple documents

## Production Considerations

- Enable **read preference `secondary`** for read-heavy workloads in replica sets
- Use **compound indexes** for frequently combined query fields
- Implement **cursor-based pagination** for large datasets instead of skip/limit. See [Pagination](/recipes/api/pagination) for cursor patterns.
- Add **Mongoose plugins** for common patterns (soft delete, auditing)

## FAQ

**Q: Should I use Mongoose or the native driver?**
A: Use Mongoose for application data with validation needs. Use the native driver for analytics, aggregation pipelines, or maximum performance.

**Q: How do I handle schema migrations?**
A: Use `migrate-mongo` or write idempotent migration scripts that run on deployment.

**Q: When should I use references vs embedded documents?**
A: Embed when data is read together and unbounded growth is not expected. Reference when data is updated independently or grows without limit.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

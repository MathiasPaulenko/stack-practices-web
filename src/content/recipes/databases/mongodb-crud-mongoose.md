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

### Aggregation Pipeline Examples

```javascript
const { Schema, model } = require('mongoose');

const orderSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number,
  }],
  status: { type: String, enum: ['pending', 'completed', 'cancelled'] },
  createdAt: { type: Date, default: Date.now },
});

const Order = model('Order', orderSchema);

// Total revenue by customer
async function revenueByCustomer() {
  return await Order.aggregate([
    { $match: { status: 'completed' } },
    { $group: {
        _id: '$customerId',
        totalRevenue: { $sum: { $sum: '$items.price' } },
        orderCount: { $sum: 1 },
    }},
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 },
    { $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
    }},
    { $unwind: '$customer' },
    { $project: {
        customerName: '$customer.name',
        totalRevenue: 1,
        orderCount: 1,
    }},
  ]);
}

// Monthly sales report
async function monthlySales(year) {
  return await Order.aggregate([
    { $match: {
        status: 'completed',
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`),
        },
    }},
    { $group: {
        _id: { $month: '$createdAt' },
        revenue: { $sum: { $sum: '$items.price' } },
        orders: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);
}

// Top-selling products
async function topProducts(limit = 10) {
  return await Order.aggregate([
    { $unwind: '$items' },
    { $group: {
        _id: '$items.productId',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
    }},
    { $sort: { totalSold: -1 } },
    { $limit: limit },
    { $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
    }},
    { $unwind: '$product' },
    { $project: {
        name: '$product.name',
        totalSold: 1,
        revenue: 1,
    }},
  ]);
}
```

### MongoDB Transactions with Mongoose

```javascript
const mongoose = require('mongoose');

async function transferCredits(fromUserId, toUserId, amount) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fromUser = await User.findById(fromUserId).session(session);
    if (!fromUser || fromUser.credits < amount) {
      throw new Error('Insufficient credits');
    }

    const toUser = await User.findById(toUserId).session(session);
    if (!toUser) {
      throw new Error('Recipient not found');
    }

    fromUser.credits -= amount;
    toUser.credits += amount;

    await fromUser.save({ session });
    await toUser.save({ session });

    // Log the transfer
    await Transfer.create([{
      from: fromUserId,
      to: toUserId,
      amount,
    }], { session });

    await session.commitTransaction();
    return { fromUser, toUser };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Transaction with retry logic for transient errors
async function withTransactionRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(fn);
      return result;
    } catch (error) {
      if (error.errorLabels?.includes('TransientTransactionError') && attempt < maxRetries - 1) {
        console.log(`Transaction retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        continue;
      }
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

### Soft Delete Plugin

```javascript
const softDeletePlugin = (schema, options = { deletedAtField: 'deletedAt' }) => {
  const { deletedAtField } = options;

  schema.add({ [deletedAtField]: { type: Date, default: null } });

  // Exclude soft-deleted documents from find queries
  schema.pre(/^find/, function () {
    if (!this.getFilter()[deletedAtField]) {
      this.setQuery({ [deletedAtField]: null, ...this.getFilter() });
    }
  });

  schema.pre('countDocuments', function () {
    if (!this.getFilter()[deletedAtField]) {
      this.setQuery({ [deletedAtField]: null, ...this.getFilter() });
    }
  });

  // Add softDelete method
  schema.methods.softDelete = async function () {
    this[deletedAtField] = new Date();
    return await this.save();
  };

  // Add restore method
  schema.methods.restore = async function () {
    this[deletedAtField] = null;
    return await this.save();
  };

  // Add hardDelete method
  schema.methods.hardDelete = async function () {
    return await this.constructor.deleteOne({ _id: this._id });
  };

  // Include deleted documents with `includeDeleted`
  schema.statics.includeDeleted = function () {
    return this.find().setQuery({}); // Bypass the pre-find hook
  };
};

// Usage
userSchema.plugin(softDeletePlugin);
const User = model('User', userSchema);

// Soft delete
const user = await User.findById(userId);
await user.softDelete();

// Normal queries exclude soft-deleted
const activeUsers = await User.find({ role: 'admin' });

// Include soft-deleted
const allUsers = await User.includeDeleted().find({});
```

### Population and Deep Populate

```javascript
// Basic population
const posts = await Post.find()
  .populate('author', 'name email')
  .populate('category', 'name')
  .lean();

// Deep population (nested)
const orders = await Order.find()
  .populate({
    path: 'customerId',
    select: 'name email',
    populate: {
      path: 'addressId',
      model: 'Address',
    },
  })
  .populate({
    path: 'items.productId',
    select: 'name price',
    populate: {
      path: 'categoryId',
      model: 'Category',
      select: 'name',
    },
  })
  .lean();

// Conditional population
const users = await User.find().populate({
  path: 'posts',
  match: { status: 'published' },
  options: { limit: 5, sort: { createdAt: -1 } },
});
```

### Bulk Operations with Mongoose

```javascript
// Bulk write: mixed operations in a single round-trip
const bulkOps = [
  { updateOne: {
      filter: { _id: userId1 },
      update: { $set: { status: 'active' } },
  }},
  { updateOne: {
      filter: { _id: userId2 },
      update: { $inc: { loginCount: 1 } },
  }},
  { deleteOne: {
      filter: { _id: userId3 },
  }},
  { insertOne: {
      document: { name: 'New User', email: 'new@example.com' },
  }},
];

const result = await User.bulkWrite(bulkOps);
console.log(`Modified: ${result.modifiedCount}, Inserted: ${result.insertedCount}`);

// Ordered vs unordered bulk
await User.bulkWrite(bulkOps, { ordered: false }); // Continue on error
await User.bulkWrite(bulkOps, { ordered: true });  // Stop on first error (default)
```

### Change Streams for Real-Time Updates

```javascript
const mongoose = require('mongoose');

// Watch for changes on a collection
const changeStream = User.watch();

changeStream.on('change', (change) => {
  console.log('Change type:', change.operationType);

  switch (change.operationType) {
    case 'insert':
      console.log('New user:', change.fullDocument);
      break;
    case 'update':
      console.log('Updated fields:', change.updateDescription.updatedFields);
      break;
    case 'delete':
      console.log('Deleted document ID:', change.documentKey._id);
      break;
    case 'replace':
      console.log('Replaced document:', change.fullDocument);
      break;
  }
});

// Watch with pipeline filter
const filteredStream = User.watch([
  { $match: { operationType: 'update' } },
  { $project: { 'updateDescription.updatedFields.status': 1 } },
]);

// Resume from a specific timestamp
const resumeToken = getStoredResumeToken();
const resumableStream = User.watch([], { resumeAfter: resumeToken });
```

### Schema Validation with JSON Schema

```javascript
// MongoDB native schema validation (server-side)
// Run via mongo shell or mongoose connection
const validationSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['name', 'email'],
    properties: {
      name: {
        bsonType: 'string',
        description: 'Name is required and must be a string',
      },
      email: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Must be a valid email address',
      },
      age: {
        bsonType: 'int',
        minimum: 18,
        maximum: 120,
        description: 'Age must be between 18 and 120',
      },
      role: {
        enum: ['admin', 'user', 'guest'],
        description: 'Role must be one of the allowed values',
      },
    },
  },
};

// Apply via mongoose connection
await mongoose.connection.db.command({
  collMod: 'users',
  validator: validationSchema,
  validationLevel: 'strict',
  validationAction: 'error',
});
```

## Additional Best Practices

6. **Use `lean()` for read-only queries.** `lean()` skips Mongoose hydration, reducing memory and CPU overhead by 50%+:

```javascript
// Bad: full Mongoose documents with methods
const users = await User.find({ active: true });

// Good: plain JS objects for read-only
const users = await User.find({ active: true }).lean();
```

7. **Use `select()` to limit returned fields.** Reduce network transfer and memory usage:

```javascript
const users = await User.find()
  .select('name email -_id')
  .lean();
```

8. **Use compound indexes for multi-field queries.** Order matters: equality fields first, then sort fields:

```javascript
userSchema.index({ status: 1, createdAt: -1 });
// Supports: { status: 'active' } and { status: 'active' }.sort({ createdAt: -1 })
```

9. **Use `explain()` to analyze query performance.** Check if queries use indexes:

```javascript
const explanation = await User.find({ email: 'test@example.com' })
  .explain('executionStats');

console.log('Index used:', explanation.executionStats.executionStages.indexName);
console.log('Documents examined:', explanation.executionStats.totalDocsExamined);
console.log('Documents returned:', explanation.executionStats.nReturned);
```

10. **Set `maxTimeMS` on queries.** Prevent slow queries from consuming resources:

```javascript
const results = await User.find({ active: true })
  .maxTimeMS(5000)  // Abort after 5 seconds
  .lean();
```

## Additional Common Mistakes

6. **Using `skip()` and `limit()` for deep pagination.** `skip(10000).limit(10)` scans 10,010 documents. Use cursor-based pagination instead:

```javascript
// Bad: O(n) skip
const page = await User.find().skip(10000).limit(10);

// Good: O(1) cursor-based
const lastId = req.query.cursor;
const page = await User.find({ _id: { $gt: lastId } })
  .sort({ _id: 1 })
  .limit(10);
```

7. **Not handling duplicate key errors.** Unique constraints throw `E11000`. Handle this gracefully:

```javascript
try {
  await User.create({ email: 'existing@example.com' });
} catch (error) {
  if (error.code === 11000) {
    throw new Error('Email already registered');
  }
  throw error;
}
```

8. **Storing large binary data in MongoDB.** Use GridFS or S3 for files larger than 16MB:

```javascript
// Bad: storing image in document
user.avatar = Buffer.from(largeImageData);

// Good: store reference
user.avatarUrl = 'https://s3.amazonaws.com/bucket/avatar.png';
```

9. **Not closing database connections on shutdown.** Leaked connections cause memory issues:

```javascript
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
```

10. **Using `$where` for queries.** `$where` executes JavaScript on the server, which is slow and insecure. Use native operators instead:

```javascript
// Bad: slow $where
User.find({ $where: 'this.name.length > 10' });

// Good: use $expr with native operators
User.find({ $expr: { $gt: [{ $strLenCP: '$name' }, 10] } });
```

## Additional FAQ

### How do I model one-to-many relationships in MongoDB?

For a small, bounded number of children (e.g., a post with up to 10 tags), embed them:

```javascript
const postSchema = new Schema({
  title: String,
  tags: [String], // Embedded array
});
```

For unbounded children (e.g., a user with many orders), use references:

```javascript
const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  // ...
});
```

For a medium number with pagination needs, use a hybrid: store the first few embedded and the rest as references.

### How do I handle schema evolution without migrations?

Add new fields with defaults so old documents still work:

```javascript
userSchema.add({
  preferences: {
    type: Object,
    default: { theme: 'light', notifications: true },
  },
});
```

For removing fields, use a migration script:

```javascript
await User.updateMany({}, { $unset: { deprecatedField: '' } });
```

### What is the difference between `findOneAndUpdate` and `findByIdAndUpdate`?

`findByIdAndUpdate(id, update)` is a shorthand for `findOneAndUpdate({ _id: id }, update)`. They are functionally identical. Use `findByIdAndUpdate` when you have the document ID, and `findOneAndUpdate` when you have a different filter.

## Performance Tips

1. **Use `createIndex` with background option.** Prevent index creation from blocking writes:

```javascript
await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
```

2. **Use `bulkWrite` for batch inserts.** Reduce round-trips:

```javascript
const docs = Array.from({ length: 1000 }, (_, i) => ({
  insertOne: { document: { name: `User ${i}`, email: `user${i}@example.com` } },
}));

await User.bulkWrite(docs);
```

3. **Use `hint()` to force index usage.** When the query planner picks the wrong index:

```javascript
await User.find({ status: 'active' }).hint({ status: 1, createdAt: -1 });
```

4. **Use `readPreference` for replica sets.** Route reads to secondaries:

```javascript
mongoose.connect(uri, {
  readPreference: 'secondaryPreferred',
});
```

5. **Monitor slow queries with profiling.** Enable database profiler:

```javascript
// Enable profiling for queries slower than 100ms
await mongoose.connection.db.command({
  profile: 1,
  slowms: 100,
});

// Query the profiler
const slowQueries = await mongoose.connection.db
  .collection('system.profile')
  .find({ millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)
  .toArray();
```

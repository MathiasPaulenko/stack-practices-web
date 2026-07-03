---
contentType: recipes
slug: gcp-cloud-functions-nodejs
title: "Deploy HTTP Cloud Functions on Google Cloud with Node.js"
description: "Create and deploy HTTP-triggered Cloud Functions on Google Cloud with Node.js, Express integration, secrets management, and gcloud CLI deployment."
metaDescription: "Deploy HTTP Cloud Functions on Google Cloud with Node.js. Use Express, manage secrets with Secret Manager, and deploy with gcloud CLI or Cloud Build."
difficulty: intermediate
topics:
  - serverless
  - api
  - infrastructure
tags:
  - gcp
  - cloud-functions
  - nodejs
  - http-trigger
  - serverless
relatedResources:
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/serverless/azure-functions-python-http
  - /guides/complete-guide-serverless-architecture
  - /guides/complete-guide-gcp-cloud-functions
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Deploy HTTP Cloud Functions on Google Cloud with Node.js. Use Express, manage secrets with Secret Manager, and deploy with gcloud CLI or Cloud Build."
  keywords:
    - gcp cloud functions nodejs
    - google cloud functions
    - nodejs serverless gcp
    - cloud functions http trigger
    - gcloud deploy functions
---

## Overview

Google Cloud Functions is GCP's serverless compute platform. The 2nd generation (Cloud Functions v2) runs on Cloud Run and Eventarc, supporting HTTP triggers, CloudEvent triggers, and concurrent request handling. Below: creating HTTP-triggered functions with Node.js, integrating Express for routing, managing secrets with Secret Manager, and deploying with gcloud CLI.

## When to Use This

- Building serverless HTTP APIs on Google Cloud
- Webhooks and event-driven endpoints
- Lightweight microservices without managing infrastructure
- Integrating with GCP services (Firestore, Pub/Sub, Cloud Storage)

## Prerequisites

- Node.js 18+
- Google Cloud CLI (`gcloud`)
- A GCP project with billing enabled
- Cloud Functions API enabled

## Solution

### 1. Enable APIs and Set Up

```bash
# Set project
gcloud config set project my-project-id

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Basic HTTP Function (Gen 2)

```javascript
// index.js (Cloud Functions v2 — uses CloudEvents)
const functions = require('@google-cloud/functions-framework');

functions.http('helloWorld', (req, res) => {
  const name = req.query.name || req.body?.name || 'World';

  res.status(200).json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
  });
});
```

```json
// package.json
{
  "name": "my-cloud-function",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@google-cloud/functions-framework": "^3.3.0"
  }
}
```

### 3. Express Integration

```javascript
// index.js
const functions = require('@google-cloud/functions-framework');
const express = require('express');

const app = express();
app.use(express.json());

// Routes
app.get('/users/:id', (req, res) => {
  const user = getUserFromDb(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const user = createUser({ name, email });
  res.status(201).json(user);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register Express app as the function handler
functions.http('api', app);
```

### 4. Firestore Integration

```javascript
const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

async function getUserFromDb(userId) {
  const doc = await firestore.collection('users').doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function createUser(data) {
  const docRef = await firestore.collection('users').add({
    ...data,
    createdAt: Firestore.FieldValue.serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}
```

### 5. Secrets Management with Secret Manager

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretClient = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/my-project-id/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString();
}

// Cache secrets to avoid repeated API calls
let cachedApiKey = null;

async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  cachedApiKey = await getSecret('api-key');
  return cachedApiKey;
}
```

### 6. Error Handling

```javascript
const functions = require('@google-cloud/functions-framework');
const express = require('express');

const app = express();
app.use(express.json());

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await fetchOrder(req.params.id);
  if (!order) throw new Error('Order not found');
  res.json(order);
}));

functions.http('api', app);
```

### 7. CORS Handling

```javascript
const functions = require('@google-cloud/functions-framework');
const express = require('express');
const cors = require('cors');

const app = express();

// Configure CORS
app.use(cors({
  origin: ['https://myapp.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/data', (req, res) => {
  res.json({ data: 'accessible from allowed origins' });
});

functions.http('api', app);
```

### 8. Deploy with gcloud CLI

```bash
# Deploy Gen 2 HTTP function
gcloud functions deploy my-api \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=api \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=60s \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=100 \
  --set-env-vars=NODE_ENV=production \
  --set-secrets=API_KEY=api-key:latest

# Get function URL
gcloud functions describe my-api --gen2 --region=us-central1 --format='value(serviceConfig.uri)'
```

## How It Works

1. **Cloud Functions v2**: Built on Cloud Run and Eventarc. HTTP functions are containerized and served via Cloud Run, supporting concurrency (multiple requests per instance).
2. **Functions framework**: `@google-cloud/functions-framework` registers HTTP handlers via `functions.http()`. It can accept a function `(req, res) => {}` or an Express app.
3. **Concurrency**: Gen 2 functions handle up to 80 concurrent requests per instance (configurable). Gen 1 handled one request per instance. This reduces cold starts and cost.
4. **Secret Manager**: Secrets are mounted as environment variables or accessed via the Secret Manager API. The `--set-secrets` flag maps secrets to env vars at deploy time.
5. **Scaling**: Cloud Functions scales from 0 to `max-instances` based on traffic. `min-instances` keeps instances warm to avoid cold starts (increases cost).

## Variants

### Pub/Sub Trigger

```javascript
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processOrder', (cloudevent) => {
  const pubsubMessage = cloudevent.data.message;
  const data = Buffer.from(pubsubMessage.data, 'base64').toString();
  const order = JSON.parse(data);
  console.log('Processing order:', order.id);
  processOrder(order);
});
```

Deploy:

```bash
gcloud functions deploy process-order \
  --gen2 \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=processOrder \
  --trigger-topic=orders \
  --region=us-central1
```

### Cloud Storage Trigger

```javascript
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('onFileUpload', (cloudevent) => {
  const bucket = cloudevent.data.bucket;
  const name = cloudevent.data.name;
  console.log(`File uploaded: gs://${bucket}/${name}`);
  processFile(bucket, name);
});
```

Deploy:

```bash
gcloud functions deploy on-file-upload \
  --gen2 \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=onFileUpload \
  --trigger-bucket=my-upload-bucket \
  --region=us-central1
```

### Scheduled Function (Cloud Scheduler)

```javascript
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('scheduledCleanup', (cloudevent) => {
  console.log('Running scheduled cleanup at:', new Date().toISOString());
  cleanupExpiredRecords();
});
```

Deploy:

```bash
gcloud functions deploy scheduled-cleanup \
  --gen2 \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=scheduledCleanup \
  --trigger-http \
  --schedule="0 2 * * *" \
  --no-allow-unauthenticated \
  --region=us-central1
```

## Best Practices

- **Use Gen 2**: It supports concurrency, has better cold start performance, and is built on Cloud Run. Gen 1 is legacy.
- **Use Express for complex routing**: For more than one endpoint, Express is cleaner than manual routing in a single function.
- **Cache secrets**: Secret Manager API calls add latency. Cache secrets in memory — they don't change during a function's lifetime.
- **Set concurrency**: Gen 2 supports up to 80 concurrent requests. Set it based on your function's memory and CPU usage.
- **Use `min-instances` for critical APIs**: Keeps instances warm to avoid cold starts. Costs more but eliminates latency spikes.
- **Separate functions by concern**: Don't put all endpoints in one function. Deploy separate functions for different API resources.

## Common Mistakes

- **Using Gen 1**: Gen 1 doesn't support concurrency and has slower cold starts. Always use `--gen2`.
- **Not handling CORS**: Browser requests from different origins will fail. Use the `cors` middleware with explicit allowed origins.
- **Blocking the event loop**: Synchronous CPU-heavy operations block all concurrent requests. Use async operations or offload to Cloud Tasks.
- **Hardcoding secrets**: Never put API keys in source code. Use Secret Manager or environment variables set via `--set-secrets`.
- **Ignoring timeout**: Default timeout is 60 seconds. Long-running operations need a higher timeout or should be offloaded to Cloud Tasks.

## FAQ

**Cloud Functions vs Cloud Run — which should I use?**

Cloud Functions is simpler for event-driven workloads (HTTP, Pub/Sub, Storage triggers). Cloud Run is better for containerized applications, custom runtimes, and long-running processes. Cloud Functions v2 is actually built on Cloud Run.

**What is the maximum timeout for Cloud Functions?**

Gen 2: 60 minutes (default 60 seconds). For longer tasks, use Cloud Run jobs or Cloud Workflows.

**Can I use TypeScript with Cloud Functions?**

Yes. Use `tsconfig.json` and compile to JavaScript before deploying, or use a build step in Cloud Build. The `--source` flag can point to a build directory.

**How do I handle long-running tasks?**

For tasks longer than the timeout, return immediately and offload to Cloud Tasks or Pub/Sub. The function can publish a message, and another function processes it asynchronously.

**How does concurrency work in Gen 2?**

Each instance handles multiple requests simultaneously (up to 80 by default). This means shared state must be thread-safe. Use connection pooling for databases — one pool per instance, shared across concurrent requests.

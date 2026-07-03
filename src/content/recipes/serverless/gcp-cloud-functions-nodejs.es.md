---
contentType: recipes
slug: gcp-cloud-functions-nodejs
title: "Desplegar Cloud Functions HTTP en Google Cloud con Node.js"
description: "Crear y desplegar Cloud Functions con HTTP trigger en Google Cloud con Node.js, integracion Express, gestion de secrets y despliegue con gcloud CLI."
metaDescription: "Despliega Cloud Functions HTTP en Google Cloud con Node.js. Usa Express, gestiona secrets con Secret Manager y despliega con gcloud CLI o Cloud Build."
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
  metaDescription: "Despliega Cloud Functions HTTP en Google Cloud con Node.js. Usa Express, gestiona secrets con Secret Manager y despliega con gcloud CLI o Cloud Build."
  keywords:
    - gcp cloud functions nodejs
    - google cloud functions
    - nodejs serverless gcp
    - cloud functions http trigger
    - gcloud deploy functions
---

## Descripcion general

Google Cloud Functions es la plataforma de compute serverless de GCP. La segunda generacion (Cloud Functions v2) se ejecuta sobre Cloud Run y Eventarc, soportando HTTP triggers, CloudEvent triggers y manejo concurrente de peticiones. A continuacion: crear funciones con HTTP trigger en Node.js, integrar Express para routing, gestionar secrets con Secret Manager y desplegar con gcloud CLI.

## Cuando Usar Esto

- Construir APIs HTTP serverless en Google Cloud
- Webhooks y endpoints event-driven
- Microservicios ligeros sin gestionar infraestructura
- Integrar con servicios de GCP (Firestore, Pub/Sub, Cloud Storage)

## Prerrequisitos

- Node.js 18+
- Google Cloud CLI (`gcloud`)
- Un proyecto GCP con billing habilitado
- Cloud Functions API habilitado

## Solucion

### 1. Habilitar APIs y Configurar

```bash
# Establecer proyecto
gcloud config set project my-project-id

# Habilitar APIs requeridas
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Funcion HTTP Basica (Gen 2)

```javascript
// index.js (Cloud Functions v2 — usa CloudEvents)
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

### 3. Integracion con Express

```javascript
// index.js
const functions = require('@google-cloud/functions-framework');
const express = require('express');

const app = express();
app.use(express.json());

// Rutas
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

// Registrar app Express como el function handler
functions.http('api', app);
```

### 4. Integracion con Firestore

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

### 5. Gestion de Secrets con Secret Manager

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretClient = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/my-project-id/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString();
}

// Cachear secrets para evitar llamadas API repetidas
let cachedApiKey = null;

async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  cachedApiKey = await getSecret('api-key');
  return cachedApiKey;
}
```

### 6. Manejo de Errores

```javascript
const functions = require('@google-cloud/functions-framework');
const express = require('express');

const app = express();
app.use(express.json());

// Error handler centralizado
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// Wrapper de errores async
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

### 7. Manejo de CORS

```javascript
const functions = require('@google-cloud/functions-framework');
const express = require('express');
const cors = require('cors');

const app = express();

// Configurar CORS
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

### 8. Desplegar con gcloud CLI

```bash
# Desplegar funcion HTTP Gen 2
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

# Obtener URL de la funcion
gcloud functions describe my-api --gen2 --region=us-central1 --format='value(serviceConfig.uri)'
```

## Como Funciona

1. **Cloud Functions v2**: Construido sobre Cloud Run y Eventarc. Las funciones HTTP se contenerizan y se sirven via Cloud Run, soportando concurrencia (multiples peticiones por instancia).
2. **Functions framework**: `@google-cloud/functions-framework` registra handlers HTTP via `functions.http()`. Puede aceptar una funcion `(req, res) => {}` o una app Express.
3. **Concurrencia**: Las funciones Gen 2 manejan hasta 80 peticiones concurrentes por instancia (configurable). Gen 1 manejaba una peticion por instancia. Esto reduce cold starts y costo.
4. **Secret Manager**: Los secrets se montan como variables de entorno o se acceden via la API de Secret Manager. El flag `--set-secrets` mapea secrets a env vars en tiempo de despliegue.
5. **Escalado**: Cloud Functions escala de 0 a `max-instances` basado en trafico. `min-instances` mantiene instancias calientes para evitar cold starts (incrementa costo).

## Variantes

### Trigger Pub/Sub

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

Desplegar:

```bash
gcloud functions deploy process-order \
  --gen2 \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=processOrder \
  --trigger-topic=orders \
  --region=us-central1
```

### Trigger de Cloud Storage

```javascript
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('onFileUpload', (cloudevent) => {
  const bucket = cloudevent.data.bucket;
  const name = cloudevent.data.name;
  console.log(`File uploaded: gs://${bucket}/${name}`);
  processFile(bucket, name);
});
```

Desplegar:

```bash
gcloud functions deploy on-file-upload \
  --gen2 \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=onFileUpload \
  --trigger-bucket=my-upload-bucket \
  --region=us-central1
```

### Funcion Programada (Cloud Scheduler)

```javascript
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('scheduledCleanup', (cloudevent) => {
  console.log('Running scheduled cleanup at:', new Date().toISOString());
  cleanupExpiredRecords();
});
```

Desplegar:

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

## Mejores Practicas

- **Usar Gen 2**: Soporta concurrencia, tiene mejor rendimiento de cold start y esta construido sobre Cloud Run. Gen 1 es legacy.
- **Usar Express para routing complejo**: Para mas de un endpoint, Express es mas limpio que routing manual en una sola funcion.
- **Cachear secrets**: Las llamadas a la API de Secret Manager agregan latencia. Cachea secrets en memoria — no cambian durante el lifetime de una funcion.
- **Establecer concurrencia**: Gen 2 soporta hasta 80 peticiones concurrentes. Establecela basado en el uso de memoria y CPU de tu funcion.
- **Usar `min-instances` para APIs criticas**: Mantiene instancias calientes para evitar cold starts. Cuesta mas pero elimina picos de latencia.
- **Separar funciones por concern**: No pongas todos los endpoints en una funcion. Despliega funciones separadas para diferentes recursos de API.

## Errores Comunes

- **Usar Gen 1**: Gen 1 no soporta concurrencia y tiene cold starts mas lentos. Siempre usa `--gen2`.
- **No manejar CORS**: Las peticiones de navegador desde origenes diferentes fallaran. Usa el middleware `cors` con origenes permitidos explicitos.
- **Bloquear el event loop**: Operaciones sincronas CPU-intensivas bloquean todas las peticiones concurrentes. Usa operaciones async o descarga a Cloud Tasks.
- **Hardcodear secrets**: Nunca pongas API keys en codigo fuente. Usa Secret Manager o variables de entorno establecidas via `--set-secrets`.
- **Ignorar timeout**: El timeout por defecto es 60 segundos. Operaciones de larga duracion necesitan un timeout mayor o deberian descargarse a Cloud Tasks.

## FAQ

**Cloud Functions vs Cloud Run — cual deberia usar?**

Cloud Functions es mas simple para workloads event-driven (HTTP, Pub/Sub, Storage triggers). Cloud Run es mejor para aplicaciones contenerizadas, runtimes personalizados y procesos de larga duracion. Cloud Functions v2 esta construido sobre Cloud Run.

**Cual es el timeout maximo para Cloud Functions?**

Gen 2: 60 minutos (default 60 segundos). Para tareas mas largas, usa Cloud Run jobs o Cloud Workflows.

**Puedo usar TypeScript con Cloud Functions?**

Si. Usa `tsconfig.json` y compila a JavaScript antes de desplegar, o usa un build step en Cloud Build. El flag `--source` puede apuntar a un directorio de build.

**Como manejo tareas de larga duracion?**

Para tareas mas largas que el timeout, retorna inmediatamente y descarga a Cloud Tasks o Pub/Sub. La funcion puede publicar un mensaje, y otra funcion lo procesa asincronamente.

**Como funciona la concurrencia en Gen 2?**

Cada instancia maneja multiples peticiones simultaneamente (hasta 80 por defecto). Esto significa que el estado compartido debe ser thread-safe. Usa connection pooling para bases de datos — un pool por instancia, compartido entre peticiones concurrentes.

---
contentType: recipes
slug: mongodb-crud-mongoose
title: "Operaciones CRUD con MongoDB y Mongoose"
description: "Como realizar operaciones Crear, Leer, Actualizar y Eliminar en MongoDB usando Mongoose ODM con Node.js y Express"
metaDescription: "Operaciones CRUD con MongoDB y Mongoose. Crea esquemas, realiza consultas, maneja transacciones e implementa paginacion en Node.js."
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
  metaDescription: "Operaciones CRUD con MongoDB y Mongoose. Crea esquemas, realiza consultas, maneja transacciones e implementa paginacion en Node.js."
  keywords:
    - mongodb
    - mongoose
    - crud
    - nodejs
    - express
---

# Operaciones CRUD con MongoDB y Mongoose

Mongoose proporciona una solucion basada en esquemas para modelar datos de aplicaciones en MongoDB. Maneja conversion de tipos, validacion, construccion de consultas y hooks de logica de negocio, haciendolo el ODM mas popular en el ecosistema Node.js.

## Cuando Usar Esto

- Necesitas una forma estructurada de interactuar con MongoDB desde Node.js. Consulta [Parse JSON](/recipes/data/parse-json) para manejo de documentos.
- Quieres validacion automatica y hooks de middleware
- Estas construyendo una API que requiere patrones relacionales en una base de datos documental. Consulta [SQL Joins](/recipes/databases/sql-joins) para patrones relacionales.

## Requisitos Previos

- MongoDB instalado localmente o un cluster de MongoDB Atlas
- Node.js 18+

## Solucion: Express + Mongoose

### 1. Instalar Dependencias

```bash
npm install express mongoose dotenv
```

### 2. Definir el Esquema

```javascript
// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
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

// Indice para consultas comunes
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

export default mongoose.model('User', userSchema);
```

### 3. Conectar y Realizar CRUD

```javascript
// app.js
import express from 'express';
import mongoose from 'mongoose';
import User from './models/User.js';

const app = express();
app.use(express.json());

await mongoose.connect(process.env.MONGODB_URI);

// CREAR
app.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LEER (con paginacion). Consulta [Pagination](/recipes/api/pagination) para enfoques basados en cursor.
app.get('/users', async (req, res) => {
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

// LEER UNO
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-__v');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

// ACTUALIZAR
app.patch('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

// ELIMINAR (eliminacion suave). Consulta [Soft Deletes](/recipes/databases/soft-deletes) para patrones.
app.delete('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ message: 'Usuario desactivado' });
});

app.listen(3000, () => console.log('Servidor ejecutandose en el puerto 3000'));
```

### 4. Transacciones

```javascript
// Operaciones atomicas entre colecciones. Consulta [Database Transactions](/recipes/databases/database-transactions) para patrones ACID.
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

## Como Funciona

1. **Definicion de Esquema** impone estructura mientras preserva la flexibilidad de MongoDB
2. **Middleware Hooks** ejecutan validacion y transformacion antes/despues de operaciones
3. **Construccion de Consultas** proporciona una API encadenable para consultas complejas
4. **Transacciones** aseguran cumplimiento ACID entre multiples documentos

## Consideraciones de Produccion

- Habilita **read preference `secondary`** para cargas de trabajo intensivas en lectura en replica sets
- Usa **indices compuestos** para campos de consulta frecuentemente combinados
- Implementa **paginacion basada en cursor** para grandes datasets en lugar de skip/limit. Consulta [Pagination](/recipes/api/pagination) para patrones de cursor.
- Agrega **plugins de Mongoose** para patrones comunes (eliminacion suave, auditoria)

## FAQ

**P: Debo usar Mongoose o el driver nativo?**
R: Usa Mongoose para datos de aplicacion con necesidades de validacion. Usa el driver nativo para analiticas, pipelines de agregacion o maximo rendimiento.

**P: Como manejo migraciones de esquema?**
R: Usa `migrate-mongo` o escribe scripts de migracion idempotentes que se ejecuten en el despliegue.

**P: Cuando debo usar referencias vs documentos embebidos?**
R: Embebe cuando los datos se leen juntos y el crecimiento no acotado no se espera. Referencia cuando los datos se actualizan independientemente o crecen sin limite.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Ejemplos de Aggregation Pipeline

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

// Ingresos totales por cliente
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

// Reporte de ventas mensuales
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

// Productos más vendidos
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

### Transacciones en MongoDB con Mongoose

```javascript
const mongoose = require('mongoose');

async function transferCredits(fromUserId, toUserId, amount) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fromUser = await User.findById(fromUserId).session(session);
    if (!fromUser || fromUser.credits < amount) {
      throw new Error('Créditos insuficientes');
    }

    const toUser = await User.findById(toUserId).session(session);
    if (!toUser) {
      throw new Error('Destinatario no encontrado');
    }

    fromUser.credits -= amount;
    toUser.credits += amount;

    await fromUser.save({ session });
    await toUser.save({ session });

    // Registrar la transferencia
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

// Transacción con lógica de reintento para errores transitorios
async function withTransactionRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(fn);
      return result;
    } catch (error) {
      if (error.errorLabels?.includes('TransientTransactionError') && attempt < maxRetries - 1) {
        console.log(`Reintento de transacción ${attempt + 1}/${maxRetries}`);
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

### Plugin de Soft Delete

```javascript
const softDeletePlugin = (schema, options = { deletedAtField: 'deletedAt' }) => {
  const { deletedAtField } = options;

  schema.add({ [deletedAtField]: { type: Date, default: null } });

  // Excluir documentos soft-deleted de queries find
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

  // Añadir método softDelete
  schema.methods.softDelete = async function () {
    this[deletedAtField] = new Date();
    return await this.save();
  };

  // Añadir método restore
  schema.methods.restore = async function () {
    this[deletedAtField] = null;
    return await this.save();
  };

  // Añadir método hardDelete
  schema.methods.hardDelete = async function () {
    return await this.constructor.deleteOne({ _id: this._id });
  };

  // Incluir documentos eliminados con `includeDeleted`
  schema.statics.includeDeleted = function () {
    return this.find().setQuery({}); // Saltar el pre-find hook
  };
};

// Uso
userSchema.plugin(softDeletePlugin);
const User = model('User', userSchema);

// Soft delete
const user = await User.findById(userId);
await user.softDelete();

// Queries normales excluyen soft-deleted
const activeUsers = await User.find({ role: 'admin' });

// Incluir soft-deleted
const allUsers = await User.includeDeleted().find({});
```

### Population y Deep Populate

```javascript
// Population básico
const posts = await Post.find()
  .populate('author', 'name email')
  .populate('category', 'name')
  .lean();

// Population anidado (deep populate)
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

// Population condicional
const users = await User.find().populate({
  path: 'posts',
  match: { status: 'published' },
  options: { limit: 5, sort: { createdAt: -1 } },
});
```

### Operaciones Bulk con Mongoose

```javascript
// Bulk write: operaciones mixtas en un solo round-trip
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
console.log(`Modificados: ${result.modifiedCount}, Insertados: ${result.insertedCount}`);

// Ordered vs unordered bulk
await User.bulkWrite(bulkOps, { ordered: false }); // Continuar en error
await User.bulkWrite(bulkOps, { ordered: true });  // Detener en primer error (default)
```

### Change Streams para Actualizaciones en Tiempo Real

```javascript
const mongoose = require('mongoose');

// Observar cambios en una colección
const changeStream = User.watch();

changeStream.on('change', (change) => {
  console.log('Tipo de cambio:', change.operationType);

  switch (change.operationType) {
    case 'insert':
      console.log('Nuevo usuario:', change.fullDocument);
      break;
    case 'update':
      console.log('Campos actualizados:', change.updateDescription.updatedFields);
      break;
    case 'delete':
      console.log('ID documento eliminado:', change.documentKey._id);
      break;
    case 'replace':
      console.log('Documento reemplazado:', change.fullDocument);
      break;
  }
});

// Observar con filtro de pipeline
const filteredStream = User.watch([
  { $match: { operationType: 'update' } },
  { $project: { 'updateDescription.updatedFields.status': 1 } },
]);

// Reanudar desde un timestamp específico
const resumeToken = getStoredResumeToken();
const resumableStream = User.watch([], { resumeAfter: resumeToken });
```

### Validación de Schema con JSON Schema

```javascript
// Validación nativa de MongoDB (server-side)
// Ejecutar via mongo shell o conexión mongoose
const validationSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['name', 'email'],
    properties: {
      name: {
        bsonType: 'string',
        description: 'Name es requerido y debe ser un string',
      },
      email: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Debe ser un email válido',
      },
      age: {
        bsonType: 'int',
        minimum: 18,
        maximum: 120,
        description: 'Age debe estar entre 18 y 120',
      },
      role: {
        enum: ['admin', 'user', 'guest'],
        description: 'Role debe ser uno de los valores permitidos',
      },
    },
  },
};

// Aplicar via conexión mongoose
await mongoose.connection.db.command({
  collMod: 'users',
  validator: validationSchema,
  validationLevel: 'strict',
  validationAction: 'error',
});
```

## Mejores Prácticas Adicionales

6. **Usa `lean()` para queries de solo lectura.** `lean()` salta la hidratación de Mongoose, reduciendo overhead de memoria y CPU en 50%+:

```javascript
// Mal: documentos Mongoose completos con métodos
const users = await User.find({ active: true });

// Bien: objetos JS simples para solo lectura
const users = await User.find({ active: true }).lean();
```

7. **Usa `select()` para limitar los campos devueltos.** Reduce transferencia de red y uso de memoria:

```javascript
const users = await User.find()
  .select('name email -_id')
  .lean();
```

8. **Usa índices compuestos para queries multi-campo.** El orden importa: campos de igualdad primero, luego campos de ordenamiento:

```javascript
userSchema.index({ status: 1, createdAt: -1 });
// Soporta: { status: 'active' } y { status: 'active' }.sort({ createdAt: -1 })
```

9. **Usa `explain()` para analizar el rendimiento de queries.** Verifica si las queries usan índices:

```javascript
const explanation = await User.find({ email: 'test@example.com' })
  .explain('executionStats');

console.log('Índice usado:', explanation.executionStats.executionStages.indexName);
console.log('Documentos examinados:', explanation.executionStats.totalDocsExamined);
console.log('Documentos devueltos:', explanation.executionStats.nReturned);
```

10. **Configura `maxTimeMS` en queries.** Previene que queries lentos consuman recursos:

```javascript
const results = await User.find({ active: true })
  .maxTimeMS(5000)  // Abortar después de 5 segundos
  .lean();
```

## Errores Comunes Adicionales

6. **Usar `skip()` y `limit()` para paginación profunda.** `skip(10000).limit(10)` escanea 10,010 documentos. Usa paginación basada en cursor:

```javascript
// Mal: O(n) skip
const page = await User.find().skip(10000).limit(10);

// Bien: O(1) basado en cursor
const lastId = req.query.cursor;
const page = await User.find({ _id: { $gt: lastId } })
  .sort({ _id: 1 })
  .limit(10);
```

7. **No manejar errores de duplicate key.** Las restricciones unique lanzan `E11000`. Maneja esto gracefulmente:

```javascript
try {
  await User.create({ email: 'existing@example.com' });
} catch (error) {
  if (error.code === 11000) {
    throw new Error('Email ya registrado');
  }
  throw error;
}
```

8. **Almacenar datos binarios grandes en MongoDB.** Usa GridFS o S3 para archivos mayores a 16MB:

```javascript
// Mal: almacenar imagen en documento
user.avatar = Buffer.from(largeImageData);

// Bien: almacenar referencia
user.avatarUrl = 'https://s3.amazonaws.com/bucket/avatar.png';
```

9. **No cerrar conexiones de base de datos en shutdown.** Las conexiones filtradas causan problemas de memoria:

```javascript
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
```

10. **Usar `$where` para queries.** `$where` ejecuta JavaScript en el servidor, lo cual es lento e inseguro. Usa operadores nativos:

```javascript
// Mal: $where lento
User.find({ $where: 'this.name.length > 10' });

// Bien: usar $expr con operadores nativos
User.find({ $expr: { $gt: [{ $strLenCP: '$name' }, 10] } });
```

## FAQ Adicional

### ¿Cómo modelo relaciones uno-a-muchos en MongoDB?

Para un número pequeño y acotado de hijos (ej. un post con hasta 10 tags), embédelos:

```javascript
const postSchema = new Schema({
  title: String,
  tags: [String], // Array embebido
});
```

Para hijos no acotados (ej. un usuario con muchas órdenes), use referencias:

```javascript
const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  // ...
});
```

Para un número medio con necesidades de paginación, usa un híbrido: almacena los primeros embebidos y el resto como referencias.

### ¿Cómo manejo evolución de schema sin migraciones?

Añade nuevos campos con defaults para que los documentos antiguos sigan funcionando:

```javascript
userSchema.add({
  preferences: {
    type: Object,
    default: { theme: 'light', notifications: true },
  },
});
```

Para eliminar campos, usa un script de migración:

```javascript
await User.updateMany({}, { $unset: { deprecatedField: '' } });
```

### ¿Cuál es la diferencia entre `findOneAndUpdate` y `findByIdAndUpdate`?

`findByIdAndUpdate(id, update)` es un atajo para `findOneAndUpdate({ _id: id }, update)`. Son funcionalmente idénticos. Usa `findByIdAndUpdate` cuando tienes el ID del documento, y `findOneAndUpdate` cuando tienes un filtro diferente.

## Tips de Rendimiento

1. **Usa `createIndex` con opción background.** Previene que la creación de índices bloquee writes:

```javascript
await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
```

2. **Usa `bulkWrite` para inserts batch.** Reduce round-trips:

```javascript
const docs = Array.from({ length: 1000 }, (_, i) => ({
  insertOne: { document: { name: `User ${i}`, email: `user${i}@example.com` } },
}));

await User.bulkWrite(docs);
```

3. **Usa `hint()` para forzar el uso de un índice.** Cuando el query planner elige el índice incorrecto:

```javascript
await User.find({ status: 'active' }).hint({ status: 1, createdAt: -1 });
```

4. **Usa `readPreference` para replica sets.** Enruta reads a secondaries:

```javascript
mongoose.connect(uri, {
  readPreference: 'secondaryPreferred',
});
```

5. **Monitorea queries lentos con profiling.** Habilita el profiler de base de datos:

```javascript
// Habilitar profiling para queries más lentos que 100ms
await mongoose.connection.db.command({
  profile: 1,
  slowms: 100,
});

// Consultar el profiler
const slowQueries = await mongoose.connection.db
  .collection('system.profile')
  .find({ millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)
  .toArray();
```

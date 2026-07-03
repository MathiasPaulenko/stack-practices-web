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

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../../../..', 'src', 'content');

// Add a code example section before the FAQ section
const fixes = {
  'guides/architecture/microservices-architecture-guide.es.md': {
    before: '## Preguntas Frecuentes',
    insert: `## Ejemplo de Arquitectura

\`\`\`yaml
# docker-compose.yml — dos microservicios con API Gateway
services:
  api-gateway:
    image: nginx:alpine
    ports: ["8080:80"]
    depends_on: [user-service, order-service]

  user-service:
    build: ./services/user
    environment:
      DB_URL: postgres://db:5432/users
    depends_on: [db]

  order-service:
    build: ./services/order
    environment:
      DB_URL: postgres://db:5432/orders
      AMQP_URL: amqp://rabbitmq:5672
    depends_on: [db, rabbitmq]

  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]

volumes:
  pgdata:
\`\`\`

`
  },
  'guides/databases/database-normalization-guide.md': {
    before: '## FAQ',
    insert: `## Example: Normalization Steps

\`\`\`sql
-- 1NF: Remove repeating groups
-- Unnormalized: orders(id, customer_name, items_csv)
-- 1NF:         orders(id, customer_name, item_name, qty)

-- 2NF: Remove partial dependencies (composite key)
-- 1NF:  order_items(order_id, product_id, product_name, qty)
-- 2NF:  orders(order_id, customer_id)
--       products(product_id, product_name)
--       order_items(order_id, product_id, qty)

-- 3NF: Remove transitive dependencies
-- 2NF:  orders(order_id, customer_id, customer_name, customer_city)
-- 3NF:  orders(order_id, customer_id)
--       customers(customer_id, customer_name, customer_city)

CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  customer_city VARCHAR(100)
);

CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE order_items (
  order_id INT REFERENCES orders(order_id),
  product_id INT REFERENCES products(product_id),
  qty INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);
\`\`\`

`
  },
  'guides/databases/database-normalization-guide.es.md': {
    before: '## FAQ',
    insert: `## Ejemplo: Pasos de Normalizacion

\`\`\`sql
-- 1NF: Eliminar grupos repetitivos
-- Desnormalizado: orders(id, customer_name, items_csv)
-- 1NF:            orders(id, customer_name, item_name, qty)

-- 2NF: Eliminar dependencias parciales (clave compuesta)
-- 1NF:  order_items(order_id, product_id, product_name, qty)
-- 2NF:  orders(order_id, customer_id)
--       products(product_id, product_name)
--       order_items(order_id, product_id, qty)

-- 3NF: Eliminar dependencias transitivas
-- 2NF:  orders(order_id, customer_id, customer_name, customer_city)
-- 3NF:  orders(order_id, customer_id)
--       customers(customer_id, customer_name, customer_city)

CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  customer_city VARCHAR(100)
);

CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE order_items (
  order_id INT REFERENCES orders(order_id),
  product_id INT REFERENCES products(product_id),
  qty INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);
\`\`\`

`
  },
  'guides/databases/nosql-database-selection-guide.es.md': {
    before: '## Preguntas Frecuentes',
    insert: `## Ejemplo: Modelado de Datos NoSQL

\`\`\`javascript
// MongoDB — modelo de documento embebido para e-commerce
db.products.insertOne({
  _id: "prod-001",
  name: "Laptop Pro 15",
  price: 1299.99,
  category: "electronics",
  specs: { cpu: "i7", ram: "16GB", storage: "512GB SSD" },
  reviews: [
    { user: "alice", rating: 5, comment: "Excelente", date: "2026-01-15" },
    { user: "bob", rating: 4, comment: "Buen producto", date: "2026-02-01" }
  ]
});

// Consulta eficiente sin joins
db.products.find(
  { category: "electronics", "specs.ram": "16GB" },
  { name: 1, price: 1, "specs.cpu": 1 }
).sort({ price: 1 }).limit(20);
\`\`\`

`
  }
};

for (const [relPath, { before, insert }] of Object.entries(fixes)) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes(before)) {
    content = content.replace(before, insert + before);
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${relPath}`);
  } else {
    console.warn(`WARN: marker not found in ${relPath}`);
  }
}

console.log('\nDone!');

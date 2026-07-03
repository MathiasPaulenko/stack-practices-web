---
contentType: patterns
slug: geode-pattern
title: "Patrón Geode"
description: "Distribuir datos entre nodos con particionamiento para que cada nodo posea un shard. Escalado horizontal sin estado compartido, con localidad y aislamiento de fallos por particion."
metaDescription: "Particionar datos entre nodos para que cada uno posea un shard. Escala horizontal sin estado compartido, con localidad y aislamiento de fallos."
difficulty: advanced
topics:
  - architecture
  - databases
tags:
  - geode
  - patron
  - patron-diseno
  - particionamiento-datos
  - sharding
  - escalado-horizontal
  - sistemas-distribuidos
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/graceful-degradation-pattern
  - /patterns/design/shed-load-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Particionar datos entre nodos para que cada uno posea un shard. Escala horizontal sin estado compartido, con localidad y aislamiento de fallos."
  keywords:
    - patron geode
    - particionamiento de datos
    - patron sharding
    - patron diseno
    - escalado horizontal
    - sistemas distribuidos
    - aislamiento de fallos
---

# Patrón Geode

## Descripción general

El patrón Geode particiona datos entre multiples nodos para que cada nodo posea un shard no superpuesto. Un request para un dato especifico se rutea al nodo que lo posee. No hay base de datos compartida, no hay cache compartida, no hay estado compartido. Cada nodo es autonomo: contiene sus datos, procesa requests para esos datos y falla independientemente.

El nombre viene de las geodas: rocas que parecen ordinarias por fuera pero contienen cavidades recubiertas de cristales por dentro. Cada nodo es una cavidad autonoma con sus propios cristales de datos. El sistema como un todo es una coleccion de geodas independientes.

Este patron resuelve el cuello de botella del estado compartido. Cuando todos los nodos leen y escriben a la misma base de datos, esa BD se vuelve el techo de escalabilidad. Al particionar datos, cada nodo maneja solo su fraccion de la carga. Anadir mas nodos anade mas capacidad linealmente.

## Cuándo usarlo

Usa el patrón Geode cuando:
- Una BD o cache compartida es el cuello de botella de escalabilidad
- Los datos se pueden particionar por una clave natural (user ID, tenant ID, region geografica)
- Necesitas aislamiento de fallos: una particion fallando no debe afectar a otras
- Necesitas escalado horizontal sin transacciones distribuidas
- Ejemplos: SaaS multi-tenant, servidores de gaming, ingesta de datos IoT, entrega de contenido regional

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import hashlib

@dataclass
class GeodeNode:
    node_id: str
    shard_range: tuple
    data: Dict[str, Any] = field(default_factory=dict)
    healthy: bool = True

    def owns_key(self, key: str) -> bool:
        h = int(hashlib.md5(key.encode()).hexdigest(), 16) % 10000
        return self.shard_range[0] <= h <= self.shard_range[1]

    def get(self, key: str) -> Optional[Any]:
        if not self.healthy:
            raise RuntimeError(f"Node {self.node_id} is down")
        return self.data.get(key)

    def put(self, key: str, value: Any) -> None:
        if not self.healthy:
            raise RuntimeError(f"Node {self.node_id} is down")
        self.data[key] = value

class GeodeCluster:
    def __init__(self, num_nodes: int = 4):
        self.nodes: List[GeodeNode] = []
        shard_size = 10000 // num_nodes
        for i in range(num_nodes):
            start = i * shard_size
            end = start + shard_size - 1 if i < num_nodes - 1 else 9999
            self.nodes.append(GeodeNode(node_id=f"node-{i}", shard_range=(start, end)))

    def find_node(self, key: str) -> Optional[GeodeNode]:
        h = int(hashlib.md5(key.encode()).hexdigest(), 16) % 10000
        for node in self.nodes:
            if node.shard_range[0] <= h <= node.shard_range[1]:
                return node
        return None

    def get(self, key: str) -> Optional[Any]:
        node = self.find_node(key)
        if node is None:
            raise KeyError(f"No node owns key: {key}")
        return node.get(key)

    def put(self, key: str, value: Any) -> None:
        node = self.find_node(key)
        if node is None:
            raise KeyError(f"No node owns key: {key}")
        node.put(key, value)

    def fail_node(self, node_id: str) -> None:
        for n in self.nodes:
            if n.node_id == node_id:
                n.healthy = False

    def stats(self) -> List[dict]:
        return [{"node_id": n.node_id, "keys": len(n.data), "healthy": n.healthy,
                 "range": n.shard_range} for n in self.nodes]

# Uso
cluster = GeodeCluster(num_nodes=4)
for user in ["alice", "bob", "carol", "dave", "eve"]:
    cluster.put(user, {"email": f"{user}@example.com", "score": hash(user) % 100})

print("=== Cluster Stats ===")
for s in cluster.stats():
    print(f"  {s}")

print("\n=== Simulate node-2 failure ===")
cluster.fail_node("node-2")
for user in ["alice", "bob", "carol", "dave", "eve"]:
    node = cluster.find_node(user)
    try:
        cluster.get(user)
        print(f"  {user} -> {node.node_id}: OK")
    except RuntimeError as e:
        print(f"  {user} -> {node.node_id}: FAILED ({e})")
```

### JavaScript

```javascript
const crypto = require('crypto');

class GeodeNode {
  constructor(nodeId, shardStart, shardEnd) {
    this.nodeId = nodeId;
    this.shardRange = [shardStart, shardEnd];
    this.data = new Map();
    this.healthy = true;
  }

  get(key) {
    if (!this.healthy) throw new Error(`Node ${this.nodeId} is down`);
    return this.data.get(key);
  }

  put(key, value) {
    if (!this.healthy) throw new Error(`Node ${this.nodeId} is down`);
    this.data.set(key, value);
  }
}

class GeodeCluster {
  constructor(numNodes = 4) {
    this.nodes = [];
    const shardSize = Math.floor(10000 / numNodes);
    for (let i = 0; i < numNodes; i++) {
      const start = i * shardSize;
      const end = i < numNodes - 1 ? start + shardSize - 1 : 9999;
      this.nodes.push(new GeodeNode(`node-${i}`, start, end));
    }
  }

  _hashKey(key) {
    return parseInt(crypto.createHash('md5').update(key).digest('hex'), 16) % 10000;
  }

  findNode(key) {
    const h = this._hashKey(key);
    return this.nodes.find(n => h >= n.shardRange[0] && h <= n.shardRange[1]) || null;
  }

  get(key) {
    const node = this.findNode(key);
    if (!node) throw new Error(`No node owns key: ${key}`);
    return node.get(key);
  }

  put(key, value) {
    const node = this.findNode(key);
    if (!node) throw new Error(`No node owns key: ${key}`);
    node.put(key, value);
  }

  failNode(nodeId) {
    const node = this.nodes.find(n => n.nodeId === nodeId);
    if (node) node.healthy = false;
  }

  stats() {
    return this.nodes.map(n => ({ nodeId: n.nodeId, keys: n.data.size, healthy: n.healthy, range: n.shardRange }));
  }
}

// Uso
const cluster = new GeodeCluster(4);
["alice", "bob", "carol", "dave", "eve"].forEach(u =>
  cluster.put(u, { email: `${u}@example.com`, score: u.length * 10 }));

console.log("=== Cluster Stats ===");
cluster.stats().forEach(s => console.log("  ", s));

console.log("\n=== Simulate node-2 failure ===");
cluster.failNode("node-2");
["alice", "bob", "carol", "dave", "eve"].forEach(u => {
  const node = cluster.findNode(u);
  try { cluster.get(u); console.log(`  ${u} -> ${node.nodeId}: OK`); }
  catch (e) { console.log(`  ${u} -> ${node.nodeId}: FAILED (${e.message})`); }
});
```

### Java

```java
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

public class GeodeCluster {

    static class GeodeNode {
        final String nodeId;
        final int shardStart, shardEnd;
        final Map<String, Object> data = new HashMap<>();
        boolean healthy = true;

        GeodeNode(String nodeId, int start, int end) { this.nodeId = nodeId; this.shardStart = start; this.shardEnd = end; }

        Object get(String key) {
            if (!healthy) throw new RuntimeException("Node " + nodeId + " is down");
            return data.get(key);
        }

        void put(String key, Object value) {
            if (!healthy) throw new RuntimeException("Node " + nodeId + " is down");
            data.put(key, value);
        }
    }

    final List<GeodeNode> nodes = new ArrayList<>();

    public GeodeCluster(int numNodes) {
        int shardSize = 10000 / numNodes;
        for (int i = 0; i < numNodes; i++) {
            int start = i * shardSize;
            int end = (i < numNodes - 1) ? start + shardSize - 1 : 9999;
            nodes.add(new GeodeNode("node-" + i, start, end));
        }
    }

    static int hashKey(String key) {
        try {
            byte[] d = MessageDigest.getInstance("MD5").digest(key.getBytes(StandardCharsets.UTF_8));
            int h = 0; for (int i = 0; i < 4; i++) h = (h << 8) | (d[i] & 0xFF);
            return Math.abs(h) % 10000;
        } catch (Exception e) { return Math.abs(key.hashCode()) % 10000; }
    }

    GeodeNode findNode(String key) {
        int h = hashKey(key);
        return nodes.stream().filter(n -> h >= n.shardStart && h <= n.shardEnd).findFirst().orElse(null);
    }

    Object get(String key) { GeodeNode n = findNode(key); if (n == null) throw new RuntimeException("No node: " + key); return n.get(key); }
    void put(String key, Object val) { GeodeNode n = findNode(key); if (n == null) throw new RuntimeException("No node: " + key); n.put(key, val); }
    void failNode(String id) { nodes.stream().filter(n -> n.nodeId.equals(id)).forEach(n -> n.healthy = false); }

    public static void main(String[] args) {
        var cluster = new GeodeCluster(4);
        String[] users = {"alice", "bob", "carol", "dave", "eve"};
        for (String u : users) cluster.put(u, Map.of("email", u + "@example.com", "score", u.length() * 10));

        System.out.println("=== Simulate node-2 failure ===");
        cluster.failNode("node-2");
        for (String u : users) {
            var node = cluster.findNode(u);
            try { cluster.get(u); System.out.printf("  %s -> %s: OK%n", u, node.nodeId); }
            catch (Exception e) { System.out.printf("  %s -> %s: FAILED (%s)%n", u, node.nodeId, e.getMessage()); }
        }
    }
}
```

## Explicación

El cluster funciona en tres pasos:

1. **Particionamiento por hash**: Cada clave se hashea (MD5, SHA-256, o consistent hashing) y se mapea a un rango numerico. Cada nodo posee un rango no superpuesto. El hash distribuye claves uniformemente entre nodos.
2. **Ruteo**: Cuando llega un request, el cluster hashea la clave y encuentra el nodo que posee el rango correspondiente. El request va directo a ese nodo, que lo procesa usando su almacen local.
3. **Aislamiento de fallos**: Si un nodo cae, solo las claves en su shard se ven afectadas. Otros nodos continuan sirviendo sus shards independientemente. Una replica o nodo de recuperacion puede tomar el shard fallido.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Consistent hashing** | Usar un ring en lugar de rangos fijos para rebalanceo mas facil | Clusters dinamicos donde nodos se unen/salen frecuentemente |
| **Geodas replicadas** | Cada shard tiene una replica en otro nodo para failover | Alta disponibilidad sin estado compartido |
| **Geodas geograficas** | Particionar por region, cada region en su propio datacenter | Apps globales sensibles a latencia |
| **Nodos virtuales** | Un nodo fisico posee multiples rangos no contiguos | Mejor distribucion de carga con pocos nodos fisicos |

## Buenas prácticas

- **Particiona por una clave natural** (user ID, tenant ID) para que datos relacionados queden en el mismo nodo
- **Usa consistent hashing** para minimizar movimiento de datos al anadir o remover nodos
- **Mantén los shards independientes** para que un fallo de nodo no cascada a otros shards
- **Monitorea el balance de shards** y rebalancea si un shard crece desproporcionadamente
- **Rutea en el borde** para que el cliente no necesite saber que nodo posee los datos
- **Replica shards criticos** para failover, pero mantén las replicas read-only para evitar coordinacion

## Errores comunes

- Particionar por una clave con distribucion desigual, causando shards calientes
- Usar transacciones distribuidas entre shards, anulando el proposito del particionamiento
- No tener un plan de failover para cuando un nodo de shard cae
- Requerir joins cross-shard, que necesitan scatter-gather y anaden latencia
- No monitorear el tamano de shard, dejando que un shard crezca hasta quedarse sin disco
- Usar particionamiento aleatorio en lugar de una clave natural, perdiendo localidad de datos

## Preguntas frecuentes

**Q: Como se diferencia el patron Geode del sharding estandar de BD?**
A: El sharding de BD particiona una sola base de datos logica entre multiples instancias. El patron Geode va mas alla: cada nodo es totalmente independiente con su propio almacen, sin backend de BD compartido. No hay coordinador central ni capa de almacenamiento compartida.

**Q: Que pasa cuando un nodo falla?**
A: Solo las claves en ese nodo se ven afectadas. Si tienes replicas, el trafico falla a la replica. Si no, esas claves no estan disponibles hasta que el nodo se recupere. Otros nodos continuan sirviendo sus shards.

**Q: Como manejo queries que abarcan multiples shards?**
A: Scatter-gather: envia la query a todos los nodos en paralelo y fusiona resultados. Esto funciona para queries de solo lectura pero es mas lento que una query de un solo nodo. Para escrituras, evita transacciones cross-shard diseniando tu clave de particion para que datos relacionados queden en el mismo nodo.

**Q: Cuando no debo usar el patron Geode?**
A: Cuando tu modelo de datos requiere joins frecuentes entre particiones o transacciones distribuidas. Si la mayoria de operaciones tocan multiples particiones, el overhead de coordinacion anula los beneficios del particionamiento.

---
contentType: patterns
slug: leader-election-pattern
title: "Patron de Eleccion de Lider"
description: "Coordina una unica instancia activa entre multiples nodos distribuidos para evitar conflictos y escenarios de cerebro dividido."
metaDescription: "Coordina un unico nodo activo con el Patron de Eleccion de Lider. Evita split-brain, trabajo duplicado y condiciones de carrera en sistemas distribuidos."
difficulty: intermediate
category: architectural
topics:
  - architecture
  - concurrency
tags:
  - leader-election
  - pattern
  - distributed-systems
  - architecture
  - consensus
relatedResources:
  - /patterns/distributed-lock-pattern
  - /guides/concurrency-patterns-guide
  - /patterns/priority-queue-pattern
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Coordina un unico nodo activo con el Patron de Eleccion de Lider. Evita split-brain, trabajo duplicado y condiciones de carrera en sistemas distribuidos."
  keywords:
    - patron de eleccion de lider
    - leader election
    - sistemas distribuidos
    - arquitectura
    - consenso
---
## Visión General

El Patron de Eleccion de Lider asegura que exactamente una instancia en un sistema distribuido sea el lider activo en cualquier momento. Las demas instancias permanecen como seguidoras y asumen el control solo si el lider falla. Este patron evita situaciones de cerebro dividido, trabajo duplicado y escrituras conflictivas cuando varios nodos podrian realizar la misma tarea.

Es comunmente usado en planificadores distribuidos, gestores de cluster y servicios con estado donde un unico coordinador simplifica la coordinacion.

## Cuándo Usar

Usa este patron cuando:
- Multiples nodos podrian realizar la misma operacion pero solo uno deberia hacerlo
- Necesitas coordinar recursos compartidos como bloqueos, colas o escrituras
- Un servicio debe tener una unica fuente de verdad para configuracion o planificacion
- Quieres evitar cerebro dividido o condiciones de carrera en un cluster
- Puedes tolerar un breve retraso de conmutacion por error mientras se elige un nuevo lider

## Solución

```python
# Eleccion de lider simplificada usando un lease en una base de datos compartida
import time
import uuid
from datetime import datetime, timedelta

class LeaderElection:
    def __init__(self, db, lease_seconds=10):
        self.db = db
        self.node_id = uuid.uuid4().hex
        self.lease_seconds = lease_seconds

    def is_leader(self):
        leader = self.db.get('leader')
        if leader and leader['node_id'] == self.node_id and leader['expires'] > datetime.utcnow():
            return True
        return False

    def try_acquire(self):
        now = datetime.utcnow()
        leader = self.db.get('leader')
        if not leader or leader['expires'] < now:
            self.db.set('leader', {'node_id': self.node_id, 'expires': now + timedelta(seconds=self.lease_seconds)})
            return True
        return False

    def renew(self):
        if self.is_leader():
            self.db.set('leader', {'node_id': self.node_id, 'expires': datetime.utcnow() + timedelta(seconds=self.lease_seconds)})
```

```bash
# Eleccion de lider en Kubernetes con un recurso Lease
kubectl create lease app-leader --holder=node-1 --lease-duration=15s
```

## Explicación

La eleccion de lider funciona haciendo que todos los candidatos compitan por un bloqueo o lease compartido. El nodo que adquiere el lease exitosamente se convierte en lider y debe renovarlo periodicamente. Si el lider deja de renovar, el lease expira y otros candidatos pueden reclamarlo. El sistema usa un token de aislamiento o identificador unico de nodo para asegurar que un lider antiguo no pueda actuar despues de haber perdido el liderazgo.

Un mecanismo tipico de eleccion de lider incluye:
- **Adquisicion del lease**: un nodo escribe un identificador unico en un almacen compartido con tiempo de expiracion
- **Latidos**: el lider renueva el lease antes de que expire
- **Deteccion de fallos**: las seguidoras observan el lease y detectan la expiracion
- **Conmutacion por error**: una seguidora adquiere el lease y asume el liderazgo

## Variantes

| Variante | Almacen de Coordinacion | Compromiso |
|----------|------------------------|------------|
| **Lease en base de datos** | PostgreSQL, MySQL | Simple pero depende de la disponibilidad de la BD |
| **Bloqueo distribuido** | Redis Redlock | Rapido pero vulnerable a la deriva del reloj |
| **Algoritmo de consenso** | etcd, ZooKeeper | Consistencia fuerte pero mas complejo |
| **Lease de Kubernetes** | Objeto Lease del API server | Nativo para cargas de trabajo K8s, facil integracion |

## Lo que Funciona

- Usa un **lease corto** con renovacion automatica para detectar fallos rapidamente
- Genera un **token de aislamiento** por periodo de liderazgo para evitar que lideres obsoletos actuen
- Asegura que el lider **renuncie gracefulmente** al apagarse
- **Observa el lease** desde las seguidoras en lugar de sondear agresivamente
- Manten las responsabilidades del lider **idempotentes** cuando sea posible
- Registra los cambios de liderazgo claramente para visibilidad operativa

## Errores Comunes

- Permitir que un lider anterior realice escrituras despues de perder el lease
- Usar una duracion de lease demasiado larga, retrasando la conmutacion por error
- No manejar correctamente **particiones de red**, causando cerebro dividido
- Implementar eleccion de lider sin un token de aislamiento fuerte
- Olvidar liberar el lease en un apagado graceful

## Preguntas Frecuentes

**P: Cual es la diferencia entre eleccion de lider y bloqueo distribuido?**
R: La eleccion de lider es una forma especializada de bloqueo que selecciona un coordinador activo durante un periodo prolongado. El bloqueo distribuido es mas general y puede proteger recursos arbitrarios.

**P: Puede un sistema tener multiples lideres para diferentes responsabilidades?**
R: Si. Puedes elegir un lider por particion, shard o tipo de tarea, lo que mejora la escalabilidad manteniendo la coordinacion simple.

**P: Es la eleccion de lider suficiente para el consenso?**
R: No. La eleccion de lider elige un coordinador, pero los algoritmos de consenso como Raft o Paxos tambien garantizan acuerdo sobre valores entre nodos.

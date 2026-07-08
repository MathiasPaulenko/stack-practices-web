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

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

## Soluciones Avanzadas

### Eleccion de lider con etcd usando consenso Raft

Implementa eleccion de lider usando el consenso integrado de etcd:

```python
import etcd3

class EtcdLeaderElection:
    def __init__(self, etcd_client, election_key='leader', lease_ttl=10):
        self.etcd = etcd_client
        self.election_key = election_key
        self.lease_ttl = lease_ttl
        self.lease = None
        self.election = None

    async def campaign(self, node_id):
        # Crear un lease con TTL
        self.lease = await self.etcd.lease(self.lease_ttl)
        
        # Campaign para liderazgo
        self.election = self.etcd.election(self.election_key)
        await self.election.campaign(node_id, lease=self.lease)
        
        # Mantener lease vivo
        while True:
            await self.lease.refresh()
            await asyncio.sleep(self.lease_ttl / 2)

    async def observe(self):
        # Observar lider actual
        election = self.etcd.election(self.election_key)
        async for leader in election.observe():
            print(f"Lider actual: {leader}")

    async def resign(self):
        if self.election:
            await self.election.resign()
        if self.lease:
            await self.lease.revoke()
```

### Eleccion de lider en Kubernetes con recurso Lease

Usa la API Lease de Kubernetes para eleccion de lider nativa:

```go
package main

import (
	"context"
	"fmt"
	"time"

	coordinationv1 "k8s.io/api/coordination/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type LeaseLeaderElection struct {
	clientset     *kubernetes.Clientset
	leaseName     string
	leaseNamespace string
	holderIdentity string
	leaseDuration  time.Duration
}

func NewLeaseLeaderElection(leaseName, namespace, holderIdentity string, duration time.Duration) (*LeaseLeaderElection, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &LeaseLeaderElection{
		clientset:      clientset,
		leaseName:      leaseName,
		leaseNamespace: namespace,
		holderIdentity: holderIdentity,
		leaseDuration:  duration,
	}, nil
}

func (l *LeaseLeaderElection) Acquire(ctx context.Context) error {
	lease := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{
			Name:      l.leaseName,
			Namespace: l.leaseNamespace,
		},
		Spec: coordinationv1.LeaseSpec{
			HolderIdentity:       &l.holderIdentity,
			LeaseDurationSeconds: pointerToInt32(int32(l.leaseDuration.Seconds())),
			AcquireTime:          &metav1.Time{Time: time.Now()},
			RenewTime:            &metav1.Time{Time: time.Now()},
		},
	}

	for {
		current, err := l.clientset.CoordinationV1().Leases(l.leaseNamespace).Get(ctx, l.leaseName, metav1.GetOptions{})
		if err != nil {
			// Lease no existe, intentar crear
			_, err = l.clientset.CoordinationV1().Leases(l.leaseNamespace).Create(ctx, lease, metav1.CreateOptions{})
			if err == nil {
				return nil // Liderazgo adquirido
			}
			time.Sleep(time.Second)
			continue
		}

		// Verificar si lease expiro o somos el holder
		if current.Spec.HolderIdentity == nil || *current.Spec.HolderIdentity == l.holderIdentity {
			// Renovar lease
			current.Spec.HolderIdentity = &l.holderIdentity
			current.Spec.RenewTime = &metav1.Time{Time: time.Now()}
			_, err = l.clientset.CoordinationV1().Leases(l.leaseNamespace).Update(ctx, current, metav1.UpdateOptions{})
			if err == nil {
				return nil // Liderazgo mantenido
			}
		}

		time.Sleep(time.Second)
	}
}

func (l *LeaseLeaderElection) Renew(ctx context.Context) error {
	ticker := time.NewTicker(l.leaseDuration / 2)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			lease, err := l.clientset.CoordinationV1().Leases(l.leaseNamespace).Get(ctx, l.leaseName, metav1.GetOptions{})
			if err != nil {
				return fmt.Errorf("fallo al obtener lease: %w", err)
			}

			if lease.Spec.HolderIdentity == nil || *lease.Spec.HolderIdentity != l.holderIdentity {
				return fmt.Errorf("liderazgo perdido")
			}

			lease.Spec.RenewTime = &metav1.Time{Time: time.Now()}
			_, err = l.clientset.CoordinationV1().Leases(l.leaseNamespace).Update(ctx, lease, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("fallo al renovar lease: %w", err)
			}

		case <-ctx.Done():
			return nil
		}
	}
}

func pointerToInt32(i int32) *int32 {
	return &i
}
```

### Eleccion de lider basada en Redis con Redlock

Implementa eleccion de lider usando el algoritmo Redlock de Redis:

```python
import redis
import time
import uuid

class RedisLeaderElection:
    def __init__(self, redis_client, lock_key='leader_lock', ttl=10000):
        self.redis = redis_client
        self.lock_key = lock_key
        self.ttl = ttl  # milisegundos
        self.node_id = str(uuid.uuid4())
        self.lock_value = None

    def acquire(self):
        """
        Intenta adquirir el bloqueo usando SET NX EX
        Devuelve True si se adquiere, False en caso contrario
        """
        self.lock_value = f"{self.node_id}:{int(time.time() * 1000)}"
        
        # SET key value NX EX ttl
        result = self.redis.set(
            self.lock_key,
            self.lock_value,
            nx=True,
            ex=self.ttl / 1000
        )
        
        return result is not None

    def renew(self):
        """
        Renueva el bloqueo si aun lo tenemos
        """
        if not self.is_leader():
            return False
        
        # Verificar si el valor actual coincide con nuestro valor de bloqueo
        current_value = self.redis.get(self.lock_key)
        if current_value and current_value.decode() == self.lock_value:
            # Extender el TTL
            self.redis.expire(self.lock_key, self.ttl / 1000)
            return True
        
        return False

    def is_leader(self):
        """
        Verifica si somos el lider actual
        """
        current_value = self.redis.get(self.lock_key)
        if not current_value:
            return False
        
        return current_value.decode() == self.lock_value

    def release(self):
        """
        Libera el bloqueo si lo tenemos
        """
        current_value = self.redis.get(self.lock_key)
        if current_value and current_value.decode() == self.lock_value:
            self.redis.delete(self.lock_key)
```

## Mejores Practicas Adicionales

1. **Implementa step-down graceful del lider.** Cuando un lider se apaga, debe liberar explicitamente el lease y notificar a las seguidoras. Esto previene escenarios de cerebro dividido durante mantenimiento planificado.

```python
def shutdown(self):
    if self.is_leader():
        print("Renunciando como lider...")
        self.db.delete('leader')
        # Notificar seguidoras via pub/sub o cola de mensajes
        self.notify_followers('leader_stepdown')
```

2. **Usa tokens de aislamiento para operaciones distribuidas.** Genera un token de aislamiento monotonicamente creciente con cada periodo de liderazgo. Incluye este token en todas las escrituras distribuidas para prevenir que lideres obsoletos realicen cambios.

```python
class LeaderElectionWithFencing:
    def __init__(self, db):
        self.db = db
        self.fencing_token = 0

    def acquire(self):
        if self.try_acquire():
            # Incrementar token de aislamiento en nuevo liderazgo
            self.fencing_token = self.db.incr('fencing_token')
            return True
        return False

    def perform_write(self, key, value):
        # Incluir token de aislamiento en escritura
        if not self.is_leader():
            raise Exception("No es lider")
        
        write_data = {
            'value': value,
            'fencing_token': self.fencing_token
        }
        self.db.set(key, write_data)
```

3. **Implementa monitoreo de salud del lider.** Las seguidoras deben monitorear activamente la salud del lider, no solo observar el lease. Implementa health checks y probes de readiness para detectar fallos del lider antes de la expiracion del lease.

## Errores Comunes Adicionales

1. **Usar eleccion de lider para operaciones de corta duracion.** La eleccion de lider esta disenada para coordinacion de larga duracion. Para tareas de corta duracion, usa bloqueo distribuido o colas de tareas en su lugar.

2. **Ignorar el sesgo del reloj en sistemas distribuidos.** Las diferencias de reloj entre nodos pueden causar problemas de expiracion del lease. Usa relojes monotonicos o duraciones de lease que tengan en cuenta el sesgo de reloj esperado.

## FAQs Adicionales

### ¿Cómo manejo particiones de red durante la eleccion de lider?

Implementa eleccion basada en quorum donde una mayoria de nodos debe estar de acuerdo en el lider. Usa algoritmos de consenso como Raft o Paxos que manejan particiones de red correctamente requiriendo acuerdo de mayoria.

### ¿Qué pasa si el lider no puede renovar el lease?

Si el lider falla al renovar el lease antes de la expiracion, pierde el liderazgo. Las seguidoras detectan el lease expirado y compiten para convertirse en el nuevo lider. El lider antiguo debe detectar que ya no es lider y dejar de realizar operaciones exclusivas del lider.

### ¿Deberia usar eleccion de lider o un algoritmo de consenso?

Usa eleccion de lider cuando necesitas un unico coordinador pero no necesitas acuerdo sobre valores. Usa algoritmos de consenso como Raft cuando necesitas tanto eleccion de lider como acuerdo sobre un log replicado o maquina de estados.

---


contentType: patterns
slug: scheduler-agent-supervisor-pattern
title: "Patron de Programador-Agente-Supervisor"
description: "Coordina la programacion de trabajos resilientes separando la logica de programacion de los agentes de ejecucion y agregando un supervisor que monitorea, reinicia y gestiona el ciclo de vida."
metaDescription: "Aprende el Patron de Programador-Agente-Supervisor para trabajos resilientes. Ejemplos en Python, Java y JavaScript con supervisores, agentes y monitoreo de salud."
difficulty: advanced
topics:
  - design
  - architecture
  - devops
tags:
  - programador-agente-supervisor
  - patron
  - patron-de-diseno
  - programacion
  - resiliencia
  - gestion-de-trabajos
  - supervisor
relatedResources:
  - /patterns/priority-queue-pattern
  - /patterns/queue-based-load-leveling-pattern
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patron de Programador-Agente-Supervisor para trabajos resilientes. Ejemplos en Python, Java y JavaScript con supervisores, agentes y monitoreo de salud."
  keywords:
    - programador agente supervisor
    - patron de diseno
    - programacion
    - resiliencia
    - gestion de trabajos
    - patron supervisor


---

# Patron de Programador-Agente-Supervisor

## Resumen

El Patron de Programador-Agente-Supervisor estructura el procesamiento de trabajos distribuidos en tres roles distintos: un **Programador** que decide que trabajo hacer y cuando, **Agentes** que ejecutan el trabajo real, y un **Supervisor** que monitorea agentes, maneja fallas y gestiona el ciclo de vida del sistema.

Esta separacion de responsabilidades hace al sistema resiliente ante caidas de agentes, particiones de red y workers no responsivos. El supervisor detecta agentes fallidos, los reinicia, redistribuye su trabajo y asegura que la programacion continua incluso cuando componentes individuales fallan. Es la base de muchos sistemas de orquestacion, desde los arboles de supervision OTP de Erlang hasta los controladores de Kubernetes.

## Cuando Usar


- For alternatives, see [Back-Pressure Pattern](/es/patterns/back-pressure-pattern/).

- Trabajos de larga duracion o de fondo que deben sobrevivir fallas de maquinas individuales
- Ejecucion de tareas distribuidas donde los workers pueden fallar o volverse inalcanzables
- Sistemas que requieren recuperacion automatica, reintentos y aislamiento de fallas
- Flujos de trabajo de multiples pasos donde cada paso se supervisa independientemente
- Entornos donde los ejecutores de trabajos (agentes) corren en infraestructura heterogenea o efimera

## Cuando Evitar

- Trabajos cron simples en un solo servidor donde gestores de procesos (systemd, PM2) son suficientes
- Manejo de solicitudes HTTP sin estado donde las fallas se muestran inmediatamente al llamador
- Sistemas donde el overhead de supervision excede el costo de fallas ocasionales
- Tareas de muy corta duracion donde la eleccion de supervisor y verificaciones de heartbeat agregan latencia inaceptable

## Solucion

### Python (Supervisor Personalizado con Agentes)

```python
import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Optional, Callable
from enum import Enum

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Job:
    id: str
    task: Callable
    status: JobStatus = JobStatus.PENDING
    agent_id: Optional[str] = None
    retries: int = 0
    max_retries: int = 3

class Agent:
    def __init__(self, agent_id: str):
        self.id = agent_id
        self.current_job: Optional[Job] = None
        self.last_heartbeat = time.time()

    async def execute(self, job: Job) -> bool:
        self.current_job = job
        job.status = JobStatus.RUNNING
        job.agent_id = self.id
        try:
            result = await asyncio.wait_for(self._run_job(job), timeout=30.0)
            job.status = JobStatus.COMPLETED
            return True
        except Exception as e:
            job.status = JobStatus.FAILED
            return False
        finally:
            self.current_job = None
            self.last_heartbeat = time.time()

    async def _run_job(self, job: Job):
        await asyncio.sleep(0.5)
        if callable(job.task):
            return job.task()
        return job.task

    def is_healthy(self) -> bool:
        return time.time() - self.last_heartbeat < 15

class Supervisor:
    def __init__(self, check_interval: float = 10.0):
        self.agents: Dict[str, Agent] = {}
        self.jobs: Dict[str, Job] = {}
        self.check_interval = check_interval

    def add_agent(self, agent: Agent):
        self.agents[agent.id] = agent

    def submit_job(self, task: Callable) -> str:
        job = Job(id=str(uuid.uuid4()), task=task)
        self.jobs[job.id] = job
        return job.id

    async def start(self):
        asyncio.create_task(self._monitor_loop())

    async def _monitor_loop(self):
        while True:
            await asyncio.sleep(self.check_interval)
            await self._check_agents()
            await self._redistribute_work()

    async def _check_agents(self):
        failed = [aid for aid, a in self.agents.items() if not a.is_healthy()]
        for aid in failed:
            agent = self.agents[aid]
            if agent.current_job and agent.current_job.status == JobStatus.RUNNING:
                agent.current_job.status = JobStatus.FAILED
                agent.current_job.retries += 1
            del self.agents[aid]
            new_agent = Agent(f"agent-{uuid.uuid4().hex[:8]}")
            self.add_agent(new_agent)

    async def _redistribute_work(self):
        available = [a for a in self.agents.values() if a.current_job is None and a.is_healthy()]
        pending = [j for j in self.jobs.values() if j.status in (JobStatus.PENDING, JobStatus.FAILED) and j.retries < j.max_retries]
        for job in pending:
            if not available:
                break
            agent = available.pop(0)
            if job.status == JobStatus.FAILED:
                job.status = JobStatus.PENDING
            asyncio.create_task(self._execute_job(agent, job))

    async def _execute_job(self, agent: Agent, job: Job):
        success = await agent.execute(job)
        if not success and job.retries < job.max_retries:
            job.retries += 1
            job.status = JobStatus.PENDING
```

### Java (Supervision Estilo Akka)

```java
public class SchedulerAgentSupervisor {
    private final ScheduledExecutorService scheduler;
    private final ExecutorService workerPool;
    private final Map<String, Agent> agents = new ConcurrentHashMap<>();
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final AtomicInteger agentCounter = new AtomicInteger(0);
    private volatile boolean running;

    public SchedulerAgentSupervisor(int workerPoolSize) {
        this.scheduler = Executors.newScheduledThreadPool(2);
        this.workerPool = Executors.newFixedThreadPool(workerPoolSize);
    }

    public void start() {
        running = true;
        scheduler.scheduleAtFixedRate(this::monitorAgents, 5, 5, TimeUnit.SECONDS);
        scheduler.scheduleAtFixedRate(this::schedulePendingJobs, 1, 1, TimeUnit.SECONDS);
    }

    public String spawnAgent() {
        String agentId = "agent-" + agentCounter.incrementAndGet();
        agents.put(agentId, new Agent(agentId));
        return agentId;
    }

    public String submitJob(Runnable task) {
        String jobId = "job-" + UUID.randomUUID().toString().substring(0, 8);
        jobs.put(jobId, new Job(jobId, task));
        return jobId;
    }

    private void monitorAgents() {
        List<String> failed = new ArrayList<>();
        for (Agent agent : agents.values()) {
            if (!agent.isHealthy()) {
                failed.add(agent.getId());
                if (agent.getCurrentJob() != null) {
                    agent.getCurrentJob().setStatus(JobStatus.FAILED);
                    agent.getCurrentJob().incrementRetries();
                }
            }
        }
        for (String id : failed) {
            agents.remove(id);
            spawnAgent();
        }
    }

    private void schedulePendingJobs() {
        List<Agent> available = agents.values().stream()
            .filter(a -> a.getCurrentJob() == null && a.isHealthy()).toList();
        List<Job> pending = jobs.values().stream()
            .filter(Job::canRetry).toList();
        int limit = Math.min(available.size(), pending.size());
        for (int i = 0; i < limit; i++) {
            dispatchJob(available.get(i), pending.get(i));
        }
    }

    private void dispatchJob(Agent agent, Job job) {
        job.setStatus(JobStatus.RUNNING);
        job.setAgentId(agent.getId());
        agent.setCurrentJob(job);
        workerPool.submit(() -> {
            try {
                job.getTask().run();
                job.setStatus(JobStatus.COMPLETED);
            } catch (Exception e) {
                job.setStatus(JobStatus.FAILED);
                job.incrementRetries();
            } finally {
                agent.setCurrentJob(null);
                agent.recordHeartbeat();
            }
        });
    }
}
```

### JavaScript (Node.js con Clustering estilo PM2)

```javascript
const cluster = require('cluster');
const os = require('os');

class JobSupervisor {
    constructor(options = {}) {
        this.workers = new Map();
        this.jobs = new Map();
        this.maxWorkers = options.maxWorkers || os.cpus().length;
        this.heartbeatTimeout = options.heartbeatTimeout || 10000;
        this.checkInterval = options.checkInterval || 5000;
    }

    start() {
        if (cluster.isPrimary) {
            this._startSupervisor();
        } else {
            this._startAgent();
        }
    }

    _startSupervisor() {
        for (let i = 0; i < this.maxWorkers; i++) {
            this._spawnWorker();
        }
        setInterval(() => this._monitorWorkers(), this.checkInterval);
        cluster.on('exit', (worker, code, signal) => {
            this.workers.delete(worker.id);
            this._spawnWorker();
        });
    }

    _spawnWorker() {
        const worker = cluster.fork();
        this.workers.set(worker.id, {
            worker, lastHeartbeat: Date.now(), currentJob: null
        });
    }

    _monitorWorkers() {
        const now = Date.now();
        for (const [id, info] of this.workers) {
            if (now - info.lastHeartbeat > this.heartbeatTimeout) {
                if (info.currentJob) this._requeueJob(info.currentJob);
                info.worker.kill('SIGTERM');
                this.workers.delete(id);
                this._spawnWorker();
            }
        }
    }

    submitJob(jobData) {
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.jobs.set(jobId, { id: jobId, data: jobData, status: 'pending', retries: 0 });
        for (const [id, info] of this.workers) {
            if (!info.currentJob) {
                this._dispatchJob(id, jobId);
                return jobId;
            }
        }
        return jobId;
    }

    _dispatchJob(workerId, jobId) {
        const info = this.workers.get(workerId);
        info.currentJob = jobId;
        const job = this.jobs.get(jobId);
        job.status = 'running'; job.workerId = workerId;
        info.worker.send({ type: 'execute', jobId, data: job.data });
    }

    _startAgent() {
        process.on('message', async (msg) => {
            if (msg.type === 'execute') {
                try {
                    const heartbeat = setInterval(() => {
                        process.send({ type: 'heartbeat', jobId: msg.jobId });
                    }, 3000);
                    const result = await this.executeJob(msg.data);
                    clearInterval(heartbeat);
                    process.send({ type: 'complete', jobId: msg.jobId, result });
                } catch (error) {
                    process.send({ type: 'failed', jobId: msg.jobId, error: error.message });
                }
            }
        });
    }

    async executeJob(data) {
        await new Promise(r => setTimeout(r, 1000));
        return { processed: true, data };
    }
}
```

## Explicacion

El patron separa responsabilidades en tres capas:

- **Programador:** Decide que se ejecuta, cuando y donde. Mantiene la cola de trabajos, orden de prioridades y politicas de reintento. No ejecuta trabajo directamente.
- **Agente:** Ejecuta los trabajos asignados y reporta progreso. Los agentes son desechables — si uno falla, el supervisor lo reemplaza. Los agentes deben ser sin estado; todo el estado del trabajo vive en la tienda de trabajos del programador.
- **Supervisor:** Observa agentes via heartbeats, detecta fallas, reinicia agentes y redistribuye trabajos fallidos. Es la capa de resiliencia que hace al sistema auto-reparable.

La idea clave es que **los agentes son ganado, no mascotas**. El supervisor los trata como recursos efimeros que pueden crearse, destruirse y reemplazarse sin afectar el sistema.

## Variantes

| Variante | Mecanismo de Supervisor | Ideal Para |
|----------|----------------------|------------|
| Erlang OTP | Arboles de supervision, reinicio one-for-one | Telecom, sistemas soft real-time |
| Kubernetes | ReplicaSets, health checks, reinicios rolling | Microservicios contenedorizados |
| AWS Step Functions | Maquina de estados con manejo de errores | Flujos de trabajo nativos en la nube |
| Celery con Flower | Monitoreo de workers, control remoto | Colas de tareas Python |
| Implementacion personalizada | Monitoreo directo de procesos | Sistemas embebidos, edge computing |

## Lo que funciona

- Hacer los agentes sin estado
- Usar heartbeats con timeouts
- Implementar backoff exponencial para reintentos
- Limitar el numero de reintentos
- Escalar los supervisores tambien

## Errores Comunes

- Agentes con estado
- Heartbeats faltantes
- Supervisor como punto unico de falla
- Sin circuit breaker para trabajos fallidos
- Ignorar el tiempo de inicio del agente

## Ejemplos del Mundo Real

- **Erlang/OTP**: Marco novedoso del patron de supervision. Los procesos se organizan en arboles de supervision donde los supervisores monitorean workers y aplican estrategias de reinicio. Impulsa la infraestructura de mensajeria de WhatsApp.
- **Kubernetes**: Los controladores actuan como supervisores. Un controlador de Deployment monitorea Pods (agentes), detecta los no saludables via health checks, y crea reemplazos.
- **Apache Airflow**: El modelo de executor de Airflow usa un programador que analiza DAGs y coloca tareas en workers (agentes). El programador monitorea el estado en la base de datos de metadatos y reintenta tareas fallidas.

## Preguntas Frecuentes

**P: ¿Cual es la diferencia con una simple cola de tareas con workers?**
R: Una cola de tareas delega ejecucion pero no monitorea activamente la salud de los workers ni reemplaza automaticamente los fallidos. El supervisor agrega la capa de gestion de ciclo de vida y auto-reparacion.

**P: ¿El programador y el supervisor deberian ser el mismo proceso?**
R: Pueden serlo, pero separarlos mejora la resiliencia. Si el programador falla, el supervisor puede aun mantener los agentes existentes.

**P: ¿Como se relaciona este patron con Kubernetes?**
R: Kubernetes implementa el patron directamente: kube-scheduler decide la colocacion (programador), los Pods ejecutan trabajo (agentes), y ReplicaSets/Deployments monitorean y reemplazan Pods fallidos (supervisor).

**P: ¿Que pasa si el supervisor falla?**
R: El sistema pierde supervision. Mitigar ejecutando supervisores en pares con eleccion de lider, o usando un sistema de consenso distribuido.

**P: ¿Puede este patron manejar millones de trabajos?**
R: Si — pero el programador se convierte en cuello de botella. Usar programacion particionada (un programador por tipo de trabajo o shard) y pools de agentes de nada compartida para escalar horizontalmente.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

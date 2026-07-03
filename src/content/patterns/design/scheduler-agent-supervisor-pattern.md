---
contentType: patterns
slug: scheduler-agent-supervisor-pattern
title: "Scheduler Agent Supervisor Pattern"
description: "Coordinate resilient job scheduling by separating scheduling logic from execution agents and adding a supervisor that monitors, restarts, and manages agent lifecycle."
metaDescription: "Learn the Scheduler Agent Supervisor Pattern for resilient job scheduling. Examples in Python, Java, and JavaScript with supervisors, agents, and health monitoring."
difficulty: advanced
topics:
  - design
  - architecture
  - devops
tags:
  - scheduler-agent-supervisor
  - pattern
  - design-pattern
  - scheduling
  - resilience
  - job-management
  - supervisor
relatedResources:
  - /patterns/design/priority-queue-pattern
  - /patterns/design/queue-based-load-leveling-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Scheduler Agent Supervisor Pattern for resilient job scheduling. Examples in Python, Java, and JavaScript with supervisors, agents, and health monitoring."
  keywords:
    - scheduler agent supervisor
    - design pattern
    - scheduling
    - resilience
    - job management
    - supervisor pattern
---

# Scheduler Agent Supervisor Pattern

## Overview

The Scheduler Agent Supervisor Pattern structures distributed job processing into three distinct roles: a **Scheduler** that decides what work to do and when, **Agents** that execute the actual work, and a **Supervisor** that monitors agents, handles failures, and manages the lifecycle of the system.

This separation of concerns makes the system resilient to agent crashes, network partitions, and unresponsive workers. The supervisor detects failed agents, restarts them, redistributes their work, and ensures scheduling continues even when individual components fail. It is the foundation of many job orchestration systems, from Erlang's OTP supervision trees to Kubernetes controllers.

## When to Use

- Long-running or background jobs that must survive individual machine failures
- Distributed task execution where workers may crash or become unreachable
- Systems requiring automatic recovery, retry, and failure isolation
- Multi-step workflows where each step is independently supervised
- Environments where job executors (agents) run on heterogeneous or ephemeral infrastructure

## When to Avoid

- Simple cron jobs on a single server where process managers (systemd, PM2) suffice
- Stateless HTTP request handling where failures are surfaced immediately to the caller
- Systems where the overhead of supervision exceeds the cost of occasional failures
- Very short-lived tasks where supervisor election and heartbeat checks add unacceptable latency

## Solution

### Python (Custom Supervisor with Agents)

```python
import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Job:
    id: str
    task: Callable
    args: tuple = ()
    kwargs: dict = field(default_factory=dict)
    status: JobStatus = JobStatus.PENDING
    agent_id: Optional[str] = None
    retries: int = 0
    max_retries: int = 3
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

class Agent:
    """Executes jobs assigned by the scheduler"""

    def __init__(self, agent_id: str):
        self.id = agent_id
        self.current_job: Optional[Job] = None
        self.healthy = True
        self.last_heartbeat = time.time()
        self._task: Optional[asyncio.Task] = None

    async def execute(self, job: Job) -> bool:
        """Execute a job. Returns True on success, False on failure."""
        self.current_job = job
        job.status = JobStatus.RUNNING
        job.agent_id = self.id
        job.started_at = time.time()

        try:
            result = await asyncio.wait_for(
                self._run_job(job),
                timeout=30.0
            )
            job.status = JobStatus.COMPLETED
            job.completed_at = time.time()
            logger.info(f"Job {job.id} completed on agent {self.id}")
            return True
        except asyncio.TimeoutError:
            logger.error(f"Job {job.id} timed out on agent {self.id}")
            job.status = JobStatus.FAILED
            return False
        except Exception as e:
            logger.error(f"Job {job.id} failed: {e}")
            job.status = JobStatus.FAILED
            return False
        finally:
            self.current_job = None
            self.last_heartbeat = time.time()

    async def _run_job(self, job: Job):
        """User-defined job execution"""
        await asyncio.sleep(0.5)  # Simulate work
        if hasattr(job.task, '__call__'):
            return job.task(*job.args, **job.kwargs)
        return job.task

    async def heartbeat(self):
        """Keep agent alive signal"""
        while True:
            self.last_heartbeat = time.time()
            await asyncio.sleep(5)

    def is_healthy(self) -> bool:
        return time.time() - self.last_heartbeat < 15

class Supervisor:
    """Monitors agents, restarts failed ones, and redistributes work"""

    def __init__(self, check_interval: float = 10.0):
        self.agents: Dict[str, Agent] = {}
        self.jobs: Dict[str, Job] = {}
        self.check_interval = check_interval
        self._monitor_task: Optional[asyncio.Task] = None

    def add_agent(self, agent: Agent):
        self.agents[agent.id] = agent
        logger.info(f"Agent {agent.id} registered")

    def submit_job(self, task: Callable, *args, **kwargs) -> str:
        job = Job(
            id=str(uuid.uuid4()),
            task=task,
            args=args,
            kwargs=kwargs
        )
        self.jobs[job.id] = job
        logger.info(f"Job {job.id} submitted")
        return job.id

    async def start(self):
        """Start supervisor monitoring loop"""
        self._monitor_task = asyncio.create_task(self._monitor_loop())

    async def _monitor_loop(self):
        """Periodically check agent health and redistribute failed jobs"""
        while True:
            await asyncio.sleep(self.check_interval)
            await self._check_agents()
            await self._redistribute_work()

    async def _check_agents(self):
        """Detect and handle failed agents"""
        failed_agents = []

        for agent_id, agent in self.agents.items():
            if not agent.is_healthy():
                logger.warning(f"Agent {agent_id} is unhealthy")
                failed_agents.append(agent_id)

                # Requeue agent's current job
                if agent.current_job and agent.current_job.status == JobStatus.RUNNING:
                    agent.current_job.status = JobStatus.FAILED
                    agent.current_job.retries += 1
                    logger.info(f"Job {agent.current_job.id} marked for retry")

        for agent_id in failed_agents:
            del self.agents[agent_id]
            # Spawn replacement agent
            new_agent = Agent(f"agent-{uuid.uuid4().hex[:8]}")
            self.add_agent(new_agent)
            logger.info(f"Replaced failed agent {agent_id} with {new_agent.id}")

    async def _redistribute_work(self):
        """Assign pending/failed jobs to available agents"""
        available_agents = [
            a for a in self.agents.values()
            if a.current_job is None and a.is_healthy()
        ]

        pending_jobs = [
            j for j in self.jobs.values()
            if j.status in (JobStatus.PENDING, JobStatus.FAILED)
            and j.retries < j.max_retries
        ]

        for job in pending_jobs:
            if not available_agents:
                break

            agent = available_agents.pop(0)
            if job.status == JobStatus.FAILED:
                job.status = JobStatus.PENDING

            # Launch job execution asynchronously
            asyncio.create_task(self._execute_job(agent, job))

    async def _execute_job(self, agent: Agent, job: Job):
        success = await agent.execute(job)
        if not success and job.retries < job.max_retries:
            job.retries += 1
            job.status = JobStatus.PENDING
            logger.info(f"Job {job.id} queued for retry {job.retries}/{job.max_retries}")

    def get_status(self) -> dict:
        return {
            "agents": len(self.agents),
            "healthy": sum(1 for a in self.agents.values() if a.is_healthy()),
            "jobs": {
                "total": len(self.jobs),
                "pending": sum(1 for j in self.jobs.values() if j.status == JobStatus.PENDING),
                "running": sum(1 for j in self.jobs.values() if j.status == JobStatus.RUNNING),
                "completed": sum(1 for j in self.jobs.values() if j.status == JobStatus.COMPLETED),
                "failed": sum(1 for j in self.jobs.values() if j.status == JobStatus.FAILED)
            }
        }

# Usage
async def main():
    supervisor = Supervisor(check_interval=5.0)

    # Create initial agents
    for i in range(3):
        agent = Agent(f"agent-{i}")
        supervisor.add_agent(agent)

    await supervisor.start()

    # Submit jobs
    for i in range(10):
        supervisor.submit_job(lambda: f"task-{i}")

    # Let system run
    await asyncio.sleep(20)
    print(supervisor.get_status())

if __name__ == "__main__":
    asyncio.run(main())
```

### Java (Akka-Style Actor Supervision)

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.*;

public class SchedulerAgentSupervisor {

    private final ScheduledExecutorService scheduler;
    private final ExecutorService workerPool;
    private final Map<String, Agent> agents;
    private final Map<String, Job> jobs;
    private final AtomicInteger agentCounter;
    private volatile boolean running;

    public SchedulerAgentSupervisor(int workerPoolSize) {
        this.scheduler = Executors.newScheduledThreadPool(2);
        this.workerPool = Executors.newFixedThreadPool(workerPoolSize);
        this.agents = new ConcurrentHashMap<>();
        this.jobs = new ConcurrentHashMap<>();
        this.agentCounter = new AtomicInteger(0);
    }

    public void start() {
        running = true;
        // Supervisor monitoring loop
        scheduler.scheduleAtFixedRate(this::monitorAgents, 5, 5, TimeUnit.SECONDS);
        scheduler.scheduleAtFixedRate(this::schedulePendingJobs, 1, 1, TimeUnit.SECONDS);
    }

    public String spawnAgent() {
        String agentId = "agent-" + agentCounter.incrementAndGet();
        Agent agent = new Agent(agentId);
        agents.put(agentId, agent);
        System.out.println("Spawned agent: " + agentId);
        return agentId;
    }

    public String submitJob(Runnable task) {
        String jobId = "job-" + UUID.randomUUID().toString().substring(0, 8);
        Job job = new Job(jobId, task);
        jobs.put(jobId, job);
        return jobId;
    }

    private void monitorAgents() {
        List<String> failedAgents = new ArrayList<>();

        for (Agent agent : agents.values()) {
            if (!agent.isHealthy()) {
                System.out.println("Agent " + agent.getId() + " is unhealthy");
                failedAgents.add(agent.getId());

                // Requeue running job
                if (agent.getCurrentJob() != null) {
                    Job job = agent.getCurrentJob();
                    job.setStatus(JobStatus.FAILED);
                    job.incrementRetries();
                }
            }
        }

        // Replace failed agents
        for (String agentId : failedAgents) {
            agents.remove(agentId);
            spawnAgent();
        }
    }

    private void schedulePendingJobs() {
        List<Agent> available = agents.values().stream()
            .filter(a -> a.getCurrentJob() == null && a.isHealthy())
            .toList();

        List<Job> pending = jobs.values().stream()
            .filter(j -> j.canRetry())
            .toList();

        int limit = Math.min(available.size(), pending.size());
        for (int i = 0; i < limit; i++) {
            Agent agent = available.get(i);
            Job job = pending.get(i);
            dispatchJob(agent, job);
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
                System.err.println("Job " + job.getId() + " failed: " + e.getMessage());
                job.setStatus(JobStatus.FAILED);
                job.incrementRetries();
            } finally {
                agent.setCurrentJob(null);
                agent.recordHeartbeat();
            }
        });
    }

    public void shutdown() {
        running = false;
        scheduler.shutdown();
        workerPool.shutdown();
    }

    // Inner classes
    enum JobStatus { PENDING, RUNNING, COMPLETED, FAILED }

    static class Agent {
        private final String id;
        private volatile Job currentJob;
        private volatile long lastHeartbeat = System.currentTimeMillis();

        Agent(String id) { this.id = id; }
        public String getId() { return id; }
        public Job getCurrentJob() { return currentJob; }
        public void setCurrentJob(Job job) { this.currentJob = job; }
        public void recordHeartbeat() { this.lastHeartbeat = System.currentTimeMillis(); }
        public boolean isHealthy() {
            return System.currentTimeMillis() - lastHeartbeat < 15000;
        }
    }

    static class Job {
        private final String id;
        private final Runnable task;
        private JobStatus status = JobStatus.PENDING;
        private String agentId;
        private int retries = 0;
        private final int maxRetries = 3;

        Job(String id, Runnable task) { this.id = id; this.task = task; }
        public String getId() { return id; }
        public Runnable getTask() { return task; }
        public JobStatus getStatus() { return status; }
        public void setStatus(JobStatus s) { this.status = s; }
        public void setAgentId(String id) { this.agentId = id; }
        public void incrementRetries() { retries++; }
        public boolean canRetry() {
            return status == JobStatus.PENDING ||
                   (status == JobStatus.FAILED && retries < maxRetries);
        }
    }
}
```

### JavaScript (Node.js with PM2-style Clustering)

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
        console.log(`Supervisor starting with ${this.maxWorkers} workers`);

        // Spawn initial workers
        for (let i = 0; i < this.maxWorkers; i++) {
            this._spawnWorker();
        }

        // Monitor loop
        setInterval(() => this._monitorWorkers(), this.checkInterval);

        // Handle worker crashes
        cluster.on('exit', (worker, code, signal) => {
            console.log(`Worker ${worker.process.pid} died (${signal || code})`);
            this.workers.delete(worker.id);
            this._spawnWorker();
        });
    }

    _spawnWorker() {
        const worker = cluster.fork();
        this.workers.set(worker.id, {
            worker,
            lastHeartbeat: Date.now(),
            currentJob: null
        });
    }

    _monitorWorkers() {
        const now = Date.now();

        for (const [id, info] of this.workers) {
            if (now - info.lastHeartbeat > this.heartbeatTimeout) {
                console.log(`Worker ${id} missed heartbeat, killing`);

                // Requeue its job
                if (info.currentJob) {
                    this._requeueJob(info.currentJob);
                }

                info.worker.kill('SIGTERM');
                this.workers.delete(id);
                this._spawnWorker();
            }
        }
    }

    submitJob(jobData) {
        const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.jobs.set(jobId, {
            id: jobId,
            data: jobData,
            status: 'pending',
            retries: 0
        });

        // Find available worker
        for (const [id, info] of this.workers) {
            if (!info.currentJob) {
                this._dispatchJob(id, jobId);
                return jobId;
            }
        }

        return jobId; // Queued for later
    }

    _dispatchJob(workerId, jobId) {
        const worker = this.workers.get(workerId);
        const job = this.jobs.get(jobId);

        worker.currentJob = jobId;
        job.status = 'running';
        job.workerId = workerId;

        worker.worker.send({
            type: 'execute',
            jobId,
            data: job.data
        });
    }

    _requeueJob(jobId) {
        const job = this.jobs.get(jobId);
        if (job && job.retries < 3) {
            job.status = 'pending';
            job.retries++;
            job.workerId = null;
        }
    }

    _startAgent() {
        process.on('message', async (msg) => {
            if (msg.type === 'execute') {
                try {
                    // Heartbeat while working
                    const heartbeat = setInterval(() => {
                        process.send({ type: 'heartbeat', jobId: msg.jobId });
                    }, 3000);

                    // Execute job
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
        // User-defined job logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { processed: true, data };
    }
}

module.exports = { JobSupervisor };
```

## Explanation

The pattern separates concerns into three layers:

- **Scheduler:** Decides what runs, when, and where. It maintains the job queue, priority ordering, and retry policies. It does not execute work directly.
- **Agent:** Executes assigned jobs and reports progress. Agents are disposable — if one fails, the supervisor replaces it. Agents should be stateless; all job state lives in the scheduler's job store.
- **Supervisor:** Watches agents via heartbeats, detects failures, restarts agents, and redistributes failed jobs. It is the resilience layer that makes the system self-healing.

The key insight is that **agents are cattle, not pets**. The supervisor treats them as ephemeral resources that can be created, destroyed, and replaced without affecting the overall system.

## Variants

| Variant | Supervisor Mechanism | Best For |
|---------|---------------------|----------|
| **Erlang OTP** | Supervision trees, one-for-one restart | Telecom, soft real-time systems |
| **Kubernetes** | ReplicaSets, health checks, rolling restarts | Containerized microservices |
| **AWS Step Functions** | State machine with error handling | Cloud-native workflows |
| **Celery with Flower** | Worker monitoring, remote control | Python task queues |
| **Custom implementation** | Direct process monitoring | Embedded systems, edge computing |

## What Works

- **Make agents stateless.** All job state should be in a persistent store so a replacement agent can resume work.
- **Use heartbeats with timeouts.** Agents must prove they are alive; missed heartbeats trigger replacement.
- **Implement exponential backoff for retries.** Repeatedly failing jobs should wait longer between attempts.
- **Cap retry counts.** A permanently broken job should not retry forever — move it to a dead letter queue.
- **Scale supervisors too.** In large deployments, supervisors themselves can become single points of failure — use leader election.

## Common Mistakes

- **Stateful agents.** An agent that stores job state locally cannot be replaced without data loss.
- **Missing heartbeats.** Without health checks, a crashed agent appears as "running" and its job stalls forever.
- **Supervisor as single point of failure.** One supervisor managing hundreds of agents is itself a failure risk.
- **No circuit breaker for failing jobs.** A job that fails instantly on every retry will exhaust retry limits rapidly.
- **Ignoring agent startup time.** Spawning replacement agents takes time — plan for temporary capacity gaps.

## Real-World Examples

### Erlang/OTP

Erlang's OTP framework pioneered the supervisor pattern. Processes are organized into supervision trees where supervisors monitor workers and apply restart strategies (one-for-one, one-for-all, rest-for-one). This design powers WhatsApp's messaging infrastructure, handling millions of concurrent connections with fault tolerance.

### Kubernetes

Kubernetes controllers act as supervisors. A Deployment controller monitors Pods (agents), detects unhealthy ones via health checks, and creates replacements to maintain the desired replica count. The scheduler (kube-scheduler) decides which node runs each Pod.

### Apache Airflow

Airflow's executor model uses a scheduler that parses DAGs and places tasks on workers (agents). The scheduler monitors task state in the metadata database and retries failed tasks according to configured policies. Celery or Kubernetes executors distribute work across agent pools.

## Frequently Asked Questions

**Q: What's the difference between this and a simple task queue with workers?**
A: A task queue delegates execution but doesn't actively monitor worker health or automatically replace failed workers. The supervisor adds the lifecycle management and self-healing layer.

**Q: Should the scheduler and supervisor be the same process?**
A: They can be, but separating them improves resilience. If the scheduler crashes, the supervisor can still maintain existing agents. In practice, they often coexist in small systems and separate in large distributed deployments.

**Q: How does this pattern relate to Kubernetes?**
A: Kubernetes implements the pattern directly: kube-scheduler decides placement (scheduler), Pods execute work (agents), and ReplicaSets/Deployments monitor and replace failed Pods (supervisor).

**Q: What happens if the supervisor crashes?**
A: The entire system loses oversight. Mitigate by running supervisors in pairs with leader election, or using a distributed consensus system (etcd, ZooKeeper) for supervisor state.

**Q: Can this pattern handle millions of jobs?**
A: Yes — but the scheduler becomes a bottleneck. Use partitioned scheduling (one scheduler per job type or shard) and shared-nothing agent pools to scale horizontally.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.

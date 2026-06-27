---
contentType: patterns
slug: business-delegate-pattern
title: "Patrón Business Delegate"
description: "Reduce el acoplamiento entre capas de presentación y negocio introduciendo un intermediario que maneja lookup, creación e invocación de servicios de negocio."
metaDescription: "Aprende el Patrón Business Delegate para desacoplar presentación de capas de negocio. Ejemplos en Python, Java y JavaScript con service lookup y caching."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - business-delegate
  - pattern
  - design-pattern
  - behavioral
  - architecture
  - decoupling
  - layers
relatedResources:
  - /patterns/design/facade-pattern
  - /patterns/design/proxy-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Business Delegate para desacoplar presentación de capas de negocio. Ejemplos en Python, Java y JavaScript con service lookup y caching."
  keywords:
    - business delegate
    - design pattern
    - architecture
    - decoupling
    - layers
---

# Patrón Business Delegate

## Descripción General

El Patrón Business Delegate reduce el acoplamiento entre la capa de presentación y la capa de servicios de negocio introduciendo una capa intermediaria. En lugar de que la capa de presentación acceda directamente a servicios de negocio (EJBs, APIs remotas, u objetos de servicio complejos), utiliza un Business Delegate que maneja lookup de servicio, creación e invocación.

Este patrón es particularmente valioso en aplicaciones enterprise donde los servicios de negocio pueden estar distribuidos, cambiar frecuentemente, o requerir inicialización compleja. El Business Delegate también puede cachear resultados, manejar retries, y proveer una interfaz simplificada a la capa de presentación.

## Cuándo Usar

Usa el Patrón Business Delegate cuando:
- La capa de presentación necesita acceder a servicios de negocio remotos o distribuidos
- El lookup de servicio de negocio es complejo o involucra JNDI, service registries, o contenedores DI
- Quieres cachear referencias de servicios para evitar lookups repetidos
- La API de la capa de negocio es compleja y necesitas una fachada simplificada para presentación

## Cuándo Evitar

- Aplicaciones monolíticas simples donde presentación y negocio no están separados
- Cuando una fachada simple o inyección directa de servicio es suficiente
- El overhead de una capa adicional no está justificado por la reducción de acoplamiento

## Solución

### Python

```python
from abc import ABC, abstractmethod
from typing import Optional, Dict

class OrderServiceInterface(ABC):
    @abstractmethod
    def create_order(self, customer_id: str, items: list) -> dict:
        pass

    @abstractmethod
    def get_order(self, order_id: str) -> dict:
        pass


class RemoteOrderService(OrderServiceInterface):
    """Servicio remoto EJB o API simulado"""
    def create_order(self, customer_id: str, items: list) -> dict:
        # Simular network call
        return {"order_id": "ORD-123", "status": "created", "items": items}

    def get_order(self, order_id: str) -> dict:
        return {"order_id": order_id, "status": "shipped"}


class ServiceLocator:
    """Registro central para lookup de servicios"""
    _services: Dict[str, any] = {}

    @classmethod
    def register(cls, name: str, service: any):
        cls._services[name] = service

    @classmethod
    def lookup(cls, name: str) -> any:
        return cls._services.get(name)


class OrderBusinessDelegate:
    """Delegate que simplifica acceso a OrderService"""
    def __init__(self):
        self._service: Optional[OrderServiceInterface] = None

    def _get_service(self) -> OrderServiceInterface:
        if self._service is None:
            self._service = ServiceLocator.lookup("OrderService")
            if self._service is None:
                self._service = RemoteOrderService()
        return self._service

    def create_order(self, customer_id: str, items: list) -> dict:
        try:
            return self._get_service().create_order(customer_id, items)
        except Exception as e:
            # Manejar excepciones remotas, retry logic, etc.
            raise RuntimeError(f"Failed to create order: {e}")

    def get_order(self, order_id: str) -> dict:
        return self._get_service().get_order(order_id)


# Capa de presentación (equivalente servlet/controller)
class OrderController:
    def __init__(self):
        self.delegate = OrderBusinessDelegate()

    def handle_create_order(self, customer_id: str, items: list):
        result = self.delegate.create_order(customer_id, items)
        return f"Order created: {result['order_id']}"


# Uso
ServiceLocator.register("OrderService", RemoteOrderService())
controller = OrderController()
print(controller.handle_create_order("CUST-001", ["item1", "item2"]))
```

### Java

```java
import java.util.*;

interface OrderService {
    Map<String, Object> createOrder(String customerId, List<String> items);
    Map<String, Object> getOrder(String orderId);
}

class RemoteOrderService implements OrderService {
    public Map<String, Object> createOrder(String customerId, List<String> items) {
        Map<String, Object> result = new HashMap<>();
        result.put("order_id", "ORD-123");
        result.put("status", "created");
        result.put("items", items);
        return result;
    }

    public Map<String, Object> getOrder(String orderId) {
        Map<String, Object> result = new HashMap<>();
        result.put("order_id", orderId);
        result.put("status", "shipped");
        return result;
    }
}

class ServiceLocator {
    private static final Map<String, Object> services = new HashMap<>();
    public static void register(String name, Object service) { services.put(name, service); }
    public static Object lookup(String name) { return services.get(name); }
}

class OrderBusinessDelegate {
    private OrderService service;

    private OrderService getService() {
        if (service == null) {
            service = (OrderService) ServiceLocator.lookup("OrderService");
            if (service == null) service = new RemoteOrderService();
        }
        return service;
    }

    public Map<String, Object> createOrder(String customerId, List<String> items) {
        try {
            return getService().createOrder(customerId, items);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create order: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> getOrder(String orderId) {
        return getService().getOrder(orderId);
    }
}

class OrderController {
    private final OrderBusinessDelegate delegate = new OrderBusinessDelegate();

    public String handleCreateOrder(String customerId, List<String> items) {
        Map<String, Object> result = delegate.createOrder(customerId, items);
        return "Order created: " + result.get("order_id");
    }
}

// Uso
ServiceLocator.register("OrderService", new RemoteOrderService());
OrderController controller = new OrderController();
System.out.println(controller.handleCreateOrder("CUST-001", List.of("item1", "item2")));
```

### JavaScript

```javascript
class RemoteOrderService {
  createOrder(customerId, items) {
    return { order_id: 'ORD-123', status: 'created', items };
  }

  getOrder(orderId) {
    return { order_id: orderId, status: 'shipped' };
  }
}

class ServiceLocator {
  static services = new Map();
  static register(name, service) { this.services.set(name, service); }
  static lookup(name) { return this.services.get(name); }
}

class OrderBusinessDelegate {
  constructor() {
    this.service = null;
  }

  getService() {
    if (!this.service) {
      this.service = ServiceLocator.lookup('OrderService') || new RemoteOrderService();
    }
    return this.service;
  }

  createOrder(customerId, items) {
    try {
      return this.getService().createOrder(customerId, items);
    } catch (e) {
      throw new Error(`Failed to create order: ${e.message}`);
    }
  }

  getOrder(orderId) {
    return this.getService().getOrder(orderId);
  }
}

class OrderController {
  constructor() {
    this.delegate = new OrderBusinessDelegate();
  }

  handleCreateOrder(customerId, items) {
    const result = this.delegate.createOrder(customerId, items);
    return `Order created: ${result.order_id}`;
  }
}

// Uso
ServiceLocator.register('OrderService', new RemoteOrderService());
const controller = new OrderController();
console.log(controller.handleCreateOrder('CUST-001', ['item1', 'item2']));
```

## Explicación

El Business Delegate actúa como proxy y adapter entre la capa de presentación y los servicios de negocio:

- **Capa de Presentación**: Usa la simple interfaz del Business Delegate
- **Business Delegate**: Maneja lookup de servicio, caching, traducción de excepciones, y retry logic
- **Service Locator**: Provee un registro central para encontrar servicios de negocio
- **Business Service**: La implementación remota o compleja del servicio real

Este approach layered significa que el código de presentación nunca referencia directamente interfaces remotas, JNDI, o excepciones específicas de servicio.

## Variantes

| Variante | Feature Adicional | Caso de Uso |
|----------|-------------------|-------------|
| **Basic** | Lookup y delegación simple | Apps enterprise estándar |
| **Caching** | Cachea referencias de servicio | Sistemas de alto throughput |
| **Retry** | Retry automático ante fallo | Servicios remotos no confiables |
| **Async** | Invocación asíncrona | Presentación no bloqueante |

## Mejores Prácticas

- **Cachea referencias de servicio.** Evita lookups repetidos de JNDI o registro.
- **Traduce excepciones.** Convierte excepciones remotas/de servicio en errores amigables para presentación.
- **Mantén el delegate thin.** La lógica de negocio pertenece al servicio, no al delegate.
- **Usa con Service Locator o DI.** El delegate no debería hard-codear creación de servicio.
- **Implementa retries para llamadas remotas.** Los fallos de red deberían manejarse gracefulmente.

## Errores Comunes

- **Poner lógica de negocio en el delegate.** El delegate solo debería rutear y simplificar.
- **No cachear referencias de servicio.** Los lookups repetidos son costosos.
- **Exponer excepciones remotas a la capa de presentación.** Siempre traduce a excepciones de dominio.
- **Acoplamiento fuerte a una implementación específica de servicio.** Usa interfaces y factories.
- **Sobreusar para servicios locales.** La inyección directa es más simple cuando los servicios son in-process.

## Ejemplos del Mundo Real

### Java EE / Jakarta EE

Business Delegate fue un patrón core de J2EE. Los session beans eran accedidos vía delegates para ocultar complejidad EJB de servlets y JSPs.

### Spring Framework

Aunque la inyección de dependencias de Spring reduce la necesidad de delegates manuales, las capas `@Service` con `@Transactional` a menudo actúan como business delegates entre controllers y repositories.

### Microservice Gateways

Los API gateways en arquitecturas de microservicios a menudo implementan lógica de Business Delegate, agregando múltiples servicios backend en una única interfaz orientada al cliente.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Business Delegate y Facade?**
A: Una Facade simplifica la interfaz de un subsistema complejo. Un Business Delegate media específicamente entre presentación y servicios de negocio remotos/distribuidos.

**Q: Cómo se relaciona Business Delegate con Service Locator?**
A: El delegate a menudo usa Service Locator para encontrar el servicio de negocio real. Son patrones complementarios.

**Q: Es Business Delegate aún relevante con frameworks modernos de DI?**
A: La necesidad de delegates manuales ha disminuido con Spring y CDI, pero el concepto vive en service layers, BFFs, y API gateways.

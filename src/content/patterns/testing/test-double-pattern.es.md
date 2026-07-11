---
contentType: patterns
slug: test-double-pattern
title: "Patrón Test Double: Reemplazar Dependencias con Stubs,"
description: "Cómo usar test doubles para aislar unidades bajo test. Cubre stubs, spies, fakes, mocks y dummy objects con ejemplos en Python, JavaScript y Java."
metaDescription: "Reemplaza dependencias con test doubles — stubs, spies, fakes, mocks y dummies. Aprende cuándo usar cada tipo con ejemplos en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - test-doubles
  - mocking
  - stubs
  - spies
  - fakes
  - pattern
category: architectural
relatedResources:
  - /patterns/fixture-setup-teardown-pattern
  - /patterns/parameterized-test-pattern
  - /patterns/mock-server-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Reemplaza dependencias con test doubles — stubs, spies, fakes, mocks y dummies. Aprende cuándo usar cada tipo con ejemplos en Python, JavaScript y Java."
  keywords:
    - testing
    - test-doubles
    - mocking
    - stubs
    - spies
    - fakes
    - pattern
---

## Overview

Un test double es cualquier objeto que reemplaza a una dependencia real durante el testing. El término viene de Gerard Meszaros (xUnit Test Patterns), quien categorizó los test doubles en cinco tipos: **dummy**, **stub**, **spy**, **fake**, y **mock**. Cada uno sirve un propósito diferente — proveer responses predefinidas, registrar interacciones, simplificar comportamiento complejo, o verificar calls. Entender la distinción ayuda a escribir tests enfocados, rápidos y resilientes a cambios externos.

## When to Use

- Aislar una unidad de sus dependencias (databases, APIs, file systems, message queues)
- Testear error paths que son difíciles de trigger con dependencias reales
- Acelerar test suites reemplazando I/O lento con alternativas in-memory
- Verificar patterns de interacción (e.g., "¿se llamó `send_email` con la dirección correcta?")
- Testear código que depende de servicios externos no disponibles en CI

## When NOT to Use

- Integration tests — usá dependencias reales para verificar comportamiento end-to-end
- Cuando la dependencia es simple y rápida — no hace falta doblar una pure function
- Cuando el double es más complejo que lo real — testeá la dependencia real en su lugar
- Para testear comportamiento que no es tuyo — si la API externa cambia, tu mock no lo atrapa

## Solution

### Tipos de Test Doubles

| Tipo | Propósito | Ejemplo |
|------|-----------|---------|
| **Dummy** | Se pasa pero nunca se usa | Parámetro logger null |
| **Stub** | Retorna responses predefinidas | `getUser()` siempre retorna `{id: 1}` |
| **Spy** | Registra calls para verificación posterior | Captura `send_email("alice@x.com")` |
| **Fake** | Implementación working pero simplificada | In-memory database en vez de PostgreSQL |
| **Mock** | Expectations pre-programadas | "Esperar `save()` llamado exactamente una vez" |

### Dummy — Objeto placeholder

```python
# Python — dummy logger pasado pero nunca usado
class DummyLogger:
    def info(self, msg): pass
    def error(self, msg): pass
    def warning(self, msg): pass

class OrderProcessor:
    def __init__(self, logger):
        self.logger = logger

    def process(self, order):
        # logger nunca se llama en este escenario de test
        return order.total * 1.1

def test_process_order():
    processor = OrderProcessor(DummyLogger())
    result = processor.process(Order(total=100))
    assert result == 110.0
```

### Stub — Retorna responses predefinidas

```python
# Python — stub para un user repository
class UserRepositoryStub:
    def __init__(self, user=None):
        self.user = user

    def find_by_id(self, user_id):
        return self.user

    def save(self, user):
        pass

def test_get_user_name():
    repo = UserRepositoryStub(user=User(id=1, name="Alice"))
    service = UserService(repo)
    assert service.get_name(1) == "Alice"

def test_get_user_name_not_found():
    repo = UserRepositoryStub(user=None)
    service = UserService(repo)
    with pytest.raises(NotFoundError):
        service.get_name(999)
```

```javascript
// JavaScript — stub con jest
const userRepo = {
  findById: jest.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
  save: jest.fn().mockResolvedValue(true),
};

const service = new UserService(userRepo);

test('getUserName returns name', async () => {
  const name = await service.getUserName(1);
  expect(name).toBe('Alice');
  expect(userRepo.findById).toHaveBeenCalledWith(1);
});
```

### Spy — Registra interacciones para verificación

```python
# Python — spy con unittest.mock
from unittest.mock import MagicMock

def test_email_sent_on_order():
    email_service = MagicMock()
    notifier = OrderNotifier(email_service)

    notifier.notify_order_completed(Order(id=42, customer_email="alice@x.com"))

    # Verificar que el spy registró la call
    email_service.send.assert_called_once_with(
        to="alice@x.com",
        subject="Order #42 completed",
    )

def test_email_spy_records_multiple_calls():
    email_service = MagicMock()
    notifier = OrderNotifier(email_service)

    notifier.notify_order_completed(Order(id=1, customer_email="a@x.com"))
    notifier.notify_order_completed(Order(id=2, customer_email="b@x.com"))

    assert email_service.send.call_count == 2
    calls = email_service.send.call_args_list
    assert calls[0].kwargs['to'] == "a@x.com"
    assert calls[1].kwargs['to'] == "b@x.com"
```

```javascript
// JavaScript — spy con jest
const emailService = {
  send: jest.fn(),
};

const notifier = new OrderNotifier(emailService);

test('email sent on order completion', () => {
  notifier.notifyOrderCompleted({ id: 42, customerEmail: 'alice@x.com' });

  expect(emailService.send).toHaveBeenCalledTimes(1);
  expect(emailService.send).toHaveBeenCalledWith({
    to: 'alice@x.com',
    subject: 'Order #42 completed',
  });
});
```

### Fake — Implementación working simplificada

```python
# Python — fake in-memory repository
class FakeUserRepository:
    def __init__(self):
        self._users = {}
        self._next_id = 1

    def create(self, name, email):
        user = User(id=self._next_id, name=name, email=email)
        self._users[self._next_id] = user
        self._next_id += 1
        return user

    def find_by_id(self, user_id):
        return self._users.get(user_id)

    def find_by_email(self, email):
        return next((u for u in self._users.values() if u.email == email), None)

    def delete(self, user_id):
        return self._users.pop(user_id, None) is not None

    def count(self):
        return len(self._users)

def test_create_and_find_user():
    repo = FakeUserRepository()
    service = UserService(repo)

    user = service.create_user("Alice", "alice@x.com")
    found = service.get_user(user.id)

    assert found.name == "Alice"
    assert found.email == "alice@x.com"

def test_duplicate_email_rejected():
    repo = FakeUserRepository()
    service = UserService(repo)

    service.create_user("Alice", "alice@x.com")
    with pytest.raises(DuplicateEmailError):
        service.create_user("Bob", "alice@x.com")
```

```java
// Java — fake in-memory repository
public class FakeUserRepository implements UserRepository {
    private final Map<Long, User> users = new HashMap<>();
    private long nextId = 1;

    @Override
    public User create(String name, String email) {
        User user = new User(nextId, name, email);
        users.put(nextId, user);
        nextId++;
        return user;
    }

    @Override
    public User findById(long id) {
        return users.get(id);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return users.values().stream()
            .filter(u -> u.getEmail().equals(email))
            .findFirst();
    }

    @Override
    public boolean delete(long id) {
        return users.remove(id) != null;
    }

    @Override
    public long count() {
        return users.size();
    }
}

// Test usando el fake
@Test
void testCreateAndFindUser() {
    UserRepository repo = new FakeUserRepository();
    UserService service = new UserService(repo);

    User user = service.createUser("Alice", "alice@x.com");
    User found = service.getUser(user.getId());

    assertEquals("Alice", found.getName());
    assertEquals("alice@x.com", found.getEmail());
}
```

### Mock — Expectations pre-programadas

```java
// Java — mock con Mockito
import static org.mockito.Mockito.*;

@Test
void testOrderProcessingCallsRepository() {
    // Crear mock
    OrderRepository repo = mock(OrderRepository.class);
    PaymentGateway gateway = mock(PaymentGateway.class);
    OrderProcessor processor = new OrderProcessor(repo, gateway);

    // Programar expectations
    when(repo.findById(1L)).thenReturn(new Order(1L, 100.0));
    when(gateway.charge(anyString(), eq(100.0))).thenReturn(true);

    // Ejecutar
    boolean result = processor.processOrder(1L, "card-token-123");

    // Verificar interacciones
    assertTrue(result);
    verify(repo).findById(1L);
    verify(repo).save(argThat(order -> order.getStatus() == OrderStatus.COMPLETED));
    verify(gateway, times(1)).charge("card-token-123", 100.0);
    verifyNoMoreInteractions(repo, gateway);
}
```

```javascript
// JavaScript — mock con jest
const orderRepo = {
  findById: jest.fn(),
  save: jest.fn(),
};
const paymentGateway = {
  charge: jest.fn(),
};

const processor = new OrderProcessor(orderRepo, paymentGateway);

beforeEach(() => {
  jest.clearAllMocks();
});

test('processOrder completes successfully', async () => {
  orderRepo.findById.mockResolvedValue({ id: 1, total: 100.0 });
  paymentGateway.charge.mockResolvedValue(true);

  const result = await processor.processOrder(1, 'card-token-123');

  expect(result).toBe(true);
  expect(orderRepo.findById).toHaveBeenCalledWith(1);
  expect(paymentGateway.charge).toHaveBeenCalledWith('card-token-123', 100.0);
  expect(orderRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'COMPLETED' })
  );
});
```

### Elegir el double correcto

```python
# Guía de decisión:
# 1. Necesitás pasar algo pero nunca se llama? → DUMMY
# 2. Necesitás return values controlados? → STUB
# 3. Necesitás verificar que un método fue llamado? → SPY
# 4. Necesitás comportamiento working pero simplificado? → FAKE
# 5. Necesitás asertar secuencias exactas de calls? → MOCK

# Ejemplo: Usar FAKE para repository, SPY para email
class TestOrderService:
    def setup_method(self):
        self.repo = FakeOrderRepository()  # Fake — implementación working
        self.email_service = MagicMock()   # Spy — verificar calls
        self.service = OrderService(self.repo, self.email_service)

    def test_order_triggers_email(self):
        order = self.service.create_order(customer_id=1, total=50.0)

        # Verificar state con fake
        saved = self.repo.find_by_id(order.id)
        assert saved.status == "PENDING"

        # Verificar interacción con spy
        self.email_service.send.assert_called_once()
        call_args = self.email_service.send.call_args
        assert "order" in call_args.kwargs['subject'].lower()
```

## Variants

### Auto-mocking con dependency injection

```python
# Python — pytest con fixture-based auto-mocking
@pytest.fixture
def mock_repo():
    return MagicMock(spec=UserRepository)

@pytest.fixture
def service(mock_repo):
    return UserService(mock_repo)

def test_get_user(service, mock_repo):
    mock_repo.find_by_id.return_value = User(id=1, name="Alice")
    result = service.get_user(1)
    assert result.name == "Alice"
```

### Mock vs Fake para tests de database

```python
# Approach 1: Mock el repository (rápido pero brittle)
def test_with_mock():
    repo = MagicMock()
    repo.find_by_id.return_value = User(id=1, name="Alice")
    # El test se rompe si la implementación llama al repo diferente

# Approach 2: Fake repository (rápido y resiliente)
def test_with_fake():
    repo = FakeUserRepository()
    repo.create("Alice", "alice@x.com")
    # El test se enfoca en comportamiento, no en detalles de implementación
```

### Partial mock — spy en objeto real

```python
# Python — partial mock: objeto real con un método espiado
from unittest.mock import patch

def test_with_partial_mock():
    service = RealOrderService(real_repo, real_email)

    # Solo mockear la call de email, todo lo demás es real
    with patch.object(service, 'send_notification') as mock_send:
        service.process_order(Order(id=1, total=100))
        mock_send.assert_called_once()
```

### Test double con dependency injection container

```java
// Java — Spring test con beans mockeados
@SpringBootTest
class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @MockBean
    private PaymentGateway paymentGateway;

    @Test
    void testOrderWithMockedPayment() {
        when(paymentGateway.charge(anyString(), anyDouble()))
            .thenReturn(true);

        Order order = orderService.createOrder(1L, 100.0);

        assertEquals(OrderStatus.COMPLETED, order.getStatus());
        verify(paymentGateway).charge(anyString(), eq(100.0));
    }
}
```

## Best Practices

- Preferí fakes sobre mocks — los fakes testean comportamiento, los mocks testean implementación
- Usá el double más simple que funcione — dummy > stub > spy > fake > mock
- Mockeá en los boundaries — doblá APIs externas, databases, file systems; no tu propia lógica
- Reseteá spies/mocks entre tests — evitá state leakage
- No mockees value objects — usá instancias reales en su lugar
- Verificá comportamiento, no implementación — asertá qué fue llamado, no cómo fue llamado
- Mantené los fakes realistas — un fake que no se comporta como lo real da false confidence
- Usá `spec` en Python / typing en `jest.fn()` — asegura que el double matchee la interface real

## Common Mistakes

- **Over-mocking**: mockear cada dependencia hace los tests brittle y testea los mocks, no el código. Usá fakes o implementaciones reales cuando sea posible.
- **Mockear lo que no es tuyo**: si la API externa cambia, tu mock no lo atrapa. Usá contract tests en su lugar.
- **No resetear mocks**: state de un test anterior filtra al siguiente. Siempre reseteá en `beforeEach` / `setup`.
- **Verificar demasiados detalles**: `verify(mock).method(arg1, arg2, arg3)` con args exactos es brittle. Usá matchers para flexibilidad.
- **Usar mocks para returns simples de valores**: si un método solo retorna data, usá un stub o fake. Los mocks agregan complejidad innecesaria.

## FAQ

### ¿Cuál es la diferencia entre un mock y un stub?

Un stub retorna responses predefinidas — controlás qué retorna. Un mock tiene expectations — verificás que fue llamado con argumentos específicos. Los stubs son sobre state, los mocks son sobre interacción.

### ¿Qué es un fake?

Un fake es una implementación working pero simplificada de una dependencia. Una in-memory database es un fake — funciona como una database real pero no persiste. Los fakes son preferidos sobre mocks porque testean comportamiento, no implementación.

### ¿Cuándo debería usar un spy vs un mock?

Usá un spy cuando querés registrar calls y verificarlas después. Usá un mock cuando querás setear expectations antes de la call. Los spies son más flexibles, los mocks son más strict.

### ¿Debería mockear la database o usar una real?

Preferí un fake (in-memory) o una database real de test sobre mockear. Mockear la database testea tu mock, no tus queries. Usá una database real para integration tests y un fake para unit tests.

### ¿Qué es un dummy object?

Un dummy es un placeholder pasado para satisfacer una interface pero nunca usado. Por ejemplo, pasar `null` o un no-op logger cuando el código bajo test no loggea nada.

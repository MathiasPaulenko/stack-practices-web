---
contentType: recipes
slug: unit-testing-mocking
title: "Escribir Unit Tests con Mocks y Stubs"
description: "Cómo aislar código bajo test usando objetos mock, stubs y spies para reemplazar dependencias externas como bases de datos, APIs y sistemas de archivos."
metaDescription: "Aprende unit testing con mocks y stubs. Aísla código bajo test reemplazando dependencias externas como bases de datos, APIs y sistemas de archivos para tests confiables."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - unit-tests
  - mocking
  - stubs
  - jest
  - pytest
  - mockito
relatedResources:
  - /recipes/unit-testing
  - /recipes/integration-testing
  - /recipes/api-mocking
  - /recipes/jest-snapshot-testing
  - /recipes/python-mock-external-apis-responses
  - /recipes/java-wiremock-stub-external
lastUpdated: "2026-08-22"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende unit testing con mocks y stubs. Aísla código bajo test reemplazando dependencias externas como bases de datos, APIs y sistemas de archivos para tests confiables."
  keywords:
    - unit testing
    - mocking
    - test doubles
    - jest mock
    - pytest mock
    - junit mockito
    - stub objects
---

Un unit test debería verificar una sola función o clase sin nada más en el medio. El problema es que
la mayoría del código depende de cosas que no querés correr en un suite de tests — bases de datos,
APIs HTTP, sistema de archivos, el reloj, generadores de números aleatorios. El mocking te permite
cambiar esas dependencias por sustitutos controlados que devuelven el valor que necesitás, lanzan
una
excepción específica, o registran cómo fueron llamados.

Esta receta cubre los tres test doubles que más vas a usar — stubs, mocks y spies — con ejemplos en
JavaScript, Python y Java.

## Cuándo Usarlo

Los mocks y stubs son una buena opción cuando tus unit tests tocan bases de datos, APIs o servicios
de terceros. También sirven cuando querés simular un error difícil de disparar en un ambiente real,
acelerar un suite lento, verificar que una función llamó a un colaborador con los argumentos
 correctos, o reemplazar dependencias no determinísticas como la hora actual, UUIDs o valores
random.

## Cuándo NO Usarlo

Si una dependencia es rápida, determinística y simple, usá la real en lugar de un mock. Cuando
necesitás validar cómo interactúan varios componentes reales, mirá [Integration
Testing](/es/recipes/integration-testing/). Y cuando el objetivo es confirmar el contrato HTTP real
de
un servicio externo, herramientas como [WireMock](/es/recipes/java-wiremock-stub-external/) o [API
Mocking](/es/recipes/api-mocking/) suelen ser más apropiadas.

## Solución

### Mock con Jest (JavaScript)

```javascript
import { processPayment } from './payment';
import { sendEmail } from './email';

jest.mock('./email');

test('sends receipt email after successful payment', async () => {
  sendEmail.mockResolvedValue({ messageId: '123' });

  await processPayment({ amount: 100, userId: 'u1' });

  expect(sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'user@example.com',
      subject: 'Payment received',
    })
  );
});

test('handles email service failure gracefully', async () => {
  sendEmail.mockRejectedValue(new Error('SMTP down'));

  const result = await processPayment({ amount: 100, userId: 'u1' });

  expect(result.emailSent).toBe(false);
  expect(result.paymentId).toBeDefined();
});
```

### Mock con Pytest (Python)

```python
from unittest.mock import patch, MagicMock
from payment import process_payment

def test_payment_success():
    with patch('payment.send_email') as mock_email:
        mock_email.return_value = {'message_id': '123'}
        result = process_payment(amount=100, user_id='u1')
        assert result['email_sent'] is True
        mock_email.assert_called_once()

def test_payment_email_failure():
    with patch('payment.send_email', side_effect=SMTPError('timeout')):
        result = process_payment(amount=100, user_id='u1')
        assert result['email_sent'] is False
```

### Stub con Mockito (Java)

```java
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    @Test
    void sendsReceiptOnSuccess() {
        EmailService emailMock = mock(EmailService.class);
        when(emailMock.send(any())).thenReturn(new Receipt("123"));

        PaymentService service = new PaymentService(emailMock);
        service.processPayment(100, "u1");

        verify(emailMock, times(1)).send(argThat(receipt ->
            receipt.getSubject().equals("Payment received")
        ));
    }
}
```

## Explicación

Un stub devuelve una respuesta prefabricada. Podés construir un stub de base de datos que entregue
un
registro de usuario hardcodeado. El código bajo test obtiene los datos que necesita, pero el stub no
le importa si fue llamado o no.

Un mock es más estricto: viene programado con expectativas y falla el test si no se lo llama la
cantidad correcta de veces o con los argumentos correctos. Usá un mock cuando la interacción misma
es
parte del contrato.

Un spy envuelve un objeto real y registra sus llamadas para verificarlas después. Por ejemplo, podés
espiar una caché para asegurarte de que fue consultada antes de que el código golpee la base de
datos.

La regla principal es mockear en el boundary. Reemplazá el cliente HTTP o el driver de base de
datos,
no métodos privados dentro de la clase que estás testeando. Mockear de más hace los tests frágiles y
le quita sentido al unit testing.

## Variantes

| Double | Reemplaza | Verifica llamadas | Mejor para |
| --- | --- | --- | --- |
| Dummy | Parámetro no usado | No | Llenar listas de argumentos |
| Fake | Implementación funcional | No | Base de datos en memoria |
| Stub | Respuesta específica | No | Devolver datos de test |
| Spy | Objeto real + registra | Sí | Verificar side effects |
| Mock | Interacción esperada | Sí | Verificar llamadas hechas |

Usá un stub cuando solo necesitás alimentar datos al código bajo test. Usá un mock cuando la
interacción misma importa. Usá un spy cuando querés que corra la implementación real y solo querés
verificar que fue usada.

## Buenas Prácticas

- Mockeá en el boundary, no dentro de la clase bajo test. Reemplazá el cliente HTTP o el driver de
  base de datos, no cada método privado.
- Preferí stubs para verificación de estado cuando podés. Assertar sobre el estado final ("el
    balance
  es $50") suele ser más resistente al refactoring que assertar sobre la interacción ("withdraw fue
  llamado una vez").
- Reseteá el estado de los mocks entre tests. Jest y Pytest hacen esto automáticamente; en otros
  frameworks, creá instancias frescas para cada test.
- Confiá en la inyección de dependencias. El código que instancia sus propias dependencias con
  `new Database()` es difícil de mockear. Inyectalas vía constructores o factories.
- No mockees objetos de valor. Las clases simples de datos, structs y DTOs no tienen comportamiento
  real, así que pasá instancias reales.
- Mantené las expectativas de mock acotadas. Verificá solo las llamadas que importan, porque
  especificar demasiado ata los tests a detalles de implementación.

## Errores Comunes

- Mockear el sistema bajo test en lugar de sus colaboradores. Cuando mockeás métodos dentro de la
  clase que estás testeando, ya no estás testeando esa clase.
- Especificar interacciones en exceso, como afirmar que `database.connect()` fue llamado exactamente
  una vez. Eso ata el test a detalles de implementación.
- Configurar `verify()` pero nunca llamarlo. El test parece completo, pero te da una falsa sensación
  de confianza.
- Mockear cada clase en un test. Si todo está mockeado, el suite termina testeando los mocks, no el
  sistema real.
- Dejar que los mocks se separen del contrato real. Un mock HTTP que devuelve un shape distinto al
    de
  la API productiva puede ocultar bugs reales.

## Preguntas Frecuentes

### ¿Cuándo debería usar una dependencia real en lugar de un mock?

Usá la implementación real cuando sea rápida, determinística y simple — por ejemplo, un Map en
memoria
o una función pura. Mientras más cerca esté tu test de producción, más confianza útil te va a dar.

### ¿Cuál es la diferencia entre un stub y un mock?

Un stub responde llamadas con datos prefijados. Un mock verifica que se hicieron las llamadas
esperadas. Un mock puede actuar como stub, pero un stub no puede actuar como mock.

### ¿Debería mockear el sistema de archivos?

Para tests unitarios, sí — usá sistemas de archivos virtuales o streams en memoria. Para tests de
integración, escribí a un directorio temporal y limpiá después.

### ¿Puedo mockear métodos estáticos?

En Java, PowerMock y Mockito inline mock pueden hacerlo, pero generalmente no deberías. Los métodos
estáticos son difíciles de testear porque no pueden inyectarse. Refactorizá a métodos de instancia
cuando sea posible.

### ¿Cómo evito el over-mocking?

Mockeá solo las dependencias externas que sean lentas, no determinísticas o no disponibles en tests.
Si un colaborador es rápido y determinístico, usá el real. Cuando dudes, empezá con un stub.

### ¿Cuándo uso un spy?

Usá un spy cuando querés que el objeto real corra pero también necesitás verificar cómo fue llamado.
Ejemplos comunes incluyen chequear que un logger escribió una advertencia o que una caché fue
consultada antes de una query lenta.

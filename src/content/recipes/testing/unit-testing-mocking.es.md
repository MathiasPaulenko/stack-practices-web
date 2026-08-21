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
lastUpdated: "2026-08-19"
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

## Resumen

Los unit tests verifican que una sola función o clase se comporta correctamente en aislamiento. La
mayoría del código depende de sistemas externos — bases de datos, APIs HTTP, sistemas de archivos,
relojes — que son lentos, poco confiables o no disponibles durante los tests. El mocking reemplaza
estas dependencias con sustitutos controlados que devuelven respuestas predeterminadas, lanzan
excepciones bajo demanda o registran cómo fueron llamados.

Un test bien aislado corre en milisegundos, produce el mismo resultado cada vez y falla solo cuando
el código bajo test está roto. Esta receta cubre los tres test doubles esenciales — stubs, mocks y
spies — con ejemplos en JavaScript, Python y Java.

## Cuándo Usarlo

- Escribís unit tests para código que llama bases de datos, APIs o servicios de terceros. Consultá
  [Integration Testing](/es/recipes/integration-testing/) para testear con dependencias reales.
- Testeás manejo de errores para escenarios difíciles de disparar en sistemas reales. Consultá
  [API Mocking](/es/recipes/api-mocking/) para verificar respuestas de error de API.
- Querés acelerar un suite de tests lento dominado por tests de estilo integración.
- Verificás que una función llama a un colaborador con los argumentos correctos.
- Reemplazás dependencias no determinísticas como generadores random, hora actual o UUIDs.

## Cuándo NO Usarlo

- La dependencia es rápida, determinística y simple — usá la implementación real.
- Necesitás validar cómo interactúan varios componentes reales — usá
  [Integration Testing](/es/recipes/integration-testing/).
- Querés verificar el contrato HTTP real de un servicio externo — usá
  [WireMock](/es/recipes/java-wiremock-stub-external/) o [API Mocking](/es/recipes/api-mocking/).

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

- **Stubs**: proveen respuestas prefabricadas a llamadas. Un stub de base de datos podría devolver un
  registro de usuario hardcodeado. Reemplazan queries pero no verifican que las llamadas ocurrieron.
- **Mocks**: objetos pre-programados con expectativas. Un mock falla el test si no es llamado el
  número esperado de veces o con argumentos esperados.
- **Spies**: envuelven objetos reales y registran cada llamada para verificación posterior. Por
  ejemplo, podés espiar una caché real para confirmar que fue consultada antes de golpear la base
  de datos.

La regla clave es mockear en el boundary. Reemplazá el cliente HTTP o el driver de base de datos,
no métodos privados dentro de la clase que estás testeando. Mockear demasiado hace los tests
frágiles y le quita sentido al unit testing.

## Variantes

| Double | Reemplaza | Verifica llamadas | Mejor para |
| --- | --- | --- | --- |
| Dummy | Parámetro no usado | No | Llenar listas de argumentos |
| Fake | Implementación funcional | No | Base de datos en memoria |
| Stub | Respuesta específica | No | Devolver datos de test |
| Spy | Objeto real + registra | Sí | Verificar side effects |
| Mock | Interacción esperada | Sí | Verificar llamadas hechas |

Usá un **stub** cuando solo necesitás alimentar datos al código bajo test. Usá un **mock** cuando la
interacción misma es parte del contrato. Usá un **spy** cuando querés mantener la implementación
real pero verificar que fue usada.

## Buenas Prácticas

- **Mockeá en el boundary, no internamente**: mockeá el cliente HTTP o el driver de base de datos,
  no cada método privado dentro de tu clase.
- **Preferí stubs para verificación de estado**: si podés assertar en el estado final ("el balance
  es $50") en lugar de la interacción ("withdraw fue llamado una vez"), hacelo. Los tests basados
  en estado son más resilientes al refactoring.
- **Reseteá mocks entre tests**: el estado residual de un test previo puede causar fallas confusas.
  Jest y Pytest manejan esto automáticamente; en otros frameworks, creá instancias frescas por test.
- **Usá inyección de dependencias**: el código que instancia sus propias dependencias con
  `new Database()` es difícil de mockear. Inyectá dependencias vía constructores o factories.
- **No mockees objetos de valor**: clases simples de datos, structs y DTOs no tienen comportamiento
  para reemplazar. Pasá instancias reales.
- **Mantené expectativas explícitas**: verificá solo las llamadas que importan. Especificar demasiado
  ata los tests a detalles de implementación.

## Errores Comunes

- **Mockear el sistema bajo test**: mockear métodos dentro de la clase que estás testeando significa
  que no estás testeando la clase en absoluto. Mockeá colaboradores, no el sujeto.
- **Especificar interacciones en exceso**: verificar que `database.connect()` fue llamado exactamente
  una vez ata tu test a detalles de implementación.
- **Ignorar verificación de mock**: configurar `verify()` pero nunca llamarlo en el cuerpo del test
  crea falsa confianza.
- **Usar mocks para todo**: si cada clase está mockeada, tu suite de tests testea los mocks, no el
  sistema real.
- **Dejar que los mocks se separen de la realidad**: un mock HTTP que devuelve un shape distinto al
  de la API productiva puede ocultar bugs reales. Mantené los mocks cerca de los contratos reales.

## Preguntas Frecuentes

### ¿Cuándo debería usar una dependencia real en lugar de un mock?

Usá la implementación real cuando es rápida, determinística y simple — por ejemplo, un Map en
memoria o una función pura. Mientras más cercano esté tu test a producción, más confianza provee.

### ¿Cuál es la diferencia entre un stub y un mock?

Un stub responde llamadas con datos preset. Un mock verifica que se hicieron llamadas esperadas.
Podés usar un mock como stub, pero no viceversa.

### ¿Debería mockear el sistema de archivos?

Para tests unitarios, sí — usá sistemas de archivos virtuales o streams en memoria. Para tests de
integración, escribí a un directorio temporal y limpiá después.

### ¿Puedo mockear métodos estáticos?

En Java, PowerMock y Mockito inline mock pueden hacerlo, pero es desalentado. Los métodos estáticos
son difíciles de testear porque no pueden inyectarse. Refactorizá a métodos de instancia cuando sea
posible.

### ¿Cómo evito el over-mocking?

Mockeá solo dependencias externas que son lentas, no determinísticas o no disponibles en tests. Si
un colaborador es rápido y determinístico, usá el real. Cuando dudes, preferí un stub sobre un mock.

### ¿Cuándo uso un spy?

Usá un spy cuando querés que el objeto real corra pero también necesitás verificar cómo fue
llamado. Ejemplos comunes incluyen chequear que un logger escribió una advertencia o que una caché
fue consultada antes de una query lenta.

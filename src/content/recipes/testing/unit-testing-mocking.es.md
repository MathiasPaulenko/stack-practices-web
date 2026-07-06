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
  - jest
  - unit-tests
  - integration
  - tdd
relatedResources:
  - /recipes/unit-testing
  - /recipes/integration-testing
  - /recipes/load-testing
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

## Visión general

Los unit tests verifican que una sola función o clase se comporta correctamente en aislamiento. Pero la mayoría del código depende de sistemas externos — bases de datos, APIs HTTP, sistemas de archivos — que son lentos, poco confiables o no disponibles durante los tests. El mocking reemplaza estas dependencias con sustitutos controlados que devuelven respuestas predeterminadas, lanzan excepciones bajo demanda, o registran cómo fueron llamados.

Un test bien aislado corre en milisegundos, produce el mismo resultado cada vez, y falla solo cuando el código bajo test — no sus dependencias — está roto. A continuacion se cubre los tres test doubles esenciales: stubs (datos falsos), mocks (verificación de comportamiento), y spies (registro de llamadas).

## Cuándo usarlo

Usa esta receta cuando:

- Escribiendo unit tests para código que llama bases de datos, APIs o servicios de terceros. Consulta [Integration Testing](/recipes/testing/integration-testing) para testear con dependencias reales.
- Testeando manejo de errores para escenarios difíciles de disparar en sistemas reales. Consulta [API Contract Testing](/recipes/testing/api-mocking) para verificar respuestas de error de API.
- Acelerando un suite de tests lento dominado por tests de estilo integración
- Verificando que una función llama a un colaborador con los argumentos correctos
- Reemplazando dependencias no determinísticas (generadores random, hora actual, UUIDs). Consulta [Call REST API](/recipes/api/call-rest-api) para testear lógica de clientes HTTP.

## Solución

### Jest Mock (JavaScript)

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

### Pytest Mock (Python)

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

### Mockito Stub (Java)

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

- **Stubs**: Proveen respuestas prefabricadas a llamadas. Un stub de base de datos podría devolver un registro de usuario hardcodeado. Los stubs reemplazan queries pero no verifican que las llamadas ocurrieron.
- **Mocks**: Objetos pre-programados con expectativas. Un mock falla el test si no es llamado el número esperado de veces o con argumentos esperados. Usa mocks para verificar interacciones entre objetos.
- **Spies**: Objetos reales que registran cada llamada para verificación posterior. Espía una caché real para confirmar que fue consultada antes de golpear la base de datos.

## Variantes

| Double | Reemplaza | Verifica llamadas | Mejor para |
|--------|-----------|-------------------|------------|
| Dummy | Parámetro no usado | No | Llenar listas de argumentos |
| Fake | Implementación funcional | No | Base de datos en memoria |
| Stub | Respuesta específica | No | Devolver datos de test |
| Spy | Objeto real + registra | Sí | Verificar side effects |
| Mock | Interacción esperada | Sí | Verificar llamadas hechas |

## Lo que funciona

- **Mock en el boundary, no internamente**: mock el cliente HTTP o driver de base de datos, no cada método privado dentro de tu clase. Mock excesivo hace los tests frágiles.
- **Prefiere stubs para verificación de estado**: si puedes assertar en el estado final ("el balance es $50") en lugar de la interacción ("withdraw fue llamado una vez"), hazlo. Los tests basados en estado son más resilientes al refactoring.
- **Resetea mocks entre tests**: el estado residual de mock de un test previo puede causar fallas confusas. Jest y Pytest manejan esto automáticamente; en otros frameworks, crea instancias frescas por test.
- **Usa inyección de dependencias**: código que instancia sus propias dependencias con `new Database()` es difícil de mockear. Inyecta dependencias vía constructores o factories.
- **No mockees objetos de valor**: clases simples de datos, structs y DTOs no tienen comportamiento para reemplazar. Pasa instancias reales.

## Errores comunes

- **Mockear el sistema bajo test**: mockear métodos dentro de la clase que estás testeando significa que no estás testeando la clase en absoluto. Mockea colaboradores, no el sujeto.
- **Especificar interacciones en exceso**: verificar que `database.connect()` fue llamado exactamente una vez ata tu test a detalles de implementación. Testea outcomes, no mecánicas internas.
- **Ignorar verificación de mock**: configurar `mock.verify()` pero nunca llamarlo en el cuerpo del test crea falsa confianza.
- **Usar mocks para todo**: si cada clase está mockeada, tu suite de tests testea los mocks, no el sistema real. Mantén una mezcla saludable de tests unitarios y de integración.

## Preguntas frecuentes

**P: ¿Cuándo debería usar una dependencia real en lugar de un mock?**
R: Cuando la dependencia es rápida, determinística y simple — por ejemplo, un Map en memoria o una función pura. Mientras más cercano esté tu test a producción, más confianza provee.

**P: ¿Cuál es la diferencia entre un stub y un mock?**
R: Un stub responde llamadas con datos preset. Un mock verifica que se hicieron llamadas esperadas. Puedes usar un mock como stub, pero no viceversa.

**P: ¿Debería mockear el sistema de archivos?**
R: Para tests unitarios, sí — usa sistemas de archivos virtuales o streams en memoria. Para tests de integración, escribe a un directorio temporal y limpia después.

**P: ¿Puedo mockear métodos estáticos?**
R: En Java, PowerMock y Mockito inline mock pueden hacerlo, pero es desalentado. Los métodos estáticos son difíciles de testear porque no pueden inyectarse. Refactoriza a métodos de instancia cuando sea posible.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

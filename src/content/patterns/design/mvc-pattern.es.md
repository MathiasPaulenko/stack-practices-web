---
contentType: patterns
slug: mvc-pattern
title: "Patrón MVC"
description: "Separa la aplicación en componentes Modelo, Vista y Controlador. Patrón de diseño arquitectural para código organizado y mantenible."
metaDescription: "Aprende el Patrón MVC con ejemplos prácticos en Python, Java y JavaScript. Patrón arquitectural para estructura organizada de aplicaciones."
difficulty: intermediate
topics:
  - architecture
tags:
  - architectural
  - architecture
  - design-pattern
  - java
  - javascript
  - mvc
  - pattern
  - python
  - separation-of-concerns
relatedResources:
  - /patterns/design/repository-pattern
  - /patterns/design/observer-pattern
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón MVC con ejemplos prácticos en Python, Java y JavaScript. Patrón arquitectural para estructura organizada de aplicaciones."
  keywords:
    - mvc pattern
    - patrón de diseño
    - patrón arquitectural
    - model view controller
    - separación de preocupaciones
    - python mvc
    - java mvc
    - javascript mvc
---

# Patrón MVC

## Visión general

El Patrón Modelo-Vista-Controlador (MVC) es un patrón de diseño arquitectural que separa una aplicación en tres componentes interconectados: Modelo (datos y lógica de negocio), Vista (presentación) y Controlador (manejo de entrada y coordinación).

Es la base de muchos frameworks web (Django, Ruby on Rails, ASP.NET MVC) y arquitecturas de aplicaciones de escritorio.

## Cuándo usarlo

Usa el Patrón MVC cuando:
- Quieres una separación limpia entre datos, UI y lógica de interacción de usuario
- Múltiples vistas necesitan mostrar los mismos datos (ej. web y móvil)
- La UI cambia frecuentemente pero el modelo de datos subyacente permanece estable
- Necesitas soportar diferentes mecanismos de entrada (web, CLI, API)
- Múltiples desarrolladores trabajan en diferentes capas simultáneamente

## Solución

### Python

```python
class UserModel:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

class UserView:
    def display(self, user: UserModel):
        print(f"User: {user.name} ({user.email})")

class UserController:
    def __init__(self, model: UserModel, view: UserView):
        self.model = model
        self.view = view

    def update_name(self, name: str):
        self.model.name = name
        self.view.display(self.model)

# Uso
controller = UserController(UserModel("Alice", "alice@example.com"), UserView())
controller.update_name("Alicia")
```

### JavaScript

```javascript
class UserModel {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

class UserView {
  display(user) {
    console.log(`User: ${user.name} (${user.email})`);
  }
}

class UserController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  updateName(name) {
    this.model.name = name;
    this.view.display(this.model);
  }
}

// Uso
const controller = new UserController(
  new UserModel("Alice", "alice@example.com"),
  new UserView()
);
controller.updateName("Alicia");
```

### Java

```java
class UserModel {
    String name;
    String email;
    UserModel(String name, String email) {
        this.name = name;
        this.email = email;
    }
}

class UserView {
    void display(UserModel user) {
        System.out.println("User: " + user.name + " (" + user.email + ")");
    }
}

class UserController {
    private UserModel model;
    private UserView view;
    UserController(UserModel model, UserView view) {
        this.model = model;
        this.view = view;
    }
    void updateName(String name) {
        model.name = name;
        view.display(model);
    }
}

// Uso
UserController controller = new UserController(
    new UserModel("Alice", "alice@example.com"),
    new UserView()
);
controller.updateName("Alicia");
```

## Explicación

MVC divide la responsabilidad en tres capas:

- **Modelo**: Gestiona datos y reglas de negocio. Notifica a las vistas cuando los datos cambian.
- **Vista**: Renderiza los datos del modelo. En aplicaciones modernas, esto suele ser una plantilla o componente.
- **Controlador**: Acepta entrada de usuario, la procesa y actualiza el modelo o la vista según corresponda.

En frameworks web modernos, el Controlador suele mapear rutas HTTP a operaciones del Modelo, mientras que la Vista se renderiza del lado del servidor o como aplicación de página única.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **MVC clásico** | Aplicaciones de escritorio (estilo Smalltalk) | Acoplamiento fuerte vista-modelo |
| **MVP** | Capas de UI testeables | El Presenter se convierte en "god class" |
| **MVVM** | Frameworks frontend (Vue, Angular) | El binding bidireccional añade complejidad |

## Mejores prácticas

- **Mantén los Modelos ignorantes de las Vistas**: Los modelos no deben saber cómo se muestran
- **Haz las Vistas de solo lectura desde el Modelo**: Las vistas observan modelos, pero no los modifican directamente
- **Mantén los Controladores delgados**: La lógica de negocio pertenece al Modelo, no al Controlador
- **Usa el Patrón Observer** para actualizaciones Modelo-a-Vista y reducir acoplamiento
- **Evita acceso directo al Modelo desde Vistas**: Siempre pasa por el Controlador o un ViewModel

## Errores comunes

- **Controladores gordos**: Poner lógica de negocio en controladores en lugar de modelos
- **Modelos guiados por vistas**: Cambiar la estructura del modelo para satisfacer las necesidades de una vista específica
- **Acoplamiento fuerte**: Las vistas llamando directamente a métodos del modelo en lugar de usar eventos
- **Sobre-ingeniería**: Usar MVC completo para un script simple donde la separación no aporta valor
- **Ignorar el flujo de datos**: Permitir que las vistas modifiquen modelos directamente, saltándose el controlador

## Preguntas frecuentes

**P: ¿Sigue siendo relevante MVC con frameworks frontend modernos?**
R: Sí, aunque a menudo en formas evolucionadas. React usa un flujo de datos unidireccional que separa preocupaciones de forma similar. Angular implementa MVVM, que es un descendiente directo.

**P: ¿Cuál es la diferencia entre MVC y MVVM?**
R: MVVM reemplaza el Controlador con un ViewModel que se vincula directamente a la Vista mediante binding bidireccional de datos. Es más común en frameworks frontend.

**P: ¿Puedo usar MVC en una arquitectura serverless?**
R: Sí, aunque el "Controlador" puede ser un API Gateway o función Lambda, el "Modelo" es tu capa de datos y la "Vista" es la respuesta JSON o plantilla renderizada.

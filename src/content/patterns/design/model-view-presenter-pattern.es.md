---

contentType: patterns
slug: model-view-presenter-pattern
title: "Patrón Model-View-Presenter (MVP)"
description: "Separa la lógica de presentación de la view introduciendo un presenter que media entre el model y una view pasiva, habilitando código UI testeable."
metaDescription: "Aprende el Patrón MVP para arquitectura UI testeable. Ejemplos en Python, Java y JavaScript separando concerns de model, view y presenter."
difficulty: intermediate
topics:
  - design
tags:
  - model-view-presenter
  - pattern
  - design-pattern
  - structural
  - mvp
  - ui
  - testing
relatedResources:
  - /patterns/model-view-viewmodel-pattern
  - /patterns/front-controller-pattern
  - /patterns/page-controller-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón MVP para arquitectura UI testeable. Ejemplos en Python, Java y JavaScript separando concerns de model, view y presenter."
  keywords:
    - model view presenter
    - mvp pattern
    - design pattern
    - ui architecture
    - testing

---

# Patrón Model-View-Presenter (MVP)

## Descripción General

El Patrón Model-View-Presenter (MVP) separa una aplicación en tres componentes: el **Model** (lógica de negocio y datos), la **View** (display de UI) y el **Presenter** (mediador que maneja input de usuario y actualiza tanto Model como View). La View es pasiva — delega todas las acciones de usuario al Presenter y es actualizada por el Presenter en respuesta.

MVP es especialmente valioso para crear código UI testeable. Dado que el Presenter contiene toda la lógica de presentación y no tiene dependencia de frameworks de UI, puede ser unit tested en aislamiento con Views mockeadas.

## Cuándo Usar

Usa el Patrón MVP cuando:
- Necesitas lógica UI altamente testeable sin dependencias de browser o GUI
- La tecnología de view puede cambiar (web, desktop, mobile) pero la lógica de negocio permanece
- Quieres mantener la view lo más simple y pasiva posible
- Múltiples views necesitan compartir la misma lógica de presentación

## Cuándo Evitar

- UIs simples donde el overhead de tres componentes separados no está justificado
- Aplicaciones donde la view necesita ser altamente reactiva (MVVM es mejor)
- El presenter se convierte en una God class que sabe demasiado de model y view
- Frameworks que naturalmente favorecen otros patrones (React favorece component-based sobre MVP)

## Solución

### Python

```python
from typing import Protocol

# Model
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

class UserRepository:
    def __init__(self):
        self._users = {"1": User("Alice", "alice@example.com")}

    def find_by_id(self, user_id: str) -> User:
        return self._users.get(user_id)


# View Interface
class UserView(Protocol):
    def set_name(self, name: str): ...
    def set_email(self, email: str): ...
    def show_error(self, message: str): ...


# Presenter
class UserPresenter:
    def __init__(self, view: UserView, repository: UserRepository):
        self.view = view
        self.repository = repository

    def load_user(self, user_id: str):
        user = self.repository.find_by_id(user_id)
        if user:
            self.view.set_name(user.name)
            self.view.set_email(user.email)
        else:
            self.view.show_error("User not found")

    def save_user(self, user_id: str, name: str, email: str):
        if not name or not email:
            self.view.show_error("Name and email are required")
            return
        # Save logic...
        self.view.set_name(name)
        self.view.set_email(email)


# Concrete View (Console)
class ConsoleUserView:
    def __init__(self):
        self.name = ""
        self.email = ""
        self.error = ""

    def set_name(self, name: str):
        self.name = name
        print(f"Name: {name}")

    def set_email(self, email: str):
        self.email = email
        print(f"Email: {email}")

    def show_error(self, message: str):
        self.error = message
        print(f"Error: {message}")


# Uso
view = ConsoleUserView()
presenter = UserPresenter(view, UserRepository())
presenter.load_user("1")
```

### Java

```java
public class User {
    private final String name;
    private final String email;
    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }
    public String getName() { return name; }
    public String getEmail() { return email; }
}

class UserRepository {
    private final java.util.Map<String, User> users = new java.util.HashMap<>();
    public UserRepository() {
        users.put("1", new User("Alice", "alice@example.com"));
    }
    public User findById(String id) { return users.get(id); }
}

interface UserView {
    void setName(String name);
    void setEmail(String email);
    void showError(String message);
}

class UserPresenter {
    private final UserView view;
    private final UserRepository repository;

    public UserPresenter(UserView view, UserRepository repository) {
        this.view = view;
        this.repository = repository;
    }

    public void loadUser(String userId) {
        User user = repository.findById(userId);
        if (user != null) {
            view.setName(user.getName());
            view.setEmail(user.getEmail());
        } else {
            view.showError("User not found");
        }
    }

    public void saveUser(String userId, String name, String email) {
        if (name == null || email == null || name.isEmpty() || email.isEmpty()) {
            view.showError("Name and email are required");
            return;
        }
        view.setName(name);
        view.setEmail(email);
    }
}

class ConsoleUserView implements UserView {
    public void setName(String name) { System.out.println("Name: " + name); }
    public void setEmail(String email) { System.out.println("Email: " + email); }
    public void showError(String message) { System.out.println("Error: " + message); }
}

// Uso
UserView view = new ConsoleUserView();
UserPresenter presenter = new UserPresenter(view, new UserRepository());
presenter.loadUser("1");
```

### JavaScript

```javascript
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

class UserRepository {
  constructor() {
    this.users = new Map([['1', new User('Alice', 'alice@example.com')]]);
  }
  findById(id) {
    return this.users.get(id);
  }
}

class UserPresenter {
  constructor(view, repository) {
    this.view = view;
    this.repository = repository;
  }

  loadUser(userId) {
    const user = this.repository.findById(userId);
    if (user) {
      this.view.setName(user.name);
      this.view.setEmail(user.email);
    } else {
      this.view.showError('User not found');
    }
  }

  saveUser(userId, name, email) {
    if (!name || !email) {
      this.view.showError('Name and email are required');
      return;
    }
    this.view.setName(name);
    this.view.setEmail(email);
  }
}

class ConsoleUserView {
  setName(name) { console.log('Name:', name); }
  setEmail(email) { console.log('Email:', email); }
  showError(message) { console.log('Error:', message); }
}

// Uso
const view = new ConsoleUserView();
const presenter = new UserPresenter(view, new UserRepository());
presenter.loadUser('1');
```

## Explicación

MVP divide la responsabilidad de la siguiente manera:

- **Model**: Contiene estructuras de datos y reglas de negocio. No tiene conocimiento de la UI.
- **View**: Muestra datos y reenvía acciones de usuario al Presenter. Contiene cero lógica.
- **Presenter**: Actúa como intermediario. Recibe input de usuario de la View, manipula el Model y actualiza la View con resultados.

La característica clave es que la **View es pasiva** — no extrae datos del Model. Todos los datos fluyen a través del Presenter.

## Variantes

| Variante | Rol de la View | Caso de Uso |
|----------|----------------|-------------|
| **Passive View** | La view no tiene lógica en absoluto | Máxima testeabilidad |
| **Supervising Controller** | La view puede bind propiedades simples directamente al Model | Reduce boilerplate del presenter |
| **MVC** | El Controller maneja input, la View observa el Model | Frameworks como Rails, Django |
| **MVVM** | La View se bind a propiedades del ViewModel | UIs reactivas (WPF, Vue, Angular) |

## Lo que funciona

- **Haz la View una interfaz.** Esto habilita unit testing del Presenter con una View mockeada.
- **Mantén la View tonta.** Sin lógica de negocio, sin transformación de datos, sin toma de decisiones.
- **El Presenter no debería conocer el framework de UI.** Habla a una interfaz abstracta de View.
- **Un Presenter por pantalla.** No reutilices un Presenter a través de views no relacionadas.
- **El Model debería ser framework-agnostic.** Funciona con o sin UI.

## Errores Comunes

- **La View conoce el Model.** La View solo debería conocer al Presenter.
- **Presenter filtra código de framework.** Importar clases de UI toolkit dificulta el testing.
- **La View no es pasiva.** Si la View llama métodos del Model directamente, es MVC, no MVP.
- **Presenter como God class.** Si crece demasiado, dividir en presenters específicos por caso de uso.
- **Acoplamiento fuerte entre View y Presenter.** Usa interfaces para que cualquiera pueda ser swapeado.

## Ejemplos del Mundo Real

### Android (temprano)

Antes de Jetpack Compose, los desarrolladores de Android usaban MVP para separar Activities (Views) de Presenters, haciendo la lógica de negocio testeable sin el emulador de Android.

### GWT (Google Web Toolkit)

Las aplicaciones GWT comúnmente usaban MVP para separar código de widgets (View) de lógica de aplicación (Presenter) para testeabilidad.

### WinForms / WebForms

Los frameworks UI tempranos de Microsoft usaban una variación de MVP donde los archivos code-behind actuaban como Presenters entre la view declarativa y el data model.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre MVP y MVC?**
A: En MVC, la View observa el Model directamente. En MVP, toda la comunicación pasa a través del Presenter y la View es pasiva.

**Q: Cuál es la diferencia entre MVP y MVVM?**
A: [MVVM](/patterns/design/model-view-viewmodel-pattern) usa data binding bidireccional entre View y ViewModel. MVP usa llamadas a métodos explícitas a través de una interfaz.

**Q: Puedo usar MVP con React?**
A: Puedes, pero el modelo de componentes de React naturalmente favorece componentes container/presentational o hooks en lugar de MVP clásico.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

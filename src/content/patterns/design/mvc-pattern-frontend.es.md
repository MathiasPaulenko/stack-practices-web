---
contentType: patterns
slug: mvc-pattern-frontend
title: "MVC Pattern en Aplicaciones Frontend Modernas"
description: "Aplica el Model-View-Controller pattern en aplicaciones React y Vue para separar datos, UI y logica de interaccion en una arquitectura de componentes mantenible"
metaDescription: "MVC pattern en frontend moderno. Separa datos, UI y logica de interaccion en React y Vue para arquitectura de componentes mantenible y flujo de estado predecible."
difficulty: beginner
topics:
  - design
  - frontend
tags:
  - mvc
  - frontend
  - architecture
  - design-pattern
relatedResources:
  - /patterns/design/repository-pattern-typescript
  - /patterns/design/decorator-pattern-pipeline
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "MVC pattern en frontend moderno. Separa datos, UI y logica de interaccion en React y Vue para arquitectura de componentes mantenible y flujo de estado predecible."
  keywords:
    - mvc pattern
    - frontend architecture
    - react mvc
    - vue mvc
    - component architecture
---

# MVC Pattern en Aplicaciones Frontend Modernas

Model-View-Controller separa una aplicacion en tres componentes: Model (datos y reglas), View (presentacion) y Controller (manejo de entrada y coordinacion). Aunque frameworks como React y Vue difuminan estos limites, aplicar disciplina MVC previene que los componentes se conviertan en mezclas inmantenibles de estado, UI y efectos secundarios.

## Cuando Usar Esto

- Los componentes crecen mas de 200 lineas porque mezclan fetching de datos, transformacion y renderizado
- La misma logica de datos se duplica a traves de multiples paginas
- Testear la UI requiere mockear redes, stores y DOM simultaneamente

## Problema

Un componente React que obtiene usuarios, filtra por busqueda, ordena por nombre, pagina resultados y renderiza tarjetas es imposible de testear o reutilizar.

## Solucion

```typescript
// model/UserModel.ts
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

class UserModel {
  private users: User[] = [];

  setUsers(users: User[]) {
    this.users = users;
  }

  getFilteredUsers(query: string): User[] {
    if (!query) return this.users;
    const lower = query.toLowerCase();
    return this.users.filter(u =>
      u.name.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower)
    );
  }

  getSortedUsers(field: keyof User, direction: 'asc' | 'desc'): User[] {
    return [...this.users].sort((a, b) => {
      const cmp = String(a[field]).localeCompare(String(b[field]));
      return direction === 'desc' ? -cmp : cmp;
    });
  }
}

// controller/UserController.ts
class UserController {
  constructor(private model: UserModel) {}

  async loadUsers(): Promise<void> {
    const res = await fetch('/api/users');
    const users = await res.json();
    this.model.setUsers(users);
  }

  search(query: string): User[] {
    return this.model.getFilteredUsers(query);
  }

  sort(field: keyof User, direction: 'asc' | 'desc'): User[] {
    return this.model.getSortedUsers(field, direction);
  }
}

// view/UserListView.tsx
import { useState, useEffect } from 'react';

function UserListView({ controller }: { controller: UserController }) {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    controller.loadUsers().then(() => {
      setUsers(controller.search(''));
    });
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    setUsers(controller.search(q));
  };

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Buscar usuarios..."
      />
      <ul>
        {users.map(u => (
          <li key={u.id}>{u.name} — {u.email}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Variaciones

- **MVVM**: ViewModel expone propiedades observables que la View enlaza directamente
- **MVP**: Presenter actualiza la View imperativamente en lugar de la View observando estado
- **Flux/Redux**: Flujo de datos unidireccional con un dispatcher central reemplazando al Controller

## Mejores Practicas

- Manten los Models puros — sin efectos secundarios, sin referencias al DOM
- Los Controllers orquestan pero no saben como se renderizan los datos
- Las Views son delgadas — reciben datos y emiten eventos, no contienen reglas de negocio

## Errores Comunes

- Poner logica de fetch dentro de la View en lugar del Controller
- Hacer que el Model sea consciente de manejo de estado especifico del framework
- Permitir que la View mute directamente los datos del Model

## FAQ

**P: React ya maneja MVC con hooks y context?**
R: React proporciona bloques de construccion, no arquitectura. Los hooks manejan estado local; no enforcean separacion de preocupaciones. MVC agrega disciplina.

**P: Cuando deberia usar Redux en lugar de MVC?**
R: MVC funciona bien para funcionalidades localizadas. Redux brilla cuando multiples componentes no relacionados necesitan los mismos datos o cuando el debugging con time-travel es valioso.

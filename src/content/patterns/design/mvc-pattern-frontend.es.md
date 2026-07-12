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
  - design-patterns
relatedResources:
  - /patterns/repository-pattern-typescript
  - /patterns/decorator-pattern-pipeline
  - /guides/testing-strategy-guide
  - /recipes/server-side-rendering
  - /recipes/websockets-realtime
lastUpdated: "2026-07-09"
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

[Model-View-Controller](/patterns/design/mvc-pattern) separa una aplicacion en tres componentes: Model (datos y reglas), View (presentacion) y Controller (manejo de entrada y coordinacion). Aunque frameworks como React y Vue difuminan estos limites, aplicar disciplina MVC previene que los componentes se conviertan en mezclas inmantenibles de estado, UI y efectos secundarios.

## Cuando Usar Esto

- Los componentes crecen mas de 200 lineas porque mezclan fetching de datos, transformacion y renderizado. Consulta [Component Testing](/recipes/testing/playwright-component-testing) para patrones de UI testeables.
- La misma logica de datos se duplica a traves de multiples paginas. Consulta [Repository Pattern](/patterns/design/repository-pattern-typescript) para capas de acceso a datos compartidas.
- Testear la UI requiere mockear redes, stores y DOM simultaneamente. Consulta [Unit Testing](/recipes/testing/unit-testing-mocking) para estrategias de tests aislados.

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

### Ejemplo Vue

```vue
<!-- view/UserListView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { UserController, UserModel } from './userMVC';

const model = new UserModel();
const controller = new UserController(model);
const users = ref<User[]>([]);
const query = ref('');

onMounted(async () => {
  await controller.loadUsers();
  users.value = controller.search('');
});

const handleSearch = (q: string) => {
  query.value = q;
  users.value = controller.search(q);
};
</script>

<template>
  <div>
    <input
      type="search"
      v-model="query"
      @input="handleSearch(query)"
      placeholder="Buscar usuarios..."
    />
    <ul>
      <li v-for="u in users" :key="u.id">{{ u.name }} — {{ u.email }}</li>
    </ul>
  </div>
</template>
```

El mismo Model y Controller funcionan sin cambios. Solo la View difiere, que es el punto de separar concerns.

## Variaciones

- **MVVM**: ViewModel expone propiedades observables que la View enlaza directamente
- **MVP**: Presenter actualiza la View imperativamente en lugar de la View observando estado
- **Flux/Redux**: Flujo de datos unidireccional con un dispatcher central reemplazando al Controller
- **MVU (Model-View-Update)**: Popular en Elm. Una funcion pura de update produce un nuevo Model desde mensajes, y la View renderiza desde el Model actual. Sin estado mutable.

## Lo que Funciona

- Manten los Models puros — sin efectos secundarios, sin referencias al DOM
- Los Controllers orquestan pero no saben como se renderizan los datos
- Las Views son delgadas — reciben datos y emiten eventos, no contienen reglas de negocio

## Como Funciona

El Model posee la forma de los datos y las reglas de negocio. Sabe filtrar, ordenar, validar y relacionar entidades, pero no conoce React, Vue ni el DOM. Mantener los Models puros los hace triviales de testear con datos simples.

El Controller posee la intencion del usuario y la coordinacion. Decide cuando obtener datos, que metodos del Model llamar y que hacer con los resultados. El Controller puede referenciar servicios, repositorios u otros controllers, pero no importa JSX ni plantillas.

La View posee la presentacion. Recibe datos, renderiza markup y reenvia eventos. Las Views se mantienen delgadas: llaman metodos del controller ante entradas del usuario y se re-renderizan cuando el estado cambia. Los hooks del framework viven aqui, pero solo para estado local de UI como foco, hover o animacion.

## Mejores Practicas

- Manten los Models agnosticos al framework. Deberian compilar sin imports de React o Vue.
- Prefiere actualizaciones inmutables dentro de los Models para que los cambios sean predecibles y baratos de comparar.
- Inyecta dependencias en los Controllers en lugar de construirlas dentro. Esto simplifica testing y cambio de implementaciones.
- Usa una capa dedicada de servicio o repositorio para llamadas de red. Los Controllers orquestan servicios; no deberian contener fetch boilerplate en todos lados.
- Manten las Views sin estado cuando sea posible. El estado local es valido para concerns de UI, pero el estado de dominio pertenece al Model.
- Testea cada capa de forma aislada. Los Models necesitan solo datos de ejemplo, los controllers necesitan Models mockeados, y las Views necesitan controllers stubbeados.
- Documenta la interfaz publica de cada capa para que los companeros sepan donde agregar nuevo comportamiento.

## Errores Comunes

- Poner logica de fetch dentro de la View en lugar del Controller o capa de servicio.
- Mutar estado del Model directamente desde una View, saltando metodos del Controller.
- Hacer que el Model dependa de manejo de estado especifico del framework o lifecycle hooks.
- Crear Models anemicos que son solo bolsas de datos sin comportamiento.
- Permitir que los Controllers crezcan a god objects que manejan UI, routing, validacion y persistencia.
- Saltar tests de capa porque "es mas facil testear el componente completo."
- Mezclar logica de routing con logica de negocio en Controllers o Views.
- Ignorar estados de loading, error y vacio cuando el Controller obtiene datos asincronicamente.
- Poner validacion solo en la UI mientras el Model acepta cualquier valor.
- Acoplar Controllers a implementaciones especificas de View en lugar de tratarlas como consumidoras delgadas.

## FAQ

### React ya maneja MVC con hooks y context?

React proporciona bloques de construccion, no arquitectura. Los hooks manejan estado local; no enforcean separacion de preocupaciones. MVC agrega disciplina decidiendo donde viven la logica de dominio, la coordinacion y la presentacion.

### Cuando deberia usar Redux en lugar de MVC?

MVC funciona bien para funcionalidades localizadas. Para patrones de capa de datos, consulta [Repository](/patterns/design/repository-pattern-typescript). Redux brilla cuando multiples componentes no relacionados necesitan los mismos datos o cuando el debugging con time-travel es valioso.

### Como manejo operaciones async en MVC?

Los Controllers manejan operaciones async. Usa async/await en metodos del controller y actualiza el Model con los resultados. La View muestra estados de loading y error mientras el Controller obtiene datos.

**P: Los Models deberian ser clases planas o estado del framework?**
R: Prefiere clases planas o estructuras de datos simples. El estado del framework pertenece a las Views o librerias de estado. Los Models puros son mas faciles de testear y reutilizar fuera de la capa de UI.

**P: Como testeo las capas MVC de forma independiente?**
R: Testea los Models con datos simples y aserciones. Testea los Controllers con Models y servicios mockeados. Testea las Views con controllers stubbeados y eventos de usuario falsos. Cada capa deberia ser testeable sin las otras.

**P: Donde pertenece el routing en MVC?**
R: El routing es un concern separado. Los Controllers pueden reaccionar a parametros de ruta, pero el parseo de rutas y la navegacion pertenecen a una capa de router. Manten la logica de URLs fuera de los Models y la logica de negocio fuera del router.

**P: Puedo usar MVC con TypeScript?**
R: Si. TypeScript fortalece el patron tipando los campos del Model, las interfaces del Controller y los props de la View. Los tipos fuertes hacen obvio cuando una capa filtra hacia otra.

**P: Como manejo formularios y validacion?**
R: Las reglas de validacion viven en el Model. La View llama metodos del controller ante cambios de input, y el Controller pregunta al Model si los datos son validos. Los mensajes de error fluyen de vuelta a la View a traves del Controller.

**P: La View deberia llamar la API directamente?**
R: No. Las llamadas a la API pertenecen a servicios o repositorios. La View reenvia eventos al Controller, que coordina la llamada al servicio y actualiza el Model.

**P: Como comparto estado entre componentes no relacionados?**
R: Eleva el estado compartido a un Controller de nivel superior o usa una libreria de manejo de estado. MVC no prohíbe stores compartidos; solo pide mantener la logica de dominio fuera de las Views.

**P: Donde pertenecen los efectos secundarios?**
R: Los efectos secundarios como fetch, timers o acceso a storage pertenecen a servicios o controllers. Los Models deberian permanecer puros, y las Views deberian evitar efectos secundarios mas alla del renderizado.

**P: Como manejo errores?**
R: Los Controllers capturan errores de servicios y actualizan un campo del Model o retornan un tipo result. Las Views renderizan el estado de error. Manten el manejo de errores fuera de event handlers crudos de UI.

**P: MVC puede funcionar con SSR?**
R: Si. Los Models pueden poblarse en el servidor, los Controllers pueden instanciarse por request, y las Views pueden renderizar desde props iniciales. Solo evita referenciar APIs exclusivas del navegador en los Models.

**P: Como mantengo los Models sincronizados con el estado del servidor?**
R: Usa una capa de repositorio o servicio para fetch y caching. El Controller refresca el Model cuando es necesario. Para sync complejo, considera actualizaciones optimistas, invalidacion o suscripciones en tiempo real manejadas por el Controller.

**P: Cuando deberia dividir un Controller?**
R: Divide un Controller cuando maneja multiples workflows no relacionados, cuando se vuelve dificil de testear, o cuando diferentes Views necesitan diferente logica de coordinacion. Controllers mas pequenos y enfocados son mas faciles de razonar.

**P: Como funciona MVC con Vue.js?**
R: Los componentes de Vue son Views. Usa un store reactivo o clase como Model, y un modulo plano de TypeScript como Controller. La composition API de Vue mapea bien: `ref` y `reactive` mantienen estado de la View, mientras que computed properties derivan de datos del Model.

**P: Puedo usar MVC con micro-frontends?**
R: Si. Cada micro-frontend puede tener su propia triada MVC. Comparte Models a traves de un contrato de datos comun o event bus. Manten los Controllers scoped a cada micro-frontend para evitar acoplamiento entre fronteras.

**P: Como manejo actualizaciones en tiempo real con WebSockets?**
R: El Controller se suscribe a eventos WebSocket y actualiza el Model. La View reacciona a cambios del Model a traves del re-renderizado normal. Manten la conexion WebSocket en una capa de servicio, no en la View ni el Model.

**P: Deberia usar MVC para cada componente?**
R: No. Componentes presentacionales simples que reciben props y emiten eventos no necesitan MVC. Aplica el patron cuando un componente acumula logica de negocio, multiples fuentes de datos o interacciones complejas.

**P: Como manejo undo/redo en MVC?**
R: El Model almacena un stack de historial de estados. El Controller llama metodos `undo()` y `redo()` en el Model. La View se re-renderiza desde el estado actual del Model. Manten la logica de undo fuera de la View completamente.

**P: Como se compara MVC con MVU (Model-View-Update)?**
R: MVU enforcea inmutabilidad y una sola funcion de update, mientras que MVC permite Models mutables y multiples metodos de Controller. MVU es mas rigido pero mas facil de razonar. MVC es mas flexible pero requiere disciplina para mantener las capas limpias.

**P: Puedo mezclar MVC con React Context?**
R: Si. Usa Context para proveer Controllers o servicios al arbol de Views. La instancia del Controller vive en un provider, y las Views la consumen via `useContext`. Manten el Model fuera de Context a menos que necesites compartir estado cross-tree.

**P: Como manejo paginacion en MVC?**
R: El Model rastrea la pagina actual, tamano de pagina y total de items. El Controller llama `nextPage()` o `goToPage(n)` en el Model y obtiene datos del servicio. La View renderiza controles de paginacion y lee la pagina actual del Model.

**P: Que pasa con inyeccion de dependencias en MVC frontend?**
R: Pasa servicios y repositorios a traves de constructores de Controller. En React, usa Context o un contenedor DI para proveer instancias. En Vue, usa `provide`/`inject`. Esto hace los Controllers testeables con dependencias mockeadas.

**P: Como manejo actualizaciones optimistas?**
R: El Controller aplica el cambio al Model inmediatamente, luego envia la request. Si la request falla, el Controller revierte el Model a su estado anterior. La View se re-renderiza desde el Model en cada cambio.

**P: MVC puede funcionar con GraphQL?**
R: Si. Envuelve queries y mutations de GraphQL en una capa de servicio. El Controller llama al servicio y actualiza el Model con la respuesta. Las suscripciones van a traves del Controller, que empuja actualizaciones al Model.

**P: Como manejo autenticacion en MVC?**
R: Manten tokens de auth y estado de sesion en un AuthService dedicado. Los Controllers verifican el estado de auth antes de realizar operaciones. Las Views muestran prompts de login cuando el Controller senala estado no autenticado. No almacenes tokens en el Model.

**P: Como manejo internacionalizacion (i18n)?**
R: Los strings de traduccion pertenecen a un servicio i18n separado. La View llama al servicio para etiquetas traducidas. El Model almacena datos en formato locale-independent. El Controller puede disparar cambios de locale y refrescar la View.

**P: Como manejo animaciones en MVC?**
R: La logica de animacion pertenece a la View. El Model y el Controller no deberian saber de transiciones o motion. Si una animacion depende del estado de datos, la View lee el estado y decide como animar.

**P: Como manejo subida de archivos en MVC?**
R: La View captura el evento de input de archivo y lo reenvia al Controller. El Controller llama un servicio de upload y rastrea el progreso en el Model. La View renderiza una barra de progreso desde el estado de upload del Model.

**P: Puedo usar MVC con server components?**
R: Los server components difuminan la linea. Trata los server components como View + Controller combinados: obtienen datos y renderizan. Manten la logica de negocio en modulos de Model compartidos que funcionan en servidor y cliente. Evita importar codigo solo de servidor en los Models.

**P: Como manejo caching en MVC?**
R: El caching pertenece a la capa de servicio o repositorio. El Controller pide datos al servicio, y el servicio decide si retornar datos cacheados o frescos. El Model recibe lo que el servicio retorna. Manten la logica de invalidacion de cache en el servicio.

**P: Como manejo accesibilidad en MVC?**
R: Los concerns de accesibilidad viven en la View. Atributos ARIA, navegacion por teclado y manejo de foco son detalles de presentacion. El Model y el Controller no deberian conocer los requisitos de accesibilidad.

**P: Como manejo soporte offline?**
R: Una capa de servicio detecta el estado offline y encola operaciones. El Controller envia operaciones al servicio, que las almacena para sync posterior. El Model refleja el estado optimista. Cuando la conectividad retorna, el servicio vacia la cola.

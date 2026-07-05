---
contentType: patterns
slug: state-machine-ui-pattern
title: "Patrón State Machine UI: Modelá UI State Transitions con Finite State Machines"
description: "Cómo modelar UI state transitions con finite state machines en React. Cubre XState, statecharts, guarded transitions, y prevenir impossible states."
metaDescription: "Modelá UI state transitions con finite state machines en React. Aprende XState, statecharts, guarded transitions, y prevenir impossible states."
difficulty: advanced
topics:
  - frontend
tags:
  - frontend
  - react
  - state-machine
  - xstate
  - state-management
  - pattern
category: architectural
relatedResources:
  - /patterns/custom-hook-composition-pattern
  - /patterns/container-presenter-pattern
  - /patterns/optimistic-update-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Modelá UI state transitions con finite state machines en React. Aprende XState, statecharts, guarded transitions, y prevenir impossible states."
  keywords:
    - frontend
    - react
    - state-machine
    - xstate
    - state-management
    - pattern
---

## Overview

Una finite state machine (FSM) modela UI behavior como un set de states y transitions entre ellos. En vez de scattered boolean flags (`isLoading`, `isError`, `isSuccess`, `data`), tenés un single `state` value que puede solo ser uno de un fixed set de states. Las transitions son explicit — definís exactamente qué events pueden mover desde qué states. Esto previene impossible states (loading y error al mismo tiempo), hace el UI behavior predictable, y provee un visual model del behavior del component. XState es el FSM library más popular para React, pero el pattern funciona con cualquier state management approach.

## When to Use

- Multi-step forms con complex state transitions (wizard, checkout flow)
- Components con muchos boolean flags que crean impossible combinations
- Interactive components con clear states (idle, loading, success, error, retry)
- UI flows que necesitan ser testable y predictable
- Components donde business rules gobiernan state transitions

## When NOT to Use

- Components simples con 1-2 states — un boolean está fine
- Components donde state es solo data (una list, un filter) — usá useState o useReducer
- Applications ya committed a un different state management approach
- Prototypes donde el state model está todavía evolving

## Solution

### Basic state machine con useReducer

```jsx
// useFormMachine.js — simple FSM con useReducer
import { useReducer, useCallback } from 'react';

const states = {
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
};

const initialState = { state: states.IDLE, data: null, error: null };

function formReducer(state, action) {
  switch (state.state) {
    case states.IDLE:
      if (action.type === 'SUBMIT') {
        return { state: states.SUBMITTING, data: null, error: null };
      }
      return state;

    case states.SUBMITTING:
      if (action.type === 'SUCCESS') {
        return { state: states.SUCCESS, data: action.data, error: null };
      }
      if (action.type === 'ERROR') {
        return { state: states.ERROR, data: null, error: action.error };
      }
      return state;

    case states.SUCCESS:
      if (action.type === 'RESET') {
        return initialState;
      }
      return state;

    case states.ERROR:
      if (action.type === 'RETRY') {
        return { state: states.SUBMITTING, data: null, error: null };
      }
      if (action.type === 'RESET') {
        return initialState;
      }
      return state;

    default:
      return state;
  }
}

function useFormMachine(submitFn) {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const submit = useCallback(async (formData) => {
    dispatch({ type: 'SUBMIT' });
    try {
      const data = await submitFn(formData);
      dispatch({ type: 'SUCCESS', data });
    } catch (error) {
      dispatch({ type: 'ERROR', error: error.message });
    }
  }, [submitFn]);

  const retry = useCallback(() => dispatch({ type: 'RETRY' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { ...state, submit, retry, reset };
}

export { states, useFormMachine };
```

```jsx
// ContactForm.jsx — usando el form machine
import { useFormMachine, states } from '../hooks/useFormMachine';

function ContactForm() {
  const { state, data, error, submit, retry, reset } = useFormMachine(
    async (formData) => {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to submit');
      return response.json();
    }
  );

  if (state === states.SUCCESS) {
    return (
      <div className="success">
        <h2>Thank you!</h2>
        <p>{data.message}</p>
        <button onClick={reset}>Send another</button>
      </div>
    );
  }

  if (state === states.ERROR) {
    return (
      <div className="error">
        <h2>Submission failed</h2>
        <p>{error}</p>
        <button onClick={retry}>Try again</button>
        <button onClick={reset}>Start over</button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      submit(new FormData(e.target));
    }}>
      <input name="email" type="email" required placeholder="Email" />
      <textarea name="message" required placeholder="Message" />
      <button type="submit" disabled={state === states.SUBMITTING}>
        {state === states.SUBMITTING ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

### XState machine para un data fetcher

```jsx
// fetchMachine.js — XState machine para data fetching
import { createMachine, assign } from 'xstate';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: {
    data: null,
    error: null,
    retries: 0,
  },
  states: {
    idle: {
      on: {
        FETCH: 'loading',
      },
    },
    loading: {
      invoke: {
        src: 'fetchData',
        onDone: {
          target: 'success',
          actions: assign({ data: (_, event) => event.data, error: null }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data.message,
            retries: (context) => context.retries + 1,
          }),
        },
      },
      on: {
        CANCEL: 'idle',
      },
    },
    success: {
      on: {
        REFETCH: 'loading',
        RESET: 'idle',
      },
    },
    error: {
      on: {
        RETRY: {
          target: 'loading',
          cond: (context) => context.retries < 3,
        },
        RESET: 'idle',
      },
    },
  },
});

export default fetchMachine;
```

```jsx
// DataFetcher.jsx — usando XState con React
import { useMachine } from '@xstate/react';
import fetchMachine from '../machines/fetchMachine';

function DataFetcher({ url }) {
  const [state, send] = useMachine(fetchMachine, {
    services: {
      fetchData: () => fetch(url).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    },
  });

  const { data, error, retries } = state.context;

  if (state.matches('idle')) {
    return <button onClick={() => send('FETCH')}>Load data</button>;
  }

  if (state.matches('loading')) {
    return (
      <div>
        <div className="spinner">Loading...</div>
        <button onClick={() => send('CANCEL')}>Cancel</button>
      </div>
    );
  }

  if (state.matches('success')) {
    return (
      <div>
        <pre>{JSON.stringify(data, null, 2)}</pre>
        <button onClick={() => send('REFETCH')}>Refresh</button>
      </div>
    );
  }

  if (state.matches('error')) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <p>Attempts: {retries}</p>
        {retries < 3 ? (
          <button onClick={() => send('RETRY')}>Retry</button>
        ) : (
          <p>Max retries reached.</p>
        )}
        <button onClick={() => send('RESET')}>Reset</button>
      </div>
    );
  }

  return null;
}
```

### Multi-step wizard con XState

```jsx
// checkoutMachine.js — checkout flow state machine
import { createMachine, assign } from 'xstate';

const checkoutMachine = createMachine({
  id: 'checkout',
  initial: 'cart',
  context: {
    cart: [],
    shippingAddress: null,
    paymentMethod: null,
    order: null,
    error: null,
  },
  states: {
    cart: {
      on: {
        NEXT: 'shipping',
        REMOVE_ITEM: {
          actions: assign({
            cart: (ctx, event) => ctx.cart.filter(item => item.id !== event.id),
          }),
        },
      },
    },
    shipping: {
      on: {
        NEXT: {
          target: 'payment',
          cond: (ctx) => ctx.shippingAddress !== null,
        },
        BACK: 'cart',
        SET_ADDRESS: {
          actions: assign({
            shippingAddress: (_, event) => event.address,
          }),
        },
      },
    },
    payment: {
      on: {
        NEXT: {
          target: 'review',
          cond: (ctx) => ctx.paymentMethod !== null,
        },
        BACK: 'shipping',
        SET_PAYMENT: {
          actions: assign({
            paymentMethod: (_, event) => event.method,
          }),
        },
      },
    },
    review: {
      on: {
        SUBMIT: 'processing',
        BACK: 'payment',
      },
    },
    processing: {
      invoke: {
        src: 'submitOrder',
        onDone: {
          target: 'confirmation',
          actions: assign({ order: (_, event) => event.data }),
        },
        onError: {
          target: 'error',
          actions: assign({ error: (_, event) => event.data.message }),
        },
      },
    },
    confirmation: {
      type: 'final',
    },
    error: {
      on: {
        RETRY: 'processing',
        BACK: 'review',
      },
    },
  },
});

export default checkoutMachine;
```

```jsx
// Checkout.jsx — multi-step checkout usando el machine
import { useMachine } from '@xstate/react';
import checkoutMachine from '../machines/checkoutMachine';

function Checkout({ initialCart }) {
  const [state, send] = useMachine(checkoutMachine, {
    context: { cart: initialCart },
    services: {
      submitOrder: (context) =>
        fetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify({
            cart: context.cart,
            shipping: context.shippingAddress,
            payment: context.paymentMethod,
          }),
        }).then(res => res.json()),
    },
  });

  if (state.matches('cart')) {
    return (
      <div>
        <h2>Your Cart</h2>
        {state.context.cart.map(item => (
          <div key={item.id}>
            {item.name} — ${item.price}
            <button onClick={() => send({ type: 'REMOVE_ITEM', id: item.id })}>
              Remove
            </button>
          </div>
        ))}
        <button onClick={() => send('NEXT')}>Continue to Shipping</button>
      </div>
    );
  }

  if (state.matches('shipping')) {
    return (
      <div>
        <h2>Shipping Address</h2>
        <AddressForm
          onSave={(address) => send({ type: 'SET_ADDRESS', address })}
        />
        <button onClick={() => send('BACK')}>Back to Cart</button>
        <button
          onClick={() => send('NEXT')}
          disabled={!state.context.shippingAddress}
        >
          Continue to Payment
        </button>
      </div>
    );
  }

  if (state.matches('payment')) {
    return (
      <div>
        <h2>Payment Method</h2>
        <PaymentForm
          onSave={(method) => send({ type: 'SET_PAYMENT', method })}
        />
        <button onClick={() => send('BACK')}>Back to Shipping</button>
        <button
          onClick={() => send('NEXT')}
          disabled={!state.context.paymentMethod}
        >
          Review Order
        </button>
      </div>
    );
  }

  if (state.matches('review')) {
    return (
      <div>
        <h2>Review Your Order</h2>
        <pre>{JSON.stringify(state.context, null, 2)}</pre>
        <button onClick={() => send('BACK')}>Back to Payment</button>
        <button onClick={() => send('SUBMIT')}>Place Order</button>
      </div>
    );
  }

  if (state.matches('processing')) {
    return <div className="spinner">Processing your order...</div>;
  }

  if (state.matches('confirmation')) {
    return (
      <div className="confirmation">
        <h2>Order Confirmed!</h2>
        <p>Order #{state.context.order.id}</p>
      </div>
    );
  }

  if (state.matches('error')) {
    return (
      <div className="error">
        <h2>Order Failed</h2>
        <p>{state.context.error}</p>
        <button onClick={() => send('RETRY')}>Try Again</button>
        <button onClick={() => send('BACK')}>Back to Review</button>
      </div>
    );
  }

  return null;
}
```

### Toggle component con FSM

```jsx
// toggleMachine.js — simple toggle machine
import { createMachine } from 'xstate';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
});

export default toggleMachine;
```

```jsx
// Dropdown.jsx — dropdown con proper state management
import { createMachine, assign } from 'xstate';
import { useMachine } from '@xstate/react';

const dropdownMachine = createMachine({
  id: 'dropdown',
  initial: 'closed',
  context: { selectedIndex: 0 },
  states: {
    closed: {
      on: {
        OPEN: 'open',
        TOGGLE: 'open',
      },
    },
    open: {
      on: {
        CLOSE: 'closed',
        TOGGLE: 'closed',
        SELECT: {
          target: 'closed',
          actions: assign({
            selectedIndex: (_, event) => event.index,
          }),
        },
        CLICK_OUTSIDE: 'closed',
        ESCAPE: 'closed',
      },
    },
  },
});

function Dropdown({ items }) {
  const [state, send] = useMachine(dropdownMachine);
  const selectedItem = items[state.context.selectedIndex];

  return (
    <div className="dropdown" tabIndex={0}>
      <button
        onClick={() => send('TOGGLE')}
        onKeyDown={(e) => e.key === 'Escape' && send('ESCAPE')}
      >
        {selectedItem.label} {state.matches('open') ? '▲' : '▼'}
      </button>

      {state.matches('open') && (
        <ul className="dropdown-menu">
          {items.map((item, index) => (
            <li
              key={item.id}
              onClick={() => send({ type: 'SELECT', index })}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Guarded transitions

```jsx
// authMachine.js — guarded transitions con conditions
import { createMachine, assign } from 'xstate';

const authMachine = createMachine({
  id: 'auth',
  initial: 'unauthenticated',
  context: {
    user: null,
    token: null,
    loginAttempts: 0,
  },
  states: {
    unauthenticated: {
      on: {
        LOGIN: 'authenticating',
      },
    },
    authenticating: {
      invoke: {
        src: 'authenticate',
        onDone: {
          target: 'authenticated',
          actions: assign({
            user: (_, event) => event.data.user,
            token: (_, event) => event.data.token,
            loginAttempts: 0,
          }),
        },
        onError: {
          target: 'authError',
          actions: assign({
            loginAttempts: (ctx) => ctx.loginAttempts + 1,
          }),
        },
      },
    },
    authenticated: {
      on: {
        LOGOUT: {
          target: 'unauthenticated',
          actions: assign({ user: null, token: null }),
        },
      },
    },
    authError: {
      on: {
        RETRY: {
          target: 'authenticating',
          cond: (ctx) => ctx.loginAttempts < 3,
        },
        BACK: 'unauthenticated',
      },
    },
  },
});

export default authMachine;
```

## Variants

### Hierarchical state machine

```jsx
// fileUploadMachine.js — nested states
import { createMachine, assign } from 'xstate';

const uploadMachine = createMachine({
  id: 'upload',
  initial: 'idle',
  context: { progress: 0, file: null, url: null },
  states: {
    idle: {
      on: { SELECT_FILE: { target: 'selected', actions: assign({ file: (_, e) => e.file }) } },
    },
    selected: {
      on: { START: 'uploading', CANCEL: 'idle' },
    },
    uploading: {
      initial: 'sending',
      states: {
        sending: {
          on: {
            PROGRESS: { actions: assign({ progress: (_, e) => e.progress }) },
            COMPLETE: { target: 'done', actions: assign({ url: (_, e) => e.url }) },
            FAIL: 'failed',
          },
        },
        failed: {
          on: { RETRY: 'sending' },
        },
        done: { type: 'final' },
      },
      on: { CANCEL: 'idle' },
    },
  },
});
```

### Actor model para concurrent state machines

```jsx
// concurrentUploads.js — múltiples file uploads como actors
import { createMachine, spawn, assign } from 'xstate';
import uploadMachine from './fileUploadMachine';

const batchUploadMachine = createMachine({
  id: 'batchUpload',
  initial: 'idle',
  context: { uploads: [] },
  states: {
    idle: {
      on: {
        ADD_FILES: {
          actions: assign({
            uploads: (ctx, event) =>
              event.files.map(file => ({
                file,
                ref: spawn(uploadMachine.withContext({ file })),
              })),
          }),
        },
      },
    },
  },
});
```

## Best Practices

- Modelá states, no flags — reemplazá `isLoading && !isError` con un single `state.matches('loading')`
- Definí todas las transitions explicit — si un event no está listed para un state, se ignora. Esto previene bugs.
- Usá guards para conditional transitions — `cond: (ctx) => ctx.attempts < 3` previene infinite retries
- Usá hierarchical states para complex flows — nested states mantienen el machine readable
- Mantené machines chicas y focused — un machine por component o flow, no un giant machine
- Visualizá el machine — XState Stencil o el visualizer en stately.ai te ayudan a ver el flow
- Usá `type: 'final'` para terminal states — el machine signalea cuando está done
- Testeá el machine — XState machines son testable sin React. Testeá transitions directamente.

## Common Mistakes

- **Usar booleans en vez de states**: `isLoading`, `isError`, `isSuccess` pueden ser todos true a la vez. Un state machine hace esto impossible.
- **No handlear todos los events**: olvidar handlear CANCEL durante loading. El user clicka cancel y no pasa nada.
- **Side effects en transitions**: hacer API calls dentro de actions. Usá `invoke` para async operations — es tracked por el machine.
- **Un giant machine**: modelar toda la app como un machine. Spliteá en machines más chicos por feature o component.
- **No usar guards**: allowear unlimited retries. Guards enforcean business rules como "max 3 attempts."

## FAQ

### ¿Qué es una finite state machine en UI?

Un model donde el UI puede estar en exactamente un state a la vez (idle, loading, success, error). Los events triggerean transitions entre states. Solo las defined transitions son allowed, previniendo impossible state combinations.

### ¿Por qué usar XState sobre useReducer?

XState te da visual debugging, hierarchical states, guarded transitions, invoked services, y actor model support. useReducer es más simple pero no previene invalid transitions o provee un visual model.

### ¿Qué son impossible states?

Combinations de flags que no pueden lógicamente coexistir pero no son prevented por el code. Ejemplo: `isLoading: true, isError: true, data: [...]` — estamos loading, erroring, o showeando data? Un state machine hace esto impossible.

### ¿Debería usar un state machine para cada component?

No. Simple toggles, counters, y single-value states no necesitan un machine. Usá FSMs cuando tenés múltiples related states, complex transitions, o business rules que gobiernan state changes.

### ¿Puedo usar state machines sin un library?

Sí. `useReducer` con un switch statement es un basic state machine. El library (XState) agrega visualization, guards, hierarchical states, y testing tools. Arrancá con useReducer y upgradéá a XState cuando la complexity crezca.

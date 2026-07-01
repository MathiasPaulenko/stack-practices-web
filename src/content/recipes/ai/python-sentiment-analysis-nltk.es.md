---
contentType: recipes
slug: python-sentiment-analysis-nltk
title: "Análisis de Sentimiento con Python y NLTK"
description: "Puntúa el sentimiento de texto usando NLTK VADER y léxicos personalizados en Python."
metaDescription: "Realiza análisis de sentimiento en Python con NLTK VADER. Puntúa polaridad de texto, maneja negación y construye clasificadores con ejemplos."
difficulty: intermediate
topics:
  - ai
tags:
  - sentiment-analysis
  - python
  - nltk
  - vader
  - nlp
  - text-processing
relatedResources:
  - /guides/vector-database-guide
  - /recipes/ai-agents-tool-use
  - /recipes/ai-agents
  - /recipes/chatbot-openai
  - /recipes/image-generation
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Realiza análisis de sentimiento en Python con NLTK VADER. Puntúa polaridad de texto, maneja negación y construye clasificadores con ejemplos."
  keywords:
    - análisis sentimiento python
    - nltk vader sentiment
    - python nlp sentimiento
    - vader lexicon custom
    - sentiment analysis csv
---
## Visión General

El análisis de sentimiento puntúa texto como positivo, negativo o neutral. VADER de NLTK (Valence Aware Dictionary and sEntiment Reasoner) es un modelo basado en reglas construido para texto de redes sociales. Maneja negación, intensificadores y emoticones sin datos de entrenamiento. Esta recipe cubre puntuación de textos individuales, procesamiento en lote y personalización del léxico.

## Cuándo Usar

- Necesitas clasificar reviews de clientes o posts de redes sociales
- Quieres un score rápido de sentimiento sin entrenar un modelo
- Estás construyendo un dashboard que trackea sentimiento en el tiempo
- Necesitas filtrar tickets de soporte por urgencia o tono

## Solución

### Instalar y configurar VADER

```bash
pip install nltk
```

```python
import nltk
nltk.download("vader_lexicon")

from nltk.sentiment.vader import SentimentIntensityAnalyzer

sia = SentimentIntensityAnalyzer()
```

### Puntuar un texto individual

```python
score = sia.polarity_scores("I love this product, it works great!")
print(score)
# {'neg': 0.0, 'neu': 0.536, 'pos': 0.464, 'compound': 0.6249}

score = sia.polarity_scores("Terrible experience, would not recommend.")
print(score)
# {'neg': 0.577, 'neu': 0.423, 'pos': 0.0, 'compound': -0.4767}
```

El score `compound` va de -1 (más negativo) a +1 (más positivo). Úsalo como la métrica general de sentimiento.

### Clasificar sentimiento

```python
def classify_sentiment(text):
    score = sia.polarity_scores(text)["compound"]
    if score >= 0.05:
        return "positive"
    elif score <= -0.05:
        return "negative"
    else:
        return "neutral"

texts = [
    "Great service and fast delivery!",
    "The package arrived broken.",
    "It was okay, nothing special.",
]

for text in texts:
    print(f"{classify_sentiment(text):10s} | {text}")
```

### Procesamiento en lote desde CSV

```python
import csv
from nltk.sentiment.vader import SentimentIntensityAnalyzer

sia = SentimentIntensityAnalyzer()

with open("reviews.csv", newline="") as infile, open("scored.csv", "w", newline="") as outfile:
    reader = csv.DictReader(infile)
    writer = csv.DictWriter(outfile, fieldnames=reader.fieldnames + ["sentiment", "compound"])
    writer.writeheader()

    for row in reader:
        score = sia.polarity_scores(row["review"])
        row["compound"] = score["compound"]
        row["sentiment"] = "positive" if score["compound"] >= 0.05 else "negative" if score["compound"] <= -0.05 else "neutral"
        writer.writerow(row)
```

### Manejar negación e intensificadores

```python
sia = SentimentIntensityAnalyzer()

print(sia.polarity_scores("The food was good"))
# compound: 0.4404

print(sia.polarity_scores("The food was not good"))
# compound: -0.4404

print(sia.polarity_scores("The food was very good"))
# compound: 0.4927

print(sia.polarity_scores("The food was EXTREMELY good"))
# compound: 0.5671
```

### Personalizar el léxico

```python
sia = SentimentIntensityAnalyzer()

# Agregar palabras específicas del dominio
new_words = {
    "buggy": -2.0,
    "crash": -3.0,
    "responsive": 2.0,
    "intuitive": 2.0,
}
sia.lexicon.update(new_words)

print(sia.polarity_scores("The app is buggy and crashes often"))
# Ahora puntúa más negativo con palabras custom
```

### Analizar sentimiento en el tiempo

```python
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from datetime import datetime
import statistics

sia = SentimentIntensityAnalyzer()

posts = [
    {"date": "2026-01-01", "text": "Love the new update!"},
    {"date": "2026-01-02", "text": "Found a bug in the login flow."},
    {"date": "2026-01-03", "text": "Bug is fixed, great support!"},
]

daily_scores = {}
for post in posts:
    date = post["date"]
    score = sia.polarity_scores(post["text"])["compound"]
    daily_scores.setdefault(date, []).append(score)

for date, scores in sorted(daily_scores.items()):
    avg = statistics.mean(scores)
    print(f"{date}: avg={avg:.3f} ({len(scores)} posts)")
```

## Explicación

VADER usa un léxico de 7,500 palabras calificadas por anotadores humanos. Cada palabra tiene un valence score de -4 (extremadamente negativo) a +4 (extremadamente positivo). VADER combina estos scores con cinco heurísticas:

- **Puntuación**: Signos de exclamación aumentan la intensidad.
- **Capitalización**: ALL CAPS aumenta la intensidad.
- **Modificadores de grado**: "very" aumenta, "somewhat" reduce.
- **Negación**: "not good" invierte la polaridad.
- **Contraste**: "but" desplaza el foco a la cláusula después.

El score `compound` es una suma normalizada y ponderada de todos los scores del léxico en el texto. Es la métrica individual más útil para clasificación.

## Variantes

| Enfoque | Datos de Entrenamiento | Precisión | Usar Cuando |
|---------|----------------------|-----------|-------------|
| VADER | Ninguno (reglas) | Bueno para redes sociales | Setup rápido, sin training data |
| TextBlob | Léxico integrado | Similar a VADER | API simple, basado en corpus |
| Transformer (HuggingFace) | Pre-entrenado | Alta | Sentimiento en producción a escala |
| Clasificador custom | Dataset etiquetado | Varía | Necesidades específicas de dominio |

## Pautas

- Usa el score `compound` para clasificación. Contabiliza el texto completo, no palabras individuales.
- Define thresholds en +0.05 y -0.05 para positivo/negativo. Ajusta según tus datos.
- Actualiza el léxico con palabras de tu dominio. El léxico default de VADER está construido para redes sociales.
- VADER funciona mejor en textos cortos (oraciones a párrafos). Para documentos largos, puntúa párrafo por párrafo.
- No uses VADER para detectar sarcasmo. Puntúa significados literales, no intención implícita.

## Errores Comunes

- Usar ratios `pos` / `neg` en vez de `compound`. El compound está normalizado y es más confiable.
- No personalizar el léxico para tu dominio. Palabras como "sick" significan positivo en gaming, negativo en salud.
- Aplicar VADER a documentos largos. Promedia el sentimiento en todo el texto, perdiendo contexto local.
- Ignorar el score `neu`. Un ratio neutral alto significa que el texto es mayormente informativo, no opinado.
- Comparar scores de VADER entre idiomas. VADER es solo inglés. Para español, usa `pysentimiento` o un transformer multilingüe.

## Preguntas Frecuentes

### ¿VADER soporta idiomas además del inglés?

No. VADER es solo inglés. Para español, usa `pysentimiento` (basado en BERT) o traduce el texto primero y luego aplica VADER.

### ¿Qué tan preciso es VADER comparado con modelos de machine learning?

VADER alcanza alrededor de 0.70-0.80 F1 en sentimiento de redes sociales. Transformers fine-tuned como RoBERTa llegan a 0.90+. VADER es mejor para prototipado rápido o cuando no puedes etiquetar datos de entrenamiento.

### ¿Puedo usar VADER para análisis de sentimiento basado en aspectos?

No directamente. VADER puntúa el texto completo. Para análisis basado en aspectos (e.g., "la comida fue buena pero el servicio lento"), divide el texto por menciones de aspectos y puntúa cada segmento por separado.

### ¿Cómo manejo emojis?

VADER tiene soporte integrado para emojis. `:)` puntúa positivo, `:(` puntúa negativo. Para sentimiento de emojis Unicode completos, usa la librería `emoji` para convertir emojis a descripciones de texto antes de puntuar.

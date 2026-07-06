---
contentType: recipes
slug: python-sentiment-analysis-nltk
title: "Sentiment Analysis with Python and NLTK"
description: "Score text sentiment using NLTK VADER and custom lexicons in Python."
metaDescription: "Perform sentiment analysis in Python with NLTK VADER. Score text polarity, handle negation, and build custom sentiment classifiers with code examples."
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
  metaDescription: "Perform sentiment analysis in Python with NLTK VADER. Score text polarity, handle negation, and build custom sentiment classifiers with code examples."
  keywords:
    - sentiment-analysis
    - python
    - nltk
    - vader
    - nlp
    - text-processing
---
## Overview

Sentiment analysis scores text as positive, negative, or neutral. NLTK's VADER (Valence Aware Dictionary and sEntiment Reasoner) is a rule-based model built for social media text. It handles negation, intensifiers, and emoticons without training data. Here is how to scoring individual texts, batch processing, and customizing the lexicon.

## When to Use

- You need to classify customer reviews or social media posts
- You want a quick sentiment score without training a model
- You are building a dashboard that tracks sentiment over time
- You need to filter support tickets by urgency or tone

## Solution

### Install and set up VADER

```bash
pip install nltk
```

```python
import nltk
nltk.download("vader_lexicon")

from nltk.sentiment.vader import SentimentIntensityAnalyzer

sia = SentimentIntensityAnalyzer()
```

### Score a single text

```python
score = sia.polarity_scores("I love this product, it works great!")
print(score)
# {'neg': 0.0, 'neu': 0.536, 'pos': 0.464, 'compound': 0.6249}

score = sia.polarity_scores("Terrible experience, would not recommend.")
print(score)
# {'neg': 0.577, 'neu': 0.423, 'pos': 0.0, 'compound': -0.4767}
```

The `compound` score ranges from -1 (most negative) to +1 (most positive). Use it as the overall sentiment metric.

### Classify sentiment

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

### Batch process from CSV

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

### Handle negation and intensifiers

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

### Customize the lexicon

```python
sia = SentimentIntensityAnalyzer()

# Add domain-specific words
new_words = {
    "buggy": -2.0,
    "crash": -3.0,
    "responsive": 2.0,
    "intuitive": 2.0,
}
sia.lexicon.update(new_words)

print(sia.polarity_scores("The app is buggy and crashes often"))
# Now scores more negative with custom words
```

### Analyze sentiment over time

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

## Explanation

VADER uses a lexicon of 7,500 words rated by human annotators. Each word has a valence score from -4 (extremely negative) to +4 (extremely positive). VADER combines these scores with five heuristics:

- **Punctuation**: Exclamation marks increase intensity.
- **Capitalization**: ALL CAPS increases intensity.
- **Degree modifiers**: "very" boosts, "somewhat" dampens.
- **Negation**: "not good" flips the polarity.
- **Contrast**: "but" shifts focus to the clause after it.

The `compound` score is a normalized, weighted sum of all lexicon scores in the text. It is the most useful single metric for classification.

## Variants

| Approach | Training Data | Accuracy | Use When |
|----------|--------------|----------|----------|
| VADER | None (rule-based) | Good for social media | Quick setup, no training data |
| TextBlob | Built-in lexicon | Similar to VADER | Simple API, corpus-based |
| Transformer (HuggingFace) | Pre-trained | High | Production sentiment at scale |
| Custom classifier | Labeled dataset | Varies | Domain-specific needs |

## Guidelines

- Use the `compound` score for classification. It accounts for the full text, not individual words.
- Set thresholds at +0.05 and -0.05 for positive/negative. Adjust based on your data.
- Update the lexicon with domain-specific words. VADER's default lexicon is built for social media.
- VADER works best on short texts (sentences to paragraphs). For long documents, score paragraph by paragraph.
- Do not use VADER for sarcasm detection. It scores literal word meanings, not implied intent.

## Common Mistakes

- Using `pos` / `neg` ratios instead of `compound`. The compound score is normalized and more reliable.
- Not customizing the lexicon for your domain. Words like "sick" mean positive in gaming, negative in healthcare.
- Applying VADER to long documents. It averages sentiment across the whole text, losing local context.
- Ignoring the `neu` score. A high neutral ratio means the text is mostly informational, not opinionated.
- Comparing VADER scores across languages. VADER is English-only. For Spanish, use `pysentimiento` or a multilingual transformer.

## Frequently Asked Questions

### Does VADER support languages other than English?

No. VADER is English-only. For Spanish, use `pysentimiento` (based on BERT) or translate the text first and then apply VADER.

### How accurate is VADER compared to machine learning models?

VADER achieves around 0.70-0.80 F1 on social media sentiment. Fine-tuned transformers like RoBERTa reach 0.90+. VADER is best for quick prototyping or when you cannot label training data.

### Can I use VADER for aspect-based sentiment analysis?

Not directly. VADER scores the whole text. For aspect-based analysis (e.g., "the food was great but service was slow"), split the text by aspect mentions and score each segment separately.

### How do I handle emojis?

VADER has built-in emoji support. `:)` scores positive, `:(` scores negative. For full Unicode emoji sentiment, use the `emoji` library to convert emojis to text descriptions before scoring.

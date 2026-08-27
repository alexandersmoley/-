# Content handoff v2 — chat → GitHub → code agent → publishing

## Принцип

Одна единица контента = один source-controlled production brief в GitHub.

Не передавать критичные production-решения только через память чата.

Актуальная рабочая папка для briefs: `instagram-factory/content/`.

## Минимальный front matter

```yaml
---
id: example-id
platform: instagram
format: carousel
status: brief-review
publish: false
experiment:
  question: "Конкретный вопрос эксперимента"
  factory_node: "что проверяем в контент-заводе"
  decision_rule: "по чему решаем: оставляю / дорабатываю / не беру"
---
```

После front matter рекомендуется хранить:

```md
# Reader value
Почему этот вопрос вообще интересен/полезен человеку.

# Experiment
Что именно проверяем и на каком реальном материале.

# Facts / sources
Разрешённая фактура. Не выдумывать пропуски.

# Exact copy
Утверждённый экранный текст/caption. Если не утверждён — это должно быть явно отмечено.

# Narrative
Слайды/сцены и смысловой прогресс.

# Art direction
Конкретная визуальная идея, а не «сделать стильно».

# Visual references
Каждый reference: source, URL, rights_status, use_for, do_not_copy.

# Production
Layout family / renderer requirements / assets / dimensions.

# QA
Thumbnail, contact sheet, overflow, readability, performance structure.

# Publish
По умолчанию false до отдельного approval.
```

## Статусы

- `idea` — направление ещё не утверждено;
- `brief-review` — обсуждаем смысл/copy/art direction;
- `approved-for-render` — кодовый агент может производить визуал;
- `rendered` — технический рендер готов;
- `design-review` — пользователь оценивает визуал;
- `approved-for-publish` — final asset/caption утверждены;
- `scheduled` — поставлено в очередь;
- `published` — опубликовано;
- `measured` — собраны достаточные метрики;
- `learned` — вывод эксперимента сохранён.

## Что делает редакционный чат

Редакционным чатом может быть ChatGPT или Claude.

1. Обсуждает с пользователем конкретный вопрос/эксперимент.
2. Проверяет human-first и reader-value критерии.
3. Собирает фактуру и не придумывает недостающие факты.
4. Готовит структуру/copy/art direction.
5. После явного approval фиксирует решения в GitHub.
6. Меняет status на `approved-for-render` только после явного утверждения пользователя.

## Что делает кодовый агент

Кодовым агентом может быть Codex или Claude Code.

1. Сначала читает `CLAUDE.md`/глобальные правила и конкретный brief.
2. Не начинает production, если status не `approved-for-render`.
3. Не переписывает exact copy.
4. Не придумывает отсутствующие факты/assets/визуальные смыслы.
5. Использует существующий renderer/layout family или создаёт новый, если это оправдано арт-концепцией.
6. Рендерит final-size asset.
7. Запускает automated QA.
8. Для feed обязательно делает thumbnail preview; для карусели — contact sheet.
9. Передаёт результат на `design-review`.
10. Не публикует.

## Визуальный handoff

Фирстиль не равен одному шаблону.

Передача в production должна явно ответить:
- что является главным визуальным объектом;
- есть ли фото/скриншот/интерфейс/документ/схема/коллаж;
- какие референсные приёмы разрешено использовать;
- какой copy должен читаться в thumbnail;
- чем обложка отличается от соседних публикаций;
- какие assets имеют право попасть в финал.

Если brief фактически предполагает «большой текст на фоне» только потому, что визуальная идея не придумана, вернуть материал на арт-дирекшен.

## Publishing gate

До публикации пользователь должен увидеть и подтвердить:
- точные final assets;
- точный caption;
- формат/площадку;
- дату и время, если есть scheduling.

`publish: false` является default.

## Learning handoff

После метрик сохранить:
- вопрос эксперимента;
- фактический результат;
- доступные метрики;
- качественные наблюдения;
- решение `оставляю / дорабатываю / не беру`;
- следующий узкий эксперимент.

Это знание должно использоваться в новых briefs как доказанная/опровергнутая гипотеза, а не теряться в истории чата.

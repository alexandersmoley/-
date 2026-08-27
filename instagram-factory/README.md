# alexsmoley — Content Factory

Единая рабочая папка проекта личного Instagram и прототипа контент-завода.

## Цель

Сначала отработать контент-завод на личном Instagram Александра Смолея, затем упаковать процесс как услугу внедрения и поддержки контент-заводов для брендов.

## Роли инструментов

- ChatGPT — стратегия, штурм, редактура, исследования, постановка задач.
- Codex — производственный агент: работает с репозиторием, автоматизацией и подключёнными сервисами.
- Canva — дизайн и мастер-макеты. Не генерировать новый стиль для каждого поста; работать от утверждённых шаблонов.
- GitHub — source of truth для правил, брифов, контента, конфигурации и автоматизации.
- Metricool — публикация и аналитика Instagram после стабильного подключения сети.
- Airtable — опциональный операционный слой для контент-бэклога и статусов, если GitHub окажется неудобен как редакционный интерфейс.

## Производственный принцип

Идея → исследование → текст → редактура → structured post → code renderer → automated QA → утверждение → публикация → метрики → выводы → следующий цикл.

ИИ не должен самовольно добавлять декоративный копирайтинг, менять фирменные цвета, шрифты или композиционную систему.

## Файлы

- `brand-system.md` — зафиксированные правила фирстиля.
- `content-strategy.md` — позиционирование и рубрики.
- `factory-workflow.md` — роли и автоматизация.
- `design-brief-pinned-post.md` — бриф первого закрепа.
- `codex-brief.md` — инструкция Codex по работе с проектом.
- `posts/*.json` — structured posts и статус допуска к рендеру.
- `schemas/post.schema.json` — машинный контракт structured post.
- `renderer/` — reusable HTML/CSS/SVG layout families и Chromium renderer.
- `reels/*.json` — structured Reels с точной timeline, экранным текстом, cover и audio policy.
- `output/` — PNG/MP4, QA reports и GitHub Pages bundle.

## Production render

```bash
cd instagram-factory
pnpm install
pnpm exec playwright install chromium
pnpm run pipeline
```

Подробности: [`renderer/README.md`](renderer/README.md).

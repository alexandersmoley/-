# alexsmoley — Content Factory

Единая рабочая папка проекта личного Instagram и прототипа контент-завода.

## Цель

Проверить на личном Instagram Александра Смолея, как выпускать хороший контент регулярно и тратить меньше времени на повторяемые операции. Текущий проект не обещает будущую услугу или продажу систем брендам.

## Source of truth

GitHub — единая память проекта между чатами и кодовыми агентами.

Для Claude/Claude Code начинать с [`CLAUDE.md`](CLAUDE.md).

Для передачи решений между редакционным чатом и кодовым агентом использовать [`claude-handoff.md`](claude-handoff.md) и [`content-handoff.md`](content-handoff.md).

## Роли

- **Редакционный чат — ChatGPT или Claude:** стратегия, выбор эксперимента, исследование, редактура, арт-дирекшен, production brief, анализ результатов.
- **Кодовый агент — Codex или Claude Code:** source-controlled production, renderer/layout families, structured data, render, QA, contact sheets/thumbnails.
- **GitHub:** source of truth для правил, briefs, content, code, configs, assets metadata и learning.
- **Metricool/другой publishing service:** очередь публикаций и доступная аналитика после явного approval.
- **Canva/другие design tools:** могут использоваться как вспомогательные инструменты/assets, но не являются обязательным production path.

## Производственный принцип

`обсуждение → GitHub brief → approved-for-render → code renderer → automated QA → design review → approved-for-publish → публикация → метрики → learning → следующий эксперимент`

Основной production path — deterministic HTML/CSS/SVG/Playwright renderer и reusable layout families.

## Контентный принцип

Каждый материал проверяет **один конкретный вопрос/узел контент-завода** на реальной фактуре или AI-эксперименте.

AI — не тема сам по себе и не главный герой блога. Он используется для проверки того, что можно безопасно и удобно передать системе.

Каждый законченный эксперимент должен дать решение для завода: `оставляю / дорабатываю / не беру` или другой конкретный вывод.

## Визуальный принцип

Не считать типографическую карточку default layout.

Приоритет у наглядных содержательных объектов: фото, скриншоты, интерфейсы, документы, исходники, схемы, коллажи и визуальные доказательства эксперимента.

Все feed-обложки должны проходить отдельную thumbnail-проверку и оставаться читаемыми в сетке профиля.

## Ключевые файлы

- `CLAUDE.md` — главный entrypoint для Claude / Claude Code.
- `content-strategy.md` — позиционирование, первый/второй месяц и роль форматов.
- `human-topic-rules.md` — human-first правила тем.
- `writing-contract.md` — глобальный тон и редакторская проверка текста.
- `brand-system.md` — фирстиль и thumbnail rules.
- `design-direction.md` — арт-дирекшен.
- `visual-references/` — reference layer и rights/use_for contract.
- `performance-principles.md` — performance QA.
- `factory-workflow.md` — текущая архитектура процесса.
- `content-handoff.md` — production states и контракт единицы контента.
- `claude-handoff.md` — передача между Claude chat и Claude Code.
- `codex-brief.md` — production contract для Codex; его ограничения также полезны как baseline для code agents.
- `content/` — production briefs.
- `posts/*.json` / `reels/*.json` — structured production data, где используется текущим renderer.
- `schemas/` — машинные контракты.
- `renderer/` — reusable HTML/CSS/SVG layout families и Chromium renderer.
- `output/` — PNG/MP4, QA reports, thumbnail/contact sheets и GitHub Pages bundle.

## Production render

```bash
cd instagram-factory
pnpm install
pnpm exec playwright install chromium
pnpm run pipeline
```

Подробности: [`renderer/README.md`](renderer/README.md).

## Approval

По умолчанию `publish: false`.

Никакой агент не публикует материал без отдельного явного подтверждения пользователя после проверки final assets и caption.

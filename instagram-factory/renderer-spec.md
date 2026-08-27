# alexsmoley Editorial Renderer — production spec

## Решение

Canva не является основным генератором дизайна. Основной production path — кодовый renderer в репозитории:

structured content (`approved-for-render`) → HTML/CSS/SVG layout family → automated QA → production PNG → output/HTTPS artifact → human approval → optional publishing.

Canva может использоваться как дополнительный ручной редактор/экспорт, но не как source of truth.

## Цель качества

Результат должен выглядеть как работа сильного digital/editorial designer, а не как автоматически заполненный social template. Автоматизация не должна означать одинаковые макеты.

## Source of truth

- `brand-system.md` — дизайн-токены и неизменяемые правила.
- `design-direction.md` — арт-дирекшен и допустимая вариативность.
- `content/*.md` — утверждённые тексты и production notes.
- `posts/*.json` — машиночитаемые structured posts, asset checksum, layout family и ограниченные параметры композиции.
- `schemas/post.schema.json` — исполняемый контракт structured post.
- `stories/*.json` — машиночитаемые серии Stories, точный текст, safe zones, asset checksum и layout family.
- `schemas/story-series.schema.json` — исполняемый контракт серии Stories.
- `carousels/*.json` — машиночитаемые карусели, exact slide copy, caption checksum и композиционные режимы.
- `schemas/carousel-series.schema.json` — исполняемый контракт карусели.
- `reels/*.json` — машиночитаемые motion timelines, точный экранный текст/cover/caption и audio policy.
- `schemas/reel.schema.json` — исполняемый контракт Reels.
- `assets/` — фотографии/иллюстрации.
- `renderer/` — код дизайн-системы и рендера.

## Технология

Рекомендуемый стек для Codex:

- TypeScript
- HTML/CSS
- SVG для схем и простых графических элементов
- Playwright/Chromium для deterministic screenshot
- локальные или лицензированно доступные web-font assets; если шрифты недоступны в репозитории, не заменять молча — сообщить
- Sharp только для технической подготовки изображений/экспорта при необходимости

## Canvas

Instagram portrait: 1080×1440 px (3:4).

Внутренний layout строится в CSS pixels 1080×1440 без responsive scaling при финальном рендере.

Instagram Stories: 1080×1920 px (9:16). Ключевой текст и управляющие смыслом элементы остаются внутри указанной в structured series безопасной области; фотография может быть full-bleed. Финальный рендер также выполняется без responsive scaling.

Instagram Reels: 1080×1920 px (9:16), 30 fps. Каждая сцена рендерится в точной позиции общей timeline, затем кадры собираются в MP4. Cover рендерится отдельно как 1080×1920 PNG. Ключевой текст остаётся внутри Reel safe zone.

## Design tokens

Точные значения брать из `brand-system.md`; не создавать альтернативную палитру.

Система должна иметь CSS custom properties для:

- background / paper
- ink
- muted ink
- brand blue
- hairline/grid
- display serif
- text sans
- spacing scale
- column grid

## Grid

Базовая editorial-сетка: 6 колонок с внешними полями. Сетка может быть видимой тонкими hairline-линиями или невидимой, но все ключевые элементы должны к ней привязываться.

Сетка не должна превращаться в Bootstrap/card layout. Допустимы deliberate overlaps, full bleed, oversized typography и выходы за колонки.

## Layout families

Первое production-семейство:

1. `human-to-system` — human/photo zone + профессия как типографический мост + системная editorial-zone. Семейство фиксирует утверждённую грамматику, но принимает structured content, approved photo и ограниченные layout-параметры.

Renderer должен оставаться registry-based и расширяться другими семействами, а не превращаться в один универсальный template. Roadmap:

2. `photo-editorial` — full-bleed или dominant photo + крупная цветовая/типографическая плоскость.
3. `type-editorial` — typography-led, большой Cormorant headline, Roman/Italic contrast.
4. `diagram-editorial` — wireframe/схема + типографический тезис.
5. `split-editorial` — асимметричный split photo/text.
6. `quote-editorial` — один сильный тезис, много воздуха, display typography.
7. `carousel-editorial` — система последовательных слайдов с общей сеткой, но меняющейся композицией.

Для Stories registry включает самостоятельные семейства: `story-type-intro`, `story-type-list`, `story-proof-list`, `story-statement`, `story-process-diagram`, `story-manifesto`, `story-photo-editorial`, `story-closing-list`. Они используют общие токены, но не являются восемью перестановками одного шаблона.

Для process case studies registry включает reusable family `process-diagram-carousel` с режимами `statement`, `pipeline`, `breakpoint`, `criteria-list`, `closing`. Режимы меняют композицию, но сохраняют общую типографику, палитру и process-грамматику.

Для Reels registry включает `motion-editorial-system`: семейство сцен `reel-thesis-hook`, `reel-minimal-process`, `reel-system-build`, `reel-process-contrast`, `reel-production-pipeline`, `reel-editorial-closing` и отдельную cover-композицию. Движение задаётся детерминированной timeline, без генеративного видео и случайных параметров.

Каждое семейство должно иметь параметры вариативности: crop, alignment, text scale, blue-plane proportion, whitespace ratio, grid visibility, image position. Эти параметры должны иметь ограниченные art-directed диапазоны, а не случайные значения.

## Art-direction selection

Для каждого нового материала агент сначала определяет 2–3 подходящих layout family по смыслу материала. Для ключевых постов генерирует 3 previews с существенно разным art direction. После выбора пользователя выбранное направление становится production version.

Не генерировать три почти одинаковых перестановки.

## Typography

- Inter Regular — основной текст.
- Cormorant Garamond — display/editorial typography.
- Использовать реальную типографическую иерархию, а не набор font-size presets из social templates.
- Следить за длиной строки, переносами, widow/orphan, optical balance.
- Заголовки и крупные display-тезисы должны быть размечены отдельной ролью; точка в конце этой роли запрещена.
- Интерлиньяж задаётся токеном роли, а не локальным значением макета: `0.94` для display и `1.24` для основного/служебного текста.
- Перед рендером применять неразрывные пробелы по правилам русской типографики. QA сравнивает нормализованный текст с source of truth, поэтому типографическая обработка не считается переписыванием copy.
- Для canvas 1080×1440 ключевой текст должен оставаться внутри safe zone не менее 120 px от каждого края.
- Автоматический fit текста разрешён только внутри заданного диапазона. Нельзя уменьшать заголовок до мелкого размера ради вмещения.
- Если текст не помещается качественно — renderer должен сообщить об этом и предложить другой layout, а не портить композицию.

## Photography

- Использовать только asset, указанный в content front matter / production notes.
- Запрещены stock replacement и AI replacement без отдельного разрешения.
- Object-position/crop может варьироваться, но лицо и важные части изображения нельзя случайно обрезать.

## Visual QA gates

Перед финальным экспортом автоматические проверки должны валить build при критических ошибках:

- canvas ровно 1080×1440 для постов или 1080×1920 для Stories;
- нет overflow за canvas;
- нет отсутствующих шрифтов/assets;
- нет текста меньше минимально допустимого размера;
- нет незапланированного текста;
- используются только разрешённые цвета;
- правильный source image;
- безопасные поля для ключевого текста;
- нет точек в конце элементов с ролью headline/display statement;
- интерлиньяж совпадает с токеном соответствующей типографической роли;
- короткие русские предлоги и союзы связаны со следующим словом неразрывным пробелом;
- для Stories — соблюдение Instagram UI safe zones;
- contrast достаточен;
- нет случайных стрелок/иконок/теней/градиентов;
- caption не изменён renderer-ом.
- для Reels — continuous timeline, точные duration/fps, наличие разрешённой аудиодорожки, distinct motion frames, валидные MP4/cover/storyboard;

После технического QA агент делает visual self-review по `design-direction.md` и отклоняет слабый вариант до показа пользователю.

## Pinned intro benchmark

Первый benchmark renderer-а — `content/pinned-intro.md`.

Канонический арт-дирекшен задаёт `master-reference-pinned-intro.md` и он имеет приоритет над историческими pinned-intro указаниями в старых документах:

- только `alexsmoley-photo-mountains-son` / Canva asset `MAHTZduqLyI`;
- строго 1080×1440;
- идея `человек → редактор → система`;
- `редактор` — крупнейшая доминанта и пересекает фото/system boundary;
- лица и фигуры не перекрываются;
- нижняя сетка используется как рабочая система выравнивания;
- только Inter Regular и Cormorant Garamond Regular/Italic;
- никаких новых текстов, CTA, иконок или декора.

`posts/pinned-intro.json` — первый executable benchmark семейства `human-to-system`.

## Human approval

Никакой автопубликации на этапе разработки системы.

Pipeline:

`draft` → `approved-for-render` → automated render + QA → human review → `approved-for-publish` → publishing connector.

Только после накопления стабильных шаблонов и QA можно разрешать автоматическую публикацию для повторяемых форматов.

## Задача Codex

1. Прочитать `brand-system.md`, `design-direction.md`, этот spec и `content/pinned-intro.md`.
2. Поддерживать `renderer/` как самостоятельный production module.
3. Реализовать design tokens и registry layout families, начиная с `human-to-system`.
4. Реализовать deterministic PNG export 1080×1440.
5. Реализовать schema validation и automated QA gates.
6. Рендерить только structured posts со статусом `approved-for-render`.
7. Сохранять PNG и QA reports в `output/`.
8. Публиковать успешный output через GitHub Pages для машинного HTTPS-доступа.
9. Не добавлять в renderer автоматическую публикацию в соцсети.
10. Не менять утверждённый caption.
11. В README renderer-а описать одну команду для локального/CI production run.
12. Для Reels сохранять `preview.mp4`, `cover.png`, `storyboard.png` и `reel.qa.json`; не добавлять talking head/voice-over, если brief их запрещает.

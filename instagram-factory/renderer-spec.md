# alexsmoley Editorial Renderer — production spec

## Решение

Canva не является основным генератором дизайна. Основной production path — кодовый renderer в репозитории:

approved content → art-direction selection → HTML/CSS/SVG layout → automated QA → PNG 1080×1350 → human approval → publishing.

Canva может использоваться как дополнительный ручной редактор/экспорт, но не как source of truth.

## Цель качества

Результат должен выглядеть как работа сильного digital/editorial designer, а не как автоматически заполненный social template. Автоматизация не должна означать одинаковые макеты.

## Source of truth

- `brand-system.md` — дизайн-токены и неизменяемые правила.
- `design-direction.md` — арт-дирекшен и допустимая вариативность.
- `content/*.md` — утверждённые тексты и production notes.
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

Instagram portrait: 1080×1350 px (4:5).

Внутренний layout строится в CSS pixels 1080×1350 без responsive scaling при финальном рендере.

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

Renderer должен поддерживать минимум 6 семейств, а не один универсальный template:

1. `photo-editorial` — full-bleed или dominant photo + крупная цветовая/типографическая плоскость.
2. `type-editorial` — typography-led, большой Cormorant headline, Roman/Italic contrast.
3. `diagram-editorial` — wireframe/схема + типографический тезис.
4. `split-editorial` — асимметричный split photo/text.
5. `quote-editorial` — один сильный тезис, много воздуха, display typography.
6. `carousel-editorial` — система последовательных слайдов с общей сеткой, но меняющейся композицией.

Каждое семейство должно иметь параметры вариативности: crop, alignment, text scale, blue-plane proportion, whitespace ratio, grid visibility, image position. Эти параметры должны иметь ограниченные art-directed диапазоны, а не случайные значения.

## Art-direction selection

Для каждого нового материала агент сначала определяет 2–3 подходящих layout family по смыслу материала. Для ключевых постов генерирует 3 previews с существенно разным art direction. После выбора пользователя выбранное направление становится production version.

Не генерировать три почти одинаковых перестановки.

## Typography

- Inter Regular — основной текст.
- Cormorant Garamond — display/editorial typography.
- Использовать реальную типографическую иерархию, а не набор font-size presets из social templates.
- Следить за длиной строки, переносами, widow/orphan, optical balance.
- Автоматический fit текста разрешён только внутри заданного диапазона. Нельзя уменьшать заголовок до мелкого размера ради вмещения.
- Если текст не помещается качественно — renderer должен сообщить об этом и предложить другой layout, а не портить композицию.

## Photography

- Использовать только asset, указанный в content front matter / production notes.
- Запрещены stock replacement и AI replacement без отдельного разрешения.
- Object-position/crop может варьироваться, но лицо и важные части изображения нельзя случайно обрезать.

## Visual QA gates

Перед финальным экспортом автоматические проверки должны валить build при критических ошибках:

- canvas ровно 1080×1350;
- нет overflow за canvas;
- нет отсутствующих шрифтов/assets;
- нет текста меньше минимально допустимого размера;
- нет незапланированного текста;
- используются только разрешённые цвета;
- правильный source image;
- безопасные поля для ключевого текста;
- contrast достаточен;
- нет случайных стрелок/иконок/теней/градиентов;
- caption не изменён renderer-ом.

После технического QA агент делает visual self-review по `design-direction.md` и отклоняет слабый вариант до показа пользователю.

## Pinned intro v1

Первый benchmark renderer-а — `content/pinned-intro.md`.

Собрать три варианта:

A. Reference-faithful photo editorial: фото в кресле full bleed; label `КТО Я`; крупная синяя плоскость поверх нижней/средней части фотографии; крупный белый Cormorant headline.

B. More experimental photo editorial: тот же asset и фирстиль, но иная пропорция/позиция синей плоскости и более смелая typography-image interaction.

C. Type-led editorial: светлая editorial surface + крупная типографика + фотография как вторичный, но крупный композиционный элемент.

Вариант A должен служить benchmark: если он визуально заметно слабее пользовательского референса, renderer не считается готовым.

## Human approval

Никакой автопубликации на этапе разработки системы.

Pipeline:

`approved-for-production` → render candidates → user selects/requests revision → `approved-for-publish` → publishing connector.

Только после накопления стабильных шаблонов и QA можно разрешать автоматическую публикацию для повторяемых форматов.

## Задача Codex

1. Прочитать `brand-system.md`, `design-direction.md`, этот spec и `content/pinned-intro.md`.
2. Создать `renderer/` как самостоятельный production module.
3. Реализовать design tokens и минимум первые три layout families.
4. Реализовать deterministic PNG export 1080×1350.
5. Реализовать QA checks.
6. Сгенерировать три pinned-intro candidates.
7. Сохранить preview PNG и source рядом в `output/pinned-intro/`.
8. Не публиковать.
9. Не менять утверждённый caption.
10. В README renderer-а описать одну команду для локального/агентского production run.

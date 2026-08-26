---
id: pinned-intro
platform: instagram
format: single-post
status: approved-for-production
visual_source:
  canva_asset_name: alexsmoley-photo-mountains-son
  canva_asset_id: MAHTZduqLyI
master_reference:
  canva_asset_name: alexsmoley-master-reference-human-to-system
  canva_asset_id: MAHTZVECUo4
  github_spec: instagram-factory/master-reference-pinned-intro.md
---

# Caption

Привет, я Саша, редактор — хотя это слово уже не очень точно описывает мою работу.

Пишу тексты, проектирую интерфейсы, собираю сайты и понемногу вайбкожу. Работаю в агентстве заказной разработки. Писал для Kaspersky, Сбера, СИБУРа, NtechLab и других больших компаний. Параллельно занимаюсь выборами — в том числе создаю агитматериалы для кандидатов в президенты.

Сейчас мой эксперимент — контент-завод. Хочу проверить, можно ли с помощью ИИ собрать нормальное производство контента: от поиска темы и фактуры до текста, дизайна, публикации и аналитики. Не поток нейрослопа, а систему, которая помогает делать хороший контент быстрее.

Полигоном станет этот блог. Здесь буду показывать, как строю завод, что автоматизирую, где ИИ действительно полезен, а где всё приходится переделывать руками.

Подписывайтесь, буду стараться давать неочевидные инсайты.

# Text on visual

Только этот текст. Не добавлять, не сокращать и не переписывать без отдельного approval:

Привет,
*я Саша Смолей*

**редактор**

Писал для Kaspersky, Сбера
и кандидатов в президенты —

*теперь строю
контент-завод*

# Production notes

- Это утверждённый caption. Codex не переписывает его без отдельного запроса пользователя.
- Главный арт-дирекшен описан в `instagram-factory/master-reference-pinned-intro.md`.
- Использовать только исходное фото `alexsmoley-photo-mountains-son` / Canva asset `MAHTZduqLyI`.
- Master visual benchmark: `alexsmoley-master-reference-human-to-system` / Canva asset `MAHTZVECUo4`.
- Формат production-версии: строго 1080×1440 (3:4).
- Production-версию собирать детерминированно, а не image generation: HTML/CSS/SVG или другой кодовый renderer.
- Только реальные Inter Regular + Cormorant Garamond Regular/Italic.
- Не перекрывать лица и фигуры.
- Не добавлять новый текст, CTA, стрелки, иконки или декоративные элементы.
- Смысловая идея обязательна: `человек → редактор → система`; слово `редактор` связывает фотографический слой и системную editorial-зону.
- Не публиковать без отдельного approval.

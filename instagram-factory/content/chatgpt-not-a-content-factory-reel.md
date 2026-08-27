---
id: chatgpt-not-a-content-factory-reel
platform: instagram
format: reels
status: approved-for-render
publish: false
canvas:
  width: 1080
  height: 1920
  fps: 30
  duration_seconds: 25
series_goal: "Показать, что написать пост через ChatGPT — это ещё не контент-завод, и объяснить разницу между генерацией единицы контента и производственной системой."
performance_goal:
  primary: "non-follower reach + watch time"
  secondary: "sends/shares"
  save_trigger: "схема производственного pipeline"
  share_trigger: "формулировка разницы между генерацией поста и системой"
style:
  aesthetics: "editorial / web-inspired / motion typography"
  fonts:
    - "Inter Regular"
    - "Cormorant Garamond Regular"
    - "Cormorant Garamond Italic"
  colors:
    - "brand blue"
    - "cream / light background"
    - "black"
  sound:
    - "music only"
    - "no voice over"
    - "no talking head"
rules:
  - "Не добавлять новый копирайтинг."
  - "Не использовать эмодзи."
  - "Не использовать случайные иконки, роботов, sparkles, AI-китч, логотипы сервисов и декоративный шум."
  - "Финальная верстка должна быть motion-editorial, а не набором сторис, склеенных в видео."
  - "Использовать только кинетическую типографику, простые линии, схемы, редакционные блоки и чистые переходы."
  - "Все тексты на экране должны совпадать с этим файлом дословно."
  - "Никакой озвучки."
  - "Следовать performance-principles.md: first-frame clarity, hook <= 3 sec, progressive disclosure, payoff, share/save logic."
  - "Не использовать forced CTA, fake urgency, «досмотри до конца» и другой algorithm bait."
output:
  type: "1 reel + cover"
  return:
    - "preview mp4"
    - "cover png"
    - "timeline sheet / storyboard preview"
qa:
  - "1080x1920"
  - "duration 20–25 sec"
  - "safe zones for reels UI"
  - "exact text"
  - "approved colors only"
  - "approved fonts only"
  - "no unauthorized icons/effects"
  - "music-only setup"
  - "first frame contains meaningful text immediately"
  - "hook clear within first 3 seconds"
  - "each scene adds new information"
  - "text readable at intended scene duration"
  - "standalone comprehension without previous post"
  - "final payoff closes the opening thesis"
---

# Core idea

Главный тезис: **написать пост через ChatGPT — это ещё не контент-завод**.

Рилс должен показать, что автоматизация одного куска (`промпт → текст`) — это не то же самое, что полноценная производственная система (`идея → арт-дирекшен → GitHub → renderer → QA → PNG → Metricool → Instagram`).

Это продолжение предыдущего поста про день на автоматизацию одного поста, **но Reel обязан быть полностью понятен человеку, который этот пост не видел**.

# Performance logic

## First-frame rule

В `0.0 sec` уже должна быть видна содержательная часть hook. Никакого пустого fade-in, заставки, логотипа или декоративного вступления.

## Retention structure

Каждая сцена выполняет отдельную функцию и добавляет новый смысл:

1. конфликт: `ChatGPT-пост ≠ контент-завод`;
2. слишком маленькая модель: `промпт → текст`;
3. раскрытие реального production pipeline;
4. рефрейминг: автоматизируем не единицу, а процесс;
5. конкретная текущая архитектура;
6. payoff: это и есть контент-завод + самоироничный хвост.

Не дублировать одну и ту же мысль дополнительными промежуточными экранами.

## Send/share trigger

Reel должен давать зрителю формулировку, которую удобно отправить коллеге: **«автоматизация генерации текста — не автоматизация контент-производства»**. Не добавлять прямой CTA «отправь другу».

## Save trigger

Сцена 05 — reusable asset: короткая схема текущей архитектуры. Она должна быть достаточно ясной, чтобы зритель мог остановить Reel/вернуться к нему ради схемы.

## Readability pacing

Текст не должен исчезать раньше, чем его можно прочитать один раз без спешки. Если текущий exact copy не помещается в отведённое время, не ускорять его искусственно и не уменьшать типографику до нечитабельной — зафиксировать QA failure для редакторского решения.

# Motion concept

Видео строится на визуальной метафоре **разрастания цепочки**:

1. вначале есть короткая простая связка `промпт → текст`;
2. затем становится видно, что этого мало;
3. цепочка расширяется в полноценный производственный pipeline;
4. в финале собирается цельная система — контент-завод.

Главный герой рилса — не человек в кадре, а **сама система**.

Motion — функциональный: движение показывает появление узлов, связи, расширение процесса и рефрейминг. Никаких pattern interrupts ради pattern interrupts.

# Timeline

## Scene 01
- time: `0.0–3.0 sec`
- goal: `hook`
- layout_family: `reel-kinetic-statement`
- text_on_screen:
  - "Написать пост через ChatGPT —"
  - "это ещё не контент-завод"
- motion_direction:
  - "Ключевые слова первой строки видны уже на первом кадре"
  - "Первая строка появляется быстро и жёстко"
  - "Вторая фиксирует тезис крупнее"
  - "Можно сделать контраст размеров или инверсию цвета"
- performance_role:
  - "Незнакомый зритель должен понять тему и конфликт примерно за 1–3 секунды"

## Scene 02
- time: `3.0–6.0 sec`
- goal: `show the simplistic model`
- layout_family: `reel-process-minimal`
- text_on_screen:
  - "промпт → текст"
  - "Автоматизирован только один кусок"
- motion_direction:
  - "Короткая цепочка собирается в одну линию"
  - "Подпись появляется как редакционный комментарий"
- performance_role:
  - "Первое доказательство hook — cover не должен оказаться пустым тезисом"

## Scene 03
- time: `6.0–12.0 sec`
- goal: `expand the real process`
- layout_family: `reel-process-build`
- text_on_screen:
  - "тема → фактура → текст → редактура → дизайн → QA → публикация → аналитика"
  - "Вот где начинается производство"
- motion_direction:
  - "Короткая цепочка начинает достраиваться новыми узлами"
  - "Этапы появляются последовательно"
  - "Вторая фраза становится акцентным итогом сцены"
- performance_role:
  - "Центральный reveal: зритель получает новую модель, а не повтор тезиса"

## Scene 04
- time: `12.0–17.0 sec`
- goal: `state the core idea`
- layout_family: `reel-contrast-statement`
- text_on_screen:
  - "Автоматизировать нужно не пост"
  - "Нужно автоматизировать процесс"
- motion_direction:
  - "Первая фраза появляется как тезис"
  - "Вторая — как переформулировка и усиление"
  - "Можно использовать более сильный синий акцент на слове «процесс»"
- performance_role:
  - "Главная send-worthy формулировка Reel"

## Scene 05
- time: `17.0–22.0 sec`
- goal: `show the actual factory pipeline`
- layout_family: `reel-system-diagram`
- text_on_screen:
  - "идея → арт-дирекшен → GitHub → renderer → QA → PNG → Metricool → Instagram"
- motion_direction:
  - "Финальная схема собирается в цельную систему"
  - "Связи и линии проявляются постепенно"
  - "Никаких логотипов сервисов"
- performance_role:
  - "Save-worthy reusable asset; схема должна оставаться читаемой достаточно долго"

## Scene 06
- time: `22.0–25.0 sec`
- goal: `closing`
- layout_family: `reel-closing-editorial`
- text_on_screen:
  - "Вот это я и называю"
  - "контент-заводом"
  - "И пока он всё ещё ломается"
- motion_direction:
  - "Первые две строки — завершение мысли"
  - "Последняя строка — маленький самоироничный послеслог"
  - "Финал без CTA"
- performance_role:
  - "Закрывает promise первого кадра; лёгкий loop допустим только если переход обратно к Scene 01 выглядит естественно"

# Cover

## text_on_cover
- "Написать пост через ChatGPT —"
- "не контент-завод"

## cover_direction
- "Крупная editorial-типографика"
- "Допустим фрагмент процессной линии или системной схемы"
- "Должно быстро считываться в маленьком размере"
- "Cover должен работать без caption и без знания предыдущего поста"

# Caption

Написать пост через ChatGPT сегодня могут почти все.

Но это ещё не контент-завод.

Контент-завод начинается не там, где появляется черновик текста, а там, где появляется система: тема, фактура, редактура, дизайн, проверка, публикация и аналитика.

После вчерашнего опыта я ещё раз убедился, что автоматизировать нужно не один пост, а всю производственную цепочку вокруг него.

Сейчас как раз этим и занимаюсь: пытаюсь собрать систему, которая помогает делать хороший контент быстрее и не даёт выпускать брак.

Пока получается не идеально. Но это уже гораздо больше похоже на завод, чем просто набор нейросетей.

# Acceptance criteria

- Видео длится 20–25 секунд.
- Формат 1080×1920.
- Только approved fonts: Inter Regular, Cormorant Garamond Regular/Italic.
- Только approved colors: brand blue / cream / black.
- Никакой озвучки и говорящей головы.
- Сюжет считывается без звука.
- First frame уже содержит смысловой hook.
- Тема/конфликт понятны примерно за первые 3 секунды.
- Видео понятно без просмотра предыдущего поста.
- Каждая сцена добавляет новую информацию.
- Видео не выглядит как слайд-шоу из сторис.
- Есть ощущение движения и развития системы.
- Все тексты на экране совпадают с этим файлом дословно.
- Все тексты физически успевают считываться в указанном timing.
- Scene 05 работает как save-worthy схема.
- Scene 04 содержит send-worthy формулировку без forced CTA.
- Финал закрывает обещание hook.
- Cover png собран отдельно.
- Ничего не публиковать без отдельного approval.

# Codex one-line command

Открой `instagram-factory/content/chatgpt-not-a-content-factory-reel.md`, затем обязательно прочитай `instagram-factory/performance-principles.md`, реализуй необходимые layout families для motion-renderer, собери preview mp4 + cover png + storyboard preview, прогони технический и performance QA, закоммить и запушь результат, но ничего не публикуй.

# Редакторские скиллы

Набор `redaktura-skills` — русскоязычные скиллы по редактуре и копирайтингу
по методу Людмилы Сарычевой.

| Скилл | Для чего |
|---|---|
| `redpolitika` | Редполитика проекта: голос, словарь, стоп-слова. Собирает `.agents/redpolitika.md`, который подхватывают остальные скиллы |
| `redaktura` | Правка готового текста: смысл → структура → предложения → слова |
| `statya` | Статья или лонгрид с нуля: бриф, фактура, структура, черновик |
| `post` | Короткие посты: Telegram, LinkedIn, Instagram, анонсы |
| `promo` | Лендинги, промостраницы, тексты о себе, пресс-релизы |
| `ux-copy` | Тексты интерфейса: кнопки, формы, ошибки, пуши, онбординг |

Скиллы срабатывают автоматически по смыслу запроса либо вызываются явно:
`/redaktura`, `/statya`, `/post`, `/promo`, `/ux-copy`, `/redpolitika`.

Начинать стоит с `redpolitika` — она задаёт контекст для всех остальных.

## Происхождение и лицензия

Источник: https://github.com/N1arko/redaktura-skills (версия плагина 0.4.0,
коммит `d1ebaff`).
Авторы: Людмила Сарычева и Никита Архипов.
Лицензия: CC-BY-4.0 — см. `LICENSE` рядом.

Скиллы вендорены в репозиторий, а не подключены как плагин-маркетплейс,
чтобы они были доступны в любой сессии с этим репозиторием без
дополнительной настройки.

## Обновление

```sh
git clone --depth 1 https://github.com/N1arko/redaktura-skills /tmp/redaktura-skills
for s in redpolitika redaktura statya post promo ux-copy; do
  rm -rf .claude/skills/$s && cp -R /tmp/redaktura-skills/$s .claude/skills/$s
done
cp /tmp/redaktura-skills/LICENSE .claude/skills/LICENSE
```

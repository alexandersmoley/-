// Publishes one approved Telegram post through a bot.
//
// The bot token never lives in this repository: it is read from the environment, which in
// practice means a GitHub Actions secret. Nothing here logs it, writes it to a file, or puts
// it in a URL that ends up in a log line.
//
// Three refusals guard the send, and each one is a stop rather than a warning:
//   * the channel's publish flag in the manifest must be true;
//   * the manifest's publishApproval must name this channel;
//   * publishedUrl must be empty — a filled one means the post already exists, and the
//     contract forbids repeating a final action after a retry (section 12).
//
// Run it with --dry-run to see exactly what would be sent without sending anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const factoryRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dryRun = process.argv.includes('--dry-run');
const manifestArg = process.argv.find((value) => value.startsWith('--manifest='));
if (!manifestArg) throw new Error('Usage: node scripts/telegram-publish.mjs --manifest=<path> [--dry-run]');
const manifestPath = path.resolve(factoryRoot, manifestArg.slice('--manifest='.length));

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const channel = manifest.channels?.telegram;
if (!channel) throw new Error(`Manifest ${manifestPath} has no telegram channel`);

if (channel.publish !== true) {
  throw new Error(`Отказ: telegram.publish = ${JSON.stringify(channel.publish)}. Публикация возможна только при true.`);
}
const approval = manifest.publishApproval;
const approved = Array.isArray(approval) ? approval.includes('telegram') : approval === 'telegram' || approval === 'all';
if (!approved) {
  throw new Error(`Отказ: publishApproval = ${JSON.stringify(approval)} — Telegram в нём не назван.`);
}
if (channel.publishedUrl) {
  throw new Error(`Отказ: пост уже опубликован — ${channel.publishedUrl}. Повторная публикация запрещена разделом 12 контракта.`);
}

// The message body is the approved copy, taken from the same file the author signed off,
// not retyped here.
const copyPath = path.resolve(path.dirname(manifestPath), channel.copySource);
const markdown = await fs.readFile(copyPath, 'utf8');
const bodyMatch = markdown.match(/\n# Telegram — exact approved copy\n\n([\s\S]*?)\s*$/u);
if (!bodyMatch) throw new Error(`Не нашёл блок утверждённого текста в ${copyPath}`);
const text = bodyMatch[1].trim();
if (!text) throw new Error('Утверждённый текст пуст');
if (text.length > 4096) throw new Error(`Текст ${text.length} символов, Telegram принимает 4096`);

console.log(`канал: ${channel.account}`);
console.log(`текст: ${text.length} символов, ${text.split('\n\n').length} абзацев`);
console.log('--- начало ---');
console.log(text);
console.log('--- конец ---');

if (dryRun) {
  console.log('\n--dry-run: ничего не отправлено');
  process.exit(0);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token) throw new Error('Нет TELEGRAM_BOT_TOKEN в окружении');
if (!chatId) throw new Error('Нет TELEGRAM_CHAT_ID в окружении');

// getMe first: a wrong or revoked token should fail before anything is sent, and the reply
// tells us which bot is about to speak in the author's channel.
const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json());
if (!me.ok) throw new Error(`getMe не прошёл: ${JSON.stringify(me)}`);
console.log(`бот: @${me.result.username}`);

const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true }
  })
}).then((r) => r.json());

if (!response.ok) throw new Error(`sendMessage не прошёл: ${JSON.stringify(response)}`);

const chat = response.result.chat;
const publishedUrl = chat.username
  ? `https://t.me/${chat.username}/${response.result.message_id}`
  : `https://t.me/c/${String(chat.id).replace('-100', '')}/${response.result.message_id}`;

channel.publishedUrl = publishedUrl;
channel.status = 'published';
channel.publishedAt = new Date(response.result.date * 1000).toISOString();
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\nопубликовано: ${publishedUrl}`);
console.log('URL записан в манифест — повторный запуск теперь откажется публиковать.');

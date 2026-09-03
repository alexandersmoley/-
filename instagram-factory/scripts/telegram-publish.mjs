// Publishes one approved Telegram post through a bot.
//
// The bot token never lives in this repository. It comes from one of two places, in order:
// the environment (a GitHub Actions secret), or the macOS keychain when running on the
// author's own machine. Nothing here logs it, writes it to a file, or puts it anywhere a
// log line could pick it up — the keychain read passes the token through stdout of a child
// process and straight into a variable.
//
// The channel is read from the manifest, so there is nothing to type and nothing to get
// wrong: whatever account the manifest names for telegram is where the post goes.
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
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);

// On the author's machine the token lives in the login keychain rather than in a file.
// Any failure here is silent on purpose: not finding it is a normal outcome that the
// caller reports, and the error text from `security` is not worth putting in a log.
async function tokenFromKeychain(service) {
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await run('security', ['find-generic-password', '-s', service, '-w']);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

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

const serviceArg = process.argv.find((value) => value.startsWith('--keychain-service='));
const keychainService = serviceArg ? serviceArg.slice('--keychain-service='.length) : 'telegram-bot-token';
const token = process.env.TELEGRAM_BOT_TOKEN || await tokenFromKeychain(keychainService);
const tokenSource = process.env.TELEGRAM_BOT_TOKEN ? 'окружение'
  : token ? `связка ключей, служба «${keychainService}»`
  : 'не найден';

// The channel comes from the manifest. TELEGRAM_CHAT_ID stays as an override for the case
// where the manifest names a public URL but the bot must post somewhere else.
const chatId = process.env.TELEGRAM_CHAT_ID
  || (channel.account?.match(/t\.me\/([A-Za-z0-9_]+)/u) ? `@${channel.account.match(/t\.me\/([A-Za-z0-9_]+)/u)[1]}` : null);

// Asking Telegram who we are is a read. A dry run does it too, so that a missing, wrong or
// revoked token is found while nothing can be sent, rather than on the run that publishes.
console.log(`токен: ${tokenSource}`);
if (token) {
  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json());
  if (!me.ok) throw new Error(`getMe не прошёл — токен неверен или отозван: ${JSON.stringify(me)}`);
  console.log(`бот: @${me.result.username}`);
}
console.log(`канал: ${chatId ?? 'не определён'}`);

if (dryRun) {
  console.log('\n--dry-run: ничего не отправлено');
  process.exit(0);
}

if (!token) {
  throw new Error(`Токен не найден: ни в TELEGRAM_BOT_TOKEN, ни в связке ключей под службой «${keychainService}». Другое имя службы — флагом --keychain-service=<имя>.`);
}
if (!chatId) throw new Error('Канал не определён: в манифесте нет ссылки вида t.me/<канал>, и TELEGRAM_CHAT_ID не задан');

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

import fs from 'fs'
import path from 'path'
import os from 'os'

const DATA_DIR = process.env.LOCALTOOLS_DATA_DIR || path.join(os.tmpdir(), 'localtools-data')
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const BLOB_PREFIX = 'localtools/'

export interface TelemetryEvent {
  uuid: string
  tool: string
  version: string
  os: string
  event: string
  command?: string
  age_days: number
  ts: number
  zones?: number
  groups?: number
  entries?: number
  certs?: number
  ip?: string
}

export interface UserStats {
  uuid: string
  tool: string
  first_seen: number
  last_seen: number
  total_commands: number
  current_age_days: number
  os: string
  version: string
}

function useBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

async function blobPut(key: string, data: string, type: string) {
  const { put } = await import('@vercel/blob')
  await put(BLOB_PREFIX + key, data, { contentType: type, access: 'public', allowOverwrite: true })
}

async function blobGet(key: string): Promise<string | null> {
  try {
    const { head } = await import('@vercel/blob')
    const { url } = await head(BLOB_PREFIX + key)
    const res = await fetch(url)
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

export async function storeEvent(event: TelemetryEvent) {
  const line = JSON.stringify(event) + '\n'

  if (useBlob()) {
    // Append to events blob
    const existing = await blobGet('events.jsonl') || ''
    await blobPut('events.jsonl', existing + line, 'text/plain')

    // Update users blob
    let users: Map<string, UserStats> = new Map()
    const usersRaw = await blobGet('users.json')
    if (usersRaw) {
      const parsed = JSON.parse(usersRaw)
      users = new Map(Object.entries(parsed))
    }
    mergeUser(users, event)
    const obj = Object.fromEntries(users)
    await blobPut('users.json', JSON.stringify(obj, null, 2), 'application/json')
  } else {
    // Fallback: local file system
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.appendFileSync(EVENTS_FILE, line, 'utf-8')
    updateLocalUsers(event)
  }
}

function mergeUser(users: Map<string, UserStats>, event: TelemetryEvent) {
  const key = `${event.uuid}:${event.tool}`
  const existing = users.get(key)
  if (existing) {
    existing.last_seen = event.ts
    existing.total_commands += event.event === 'command' ? 1 : 0
    existing.current_age_days = Math.max(existing.current_age_days, event.age_days)
    if (event.os) existing.os = event.os
    if (event.version) existing.version = event.version
  } else {
    users.set(key, {
      uuid: event.uuid,
      tool: event.tool,
      first_seen: event.ts,
      last_seen: event.ts,
      total_commands: event.event === 'command' ? 1 : 0,
      current_age_days: event.age_days,
      os: event.os || '',
      version: event.version || '',
    })
  }
}

function updateLocalUsers(event: TelemetryEvent) {
  const users = readLocalUsers()
  mergeUser(users, event)
  writeLocalUsers(users)
}

export async function getStats() {
  let users: Map<string, UserStats>

  if (useBlob()) {
    const raw = await blobGet('users.json')
    if (raw) {
      const parsed = JSON.parse(raw)
      users = new Map(Object.entries(parsed))
    } else {
      users = new Map()
    }
  } else {
    users = readLocalUsers()
  }

  const sorted = Array.from(users.values())
    .sort((a, b) => b.current_age_days - a.current_age_days)

  const byTool = new Map<string, { users: number; commands: number }>()
  for (const u of users.values()) {
    const t = byTool.get(u.tool) || { users: 0, commands: 0 }
    t.users++
    t.commands += u.total_commands
    byTool.set(u.tool, t)
  }

  const totalEvents = useBlob()
    ? (await blobGet('events.jsonl') || '').split('\n').filter(Boolean).length
    : countLocalEvents()

  const totalCommands = Array.from(users.values()).reduce((s, u) => s + u.total_commands, 0)

  return {
    totalUsers: users.size,
    totalCommands,
    totalEvents,
    topUsers: sorted.slice(0, 50).map(u => ({
      ...u,
      first_seen_ts: u.first_seen,
      last_seen_ts: u.last_seen,
    })),
    byTool: Object.fromEntries(byTool),
  }
}

function readLocalUsers(): Map<string, UserStats> {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return new Map(Object.entries(parsed))
  } catch { return new Map() }
}

function writeLocalUsers(users: Map<string, UserStats>) {
  const obj = Object.fromEntries(users)
  fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8')
}

function countLocalEvents(): number {
  try {
    const content = fs.readFileSync(EVENTS_FILE, 'utf-8').trim()
    if (!content) return 0
    return content.split('\n').length
  } catch { return 0 }
}

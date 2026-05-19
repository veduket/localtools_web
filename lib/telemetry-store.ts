import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.LOCALTOOLS_DATA_DIR || path.join(process.cwd(), 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

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

export async function storeEvent(event: TelemetryEvent) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const line = JSON.stringify(event) + '\n'
  fs.appendFileSync(EVENTS_FILE, line, 'utf-8')
  await updateUser(event)
}

async function updateUser(event: TelemetryEvent) {
  const users = readUsers()
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
  writeUsers(users)
}

export function getStats() {
  const users = readUsers()
  const sorted = Array.from(users.values())
    .sort((a, b) => b.current_age_days - a.current_age_days)

  const byTool = new Map<string, { users: number; commands: number }>()
  for (const u of users.values()) {
    const t = byTool.get(u.tool) || { users: 0, commands: 0 }
    t.users++
    t.commands += u.total_commands
    byTool.set(u.tool, t)
  }

  const totalEvents = countEvents()

  return {
    totalUsers: users.size,
    totalCommands: Array.from(users.values()).reduce((s, u) => s + u.total_commands, 0),
    totalEvents,
    topUsers: sorted.slice(0, 50).map(u => ({
      ...u,
      first_seen_ts: u.first_seen,
      last_seen_ts: u.last_seen,
    })),
    byTool: Object.fromEntries(byTool),
  }
}

function readUsers(): Map<string, UserStats> {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

function writeUsers(users: Map<string, UserStats>) {
  const obj = Object.fromEntries(users)
  fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8')
}

function countEvents(): number {
  try {
    const content = fs.readFileSync(EVENTS_FILE, 'utf-8').trim()
    if (!content) return 0
    return content.split('\n').length
  } catch {
    return 0
  }
}

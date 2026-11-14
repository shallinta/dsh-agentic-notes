import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function skillDifference(source, target) {
  if (!fs.existsSync(source)) throw new Error('插件中找不到随记 Skill')
  if (!fs.existsSync(target)) return { installed: false, different: false }
  const bundledHash = hash(fs.readFileSync(source))
  const installedHash = hash(fs.readFileSync(target))
  return { installed: true, different: bundledHash !== installedHash, bundledHash, installedHash }
}
export function checkSkillUpdate({ source, target, store, checkStore = store, day = localDay() }) {
  const out = checkStore.once(`skill-check:${path.resolve(target)}:${day}`, () => skillDifference(source, target))
  if (!out.first || !out.value?.different) return null
  return store.create({ requestId: `skill-update:${day}:${out.value.bundledHash}:${out.value.installedHash}`, eventKey: 'suiji-skill-update',
    kind: 'skill-update', source: 'ui', state: 'succeeded', title: '随记 Skill 可更新',
    body: '已安装的 Skill 与插件附带版本不同，可安装当前版本。',
    actions: [{ id: 'install', type: 'install-skill', label: '安装更新' }, { id: 'later', type: 'dismiss', label: '暂不更新' }] })
}
export function installSkill({ source, target }) {
  const bytes = fs.readFileSync(source)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const temp = `${target}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temp, bytes, { mode: 0o600 })
    fs.renameSync(temp, target)
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp) }
  if (hash(fs.readFileSync(target)) !== hash(bytes)) throw new Error('Skill 内容校验失败，请重试安装')
  return { path: target }
}

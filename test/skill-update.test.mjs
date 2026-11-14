import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createFileSurfaceStore } from '../surface-persistence.js'
import { checkSkillUpdate, installSkill, skillDifference } from '../skill-update.js'

test('first open per day compares contents, not version or mtime, and prompts once', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-skill-update-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const source = path.join(root, 'bundled.md'), target = path.join(root, 'installed.md')
  fs.writeFileSync(source, '# current skill\n')
  fs.writeFileSync(target, '# changed by user\n')
  const store = createFileSurfaceStore({ root })
  const first = checkSkillUpdate({ source, target, store, day: '2026-11-13' })
  assert.equal(first.title, '随记 Skill 可更新')
  assert.doesNotMatch(first.body, /Surface|备份|旧版本/)
  assert.equal(checkSkillUpdate({ source, target, store, day: '2026-11-13' }), null)
  store.close(first.id)
  const nextDay = checkSkillUpdate({ source, target, store, day: '2026-11-14' })
  assert.notEqual(first.id, nextDay.id)
  assert.equal(store.list().queue.length, 1)
})

test('uninstalled and identical skills stay silent; installation directly overwrites without backup', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsan-skill-install-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const source = path.join(root, 'bundled.md'), target = path.join(root, 'global', 'SKILL.md')
  fs.writeFileSync(source, '# current skill\n')
  const store = createFileSurfaceStore({ root })
  assert.equal(checkSkillUpdate({ source, target, store, day: '2026-11-13' }), null)
  installSkill({ source, target })
  assert.equal(skillDifference(source, target).different, false)
  assert.equal(checkSkillUpdate({ source, target, store, day: '2026-11-14' }), null)
  fs.writeFileSync(target, 'custom')
  installSkill({ source, target })
  assert.equal(fs.readFileSync(target, 'utf8'), fs.readFileSync(source, 'utf8'))
  assert.deepEqual(fs.readdirSync(path.dirname(target)), ['SKILL.md'])
})

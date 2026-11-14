// Model content is complete by default. Only a public, nonzero setting may
// shorten it, and the returned text must say that it is incomplete.
export function modelCharLimit(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0
}

export function limitModelText(value, chars, setting) {
  const text = String(value ?? '')
  const limit = modelCharLimit(chars)
  if (!limit || text.length <= limit) return text
  const points = Array.from(text)
  if (points.length <= limit) return text
  return `${points.slice(0, limit).join('')}\n\n[按当前公开设置 ${setting} 截断：返回 ${limit}/${points.length} 个字符；将该设置改为 0 可返回完整内容。]`
}

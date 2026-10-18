// PreToolUse hook for Bash: refuses a `git commit` that breaks the rules in
// AGENTS.md → Committing. Exit 2 blocks the call and hands stderr to Claude.
//
// The message is read from the command itself (-m, -F, or a heredoc inside
// -m), because a PreToolUse hook runs before git has assembled one.

import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const TYPES = ['feat', 'fix', 'chore', 'docs', 'ci', 'test', 'refactor', 'build']
const TITLE = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S`)
const ATTRIBUTION = /^(co-authored-by|signed-off-by):|generated with|🤖/im
const BODY_WIDTH = 72
const OPERATORS = new Set(['&&', '||', ';', '|', '\n'])

const input = JSON.parse(readFileSync(0, 'utf8'))
const command = input.tool_input?.command ?? ''
const cwd = input.cwd ?? process.cwd()

if (!/\bgit\b[^;&|\n]*\bcommit\b/.test(command)) process.exit(0)

const args = commitArgs(tokenize(command))
if (!args) process.exit(0)

const problems = []
const message = readMessage(args)

if (args.some(isSigningFlag)) {
  problems.push('Commits are never signed: drop -s/--signoff/-S/--gpg-sign (rule 4).')
}

if (message !== undefined && !message.startsWith('Merge ')) {
  problems.push(...checkMessage(message))
}

if (problems.length > 0) block(problems)

const verify = spawnSync('pnpm', ['verify'], { cwd, encoding: 'utf8' })
if (verify.status !== 0) {
  const output = `${verify.stdout ?? ''}${verify.stderr ?? ''}`.trim().split('\n')
  block(['pnpm verify is failing, so this commit is refused (rule 1).'], output.slice(-30))
}

process.exit(0)

function checkMessage(text) {
  const found = []
  const lines = text.replace(/\s+$/, '').split('\n')
  const title = lines[0] ?? ''

  if (!TITLE.test(title)) {
    found.push(
      `Title "${title}" is not a conventional commit: <${TYPES.join('|')}>(scope)?: <what> (rule 2).`,
    )
  }
  if (/\.\s*$/.test(title)) found.push('Title ends in a full stop (rule 3).')
  if (lines.length > 1 && lines[1] !== '') {
    found.push('The title must be one line, followed by a blank line before the body (rule 6).')
  }
  if (ATTRIBUTION.test(text)) {
    found.push('The message carries attribution (Co-Authored-By, Signed-off-by, …) (rule 4).')
  }
  lines.slice(1).forEach((line, i) => {
    if ([...line].length > BODY_WIDTH) {
      found.push(
        `Body line ${i + 2} is ${[...line].length} columns; wrap at ${BODY_WIDTH} (rule 6).`,
      )
    }
  })
  return found
}

function readMessage(tokens) {
  const parts = []
  let file
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token === '-m' || token === '--message') parts.push(tokens[++i] ?? '')
    else if (token.startsWith('--message=')) parts.push(token.slice('--message='.length))
    else if (token === '-F' || token === '--file') file = tokens[++i]
    else if (token.startsWith('--file=')) file = token.slice('--file='.length)
    else if (/^-[a-zA-Z]+$/.test(token)) {
      // A cluster such as -am "msg" or -amfoo: the value-taking letter ends it.
      const at = token.search(/[mF]/)
      if (at === -1) continue
      const rest = token.slice(at + 1) || tokens[++i] || ''
      if (token[at] === 'm') parts.push(rest)
      else file = rest
    }
  }
  if (parts.length > 0) return parts.join('\n\n')
  if (file !== undefined) {
    try {
      return readFileSync(file === '-' ? 0 : resolve(cwd, file), 'utf8')
    } catch {
      return undefined
    }
  }
  if (tokens.includes('--amend')) {
    return execFileSync('git', ['log', '-1', '--format=%B'], { cwd, encoding: 'utf8' })
  }
  return undefined
}

function isSigningFlag(token) {
  if (['--signoff', '--gpg-sign'].includes(token) || token.startsWith('--gpg-sign=')) return true
  if (!/^-[a-zA-Z]+$/.test(token)) return false
  // Letters after a value-taking one belong to its value, not to the flags.
  const flags = token.slice(1).split(/[mFCct]/)[0] ?? ''
  return /[sS]/.test(flags)
}

// The arguments of the first `git … commit` in the command, up to the next
// shell operator.
function commitArgs(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== 'git') continue
    let j = i + 1
    while (j < tokens.length && tokens[j]?.startsWith('-')) {
      j += ['-C', '-c'].includes(tokens[j] ?? '') ? 2 : 1
    }
    if (tokens[j] !== 'commit') continue
    const end = tokens.findIndex((t, k) => k > j && OPERATORS.has(t))
    return tokens.slice(j + 1, end === -1 ? undefined : end)
  }
  return undefined
}

// A small shell-word splitter: quotes, backslash escapes, operators, and the
// "$(cat <<'EOF' … EOF)" form that commit messages are usually passed in.
function tokenize(source) {
  const heredoc = /"\$\(cat <<-?\s*'?(\w+)'?\n([\s\S]*?)\n\s*\1\s*\)"/g
  const bodies = []
  const text = source.replace(heredoc, (_, _tag, body) => {
    bodies.push(body)
    return `\u0000${bodies.length - 1}\u0000`
  })

  const tokens = []
  let current = ''
  let started = false
  const push = () => {
    if (started) tokens.push(current)
    current = ''
    started = false
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\u0000') {
      const end = text.indexOf('\u0000', i + 1)
      current += bodies[Number(text.slice(i + 1, end))] ?? ''
      started = true
      i = end
    } else if (c === "'") {
      const end = text.indexOf("'", i + 1)
      current += text.slice(i + 1, end === -1 ? undefined : end)
      started = true
      i = end === -1 ? text.length : end
    } else if (c === '"') {
      started = true
      for (i++; i < text.length && text[i] !== '"'; i++) {
        if (text[i] === '\\' && '"\\$`'.includes(text[i + 1] ?? '')) i++
        current += text[i]
      }
    } else if (c === '\\') {
      if (text[i + 1] !== '\n') current += text[i + 1] ?? ''
      started = text[i + 1] !== '\n' || started
      i++
    } else if (c === '&' || c === '|') {
      push()
      tokens.push(text[i + 1] === c ? c + c : c)
      if (text[i + 1] === c) i++
    } else if (c === ';' || c === '\n') {
      push()
      tokens.push(c)
    } else if (c === ' ' || c === '\t') {
      push()
    } else {
      current += c
      started = true
    }
  }
  push()
  return tokens
}

function block(problems, detail = []) {
  const text = [
    'Commit refused by .claude/hooks/commit-guard.mjs:',
    ...problems.map((p) => `- ${p}`),
  ]
  process.stderr.write(`${[...text, ...detail].join('\n')}\n`)
  process.exit(2)
}

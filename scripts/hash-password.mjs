#!/usr/bin/env node
// Prints an ADMIN_PASSWORD_HASH value. The password is read from stdin
// (not argv) so it does not end up in shell history or process lists.
import { randomBytes, scrypt } from 'node:crypto'
import { createInterface } from 'node:readline'

const N = 2 ** 17
const r = 8
const p = 1

async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = ''
    for await (const chunk of process.stdin) data += chunk
    return data.replace(/\r?\n$/, '')
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  const ask = (q) =>
    new Promise((resolve) => {
      rl.question(q, resolve)
      rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : '')
    })
  const a = await ask('Parola: ')
  process.stdout.write('\n')
  const b = await ask('Parola (tekrar): ')
  process.stdout.write('\n')
  rl.close()
  if (a !== b) throw new Error('Parolalar eşleşmiyor')
  return a
}

const password = await readPassword()
if (password.length < 12) {
  console.error('Parola en az 12 karakter olmalı.')
  process.exit(1)
}
const salt = randomBytes(16)
scrypt(password.normalize('NFKC'), salt, 32, { N, r, p, maxmem: 256 * N * r }, (err, key) => {
  if (err) throw err
  console.log(['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join(':'))
})

import { spawn } from 'node:child_process'

process.env.NUXT_BUILD_DIR = '.nuxt-agent'
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const child = spawn(cmd, ['nuxt', 'dev', '--port', '3001'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})

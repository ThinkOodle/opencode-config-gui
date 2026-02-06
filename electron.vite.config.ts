import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * Load environment variables from .env.local if it exists.
 * Only sets vars that aren't already defined in the environment.
 */
function loadEnvLocal(): void {
  const envPath = resolve(__dirname, '.env.local')
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    // Don't override existing env vars
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvLocal()

/**
 * Load the GitHub App private key for skill request PR creation.
 * Supports two methods:
 *   1. GITHUB_APP_PRIVATE_KEY env var containing the PEM content directly
 *   2. GITHUB_APP_PRIVATE_KEY_PATH env var pointing to a .pem file
 */
function loadGitHubAppPrivateKey(): string {
  if (process.env.GITHUB_APP_PRIVATE_KEY) {
    return process.env.GITHUB_APP_PRIVATE_KEY
  }
  const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH
  if (keyPath && existsSync(keyPath)) {
    return readFileSync(keyPath, 'utf-8')
  }
  return ''
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env.GITHUB_APP_ID': JSON.stringify(process.env.GITHUB_APP_ID || ''),
      'process.env.GITHUB_APP_PRIVATE_KEY': JSON.stringify(loadGitHubAppPrivateKey()),
      'process.env.GITHUB_APP_INSTALLATION_ID': JSON.stringify(process.env.GITHUB_APP_INSTALLATION_ID || ''),
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload/index.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        output: {
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})

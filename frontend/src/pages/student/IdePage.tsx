import Editor from '@monaco-editor/react'
import { ChevronDown, Loader2, Play, TerminalSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, ApiError } from '../../api/client'
import { BackToToolsLink } from '../../components/BackToToolsLink'
import { useTheme } from '../../theme/ThemeContext'

interface LanguageOption {
  id: string
  label: string
}

interface RunResult {
  output: string
  cpu_time: string | null
  memory: string | null
}

const MONACO_LANGUAGES: Record<string, string> = {
  python3: 'python',
  nodejs: 'javascript',
  php: 'php',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  ruby: 'ruby',
  bash: 'shell',
}

const STARTER_CODE: Record<string, string> = {
  python3: 'print("Bonjour AI Learning !")\n',
  nodejs: 'console.log("Bonjour AI Learning !")\n',
  php: '<?php\necho "Bonjour AI Learning !";\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Bonjour AI Learning !");\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Bonjour AI Learning !\\n");\n    return 0;\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Bonjour AI Learning !" << std::endl;\n    return 0;\n}\n',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Bonjour AI Learning !");\n    }\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Bonjour AI Learning !")\n}\n',
  ruby: 'puts "Bonjour AI Learning !"\n',
  bash: 'echo "Bonjour AI Learning !"\n',
}

// Brouillon local : le code en cours survit à une navigation ou un
// rechargement (localStorage, propre à ce navigateur).
const DRAFT_KEY = 'ai_learning_ide_draft'

function loadDraft(): { language: string; code: string; stdin: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function IdePage() {
  const { theme } = useTheme()

  const [languages, setLanguages] = useState<LanguageOption[]>([])
  const [language, setLanguage] = useState(() => loadDraft()?.language ?? 'python3')
  const [code, setCode] = useState(() => loadDraft()?.code ?? STARTER_CODE['python3'])
  const [stdin, setStdin] = useState(() => loadDraft()?.stdin ?? '')
  const [showStdin, setShowStdin] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ language, code, stdin }))
    } catch {
      // stockage indisponible (navigation privée...) : tant pis pour le brouillon
    }
  }, [language, code, stdin])

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<LanguageOption[]>('/playground/languages/')
      .then(setLanguages)
      .catch(() => setLanguages([]))
  }, [])

  function handleLanguageChange(next: string) {
    setLanguage(next)
    setCode(STARTER_CODE[next] ?? '')
    setResult(null)
    setRunError(null)
  }

  async function handleRun() {
    if (!code.trim() || isRunning) return
    setIsRunning(true)
    setRunError(null)
    setResult(null)
    try {
      const data = await apiFetch<RunResult>('/playground/run/', {
        method: 'POST',
        body: { language, code, stdin },
      })
      setResult(data)
    } catch (err) {
      setRunError(err instanceof ApiError ? err.message : "Impossible d'exécuter le code.")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <BackToToolsLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={language}
          onChange={(event) => handleLanguageChange(event.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {languages.length === 0 ? (
            <option value={language}>Python 3</option>
          ) : (
            languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))
          )}
        </select>

        <button
          onClick={handleRun}
          disabled={isRunning || !code.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {isRunning ? 'Exécution...' : 'Exécuter'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
        <Editor
          height="45vh"
          language={MONACO_LANGUAGES[language] ?? 'plaintext'}
          value={code}
          onChange={(value) => setCode(value ?? '')}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>

      <div>
        <button
          onClick={() => setShowStdin((current) => !current)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ChevronDown size={14} className={`transition-transform ${showStdin ? 'rotate-180' : ''}`} />
          Entrée standard (stdin)
        </button>
        {showStdin && (
          <textarea
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            rows={3}
            placeholder="Données lues par votre programme (input(), scanf, readline...)"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        )}
      </div>

      <div className="flex min-h-40 flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
            <TerminalSquare size={14} />
            Console de sortie
          </span>
          {result && (result.cpu_time || result.memory) && (
            <span className="text-[10px] font-semibold text-slate-500">
              {result.cpu_time ? `${result.cpu_time}s` : ''}
              {result.cpu_time && result.memory ? ' · ' : ''}
              {result.memory ? `${result.memory} Ko` : ''}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
          {isRunning ? (
            <span className="text-slate-500">Exécution en cours...</span>
          ) : runError ? (
            <span className="whitespace-pre-wrap text-red-400">{runError}</span>
          ) : result ? (
            <pre className="whitespace-pre-wrap text-slate-100">{result.output || '(aucune sortie)'}</pre>
          ) : (
            <span className="text-slate-600">Cliquez sur « Exécuter » pour lancer votre programme.</span>
          )}
        </div>
      </div>
    </div>
  )
}

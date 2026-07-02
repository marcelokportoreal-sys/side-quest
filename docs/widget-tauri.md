# Frente B — Casca desktop (widget always-on-top) com Tauri

O jogo já expõe a rota enxuta **`/widget`** (só a cena viva + a frase do dia + os
recursos, sem o chrome de missões). A casca desktop apenas embrulha essa rota numa
janela sem borda, sempre no topo, no canto da tela — o "Tamagotchi moderno".

> **Status:** a rota `/widget` está pronta e testável no browser hoje
> (`npm run dev` → http://localhost:3000/widget). A casca Tauri abaixo exige uma
> instalação única de toolchain Rust que **ainda não está no ambiente** — por isso
> está documentada, não commitada como projeto Rust. A Frente A (loop de vida)
> funciona sem ela.

## Pré-requisitos (uma vez)

1. **Rust** — instalar via https://rustup.rs (no Windows, `rustup-init.exe`).
2. **Tauri CLI** — `npm i -D @tauri-apps/cli`.

## Scaffold

```bash
npx tauri init
```

Responder ao wizard:
- *App name:* `side-quest`
- *Window title:* `Side Quest`
- *Web assets (frontend dist):* não se aplica (usamos dev server / Next) — aceitar o default.
- *dev server URL:* `http://localhost:3000/widget`
- *frontend dev command:* `npm run dev`
- *frontend build command:* `npm run build`

## Configuração da janela (always-on-top, sem borda, cantinho)

No `src-tauri/tauri.conf.json` gerado, ajustar o bloco `app.windows[0]`:

```json
{
  "app": {
    "windows": [
      {
        "label": "widget",
        "url": "/widget",
        "title": "Side Quest",
        "width": 360,
        "height": 300,
        "resizable": true,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": false,
        "transparent": false
      }
    ]
  }
}
```

- `decorations: false` + o `data-tauri-drag-region` que já está no `Widget.tsx` deixam
  a janela arrastável pelo corpo.
- `alwaysOnTop: true` mantém no canto sobre outras janelas.
- Persistência de posição/tamanho: adicionar o plugin
  [`@tauri-apps/plugin-window-state`](https://tauri.app/plugin/window-state/).

## Rodar

```bash
npm run dev            # sobe o Next em :3000 (ou deixar o Tauri subir via beforeDevCommand)
npx tauri dev          # abre a janela widget apontando para /widget
```

Auth: a janela usa o mesmo Supabase/cookies do app web; logar uma vez em `/login`
no browser embutido resolve a sessão.

## Empacotar

```bash
npx tauri build        # gera o instalador (.msi/.exe no Windows)
```

## Por que Tauri e não Electron

Bundle ~10x menor, sem runtime Node exposto, shell em Rust chamando a mesma API/Supabase.
O domain layer (`src/domain/*`) é puro e agnóstico à casca, então nada aqui acopla o
jogo à plataforma — se um dia a casca mudar, o jogo não muda.

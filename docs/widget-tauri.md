# Frente B — Casca desktop (widget always-on-top) com Tauri

O jogo expõe a rota enxuta **`/widget`** (só a cena viva + a frase do dia + os
recursos, sem o chrome de missões). A casca desktop **Tauri** embrulha essa rota numa
janela sem borda, sempre no topo, no canto da tela — o "Tamagotchi moderno".

> **Status:** scaffold Tauri v2 criado em `src-tauri/` (janela `widget` já configurada:
> sem borda, always-on-top, 380×320, arrastável via `data-tauri-drag-region` no
> `Widget.tsx`). Aponta para o dev server (`http://localhost:3000/widget`).

## Pré-requisitos (uma vez)
1. **Rust** (rustup) + **MSVC Build Tools** (linker) — no Windows.
2. **WebView2 runtime** — já vem no Windows 11.
3. Dependências JS já no `package.json`: `@tauri-apps/cli`, `@tauri-apps/api`.

## Rodar em desenvolvimento
```bash
npm run tauri dev
```
Isso executa o `beforeDevCommand` (`npm run dev`, sobe o Next em :3000), espera a URL
e abre a janela widget apontando para `/widget`. Auth: a janela usa o mesmo
Supabase/cookies do app; logar uma vez em `/login` resolve a sessão.

## Configuração da janela (`src-tauri/tauri.conf.json`)
A janela `widget` já vem com: `decorations:false`, `alwaysOnTop:true`, `url:"/widget"`,
`380×320`, `resizable:true`. Para persistir posição/tamanho, adicionar o plugin
[`@tauri-apps/plugin-window-state`](https://tauri.app/plugin/window-state/).

## Empacotar (instalador)
```bash
npm run tauri build   # gera .msi/.exe no Windows
```
**Atenção — modelo de frontend:** o app é SSR (Next.js na Vercel), não estático. Para o
build de produção, a casca deve apontar para a **URL de produção** em vez de bundlar um
frontend local: trocar `build.frontendDist` e `app.windows[0].url` para
`https://side-quest-shun13.vercel.app/widget`. Isso exige a **Deployment Protection do
Vercel desligada** (senão a rota redireciona para o login do Vercel). Em dev, tudo aponta
para `localhost:3000` e funciona independentemente disso.

## Por que Tauri e não Electron
Bundle ~10x menor, sem runtime Node exposto, shell em Rust chamando a mesma API/Supabase.
O domain layer (`src/domain/*`) é puro e agnóstico à casca — se um dia a casca mudar, o
jogo não muda.

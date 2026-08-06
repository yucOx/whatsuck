# Contributing to Whatsuck

Thanks for your interest in contributing! Whatsuck is a small project (plain
JavaScript, no build step, no bundler), which makes it easy to understand
the whole codebase in one sitting.

## Quick start

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/whatsuck.git
   cd whatsuck
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Run** in dev mode:
   ```bash
   npm start
   ```
5. **Build** the .deb to verify nothing broke:
   ```bash
   npm run build
   ```

The dev mode skips auto-update and keyring warnings, so you can iterate
quickly without spurious dialogs.

## Code structure

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the module map and data flow
before making non-trivial changes. The codebase follows a few rules:

- **One responsibility per file.** Each module exports a small set of
  functions with clear JSDoc.
- **No globals, no singletons in modules.** State is held in `main.js` and
  passed via callbacks or module APIs.
- **Constants live in `src/constants.js`.** Don't hardcode strings or
  numbers in feature modules.
- **No silent error swallowing.** If you catch an error, log it and either
  show a dialog or rethrow with context.

## Coding style

- 2-space indentation, single quotes, semicolons (matching the existing code)
- Use `const` and `let`, never `var`
- Prefer `function foo()` over `const foo = () =>` for top-level exports
- Add JSDoc `@param` / `@returns` to every exported function
- Don't add dependencies unless you can justify why a standard-library
  alternative won't work

## Commit messages

We use a relaxed conventional-commits style:

```
fix(profiles): handle corrupted JSON gracefully
feat(notifications): add unread badge to tray icon
docs: add ARCHITECTURE.md
refactor: extract magic numbers to constants
```

The first line is the change summary (≤72 chars). Optional body explains the
why; a blank line separates it.

## Pull request process

1. **Open an issue first** for non-trivial changes. We can discuss the design
   before you spend time on a PR.
2. **One change per PR.** Don't bundle unrelated refactors.
3. **Test on Ubuntu 22.04 or 24.04** — that's the only platform we support.
4. **Update the README** if you change user-facing behavior.
5. **Run `npm run build`** and confirm the resulting `.deb` installs and runs.

## Reporting bugs

Open an issue with:

- Output of `whatsuck --version`
- Your Ubuntu version (`lsb_release -a`)
- How to reproduce, including which profile was active if relevant
- Relevant log lines (the wrapper script writes to `~/.cache/whatsuck/`)

## Reporting vulnerabilities

**Do not file public issues for security bugs.** Open a private security
advisory on GitHub, or email `yucox@yuxor.ltd`. We'll respond
within 72 hours.

## Community standards

By participating, you agree to abide by the
[Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
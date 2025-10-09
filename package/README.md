# fragments

Private repository for fragments project

## Overview

This is the back-end microservice project for **Lab 1**.  
It is built using **Node.js**, **Express**, and includes structured logging with **Pino**.  
The project is configured with **Prettier** for formatting, **ESLint** for linting, and supports debugging with **VSCode**.

---

## Prerequisites

Make sure you have installed:

- [Node.js (LTS)]
- [Git]
- [curl] or (`curl.exe` if using PowerShell)
- [jq]
- [VSCode](https://code.visualstudio.com/) with extensions:
  - ESLint
  - Prettier – Code Formatter
  - Code Spell Checker

---

## Setup

Clone the repo:

```sh
git clone git@github.com:<your-username>/fragments.git
cd fragments
npm install


```

## npm Scripts

### Lint

Check for code issues with ESLint:

```sh
npm run lint
```

### Start

Start the server normally:

```sh
npm start
```

### Dev

Start the server with auto-reload when files change:

```sh
npm run dev
```

### Debug

Start the server in debug mode:

```sh
npm run debug
```

---

## Running the Server

Start the server:

```sh
npm start
```

Open [http://localhost:8080](http://localhost:8080) in your browser.  
You should see JSON like:

```json
{
  "status": "ok",
  "author": "YOUR NAME",
  "githubUrl": "https://github.com/YOUR_USERNAME/fragments",
  "version": "0.0.1"
}
```

Using curl + jq:

```sh
curl.exe -s http://localhost:8080 | jq
```

---

## Debugging with VSCode

1. Set a breakpoint in `src/app.js` at:
   ```js
   res.status(200).json({
   ```
2. In VSCode, go to the **Run & Debug** tab.
3. Select **Debug via npm run debug** and press start .
4. Run
   ```sh
   curl.exe http://localhost:8080
   ```
5. The debugger should pause on the breakpoint and you will the breakpoint line the yelloow colour.Also see somee of the req ,rec,this in the debugger menu .

---

## Git Workflow

Add specific files:

```sh
git add <file>
```

Commit with a message:

```sh
git commit -m "Message"
```

Push to GitHub:

```sh
git push origin main
```

---

## Submission Requirements

For Lab 1, include in your report:

1. Link to your GitHub repo.
2. Screenshot of SSH keys via:
   ```sh
   curl.exe https://github.com/<your-username>.keys
   ```
3. Screenshots of:
   - Running `npm run lint` (no errors).
   - Browser at [http://localhost:8080](http://localhost:8080).
   - Terminal using `curl.exe ... | jq`.
   - VSCode debugger hitting breakpoint.
   - Environment variables printed when running with `LOG_LEVEL=debug`.

---

## License

This project is **UNLICENSED** and for coursework only.Completed by Navish on September 9,2025

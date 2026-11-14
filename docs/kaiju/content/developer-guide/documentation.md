# Documentation

Kaiju uses [Zensical](https://zensical.org/) with a modern theme. Project files are under `docs/kaiju`, and page source files are under `docs/kaiju/content`.

## View the Docs Locally

Start the local documentation server from the repository root.

```bash
make docs
```

Open `http://localhost:8001/kaiju/`. The first run installs the locked dependencies into `docs/kaiju/.venv`. Stop the server with `Ctrl+C`.

The server listens on `0.0.0.0:8001` so that Windows can connect to it through Windows Subsystem for Linux (WSL).

## Add a Page

**Step 1.** Add the Markdown file under `docs/kaiju/content`.

**Step 2.** Add the page to `docs/kaiju/zensical.toml` using a path relative to the content directory.

**Step 3.** Run `make docs` and check the page, links, headings, and navigation.

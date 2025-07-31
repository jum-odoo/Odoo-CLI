# Odoo-CLI

## Requirements:

- **Odoo** and all of its requirements (Python 3, PostgreSQL, etc.)
- Bun (recommended, can be used with other TS runtimes)

## Setup:

Pull the repo and run the main file with your TS runtime (replace `bun` with `ts-node`, `deno`, ...):
```bash
bun .
```

For ease of use, it is recommended to create an alias in `~/.bashrc` (or similar .rc files):
```bash
alias odoo="bun <PATH/TO/ODOO-CLI>"
```

## Examples:

Run the server on the current branch's database with default ports and addon-paths:
```bash
odoo
```

Run the server with a different database, only with **community** addons:
```bash
odoo -d other_db --community
```

Drop the current database, create a new one with **default** addons (i.e. `crm`, `project` and `website`), and start it right after:
```bash
odoo create default --start
```

Run client unit tests from the server
```bash
odoo test .test_unit_desktop
```

Edit memory log sources and generate memory graph from a list of runbot links
```bash
odoo memory edit # paste links on each line in the file
odoo memory --open
```

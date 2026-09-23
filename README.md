# JB-X

JB-X is a Python command-line tool for looking up Roblox Jailbreak item data. I built it to make repeated API queries quicker to run and easier to extend than a collection of one-off scripts.

The CLI uses data from the third-party Jailbreak Changelogs APIs. It is not affiliated with Roblox or the Jailbreak Changelogs project.

## What it does

- Looks up item values, demand, trends, notes, and related fields
- Prompts for a selection when an item search returns more than one match
- Registers commands and aliases through a small decorator-based registry
- Generates global and command-specific help from the registry metadata
- Loads command modules at startup
- Keeps interactive command history with `prompt_toolkit`
- Checks GitHub releases for newer builds

The repository also contains experiments for trade comparison and duplicate-item queries. Some commands are still works in progress; the item lookup and command system are the clearest parts of the tool.

## How the command system works

Commands register themselves with the decorator in `util/registry.py`:

```python
@command(
    name="value",
    description="Shows the value of item(s)",
    usage="value <name...>",
    aliases=["v", "val", "item"],
)
def values(*names):
    ...
```

The registry stores the callable and its help metadata under both the canonical name and each alias. `main.py` discovers modules, parses commands, separates trailing flags, and asks for missing required arguments when it can.

## Running it

JB-X was developed with Python 3.13. Earlier Python versions have not been tested.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

On Windows, activate the environment with `.venv\Scripts\activate`.

Once the prompt opens, try:

```text
help
help value
value carbonara
```

## Repository layout

```text
main.py          Interactive prompt and command dispatch
modules/         Commands loaded at startup
util/registry.py Command decorator and registry
util/updater.py  GitHub release check
util/version.py  Build version and release channel
```

## API use

Please keep requests reasonable and follow the terms of the APIs the tool calls. API availability and response fields are outside this repository's control, so commands that depend on those services may stop working if the upstream API changes.

## License

JB-X is available under the AGPL-3.0 license. See `LICENSE` for the full text.

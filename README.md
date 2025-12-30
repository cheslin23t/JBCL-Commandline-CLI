# JB-X: Jailbreak Changelogs CLI & API Interface

[![Python Version](https://img.shields.io/badge/python-3.13.3%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/github/license/cheslin23t/JBCL-Commandline-CLI)](LICENSE)
[![Stars](https://img.shields.io/github/stars/cheslin23t/JBCL-Commandline-CLI?style=social)](https://github.com/cheslin23t/JBCL-Commandline-CLI/stargazers)
[![Forks](https://img.shields.io/github/forks/cheslin23t/JBCL-Commandline-CLI?style=social)](https://github.com/cheslin23t/JBCL-Commandline-CLI/network/members)

A Python-based CLI and API interface for querying **Roblox Jailbreak item data**, values, trends, and changelog information. Designed to be **modular**, **extensible**, and **developer-friendly**.

---

## ✨ Features

- 🔍 Query Jailbreak items by name  
- 📊 Display curated value data: cash value, duped value, demand, trend, notes  
- 🧩 Modular command system with decorators  
- 🏷️ Alias support for commands  
- 🆘 Built-in `--help` support for every command  
- 🚩 Flag parsing (flags must appear after arguments)  
- 🎛️ Interactive selection when multiple items match  

---

## 📁 Project Structure

```
JBCL-Commandline-CLI/
│
├── main.py                 # CLI entry point
├── util/
│   └── registry.py         # Command registry & decorator
├── commands/
│   ├── values.py           # Item value lookup
│   └── ...                 # Additional commands
└── README.md
```

---

## 🚀 Getting Started

### Requirements

- Python 3.13.3+ (Earlier versions untested)
- Virtual environment recommended

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run the CLI

```bash
python main.py
```

---

## 🧠 Command System Overview

Commands are registered using a decorator in `util/registry.py`:

```python
from util.registry import command

@command(
    name="value",
    description="Get Jailbreak item value information",
    usage="value <item name>",
    aliases=["val"]
)
def values(name):
    ...
```

Each command automatically registers:

- Function reference  
- Description  
- Usage string  
- Canonical name  
- Aliases  

---

## 🆘 Help System

### Global Help

```text
Type 'help' for a list of commands.
Type '<command> --help' for usage.
```

### Command-Specific Help

```bash
value --help
```

Output:

```
value: Get Jailbreak item value information
Usage: value <item name>
```

---

## 🚩 Flags

Flags must appear **after positional arguments**:

✅ Valid:

```bash
value carbonara --help
```

❌ Invalid:

```bash
value --help carbonara
```

---

## 📊 Item Selection Logic

When a query returns multiple items (e.g., same name, different types), the CLI prompts the user to select one:

```
Multiple items found:
1. Subcarbon (Rim)
2. Carbonara (Vehicle)
3. Carbon Fire (Texture)

Select an item by number:
```

After selection, the CLI displays:

- Name  
- Type  
- Cash Value  
- Duped Value (if applicable)  
- Demand  
- Trend  
- Notes (if applicable)  
- Metadata (detailed, optional)

---

## 🛠️ Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to **fork** the project and submit a pull request.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 💡 Useful Links

- [Roblox Jailbreak](https://www.roblox.com/games/606849621/Jailbreak)  
- [GitHub Issues](https://github.com/cheslin23t/JB-X/issues)  
- [GitHub Discussions](https://github.com/cheslin23t/JB-X/discussions)  

---

## 🙌 Thanks

Thanks for using JB-X! 🎉 

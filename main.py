import sys
import os
import importlib
import pkgutil
import inspect
from util.registry import COMMANDS
from util.version import __version__
from prompt_toolkit import PromptSession
from prompt_toolkit.history import FileHistory
# from PyInstaller.utils.hooks import collect_submodules

# hiddenimports = collect_submodules('commands')

def load_command_modules():
    import commands
    print("Loading command modules...")
    print("")

    # Default search path (works locally)
    search_path = commands.__path__

    # FIX: If running as compiled exe, force search in the extracted folder
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        search_path = [os.path.join(sys._MEIPASS, 'commands')]
    any_module_loaded = False
    for _, module_name, _ in pkgutil.iter_modules(search_path):
        any_module_loaded = True
        if module_name.startswith("_"):
            continue
        importlib.import_module(f"commands.{module_name}")
        print(f"Importing module {module_name}")
        try:
            importlib.import_module(f"commands.{module_name}")
            print(f"Successfully imported module {module_name}")
        except Exception as e:
            print(f"Failed to import module {module_name}: {e}")
    print("")
    if not any_module_loaded:
        print("Warning: No command modules were loaded. Try checking the PyInstaller spec file for correct data inclusion, or run the script directly without compiling.")
        sys.exit(1)

def main():
    greet = f"""
    JBCL Command Line Interface v{__version__}
    Type 'help' for a list of commands.
    Type '<command> --help' for usage.
    Type 'exit' to quit.

    """
    print(greet)

    load_command_modules()
    # Setup history file in user's home directory
    history_file = os.path.join(os.path.expanduser("~"), ".jb-x_history")
    session = PromptSession(history=FileHistory(history_file))

    while True:
        try:
            # Use session.prompt() for arrow key support & history
            raw = session.prompt("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting...")
            break
            
        if not raw:
            continue

        parts = raw.split()
        cmd_name = parts[0]

        # Split positional args and flags (flags must be at the end)
        args = []
        flags = []
        for part in parts[1:]:
            if part.startswith("--"):
                flags.append(part)
            else:
                if flags:
                    print("Flags must come after all arguments.")
                    args = None
                    break
                args.append(part)

        if args is None:
            continue
        
        

        cmd = COMMANDS.get(cmd_name)
        if not cmd:
            print(f"Unknown command: {cmd_name}")
            continue

        # Handle --help flag
        if "--help" in flags:
            print(f"{cmd_name}: {cmd.get('description', '')}")
            if cmd.get("usage"):
                print(f"Usage: {cmd['usage']}")
            continue

        func = cmd["func"]
        sig = inspect.signature(func)
        params = list(sig.parameters.values())
        param_names = [p.name for p in params]
        required_params = [
            p for p in params
            if p.default is inspect._empty and p.name != "flags"
        ]

        provided = len(args)
        missing = required_params[provided:]
        for param in missing:
            value = input(f"{param.name}: ").strip()
            args.append(value)

        try:
            if "flags" in param_names:
                func(*args, flags=flags)
            else:
                func(*args)
        except TypeError as e:
            print(f"Argument error: {e}")
            if cmd.get("usage"):
                print(f"Usage: {cmd['usage']}")
        except Exception as e:
            print(f"Error executing command '{cmd_name}': {e}")

if __name__ == "__main__":
    main()
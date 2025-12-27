import importlib
import pkgutil
import inspect
from util.registry import COMMANDS

def load_command_modules():
    import commands
    print("Loading command modules...")
    print("")
    for _, module_name, _ in pkgutil.iter_modules(commands.__path__):
        if module_name.startswith("_"):
            continue
        importlib.import_module(f"commands.{module_name}")
        print(f"Importing module {module_name}")
        try:
            importlib.import_module(f"commands.{module_name}")
            print(f"Successfully imported module {module_name}")
            print("")
        except Exception as e:
            print(f"Failed to import module {module_name}: {e}")



def main():
    greet = """
    JB-X Command Line Interface
    Type 'help' for a list of commands.
    Type '<command> --help' for usage.
    Type 'exit' to quit.

    """
    print(greet)
    load_command_modules()
    while True:
        raw = input("> ").strip()
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
        required_params = [
        p for p in params
        if p.default is inspect._empty]
        provided = len(args)
        missing = required_params[provided:]
        for param in missing:
            value = input(f"{param.name}: ").strip()
            args.append(value)
        try:
            func(*args)
        except TypeError as e:
            print(f"Argument error: {e}")
            if cmd.get("usage"):
                print(f"Usage: {cmd['usage']}")
        except Exception as e:
            print(f"Error executing command '{cmd_name}': {e}")

if __name__ == "__main__":
    main()
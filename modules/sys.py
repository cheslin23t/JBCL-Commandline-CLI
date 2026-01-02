from util.registry import command
import sys
@command("quit", "Quit the application", "quit", ["q", "exit"])
def quit_command(flags=None):
    flags = flags or []
    if "--force" in flags:
        print("Quitting the application...")
        sys.exit(0)
        return
    i = input("Are you sure you want to quit? (y/N): ")
    if i.lower() == "y":
        print("Quitting the application...")
        sys.exit(0)
    else:
        print("Quit cancelled.")

@command("help", "Show help information", "help [command]", ["h", "?"])
def help_command(command_name=None):
    print("")
    from util.registry import COMMANDS
    from util.updater import REPO_NAME, REPO_OWNER
    from util.version import __version__, __production__
    greet1 = f"""
JBCL Command Line Interface v{__version__} ({"Development" if not __production__ else "Production"} Build)
    {f"You are running a development build. Please report any issues you encounter: https://github.com/{REPO_OWNER}/{REPO_NAME}/issues" if not __production__ else ""}"""
    if command_name:
        cmd = COMMANDS.get(command_name)
        if not cmd:
            print(f"No such command: {command_name}")
            return
        print(f"Help for command '{command_name}':")
        print(f"Description: {cmd['description']}")
        print(f"Usage: {cmd['usage']}")
        if cmd.get("aliases"):
            print(f"Aliases: {', '.join(cmd['aliases'])}")
        
    else:
        print(greet1 + "\n")
        print("Available commands:")
        listed = set()
        for name, cmd in COMMANDS.items():
            if cmd['name'] in listed:
                continue
            listed.add(cmd['name'])
            print(f"- {cmd['name']}: {cmd['description']}. Usage: {cmd['usage']}. Aliases: {', '.join(cmd.get('aliases', []))}")
    print("")


@command(name="math", description="Evaluates a mathematical expression", usage="math <expression> (e.g. math 5 + 5 or math sqrt(144))", aliases=["calc", "m", "eval"])
def math_command(*args, flags=None):
    import math
    SAFE_MATH = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
    SAFE_MATH["abs"] = abs
    SAFE_MATH["round"] = round
    SAFE_MATH["min"] = min
    SAFE_MATH["max"] = max
    # Join arguments back into a single string (e.g., "5", "+", "5" -> "5 + 5")
    expression = " ".join(args)

    try:
        # Evaluate the string using only the safe math dictionary
        # {"__builtins__": None} prevents access to dangerous functions like open(), __import__, etc.
        result = eval(expression, {"__builtins__": None}, SAFE_MATH)
        
        # Format the result to look nice (remove .0 if it's an integer)
        if isinstance(result, float) and result.is_integer():
            result = int(result)
            
        print(f"{expression} = {result}")

    except SyntaxError:
        print(f"Invalid syntax: '{expression}'")
    except NameError as e:
        print(f"Unknown function or variable: {e}")
        print("Tip: You can use standard math functions like sqrt, sin, cos, tan, log, pi, e, etc.")
    except ZeroDivisionError:
        print("Error: Division by zero is impossible.")
    except Exception as e:
        print(f"Error calculating '{expression}': {e}")
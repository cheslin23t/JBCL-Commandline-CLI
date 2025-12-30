from util.registry import command

@command("quit", "Quit the application", "quit", ["q", "exit"])
def quit_command(flags=None):
    flags = flags or []
    if "--force" in flags:
        print("Quitting the application...")
        exit()
        return
    i = input("Are you sure you want to quit? (y/N): ")
    if i.lower() == "y":
        print("Quitting the application...")
        exit()
    else:
        print("Quit cancelled.")

@command("help", "Show help information", "help [command]", ["h", "?"])
def help_command(command_name=None):
    print("")
    from util.registry import COMMANDS
    if command_name:
        cmd = COMMANDS.get(command_name)
        if not cmd:
            print(f"No such command: {command_name}")
            return
        print(f"Help for command '{command_name}':")
        print(f"Description: {cmd['description']}")
        print(f"Usage: {cmd['usage']}")
    else:
        print("Available commands:")
        listed = set()
        for name, cmd in COMMANDS.items():
            if cmd['name'] in listed:
                continue
            listed.add(cmd['name'])
            print(f"- {cmd['name']}: {cmd['description']}")
    print("")
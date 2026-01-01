import functools

# COMMANDS maps command/alias -> command metadata
# {
#   "name_or_alias": {
#       "func": callable,
#       "description": str,
#       "usage": str,
#       "name": str
#   }
# }
COMMANDS = {}

def command(name, description, usage, aliases=None):
    if aliases is None:
        aliases = []

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        metadata = {
            "func": wrapper,
            "description": description,
            "usage": usage,
            "name": name,
            "aliases": aliases
        }

        COMMANDS[name] = metadata
        for alias in aliases:
            COMMANDS[alias] = metadata

        return wrapper

    return decorator
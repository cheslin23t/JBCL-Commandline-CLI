from util.registry import command
import requests
@command("value", "Shows the value of item(s)", "value <name...>", ["v", "val", "item", "it", "itm"])
def values(*names):

    for name in names:
        print(f"\n=== {name} ===")
        item = requests.get(
            "https://api.jailbreakchangelogs.xyz/items/get",
            params={"name": name},
        )

        if item.status_code != 200:
            print(f"Error fetching item '{name}': {item.status_code}")
            continue

        item_data = item.json()

        if not isinstance(item_data, list) or len(item_data) == 0:
            print("No items found.")
            continue

        # If exactly one match, select it automatically
        if len(item_data) == 1:
            selected = item_data[0]
        else:
            print("Multiple items found:")
            for i, entry in enumerate(item_data, start=1):
                print(f"{i}. {entry['name']} ({entry['type']})")

            while True:
                choice = input("Select an item by number: ").strip()
                if not choice.isdigit():
                    print("Please enter a valid number.")
                    continue
                idx = int(choice) - 1
                if 0 <= idx < len(item_data):
                    selected = item_data[idx]
                    break
                else:
                    print("Selection out of range.")

        print("Name:", selected.get("name", "N/A"))
        print("Type:", selected.get("type", "N/A"))
        print("Cash Value:", selected.get("cash_value", "N/A"))
        print("Duped Value:", selected.get("duped_value", "N/A"))
        print("Demand:", selected.get("demand", "N/A"))
        print("Trend:", selected.get("trend", "N/A"))

        notes = selected.get("notes")
        if notes and notes != "N/A":
            print("Notes:", notes)

@command("dupe", "Reveals whether an item is a dupe", "dupe <username...>", ["du", "d"])
def item(*usernames):
    import time

    total_dupes = []
    for username in usernames:
        print(f"\n=== {username} ===")
        user_id = None

        if not username.isdecimal():
            print(f"Fetching user ID...")
            response = requests.post(
                "https://inventories.jailbreakchangelogs.xyz/proxy/users",
                json={"usernames": [username], "excludeBannedUser": True},
            )
            if response.status_code != 200:
                print(f"Error fetching user ID for {username}: {response.status_code}")
                continue

            data = response.json()
            if not data.get("data"):
                print(f"User not found: {username}")
                continue

            user_id = str(data["data"][0]["id"])
        else:
            user_id = username
        print(f"User ID: {user_id}")
        response = requests.get(
            "https://inventories.jailbreakchangelogs.xyz/users/dupes",
            params={"id": user_id},
        )
        
        if response.status_code == 404:
            print("No dupes found. (Clean)")
            time.sleep(0.5)
            continue
        if response.status_code != 200:
            print(f"Error fetching dupes for {username}: {response.status_code}")
            continue

        dupes = response.json()

        
        total_dupes.append(f"{username} {f'({user_id})' if user_id != username else ''}")
        print(f"=== Duped Items for {username} {f'({user_id})' if user_id != username else ''} ===")
        for i, dupe in enumerate(dupes, start=1):
            title = dupe.get("title", "Unknown")
            ratio = dupe.get("dupe_ratio", "N/A")
            times_traded = dupe.get("timesTraded", "N/A")
            print(f"{i}. {title}")
            print(f"   Dupe Ratio: {ratio}")
            print(f"   Times Traded: {times_traded}")

        time.sleep(0.5)
    
    
    print("\nSummary of users with dupes:")
    if len(total_dupes) == 0:
        print("No dupes found for any users.")
        return
    for entry in total_dupes:
        print(f"- {entry}")
@command("inventory", "Shows the inventory of a user.", "inventory <user>", ["inv", "in"])
def inv(user):
    print(f"Example {user}")

@command("trade", "Interactively evaluate a trade between you and another user.", "trade", ["tr", "calculate", "calc", "c", "t"])
def trade():
    import time

    def parse_value(value_str):
        if value_str in (None, "", "N/A"):
            return None
        value_str = value_str.lower().replace(",", "").strip()
        try:
            if value_str.endswith("k"):
                return float(value_str[:-1]) * 1_000
            elif value_str.endswith("m"):
                return float(value_str[:-1]) * 1_000_000
            else:
                return float(value_str)
        except:
            return None

    def format_value(num):
        if num >= 1_000_000:
            return f"{num/1_000_000:.2f}M"
        elif num >= 1_000:
            return f"{num/1_000:.1f}K"
        else:
            return str(int(num))

    def fetch_item_data(name):
        try:
            resp = requests.get(
                "https://api.jailbreakchangelogs.xyz/items/get",
                params={"name": name},
            )
            if resp.status_code != 200:
                print(f"Error fetching item '{name}': {resp.status_code}")
                return None
            data = resp.json()
            if not isinstance(data, list) or len(data) == 0:
                print(f"No items found for '{name}'.")
                return None
            if len(data) == 1:
                return data[0]
            else:
                print(f"Multiple items found for '{name}':")
                for i, entry in enumerate(data, start=1):
                    print(f"{i}. {entry['name']} ({entry['type']})")
                while True:
                    choice = input("Select an item by number: ").strip()
                    if not choice.isdigit():
                        print("Please enter a valid number.")
                        continue
                    idx = int(choice) - 1
                    if 0 <= idx < len(data):
                        return data[idx]
                    else:
                        print("Selection out of range.")
        except Exception as e:
            print(f"Error fetching item '{name}': {e}")
            return None

    def fetch_dupes_for_user(username):
        if username.isdecimal():
            user_id = username
        else:
            print(f"Fetching user ID for {username}...")
            resp = requests.post(
                "https://inventories.jailbreakchangelogs.xyz/proxy/users",
                json={"usernames": [username], "excludeBannedUser": True},
            )
            if resp.status_code != 200:
                print(f"Error fetching user ID for {username}: {resp.status_code}")
                return None
            data = resp.json()
            if not data.get("data"):
                print(f"User not found: {username}")
                return None
            user_id = str(data["data"][0]["id"])
        print(f"User ID: {user_id}")
        resp = requests.get(
            "https://inventories.jailbreakchangelogs.xyz/users/dupes",
            params={"id": user_id},
        )
        if resp.status_code == 404:
            return []
        if resp.status_code != 200:
            print(f"Error fetching dupes for {username}: {resp.status_code}")
            return None
        return resp.json()

    def is_item_duped(title, dupes_list):
        for dupe in dupes_list:
            if dupe.get("title", "").lower() == title.lower():
                return True
        return False

    def input_items(side_name):
        print(f"\nEnter items for {side_name} side. Input empty line when done.")
        items = []
        while True:
            line = input(": ").strip()
            if line == "":
                break
            # Parse input
            # Formats:
            # d jav -> duped item
            # c torp -> clean item
            # jav@username -> fetch duped info for that username
            duped_flag = None
            username_for_dupes = None
            item_name = None
            parts = line.split()
            if len(parts) == 2 and parts[0].lower() in ("d", "c"):
                duped_flag = parts[0].lower() == "d"
                item_name = parts[1]
            elif "@" in line:
                item_name, username_for_dupes = line.split("@", 1)
            else:
                duped_flag = False
                item_name = line

            # Fetch item and determine duped status
            if username_for_dupes:
                dupes = fetch_dupes_for_user(username_for_dupes)
                if dupes is None:
                    print(f"Could not fetch dupes for user '{username_for_dupes}'. Skipping item.")
                    continue
                selected_item = fetch_item_data(item_name)
                if not selected_item:
                    continue
                is_duped = is_item_duped(selected_item.get("name", ""), dupes)
            else:
                selected_item = fetch_item_data(item_name)
                if not selected_item:
                    continue
                is_duped = duped_flag

            # Confirm addition
            while True:
                confirm = input(f"Add '{selected_item.get('name', '')}' - {'Duped' if is_duped else 'Clean'}? (y/n): ").strip().lower()
                if confirm in ("y", "yes"):
                    items.append({
                        "name": selected_item.get("name", ""),
                        "duped": is_duped,
                        "cash_value": parse_value(selected_item.get("cash_value")),
                        "duped_value": parse_value(selected_item.get("duped_value")),
                    })
                    print(f"Added item '{selected_item.get('name', '')}' - {'Duped' if is_duped else 'Clean'}")
                    break
                elif confirm in ("n", "no"):
                    print(f"Skipped item '{selected_item.get('name', '')}'.")
                    break
                else:
                    print("Please enter 'y' or 'n'.")
            time.sleep(0.3)  # rate limit
        return items

    print("Enter your side items:")
    your_items = input_items("your")
    print("Enter their side items:")
    their_items = input_items("their")

    def calculate_total_and_summary(items):
        total = 0
        summary = []
        for it in items:
            name = it["name"]
            duped = it["duped"]
            cash_val = it.get("cash_value")
            duped_val = it.get("duped_value")
            used_value = 0
            indicator = "(0)"

            if duped:
                if duped_val is not None:
                    used_value = duped_val
                    indicator = "(D)"
                elif cash_val is not None:
                    used_value = cash_val
                    indicator = "(C)"
            else:
                if cash_val is not None:
                    used_value = cash_val
                    indicator = "(C)"
            total += used_value
            summary.append(f"{name} {indicator} -> {format_value(used_value)}")
        return total, summary

    your_total, your_summary = calculate_total_and_summary(your_items)
    their_total, their_summary = calculate_total_and_summary(their_items)

    print("\n=== Trade Summary ===")
    print("Your side:")
    for s in your_summary:
        print(f"- {s}")
    print(f"Total: {format_value(your_total)}")

    print("\nTheir side:")
    for s in their_summary:
        print(f"- {s}")
    print(f"Total: {format_value(their_total)}")
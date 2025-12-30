from util.registry import command
import requests
@command("value", "Shows the value of an item", "value <name> [dupe]", ["v", "val", "item", "it", "itm"])
def values(name):
    item = requests.get(f"https://api.jailbreakchangelogs.xyz/items/get", params={"name": name})
    if item.status_code != 200:
        print(f"Error fetching item: {item.status_code}")
        return
    item_data = item.json()
    # If multiple items are returned, prompt the user to select one
    if not isinstance(item_data, list) or len(item_data) == 0:
        print("No items found.")
        return

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

    # Display selected item data (focused fields)
    print("\n=== Item Details ===")
    print(f"Name: {selected.get('name', 'N/A')}")
    print(f"Type: {selected.get('type', 'N/A')}")
    print(f"Cash Value: {selected.get('cash_value', 'N/A')}")
    print(f"Duped Value: {selected.get('duped_value', 'N/A')}")
    print(f"Demand: {selected.get('demand', 'N/A')}")
    print(f"Trend: {selected.get('trend', 'N/A')}")

    notes = selected.get('notes')
    if notes and notes != 'N/A':
        print(f"Notes: {notes}")

    # Display metadata separately if present
    # if "metadata" in selected and isinstance(selected["metadata"], dict):
    #     print("\n--- Metadata ---")
    #     for key, value in selected["metadata"].items():
    #         print(f"{key}: {value}")
@command("dupe", "Reveals whether an item is a dupe", "dupe <username...>", ["du", "d"])
def item(*usernames):
    import time

    if not usernames:
        print("Please provide at least one username or user ID.")
        return
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
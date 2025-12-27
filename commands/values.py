from util.registry import command
import requests
@command("value", "Shows the value of an item", "value <name> [dupe]", ["v", "val"])
def values(name, dupe=1):
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
@command("item", "Shows the item details", "item <name>", ["it", "itm"])
def item(name):
    print(f"Item command executed with name={name}")
@command("inventory", "Shows the inventory of a user.", "inventory <user>", ["inv", "in"])
def inv(user):
    print(f"Example {user}")
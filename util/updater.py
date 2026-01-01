import requests
import webbrowser
import os
from packaging import version
from util.version import __version__ as current_version, __production__
import dotenv
dotenv.load_dotenv()

REPO_OWNER = os.getenv("REPO_OWNER", default="cheslin23t")
REPO_NAME = os.getenv("REPO_NAME", default="JBCL-Commandline-CLI")
GITHUB_API_URL = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/latest"

def check_for_updates():
    """
    Checks for updates and notifies the user.
    Returns True if an update is available, False otherwise.
    """
    try:
        print(f"Checking for updates ({'Production' if __production__ else 'Development'})...")
        if __production__:
            # FETCH LATEST STABLE
            url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/latest"
            response = requests.get(url, timeout=2)
            if response.status_code != 200:
                return False
            data = response.json() # returns a dictionary
        else:
            # FETCH LATEST INCLUDING PRE-RELEASES
            # We fetch the list of releases (per_page=1 gives us just the newest one)
            url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases?per_page=1"
            response = requests.get(url, timeout=2)
            if response.status_code != 200:
                return False
            data_list = response.json() # returns a list
            if not data_list:
                return False
            data = data_list[0] # Take the first (newest) item

        latest_tag = data.get("tag_name", "0.0.0")
        html_url = data.get("html_url", "")
        is_prerelease = data.get("prerelease", False)
        
        # Strip 'v' if present (e.g. v1.0.0 -> 1.0.0)
        clean_latest = latest_tag.lstrip("v")
        
        if version.parse(clean_latest) > version.parse(current_version):
            release_type = "PRE-RELEASE" if is_prerelease else "UPDATE"
            
            print("\n" + "="*50)
            print(f"{release_type} Available: {latest_tag}")
            print(f"   Current version: v{current_version}")
            print("="*50)
            
            choice = input("   Would you like to download it now? (y/n): ").strip().lower()
            if choice == 'y':
                print(f"   Opening {html_url}...")
                webbrowser.open(html_url)
            print("\n")
            return True
        print(f"On latest version. (v{current_version})\n")
            
    except Exception as e:
        # Silently fail if no internet or API error (don't crash the app)
        if __production__ == False:
            print(f"Update check failed: {e}")
        return False
    return True  # No update available
# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_submodules

# 1. SETUP PATH
# We must explicitly add the current directory to sys.path so PyInstaller
# can find and import the 'modules' package to analyze it.
sys.path.insert(0, os.path.abspath('.'))

# 2. AUTOMATIC DETECTION
# This helper function scans the 'modules' folder for all .py files.
# It returns a list like ['modules.values', 'modules.cmd', ...].
# By passing this list to 'hiddenimports' below, we force PyInstaller
# to analyze every single command file. When it analyzes 'values.py',
# it will SEE 'import requests' and automatically include the requests library.
hidden_imports = collect_submodules('modules') + ['packaging']
a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('modules', 'modules')],  # Keep physical files for pkgutil
    hiddenimports=hidden_imports,      # <--- This is where the magic happens
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='jb-x',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
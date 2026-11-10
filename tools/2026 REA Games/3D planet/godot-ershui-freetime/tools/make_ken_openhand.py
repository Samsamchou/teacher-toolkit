# -*- coding: utf-8 -*-
"""Ken 張開的右手 → assets/models/ken_openhand.glb（舊入口，實際做法在 tools/make_openhand.py）

執行：python -I tools/make_ken_openhand.py   （等於 python -I tools/make_openhand.py ken）
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_openhand import *  # noqa: F401,F403  舊程式 import 這個檔時還拿得到同樣的函式
from make_openhand import main

if __name__ == "__main__":
    sys.exit(main("ken"))

import sys
import os
import pytest

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["USE_IN_MEMORY_DRAFT_STORE"] = "1"
os.environ["AI_ENABLE_LR_CREATION"] = "true"
os.environ["AI_ENABLE_JOB_CREATION"] = "true"
os.environ["AI_ENABLE_HC_CREATION"] = "true"

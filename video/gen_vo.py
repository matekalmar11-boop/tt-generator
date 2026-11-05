import subprocess, sys, os
from timeline import *
os.makedirs(WORK + "/vo", exist_ok=True)
for i, de, en, ls, gap in SEGS:
    subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "-c", VOICE + ".json", "-f", vo_path(i),
        "--length-scale", str(ls), "--noise-scale", "0.6", "--noise-w-scale", "0.75", "--volume", "0.7", "--sentence-silence", "0.12", "--", de],
        check=True, capture_output=True)

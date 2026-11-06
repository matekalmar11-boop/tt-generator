"""Baut eine komplette Episode: Stimme -> Sync-Prüfung -> Ton -> Bilder/MP4 -> Kontrollbilder.

    python3 make_episode.py episodes/red.json
Ergebnis: out/<id>/<id>.mp4  (+ Kopie in output/)
"""
import json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(*args):
    print("$", " ".join(args), flush=True)
    subprocess.run([sys.executable, *args], cwd=HERE, check=True)


def main(ep):
    eid = json.load(open(os.path.join(HERE, ep)))["id"]
    out = os.path.join(HERE, "out", eid)
    run("fc_voice.py", ep)
    run("check_sync.py", out)                       # bricht ab, wenn Wortzeiten > 25 ms neben der Stimme liegen
    run("fc_audio.py", ep)
    run("fc_render.py", ep, "--video")
    os.makedirs(os.path.join(HERE, "output"), exist_ok=True)
    shutil.copy(os.path.join(out, f"{eid}.mp4"), os.path.join(HERE, "output", f"{eid}.mp4"))
    print("fertig:", os.path.join(HERE, "output", f"{eid}.mp4"))


if __name__ == "__main__":
    main(sys.argv[1])

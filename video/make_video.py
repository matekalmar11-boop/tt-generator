"""Rendert alle Bilder (12 fps Stop-Motion, jedes Bild 2x -> 24 fps), mischt den Ton und erzeugt das fertige MP4."""
import subprocess, sys, time, math
import multiprocessing as mp
import numpy as np
import render as R
from render import *

OUT = sys.argv[1]
AUDIO = sys.argv[2]
NF = int(math.ceil(TOTAL * FPS))


def work(f):
    return render(f).tobytes()


if __name__ == "__main__":
    t0 = time.time()
    # Caches vorwärmen (wird per fork an die Worker vererbt)
    for k, (st, _) in enumerate(SCENES):
        for dt in (0.3, 1.5, 3.0):
            tt_ = st + dt
            if tt_ < TOTAL:
                R.scene_frame(k, tt_, int(tt_ * FPS))
    render(int(55 * FPS)); render(int(20.4 * FPS))
    print("warm", round(time.time() - t0, 1), flush=True)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "24", "-i", "-",
           "-i", AUDIO, "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-maxrate", "9M", "-bufsize", "18M", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", "24",
           "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-15:TP=-1.5:LRA=9,apad", "-t", f"{TOTAL:.3f}",
           "-movflags", "+faststart", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with mp.get_context("fork").Pool(4) as pool:
        for i, buf in enumerate(pool.imap(work, range(NF), chunksize=2)):
            p.stdin.write(buf); p.stdin.write(buf)
            if i % 60 == 0:
                print(i, NF, round(time.time() - t0, 1), flush=True)
    p.stdin.close(); p.wait()
    print("done", round(time.time() - t0, 1))

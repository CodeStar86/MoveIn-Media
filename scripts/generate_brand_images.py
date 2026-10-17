from pathlib import Path
import cairosvg
from PIL import Image

public = Path(__file__).resolve().parent.parent / "public"
cairosvg.svg2png(url=str(public / "social-logo.svg"), write_to=str(public / "social-logo.png"), output_width=1200, output_height=630)
cairosvg.svg2png(url=str(public / "favicon.svg"), write_to=str(public / "favicon-source.png"), output_width=512, output_height=512)
source = Image.open(public / "favicon-source.png").convert("RGBA")
for size, filename in [(32, "favicon-32x32.png"), (180, "apple-touch-icon.png"), (192, "android-chrome-192x192.png"), (512, "android-chrome-512x512.png")]:
    source.resize((size, size), Image.Resampling.LANCZOS).save(public / filename, optimize=True)
source.save(public / "favicon.ico", format="ICO", sizes=[(16,16),(32,32),(48,48)])
(public / "favicon-source.png").unlink()

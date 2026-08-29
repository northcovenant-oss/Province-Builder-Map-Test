# Land Claim Map

An interactive map that lets community members claim up to 20 provinces
and generate a land bio based on their selection. Includes toggleable
Provinces / Economic Output / Climate / Terrain layers.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | All styling, including the three themes |
| `data.js` | Province geometry, economic and climate data |
| `map.js` | Map rendering, selection, zoom/pan, layer switching |
| `landbio.js` | Land bio generation — edit this to change wording/logic |
| `theme.js` | Appearance dropdown — switches and persists the color theme |

## Running locally

No build step — just serve the folder (e.g. `python3 -m http.server`) and
open `index.html`. Opening the file directly (`file://`) also works in most
browsers.

## License

This project uses split licensing:

- **Code** (`index.html`, `style.css`, `map.js`, `landbio.js`, and the
  general structure of `data.js`) is MIT licensed — see [LICENSE](LICENSE).
- **World content** (the specific province data in `data.js`, the source
  map/climate files, and any related lore) is all rights reserved — see
  [NOTICE](NOTICE).

If you're building a similar tool for your own setting, keep the code and
swap in your own `data.js` and source map files.

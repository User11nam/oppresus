# Oppressus

An interactive 2D simulation of **Oppressus**, a civilization built on an ice-free Antarctica, made for a World History class presentation. It runs in any modern web browser with no installation, and can be published for free on GitHub Pages.

## Opening it

Double-click **`index.html`**. It opens in your web browser (Chrome, Edge or Firefox recommended).

- It works without an internet connection. With internet, it also loads its fonts from Google Fonts; offline it uses similar built-in fonts.
- Your settings (text size, theme and so on) are remembered by your browser.

## The four views

| Tab | What it shows |
|---|---|
| **1 · Terra** | The land as a modern atlas: terrain, elevation, real geographic features, every district, place and town. Overlays show the **Defenses** (mountain coasts and the watchtower line) and the **Vulnerabilities** (flat shores where ships could land). |
| **2 · Civitas** | The civilization: districts and their rulers, populations that change year by year, Royal Zones, trade routes, the **social pyramid**, the **succession of Cilla**, and **citizen family trees**. Press Play to watch the future: the Austral War, the draft and the Great Collapse. |
| **3 · Historia** | A height map and timeline from today's frozen Antarctica, through the oil rush, the melt and the rising land, to the founding of Oppressus and the present. Roll the mouse wheel over the timeline to zoom in on it. |
| **4 · Fabulae** | A storybook map with 33 stories: the lore and folklore of every district, plus myths, creature tales and funny historical records. Use the Story List to jump to any story. |

**Presentation Mode** (the ▶ button at the top right) plays a hands-free tour of about six minutes: Historia, then Civitas, then a tour of the stories. Space pauses, the arrow keys (or a presentation clicker) skip forward and back, and Esc stops.

**Settings** (the gear button, or press `?`) has text size, a light theme for bright rooms, color-vision filters, high contrast, reduced motion, plain fonts and a list of keyboard shortcuts.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `1` `2` `3` `4` | Switch between Terra, Civitas, Historia and Fabulae |
| `+` `−` `0` | Zoom in, zoom out, show the whole map |
| Arrow keys | Move the map |
| `Space` | Play or pause (Historia, Civitas, Presentation Mode) |
| `[` `]` | Previous or next chapter (Historia) · one more year (Civitas) |
| `Esc` | Close the information panel |
| `?` | Settings and shortcuts |

## Putting it on GitHub Pages

GitHub Pages hosts the project as a free website, at an address like `https://your-username.github.io/oppressus/`. On a free GitHub account the repository must be **public**.

### Option A: upload files in the browser (no command line)

1. Sign in at [github.com](https://github.com) (or create a free account).
2. Click **+** (top right) → **New repository**. Name it `oppressus`, choose **Public**, and click **Create repository**.
3. On the new repository's page, click **uploading an existing file**.
4. Drag in everything from this folder: `index.html`, `README.md`, and the `css`, `js`, `assets` and `tools` folders. (Skip `.git` and `.claude` if you can see them.)
5. Click **Commit changes**.
6. Go to **Settings** → **Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose the **main** branch and the **/ (root)** folder, and click **Save**.
7. Wait a minute or two, then refresh the Pages settings page. Your site's address appears at the top. Open it to check that everything works.

### Option B: with git (this folder is already a git repository)

1. Create an **empty** public repository on GitHub named `oppressus` (don't add a README).
2. In a terminal in this folder, run these commands, replacing `your-username`:

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/your-username/oppressus.git
```

```bash
git push -u origin main
```

3. Turn on Pages as in step 6 of Option A.

After that, whenever you change something, run `git add -A`, then `git commit -m "describe your change"`, then `git push`, and the website updates within a minute or two.

## Editing the content

Almost everything you might want to change is in **`js/data.js`**, with comments explaining each part:

| Section | What it holds |
|---|---|
| `districts` | Names, colors, rulers, populations, descriptions, facts and locations |
| `places`, `towns` | Every place and town on the map, with its population |
| `society` | Social classes, laws, justice, military, religion, language, money and economy, the Supreme Advisors |
| `succession` | The Supreme Leaders (vessels of Cilla) |
| `history` | The Historia chapters, captions and timeline events |
| `stories` | All the Fabulae stories |
| `future` | The scripted future in the Civitas simulation (the war, the collapse) |
| `families` | The citizen families' surnames, trades and name lists |
| `trade` | The trade routes of the economy overlay |
| `presentation` | Which stories the tour visits, the captions, and how long each slide stays up |

**Positions** (`pos`, `label`, `at`) are pixel coordinates on `assets/district_map.png` (2250 × 1955). Open the image in Paint: the bottom bar shows the coordinates of the pixel under your mouse.

Anything marked `invented: true` was made up for the simulation rather than taken from `districts.md` or `oppressus.md`.

### Optional tools (only needed for big changes)

These need [Node.js](https://nodejs.org/). Run them from this folder:

- **New map image:** replace `assets/district_map.png`, then run the two commands below. They trace the coastline, mountains and red district outlines into `js/terrain-data.js`.

```bash
powershell -ExecutionPolicy Bypass -File tools/dump-pixels.ps1
```

```bash
node tools/build-terrain.js
```

- **New towns:** `node tools/generate-towns.js` regenerates the smaller towns. This **replaces** all the towns in `data.js`, including any names you have edited.
- **Local test server:** `node tools/serve.js`, then open http://localhost:8080. This is optional; double-clicking `index.html` works too.

## Files

```
index.html            the page
css/style.css         all the styling, including the light and dark themes
js/data.js            ALL the content (edit this one)
js/terrain-data.js    the map's elevation and districts (generated by tools/build-terrain.js)
js/map.js             the shared map: zoom and pan, coastlines, labels, icons
js/land.js            Terra
js/civilization.js    Civitas: simulation, social pyramid, succession, families, trade
js/history.js         Historia: the ice, sea-level and rebound model, and the timeline
js/lore.js            Fabulae
js/ui.js              tabs, panels, settings, Presentation Mode
assets/district_map.png   the original hand-drawn district map
tools/                the map and town generators and a small test server
```

## Credits and sources

- Concept, civilization, districts and lore: from `oppressus.md`, `districts.md` and the district map.
- Fonts: Cinzel, IM Fell English and Source Sans 3 from Google Fonts.
- Real-world facts used in Historia: the Antarctic Treaty (1959); the Madrid Protocol's mining ban and its first review date (2048); about 58 m of sea-level rise if all Antarctic ice melted; IPCC projections of 0.3–1 m of sea-level rise by 2100; the expected recovery of the Antarctic ozone hole around 2066; the Thwaites Glacier (about 65 cm of potential sea-level rise); the collapse of the Larsen B ice shelf (2002); Antarctica's two native flowering plants; and the real research stations McMurdo, Amundsen–Scott, Vostok, Mirny, Zhongshan, Kunlun and Rothera.
- Antarctic mineral deposits (for Sovalus): [World Ocean Review](https://worldoceanreview.com/en/mineral-resources-beneath-the-antarctic-ice/), [U.S. Office of Technology Assessment, *Polar Prospects* (1989)](https://www.princeton.edu/~ota/disk1/1989/8926/892606.PDF).
- Color-vision filters: daltonization using the simulation matrices of Machado, Oliveira and Fernandes (2009).
- The melt, the rebound and the future are sped up and simplified to fit a story.

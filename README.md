# Atlas of Accountability: Interactive FEMA Disaster & Representation Map

[Live preview: Kentucky Atlas of Accountability](https://rebuildbydesign.github.io/kentucky-atlas/)

## Mission & Objective

Atlas of Accountability makes disaster risk and government response visible and accessible to everyone. This interactive platform empowers residents, advocates, and policymakers to:

- Understand the history of FEMA disaster declarations at the county level (2011–2024)
- See how federal investments are distributed after disasters
- Identify their state and federal elected representatives
- Advocate for infrastructure improvements and equitable recovery in their communities

The tool can be easily adapted to any state in the U.S. by providing local data.

---

## Features

- Interactive county map showing major FEMA disaster declarations (choropleth)
- Search any address or place using Mapbox Geocoder
- Click counties to view disaster data and elected officials
- Custom legend, tooltips, and high-level findings panel
- Responsive layout (desktop & mobile)
- Easily adaptable for any state by swapping out GeoJSON data

---

## Quickstart

1. **Clone or download this repository.**
2. **Add your **[**Mapbox Access Token**](https://account.mapbox.com/access-tokens/)** in ****\`\`****.**
3. **Open ****\`\`**** in your browser.**\
   (For best results, use a local web server like VS Code [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer))

---

## Preparing GeoJSON Data for a New State (e.g., Massachusetts)

To adapt this map for any state, you need **four GeoJSON files** in the `/data` directory:

- `[STATE]_FEMA_County.json`
- `[STATE]_Congress.json`
- `[STATE]_House.json`
- `[STATE]_Senate.json`

### Step 1: County Boundaries + FEMA Data

1. **Download county boundaries:**

   - [Census TIGER/Line Shapefiles – Counties](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)

2. **Prepare a CSV with FEMA data:**

   - Columns: `COUNTYFP`, `NAMELSAD`, `COUNTY_DISASTER_COUNT`, `COUNTY_TOTAL_FEMA`, `COUNTY_POPULATION`, `COUNTY_PER_CAPITA`, `SVI_2022`

3. **Join CSV to county shapefile:**

   - Use [QGIS](https://qgis.org/en/site/):
     - Add county shapefile and FEMA CSV as layers.
     - Use **Vector > Data Management Tools > Join attributes by field value**.
     - Join on `COUNTYFP` field.
     - Export as **GeoJSON** (`Save Features As...` → Format: GeoJSON, CRS: `EPSG:4326`).
   - Save as:\
     `MA_FEMA_County.json`

---

### Step 2: District Boundaries

1. **Download boundaries:**

   - [Census Congressional Districts](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
   - [Census State Legislative Districts](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
   - Or your state’s official GIS portal.

2. **(Optional) Join legislator names or attributes as needed**

   - Use QGIS as above.

3. **Export each as GeoJSON:**

   - `MA_Congress.json`
   - `MA_House.json`
   - `MA_Senate.json`

---

### Step 3: Place Files and Update Code

- Place your four `.json` files in the `/data` folder.
- Update layer sources in `scripts.js` (change filenames as needed):

```js
map.addSource('massFema', {
    type: 'geojson',
    data: 'data/MA_FEMA_County.json'
});
// And update others: 'MA_Congress.json', etc.
```

- Change map center and zoom for your state in `scripts.js`:

```js
center: [-71.8, 42.1], // Massachusetts
zoom: 7.1,
```

- Update the high-level findings text and title banner in `index.html` as needed.

---

## QGIS Tips

- "Join attributes by field value" is under **Vector > Data Management Tools**.
- Export GeoJSON with CRS `EPSG:4326` for web compatibility.
- Use "Field Calculator" to create new columns for per capita calculations or other stats.

---

## Example Deployment

- [Kentucky Atlas of Accountability (Live)](https://rebuildbydesign.github.io/kentucky-atlas/)

---

## Credits

- Project developed by [Judy Huynh](https://judyhuynh.ca), Data Analyst & Project Manager for Atlas of Disaster
- [Rebuild by Design](https://rebuildbydesign.org/)
- Built with Mapbox GL JS, Turf.js, QGIS, and open FEMA/Census data.

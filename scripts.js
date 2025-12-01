mapboxgl.accessToken = 'pk.eyJ1IjoiajAwYnkiLCJhIjoiY2x1bHUzbXZnMGhuczJxcG83YXY4czJ3ayJ9.S5PZpU9VDwLMjoX_0x5FDQ';

// -------------------- GLOBALS --------------------
var currentPopup = null;
let MA_CONGRESS_GEOJSON = null;
let MA_HOUSE_GEOJSON = null;
let MA_SENATE_GEOJSON = null;


// INITIALIZE MAP
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-71.8, 42.3], // CENTERED ON MASSACHUSETTS
    zoom: 7.6,             // Good statewide view for MA
    minZoom: 6
});

// RESPONSIVE INITIAL ZOOM FOR MOBILE
if (window.innerWidth <= 700) {
    map.setZoom(6.3); // Wider frame for mobile
}



// ADD MAPBOX GEOCODER (ADDRESS SEARCH)
var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false,
    placeholder: 'Search for an address',
    flyTo: {
        zoom: 9,
        speed: 1.2,
        curve: 1
    }
});
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

// HANDLE GEOCODER SEARCH RESULTS (POPUP LOGIC)
geocoder.on('result', function (e) {
  const lngLat = e.result.center;
  const pointPx = map.project(lngLat);

  const countyFeatures = map.queryRenderedFeatures(pointPx, { layers: ['femaDisasters'] });

  const renderedDistricts = map.queryRenderedFeatures(pointPx, {
    layers: ['congressionalDistricts', 'houseDistricts', 'senateDistricts']
  });

  const districtsFromMemory = getDistrictFeaturesFromMemory(lngLat);

  const allFeatures = countyFeatures.concat(renderedDistricts, districtsFromMemory);

  if (allFeatures.length > 0) {
    const featureData = consolidateFeatureData(allFeatures);
    const popupContent = createPopupContent(featureData);

    const femaFeature = countyFeatures.find(f => f.layer && f.layer.id === 'femaDisasters');
    if (femaFeature && typeof turf !== 'undefined') {
      const centroid = turf.centroid({
        type: 'Feature',
        geometry: femaFeature.geometry,
        properties: femaFeature.properties
      }).geometry.coordinates;
      showPopup({ lng: centroid[0], lat: centroid[1] }, popupContent);
    } else {
      showPopup(lngLat, popupContent);
    }
  } else {
    showPopup(lngLat, "<div style='color:#222'>No county or district data at this location.</div>");
  }
});


// LOAD MAP AND LAYERS, SETUP TOOLTIP INTERACTION
map.on('load', function () {
    addLayers();
    handleMapClick();
    setupLayerToggles();


    // TOOLTIP FOR HOVERING OVER COUNTY
    map.on('mousemove', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['femaDisasters']
        });

        if (features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            const countyName = features[0].properties.NAMELSAD;

            tooltip.style.display = 'block';
            tooltip.style.left = e.point.x + 15 + 'px';
            tooltip.style.top = e.point.y + 15 + 'px';
            tooltip.innerHTML = `Click to learn more<br><strong>${countyName}</strong>`;
        } else {
            map.getCanvas().style.cursor = '';
            tooltip.style.display = 'none';
        }
    });
});

const tooltip = document.getElementById('map-tooltip');

// DISABLE SCROLL ZOOM INITIALLY TO PREVENT ACCIDENTAL ZOOMING
map.scrollZoom.disable();
map.on('click', () => {
    map.scrollZoom.enable();
});

// ADD ALL MAP LAYERS (FEMA, CONGRESS, HOUSE, SENATE)
function addLayers() {
    map.addSource('massachusettsFema', {
        type: 'geojson',
        data: 'data/MA_FEMA_County.json'
    });

    map.addLayer({
        'id': 'femaDisasters',
        'type': 'fill',
        'source': 'massachusettsFema',
        'paint': {
            'fill-color': [
                'match',
                ['to-number', ['get', 'COUNTY_DISASTER_COUNT'], 0],
                0, '#ffffff', 1, '#fee5d9', 2, '#fee5d9',
                3, '#fcae91', 4, '#fcae91', 5, '#fb6a4a',
                6, '#fb6a4a', 7, '#de2d26', 8, '#de2d26',
                9, '#de2d26', 10, '#a50f15', 11, '#a50f15',
                12, '#a50f15', 13, '#a50f15', 14, '#a50f15',
                15, '#a50f15', 16, '#a50f15', '#ffffff'
            ],
            'fill-outline-color': '#000000'
        }
    });

    addCongressionalLayers();
    addHouseLayers();
    addSenateLayers();
}

// ADD CONGRESSIONAL DISTRICT POLYGONS
function addCongressionalLayers() {
  fetch('data/MA_Congress.geojson')
    .then(r => r.json())
    .then(data => {
      MA_CONGRESS_GEOJSON = data;
      map.addSource('maCongress', { type: 'geojson', data });

      map.addLayer({
        id: 'congressionalDistricts',
        type: 'fill',
        source: 'maCongress',
        layout: { visibility: 'none' },
        paint: { 'fill-color': 'transparent', 'fill-opacity': 1 }
      });

      map.addLayer({
        id: 'congressionalDistrictsOutline',
        type: 'line',
        source: 'maCongress',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#000', 'line-width': 1.5 }
      });

      map.addLayer({
        id: 'congressionalLabels',
        type: 'symbol',
        source: 'maCongress',
        layout: {
          'visibility': 'none',
          'text-field': ['get', 'OFFICE_ID'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 20
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });
    });
}


// ADD STATE HOUSE DISTRICT POLYGONS
function addHouseLayers() {
  fetch('data/MA_House.json')
    .then(r => r.json())
    .then(data => {
      MA_HOUSE_GEOJSON = data;
      map.addSource('maHouse', { type: 'geojson', data });

      map.addLayer({
        id: 'houseDistricts',
        type: 'fill',
        source: 'maHouse',
        layout: { visibility: 'visible' },
        paint: { 'fill-color': 'transparent', 'fill-opacity': 1 }
      });

      map.addLayer({
        id: 'houseDistrictsOutline',
        type: 'line',
        source: 'maHouse',
        layout: { visibility: 'visible' },
        paint: { 'line-color': '#000', 'line-width': 1.5 }
      });

      map.addLayer({
        id: 'houseLabels',
        type: 'symbol',
        source: 'maHouse',
        layout: {
          'visibility': 'visible',
          'text-field': ['get', 'District'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });
    });
}


// ADD STATE SENATE DISTRICT POLYGONS
function addSenateLayers() {
  fetch('data/MA_Senate.json')
    .then(r => r.json())
    .then(data => {
      MA_SENATE_GEOJSON = data;
      map.addSource('maSenate', { type: 'geojson', data });

      map.addLayer({
        id: 'senateDistricts',
        type: 'fill',
        source: 'maSenate',
        layout: { visibility: 'none' },
        paint: { 'fill-color': 'transparent', 'fill-opacity': 1 }
      });

      map.addLayer({
        id: 'senateDistrictsOutline',
        type: 'line',
        source: 'maSenate',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#000', 'line-width': 1.5 }
      });

      map.addLayer({
        id: 'senateLabels',
        type: 'symbol',
        source: 'maSenate',
        layout: {
          'visibility': 'none',
          'text-field': ['get', 'District'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });
    });
}


// HANDLE MAP CLICK POPUP (COUNTY + DISTRICT DETAILS)
function handleMapClick() {
  map.on('click', function (e) {
    const lngLat = [e.lngLat.lng, e.lngLat.lat];

    const countyFeatures = map.queryRenderedFeatures(e.point, { layers: ['femaDisasters'] });
    const renderedDistricts = map.queryRenderedFeatures(e.point, {
      layers: ['congressionalDistricts', 'houseDistricts', 'senateDistricts']
    });

    const districtsFromMemory = getDistrictFeaturesFromMemory(lngLat);
    const allFeatures = countyFeatures.concat(renderedDistricts, districtsFromMemory);

    if (allFeatures.length > 0) {
      const featureData = consolidateFeatureData(allFeatures);
      const popupContent = createPopupContent(featureData);

      const femaFeature = countyFeatures.find(f => f.layer && f.layer.id === 'femaDisasters');
      const isMobile = window.innerWidth <= 700;

      if (femaFeature && typeof turf !== 'undefined' && !isMobile) {
        const centroid = turf.centroid({
          type: 'Feature',
          geometry: femaFeature.geometry,
          properties: femaFeature.properties
        }).geometry.coordinates;
        showPopup({ lng: centroid[0], lat: centroid[1] }, popupContent);
      } else {
        showPopup(e.lngLat, popupContent);
      }
    }
  });
}


// -------------------- TOGGLES --------------------
function setupLayerToggles() {
  document.getElementById('toggle-congress').addEventListener('change', e => {
    const v = e.target.checked ? 'visible' : 'none';
    map.setLayoutProperty('congressionalDistricts', 'visibility', v);
    map.setLayoutProperty('congressionalDistrictsOutline', 'visibility', v);
    map.setLayoutProperty('congressionalLabels', 'visibility', v);
  });

  document.getElementById('toggle-house').addEventListener('change', e => {
    const v = e.target.checked ? 'visible' : 'none';
    map.setLayoutProperty('houseDistricts', 'visibility', v);
    map.setLayoutProperty('houseDistrictsOutline', 'visibility', v);
    map.setLayoutProperty('houseLabels', 'visibility', v);
  });

  document.getElementById('toggle-senate').addEventListener('change', e => {
    const v = e.target.checked ? 'visible' : 'none';
    map.setLayoutProperty('senateDistricts', 'visibility', v);
    map.setLayoutProperty('senateDistrictsOutline', 'visibility', v);
    map.setLayoutProperty('senateLabels', 'visibility', v);
  });
}


// CONSOLIDATE ALL FEATURE DATA FROM CLICK OR SEARCH
function consolidateFeatureData(features) {
    var featureData = {
        countyName: '',
        disasters: '',
        femaObligations: '',
        countyPopulation: '',
        countyPerCapita: '',
        congressionalDist: '',
        congressRepName: '',
        houseDist: '',
        houseRepName: '',
        senateDist: '',
        senateRepName: ''
    };

    features.forEach(function (feature) {
        switch (feature.layer.id) {
            case 'femaDisasters':
                featureData.countyName = feature.properties.NAMELSAD;
                featureData.disasters = feature.properties.COUNTY_DISASTER_COUNT;
                featureData.femaObligations = feature.properties.COUNTY_TOTAL_FEMA;
                featureData.countyPopulation = feature.properties.COUNTY_POPULATION;
                featureData.countyPerCapita = feature.properties.COUNTY_PER_CAPITA;
                featureData.countySVI = feature.properties.SVI_2022;
                break;
            case 'congressionalDistricts':
                featureData.congressionalDist = feature.properties.OFFICE_ID;
                featureData.congressRepName = feature.properties.FIRSTNAME + ' ' + feature.properties.LASTNAME;
                break;

            case 'houseDistricts':
                featureData.houseDist = feature.properties.District;
                featureData.houseRepName = feature.properties.Full_Name;
                break;
            case 'senateDistricts':
                featureData.senateDist = feature.properties.District;
                featureData.senateRepName = feature.properties.Full_Name;
                break;
        }
    });

    return featureData;
}

// CREATE HTML FOR POPUP PANEL
function createPopupContent(featureData) {
    return `
      <div style="color:#222; font-family:inherit;">
        <div style="
            background: #f5e6e6; 
            color: #444;
            font-size: 0.98em;
            font-weight: 600; 
            padding: 7px 12px 7px 12px;
            margin-bottom: 1em;
            border-left: 5px solid #a50f15;
        ">
          Information for Selected Location
        </div>
        <div style="font-size:0.96em; color:#444; margin-bottom:0.9em;">
          This summary shows federally declared disaster data and elected officials for the area you selected or searched.
        </div>
        <div style="margin-bottom:0.55em;">
          <div style="font-size:1.18em; font-weight:bold; color:#a50f15; letter-spacing:0.02em;">${featureData.countyName || 'County'}</div>
        </div>
        <div style="margin-bottom:0.75em; line-height:1.55;">
            <strong>Federal Disaster Declarations:</strong> ${featureData.disasters ?? 'N/A'}<br>
            <strong>FEMA Obligations (PA+HM):</strong> ${featureData.femaObligations ? `${parseFloat(featureData.femaObligations).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` : 'N/A'}<br>
            <strong>County Population:</strong> ${featureData.countyPopulation ? parseInt(featureData.countyPopulation).toLocaleString('en-US') : 'N/A'}<br>
            <strong>Per Capita FEMA Aid:</strong> ${featureData.countyPerCapita ? `${parseFloat(featureData.countyPerCapita).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` : 'N/A'}<br>
            <strong>SVI Score:</strong> ${featureData.countySVI ?? 'N/A'}
        </div>
        <div style="border-top:1px solid #ececec; margin:1em 0 1em 0;"></div>
        <div style="font-size:1.18em; font-weight:bold; color:#a50f15; letter-spacing:0.02em;">
          Elected Officials Covering This Location
        </div>
        <ul style="list-style:none; padding:0; margin:0 0 0.9em 0;">
          <li style="margin-bottom: 3px;"><strong>U.S. Senate:</strong> Elizabeth Warren (D), Ed Markey (D)</li>
          <li style="margin-bottom: 3px;"><strong>U.S. House:</strong> ${featureData.congressRepName || 'N/A'} (${featureData.congressionalDist || 'N/A'})</li>
          <li style="margin-bottom: 3px;"><strong>State Senate:</strong> ${featureData.senateRepName || 'N/A'} (${featureData.senateDist || 'N/A'})</li>
          <li style="margin-bottom: 3px;"><strong>State House:</strong> ${featureData.houseRepName || 'N/A'} (${featureData.houseDist || 'N/A'})</li>
        </ul>
        <div style="color:gray; font-style:italic; font-size:0.85em;">
          * <a href="https://rebuildbydesign.org/atlas-of-disaster" target="_blank" style="color:gray;">Atlas of Disaster (2011–2024) by Rebuild by Design</a>
        </div>
      </div>
    `;
}

// SHOW MAPBOX POPUP WITH PROVIDED CONTENT
function showPopup(lngLat, content) {
    // CLOSE EXISTING POPUP IF IT EXISTS
    if (currentPopup) {
        currentPopup.remove();
    }
    // CREATE AND SHOW NEW POPUP, SAVE TO GLOBAL
    currentPopup = new mapboxgl.Popup()
        .setLngLat(lngLat)
        .setHTML(content)
        .addTo(map);
}

// -------------------- POINT-IN-POLYGON FIX -------------------
function getDistrictFeaturesFromMemory(lngLat) {
  const pt = turf.point(lngLat);
  const hits = [];

  function addHits(geojson, layerId) {
    if (!geojson || !geojson.features) return;
    for (const f of geojson.features) {
      if (turf.booleanPointInPolygon(pt, f)) {
        hits.push({
          type: 'Feature',
          geometry: f.geometry,
          properties: f.properties,
          layer: { id: layerId }
        });
        break;
      }
    }
  }

  addHits(MA_CONGRESS_GEOJSON, 'congressionalDistricts');
  addHits(MA_HOUSE_GEOJSON, 'houseDistricts');
  addHits(MA_SENATE_GEOJSON, 'senateDistricts');

  return hits;
}

mapboxgl.accessToken = 'pk.eyJ1IjoiajAwYnkiLCJhIjoiY2x1bHUzbXZnMGhuczJxcG83YXY4czJ3ayJ9.S5PZpU9VDwLMjoX_0x5FDQ';

// HOLDS THE CURRENTLY OPEN POPUP
var currentPopup = null;


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
    var lngLat = e.result.center;
    var point = map.project(lngLat);

    var features = map.queryRenderedFeatures(point, {
        layers: ['femaDisasters', 'congressionalDistricts', 'houseDistricts', 'senateDistricts']
    });

    if (features.length > 0) {
        var featureData = consolidateFeatureData(features);
        var popupContent = createPopupContent(featureData);

        var femaFeature = features.find(f => f.layer && f.layer.id === 'femaDisasters');
        if (femaFeature && typeof turf !== 'undefined') {
            // USE CENTROID FOR FEMA DISASTER FEATURE
            var geojsonFeature = {
                "type": "Feature",
                "geometry": femaFeature.geometry,
                "properties": femaFeature.properties
            };
            var centroid = turf.centroid(geojsonFeature).geometry.coordinates;
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
    map.addSource('kyCongress', {
        type: 'geojson',
        data: 'data/MA_Congress.json'
    });

    map.addLayer({
        'id': 'congressionalDistricts',
        'type': 'fill',
        'source': 'kyCongress',
        'paint': {
            'fill-color': 'transparent',
        }
    });
}

// ADD STATE HOUSE DISTRICT POLYGONS
function addHouseLayers() {
    map.addSource('kyHouse', {
        type: 'geojson',
        data: 'data/MA_House.json'
    });

    map.addLayer({
        'id': 'houseDistricts',
        'type': 'fill',
        'source': 'kyHouse',
        'paint': {
            'fill-color': 'transparent',
        }
    });
}

// ADD STATE SENATE DISTRICT POLYGONS
function addSenateLayers() {
    map.addSource('kySenate', {
        type: 'geojson',
        data: 'data/MA_Senate.json'
    });

    map.addLayer({
        'id': 'senateDistricts',
        'type': 'fill',
        'source': 'kySenate',
        'paint': {
            'fill-color': 'transparent',
        }
    });
}

// HANDLE MAP CLICK POPUP (COUNTY + DISTRICT DETAILS)
function handleMapClick() {
    map.on('click', function (e) {
        var features = map.queryRenderedFeatures(e.point, {
            layers: ['femaDisasters', 'congressionalDistricts', 'houseDistricts', 'senateDistricts']
        });

        if (features.length > 0) {
            var featureData = consolidateFeatureData(features);
            var popupContent = createPopupContent(featureData);

            var femaFeature = features.find(f => f.layer && f.layer.id === 'femaDisasters');
            var isMobile = window.innerWidth <= 700;

            if (femaFeature && typeof turf !== 'undefined' && !isMobile) {
                // DESKTOP: SHOW POPUP AT COUNTY CENTROID
                var geojsonFeature = {
                    "type": "Feature",
                    "geometry": femaFeature.geometry,
                    "properties": femaFeature.properties
                };
                var centroid = turf.centroid(geojsonFeature).geometry.coordinates;
                showPopup({ lng: centroid[0], lat: centroid[1] }, popupContent);
            } else {
                // MOBILE: SHOW POPUP AT CLICK LOCATION
                showPopup(e.lngLat, popupContent);
            }
        }
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
                // Insert hyphen: e.g. MA03 → MA-03
                featureData.congressionalDist = feature.properties.OFFICE_ID.slice(0, 2) + '-' + feature.properties.OFFICE_ID.slice(2);
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


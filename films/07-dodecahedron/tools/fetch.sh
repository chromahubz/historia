#!/bin/sh
# Download the source images into assets/raw (skips files already present). usage: sh tools/fetch.sh <film_dir>
set -e
R="$1/assets/raw"; mkdir -p "$R"
UA="HistoriaDocBuilder/0.1 (https://github.com/chromahubz/historia)"
get() { [ -s "$R/$1" ] || { curl -sSfL -A "$UA" -o "$R/$1" "$2" && echo "fetched $1"; }; }
LOC=https://tile.loc.gov/image-services/iiif
get loc_vitruvius1521.jpg "$LOC/public:rbc:2023rosen0804:0023/full/pct:50/0/default.jpg"
get loc_vegetius1475.jpg  "$LOC/public:rbc:2014rosen0061:0008/full/pct:60/0/default.jpg"
get loc_apicius1498.jpg   "$LOC/public:rbc:2011incun72519:0011/full/pct:80/0/default.jpg"
get met_248043.jpg "https://images.metmuseum.org/CRDImages/gr/original/LC-08_170_121b.jpg"
get met_248039.jpg "https://images.metmuseum.org/CRDImages/gr/original/LC-08_170_117a.jpg"
get met_247169.jpg "https://images.metmuseum.org/CRDImages/gr/original/DP104783.jpg"
WM=https://upload.wikimedia.org/wikipedia/commons
get wm_tongeren_4002.jpg "$WM/5/54/Pentagon-dodeca%C3%ABder_in_brons%2C_150_tot_400_NC%2C_vindplaats-_Tongeren%2C_Leopoldwal%2C_1939%2C_collectie_Gallo-Romeins_Museum_Tongeren%2C_4002.jpg"
get wm_hunt_hcm157.jpg "$WM/c/c4/Bronze_dodecahedron.jpg" || echo "warning: Hunt Museum photo not fetched (Wikimedia rate limit?)"
get wm_muchhadham.jpg "$WM/4/46/Much_Hadham_Galllo-Roman_dodecahedron.jpg" || echo "warning: Much Hadham photo not fetched (Wikimedia rate limit?)"
# v2: paintings and reliefs (The Met), satellite plates (NASA GIBS, EOX Sentinel-2 2016), borders (Natural Earth), surfaces (Poly Haven)
get met_247008.jpg "https://images.metmuseum.org/CRDImages/gr/original/DP141474.jpg"
get met_255013.jpg "https://images.metmuseum.org/CRDImages/gr/original/DP104356.jpg"
get gibs_europe.jpg "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_ShadedRelief_Bathymetry&CRS=EPSG:4326&BBOX=34,-14,62,32&WIDTH=4096&HEIGHT=3730&FORMAT=image/jpeg"
E="https://tiles.maps.eox.at/wms?service=WMS&request=GetMap&version=1.1.1&layers=s2cloudless&srs=EPSG:4326&format=image/jpeg"
get s2_england.jpg "$E&bbox=-2.0,50.8,2.0,53.0&width=4096&height=3650"
get s2_herts.jpg "$E&bbox=-0.3,51.65,0.45,52.1&width=4096&height=3980"
get s2_hadham.jpg "$E&bbox=0.02,51.83,0.13,51.895&width=2048&height=1960"
get s2_limerick.jpg "$E&bbox=-9.3,52.4,-8.1,52.95&width=4096&height=3080"
get ne_countries.geojson "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"
for t in wood_table_worn velour_velvet red_plaster_weathered farm_soil; do for m in diff nor_gl rough; do get ph_${t}_${m}.jpg "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/$t/${t}_${m}_2k.jpg"; done; done
get ph_farm_soil_disp.jpg "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/farm_soil/farm_soil_disp_2k.jpg"

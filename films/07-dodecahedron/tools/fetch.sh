#!/bin/sh
# Download the source images into assets/raw (skips files already present). usage: sh tools/fetch.sh <film_dir>
set -e
R="$1/assets/raw"; mkdir -p "$R"
UA="HistoriaDocBuilder/0.1 (https://github.com/chromahubz/historia)"
get() { [ -s "$R/$1" ] || { curl -sSfL -A "$UA" -o "$R/$1" "$2" && echo "fetched $1"; }; }
LOC=https://tile.loc.gov/image-services/iiif
get loc_vitruvius1521.jpg "$LOC/public:rbc:2023rosen0804:0011/full/pct:50/0/default.jpg"
get loc_vegetius1475.jpg  "$LOC/public:rbc:2014rosen0061:0008/full/pct:60/0/default.jpg"
get loc_apicius1498.jpg   "$LOC/public:rbc:2011incun72519:0011/full/pct:80/0/default.jpg"
get met_248043.jpg "https://images.metmuseum.org/CRDImages/gr/original/LC-08_170_121b.jpg"
get met_248039.jpg "https://images.metmuseum.org/CRDImages/gr/original/LC-08_170_117a.jpg"
get met_247169.jpg "https://images.metmuseum.org/CRDImages/gr/original/DP104783.jpg"
WM=https://upload.wikimedia.org/wikipedia/commons
get wm_tongeren_4002.jpg "$WM/5/54/Pentagon-dodeca%C3%ABder_in_brons%2C_150_tot_400_NC%2C_vindplaats-_Tongeren%2C_Leopoldwal%2C_1939%2C_collectie_Gallo-Romeins_Museum_Tongeren%2C_4002.jpg"
get wm_hunt_hcm157.jpg "$WM/c/c4/Bronze_dodecahedron.jpg" || echo "warning: Hunt Museum photo not fetched (Wikimedia rate limit?)"
get wm_muchhadham.jpg "$WM/4/46/Much_Hadham_Galllo-Roman_dodecahedron.jpg" || echo "warning: Much Hadham photo not fetched (Wikimedia rate limit?)"

# BTS Socrata API -- Comprehensive Dataset Catalog

> **Note**: This is a reference document for future project planning. It is NOT part of the current BTS TransBorder Dashboard implementation (Phases 1-4). It catalogs **all** datasets discoverable across BTS portals.

---

## Portal Directory

| Portal | URL | Focus | API Pattern |
|---|---|---|---|
| **data.bts.gov** | https://data.bts.gov/browse | BTS-specific datasets (~130 entries) | `https://data.bts.gov/resource/{ID}.json` |
| **data.transportation.gov** | https://data.transportation.gov/ | Broader DOT (BTS, NHTSA, FTA, FRA, FMCSA, PHMSA) | `https://data.transportation.gov/resource/{ID}.json` |
| **geodata.bts.gov** | https://geodata.bts.gov/ | Geospatial / NTAD (~90 datasets) | ArcGIS / WFS / GeoJSON |
| **datahub.transportation.gov** | https://datahub.transportation.gov/ | DOT data hub (mirrors + extras) | `https://datahub.transportation.gov/resource/{ID}.json` |

**API Docs**: https://dev.socrata.com/docs/endpoints.html
**App Token Registration**: https://data.bts.gov/profile/edit/developer_settings (free)
**Discovery API**: `https://data.bts.gov/api/views?limit=100&page=N` (enumerate all datasets programmatically)

**Rate Limits**:
- With app token: 1,000 requests per rolling hour
- Without token: Lower, IP-based (exact limit unpublished)
- Per-request row limit: up to 50,000 rows (API 2.0) or unlimited (API 2.1+)

---

# A. BORDER CROSSING & TRADE

## A.1 Border Crossing Datasets

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 1 | **Border Crossing Entry Data** | `keg4-3bc2` | data.bts.gov | ~407K rows, Jan 1996-2026. CBP inbound crossings at US-Canada and US-Mexico ports. Trucks, trains, containers, buses, vehicles, passengers, pedestrians. |
| 2 | Border Crossing/Entry Data (Story) | `jswi-2e7b` | data.bts.gov | Interactive story/visualization for border crossing data |
| 3 | Border Crossing Heatmap | `g4wc-3cwy` | data.bts.gov | Heatmap visualization of border crossing summary statistics |
| 4 | Border Crossings by Mode, Border, and State | `erjk-mneb` | data.bts.gov | Crossings aggregated by mode, border (north/south), and state |
| 5 | Incoming Truck Border Crossings | `wpr4-evxn` | data.bts.gov | Truck-specific inbound border crossing data |
| 6 | Inbound Truck Crossings by Border | `txk8-8akf` | data.bts.gov | Truck crossings split by Canada vs Mexico border |
| 7 | U.S.-Mexico Incoming Truck Crossings | `ybdw-ip2g` | data.bts.gov | Truck crossings entering from Mexico |
| 8 | U.S.-Canada Incoming Truck Crossings | `5mkb-pzzy` | data.bts.gov | Truck crossings entering from Canada |
| 9 | Incoming Land Border Person Crossings | `ngnw-usfw` | data.bts.gov | Inbound person crossings at land borders |
| 10 | U.S.-Mexico Incoming Person Crossings | `gwx6-wfa3` | data.bts.gov | Person crossings entering from Mexico (CBP data) |
| 11 | U.S.-Canada Incoming Person Crossings | `hjza-d5g7` | data.bts.gov | Person crossings entering from Canada (CBP data) |
| 12 | Passenger Vehicles from Canada and Mexico | `7bhf-qbbb` | data.bts.gov | Personal vehicle crossing counts |
| 13 | Vehicles Entering U.S. by Country | `btpt-uxhx` | data.bts.gov | Passenger vehicles crossing into the U.S. via Canada and Mexico |
| 14 | Total Crossings by Year and Mode | `kcax-2fht` | data.bts.gov | Aggregate crossing data by year and mode |
| 15 | Persons at Land Borders & International Airports | `xnav-e47e` | data.bts.gov | Passenger travel statistics at land borders and airports |
| 16 | Southern Border Pedestrian Crossings by Port | `2a7t-n7sy` | data.bts.gov | Pedestrian-specific crossing data at US-Mexico ports |
| 17 | MI/NY Bridge Crossings (multiple years) | `stxu-mztf`, `rzpb-s33w`, `rx5s-stiv`, `jkcu-p3pf`, `3jux-kwvh` | data.bts.gov | 11 bridges, Michigan & New York, 2009-2024 |
| 18 | Pocket Guide -- US-Mexico Ports of Entry | `tf5k-fhu2` | data.bts.gov | Summary visualization of Mexico border ports |
| 19 | Pocket Guide -- US-Canada Ports of Entry | `u6iw-gzjf` | data.bts.gov | Summary visualization of Canada border ports |
| 20 | Border Crossing/Entry Data (DOT mirror) | `jvhi-tnh4` | datahub.transportation.gov | Alternate endpoint for border crossing data |

## A.2 TransBorder Freight & Trade

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 21 | **Port and Commodity TransBorder Freight Data (YTD)** | `yrut-prtq` | data.bts.gov | **PRIMARY** -- Combined port, commodity, mode, trade value/weight. Jan 2006-present, monthly updates (~2-month lag). |
| 22 | TransBorder Freight Data (Story) | `kijm-95mr` | data.bts.gov | Interactive story/dashboard (visualization, not raw data) |
| 23 | TransBorder Freight Data Dashboard | `myhq-rm6q` | data.bts.gov | Interactive dashboard visualization |
| 24 | TransBorder Freight Data Forecast | `h73b-4dgk` | data.bts.gov | Nowcast model for TransBorder freight |
| 25 | U.S. Trade with Canada and Mexico by Mode | `mr4e-nxis` | data.bts.gov | Trade data by transportation mode |
| 26 | U.S. Trade by Coasts and Borders | `xef5-9kbb` | data.bts.gov | Trade flows by geographic entry/exit point |
| 27 | U.S. Imports and Exports Value by Year and Mode | `7mzw-a8si` | data.bts.gov | Annual trade values by mode (water, air, land), 2003-2023 |

---

# B. FREIGHT, SUPPLY CHAIN & COMMODITY FLOW

## B.1 Supply Chain & Freight Indicators

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 28 | **Supply Chain and Freight Indicators** | `y5ut-ibwt` | data.bts.gov | Interagency data on supply chain activity: ports, freight movement, labor. 2017-2026, ~24K records. |
| 29 | Freight Shipments within the U.S. by Mode | `c44g-ntqk` | data.bts.gov | Domestic freight shipments by transportation mode |
| 30 | Freight Shipments by Mode -- Value | `2y68-7azu` | data.bts.gov | Freight value by mode |
| 31 | Freight Shipments by Mode -- Ton Miles | `5us5-z4px` | data.bts.gov | Freight ton-miles by mode |
| 32 | Freight Activity (COVID era) | `75qq-qmj6` | data.bts.gov | Weekly freight activity measures during pandemic |
| 33 | Freight Facts and Figures (Story) | `45xw-qksz` | data.bts.gov | Freight transportation facts/figures visualization |
| 34 | Moving Goods in the United States | `bcyt-rqmu` | data.bts.gov | Freight Facts & Figures -- moving goods |
| 35 | International Freight Gateways | `4s7k-yxvu` | data.bts.gov | International freight gateway statistics |

## B.2 Commodity Flow Survey (CFS)

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 36 | **CFS Area File 2012-2022** | `j246-y2rf` | data.bts.gov | Geographic commodity movements with mode, industry, commodity, distance breakdowns |
| 37 | **CFS Export File 2012-2022** | `qq62-cjjy` | data.bts.gov | Exported commodities with mode, NAICS, commodity, distance, weight |
| 38 | **CFS Hazmat File 2012-2022** | `dkgi-gbeh` | data.bts.gov | Hazardous commodity movements with mode, NAICS, commodity, distance, weight |
| 39 | CFS Temperature Control File 2012-2022 | `f3sb-gw7h` | data.bts.gov | Temperature-controlled commodity movements |
| 40 | Historical CFS Data 1997-2017 | `anet-6eas` | data.bts.gov | Aggregation of historical CFS data at state level |
| 41 | Value, Tons, and Ton-Miles by State | `xg5t-c92f` | data.bts.gov | CFS value/tons/ton-miles by state origin/destination, 1997-2017 |

## B.3 Trucking & Freight Mobility

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 42 | BTS ATRI Truck Travel Times -- 2024 | `uta5-4eu5` | data.bts.gov | County-to-county freight truck travel times from GPS data |
| 43 | BTS ATRI Truck Travel Times -- 2022 | `d7b8-pmxm` | data.bts.gov | County-to-county truck travel times |
| 44 | BTS ATRI Truck Travel Times -- 2021 | `mayv-2qfz` | data.bts.gov | County-to-county truck travel times |
| 45 | BTS ATRI Truck Travel Times -- 2020 | `dggd-bg3y` | data.bts.gov | County-to-county truck travel times |
| 46 | BTS ATRI Truck Travel Times -- 2019 | `sn4k-eiea` | data.bts.gov | County-to-county truck travel times |
| 47 | BTS ATRI Truck Travel Times -- 2018 | `xx4g-5dg2` | data.bts.gov | County-to-county truck travel times (Oct-Dec 2018) |
| 48 | BTS ATRI Truck Travel Times -- 2023 | `ez58-m3b4` | data.bts.gov | County-to-county truck travel times |
| 49 | Truck Tonnage Index (SA) | `fdsx-2s48` | data.bts.gov | ATA monthly truck tonnage index, seasonally adjusted |
| 50 | Heavy Truck Sales SAAR | `n867-bmag` | data.bts.gov | Heavy trucks (>14,000 lbs GVW) sales, seasonally adjusted annual rate |
| 51 | Light Truck Sales SAAR | `kbe7-qgqu` | data.bts.gov | Light trucks (up to 14,000 lbs GVW) sales, seasonally adjusted annual rate |
| 52 | Heavy Truck Sales | `2iwc-fgn4` | data.bts.gov | Heavy truck sales data |
| 53 | Tank Car Data 2017-2021 | `gbe2-48iq` | data.bts.gov | Railroad tank car data |

## B.4 Rail Freight

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 54 | Freight Rail Traffic -- Carloads | `uyr2-7q4x` | data.bts.gov | Rail carload traffic (bulk commodities: coal, agriculture) |
| 55 | Freight Rail Traffic -- Intermodal Units | `ejmp-u4kv` | data.bts.gov | Rail intermodal traffic: containers and truck trailers on rail cars |
| 56 | Rail Freight Carloads (NSA) | `mnpx-bf56` | data.bts.gov | Rail freight carload data, not seasonally adjusted |

---

# C. AVIATION

## C.1 T-100 & Air Freight

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 57 | T-100 Preliminary Estimates | `3xj5-daif` | data.bts.gov | Preliminary T-100 air carrier traffic statistics (passengers, freight, mail) |
| 58 | AFF T-100 Segment Summary | `bu82-4pwz` | data.bts.gov | Commercial air passengers, seats, freight, mail by year |
| 59 | AFF T-100 Segment Summary By Country | `56rv-9p75` | data.bts.gov | T-100 segment data aggregated by country |
| 60 | AFF T-100 Segment Summary By Carrier | `q4tb-tbff` | data.bts.gov | Commercial air passengers, seats, freight, mail by carrier |
| 61 | International Segment Data | `y84p-xswg` | data.transportation.gov | International air segment data (DOT portal) |
| 62 | AFF -- Freight by Airport | `xb4z-t72k` | data.bts.gov | Air freight data by airport |
| 63 | AFF -- Freight by Carrier | `wqyu-573z` | data.bts.gov | Air freight data by carrier |

## C.2 Airline Performance & Passengers

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 64 | U.S. Airport On-Time Performance | `rns4-gpqn` | data.bts.gov | On-time performance data for U.S. airports |
| 65 | Carrier On-Time Performance | `56fa-sf82` | data.bts.gov | On-time performance by carrier |
| 66 | U.S. Airport Delays by Cause | `eaz9-4bny` | data.bts.gov | Airport delay data by cause |
| 67 | U.S. Major Airport Performance Rankings -- All | `hdqs-8yds` | data.bts.gov | Performance rankings for all major U.S. airports |
| 68 | U.S. Major Airport Performance Rankings -- Top 5 | `4yet-hdz3` | data.bts.gov | Top 5 performing airports |
| 69 | U.S. Major Airport Performance Rankings -- Bottom 5 | `576c-y8bu` | data.bts.gov | Bottom 5 performing airports |
| 70 | Top 10 World Airports | `778y-wrwn` | data.bts.gov | Top 10 airports worldwide by passenger traffic |
| 71 | Top 10 U.S. Airports | `n2e4-gb29` | data.bts.gov | Top 10 U.S. airports by passenger traffic |
| 72 | Commercial Aviation Departures | `bpqk-hyst` | data.bts.gov | Daily commercial aviation departures, domestic and international |
| 73 | Commercial Aviation Departures + TSA Screenings | `hvq3-38u5` | data.bts.gov | Departures with TSA screening counts |
| 74 | Airports | `kfcv-nyy3` | data.bts.gov | Airport master dataset |
| 75 | Aviation Facts and Figures (Story) | `2ub2-svfq` | data.bts.gov | Aviation statistics summary visualization |

## C.3 Air Passenger Traffic

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 76 | U.S. Air Carrier Passenger Traffic | `fvyu-s47e` | data.bts.gov | Air carrier passenger traffic volumes |
| 77 | U.S. Air Carrier Passenger Travel (SA) | `pi4b-6n97` | data.bts.gov | Seasonally adjusted air passenger data |
| 78 | U.S. Air Carrier Passenger Travel (NSA) | `brip-mkqk` | data.bts.gov | Unadjusted air passenger data |
| 79 | Air Travel -- Total (SA) | `gmwv-css9` | data.bts.gov | Seasonally adjusted total air traffic |
| 80 | Air Travel -- Domestic (SA) | `u3e6-df3v` | data.bts.gov | Seasonally adjusted domestic air traffic |
| 81 | Air Travel -- International (SA) | `dds7-ww3c` | data.bts.gov | Seasonally adjusted international air traffic |
| 82 | Air Travel -- Total (NSA) | `6vnx-7g89` | data.transportation.gov | Non-seasonally adjusted total air traffic |
| 83 | Air Travel -- International (NSA) | `rdsi-pmvz` | data.transportation.gov | Non-seasonally adjusted international air traffic |
| 84 | Air Cargo -- International | `kzni-a7vm` | data.transportation.gov | Freight and mail on international flights |
| 85 | Air Cargo -- Domestic | `u8i5-iu8e` | data.transportation.gov | Freight and mail on domestic flights |
| 86 | Passengers by Carrier | `6hrh-id4y` | data.bts.gov | Passenger counts by air carrier |
| 87 | Departures by Carrier | `8miy-4fts` | data.bts.gov | Departure counts by air carrier |
| 88 | Load Factors | `bmsm-e9d8` | data.bts.gov | Airline load factor data |

---

# D. MARITIME & WATERWAYS

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 89 | Port Data | `5rpz-kgm9` | data.bts.gov | U.S. port data |
| 90 | Monthly TEU Data | `rd72-aq8r` | data.bts.gov | Monthly container throughput (TEU) at U.S. ports |
| 91 | Top 25 Container Ports by TEU | `sn74-xpkp` | data.bts.gov | Container port rankings |
| 92 | Top 10 U.S. Water Ports by TEUs | `wd8g-xxg6` | data.bts.gov | Top 10 ports by container volume |
| 93 | Top 10 U.S. Water Ports by Short Tons | `ihdv-t9jj` | data.bts.gov | Top 10 ports by tonnage |
| 94 | Top 25 Ports by Total Tonnage (Story) | `iqfi-cuyv` | data.bts.gov | Port tonnage rankings visualization |
| 95 | Container / TEU (Story) | `x3fb-aeda` | data.bts.gov | Top 25 ports TEU rankings visualization |
| 96 | Dry Bulk Tonnage | `c7tj-sc2j` | data.bts.gov | Dry bulk tonnage data |
| 97 | Vessel Dwell Times | `abu9-jbyq` | data.bts.gov | Vessel dwell time metrics at ports |
| 98 | Containerized Imports Value/Weight by Port (2023) | `ngjm-b5rq` | data.bts.gov | Port-level containerized import data |
| 99 | Containerized Exports Value/Weight by Port (2023) | `vc8a-zq94` | data.bts.gov | Port-level containerized export data |
| 100 | Top 10 Containerized Import Commodities by Weight | `p7t5-fmvf` | data.bts.gov | Top import commodities by weight and coast |
| 101 | Top 10 Containerized Export Commodities by Value | `a5sc-aujx` | data.bts.gov | Top export commodities by value and coast |
| 102 | Containerized Exports at US Ports | `38t4-dnq3` | data.transportation.gov | Export container statistics |
| 103 | Bridge Air Draft Restrictions 2025 | `dasz-28ip` | data.bts.gov | Bridge clearance data for container ports |
| 104 | Great Lakes Seaway | `swpm-impx` | data.bts.gov | Great Lakes St. Lawrence Seaway data |
| 105 | Seaway Reliability | `6it8-mz4h` | data.bts.gov | Seaway reliability metrics |
| 106 | Cruise Ship Counts and Passengers (Top 25, 2019-2023) | `uxyn-8v2z` | data.bts.gov | Cruise vessel arrivals and passenger berthing |
| 107 | Top 25 Ports by Cruise Passenger Arrivals 2023 | `3z7h-xatu` | data.bts.gov | Cruise passenger arrivals by port |
| 108 | Ferry Vessels (Story) | `57sz-yj2t` | data.bts.gov | Ferry operations visualization |
| 109 | 2022 NCFO Operators File | `63me-zi7c` | data.bts.gov | National Census of Ferry Operators 2022 |
| 110 | 2022 NCFO Terminals and Segments | `eevn-mgvi` | data.bts.gov | Ferry terminal data 2022 |
| 111 | 2020 NCFO Operator Segment File | `ggca-ddee` | data.bts.gov | Ferry operator segments 2020 |
| 112 | 2020 NCFO Terminals File | `ca7h-i9yt` | data.bts.gov | Ferry terminals 2020 |
| 113 | 2020 NCFO Vessels File | `d2st-9nd6` | data.bts.gov | Ferry vessels 2020 |
| 114 | 2020 NCFO Segments File | `gn77-pp24` | data.bts.gov | Ferry segments 2020 |

---

# E. TRANSIT & PASSENGER TRAVEL

## E.1 Transit Ridership

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 115 | Daily Transit Ridership | `dc74-f8qd` | data.bts.gov | Daily ridership for NYC MTA, SF BART, WMATA, and other major systems |
| 116 | Transit Ridership | `wn2u-tays` | data.bts.gov | Transit ridership statistics across modes |
| 117 | Transit Ridership -- Urban Rail | `rw9i-mdin` | data.bts.gov | Heavy rail, commuter rail, light rail, streetcar, hybrid rail |
| 118 | Transit Ridership -- Fixed Route Bus | `dwrv-9qyx` | data.bts.gov | Commuter bus, motor bus, BRT, trolleybus |
| 119 | Transit Ridership -- Other Modes | `6k7a-rwnz` | data.bts.gov | Demand response, vanpool, ferryboat |
| 120 | Transit Ridership (SA) | `2tzp-83jv` | data.bts.gov | Seasonally adjusted transit ridership |
| 121 | Transit Ridership (NSA) | `gh2m-srig` | data.bts.gov | Not seasonally adjusted transit ridership |

## E.2 Rail Passenger

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 122 | Amtrak On-Time Performance | `kyzv-e9ga` | data.bts.gov | Amtrak on-time performance data |
| 123 | Amtrak Delays by Cause | `nwpu-zm57` | data.bts.gov | Amtrak delay data by cause |
| 124 | Top 10 Amtrak Stations | `vat3-i3p3` | data.bts.gov | Top 10 Amtrak stations by ridership |
| 125 | Amtrak Ridership | `4mdc-2kn7` | data.bts.gov | Amtrak ridership data |
| 126 | Intercity Rail Passengers | `n8yb-nfqs` | data.bts.gov | Intercity rail passenger data |
| 127 | Amtrak Rail Stations | `art6-ye9i` | data.transportation.gov | Amtrak station locations |

## E.3 Passenger Travel & Mobility

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 128 | Passenger Travel Facts and Figures | `pqmc-mnds` | data.bts.gov | Characteristics and trends of personal U.S. travel |
| 129 | Daily Passenger Travel | `8g57-rqa4` | data.bts.gov | Daily passenger travel statistics |

## E.4 NTD (National Transit Database) -- data.transportation.gov

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 130 | NTD Annual Data -- Service (by Agency) | `6y83-7vuw` | data.transportation.gov | Transit service data by agency |
| 131 | NTD Annual Data -- Metrics (by Agency) | `g27i-aq2u` | data.transportation.gov | Service and cost efficiency metrics |
| 132 | NTD Annual Data -- Service (by Mode) | `4fir-qbim` | data.transportation.gov | Transit service by mode |
| 133 | NTD Annual Data -- Metrics | `ekg5-frzt` | data.transportation.gov | 2022 metrics |
| 134 | NTD Annual Data -- Service (by Mode and Time Period) | `wwdp-t4re` | data.transportation.gov | Service by mode and time period |
| 135 | NTD Annual Data -- Stations (by Mode and Age) | `wfz2-eft6` | data.transportation.gov | Station data by mode and age |
| 136 | NTD Annual Data -- Vehicles (Type Count by Agency) | `nimp-626k` | data.transportation.gov | Vehicle type counts |
| 137 | NTD Annual Data -- Employees (by Mode) | `uyv8-9jek` | data.transportation.gov | Transit employees |
| 138 | NTD Annual Data -- Stations and Facilities | `aqct-knjk` | data.transportation.gov | Station and facility data |
| 139 | NTD Annual Data -- Breakdowns | `amkt-4ehs` | data.transportation.gov | Mechanical failure data |
| 140 | NTD Annual Data -- Service and Operating Expenses | `npsm-38gk` | data.transportation.gov | 2024 service and expenses by mode |
| 141 | Major Safety Events | `9ivb-8ae9` | data.transportation.gov | Major safety events (fatalities, critical injuries) |

---

# F. MOBILITY & TRIP DATA

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 142 | **Trips by Distance** | `w96p-f2qv` | data.bts.gov | Daily travel estimates from mobile device data panel, all modes |
| 143 | Trips by Distance -- Daily Average by Week | `e5xt-zdtd` | data.bts.gov | Weekly averaged trip distance data |
| 144 | Trips by Distance with County Data | `ivp4-5mkt` | data.bts.gov | Trip distance data with county-level detail |
| 145 | Daily Mobility Statistics -- National and State | `aksz-j95y` | data.bts.gov | National and state level daily mobility |
| 146 | Daily Mobility Statistics -- County | `p3sz-y9us` | data.bts.gov | County-level daily mobility statistics |
| 147 | Citizen Connect -- County Data (live) | `t3kh-5nek` | data.bts.gov | Live county-level citizen connectivity data |
| 148 | American Travel Survey (ATS) 1995 | `762v-n95h` | data.bts.gov | Historical 1995 travel survey data |
| 149 | Local Area Transportation by Household 2009 | `frme-pssc` | data.bts.gov | Weekday household person/vehicle trip estimates for Census tracts |

---

# G. BIKESHARE & MICROMOBILITY

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 150 | Bikeshare and E-scooter Systems by Year and City | `cqdc-cm7d` | data.bts.gov | Cities served by bikeshare/e-scooter since 2015 |
| 151 | Locations of Docked Bikeshare Stations | `7m5x-ubud` | data.bts.gov | Lat/long for docked bikeshare stations by system and year |
| 152 | Docked Bikeshare Ridership | `6cfa-ipzd` | data.bts.gov | Bikeshare ridership data |
| 153 | Docked Bikeshare Trips: Largest 6 Systems | `59f3-d4qy` | data.bts.gov | Trip counts for the 6 largest docking systems |
| 154 | Docked Bikeshare Ridership by System, Year, Month, Day | `g3h6-334u` | data.bts.gov | Daily ridership for docked bikeshare systems |
| 155 | 2020 Monthly Bikeshare Data | `8cjz-h8bz` | data.bts.gov | 2020 monthly bikeshare data |
| 156 | Bikeshare and E-scooters in the U.S. (Story) | `fwcs-jprj` | data.bts.gov | Micromobility trends visualization |

---

# H. ECONOMIC INDICATORS & TRANSPORTATION SERVICES INDEX

## H.1 Transportation Services Index

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 157 | **Transportation Services Index (SA)** | `bw6n-ddqk` | data.bts.gov | Combined freight and passenger TSI -- monthly measure of transportation output |
| 158 | Combined Transportation Service Index | `9xbb-k5pk` | data.bts.gov | Combined TSI measure |
| 159 | Freight Transportation Service Index | `n68x-u7m7` | data.bts.gov | Freight-specific TSI |
| 160 | Passenger Transportation Service Index | `xkwi-7rvx` | data.bts.gov | Passenger-specific TSI |
| 161 | TSI -- Combined (data.transportation.gov) | `ni8u-e22d` | data.transportation.gov | Monthly for-hire freight and passenger volume |
| 162 | TSI -- Freight (data.transportation.gov) | `gutz-h9fp` | data.transportation.gov | Trucking, rail, waterway, pipeline, air freight |
| 163 | Pocket Guide -- Freight TSI | `6zn8-4eyz` | data.bts.gov | Freight TSI visualization |
| 164 | Pocket Guide -- Combined TSI | `erq7-v5ry` | data.bts.gov | Combined TSI visualization |
| 165 | Pocket Guide -- Passenger TSI | `4h5v-s7mv` | data.bts.gov | Passenger TSI visualization |

## H.2 Monthly Transportation Statistics

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 166 | **Monthly Transportation Statistics** | `crem-w557` | data.bts.gov | Flagship: 60+ time series from ~24 federal sources covering freight, passenger, safety, energy, economic |
| 167 | Monthly Transportation Statistics (Story) | `m9eb-yevh` | data.bts.gov | Interactive monthly stats visualization |

## H.3 GDP, Spending & Economic Trends

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 168 | U.S. Transportation Spending | `tv2t-hcaq` | data.bts.gov | U.S. spending on transportation |
| 169 | U.S. GDP by Spending Category | `2z28-rv9r` | data.bts.gov | GDP by category including transportation |
| 170 | Transportation Services -- SA | `m8rp-gsp3` | data.bts.gov | Personal spending on transport services |
| 171 | Gasoline and Other Energy Goods -- SA | `39zs-tyww` | data.bts.gov | Personal spending on motor vehicle fuels |
| 172 | Auto Sales SAAR | `ezry-n9vi` | data.bts.gov | Passenger car sales, seasonally adjusted annual rate |
| 173 | Auto Sales (data.transportation.gov) | `7n6a-n5tz` | data.transportation.gov | Auto and truck sales data |
| 174 | Transportation as an Economic Indicator (Story) | `9czv-tjte` | data.bts.gov | Transportation economic indicator visualization |

## H.4 Transportation Economic Trends (TET) -- data.transportation.gov

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 175 | TET: Value of Transportation -- Investment | `435g-4p74` | data.transportation.gov | Investment in transportation infrastructure |
| 176 | TET: Transportation Costs -- Purchasers | `xs2y-h68w` | data.transportation.gov | Costs faced by purchasers |
| 177 | TET: Transportation Costs -- Businesses | `2yqq-baqd` | data.transportation.gov | Costs faced by businesses |
| 178 | TET: Transportation Costs -- Producers | `vktv-jrbs` | data.transportation.gov | Costs faced by producers |
| 179 | TET: Transportation Costs -- Households | `5h3f-jnbe` | data.transportation.gov | Costs faced by households |
| 180 | TET: Transportation Spending -- Per Vehicle Mile | `bzt6-t8cd` | data.transportation.gov | Per-vehicle-mile spending |
| 181 | TET: Government Transportation Expenditures | `hjpc-j5px` | data.transportation.gov | Government expenditures |
| 182 | TET: Industry Snapshots | `ny5d-7xny` | data.bts.gov | Industry contribution to economy and transport use |
| 183 | TET: Contribution of Transportation | `k798-qm7g` | data.bts.gov | Economic concepts of transportation's contribution |

## H.5 Household Economics

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 184 | Household Transportation Expenses | `ibmc-u8gh` | data.bts.gov | Household spending on transportation |
| 185 | Household Expenses by Category -- Transportation | `ibgg-a7rt` | data.bts.gov | Transportation component of household expenses |
| 186 | Household Expenses by Category | `vbnr-xiie` | data.bts.gov | Full household expense breakdown |

---

# I. HIGHWAY, ROADS & VEHICLE-MILES TRAVELED

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 187 | **Vehicle-Miles Traveled** | `n2ug-dueu` | data.bts.gov | VMT from FHWA Highway Statistics table VM-202 |
| 188 | Highway Travel | `5mic-h7md` | data.bts.gov | Highway travel statistics |
| 189 | Highway Travel -- All Systems | `qeh3-a6ec` | data.bts.gov | FHWA monthly VMT estimates on all roads |
| 190 | National Highway Construction Cost Index | `wgzr-nyxc` | data.bts.gov | FHWA quarterly highway construction price index |
| 191 | National Highway System Pavement Condition | `jasd-h882` | data.bts.gov | NHS pavement condition data |
| 192 | Highway Statistics Data Browser | `r6fg-b885` | data.transportation.gov | Motor fuel, registrations, licenses, highway mileage |
| 193 | Monthly Traffic Volume Trends 1970-1991 | `hcwt-es4b` | data.transportation.gov | Historical monthly traffic volumes |
| 194 | TxDOT Active Work Zones | `447t-5wvd` | data.transportation.gov | Lane closures within Texas DOT highway system |
| 195 | Incorporating Travel Time Reliability into HCM | `vgwp-6ysf` | data.bts.gov | Research supporting dataset |

---

# J. SAFETY

## J.1 Highway Safety

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 196 | Highway Fatalities | `nixb-9brz` | data.bts.gov | NHTSA highway fatalities from FARS |
| 197 | Highway Fatalities Per 100 Million VMT | `vf2d-wcyz` | data.bts.gov | Fatality rate per 100M vehicle miles traveled |
| 198 | Distracted Driving Fatalities | `pgfn-7pgx` | data.bts.gov | Fatalities from distracted driving |
| 199 | Distracted Driving Injuries | `bxfu-xspg` | data.bts.gov | Injuries from distracted driving |
| 200 | Pedestrian and Bicyclist Fatalities | `qrtz-44mz` | data.bts.gov | Pedestrian and bicyclist fatality data |
| 201 | Alcohol-Impaired Driving Fatalities | `nx35-b7qu` | data.bts.gov | Alcohol-impaired driving fatalities |
| 202 | Transportation Fatalities by Mode | `cm4f-3dv2` | data.bts.gov | Fatalities across all transportation modes |

## J.2 Aviation Safety

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 203 | Fatality Rates -- General Aviation | `igqw-86sp` | data.bts.gov | General aviation fatality rates |
| 204 | Fatality Rates -- U.S. Air Carriers | `2p2v-mcyq` | data.bts.gov | Commercial air carrier fatality rates |
| 205 | General Aviation Fatalities | `digq-7e2f` | data.bts.gov | GA fatality counts (excludes FAR Part 121) |

## J.3 Transit & Other Safety

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 206 | Fatality Rates -- Transit | `h6ju-dcau` | data.bts.gov | Transit fatality rates |
| 207 | Fatality Rates -- Recreational Boating | `ny96-pdn5` | data.bts.gov | Recreational boating fatality rates |

## J.4 Railroad Safety -- data.transportation.gov

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 208 | Rail Equipment Accident/Incident Data (Form 54) | `85tf-25kj` | data.transportation.gov | Railroad equipment accident reports |
| 209 | Crossing Inventory Data (Form 71) -- Current | `m2f8-22s6` | data.transportation.gov | Current highway-rail grade crossing inventory |
| 210 | Crossing Inventory Data (Form 71) -- Historical | `vhwz-raag` | data.transportation.gov | Historical crossing inventory |

## J.5 NHTSA Recalls & Investigations -- data.transportation.gov

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 211 | NHTSA Recalls by Manufacturer | `mu99-t4jn` | data.transportation.gov | Recall information by manufacturer (from 1966) |
| 212 | Recalls Data | `6axg-epim` | data.transportation.gov | NHTSA recall campaign data |
| 213 | ODI -- Recalls | `3hpp-hxtf` | data.transportation.gov | Office of Defects Investigation recalls |
| 214 | ODI -- Complaints Search | `yerr-upki` | data.transportation.gov | Searchable complaints database |

## J.6 Pipeline & Hazmat Safety -- data.transportation.gov

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 215 | Pipeline Accident/Incident Reports | `ya7h-d57z` | data.transportation.gov | Pipeline accident and incident data |
| 216 | Pipeline Incident Flagged Files | `qdme-9bbm` | data.transportation.gov | Flagged pipeline incidents |
| 217 | Gas Distribution/Gathering/Transmission/LNG Annual Reports | `aemm-7pyq` | data.transportation.gov | Pipeline annual reports (mileage, facilities, commodities) |
| 218 | Hazmat Yearly Incident Summary Reports | `dirx-hdpw` | data.transportation.gov | Annual hazmat incident summaries |
| 219 | Hazmat Incident Reports | `39f9-7uyg` | data.transportation.gov | Detailed hazmat incident reports |

---

# K. FUEL, ENERGY & ENVIRONMENT

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 220 | Fuel Prices -- On-highway Diesel | `2g5j-egmt` | data.bts.gov | Average retail diesel price |
| 221 | Fuel Prices -- Regular Gasoline | `x5f7-q5tn` | data.bts.gov | Average retail regular gasoline price |
| 222 | Tax Rates by Motor Fuel and State | `e5cn-ri8q` | data.bts.gov | Motor fuel tax rates by type and state |
| 223 | Monthly Motor Fuel Sales by States | `kbvr-tyu5` | data.bts.gov | Monthly motor fuel sales including gallons taxed |
| 224 | Greenhouse Gas Emissions by Sector | `bja4-phgj` | data.bts.gov | GHG emissions by economic sector |
| 225 | Petroleum Consumption by Sector | `7hum-szff` | data.bts.gov | Petroleum consumption by sector |
| 226 | Transportation Energy Consumption by Source | `cji6-uicz` | data.bts.gov | Transportation energy by fuel source |
| 227 | Energy Consumption by Sector | `9f44-jxam` | data.bts.gov | Energy consumption by economic sector |

---

# L. EMPLOYMENT

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 228 | Employment -- Transportation and Warehousing | `2z63-wprv` | data.bts.gov | Monthly employment by mode and by women workers |
| 229 | Employment -- Truck Transportation | `yu2w-ew3p` | data.bts.gov | Trucking employment |
| 230 | Employment -- Air Transportation | `b5kg-g3e7` | data.bts.gov | Air transportation employment |
| 231 | Employment -- Rail Transportation | `y84q-ayg5` | data.bts.gov | Rail transportation employment |
| 232 | Employment -- Water Transportation | `84xd-726c` | data.bts.gov | Water transportation employment |
| 233 | Employment -- Pipeline Transportation | `ey6f-ijqz` | data.bts.gov | Pipeline transportation employment |
| 234 | Employment -- Transit and Ground Passenger | `v8vk-h5g4` | data.bts.gov | Transit employment |
| 235 | Unemployment Rates -- U.S. Transportation Sector | `28xr-p3t9` | data.bts.gov | Unemployment rates in transport/warehousing |

---

# M. INFRASTRUCTURE & PUBLIC FINANCE

## M.1 Infrastructure

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 236 | Condition of Highway Bridges | `r2bn-dpaa` | data.bts.gov | Highway bridge condition statistics |
| 237 | National Highway System Pavement Condition | `jasd-h882` | data.bts.gov | NHS pavement condition data |

## M.2 Construction Spending

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 238 | Construction Spending -- Highway and Street | `2mc2-ud7r` | data.bts.gov | Monthly highway/street construction estimates |
| 239 | Construction Spending -- Water Transportation | `im7w-eu7z` | data.bts.gov | Water transportation facilities |
| 240 | Construction Spending -- Land Transportation | `ma52-8ti5` | data.bts.gov | Land transportation facilities |
| 241 | Construction Spending -- Air Transportation | `rfw9-fja8` | data.bts.gov | Air transportation facilities |
| 242 | Construction Spending -- Parking Facilities | `nmfc-gh7h` | data.bts.gov | Parking facilities |

## M.3 Public Finance

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 243 | State-Level Transportation Public Finance (TPFS) | `kdtd-3e96` | data.bts.gov | State/local transportation revenue and expenditures |
| 244 | Aggregate State Transportation Finance | `6aiz-ybqx` | data.bts.gov | All government levels |
| 245 | Government Transportation Financial Statistics 2001 | `d5bg-kazz` | data.bts.gov | Federal, state, local financial activities |
| 246 | IIJA Transportation Funding by Mode (Story) | `7fjw-dp4g` | data.bts.gov | Bipartisan Infrastructure Law funding |

---

# N. NOISE & ENVIRONMENT

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 247 | National Transportation Noise Map | `ri89-bhxh` | data.bts.gov | National transportation noise mapping |
| 248 | Population Exposed to Combined Aviation/Road/Rail Noise | `k3id-nynu` | data.bts.gov | Combined noise exposure, 2016 and 2018 |
| 249 | Population Exposed to Aviation Noise | `iqwy-f8z4` | data.bts.gov | Aviation noise levels |
| 250 | Population Exposed to Road Noise | `ppe3-tvgj` | data.bts.gov | Road noise levels |
| 251 | Population Exposed to Passenger Rail Noise | `dkbd-kjgw` | data.bts.gov | Passenger rail noise, 2018 |

---

# O. TRUCKING & MOTOR CARRIERS (FMCSA) -- data.transportation.gov

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 252 | Company Census File | `az4n-8mr2` | data.transportation.gov | Active, inactive, pending entities registered with FMCSA |
| 253 | SAFER -- Company Snapshot | `4kcp-cfmm` | data.transportation.gov | FMCSA company safety snapshot |
| 254 | Carrier Data | `6qg9-x4f8` | data.transportation.gov | Motor carrier data |

---

# P. RESEARCH & OTHER

| # | Dataset | SODA ID | Endpoint | Description |
|---|---|---|---|---|
| 255 | Intermodal Passenger Connectivity Database | `2j3q-2taz` | datahub.transportation.gov | 7,000+ rail, air, bus, ferry terminals measuring intermodal connectivity |
| 256 | NGSIM Vehicle Trajectories | `8ect-6jqj` | data.transportation.gov | Detailed vehicle trajectory data from synchronized video |
| 257 | BSM Point Map | `mpc8-8ayu` | data.transportation.gov | Basic Safety Messages from connected vehicle testing |
| 258 | Rural Access to Intercity Transportation (Story) | `gr9y-9gjq` | data.bts.gov | Rural intercity access map |
| 259 | Major Trends (Story) | `5er7-y3zn` | data.bts.gov | U.S. transportation system performance |
| 260 | Pocket Guide to Transportation (Story) | `3wd5-w3z4` | data.bts.gov | Quick reference guide |
| 261 | National Transportation Library Repository | `nzdh-y7rr` | data.bts.gov | NTL/ROSA P repository catalog |
| 262 | Pocket Guide -- Moving People | `b3ps-driu` | data.bts.gov | Passenger movement visualization |

---

# Q. GEOSPATIAL DATASETS (geodata.bts.gov / NTAD)

> **Note**: These ~90 datasets are available via ArcGIS REST API, WFS, GeoJSON, Shapefile, and KML -- NOT via Socrata SODA API.

## Q.1 Aviation
- Aviation Facilities (all official/operational aerodromes, updated every 28 days from FAA)
- Runways (locations and attributes)
- Runway Ends Table
- FAA Regional Offices
- Spaceports

## Q.2 Rail
- North American Rail Network Lines (full network for routing/mapping/analysis)
- Class I Freight Railroads View
- Passenger Rail View
- NS View, CPKC View (individual railroad views)
- Amtrak Stations (locations with building/waiting room polygons)

## Q.3 Maritime & Waterways
- Navigable Waterway Network Lines (shipping lanes, channels, rivers, sea lanes)
- Navigable Waterway Network Nodes (ports, facilities, intermodal terminals)
- Ports and Port Statistical Areas (USACE) -- new Winter 2025
- Inland Electronic Navigational Charts

## Q.4 Roads & Highway
- National Highway Planning Network
- National Highway Freight Network (NHFN)
- National Highway System (NHS)
- Highway Performance Monitoring System (HPMS) 2023 -- new Winter 2025
- 1991 Federal Aid Primary (FAP) Roads
- Travel Monitoring Analysis System Stations

## Q.5 Freight & Intermodal
- Intermodal Freight Facilities Rail TOFC/COFC
- Intermodal Freight (facility locations) -- new Winter 2025
- Intermodal Passenger Facility (Amtrak with multimodal connections) -- new Winter 2025

## Q.6 Boundaries & Other
- Urban Areas (boundary polygons)
- Military Bases (DoD site locations and boundaries)
- State Boundaries

## Q.7 Energy & Pipeline
- 4 pipeline datasets from EIA (added Summer 2025)

## Q.8 Bridges & Tunnels
- National Bridge Inventory (ArcGIS/WFS, not Socrata)
- National Tunnel Inventory (ArcGIS/WFS, not Socrata)

---

# R. DATASETS NOT ON SOCRATA

These important BTS datasets are available through other platforms:

| Dataset | Platform | URL | Notes |
|---|---|---|---|
| **Freight Analysis Framework (FAF5)** | BTS website + ArcGIS | https://www.bts.gov/faf | Major freight flow dataset, not on Socrata |
| **National Household Travel Survey (NHTS)** | ORNL | https://nhts.ornl.gov/downloads | Downloadable, not API |
| **Airline On-Time Performance (full historical)** | TranStats | https://transtats.bts.gov/ | Full DB1B, T-100 historical, not Socrata |
| **Fuel Cost and Consumption (airline)** | TranStats | https://transtats.bts.gov/FUEL/ | Airline fuel data, not Socrata |
| **National Bridge Inventory** | geodata.bts.gov | https://geodata.bts.gov/ | ArcGIS/WFS only |
| **National Tunnel Inventory** | geodata.bts.gov | https://geodata.bts.gov/ | ArcGIS/WFS only |

---

# S. QUICK REFERENCE: MOST RELEVANT BY PROJECT TYPE

## S.1 Texas-Mexico Border Studies

| Priority | Dataset | SODA ID | Why |
|---|---|---|---|
| **Core** | TransBorder Freight (Port+Commodity) | `yrut-prtq` | Trade value/weight by port, commodity, mode |
| **Core** | Border Crossing Entry Data | `keg4-3bc2` | Physical crossing counts (trucks, trains, vehicles, pedestrians) |
| **High** | Supply Chain & Freight Indicators | `y5ut-ibwt` | Freight movement and supply chain metrics |
| **High** | U.S.-Mexico Incoming Truck Crossings | `ybdw-ip2g` | Truck-specific Mexico border crossings |
| **High** | U.S.-Mexico Incoming Person Crossings | `gwx6-wfa3` | Person crossings from Mexico |
| **Medium** | CFS Export File | `qq62-cjjy` | Domestic commodity flows feeding border trade |
| **Medium** | Truck Travel Times (ATRI) | `uta5-4eu5` | Freight corridor performance near border |
| **Medium** | Southern Border Pedestrian Crossings | `2a7t-n7sy` | Pedestrian volume at TX-MX ports |

## S.2 Airport Connectivity Studies

| Priority | Dataset | SODA ID | Why |
|---|---|---|---|
| **Core** | T-100 Segment Summary | `bu82-4pwz` | Passengers, seats, freight, departures by segment |
| **Core** | T-100 Segment Summary By Carrier | `q4tb-tbff` | Same data split by carrier |
| **Core** | T-100 Segment Summary By Country | `56rv-9p75` | International traffic patterns |
| **High** | Airport On-Time Performance | `rns4-gpqn` | Airport performance metrics |
| **High** | Commercial Aviation Departures | `bpqk-hyst` | Daily departure counts |
| **Medium** | Airport Performance Rankings | `hdqs-8yds` | All major airport rankings |
| **Medium** | Air Cargo by Airport | `xb4z-t72k` | Freight volumes by airport |

## S.3 Freight & Logistics Studies

| Priority | Dataset | SODA ID | Why |
|---|---|---|---|
| **Core** | Monthly Transportation Statistics | `crem-w557` | 60+ time series, comprehensive |
| **Core** | Transportation Services Index | `bw6n-ddqk` | Freight and passenger volume index |
| **Core** | CFS Area File | `j246-y2rf` | Geographic commodity flows |
| **High** | Supply Chain Indicators | `y5ut-ibwt` | Port, freight, labor metrics |
| **High** | Rail Freight Carloads | `uyr2-7q4x` | Bulk commodity rail traffic |
| **High** | Rail Freight Intermodal | `ejmp-u4kv` | Container/trailer rail traffic |
| **Medium** | Truck Tonnage Index | `fdsx-2s48` | Monthly truck volume measure |
| **Medium** | ATRI Truck Travel Times | `uta5-4eu5` | Corridor performance |

## S.4 Transit & Urban Mobility Studies

| Priority | Dataset | SODA ID | Why |
|---|---|---|---|
| **Core** | NTD Annual Data (Service by Agency) | `6y83-7vuw` | Comprehensive transit service data |
| **Core** | Daily Transit Ridership | `dc74-f8qd` | Major system ridership trends |
| **High** | Transit Ridership -- Urban Rail | `rw9i-mdin` | Rail transit ridership |
| **High** | Trips by Distance | `w96p-f2qv` | Mobile device travel estimates |
| **Medium** | Bikeshare Systems | `cqdc-cm7d` | Micromobility coverage |
| **Medium** | Amtrak Ridership | `4mdc-2kn7` | Intercity rail |

## S.5 Safety & Infrastructure Studies

| Priority | Dataset | SODA ID | Why |
|---|---|---|---|
| **Core** | Highway Fatalities | `nixb-9brz` | FARS fatality data |
| **Core** | Fatalities Per 100M VMT | `vf2d-wcyz` | Fatality rate trends |
| **Core** | Transportation Fatalities by Mode | `cm4f-3dv2` | Cross-modal safety comparison |
| **High** | Condition of Highway Bridges | `r2bn-dpaa` | Bridge condition |
| **High** | Rail Equipment Accidents | `85tf-25kj` | Railroad safety |
| **Medium** | Pipeline Incidents | `ya7h-d57z` | Pipeline safety |
| **Medium** | Hazmat Incidents | `39f9-7uyg` | Hazmat safety |

---

## API Query Examples

**Basic query (first 5 rows):**
```
https://data.bts.gov/resource/keg4-3bc2.json?$limit=5
```

**Filter by year:**
```
https://data.bts.gov/resource/yrut-prtq.json?$where=year='2024'&$limit=50000
```

**Get distinct values:**
```
https://data.bts.gov/resource/yrut-prtq.json?$select=DISTINCT port_name&$limit=5000
```

**Count rows:**
```
https://data.bts.gov/resource/yrut-prtq.json?$select=count(*)
```

**Filter by port and trade type:**
```
https://data.bts.gov/resource/yrut-prtq.json?$where=port_name='Laredo' AND trade_type='Export'&$limit=50000
```

**With app token:**
```
https://data.bts.gov/resource/yrut-prtq.json?$$app_token=YOUR_TOKEN&$limit=50000
```

**Programmatic dataset discovery:**
```
https://data.bts.gov/api/views?limit=100&page=1
```

---

## Summary Statistics

| Portal | Datasets Cataloged | Notes |
|---|---|---|
| **data.bts.gov** | ~130 entries | BTS-specific: border, freight, aviation, economic, mobility |
| **data.transportation.gov** | ~55+ datasets | Broader DOT: includes NHTSA, FTA, FRA, FMCSA, PHMSA |
| **geodata.bts.gov (NTAD)** | ~90 datasets | Geospatial: Shapefile, GeoJSON, CSV, KML, File Geodatabase |
| **datahub.transportation.gov** | ~10+ mirrors | Mirrors and alternate endpoints |
| **Total unique datasets** | **~260+** | Across all portals |

---

*Last updated: March 2026*

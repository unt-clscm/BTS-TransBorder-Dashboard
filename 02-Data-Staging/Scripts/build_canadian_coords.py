"""One-time helper: build canadian_port_coordinates.json from BTS Socrata API data.

Data fetched from https://data.bts.gov/resource/keg4-3bc2.json on 2026-03-24.
"""
import json
from pathlib import Path

RAW = [
    {"port_name":"Alcan","port_code":"3104","state":"Alaska","latitude":"62.614961","longitude":"-141.001444"},
    {"port_name":"Alexandria Bay","port_code":"0708","state":"New York","latitude":"44.347229","longitude":"-75.983592"},
    {"port_name":"Algonac","port_code":"3814","state":"Michigan","latitude":"42.6183","longitude":"-82.5311"},
    {"port_name":"Ambrose","port_code":"3410","state":"North Dakota","latitude":"48.999305","longitude":"-103.486555"},
    {"port_name":"Anacortes","port_code":"3010","state":"Washington","latitude":"48.49617","longitude":"-122.59953"},
    {"port_name":"Antler","port_code":"3413","state":"North Dakota","latitude":"48.999472","longitude":"-101.296055"},
    {"port_name":"Bar Harbor","port_code":"0112","state":"Maine","latitude":"44.399722","longitude":"-68.224722"},
    {"port_name":"Baudette","port_code":"3424","state":"Minnesota","latitude":"48.719109","longitude":"-94.590467"},
    {"port_name":"Beecher Falls","port_code":"0206","state":"Vermont","latitude":"45.013411","longitude":"-71.505309"},
    {"port_name":"Blaine","port_code":"3004","state":"Washington","latitude":"48.994045","longitude":"-122.748884"},
    {"port_name":"Boundary","port_code":"3015","state":"Washington","latitude":"49.00075","longitude":"-117.627583"},
    {"port_name":"Bridgewater","port_code":"0127","state":"Maine","latitude":"46.450335","longitude":"-67.78484"},
    {"port_name":"Buffalo Niagara Falls","port_code":"0901","state":"New York","latitude":"43.09549","longitude":"-79.055847"},
    {"port_name":"Calais","port_code":"0115","state":"Maine","latitude":"45.188548","longitude":"-67.275381"},
    {"port_name":"Cape Vincent","port_code":"0706","state":"New York","latitude":"44.134917","longitude":"-76.352489"},
    {"port_name":"Carbury","port_code":"3421","state":"North Dakota","latitude":"48.999416","longitude":"-100.555805"},
    {"port_name":"Champlain Rouses Point","port_code":"0712","state":"New York","latitude":"45.0088325953","longitude":"-73.4526634854"},
    {"port_name":"Dalton Cache","port_code":"3106","state":"Alaska","latitude":"59.450556","longitude":"-136.361944"},
    {"port_name":"Danville","port_code":"3012","state":"Washington","latitude":"49.000083","longitude":"-118.503722"},
    {"port_name":"Del Bonita","port_code":"3322","state":"Montana","latitude":"48.998555","longitude":"-112.78825"},
    {"port_name":"Derby Line","port_code":"0209","state":"Vermont","latitude":"45.005739","longitude":"-72.099279"},
    {"port_name":"Detroit","port_code":"3801","state":"Michigan","latitude":"42.331685","longitude":"-83.047924"},
    {"port_name":"Dunseith","port_code":"3422","state":"North Dakota","latitude":"48.999277","longitude":"-100.052166"},
    {"port_name":"Eastport","port_code":"0103","state":"Maine","latitude":"44.8594395785","longitude":"-66.98007566"},
    {"port_name":"Eastport","port_code":"3302","state":"Idaho","latitude":"49.000555","longitude":"-116.181027"},
    {"port_name":"Ferry","port_code":"3013","state":"Washington","latitude":"49.000083","longitude":"-118.761166"},
    {"port_name":"Fort Fairfield","port_code":"0107","state":"Maine","latitude":"46.765323","longitude":"-67.789471"},
    {"port_name":"Fort Kent","port_code":"0110","state":"Maine","latitude":"47.249206","longitude":"-68.603918"},
    {"port_name":"Fortuna","port_code":"3417","state":"North Dakota","latitude":"48.999555","longitude":"-103.80925"},
    {"port_name":"Friday Harbor","port_code":"3014","state":"Washington","latitude":"48.534485","longitude":"-123.016484"},
    {"port_name":"Frontier","port_code":"3020","state":"Washington","latitude":"49.0005","longitude":"-117.831527"},
    {"port_name":"Grand Portage","port_code":"3613","state":"Minnesota","latitude":"48.001427","longitude":"-89.58515"},
    {"port_name":"Hannah","port_code":"3408","state":"North Dakota","latitude":"49.000138","longitude":"-98.693777"},
    {"port_name":"Hansboro","port_code":"3415","state":"North Dakota","latitude":"48.999583","longitude":"-99.346527"},
    {"port_name":"Highgate Springs","port_code":"0212","state":"Vermont","latitude":"45.015414","longitude":"-73.085037"},
    {"port_name":"Houlton","port_code":"0106","state":"Maine","latitude":"46.134879","longitude":"-67.781288"},
    {"port_name":"International Falls","port_code":"3604","state":"Minnesota","latitude":"48.6078","longitude":"-93.401355"},
    {"port_name":"Jackman","port_code":"0104","state":"Maine","latitude":"45.805661","longitude":"-70.396722"},
    {"port_name":"Kenneth G Ward","port_code":"3023","state":"Washington","latitude":"49.002277","longitude":"-122.485027"},
    {"port_name":"Ketchikan","port_code":"3102","state":"Alaska","latitude":"55.34208","longitude":"-131.647804"},
    {"port_name":"Lancaster","port_code":"3430","state":"Minnesota","latitude":"49.000194","longitude":"-96.800527"},
    {"port_name":"Laurier","port_code":"3016","state":"Washington","latitude":"49.000083","longitude":"-118.223777"},
    {"port_name":"Limestone","port_code":"0118","state":"Maine","latitude":"46.924555","longitude":"-67.789597"},
    {"port_name":"Madawaska","port_code":"0109","state":"Maine","latitude":"47.360052","longitude":"-68.328684"},
    {"port_name":"Maida","port_code":"3416","state":"North Dakota","latitude":"49.00025","longitude":"-98.36525"},
    {"port_name":"Massena","port_code":"0704","state":"New York","latitude":"44.990556","longitude":"-74.739722"},
    {"port_name":"Metaline Falls","port_code":"3025","state":"Washington","latitude":"48.999972","longitude":"-117.299444"},
    {"port_name":"Morgan","port_code":"3319","state":"Montana","latitude":"48.999829","longitude":"-107.831819"},
    {"port_name":"Neche","port_code":"3404","state":"North Dakota","latitude":"49.000527","longitude":"-97.557333"},
    {"port_name":"Nighthawk","port_code":"3011","state":"Washington","latitude":"49.000144","longitude":"-119.67103"},
    {"port_name":"Noonan","port_code":"3420","state":"North Dakota","latitude":"48.999333","longitude":"-103.004361"},
    {"port_name":"Northgate","port_code":"3406","state":"North Dakota","latitude":"48.998833","longitude":"-102.27475"},
    {"port_name":"Norton","port_code":"0211","state":"Vermont","latitude":"45.010771","longitude":"-71.793219"},
    {"port_name":"Noyes","port_code":"3402","state":"Minnesota","latitude":"49.000171","longitude":"-97.206601"},
    {"port_name":"Ogdensburg","port_code":"0701","state":"New York","latitude":"44.7330898624","longitude":"-75.4577501759"},
    {"port_name":"Opheim","port_code":"3317","state":"Montana","latitude":"48.999527","longitude":"-106.377583"},
    {"port_name":"Oroville","port_code":"3019","state":"Washington","latitude":"49.000083","longitude":"-119.461833"},
    {"port_name":"Pembina","port_code":"3401","state":"North Dakota","latitude":"49.000453","longitude":"-97.237036"},
    {"port_name":"Piegan","port_code":"3316","state":"Montana","latitude":"48.998083","longitude":"-113.378777"},
    {"port_name":"Pinecreek","port_code":"3425","state":"Minnesota","latitude":"48.999916","longitude":"-95.977694"},
    {"port_name":"Point Roberts","port_code":"3017","state":"Washington","latitude":"49.0020555547","longitude":"-123.068055556"},
    {"port_name":"Portal","port_code":"3403","state":"North Dakota","latitude":"48.998944","longitude":"-102.551944"},
    {"port_name":"Port Angeles","port_code":"3007","state":"Washington","latitude":"48.121858","longitude":"-123.430694"},
    {"port_name":"Porthill","port_code":"3308","state":"Idaho","latitude":"48.999861","longitude":"-116.49925"},
    {"port_name":"Port Huron","port_code":"3802","state":"Michigan","latitude":"42.998611","longitude":"-82.423611"},
    {"port_name":"Portland","port_code":"0101","state":"Maine","latitude":"43.659444","longitude":"-70.243056"},
    {"port_name":"Raymond","port_code":"3301","state":"Montana","latitude":"48.999194","longitude":"-104.574333"},
    {"port_name":"Richford","port_code":"0203","state":"Vermont","latitude":"45.01174","longitude":"-72.588559"},
    {"port_name":"Roosville","port_code":"3318","state":"Montana","latitude":"48.999638","longitude":"-115.056027"},
    {"port_name":"Roseau","port_code":"3426","state":"Minnesota","latitude":"48.999538","longitude":"-95.766469"},
    {"port_name":"Sarles","port_code":"3409","state":"North Dakota","latitude":"49.000027","longitude":"-98.938361"},
    {"port_name":"Sault Sainte Marie","port_code":"3803","state":"Michigan","latitude":"46.508611","longitude":"-84.360833"},
    {"port_name":"Scobey","port_code":"3309","state":"Montana","latitude":"48.999527","longitude":"-105.407638"},
    {"port_name":"Sherwood","port_code":"3414","state":"North Dakota","latitude":"48.999305","longitude":"-101.627527"},
    {"port_name":"Skagway","port_code":"3103","state":"Alaska","latitude":"59.629722","longitude":"-135.164444"},
    {"port_name":"St John","port_code":"3405","state":"North Dakota","latitude":"48.999277","longitude":"-99.659111"},
    {"port_name":"Sumas","port_code":"3009","state":"Washington","latitude":"49.002388","longitude":"-122.264805"},
    {"port_name":"Sweetgrass","port_code":"3310","state":"Montana","latitude":"48.998388","longitude":"-111.959611"},
    {"port_name":"Trout River","port_code":"0715","state":"New York","latitude":"44.992058","longitude":"-74.308172"},
    {"port_name":"Turner","port_code":"3306","state":"Montana","latitude":"48.999527","longitude":"-108.387916"},
    {"port_name":"Van Buren","port_code":"0108","state":"Maine","latitude":"47.159645","longitude":"-67.930799"},
    {"port_name":"Vanceboro","port_code":"0105","state":"Maine","latitude":"45.568761","longitude":"-67.428541"},
    {"port_name":"Walhalla","port_code":"3407","state":"North Dakota","latitude":"49.000472","longitude":"-97.908416"},
    {"port_name":"Warroad","port_code":"3423","state":"Minnesota","latitude":"48.999","longitude":"-95.376555"},
    {"port_name":"Westhope","port_code":"3419","state":"North Dakota","latitude":"48.999611","longitude":"-101.017277"},
    {"port_name":"Whitetail","port_code":"3312","state":"Montana","latitude":"48.999347","longitude":"-105.162324"},
    {"port_name":"Whitlash","port_code":"3321","state":"Montana","latitude":"48.99725","longitude":"-111.257916"},
    {"port_name":"Wildhorse","port_code":"3323","state":"Montana","latitude":"48.999361","longitude":"-110.215083"},
    {"port_name":"Willow Creek","port_code":"3325","state":"Montana","latitude":"48.999972","longitude":"-109.731333"},
]

CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"

coords = {
    "_source": "BTS Border Crossing Entry Data (Socrata dataset keg4-3bc2)",
    "_api": "https://data.bts.gov/resource/keg4-3bc2.json",
    "_retrieved": "2026-03-24",
    "_notes": "Schedule D port codes with lat/lon for all US-Canada land border ports of entry.",
}

count = 0
for p in RAW:
    code = p["port_code"]
    lat = p.get("latitude")
    lon = p.get("longitude")
    if lat and lon:
        coords[code] = {"port": p["port_name"], "state": p["state"], "lat": float(lat), "lon": float(lon)}
        count += 1

out = CONFIG_DIR / "canadian_port_coordinates.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(coords, f, indent=2, ensure_ascii=False)

print(f"Wrote {count} Canadian port coordinates to {out}")

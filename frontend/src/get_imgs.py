import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def search(query):
    url = f'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles={query}&pithumbsize=800&format=json'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
        data = json.loads(res)
        pages = data['query']['pages']
        for pid in pages:
            if 'thumbnail' in pages[pid]:
                return pages[pid]['thumbnail']['source']
    except:
        pass
    return None

items = [
    "Dog_food", "Chew_toy", "Dog_collar", "Dog_shampoo", "Dog_biscuit",
    "Cat_food", "Scratching_post", "Cat_toy", "Litter_box", "Pet_water_dispenser",
    "Bird_seed", "Cuttlebone", "Timothy-grass", "Hamster_wheel", "Pet_carrier"
]

for item in items:
    print(f"{item}: {search(item)}")

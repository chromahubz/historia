"""Fonts from Google Fonts (all SIL OFL 1.1), Latin subset, into fonts/; plus the licence texts.
usage: python -I tools/fonts.py <film_dir>"""
import sys, os, re, urllib.request, urllib.parse
D = sys.argv[1]
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=60).read()
latin = ''.join(chr(c) for c in range(32, 127)) + '·×→−—–’‘“”…°≈Ø½'
for fam, w, out in (('IBM Plex Sans', 400, 'PlexSans-400'), ('IBM Plex Sans', 500, 'PlexSans-500'),
                    ('IBM Plex Mono', 400, 'PlexMono-400'), ('IBM Plex Mono', 500, 'PlexMono-500'),
                    ('IBM Plex Serif', 500, 'PlexSerif-500'), ('IBM Plex Serif', 600, 'PlexSerif-600')):
    css = get('https://fonts.googleapis.com/css2?family=' + urllib.parse.quote(fam) + f':wght@{w}&text=' + urllib.parse.quote(latin)).decode()
    urls = re.findall(r'url\((https://[^)]+)\)', css); assert len(urls) == 1, css[:300]
    open(os.path.join(D, 'fonts', out + '.woff2'), 'wb').write(get(urls[0])); print(out)
for fam in ('ibmplexsans', 'ibmplexmono', 'ibmplexserif'):
    open(os.path.join(D, 'fonts', f'OFL-{fam}.txt'), 'wb').write(get(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{fam}/OFL.txt'))
print('licences written')

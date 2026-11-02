"""Score, foley, beds and voice for No. 7 · The Roman Dodecahedron -> out/mix.wav (+ out/stems/*.wav).
Reads out/timeline.json (tools/export.mjs) and voice/out/*.wav. Run: LIB=<library> python mix.py
Score: D minor, slow and open. Felt piano (Salamander), strings (VSCO 2 CE), glass, bowed vibraphone and timpani (VCSL).
Foley: light-table starter and hum, the loupe on glass, paper on each lit line, pen strokes, coins, index ticks."""
import sys, os, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, noise, bp, lp, hp, env_exp, t_, norm, compress, clack, whoosh, limit

TL = json.load(open(os.path.join(HERE, 'out', 'timeline.json')))
H, BEAT, DUR = TL['hit'], TL['beat'], TL['dur']
VO = {v['id']: v for v in TL['voice']}
N = int((DUR + 0.5) * SR)
S.seed(7)
st = lambda: np.zeros((N, 2), np.float32)
music, foley, beds, voice = st(), st(), st(), st()
tt = np.arange(N) / SR
def seg(t, a, c): return np.clip((t - a) / (c - a), 0, 1)

# ---------------- score ----------------
EV = []
def P(t, pitch, dur, vel, pan=0.0, inst='piano', gain=1.0): EV.append((t, inst, pitch, dur, vel, pan, gain))
def pad(t, dur, notes, v=.26, att=1.6, rel=1.4):
    for (p, inst, pan) in notes: EV.append(dict(t=t, inst=inst, pitch=p, dur=dur, vel=v, pan=pan, attack=att, release=rel))
CH = {'Dm': ['D3', 'A3', 'D4', 'F4'], 'Bb': ['D3', 'Bb3', 'D4', 'F4'], 'F': ['C3', 'A3', 'C4', 'F4'], 'C': ['C3', 'G3', 'C4', 'E4'],
      'Gm': ['D3', 'Bb3', 'D4', 'G4'], 'A': ['C#3', 'A3', 'C#4', 'E4'], 'Am': ['C3', 'A3', 'C4', 'E4']}
order = [0, 2, 1, 3, 2, 1, 3, 2]
def arp(t0, ch, beats, vel=.30, pan=-.1, step=0.5):
    for i in range(int(beats / step)):
        P(t0 + i * step * BEAT, CH[ch][order[i % 8]], step * BEAT * 1.7, vel * (1.08 if i % 4 == 0 else .92), pan + .1 * ((i % 2) * 2 - 1))
LOW = lambda root: [(root + '2', 'contrabass', 0), (root + '3', 'cellos', -.3)]

# A. light and title: one note with the light, a low D underneath
P(H['lightOn'], 'D5', 3.0, .40, .1); pad(0.6, VO['L02']['t'] - 0.6, LOW('D'), .24, 2.5)
# B. the books: broken chords, one chord per book
t = VO['L02']['t']
for ch, t0 in (('Dm', t), ('Bb', H['build']), ('F', H['army']), ('C', H['eat'])): arp(t0, ch, 2 * (H['army'] - H['build']) / BEAT / 2 if ch != 'C' else 4)
# C. "these": a hush, then glass and cellos
P(H['these'], 'A5', 3.5, .45, .2, 'glass', .8); pad(H['these'], VO['L04']['t1'] - H['these'], [('D3', 'cellos', -.3), ('A3', 'violas', .3)], .28, 1.8)
P(H['these'], 'D2', 4, .42); P(H['these'], 'A2', 4, .34)
# D. the objects: Dm - Gm - Dm - A, piano answers each feature with glass
t0 = VO['L04']['t']
for i, ch in enumerate(['Dm', 'Gm', 'Dm', 'Gm']): arp(t0 + i * 4 * BEAT, ch, 4, .24, .15, 1.0)
pad(H['drop1'], H['lift1'] - H['drop1'], [('D3', 'cellos', -.3), ('F4', 'violins', .3), ('A3', 'violas', 0)], .26, 1.2)
for k, n in (('faces', 'D6'), ('knob', 'F6'), ('hole', 'A6')): P(H[k], n, 2.5, .42, .25, 'glass', .7)
P(H['notSame'], 'D2', 3.0, .55); P(H['notSame'], 'Eb3', 3.0, .34); P(H['notSame'], 'E6', 2.5, .45, -.2, 'glass', .7)
# E. measuring the Hertfordshire find: piano eighths on an A pedal
for i in range(int((H['lift2'] - H['drop2']) / (BEAT / 2))):
    P(H['drop2'] + i * BEAT / 2, ['A3', 'E4', 'A4', 'C5', 'E4', 'A4', 'D5', 'A4'][i % 8], BEAT * .8, .22 + .002 * i, .2 * (i % 2 * 2 - 1))
pad(H['drop2'], H['lift2'] - H['drop2'], [('A2', 'cellos', -.3), ('E3', 'violas', .3)], .24, 1.4)
P(H['mm82'], 'A5', 2.0, .48, .2, 'glass', .8); P(H['range'], 'E6', 2.0, .44, -.2, 'glass', .8)
# F. the size circles
P(H['golf'], 'D6', 2.0, .42, -.3, 'glass', .7); P(H['grapefruit'], 'D5', 2.5, .42, .3, 'glass', .7); P(H['grapefruit'], 'D3', 2.5, .34)
pad(VO['L08']['t'], VO['L08']['t1'] - VO['L08']['t'] + 1, [('F3', 'violas', 0), ('D3', 'cellos', -.2)], .22, 1.5)
# G. no text, no painting, no carving: three low notes
for k, n in (('noText', 'D3'), ('noPaint', 'C3'), ('noCarve', 'Bb2')): P(H[k], n, 2.4, .42); P(H[k], 'D5', 1.2, .22, .2)
pad(VO['L09']['t'], VO['L09']['t1'] - VO['L09']['t'] + 1, [('Bb2', 'cellos', -.3), ('F3', 'violas', .2), ('D4', 'violins', .3)], .24, 1.6)
# H. theories: a pizzicato on each, struck with low piano
for k, n in (('candle', 'A4'), ('survey', 'C5'), ('dice', 'D5'), ('knit', 'F5')): P(H[k], n, .6, .5, .2, 'violins_pizz', .8)
for i in range(4): P(H['problem'] + i * .45 + .3, ['D3', 'C3', 'Bb2', 'A2'][i], 1.2, .38)
pad(VO['L10']['t'], VO['L11']['t1'] - VO['L10']['t'], [('D3', 'cellos', -.3), ('A3', 'violas', .2)], .22, 2.0)
P(H['noTwo'], 'A5', 2.5, .42, 0, 'glass', .7)
# I. the catalogue: strings rise to the line, hold on "unclear"
pad(H['drop3'], H['lift3'] - H['drop3'], [('D3', 'cellos', -.3), ('A3', 'violas', -.1), ('F4', 'violins', .2), ('D5', 'violins', .4)], .30, 2.4, 1.8)
P(H['mention'], 'F5', 3.0, .44, .2, 'vibraphone_bowed', .8)
P(H['unclear'], 'E5', 3.0, .44, -.2, 'vibraphone_bowed', .8); P(H['unclear'], 'A2', 3.0, .4)
# J. coins: low, a soft timpani
P(H['hoards'], 'D3', 2.0, .32, 0, 'timpani', .55); P(H['hoards'], 'D2', 3.0, .4)
P(H['savings'], 'A2', 2.6, .38); P(H['savings'], 'F4', 1.6, .26, .2)
# K. ending: the theme, then D minor, held
t0 = VO['L14']['t']
for i, n in enumerate(['A4', 'F4', 'D4', 'E4', 'F4', 'E4', 'D4']): P(t0 + i * BEAT * 1.5, n, BEAT * 2.4, .30, .15 * (i % 2 * 2 - 1))
pad(t0, H['endCard'] - t0, LOW('D') + [('A3', 'violas', .2)], .26, 2.0, .6)
E = H['endCard']
for p in ['D2', 'A2', 'D3', 'F3', 'A3', 'D4']: P(E, p, 5.0, .42, 0)
pad(E, DUR - E, [('D3', 'cellos', -.3), ('A3', 'violas', -.1), ('F4', 'violins', .25), ('D5', 'violins', .1), ('D2', 'contrabass', 0)], .30, .3, 1.6)
P(E, 'A5', 4.5, .42, -.2, 'vibraphone_bowed', .7)

mus = S.render(EV, dur=DUR + 0.5, master=False)
mus = mus[:N] if len(mus) >= N else np.pad(mus, ((0, N - len(mus)), (0, 0)))
music += S.room(mus, size=.6, mix=.24).astype(np.float32)

# ---------------- foley ----------------
def glass_tap(v=1.0, pitch=1.0):
    d = .5; x = clack(1.6 * pitch, v); x = np.pad(x, (0, int(d * SR) - len(x)))
    r = sum(a * np.sin(2 * np.pi * f * pitch * t_(d)) * env_exp(d, tau) for f, a, tau in [(3150, .25, .09), (5230, .15, .05), (1870, .12, .12)])
    return norm(x * .8 + r * .5) * v
def paper(d=.45, v=1.0):
    return norm(bp(noise(d), 1800, 7000) * np.sin(np.pi * np.linspace(0, 1, int(round(d * SR)))) ** 1.5) * v
def tick(v=1.0):
    d = .05; x = bp(noise(d), 2500, 9000) * env_exp(d, .003) + np.sin(2 * np.pi * 2200 * t_(d)) * env_exp(d, .006) * .4
    return norm(x) * v
def starter(v=1.0):
    d = .07; return norm(hp(noise(d), 800) * env_exp(d, .006) + np.sin(2 * np.pi * 900 * t_(d)) * env_exp(d, .01) * .5) * v
def pen(d=.3, v=1.0):
    return norm(bp(noise(d), 2500, 6500) * (1 + .5 * np.sin(2 * np.pi * 37 * t_(d))) * np.sin(np.pi * np.linspace(0, 1, int(round(d * SR)))) ** .6) * v
def coin(v=1.0, f0=2800):
    d = .9; x = sum(a * np.sin(2 * np.pi * f * t_(d)) * env_exp(d, tau) for f, a, tau in [(f0, .5, .25), (f0 * 2.31, .3, .15), (f0 * 3.7, .2, .08), (f0 * .62, .25, .3)])
    return norm(x + bp(noise(d), 3000, 9000) * env_exp(d, .004) * .6) * v

for t0, v in [(0.0, .5), (0.12, .35), (0.2, .3), (0.32, .4), (0.42, .3)]: add(foley, starter(v), t0, .5, .35)
# a soft air move on each cut between worlds; the case glass on the museum shots; paper on the desk shots
CUTS, SHOTS = TL['cuts'], TL['shots']
for c, sh in zip(CUTS[1:-1], SHOTS[1:]):
    add(foley, whoosh(.5, .55), c - .25, .22, -.15)
    if sh in ('case', 'end'): add(foley, glass_tap(.5, 1.1), c + .4, .2, .1)
    if sh == 'card': add(foley, paper(.7, .7), c + .1, .2, .2)
for k in ('build', 'army', 'eat', 'mention'): add(foley, paper(1.0, .8), H[k] - 0.2, .22, .25)
for k in ('faces', 'knob', 'hole', 'notSame', 'mm82', 'range'): add(foley, tick(.7), H[k], .18, .2)
for i in range(4): add(foley, pen(.28, .9), H['problem'] + i * .45, .3, -.2)
for i, f in enumerate((2900, 3300, 2600)): add(foley, coin(.8, f), H['hoards'] + .1 + i * .13, .22, .3 * (i - 1))
for i in range(8): add(foley, tick(.6), H['index'] + 0.2 + i * 0.12, .2, .3)

# ---------------- beds: the light-table hum, on from the start ----------------
hum = sum(a * np.sin(2 * np.pi * f * tt + p) for f, a, p in [(100, .5, 0), (200, .35, 1), (300, .2, 2), (400, .12, 3), (1200, .03, 0)])
hum = hum * (1 + .1 * np.sin(2 * np.pi * .7 * tt)) + bp(noise(DUR + .5)[:N], 3000, 8000) * .05
on = seg(tt, H['lightOn'] - 0.25, H['lightOn']) * (1 - seg(tt, DUR - 1.5, DUR))
beds[:, 0] += (hum * on * .05).astype(np.float32); beds[:, 1] += (hum * on * .05).astype(np.float32)

# ---------------- voice ----------------
for v in TL['voice']:
    x, sr = sf.read(os.path.join(HERE, 'voice', 'out', v['id'] + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR)
    x = hp(compress(x / max(1e-6, np.abs(x).max()) * .9, thr=.22, ratio=3.0), 70)
    add(voice, x.astype(np.float32), v['t'], 1.0, 0)

# ---------------- mix ----------------
def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-12)
vo = voice.mean(1); env = np.convolve(np.abs(vo) > .02, np.ones(int(.25 * SR)) / (.25 * SR), 'same'); env = np.clip(env * 3, 0, 1)
duck = 1 - 0.45 * env
vr = rms(voice[np.abs(voice).max(1) > .01])
music *= (vr / rms(music[np.abs(music).max(1) > .005])) * 10 ** (-11 / 20)
music *= duck[:, None].astype(np.float32)
foley *= (vr / max(rms(foley[np.abs(foley).max(1) > .01]), 1e-6)) * 10 ** (-9 / 20)
beds *= (vr / max(rms(beds[np.abs(beds).max(1) > .002]), 1e-6)) * 10 ** (-24 / 20)
from scipy.signal import butter, sosfilt
hpf = butter(4, 38, 'high', fs=SR, output='sos')
for x in (music, foley, beds): x[:] = sosfilt(hpf, x, axis=0)
mix = music + foley + beds + voice
pk0 = np.abs(mix).max(); ceil = min(pk0, rms(mix) * 10 ** (11.5 / 20))
mix = np.stack([limit(mix[:, 0], ceil), limit(mix[:, 1], ceil)], 1).astype(np.float32)
peak = np.abs(mix).max(); mix *= .89 / peak
os.makedirs(os.path.join(HERE, 'out', 'stems'), exist_ok=True)
for nm, x in (('music', music), ('foley', foley), ('beds', beds), ('voice', voice)): sf.write(os.path.join(HERE, 'out', 'stems', nm + '.wav'), (x / peak * .89).astype(np.float32), SR)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
print('mix written', round(len(mix) / SR, 2), 's')
open(os.path.join(HERE, 'out', 'music_credits.txt'), 'w').write('\n'.join(S.credits(sorted({e[1] if isinstance(e, tuple) else e['inst'] for e in EV}))) + '\n')

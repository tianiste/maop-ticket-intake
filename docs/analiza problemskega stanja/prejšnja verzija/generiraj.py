import math, sys
R=74
X=[110,300,490,700,910,1100,1290]
N={
 'a1':(0,170,["Ni strukturiranega","obrazca","za prijavo"]),
 'a2':(0,340,["Ni preverjanja","popolnosti","ob oddaji"]),
 'a3':(0,510,["Oddajnik ne ve,","katere podatke","oddelek","potrebuje"]),
 'a4':(0,680,["Ni jasnega","pravila, kateri","oddelek je","pristojen"]),
 'b1':(1,255,["Zahtevki","prispejo s","premalo","informacijami"]),
 'b2':(1,595,["Zahtevek ni","takoj v pravem","oddelku"]),
 'c1':(2,170,["Prejemnik","mora dodatno","spraševati"]),
 'c2':(2,425,["Čakanje na","odgovor","oddajnika"]),
 'c3':(2,680,["Prestavljanje","med IT in","inženiringom"]),
 'p':(3,425,["Predolg čas","obravnave","zahtevkov"]),
 'd1':(4,170,["Reševanje se","začne","pozneje"]),
 'd2':(4,425,["Izgubljen","delovni čas","oddajnika in","reševalca"]),
 'd3':(4,680,["Nezadovolj-","stvo in","frustracija","zaposlenih"]),
 'e1':(5,170,["Kupci dlje","čakajo na","rešitev"]),
 'e2':(5,425,["Višji stroški","podpore"]),
 'e3':(5,680,["Manj časa za","razvoj in","uvajanje"]),
 'f1':(6,255,["Slabše","zadovoljstvo","kupcev"]),
 'f2':(6,595,["Slabša","konkurenčnost","podjetja"]),
}
E=[('a1','b1'),('a2','b1'),('a3','b1'),('a3','b2'),('a4','b2'),
   ('b1','c1'),('b1','c2'),('b2','c3'),
   ('c1','p'),('c2','p'),('c3','p'),
   ('p','d1'),('p','d2'),('p','d3'),
   ('d1','e1'),('d2','e2'),('d2','e3'),('d3','e2'),
   ('e1','f1'),('e2','f2'),('e3','f2')]
W,H=1400,800
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Calibri,\'Segoe UI\',Helvetica,Arial,sans-serif" font-size="15" fill="#222">',
 '<title>Slika analize problemskega stanja: predolg čas obravnave zahtevkov v podjetju MAOP</title>',
 '<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#222"/></marker></defs>',
 f'<rect width="{W}" height="{H}" fill="#fff"/>',
 f'<text x="{W/2}" y="40" text-anchor="middle" font-size="24" font-weight="bold">Analiza problemskega stanja: obravnava zahtevkov v podjetju MAOP</text>']
def c(k): col,y,_=N[k]; return X[col],y
for a,b in E:
    (x1,y1),(x2,y2)=c(a),c(b); d=math.hypot(x2-x1,y2-y1); ux,uy=(x2-x1)/d,(y2-y1)/d
    o.append(f'<line x1="{x1+ux*R:.1f}" y1="{y1+uy*R:.1f}" x2="{x2-ux*(R+1):.1f}" y2="{y2-uy*(R+1):.1f}" stroke="#222" stroke-width="1.6" marker-end="url(#ar)"/>')
for k,(col,y,lines) in N.items():
    x=X[col]; centre=k=='p'
    o.append(f'<circle cx="{x}" cy="{y}" r="{R}" fill="{"#c9dcf3" if centre else "#e6eef8"}" stroke="{"#1d5fa8" if centre else "#4a6c96"}" stroke-width="{3 if centre else 1.6}"/>')
    y0=y-(len(lines)-1)*9.5+5
    for i,l in enumerate(lines):
        o.append(f'<text x="{x}" y="{y0+i*19:.1f}" text-anchor="middle"{" font-weight=\"bold\"" if centre else ""}>{l}</text>')
o.append('</svg>')
open(sys.argv[1],'w').write('\n'.join(o))

"""Optional publication figures; requires matplotlib. Rebuild after glantan-report.cjs."""
import io
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "docs" / "glantan-combat"
data = json.loads((ROOT / "analysis.json").read_text())
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False, "svg.hashsalt": "glantan-study-v1"})
def save(fig, name):
    fig.savefig(ROOT / f"{name}.png", dpi=170)
    svg = io.StringIO()
    fig.savefig(svg, format="svg", metadata={"Date": None})
    (ROOT / f"{name}.svg").write_text("\n".join(line.rstrip() for line in svg.getvalue().splitlines()) + "\n")
names = {"warrior":"Warrior", "ranger":"Ranger", "healer":"Healer", "mage":"Mage", "necromancer":"Necromancer", "rattler":"Rattler", "mender":"Mender", "nightwing":"Nightwing", "thornling":"Thornling", "bulwark":"Bulwark", "binder":"Binder", "broodcap":"Broodcap", "husher":"Husher", "sporeling":"Sporeling", "siegebreaker":"Siegebreaker"}
heroes = [r for r in data["heroSynergies"] if r["passes"]]
enemy_selection = [("enemy-validation",["rattler","mender"]),("enemy-validation",["thornling","bulwark"]),("enemy-expanded-validation",["nightwing","mender"]),("enemy-natural-brood-validation",["binder","broodcap"]),("enemy-confirmation-300",["husher","bulwark"]),("enemy-confirmation-300",["sporeling","mender"]),("enemy-roles-validation",["binder","thornling"])]
enemies = [next(r for r in data["enemySynergies"] if r["dataset"]==dataset and r["pair"]==pair) for dataset,pair in enemy_selection]
fig, axes = plt.subplots(1,2,figsize=(12,5.1),gridspec_kw={"width_ratios":[1,1.25]},layout="constrained")
for ax, rows, title in zip(axes,[heroes,enemies],["Hero combinations · 100 paired starts","Monster combinations · 100–300 paired starts"]):
    for i,r in enumerate(rows):
        delta=100*r["delta"]; lo,hi=[100*x for x in r["pairedBootstrap95"]]
        ax.errorbar(delta,i,xerr=[[delta-lo],[hi-delta]],fmt="o",color="#246f68",capsize=4,markersize=6)
        ax.annotate(f"+{delta:.0f} pp",(hi+2,i),va="center",fontsize=9)
    ax.set_yticks(range(len(rows)),[" + ".join(names[t] for t in r["pair"]) for r in rows]);ax.invert_yaxis()
    ax.axvline(0,color="#687177",linewidth=.8);ax.axvline(15,color="#9d7b3d",linestyle="--",linewidth=1)
    ax.set_xlim(0,85);ax.set_title(title,loc="left",fontweight="bold",pad=18)
    ax.set_xlabel("Victory gain over the better pure army (percentage points)")
    ax.grid(axis="x",alpha=.15);ax.set_axisbelow(True)
fig.suptitle("Complementary armies already exist in the baseline",fontsize=16,fontweight="bold",x=.02,ha="left")
fig.supxlabel("Bars: paired-bootstrap 95% intervals. Dashed line: proposed 15-point target.\nEach row has its own fixed encounter; rows are not an army ranking. Timeouts are never victories.",fontsize=9)
save(fig,"synergies");plt.close(fig)

rates=np.array([[c["wins"]/c["n"] for c in row["cells"]] for row in data["progression"]])
fig,ax=plt.subplots(figsize=(7.5,5.2),layout="constrained")
im=ax.imshow(rates,vmin=0,vmax=1,cmap="YlGnBu",aspect="auto")
for i,row in enumerate(data["progression"]):
    for j,c in enumerate(row["cells"]):
        ax.text(j,i,f"{100*c['wins']/c['n']:.1f}%\n{c['timeouts']} timeouts",ha="center",va="center",color="white" if rates[i,j]>.6 else "#152833",fontsize=11)
ax.set_xticks(range(4),[1,3,5,6]);ax.set_yticks(range(4),[1,3,5,8]);ax.set_xlabel("Monster rank");ax.set_ylabel("Hero level")
ax.set_title("Progression changes outcomes in the expected direction",loc="left",fontsize=14,fontweight="bold",pad=16)
fig.colorbar(im,ax=ax,label="Hero victory share",fraction=.04,pad=.03)
fig.supxlabel("Same four-hero party and fixed enemy counts. Each cell: five encounter families × eight starts.\nBaseline rules; 100-second limit. Descriptive controlled results, not human campaign win rates.",fontsize=9)
save(fig,"progression");plt.close(fig)
print("Wrote synergy and progression PNG/SVG figures.")

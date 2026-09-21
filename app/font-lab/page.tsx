"use client";

import { CSSProperties, useState } from "react";
import styles from "./font-lab.module.css";

type Axes = { rowt: number; rong: number; chon: number };
type AxisKey = keyof Axes;
type Recipe = { name: string; use: string; text: string; axes: Axes };
type MotionMode = "all" | "rowt" | "rong" | "chon" | "threshold" | null;

const AXES: Array<{ key: AxisKey; title: string; stops: number[] }> = [
  { key: "rowt", title: "Weight", stops: [100, 500, 750, 1000] },
  { key: "rong", title: "Ronghua", stops: [250, 500, 750, 1000] },
  { key: "chon", title: "Inflation", stops: [250, 500, 750, 1000] },
];

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMBERS = "0123456789".split("");

const RECIPES: Recipe[] = [
  { name: "Default", use: "RONG", text: "Zebba", axes: { rowt: 0, rong: 1000, chon: 0 } },
  { name: "CHON 500", use: "Half inflation", text: "Afterglow", axes: { rowt: 0, rong: 0, chon: 500 } },
  { name: "CHON 1000", use: "Full inflation", text: "Squirrels", axes: { rowt: 0, rong: 0, chon: 1000 } },
  { name: "RONG + CHON 500", use: "Ronghua with half inflation", text: "Something", axes: { rowt: 0, rong: 1000, chon: 500 } },
  { name: "RONG + CHON 1000", use: "Ronghua with full inflation", text: "LOUD", axes: { rowt: 0, rong: 1000, chon: 1000 } },
];

function variation(axes: Axes) {
  return `"ROWT" ${axes.rowt}, "RONG" ${axes.rong}, "CHON" ${axes.chon}`;
}

function isolatedAxis(key: AxisKey, value: number): Axes {
  return {
    rowt: key === "rowt" ? value : 0,
    rong: key === "rong" ? value : 0,
    chon: key === "chon" ? value : 0,
  };
}

export default function FontLab() {
  const [specimen, setSpecimen] = useState("Something");
  const [axes, setAxes] = useState<Axes>({ rowt: 0, rong: 1000, chon: 0 });
  const [size, setSize] = useState(140);
  const [motion, setMotion] = useState<MotionMode>("all");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const specimenStyle = {
    fontVariationSettings: variation(axes),
    fontSize: `${size}px`,
    "--specimen-size": `${size}px`,
  } as CSSProperties;
  const css = `font-variation-settings: ${variation(axes)};`;

  function updateAxis(key: AxisKey, value: number) {
    setMotion(null);
    setAxes((current) => ({ ...current, [key]: value }));
  }

  function copyCss() {
    setCopyState("copied");
    void navigator.clipboard.writeText(css).catch(() => setCopyState("failed"));
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <main className={styles.lab}>
      <section className={styles.hero}>
        <p className={styles.micro}>Zebba variable typeface</p>
        <div className={styles.heroLine} style={{ fontVariationSettings: variation(axes) }}>
          It&apos;s a feature, not a bug
        </div>
        <p className={styles.micro}>Default · ROWT 0 / RONG 1000 / CHON 0</p>
      </section>

      <section className={styles.playground}>
        <textarea
          className={styles.specimen}
          aria-label="Specimen text"
          value={specimen}
          onChange={(event) => setSpecimen(event.target.value)}
          style={specimenStyle}
          data-motion={motion ?? undefined}
          rows={1}
          spellCheck={false}
        />

        <div className={styles.motionModes}>
          {(["all", "rowt", "rong", "chon", "threshold"] as const).map((mode) => (
            <button key={mode} data-active={motion === mode || undefined} onClick={() => setMotion(mode)}>
              {mode === "threshold" ? "350 TEST" : mode.toUpperCase()}
            </button>
          ))}
          <button data-active={!motion || undefined} onClick={() => setMotion(null)}>PAUSE</button>
        </div>

        <div className={styles.controlRow}>
          {AXES.map((axis) => (
            <label className={styles.control} key={axis.key}>
              <span>{axis.key.toUpperCase()}</span>
              <output>{axes[axis.key]}</output>
              <input
                type="range"
                min="0"
                max="1000"
                value={axes[axis.key]}
                onInput={(event) => updateAxis(axis.key, Number(event.currentTarget.value))}
                onChange={(event) => updateAxis(axis.key, Number(event.target.value))}
              />
            </label>
          ))}
          <label className={styles.control}>
            <span>SIZE</span>
            <output>{size}</output>
            <input
              type="range"
              min="36"
              max="260"
              value={size}
              onInput={(event) => { setMotion(null); setSize(Number(event.currentTarget.value)); }}
              onChange={(event) => { setMotion(null); setSize(Number(event.target.value)); }}
            />
          </label>
        </div>

        <button className={styles.copy} onClick={copyCss}>
          <code>{css}</code>
          <span>{copyState === "copied" ? "COPIED" : copyState === "failed" ? "COPY FAILED" : "COPY"}</span>
        </button>
        <p className={styles.fileDefault}>FVAR DEFAULT ROWT 350 · 350 TEST SWEEPS ROWT 250–450</p>
        {motion && <p className={styles.motionNote}>MOTION PREVIEW · PAUSE TO SET AND COPY A STATIC VALUE</p>}
      </section>

      <section className={styles.recipesSection}>
        <h2>Combinations</h2>
        <div className={styles.recipes}>
          {RECIPES.map((recipe) => (
            <article className={styles.recipe} key={recipe.name}>
              <div className={styles.recipeWord} style={{ fontVariationSettings: variation(recipe.axes) }}>
                {recipe.text}
              </div>
              <div className={styles.recipeMeta}>
                <div><h3>{recipe.name}</h3><p>{recipe.use}</p></div>
                <code>{variation(recipe.axes)}</code>
                <button onClick={() => { setMotion(null); setAxes(recipe.axes); }}>USE</button>
                <button onClick={() => {
                  void navigator.clipboard.writeText(`font-variation-settings: ${variation(recipe.axes)};`);
                }}>COPY</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.stylesSection}>
        <h2>Axes</h2>
        <div className={styles.axisColumns}>
          {AXES.map((axis) => (
            <div className={styles.axisColumn} key={axis.key}>
              <h3>{axis.title}</h3>
              <p>({axis.stops.length} stops)</p>
              <div className={styles.axisSamples}>
                {axis.stops.map((stop) => {
                  const sampleAxes = isolatedAxis(axis.key, stop);
                  return (
                    <button
                      key={stop}
                      onClick={() => { setMotion(null); setAxes(sampleAxes); }}
                      style={{ fontVariationSettings: variation(sampleAxes) }}
                    >
                      Zebba {stop}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sizes}>
        <h2>Sizes</h2>
        {[38, 72, 132].map((fontSize) => (
          <div
            className={styles.sizeLine}
            key={fontSize}
            style={{ fontSize: `${fontSize}px`, fontVariationSettings: variation(axes) }}
          >
            {specimen || "Zebba"}
            <small>{fontSize}</small>
          </div>
        ))}
      </section>

      <section className={styles.inUse}>
        <h2>In use</h2>
        <div className={styles.usageHeadline} style={{ fontVariationSettings: '"ROWT" 0, "RONG" 1000, "CHON" 500' }}>
          Xylo Phonic Rhythms
        </div>
        <div className={styles.usageColumns} style={{ fontVariationSettings: '"ROWT" 0, "RONG" 1000, "CHON" 0' }}>
          <p>Zebba begins with the familiar rhythm of Roboto Mono, then opens into weight, inflation and transformation. Use restrained values for reading and stronger combinations for display.</p>
          <p>Every axis can move continuously between its minimum and maximum. The same word can become quiet, soft, dense, swollen or deliberately strange without changing fonts.</p>
          <p>Copy a recipe as a starting point, or tune the sliders until the form fits your layout. Shorter words can usually carry more pressure than long paragraphs.</p>
        </div>
      </section>

      <section className={styles.glyphSection}>
        <h2>Letters</h2>
        <GlyphRow glyphs={UPPERCASE} axes={axes} />
        <GlyphRow glyphs={LOWERCASE} axes={axes} />
        <h2 className={styles.numberTitle}>Numbers</h2>
        <GlyphRow glyphs={NUMBERS} axes={axes} />
      </section>

      <footer className={styles.footer}>
        <span>ROWT 0–1000</span>
        <span>RONG 0–1000</span>
        <span>CHON 0–1000</span>
      </footer>
    </main>
  );
}

function GlyphRow({ glyphs, axes }: { glyphs: string[]; axes: Axes }) {
  return (
    <div className={styles.glyphRow} style={{ fontVariationSettings: variation(axes) }}>
      {glyphs.map((glyph) => <span key={glyph}>{glyph}</span>)}
    </div>
  );
}

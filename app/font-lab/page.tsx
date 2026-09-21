"use client";

import { CSSProperties, useState } from "react";
import styles from "./font-lab.module.css";

type Axes = { rowt: number; rong: number; chon: number };
type AxisKey = keyof Axes;
type Recipe = { name: string; use: string; text: string; axes: Axes };

const AXES: Array<{ key: AxisKey; title: string; stops: number[] }> = [
  { key: "rowt", title: "Weight", stops: [0, 100, 350, 500, 700, 1000] },
  { key: "rong", title: "Ronghua", stops: [0, 250, 500, 750, 1000] },
  { key: "chon", title: "Inflation", stops: [0, 250, 500, 750, 1000] },
];

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMBERS = "0123456789".split("");

const RECIPES: Recipe[] = [
  { name: "Soft title", use: "Headlines / short sentences", text: "Afterglow", axes: { rowt: 350, rong: 0, chon: 500 } },
  { name: "Light air", use: "Large editorial display", text: "Squirrels", axes: { rowt: 100, rong: 0, chon: 850 } },
  { name: "Dense label", use: "Labels / small emphatic type", text: "GOOD BAD WEIRD", axes: { rowt: 800, rong: 500, chon: 0 } },
  { name: "Ronghua", use: "Expressive notes / captions", text: "Something", axes: { rowt: 350, rong: 750, chon: 250 } },
  { name: "Heavy poster", use: "Posters / oversized words", text: "ZEBBA", axes: { rowt: 1000, rong: 300, chon: 650 } },
  { name: "Full pressure", use: "Short accents only", text: "LOUD", axes: { rowt: 1000, rong: 1000, chon: 1000 } },
];

function variation(axes: Axes) {
  return `"ROWT" ${axes.rowt}, "RONG" ${axes.rong}, "CHON" ${axes.chon}`;
}

function isolatedAxis(key: AxisKey, value: number): Axes {
  return {
    rowt: key === "rowt" ? value : 350,
    rong: key === "rong" ? value : 0,
    chon: key === "chon" ? value : 0,
  };
}

export default function FontLab() {
  const [specimen, setSpecimen] = useState("Something");
  const [axes, setAxes] = useState<Axes>({ rowt: 350, rong: 0, chon: 500 });
  const [size, setSize] = useState(140);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const specimenStyle = {
    fontVariationSettings: variation(axes),
    fontSize: `${size}px`,
    "--specimen-size": `${size}px`,
  } as CSSProperties;
  const css = `font-variation-settings: ${variation(axes)};`;

  function updateAxis(key: AxisKey, value: number) {
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
        <p className={styles.micro}>Designed from a Roboto Mono base · ROWT / RONG / CHON</p>
      </section>

      <section className={styles.origin}>
        <div className={styles.originStep}>
          <span>BASE</span>
          <strong style={{ fontVariationSettings: '"ROWT" 350, "RONG" 0, "CHON" 0' }}>Roboto Mono</strong>
          <small>unmodified</small>
        </div>
        <div className={styles.originArrow}>↓</div>
        <div className={styles.originStep}>
          <span>ROWT</span>
          <strong style={{ fontVariationSettings: '"ROWT" 1000, "RONG" 0, "CHON" 0' }}>Zebba weight</strong>
          <small>light 100 · regular 350 · bold 1000</small>
        </div>
        <div className={styles.originArrow}>↓</div>
        <div className={styles.originStep}>
          <span>CHON + RONG</span>
          <strong style={{ fontVariationSettings: '"ROWT" 700, "RONG" 500, "CHON" 700' }}>Inflate & transform</strong>
          <small>mix the axes to make the typeface yours</small>
        </div>
      </section>

      <section className={styles.playground}>
        <textarea
          className={styles.specimen}
          aria-label="Specimen text"
          value={specimen}
          onChange={(event) => setSpecimen(event.target.value)}
          style={specimenStyle}
          rows={1}
          spellCheck={false}
        />

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
              onInput={(event) => setSize(Number(event.currentTarget.value))}
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>
        </div>

        <button className={styles.copy} onClick={copyCss}>
          <code>{css}</code>
          <span>{copyState === "copied" ? "COPIED" : copyState === "failed" ? "COPY FAILED" : "COPY"}</span>
        </button>
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
                <button onClick={() => setAxes(recipe.axes)}>USE</button>
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
                      onClick={() => setAxes(sampleAxes)}
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
        <div className={styles.usageHeadline} style={{ fontVariationSettings: '"ROWT" 350, "RONG" 0, "CHON" 650' }}>
          Xylo Phonic Rhythms
        </div>
        <div className={styles.usageColumns} style={{ fontVariationSettings: '"ROWT" 500, "RONG" 180, "CHON" 100' }}>
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
        <span>ROWT 0 / 350 / 1000</span>
        <span>RONG 0 / 0 / 1000</span>
        <span>CHON 0 / 0 / 1000</span>
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

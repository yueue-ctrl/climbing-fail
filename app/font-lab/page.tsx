"use client";

import { CSSProperties, useState } from "react";
import styles from "./font-lab.module.css";

type Axes = { rowt: number; rong: number; chon: number };
type AxisKey = keyof Axes;

const AXES: Array<{ key: AxisKey; title: string; stops: number[] }> = [
  { key: "rowt", title: "Weight", stops: [0, 100, 350, 500, 700, 1000] },
  { key: "rong", title: "Ronghua", stops: [0, 250, 500, 750, 1000] },
  { key: "chon", title: "Inflation", stops: [0, 250, 500, 750, 1000] },
];

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMBERS = "0123456789".split("");

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
  const [axes, setAxes] = useState<Axes>({ rowt: 350, rong: 0, chon: 0 });
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
        <div className={styles.heroLine} style={{ fontVariationSettings: '"ROWT" 350, "RONG" 0, "CHON" 500' }}>
          It&apos;s a feature, not a bug
        </div>
        <p className={styles.micro}>3 axes · ROWT / RONG / CHON</p>
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

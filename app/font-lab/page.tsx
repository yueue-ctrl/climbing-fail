"use client";

import { CSSProperties, useMemo, useState } from "react";
import styles from "./font-lab.module.css";

type Axes = {
  rowt: number;
  rong: number;
  chon: number;
};

type Preset = Axes & {
  name: string;
  note: string;
};

const AXIS_STEPS = {
  rowt: [0, 350, 1000],
  rong: [0, 500, 1000],
  chon: [0, 500, 1000],
};

const PRESETS: Preset[] = [
  { name: "FILE DEFAULT", note: "The default values stored inside Zebba.", rowt: 350, rong: 0, chon: 0 },
  { name: "DESIGNER LIGHT", note: "The suggested Light value from the reference sheet.", rowt: 100, rong: 0, chon: 0 },
  { name: "WEIGHT MAX", note: "ROWT only.", rowt: 1000, rong: 0, chon: 0 },
  { name: "RONG MAX", note: "RONG only.", rowt: 350, rong: 1000, chon: 0 },
  { name: "INFLATION MID", note: "Half CHON.", rowt: 350, rong: 0, chon: 500 },
  { name: "INFLATION MAX", note: "CHON only.", rowt: 350, rong: 0, chon: 1000 },
  { name: "WEIGHT + RONG", note: "Two axes at maximum.", rowt: 1000, rong: 1000, chon: 0 },
  { name: "WEIGHT + INFLATION", note: "Two axes at maximum.", rowt: 1000, rong: 0, chon: 1000 },
  { name: "FULL PRESSURE", note: "All three axes at maximum.", rowt: 1000, rong: 1000, chon: 1000 },
];

function variation({ rowt, rong, chon }: Axes) {
  return `"ROWT" ${rowt}, "RONG" ${rong}, "CHON" ${chon}`;
}

function cssFor(axes: Axes, size: number) {
  return `font-family: "Zebba", sans-serif;\nfont-variation-settings: ${variation(axes)};\nfont-size: ${size}px;`;
}

export default function FontLab() {
  const [specimen, setSpecimen] = useState("The afterglow");
  const [axes, setAxes] = useState<Axes>({ rowt: 350, rong: 0, chon: 0 });
  const [size, setSize] = useState(112);
  const [copied, setCopied] = useState("");

  const atlas = useMemo(
    () => AXIS_STEPS.rowt.flatMap((rowt) =>
      AXIS_STEPS.rong.flatMap((rong) =>
        AXIS_STEPS.chon.map((chon) => ({ rowt, rong, chon })),
      ),
    ),
    [],
  );

  const previewStyle = {
    fontVariationSettings: variation(axes),
    fontSize: `${size}px`,
  } as CSSProperties;

  function copy(text: string, id: string) {
    setCopied(id);
    void navigator.clipboard.writeText(text).catch(() => setCopied(`${id}-error`));
    window.setTimeout(() => setCopied(""), 1200);
  }

  function setAxis(axis: keyof Axes, value: number) {
    setAxes((current) => ({ ...current, [axis]: value }));
  }

  return (
    <main className={styles.lab}>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>ZEBBA VARIABLE FONT / LOCAL LAB</p>
        <h1>TOUCH EVERY AXIS.</h1>
        <p className={styles.lede}>
          Test the font, compare the complete three-axis atlas, then copy production-ready CSS.
          This page is separate from the Climbing Fail interface.
        </p>
      </section>

      <section className={styles.workbench}>
        <div className={styles.specimenPanel}>
          <label className={styles.fieldLabel} htmlFor="specimen">TYPE YOUR SPECIMEN</label>
          <textarea
            id="specimen"
            className={styles.specimenInput}
            value={specimen}
            onChange={(event) => setSpecimen(event.target.value)}
            rows={2}
            spellCheck={false}
          />
          <div className={styles.liveSpecimen} style={previewStyle}>{specimen || "Zebba"}</div>
          <div className={styles.readout}>
            <span>ROWT {axes.rowt}</span>
            <span>RONG {axes.rong}</span>
            <span>CHON {axes.chon}</span>
            <span>SIZE {size}px</span>
          </div>
        </div>

        <aside className={styles.controls}>
          <AxisControl
            label="ROWT / RONGWEIGHT"
            value={axes.rowt}
            defaultValue={350}
            onChange={(value) => setAxis("rowt", value)}
          />
          <AxisControl
            label="RONG / RONGHUA"
            value={axes.rong}
            defaultValue={0}
            onChange={(value) => setAxis("rong", value)}
          />
          <AxisControl
            label="CHON / CHONGQI"
            value={axes.chon}
            defaultValue={0}
            onChange={(value) => setAxis("chon", value)}
          />
          <div className={styles.axisControl}>
            <div className={styles.axisHeading}>
              <label htmlFor="font-size">SIZE</label>
              <input
                id="font-size-number"
                aria-label="Font size value"
                type="number"
                min="24"
                max="220"
                value={size}
                onChange={(event) => setSize(Math.min(220, Math.max(24, Number(event.target.value))))}
              />
            </div>
            <input
              id="font-size"
              className={styles.range}
              type="range"
              min="24"
              max="220"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
            <div className={styles.scale}><span>24</span><span>220</span></div>
          </div>
          <button className={styles.copyMain} onClick={() => copy(cssFor(axes, size), "main")}>
            {copied === "main" ? "COPIED" : copied === "main-error" ? "COPY FAILED" : "COPY CURRENT CSS"}
          </button>
          <pre className={styles.code}>{cssFor(axes, size)}</pre>
        </aside>
      </section>

      <section className={styles.notes}>
        <div><b>FONT FILE RANGE</b><br />ROWT 0–1000 · DEFAULT 350<br />RONG 0–1000 · DEFAULT 0<br />CHON 0–1000 · DEFAULT 0</div>
        <div><b>REFERENCE-SHEET RANGE</b><br />Light is shown as ROWT 100.<br />This is a recommended design stop; the actual font still permits 0.</div>
        <div><b>HOW TO USE</b><br />Drag for live changes. Click a preset or atlas card to load it. Copy the CSS and paste it into any web project using Zebba.</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p>QUICK START</p>
          <h2>USEFUL STOPS</h2>
        </div>
        <div className={styles.presetGrid}>
          {PRESETS.map((preset) => (
            <article className={styles.preset} key={preset.name}>
              <div className={styles.presetSpecimen} style={{ fontVariationSettings: variation(preset) }}>{specimen || "Zebba"}</div>
              <h3>{preset.name}</h3>
              <p>{preset.note}</p>
              <code>{variation(preset)}</code>
              <div className={styles.presetActions}>
                <button onClick={() => setAxes({ rowt: preset.rowt, rong: preset.rong, chon: preset.chon })}>USE</button>
                <button onClick={() => copy(`font-variation-settings: ${variation(preset)};`, preset.name)}>
                  {copied === preset.name ? "COPIED" : copied === `${preset.name}-error` ? "FAILED" : "COPY"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p>3 × 3 × 3</p>
          <h2>COMPLETE AXIS ATLAS</h2>
          <p className={styles.sectionCopy}>
            Twenty-seven anchor combinations: ROWT uses 0 / 350 / 1000; RONG and CHON use 0 / 500 / 1000.
            Sliders above cover every value between these anchors.
          </p>
        </div>
        <div className={styles.atlas}>
          {atlas.map((item) => {
            const id = `${item.rowt}-${item.rong}-${item.chon}`;
            const atlasSize = 42 + Math.round(((item.rowt + item.rong + item.chon) / 3000) * 12);
            return (
              <button
                className={styles.atlasCard}
                key={id}
                onClick={() => setAxes(item)}
                title="Load this combination"
              >
                <span className={styles.atlasText} style={{ fontVariationSettings: variation(item), fontSize: `${atlasSize}px` }}>
                  {specimen || "Zebba"}
                </span>
                <span className={styles.atlasValues}>R {item.rowt} · O {item.rong} · C {item.chon}</span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>ZEBBA FONT LAB · VALUES READ FROM THE EMBEDDED FVAR TABLE</footer>
    </main>
  );
}

function AxisControl({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
}) {
  const id = label.split(" ")[0].toLowerCase();
  return (
    <div className={styles.axisControl}>
      <div className={styles.axisHeading}>
        <label htmlFor={id}>{label}</label>
        <input
          aria-label={`${label} value`}
          type="number"
          min="0"
          max="1000"
          value={value}
          onChange={(event) => onChange(Math.min(1000, Math.max(0, Number(event.target.value))))}
        />
      </div>
      <input
        id={id}
        className={styles.range}
        type="range"
        min="0"
        max="1000"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className={styles.scale}><span>MIN 0</span><span>DEFAULT {defaultValue}</span><span>MAX 1000</span></div>
    </div>
  );
}

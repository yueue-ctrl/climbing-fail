"use client";

import { CSSProperties, useState } from "react";
import styles from "./font-lab.module.css";

type Axes = { rowt: number; rong: number; chon: number };
type AxisKey = keyof Axes;
type MotionMode = "combo1" | "combo2" | "combo3" | "combo4" | "combo5" | null;
type Recipe = { name: string; text: string; motion: string; effect: MotionMode; axes: Axes };

const AXIS_KEYS: AxisKey[] = ["rowt", "rong", "chon"];
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMBERS = "0123456789".split("");

const RECIPES: Recipe[] = [
  { name: "ONE", text: "GRAVITY HAS LEFT THE CHAT", motion: "ROWT 0 TO 1000   RONG 1000   CHON 0", effect: "combo1", axes: { rowt: 1000, rong: 1000, chon: 0 } },
  { name: "TWO", text: "I MEANT TO DO THAT", motion: "ROWT 0   RONG 999   CHON 0 TO 1000", effect: "combo2", axes: { rowt: 0, rong: 999, chon: 1000 } },
  { name: "THREE", text: "PERFECT LANDING EVERY TIME", motion: "ROWT 0 TO 1000   RONG 1000   CHON 1000", effect: "combo3", axes: { rowt: 1000, rong: 1000, chon: 1000 } },
  { name: "FOUR", text: "MY FEET HAVE OTHER PLANS", motion: "ROWT 1000   RONG 1000   CHON 0 TO 1000", effect: "combo4", axes: { rowt: 1000, rong: 1000, chon: 1000 } },
  { name: "FIVE", text: "CLIMB HIGH FALL WITH STYLE", motion: "ROWT 1000   RONG 350 TO 999   CHON 0", effect: "combo5", axes: { rowt: 1000, rong: 999, chon: 0 } },
];

function variation(axes: Axes) {
  return `"ROWT" ${axes.rowt}, "RONG" ${axes.rong}, "CHON" ${axes.chon}`;
}

export default function FontLab() {
  const [specimen, setSpecimen] = useState("Roboto Mono\nZebba");
  const [axes, setAxes] = useState<Axes>({ rowt: 0, rong: 1000, chon: 0 });
  const [motion, setMotion] = useState<MotionMode>("combo1");

  const specimenStyle = { fontVariationSettings: variation(axes) } as CSSProperties;
  const css = `font-variation-settings: ${variation(axes)};`;

  function updateAxis(key: AxisKey, value: number) {
    setMotion(null);
    setAxes((current) => ({ ...current, [key]: value }));
  }

  function applyRecipe(recipe: Recipe) {
    setMotion(null);
    setAxes(recipe.axes);
    setSpecimen(recipe.text);
  }

  function copyCss(value = css) {
    void navigator.clipboard.writeText(value);
  }

  return (
    <main className={styles.lab} data-font-lab>
      <section className={styles.hero}>
        <p className={styles.micro}>ROBOTO MONO ZEBBA VARIABLE TYPEFACE</p>
        <div className={styles.heroLine}><span>ROBOTO MONO</span><span>ZEBBA</span></div>
        <p className={styles.micro}>DISPLAY TYPE FOR TITLES</p>
      </section>

      <section className={styles.playground}>
        <textarea
          id="font-lab-specimen"
          className={styles.specimen}
          aria-label="Specimen text"
          value={specimen}
          onChange={(event) => setSpecimen(event.target.value)}
          style={specimenStyle}
          rows={2}
          spellCheck={false}
        />

        <div className={styles.motionModes} aria-label="Animation modes">
          {RECIPES.map((recipe, index) => (
            <span key={recipe.name}>
              <input
                className={`${styles.modeInput} ${styles[`modeCombo${index + 1}`]}`}
                id={`mode-combo-${index + 1}`}
                type="radio"
                name="motion"
                checked={motion === recipe.effect}
                onChange={() => setMotion(recipe.effect)}
              />
              <label htmlFor={`mode-combo-${index + 1}`}>{recipe.name}</label>
            </span>
          ))}
          <span>
            <input className={`${styles.modeInput} ${styles.modePause}`} id="mode-pause" type="radio" name="motion" checked={motion === null} onChange={() => setMotion(null)} />
            <label htmlFor="mode-pause">PAUSE</label>
          </span>
        </div>

        <div className={styles.controlRow}>
          {AXIS_KEYS.map((key) => (
            <label className={styles.control} key={key}>
              <span>{key.toUpperCase()}</span>
              <output data-axis-output={key}>{axes[key]}</output>
              <input
                data-axis={key}
                type="range"
                min="0"
                max="1000"
                value={axes[key]}
                onInput={(event) => updateAxis(key, Number(event.currentTarget.value))}
                onChange={(event) => updateAxis(key, Number(event.target.value))}
              />
            </label>
          ))}
        </div>

        <a className={styles.download} href="/zebba-font-file.zip" download="zebba-font-file.zip">DOWNLOAD FONT FILE</a>
      </section>

      <section className={styles.recipesSection}>
        <h2>COMBINATIONS</h2>
        <div className={styles.recipes}>
          {RECIPES.map((recipe) => (
            <article className={styles.recipe} data-effect={recipe.effect} key={recipe.name}>
              <div className={styles.recipeWord}>{recipe.text}</div>
              <div className={styles.recipeMeta}>
                <div><h3>{recipe.name}</h3><p>{recipe.motion}</p></div>
                <button type="button" onClick={() => applyRecipe(recipe)}>USE</button>
                <button type="button" onClick={() => copyCss(`font-variation-settings: ${variation(recipe.axes)};`)}>COPY</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.glyphSection}>
        <h2>LETTERS</h2>
        <GlyphRow glyphs={UPPERCASE} />
        <GlyphRow glyphs={LOWERCASE} />
        <h2 className={styles.numberTitle}>NUMBERS</h2>
        <GlyphRow glyphs={NUMBERS} />
      </section>

      <section className={styles.visualTests}>
        <h2>VISUAL TESTS</h2>

        <article className={styles.outlineTests} aria-label="OUTLINE TESTS">
          <div className={styles.outlineOne}>FALL FIRST</div>
          <div className={styles.outlineTwo}>NO GRAVITY</div>
          <div className={styles.outlineThree}>UP AGAIN</div>
          <p>OUTLINE AXIS TESTS</p>
        </article>

        <article className={styles.typeWall}>
          <div>
            <span>NO GRAVITY NO GRAVITY</span>
            <span>CLIMB FALL CLIMB FALL</span>
            <span>UP DOWN UP DOWN</span>
            <span>FEET FIRST FEET FIRST</span>
            <span>FALL AGAIN FALL AGAIN</span>
          </div>
          <p>VARIABLE TYPE WALL</p>
        </article>

        <article className={styles.differenceTest}>
          <div aria-label="UP DOWN">
            <span>UP</span>
            <span>DOWN</span>
          </div>
          <p>FILL DIFFERENCE</p>
        </article>

        <article className={styles.tightLeading}>
          <div><span>NO</span><span>FEET</span><span>NO</span><span>PROBLEM</span></div>
          <p>TIGHT LINE HEIGHT</p>
        </article>

        <article className={styles.tightTracking}>
          <AsyncSameAxisWord text="HOLDONTIGHT" />
          <p>TIGHT LETTER SPACING</p>
        </article>

        <article className={styles.verticalTest}>
          <AxisWord text="FALL" />
          <p>VERTICAL TYPE</p>
        </article>

      </section>

      <section className={styles.mediaShowcase} aria-label="Roboto Mono Zebba videos">
        <video src="/variable-font-1.mp4" autoPlay loop muted playsInline preload="metadata" />
        <video src="/variable-font-2.mp4" autoPlay loop muted playsInline preload="metadata" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zebba-green-5.gif" alt="Roboto Mono Zebba variable font shown on phones" />
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerAxes}>
          <span>ROWT 0 TO 1000</span>
          <span>RONG 0 TO 1000</span>
          <span>CHON 0 TO 1000</span>
        </div>
        <div className={styles.labContact}>
          <p>© Yue Zhou / day.To.day Design / Roboto Mono Zebba. All rights reserved.</p>
          <a href="https://www.instagram.com/yue_yueyuez/">INS yue_yueyuez</a>
          <a href="mailto:fallonyueue@gmail.com">fallonyueue@gmail.com</a>
        </div>
      </footer>
    </main>
  );
}

function GlyphRow({ glyphs }: { glyphs: string[] }) {
  return <div className={styles.glyphRow}>{glyphs.map((glyph) => <span key={glyph}>{glyph}</span>)}</div>;
}

function AxisWord({ text, layer = 0, className = "" }: { text: string; layer?: number; className?: string }) {
  return (
    <span className={`${styles.axisWord} ${className}`} aria-label={text}>
      {Array.from(text).map((letter, index) => {
        const mode = ((index + layer) % 5) + 1;
        return (
          <span
            aria-hidden="true"
            className={`${styles.axisLetter} ${styles[`axisMode${mode}`]}`}
            key={`${letter}-${index}`}
            style={{
              "--axis-delay": `${-((index * 0.63) + (layer * 0.41))}s`,
              "--axis-duration": `${3.1 + ((index + layer) % 6) * 0.52}s`,
            } as CSSProperties}
          >
            {letter === " " ? "\u00a0" : letter}
          </span>
        );
      })}
    </span>
  );
}

function AsyncSameAxisWord({ text }: { text: string }) {
  return (
    <div className={styles.sameAxisWord} aria-label={text}>
      {Array.from(text).map((letter, index) => (
        <span
          aria-hidden="true"
          key={`${letter}-${index}`}
          style={{
            "--axis-delay": `${-index * 0.47}s`,
            "--axis-duration": `${3.2 + (index % 5) * 0.38}s`,
          } as CSSProperties}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

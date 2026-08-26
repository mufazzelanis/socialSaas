import { useEffect, useRef, useState } from 'react';
import { useAds } from '../context/AdContext';

// Ad-network embed codes are almost always an inline <script> that sets a
// config object (e.g. Adsterra's `atOptions`), followed by an external
// <script src="...invoke.js"> that reads it and calls document.write() to
// drop in its <iframe>. Two things break that for a script injected from
// React:
//   1. innerHTML/dangerouslySetInnerHTML never executes <script> tags at all
//      — the browser only runs a <script> that was created and attached via
//      the DOM API, which is why every node below is rebuilt that way.
//   2. document.write() called from a script added after the page already
//      finished parsing is silently ignored by the browser — which is
//      exactly what happens when it's injected here in a React effect.
//      Ad codes still lean on it constantly, so it's temporarily redirected
//      into this ad's own container instead of failing silently.
// Scripts run in order and external ones are awaited before moving to the
// next, since a later script often reads a global an earlier one set.
async function runAdCode(container, code) {
  const template = document.createElement('template');
  template.innerHTML = code;

  for (const node of Array.from(template.content.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      container.appendChild(document.createTextNode(node.textContent));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    if (node.tagName !== 'SCRIPT') {
      container.appendChild(node.cloneNode(true));
      continue;
    }

    await new Promise((resolve) => {
      const originalWrite = document.write;
      const originalWriteln = document.writeln;
      document.write = (html) => container.insertAdjacentHTML('beforeend', html);
      document.writeln = (html) => container.insertAdjacentHTML('beforeend', html + '\n');
      const restore = () => {
        document.write = originalWrite;
        document.writeln = originalWriteln;
        resolve();
      };

      const script = document.createElement('script');
      for (const attr of node.attributes) script.setAttribute(attr.name, attr.value);

      if (script.src) {
        script.onload = restore;
        script.onerror = restore;
        container.appendChild(script);
      } else {
        script.text = node.textContent;
        container.appendChild(script);
        restore();
      }
    });
  }
}

export default function AdSlot({ placement, className = '' }) {
  const { getAd } = useAds();
  const ad = getAd(placement);
  const code = ad?.code || null;
  const containerRef = useRef(null);
  // Optimistic until proven empty — an ad network (most commonly AdSense
  // before the site is approved) can return no fill at all, which would
  // otherwise leave a bare "Advertisement" label floating over nothing.
  // Skipped entirely for formats that never render inline content by design
  // (Adsterra Social Bar / Popunder / Direct Link) — see noVisibleOutput.
  const [hasFill, setHasFill] = useState(true);

  useEffect(() => {
    setHasFill(true);
    const container = containerRef.current;
    if (!code || !container) return undefined;

    let cancelled = false;
    container.innerHTML = '';

    runAdCode(container, code).then(() => {
      if (cancelled || ad?.noVisibleOutput) return;
      // The loader script finishing doesn't mean the ad itself has rendered
      // yet (it may still be waiting on its own iframe/network round trip),
      // so wait a bit longer before deciding nothing showed up.
      setTimeout(() => {
        if (!cancelled && container.offsetHeight < 2) setHasFill(false);
      }, 2000);
    });

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [code, ad?.noVisibleOutput]);

  if (!code || !hasFill) return null;

  return (
    <div className={`ad-slot ${className}`}>
      <span className="ad-slot-label">Advertisement</span>
      <div ref={containerRef} />
    </div>
  );
}

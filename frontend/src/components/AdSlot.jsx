import { useEffect, useRef, useState } from 'react';
import { useAds } from '../context/AdContext';

// Recursively clones a parsed DOM node into a fresh, live node. This exists
// only because <script> tags inserted via innerHTML/dangerouslySetInnerHTML
// never execute in the browser — AdSense/Adsterra embed codes rely on their
// <script> actually running, so each one is rebuilt with document.createElement
// and re-attached, which browsers DO execute.
function cloneLive(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  if (node.tagName === 'SCRIPT') {
    const script = document.createElement('script');
    for (const attr of node.attributes) script.setAttribute(attr.name, attr.value);
    script.text = node.textContent;
    return script;
  }

  const el = document.createElement(node.tagName);
  for (const attr of node.attributes) el.setAttribute(attr.name, attr.value);
  node.childNodes.forEach((child) => {
    const cloned = cloneLive(child);
    if (cloned) el.appendChild(cloned);
  });
  return el;
}

export default function AdSlot({ placement, className = '' }) {
  const { getAd } = useAds();
  const code = getAd(placement);
  const containerRef = useRef(null);
  // Optimistic until proven empty — an ad network (most commonly AdSense
  // before the site is approved) can return no fill at all, which would
  // otherwise leave a bare "Advertisement" label floating over nothing.
  const [hasFill, setHasFill] = useState(true);

  useEffect(() => {
    setHasFill(true);
    const container = containerRef.current;
    if (!code || !container) return undefined;

    container.innerHTML = '';
    const template = document.createElement('template');
    template.innerHTML = code;
    template.content.childNodes.forEach((node) => {
      const cloned = cloneLive(node);
      if (cloned) container.appendChild(cloned);
    });

    // Ad scripts render asynchronously (often into an iframe added a moment
    // later), so give it a few seconds before deciding nothing showed up.
    const timer = setTimeout(() => {
      if (container.offsetHeight < 2) setHasFill(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      container.innerHTML = '';
    };
  }, [code]);

  if (!code || !hasFill) return null;

  return (
    <div className={`ad-slot ${className}`}>
      <span className="ad-slot-label">Advertisement</span>
      <div ref={containerRef} />
    </div>
  );
}

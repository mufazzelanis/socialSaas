import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    const container = containerRef.current;
    if (!code || !container) return undefined;

    container.innerHTML = '';
    const template = document.createElement('template');
    template.innerHTML = code;
    template.content.childNodes.forEach((node) => {
      const cloned = cloneLive(node);
      if (cloned) container.appendChild(cloned);
    });

    return () => {
      container.innerHTML = '';
    };
  }, [code]);

  if (!code) return null;

  return (
    <div className={`ad-slot ${className}`}>
      <span className="ad-slot-label">Advertisement</span>
      <div ref={containerRef} />
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#c9a84c",
  "projectTitle": "Yero Financial Rebrand",
  "clientName": "Yero Financial",
  "year": "2024",
  "timeline": "6 Weeks",
  "ctaLabel": "Book a Discovery Call",
  "showMetrics": true
}/*EDITMODE-END*/;

function CaseStudyTweaks() {
  const TP   = window.TweaksPanel;
  const TS   = window.TweakSection;
  const TTxt = window.TweakText;
  const TCol = window.TweakColor;
  const TTog = window.TweakToggle;
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--gold-dark', tweaks.accentColor);

    const titleEl = document.querySelector('.hero-title');
    if (titleEl) {
      const parts = tweaks.projectTitle.split(' ');
      const last = parts.pop();
      titleEl.innerHTML = parts.join(' ') + ' <em>' + last + '</em>';
    }

    const metaVals = document.querySelectorAll('.hero-meta-value');
    if (metaVals[0]) metaVals[0].textContent = tweaks.clientName;
    if (metaVals[1]) metaVals[1].textContent = tweaks.year;
    if (metaVals[2]) metaVals[2].textContent = tweaks.timeline;

    const ctaBtn = document.querySelector('.cta-btn');
    if (ctaBtn && ctaBtn.childNodes[0]) ctaBtn.childNodes[0].textContent = tweaks.ctaLabel + ' ';

    const navCta = document.querySelector('.nav-cta');
    if (navCta) navCta.textContent = tweaks.ctaLabel;

    const metricsEl = document.querySelector('.metrics');
    if (metricsEl) metricsEl.style.display = tweaks.showMetrics ? 'grid' : 'none';
  }, [tweaks]);

  return (
    <TP title="Tweaks">
      <TS label="Content">
        <TTxt label="Project Title" value={tweaks.projectTitle} onChange={v => setTweak('projectTitle', v)} />
        <TTxt label="Client Name"   value={tweaks.clientName}   onChange={v => setTweak('clientName', v)} />
        <TTxt label="Year"          value={tweaks.year}         onChange={v => setTweak('year', v)} />
        <TTxt label="Timeline"      value={tweaks.timeline}     onChange={v => setTweak('timeline', v)} />
        <TTxt label="CTA Label"     value={tweaks.ctaLabel}     onChange={v => setTweak('ctaLabel', v)} />
      </TS>
      <TS label="Style">
        <TCol label="Accent / Gold" value={tweaks.accentColor} onChange={v => setTweak('accentColor', v)} />
      </TS>
      <TS label="Sections">
        <TTog label="Show Metrics" value={tweaks.showMetrics} onChange={v => setTweak('showMetrics', v)} />
      </TS>
    </TP>
  );
}

const tweaksRoot = document.createElement('div');
document.body.appendChild(tweaksRoot);
ReactDOM.createRoot(tweaksRoot).render(<CaseStudyTweaks />);

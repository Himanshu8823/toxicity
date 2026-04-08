import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './LandingPage.css';

const FEATURES = [
  {
    icon: '🔬',
    title: 'AI-Powered Analysis',
    desc: 'Uses RuBERT toxicity model fine-tuned on multilingual comment datasets for precise detection.',
  },
  {
    icon: '📊',
    title: 'Rich Visualizations',
    desc: 'Interactive charts showing toxicity distribution, label breakdown, and confidence scores.',
  },
  {
    icon: '⚡',
    title: 'Batch Processing',
    desc: 'Analyzes up to 200 comments simultaneously with smart rate-limit handling.',
  },
  {
    icon: '🛡️',
    title: 'Category Breakdown',
    desc: 'Identifies toxic, insult, threat, obscene, and identity-based hate speech separately.',
  },
];

const EXAMPLES = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/9bZkp7q19f0',
  'https://www.youtube.com/shorts/xyz123',
];

const TOXICITY_LABELS = [
  {
    icon: '✅',
    label: 'Non-Toxic',
    desc: 'Comments that do NOT contain insults, obscenities, or threats.',
    color: '#00e5a0',
  },
  {
    icon: '🗡',
    label: 'Insult',
    desc: 'Hostile or disrespectful language targeting individuals or groups.',
    color: '#ff6b35',
  },
  {
    icon: '🔞',
    label: 'Obscenity',
    desc: 'Inappropriate language, including profanity and explicit content.',
    color: '#ffd23f',
  },
  {
    icon: '⚠',
    label: 'Threat',
    desc: 'Violent or threatening language that expresses harmful intent.',
    color: '#c77dff',
  },
  {
    icon: '☠',
    label: 'Dangerous',
    desc: 'Inappropriate content that can harm reputation or promote harm.',
    color: '#ff2d55',
  },
];

const FAQS = [
  {
    q: 'How accurate is the toxicity detection?',
    a: 'Our RuBERT model is trained on multilingual datasets with ~90% accuracy on benchmark datasets. Accuracy varies by language and domain.',
  },
  {
    q: 'Can I analyze private videos or live streams?',
    a: 'Only videos with comments enabled and visible to the public can be analyzed. Private or membership-only videos cannot be accessed.',
  },
  {
    q: 'What is the maximum number of comments?',
    a: 'You can analyze up to 200 comments per request. Larger batches can be processed through multiple requests.',
  },
  {
    q: 'How long does analysis take?',
    a: 'Analysis typically takes 10-60 seconds depending on the number of comments. Real-time progress is shown during analysis.',
  },
  {
    q: 'Is my data stored or shared?',
    a: 'No. All analysis is done locally. Videos and comments are not stored on our servers or shared with third parties.',
  },
  {
    q: 'Can I export or download results?',
    a: 'Results are displayed interactively. You can take screenshots or use browser dev tools to export data.',
  },
];

export default function LandingPage({ onAnalysis, onNavigate }) {
  const [url, setUrl] = useState('');
  const [maxComments, setMaxComments] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.6 ? 345 : Math.random() > 0.5 ? 160 : 220,
    }));

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.opacity})`;
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const simulateProgress = () => {
    const steps = [
      [10, 'Extracting video ID...'],
      [25, 'Fetching video metadata...'],
      [45, 'Loading comments...'],
      [65, 'Running toxicity model...'],
      [85, 'Aggregating results...'],
      [95, 'Generating insights...'],
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i][0]);
        setProgressMsg(steps[i][1]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    return interval;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return setError('Please enter a YouTube URL');
    setError('');
    setLoading(true);
    setProgress(0);
    setProgressMsg('Initializing...');

    const progressInterval = simulateProgress();

    try {
      const { data } = await axios.post('/analyze-video', {
        url: url.trim(),
        maxComments,
      });
      clearInterval(progressInterval);
      setProgress(100);
      setProgressMsg('Done!');
      setTimeout(() => onAnalysis(data), 400);
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      setProgressMsg('');
      setError(err?.response?.data?.error || err?.response?.data?.details || 'Something went wrong. Check your API keys and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <canvas ref={canvasRef} className="bg-canvas" />

      {/* Gradient orbs */}
      <div className="orb orb-red" />
      <div className="orb orb-green" />
      <div className="orb orb-blue" />

      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">ToxiScan</span>
        </div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => onNavigate?.('about')}>About Us</button>
          <div className="nav-badge">Powered by HuggingFace</div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          AI Comment Intelligence
        </div>

        <h1 className="hero-title">
          <span className="title-line">Decode the</span>
          <span className="title-line accent-text">Toxicity</span>
          <span className="title-line">of YouTube</span>
        </h1>

        <p className="hero-subtitle">
          Paste any YouTube link and get an instant AI-powered analysis of comment toxicity,
          sentiment distribution, and harmful language patterns.
        </p>

        {/* Input Section */}
        <div className="input-section">
          <form onSubmit={handleSubmit} className="url-form">
            <div className="input-wrapper">
              <div className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
                </svg>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="url-input"
                disabled={loading}
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="clear-btn"
                  disabled={loading}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="options-row">
              <div className="option-group">
                <label className="option-label">Comments to analyze</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={maxComments}
                    onChange={(e) => setMaxComments(Number(e.target.value))}
                    className="slider"
                    disabled={loading}
                  />
                  <span className="slider-value">{maxComments}</span>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Analyzing
                  </span>
                ) : (
                  <span className="btn-content">
                    Analyze Now
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                )}
              </button>
            </div>

            {error && (
              <div className="error-box">
                <span>⚠</span> {error}
              </div>
            )}

            {loading && (
              <div className="progress-box">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="progress-meta">
                  <span className="progress-msg">{progressMsg}</span>
                  <span className="progress-pct font-mono">{progress}%</span>
                </div>
              </div>
            )}
          </form>

          <div className="example-urls">
            <span className="example-label">Try an example:</span>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                className="example-chip"
                onClick={() => setUrl(ex)}
                disabled={loading}
              >
                Example {i + 1}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="stats-bar">
        {[
          { val: 'RuBERT', label: 'Model' },
          { val: '5+', label: 'Toxicity Labels' },
          { val: '200', label: 'Max Comments' },
          { val: 'Real-time', label: 'Analysis' },
        ].map((s, i) => (
          <div key={i} className="stat-item">
            <span className="stat-val font-mono">{s.val}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title font-syne">How It Works</h2>
          <p className="section-sub">Advanced NLP pipeline for comment intelligence</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title font-syne">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <div className="card-number font-mono">0{i + 1}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Toxicity Labels Section */}
      <section className="labels-section">
        <div className="section-header">
          <h2 className="section-title font-syne">Understanding the 5 Toxicity Labels</h2>
          <p className="section-sub">Comprehensive classification of harmful content</p>
        </div>
        <div className="labels-grid">
          {TOXICITY_LABELS.map((label, i) => (
            <div key={i} className="label-card" style={{ borderLeftColor: label.color }}>
              <div className="label-card-icon" style={{ color: label.color }}>{label.icon}</div>
              <h3 className="label-card-title font-syne">{label.label}</h3>
              <p className="label-card-desc">{label.desc}</p>
              <div className="label-badge" style={{ background: label.color + '15', color: label.color, borderColor: label.color + '30' }}>
                Category
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="usecases-section">
        <div className="section-header">
          <h2 className="section-title font-syne">Use Cases</h2>
          <p className="section-sub">Industries leveraging comment toxicity analysis</p>
        </div>
        <div className="usecases-grid">
          {[
            { icon: '👥', title: 'Content Moderation', desc: 'Identify and filter harmful comments to maintain community standards.' },
            { icon: '📱', title: 'Community Management', desc: 'Monitor social media conversations and respond to toxic patterns quickly.' },
            { icon: '🔍', title: 'Research & Analytics', desc: 'Analyze toxicity trends across videos for sentiment and reputation tracking.' },
            { icon: '🎓', title: 'Education', desc: 'Study online harassment patterns and develop mitigation strategies.' },
            { icon: '🏢', title: 'Brand Safety', desc: 'Protect brand reputation by monitoring content associations.' },
            { icon: '⚖️', title: 'Policy Enforcement', desc: 'Enforce community guidelines and platform policies at scale.' },
          ].map((uc, i) => (
            <div key={i} className="usecase-card">
              <div className="usecase-icon">{uc.icon}</div>
              <h3 className="usecase-title font-syne">{uc.title}</h3>
              <p className="usecase-desc">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="section-header">
          <h2 className="section-title font-syne">Frequently Asked Questions</h2>
          <p className="section-sub">Get answers to common questions about ToxiScan</p>
        </div>
        <div className="faqs-list">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`faq-item ${expandedFaq === i ? 'expanded' : ''}`}
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
            >
              <div className="faq-header">
                <h3 className="faq-q font-syne">{faq.q}</h3>
                <div className="faq-toggle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {expandedFaq === i && (
                <div className="faq-body">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title font-syne">Ready to Clean Up Your Comments?</h2>
          <p className="cta-desc">Start analyzing toxic comments on any YouTube video in seconds.</p>
          <button
            className="cta-btn"
            onClick={() => {
              document.querySelector('.hero')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Go to Analyzer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">
          <span className="logo-icon">◈</span>
          <span>ToxiScan</span>
        </div>
        <div className="footer-content">
          <p className="footer-text">
            Built with <strong>React</strong> + <strong>Node.js</strong> · Powered by <strong>HuggingFace</strong>
          </p>
          <p className="footer-subtext">
            Model: <code>cointegrated/rubert-tiny-toxicity</code> — Advanced NLP for comment toxicity detection
          </p>
          <p className="footer-copyright">© 2026 ToxiScan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

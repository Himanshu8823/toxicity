import React, { useEffect, useRef } from 'react';
import './AboutPage.css';

export default function AboutPage({ onBack }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.1,
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
  return (
    <div className="about-page">
      <canvas className="about-bg-canvas" />

      {/* Orbs */}
      <div className="orb orb-red" />
      <div className="orb orb-green" />
      <div className="orb orb-blue" />

      {/* Nav */}
      <nav className="about-nav">
        <button className="back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <div className="nav-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">ToxiScan</span>
        </div>
        <div style={{ width: '80px' }} />
      </nav>

      {/* Hero */}
      <section className="about-hero">
        <div className="hero-badge">About ToxiScan</div>
        <h1 className="hero-title font-syne">Cleaning the Internet, One Comment at a Time</h1>
        <p className="hero-subtitle">
          ToxiScan is an AI-powered platform dedicated to making online spaces safer by detecting and analyzing toxic comments on YouTube videos with advanced machine learning.
        </p>
      </section>

      {/* Mission Section */}
      <section className="section about-section">
        <div className="section-container">
          <div className="mission-grid">
            <div className="mission-card">
              <div className="mission-icon">🎯</div>
              <h3 className="mission-title font-syne">Our Mission</h3>
              <p>
                To empower content creators, researchers, and moderators with intelligent tools that detect and understand toxic online behavior, fostering healthier digital communities.
              </p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">🌍</div>
              <h3 className="mission-title font-syne">Our Vision</h3>
              <p>
                A future where AI-driven moderation systems protect free speech while eliminating harmful content, making the internet a safer place for everyone.
              </p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">💡</div>
              <h3 className="mission-title font-syne">Our Values</h3>
              <p>
                Transparency, accuracy, and user privacy. We believe in ethical AI that respects privacy while providing powerful insights into online behavior.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="section about-section">
        <div className="section-container">
          <div className="section-header-about">
            <h2 className="section-title font-syne">Powered by Cutting-Edge Technology</h2>
            <p className="section-sub">Advanced AI models and frameworks for accurate toxicity detection</p>
          </div>

          <div className="tech-grid">
            <div className="tech-card">
              <div className="tech-card-header">
                <div className="tech-icon">🤖</div>
                <h3 className="tech-title font-syne">RuBERT Model</h3>
              </div>
              <p className="tech-desc">
                State-of-the-art Russian BERT transformer model fine-tuned for multilingual toxicity detection with ~90% accuracy across diverse datasets.
              </p>
              <div className="tech-badges">
                <span className="badge">Fine-tuned</span>
                <span className="badge">Multilingual</span>
                <span className="badge">Production-Ready</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-card-header">
                <div className="tech-icon">🚀</div>
                <h3 className="tech-title font-syne">HuggingFace Integration</h3>
              </div>
              <p className="tech-desc">
                Direct integration with HuggingFace Inference API for fast, reliable model inference without managing infrastructure.
              </p>
              <div className="tech-badges">
                <span className="badge">Cloud-Based</span>
                <span className="badge">Scalable</span>
                <span className="badge">Low Latency</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-card-header">
                <div className="tech-icon">⚙️</div>
                <h3 className="tech-title font-syne">Modern Stack</h3>
              </div>
              <p className="tech-desc">
                Built with React for interactive UX, Node.js/Express for robust API, and real-time comment processing with intelligent batching.
              </p>
              <div className="tech-badges">
                <span className="badge">React 18</span>
                <span className="badge">Node.js</span>
                <span className="badge">Express</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Label System */}
      <section className="section about-section">
        <div className="section-container">
          <div className="section-header-about">
            <h2 className="section-title font-syne">Understanding Our 5-Category Classification</h2>
            <p className="section-sub">Comprehensive toxicity analysis based on RuBERT's trained categories</p>
          </div>

          <div className="labels-showcase">
            {[
              {
                emoji: '✅',
                label: 'Non-Toxic',
                color: '#00e5a0',
                desc: 'Comments that do NOT contain insults, obscenities, or threats. Safe and constructive content.',
              },
              {
                emoji: '🗡',
                label: 'Insult',
                color: '#ff6b35',
                desc: 'Hostile or disrespectful language targeting individuals or groups. Includes name-calling.',
              },
              {
                emoji: '🔞',
                label: 'Obscenity',
                color: '#ffd23f',
                desc: 'Inappropriate language including profanity, explicit references, and vulgar expressions.',
              },
              {
                emoji: '⚠',
                label: 'Threat',
                color: '#c77dff',
                desc: 'Violent or threatening language expressing intent to cause harm, violence, or injury.',
              },
              {
                emoji: '☠',
                label: 'Dangerous',
                color: '#ff2d55',
                desc: 'Inappropriate content that harms reputation, promotes discrimination, or violates community standards.',
              },
            ].map((item, i) => (
              <div key={i} className="label-showcase-card" style={{ borderLeftColor: item.color }}>
                <div className="showcase-emoji">{item.emoji}</div>
                <h3 className="showcase-label font-syne">{item.label}</h3>
                <p className="showcase-desc">{item.desc}</p>
                <div className="showcase-badge" style={{ background: item.color + '20', color: item.color }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section about-section">
        <div className="section-container">
          <div className="section-header-about">
            <h2 className="section-title font-syne">How ToxiScan Works</h2>
            <p className="section-sub">Three simple steps to analyze YouTube comments</p>
          </div>

          <div className="steps-container">
            {[
              {
                number: '01',
                title: 'Paste YouTube URL',
                desc: 'Enter any YouTube video URL (watch, shorts, or embed links). Specify how many comments to analyze (10-200).',
                icon: '🔗',
              },
              {
                number: '02',
                title: 'AI Analysis',
                desc: 'Our RuBERT model processes each comment through advanced NLP pipelines, classifying into 5 toxicity categories.',
                icon: '🧠',
              },
              {
                number: '03',
                title: 'Interactive Dashboard',
                desc: 'View detailed results with charts, filtered comments, confidence scores, and actionable insights.',
                icon: '📊',
              },
            ].map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-number font-mono">{step.number}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title font-syne">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="section about-section">
        <div className="section-container">
          <div className="section-header-about">
            <h2 className="section-title font-syne">Key Features</h2>
            <p className="section-sub">Powerful capabilities built for efficiency and accuracy</p>
          </div>

          <div className="features-matrix">
            {[
              { icon: '⚡', title: 'Real-Time Analysis', desc: 'Get results in seconds with optimized batch processing' },
              { icon: '📊', title: 'Rich Visualizations', desc: 'Interactive charts and breakdowns of toxicity distribution' },
              { icon: '🎯', title: '5-Category System', desc: 'Precise classification beyond simple toxic/non-toxic' },
              { icon: '🔒', title: 'Privacy First', desc: 'No data storage - all analysis is ephemeral and secure' },
              { icon: '📈', title: 'Confidence Scores', desc: 'Model confidence metrics for each classification' },
              { icon: '🌐', title: 'Multilingual Support', desc: 'Handles English and other languages effectively' },
            ].map((feature, i) => (
              <div key={i} className="feature-box">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-name font-syne">{feature.title}</h3>
                <p className="feature-text">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Privacy */}
      <section className="section about-section">
        <div className="section-container section-privacy">
          <h2 className="section-title font-syne">Your Privacy Matters</h2>
          <div className="privacy-content">
            <div className="privacy-item">
              <span className="privacy-check">✓</span>
              <div>
                <h4>No Data Storage</h4>
                <p>Comments and videos are processed in real-time and never stored on our servers.</p>
              </div>
            </div>
            <div className="privacy-item">
              <span className="privacy-check">✓</span>
              <div>
                <h4>Secure Transmission</h4>
                <p>All data is transmitted over encrypted HTTPS connections for protection.</p>
              </div>
            </div>
            <div className="privacy-item">
              <span className="privacy-check">✓</span>
              <div>
                <h4>No Third-Party Sharing</h4>
                <p>Your analysis data is never shared with external services or third parties.</p>
              </div>
            </div>
            <div className="privacy-item">
              <span className="privacy-check">✓</span>
              <div>
                <h4>API Keys Secure</h4>
                <p>YouTube and HuggingFace API keys are managed securely server-side.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Created By */}
      <section className="section about-section">
        <div className="section-container">
          <div className="creators-box">
            <h2 className="creators-title font-syne">Our Commitment</h2>
            <p className="creators-subtitle">
              ToxiScan is dedicated to making online spaces safer and more respectful. We believe in the power of technology to create positive change in digital communities.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="about-footer">
        <div className="footer-content-about">
          <p className="footer-text-about">© 2026 ToxiScan. Making YouTube safer.</p>
        </div>
      </footer>
    </div>
  );
}

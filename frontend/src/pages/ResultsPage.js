import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import './ResultsPage.css';

const CANONICAL_LABELS = ['non_toxic', 'insult', 'obscenity', 'threat', 'dangerous'];
const HARMFUL_LABELS = new Set(['insult', 'obscenity', 'threat', 'dangerous']);

const LABEL_COLORS = {
  non_toxic: '#4f9cfe',
  not_toxic: '#4f9cfe',
  toxic: '#ef4444',
  insult: '#f59e0b',
  threat: '#8b5cf6',
  obscene: '#10b981',
  obscenity: '#10b981',
  dangerous: '#ef4444',
  identity_hate: '#9333ea',
  severe_toxic: '#d946ef',
};

const LABEL_ICONS = {
  non_toxic: '✅',
  not_toxic: '✅',
  toxic: '☠',
  insult: '🗡',
  threat: '⚠',
  obscene: '🔞',
  obscenity: '🔞',
  dangerous: '☠',
  identity_hate: '🚫',
  severe_toxic: '💀',
};

function normalizeLabel(label) {
  const key = String(label || '').toLowerCase().replace(/[\s-]+/g, '_');

  if (key === 'non_toxic' || key === 'not_toxic' || key === 'normal' || key === 'neutral') {
    return 'non_toxic';
  }
  if (key === 'insult') return 'insult';
  if (key === 'obscene' || key === 'obscenity') return 'obscenity';
  if (key === 'threat') return 'threat';
  if (key === 'dangerous') return 'dangerous';
  if (key === 'toxic' || key === 'severe_toxic' || key === 'identity_hate') return 'dangerous';

  return 'dangerous';
}

function getColor(label) {
  const key = normalizeLabel(label);
  return LABEL_COLORS[key] || '#4d9fff';
}

function getIcon(label) {
  const key = normalizeLabel(label);
  return LABEL_ICONS[key] || '📊';
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{d.name || d.payload?.label}</div>
      <div className="tooltip-value" style={{ color: d.fill || d.color }}>
        {typeof d.value === 'number' ? `${d.value.toFixed(1)}%` : d.value}
      </div>
    </div>
  );
};

export default function ResultsPage({ data, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [commentFilter, setCommentFilter] = useState('all');
  const [commentSearch, setCommentSearch] = useState('');

  const { videoInfo, analysis } = data;

  // Normalize and aggregate label stats so all UI metrics use the same source of truth.
  const normalizedLabelStatsMap = (analysis.labelStats || []).reduce((acc, s) => {
    const label = normalizeLabel(s.label);
    const count = Number(s.count) || 0;
    const avgConfPercent = Number(s.avgConfidence) || 0;

    if (!acc[label]) {
      acc[label] = { label, count: 0, weightedConfidenceSum: 0 };
    }

    acc[label].count += count;
    acc[label].weightedConfidenceSum += avgConfPercent * count;
    return acc;
  }, {});

  const normalizedLabelStats = Object.values(normalizedLabelStatsMap);
  const analyzedCount =
    normalizedLabelStats.reduce((sum, s) => sum + s.count, 0) || Number(analysis.totalAnalyzed) || 0;
  const toxicCount = normalizedLabelStats
    .filter((s) => HARMFUL_LABELS.has(s.label))
    .reduce((sum, s) => sum + s.count, 0);
  const cleanCount = normalizedLabelStats
    .filter((s) => s.label === 'non_toxic')
    .reduce((sum, s) => sum + s.count, 0);

  const displayLabelStats = normalizedLabelStats
    .map((s) => ({
      label: s.label,
      count: s.count,
      percentage: analyzedCount > 0 ? ((s.count / analyzedCount) * 100).toFixed(1) : '0.0',
      avgConfidence:
        s.count > 0 ? (s.weightedConfidenceSum / s.count).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.count - a.count);

  // Toxicity gauge value
  const toxScore = analyzedCount > 0 ? Number(((toxicCount / analyzedCount) * 100).toFixed(1)) : 0;
  const toxColor =
    toxScore < 20 ? '#00e5a0' : toxScore < 50 ? '#ffd23f' : toxScore < 75 ? '#ff6b35' : '#ff2d55';

  // Pie chart data
  const pieData = displayLabelStats.map((s) => ({
    name: s.label.replace(/_/g, ' ').toUpperCase(),
    value: parseFloat(s.percentage),
    label: s.label,
    count: s.count,
  }));

  // Bar chart data
  const barData = displayLabelStats.map((s) => ({
    label: s.label.replace(/_/g, ' '),
    count: s.count,
    confidence: parseFloat(s.avgConfidence),
  }));

  // Radial gauge data
  const radialData = [
    { name: 'Toxicity', value: toxScore, fill: toxColor },
    { name: 'Confidence', value: parseFloat(analysis.avgConfidence), fill: '#4d9fff' },
  ];

  // Filter comments
  const allResults = analysis.allResults.filter((r) => !r.error);
  const filterLabels = ['all', ...CANONICAL_LABELS];
  const labelCountMap = allResults.reduce((acc, r) => {
    const normalized = normalizeLabel(r.mostLikelyCategory);
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});

  const filteredComments = allResults.filter((r) => {
    const normalized = normalizeLabel(r.mostLikelyCategory);
    const matchesFilter = commentFilter === 'all' || normalized === commentFilter;
    const matchesSearch = !commentSearch || r.text.toLowerCase().includes(commentSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="results-page">
      {/* Orbs */}
      <div className="orb orb-red" />
      <div className="orb orb-green" />

      {/* Top Nav */}
      <nav className="results-nav">
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
        <div className="nav-badge font-mono">Analysis Complete</div>
      </nav>

      {/* Video Info */}
      <div className="video-banner">
        {videoInfo.thumbnail ? (
          <img src={videoInfo.thumbnail} alt="thumbnail" className="video-thumb" />
        ) : (
          <div className="video-thumb video-thumb-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
            </svg>
          </div>
        )}
        <div className="video-meta">
          <div className="video-channel font-mono">{videoInfo.channelName}</div>
          <h2 className="video-title">{videoInfo.title}</h2>
          <div className="video-stats">
            <span>👁 {videoInfo.viewCount} views</span>
            <span>💬 {videoInfo.commentCount} comments</span>
            <span>🔬 {analysis.totalAnalyzed} analyzed</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-wrapper">
        <div className="tabs">
          {['overview', 'charts', 'comments'].map((t) => (
            <button
              key={t}
              className={`tab ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'overview' ? '📊 Overview' : t === 'charts' ? '📈 Charts' : '💬 Comments'}
            </button>
          ))}
        </div>
      </div>

      <div className="results-body">
        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card kpi-main" style={{ '--accent': toxColor }}>
                <div className="kpi-label font-mono">Overall Toxicity</div>
                <div className="kpi-value" style={{ color: toxColor }}>{toxScore}%</div>
                <div className="kpi-sub">
                  {toxScore < 20 ? 'Very Healthy 🌿' : toxScore < 50 ? 'Moderate ⚡' : toxScore < 75 ? 'Concerning 🔥' : 'Very Toxic ☠'}
                </div>
                <div className="kpi-bar">
                  <div className="kpi-fill" style={{ width: `${toxScore}%`, background: toxColor }} />
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label font-mono">Analyzed</div>
                <div className="kpi-value kpi-blue">{analyzedCount}</div>
                <div className="kpi-sub">comments processed</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label font-mono">Toxic Comments</div>
                <div className="kpi-value kpi-red">{toxicCount}</div>
                <div className="kpi-sub">harmful detected</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label font-mono">Avg. Confidence</div>
                <div className="kpi-value kpi-purple">{analysis.avgConfidence}%</div>
                <div className="kpi-sub">model certainty</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label font-mono">Clean Comments</div>
                <div className="kpi-value kpi-green">{cleanCount}</div>
                <div className="kpi-sub">non-toxic comments</div>
              </div>
            </div>

            {/* Label breakdown */}
            <div className="section-card">
              <h3 className="section-card-title font-syne">Category Breakdown</h3>
              <div className="label-list">
                {displayLabelStats.map((s, i) => (
                    <div key={i} className="label-row">
                      <div className="label-icon">{getIcon(s.label)}</div>
                      <div className="label-name">{s.label.replace(/_/g, ' ')}</div>
                      <div className="label-bar-wrap">
                        <div
                          className="label-bar-fill"
                          style={{
                            width: `${s.percentage}%`,
                            background: getColor(s.label),
                          }}
                        />
                      </div>
                      <div className="label-stats font-mono">
                        <span style={{ color: getColor(s.label) }}>{s.percentage}%</span>
                        <span className="label-count">({s.count})</span>
                        <span className="label-conf">{s.avgConfidence}% conf</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Toxic Comments */}
            {analysis.mostToxicComments && analysis.mostToxicComments.filter((c) => {
              const normalized = normalizeLabel(c.mostLikelyCategory);
              return HARMFUL_LABELS.has(normalized);
            }).length > 0 && (
              <div className="section-card">
                <h3 className="section-card-title font-syne">Most Toxic Comments</h3>
                <div className="toxic-list">
                  {analysis.mostToxicComments
                    .filter((c) => {
                      const normalized = normalizeLabel(c.mostLikelyCategory);
                      return HARMFUL_LABELS.has(normalized);
                    })
                    .map((c, i) => (
                    <div key={i} className="toxic-item">
                      <div className="toxic-rank font-mono">#{i + 1}</div>
                      <div className="toxic-body">
                        <p className="toxic-text">{c.text.length > 200 ? c.text.slice(0, 200) + '…' : c.text}</p>
                        <div className="toxic-meta">
                          <span className="toxic-badge" style={{ background: getColor(c.mostLikelyCategory) + '22', color: getColor(c.mostLikelyCategory), borderColor: getColor(c.mostLikelyCategory) + '44' }}>
                            {getIcon(c.mostLikelyCategory)} {normalizeLabel(c.mostLikelyCategory).replace(/_/g, ' ')}
                          </span>
                          <span className="toxic-conf font-mono">{(c.confidence * 100).toFixed(1)}% confidence</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHARTS TAB ── */}
        {activeTab === 'charts' && (
          <div className="tab-content">
            <div className="charts-grid">
              {/* Pie Chart */}
              <div className="section-card chart-card">
                <h3 className="section-card-title font-syne">Category Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={getColor(entry.label)} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span style={{ color: '#8888aa', fontSize: '0.78rem' }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Radial */}
              <div className="section-card chart-card">
                <h3 className="section-card-title font-syne">Health Metrics</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius={40}
                    outerRadius={120}
                    data={radialData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      minAngle={15}
                      background={{ fill: '#f1f5f9' }}
                      clockWise
                      dataKey="value"
                      cornerRadius={6}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span style={{ color: '#495057', fontSize: '0.78rem' }}>{v}</span>}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="radial-labels">
                  <div className="radial-item">
                    <div className="radial-dot" style={{ background: toxColor }} />
                    <span>Toxicity: <strong style={{ color: toxColor }}>{toxScore}%</strong></span>
                  </div>
                  <div className="radial-item">
                    <div className="radial-dot" style={{ background: '#4d9fff' }} />
                    <span>Confidence: <strong style={{ color: '#4d9fff' }}>{analysis.avgConfidence}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="section-card chart-card chart-full">
                <h3 className="section-card-title font-syne">Comment Count by Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fill: '#495057', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#495057', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10 }}
                      labelStyle={{ color: '#495057' }}
                      itemStyle={{ color: '#495057' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count">
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={getColor(entry.label)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Confidence Bar Chart */}
              <div className="section-card chart-card chart-full">
                <h3 className="section-card-title font-syne">Average Confidence per Category (%)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fill: '#495057', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#495057', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10 }}
                      labelStyle={{ color: '#495057' }}
                      itemStyle={{ color: '#495057' }}
                    />
                    <Bar dataKey="confidence" radius={[6, 6, 0, 0]} name="Avg Confidence %">
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={getColor(entry.label)} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── COMMENTS TAB ── */}
        {activeTab === 'comments' && (
          <div className="tab-content">
            <div className="comments-toolbar">
              <div className="search-wrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search comments..."
                  value={commentSearch}
                  onChange={(e) => setCommentSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-pills">
                {filterLabels.map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${commentFilter === f ? 'active' : ''}`}
                    onClick={() => setCommentFilter(f)}
                  >
                    {f === 'all'
                      ? `All (${allResults.length})`
                      : `${f.replace(/_/g, ' ')} (${labelCountMap[f] || 0})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="comments-list">
              {filteredComments.length === 0 ? (
                <div className="empty-state">No comments match your filter.</div>
              ) : (
                filteredComments.map((c, i) => {
                  const normalized = normalizeLabel(c.mostLikelyCategory);
                  const isToxic = HARMFUL_LABELS.has(normalized);
                  const color = getColor(normalized);
                  return (
                    <div key={i} className={`comment-card ${isToxic ? 'is-toxic' : 'is-clean'}`}>
                      <div className="comment-text">{c.text}</div>
                      <div className="comment-footer">
                        <span className="comment-badge" style={{ background: color + '20', color, borderColor: color + '40' }}>
                          {getIcon(normalized)} {normalized.replace(/_/g, ' ')}
                        </span>
                        <div className="comment-conf-bar">
                          <div className="conf-fill" style={{ width: `${(c.confidence * 100).toFixed(0)}%`, background: color }} />
                        </div>
                        <span className="comment-conf font-mono" style={{ color }}>
                          {(c.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

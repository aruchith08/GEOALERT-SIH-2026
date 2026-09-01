'use client';

import React, { useEffect, useState } from 'react';
import { BlockRiskSummary } from '@/lib/types';
import { fetchGridSummary } from '@/lib/api';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, MapPin, RefreshCw } from 'lucide-react';

export default function AnalyticsPage() {
  const [summaries, setSummaries] = useState<BlockRiskSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchGridSummary();
        setSummaries(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GEOALERT Analytics &bull; Regional Risk Synthesis
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
            Section 34 Spatial Aggregation
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Aggregated spatial statistics across 5 regional blocks in Meghalaya. Vulnerability ranking is calculated from dual-model multiplicative risk scores.
        </p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-sm bg-white/70 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Synthesizing Regional Block Statistics...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Block Level Summary Table */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Regional Spatial Block Aggregations (3,156 Total Cells)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Spatial Block</th>
                    <th className="py-2.5 px-3">Total Cells (N)</th>
                    <th className="py-2.5 px-3">Mean P(S)</th>
                    <th className="py-2.5 px-3">Mean P(D)</th>
                    <th className="py-2.5 px-3">Mean Risk</th>
                    <th className="py-2.5 px-3">Max Risk</th>
                    <th className="py-2.5 px-3">Orange+Red %</th>
                    <th className="py-2.5 px-3">Risk Tier Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {summaries.map((b) => (
                    <tr key={b.spatial_block_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {b.spatial_block_name}
                      </td>
                      <td className="py-3 px-3 font-semibold">{b.total_grid_cells_N}</td>
                      <td className="py-3 px-3 text-indigo-700 font-bold">{b.mean_static_susceptibility_P_S.toFixed(4)}</td>
                      <td className="py-3 px-3 text-sky-700 font-bold">{b.mean_dynamic_trigger_P_D.toFixed(4)}</td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">{b.mean_coupled_risk_score.toFixed(4)}</td>
                      <td className="py-3 px-3 text-red-600 font-extrabold">{b.max_coupled_risk_score.toFixed(4)}</td>
                      <td className="py-3 px-3 font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.high_risk_percentage > 5 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {b.high_risk_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className="text-emerald-700">{b.level_1_green_count}G</span> &bull;
                          <span className="text-amber-600">{b.level_2_yellow_count}Y</span> &bull;
                          <span className="text-orange-600">{b.level_3_orange_count}O</span> &bull;
                          <span className="text-red-600">{b.level_4_red_count}R</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regional Vulnerability Ranking Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                Vulnerability Ranking (% Critical Cells)
              </h3>
              <div className="space-y-2.5 font-mono text-xs">
                {summaries
                  .slice()
                  .sort((a, b) => b.high_risk_percentage - a.high_risk_percentage)
                  .map((b, idx) => (
                    <div key={b.spatial_block_name} className="space-y-1">
                      <div className="flex justify-between text-slate-700 font-semibold">
                        <span>#{idx + 1} {b.spatial_block_name}</span>
                        <strong className="text-slate-900">{b.high_risk_percentage.toFixed(1)}%</strong>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                          style={{ width: `${Math.min(b.high_risk_percentage * 6, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Maximum Spatial Risk by Block
              </h3>
              <div className="space-y-2.5 font-mono text-xs">
                {summaries
                  .slice()
                  .sort((a, b) => b.max_coupled_risk_score - a.max_coupled_risk_score)
                  .map((b) => (
                    <div key={b.spatial_block_name} className="space-y-1">
                      <div className="flex justify-between text-slate-700 font-semibold">
                        <span>{b.spatial_block_name}</span>
                        <strong className="text-red-600">{b.max_coupled_risk_score.toFixed(4)}</strong>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{ width: `${b.max_coupled_risk_score * 200}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';
import { 
  LayoutGrid, Users, Activity, MapPin, 
  Zap, Eye, GitMerge, FileText, Settings, 
  ChevronRight, Building2, Droplet, Pill
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const sections = [
    {
      heading: 'CLINICAL COMMAND',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'capacity', label: 'Hospital Capacity', icon: Building2, badge: 'SURGE' },
        { id: 'bloodbank', label: 'Blood Bank Network', icon: Droplet, badge: 'HEMO' },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'pharmacy', label: 'Pharmacy', icon: Pill, badge: 'RX' },
        { id: 'triage', label: 'Triage Queue', icon: Activity, badge: 'AUTO' },
        { id: 'map', label: 'GPS Radar', icon: MapPin },
      ]
    },
    {
      heading: 'HARDWARE & TELEMETRY',
      items: [
        { id: 'failover', label: 'Failover & TinyML', icon: Zap, badge: '500ms' },
        { id: 'eog', label: 'EOG & Bio-Security', icon: Eye, badge: '100Hz' },
      ]
    },
    {
      heading: 'INTELLIGENCE & AUDIT',
      items: [
        { id: 'timeline', label: 'Audit Timeline', icon: GitMerge },
        { id: 'reports', label: 'AI Reports', icon: FileText, badge: 'LLM' },
        { id: 'settings', label: 'Settings & Lab', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-[#14284b] via-[#1a3666] to-[#204482] text-white flex flex-col justify-between p-4 shrink-0 min-h-screen max-h-screen overflow-y-auto sticky top-0 select-none shadow-2xl border-r border-blue-900/30">
      
      {/* Top Profile / Brand */}
      <div>
        <div className="flex items-center gap-3 mb-6 px-3 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-white shadow-inner">
              <span className="text-xs font-mono font-black tracking-wider text-white">KZ</span>
            </div>
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute -bottom-0.5 -right-0.5 shadow-[0_0_8px_rgba(52,211,153,0.8)] border border-[#14284b]" />
          </div>
          <div>
            <h1 className="text-xs font-black text-white m-0 tracking-widest uppercase font-mono">KSHITIJ EMR</h1>
            <p className="text-[10px] text-blue-200/80 m-0 font-mono tracking-tight font-medium">TACTICAL BIO-CAPSULE OS</p>
          </div>
        </div>

        {/* Grouped Menu Navigation */}
        <nav className="space-y-4">
          {sections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-mono tracking-wider text-blue-300/60 font-semibold uppercase">
                {sec.heading}
              </div>

              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-md shadow-blue-950/40'
                        : 'text-blue-100/75 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white scale-105' : 'text-blue-200/70'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg shrink-0 font-bold ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-white/10 text-blue-200/80'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Tactical Officer Card */}
      <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/15 transition-all mt-4 border border-white/15">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-[10px] font-mono font-black text-white shadow-sm">
              FST
            </div>
            <span className="w-2 h-2 bg-emerald-400 rounded-full absolute -bottom-0.5 -right-0.5 shadow-[0_0_6px_rgba(52,211,153,0.8)] border border-[#14284b]" />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight font-mono">Forward Surg Team</div>
            <div className="text-[10px] text-blue-200/75 leading-tight font-mono">Bangalore Focal HQ</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-blue-200/70" />
      </div>

    </aside>
  );
}

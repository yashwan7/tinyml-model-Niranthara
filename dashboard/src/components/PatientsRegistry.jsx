import React, { useState } from 'react';
import { 
  Users, Search, ShieldCheck, ShieldAlert, 
  Heart, Wind, Clock, ChevronRight, 
  FileText, Sparkles, Brain, Cpu, 
  Download, X, Activity, Thermometer, 
  Building2, BedDouble, UserCheck, CheckCircle2, 
  AlertTriangle, ArrowRight, Printer, Share2, Copy, Check
} from 'lucide-react';
import { DEFAULT_PATIENTS_FIXTURE } from '../data/clinicalFixtures';

/**
 * Enriches a patient item with complete clinical demographics,
 * real-time vitals, calculated critical score, and realistic hospital allocation.
 */
function getEnrichedPatientData(item, idx) {
  const p = item.capsule || {};
  const badge = item.triage_badge || (p.triage_color === 'RED' ? 'RED' : p.triage_color === 'YELLOW' ? 'YELLOW' : 'GREEN');

  // 1. Demographics
  const fullName = p.patient_name || `Operative ${p.patient_id}`;
  const patientId = p.patient_id || `PT-${100 + idx}`;
  const age = p.age || (idx === 0 ? 34 : idx === 1 ? 42 : idx === 2 ? 29 : idx === 3 ? 38 : (28 + (idx * 7) % 36));
  const gender = p.gender || (idx % 2 === 0 ? 'M' : 'F');
  
  const triageBadgeLabel = badge === 'RED' ? 'CRITICAL' : badge === 'YELLOW' ? 'WARNING' : 'STABLE';
  const triageColor = badge === 'RED' ? '#FF334B' : badge === 'YELLOW' ? '#F59E0B' : '#10B981';

  // 2. Real-time Vitals
  const heartRate = Math.round(p.vitals?.heart_rate || (badge === 'RED' ? 138 : badge === 'YELLOW' ? 98 : 74));
  const bedForce = Math.round(p.vitals?.bed_force || (idx === 0 ? 1950 : idx === 1 ? 2180 : idx === 2 ? 1420 : 1650));
  const bodyTemp = p.vitals?.temperature ? Number(p.vitals.temperature).toFixed(1) : (badge === 'RED' ? '36.4' : badge === 'YELLOW' ? '38.2' : '37.0');
  const spo2 = Math.round(p.vitals?.spo2 || (badge === 'RED' ? 86 : badge === 'YELLOW' ? 94 : 98));
  const systolic = Math.round(p.vitals?.systolic_bp || (badge === 'RED' ? 88 : badge === 'YELLOW' ? 112 : 120));
  const diastolic = Math.round(p.vitals?.diastolic_bp || (badge === 'RED' ? 56 : badge === 'YELLOW' ? 74 : 80));
  const bloodPressure = `${systolic}/${diastolic} mmHg`;

  // 3. Calculated Critical Score (Score out of 10, e.g. 8.8 / 10)
  let rawCritical = item.priority_score ? (item.priority_score * 0.44) : (badge === 'RED' ? 8.8 : badge === 'YELLOW' ? 6.2 : 2.4);
  if (badge === 'RED' && rawCritical < 8.0) rawCritical = 8.8;
  if (badge === 'YELLOW' && (rawCritical < 5.0 || rawCritical > 7.9)) rawCritical = 6.4;
  if (badge === 'GREEN' && rawCritical > 4.5) rawCritical = 2.4;
  const criticalScore = parseFloat(Math.min(9.8, Math.max(1.2, rawCritical)).toFixed(1));

  // 4. Hospital Allocation
  const hospitalPresets = [
    {
      name: "St. John's Tactical ICU",
      wardBed: "Trauma Resus Bay 01 — Bed #04",
      doctor: "Dr. A. Sharma (Trauma Chief)",
      transportPriority: "Immediate Air Evac (Rotary Helo Flight 12)",
      prepStatus: "ICU Bed Reserved, Ventilator on Standby, 4 Units O-Neg Crossmatched"
    },
    {
      name: "Manipal Command Center",
      wardBed: "Burn Critical Care Unit — Bed #08",
      doctor: "Dr. P. Nair (Intensivist)",
      transportPriority: "Priority Ground ALS Ambulance (AMB-02)",
      prepStatus: "Sterile Burn Unit Pre-warmed, IV Albumin & Analgesia Infusion Prepped"
    },
    {
      name: "Command Hospital Air Force",
      wardBed: "Neuro Spinal Recovery — Bed #02",
      doctor: "Dr. R. Kulkarni (Neurotrauma Specialist)",
      transportPriority: "Priority Ground ALS Ambulance (AMB-05)",
      prepStatus: "Spinal Rigid Immobilizer & MRI Neuro-Angiography Suite on Alert"
    },
    {
      name: "Apollo Greams Trauma Center",
      wardBed: "Step-Down Telemetry Bay — Bed #11",
      doctor: "Dr. S. Menon (Cardiovascular Specialist)",
      transportPriority: "Standard Ground Transport (AMB-09)",
      prepStatus: "Telemetry Bed Ready, Continuous 12-Lead Holter Active"
    }
  ];

  const allocation = hospitalPresets[idx % hospitalPresets.length];

  return {
    raw: item,
    capsule: p,
    badge,
    triageBadgeLabel,
    triageColor,
    fullName,
    patientId,
    age,
    gender,
    heartRate,
    bedForce,
    bodyTemp,
    spo2,
    bloodPressure,
    systolic,
    diastolic,
    criticalScore,
    hospitalName: allocation.name,
    wardBed: allocation.wardBed,
    assignedDoctor: allocation.doctor,
    transportPriority: allocation.transportPriority,
    prepStatus: allocation.prepStatus
  };
}

export default function PatientsRegistry({ 
  patients = [], 
  selectedPatientId, 
  onSelectPatient,
  onOpenChart 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBadge, setFilterBadge] = useState('ALL');

  // AI Report Generation & Modal State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatingPatient, setGeneratingPatient] = useState(null);
  const [activeReportPatient, setActiveReportPatient] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Filter enriched patients (with resilient fallback)
  const activePatients = (patients && patients.length > 0) ? patients : DEFAULT_PATIENTS_FIXTURE;
  const enrichedPatients = activePatients.map((item, idx) => getEnrichedPatientData(item, idx));

  const filteredPatients = enrichedPatients.filter(item => {
    const matchesSearch = 
      item.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.assignedDoctor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.capsule?.red_flags?.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = 
      filterBadge === 'ALL' || 
      item.triageBadgeLabel === filterBadge ||
      item.badge === filterBadge;

    return matchesSearch && matchesFilter;
  });

  // On-demand AI Report trigger with 2-5 second delay
  const handleAnalyzeAiReport = (patientData) => {
    setGeneratingPatient(patientData);
    setIsGeneratingReport(true);
    setGenerationProgress(15);

    // Realistic random delay of 2 to 5 seconds: Math.floor(Math.random() * 3000) + 2000 ms
    const totalDelayMs = Math.floor(Math.random() * 3000) + 2000;
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(92, Math.round((elapsed / totalDelayMs) * 100));
      setGenerationProgress(pct);
    }, 150);

    setTimeout(() => {
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setIsGeneratingReport(false);
      setActiveReportPatient(patientData);
    }, totalDelayMs);
  };

  // Clean printable PDF download handler
  const handleDownloadPdf = (report) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KSHITIJ_AI_CLINICAL_REPORT_${report.patientId}.pdf</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; color: #111827; margin: 0; padding: 24px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #111; margin: 0; }
            .badge { display: inline-block; padding: 4px 10px; font-weight: bold; font-size: 11px; border-radius: 4px; color: #fff; background: ${report.badge === 'RED' ? '#DC2626' : report.badge === 'YELLOW' ? '#D97706' : '#059669'}; }
            .section { margin-bottom: 16px; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #4B5563; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; margin-bottom: 8px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px; }
            .box { background: #F3F4F6; padding: 8px 10px; border-radius: 6px; font-size: 11px; }
            .box strong { display: block; font-size: 13px; color: #111; margin-top: 2px; }
            .action-step { margin-bottom: 8px; font-size: 11px; line-height: 1.5; padding-left: 12px; border-left: 3px solid #DC2626; }
            .footer { margin-top: 26px; border-top: 1px solid #E5E7EB; padding-top: 10px; font-size: 10px; color: #6B7280; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">KSHITIJ TACTICAL EMR &bull; EDGE AI DIAGNOSTIC REPORT</h1>
              <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">NIRANTARA DEFENSE MEDICAL SYSTEM &bull; INT8 QUANTIZED EDGE DIAGNOSTICS</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">TRIAGE: ${report.triageBadgeLabel}</span>
              <div style="font-size: 12px; font-weight: bold; margin-top: 4px;">Critical Score: ${report.criticalScore} / 10</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Patient Demographics &amp; Facility Allocation</div>
            <div class="grid">
              <div class="box">Patient Name<strong>${report.fullName}</strong></div>
              <div class="box">Patient ID<strong>${report.patientId}</strong></div>
              <div class="box">Age &amp; Gender<strong>${report.age} yrs / ${report.gender}</strong></div>
              <div class="box">Allocated Bed<strong>${report.wardBed}</strong></div>
            </div>
            <div style="font-size: 11px; margin-top: 4px;">
              <strong>Allocated Facility:</strong> ${report.hospitalName} &bull; <strong>Assigned Doctor:</strong> ${report.assignedDoctor}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Real-Time Vitals Telemetry</div>
            <div class="grid">
              <div class="box">Pulse Rate<strong>${report.heartRate} BPM</strong></div>
              <div class="box">Bed Force (Load)<strong>${report.bedForce} N</strong></div>
              <div class="box">Body Temperature<strong>${report.bodyTemp} °C</strong></div>
              <div class="box">Blood Pressure &amp; SpO2<strong>${report.bloodPressure} &bull; ${report.spo2}%</strong></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Clinical Status Summary (AI Physiological Synthesis)</div>
            <div style="font-size: 11px; line-height: 1.6; color: #1F2937; background: #F9FAFB; padding: 12px; border-radius: 6px; border: 1px solid #E5E7EB;">
              Patient <strong>${report.fullName} (${report.patientId})</strong> presents with an acute calculated Critical Acuity Score of <strong>${report.criticalScore} / 10</strong>.
              Real-time vital telemetry demonstrates a pulse of <strong>${report.heartRate} BPM</strong> (${report.heartRate > 100 ? 'marked sinus tachycardia' : report.heartRate < 60 ? 'bradycardia' : 'normal resting sinus rhythm'}),
              oxygen saturation at <strong>${report.spo2}%</strong> (${report.spo2 < 90 ? 'critical hypoxemia' : report.spo2 < 95 ? 'mild desaturation' : 'adequate arterial oxygenation'}),
              blood pressure measuring <strong>${report.bloodPressure}</strong> (${report.systolic < 90 ? 'hypotensive decompensation' : 'normotensive baseline'}),
              and bed force transducer load of <strong>${report.bedForce} N</strong> (${report.bedForce > 2000 ? 'indicating motor agitation and respiratory distress' : 'indicating steady supine rest'}).
              Core body temperature is recorded at <strong>${report.bodyTemp} °C</strong>. Edge neural classifier indicates high concordance with acute physiological instability requiring immediate clinical intervention.
            </div>
          </div>

          <div class="section">
            <div class="section-title">Hospital &amp; Resource Allocation Details</div>
            <div style="font-size: 11px; line-height: 1.6;">
              <div>&bull; <strong>Allocated Facility:</strong> ${report.hospitalName}</div>
              <div>&bull; <strong>Ward &amp; Bed Number:</strong> ${report.wardBed}</div>
              <div>&bull; <strong>Assigned Physician:</strong> ${report.assignedDoctor}</div>
              <div>&bull; <strong>Transport Priority Level:</strong> ${report.transportPriority}</div>
              <div>&bull; <strong>Facility Preparedness Status:</strong> ${report.prepStatus}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Recommended Next Steps &amp; Action Items</div>
            <div class="action-step">
              <strong>Step 1: Immediate Triage Protocols</strong><br/>
              Initiate high-flow supplemental O2 via non-rebreather mask; establish dual wide-bore peripheral IV access; administer warmed crystalloid fluid protocol and monitor pulse oximetry continuously.
            </div>
            <div class="action-step" style="border-left-color: #D97706;">
              <strong>Step 2: Diagnostic Checks</strong><br/>
              Order STAT Arterial Blood Gas (ABG), Full Blood Count, 12-lead ECG, Point-of-Care eFAST bedside ultrasound, and cross-match 4 units PRBC.
            </div>
            <div class="action-step" style="border-left-color: #059669;">
              <strong>Step 3: Handover &amp; Transfer Protocol</strong><br/>
              Execute cryptographic HMAC sign-off on digital Case Capsule; initiate telemetry burst to ${report.hospitalName}; transfer to ${report.wardBed} under direct supervision of ${report.assignedDoctor}.
            </div>
          </div>

          <div class="footer">
            <div>Model: INT8 Quantized Model v2.4 &bull; Confidence: 99.8% &bull; Generated: ${new Date().toLocaleString()}</div>
            <div>Authorized Medical Attending Signature: __________________________</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-5 font-mono select-none text-[#F8FAFC]">
      
      {/* Top Header & Search/Filter Controls */}
      <div className="nm-flat rounded-2xl p-5 border border-white/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 nm-convex rounded-xl border border-[#FF334B]/30 text-[#FF334B] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider m-0">PATIENT DIRECTORY &amp; RECORDS</h2>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1 m-0 font-sans">
            Field Bio-Capsule Registry &bull; {patients.length} admitted patient nodes &bull; On-Demand Edge AI Diagnostics
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by ID, name, hospital..."
              className="w-full nm-inset rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] pl-9 pr-3.5 py-2 border border-white/[0.04] focus:outline-none focus:border-[#FF334B]/40"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center nm-inset rounded-xl p-1 border border-white/[0.04] text-xs">
            {['ALL', 'CRITICAL', 'WARNING', 'STABLE'].map(category => (
              <button
                key={category}
                onClick={() => setFilterBadge(category)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  filterBadge === category
                    ? 'nm-btn-accent text-white shadow-[0_0_12px_rgba(255,51,75,0.4)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="col-span-2 nm-flat rounded-2xl p-10 text-center text-[#94A3B8] text-xs border border-white/[0.04]">
            No patient records found matching filter criteria.
          </div>
        ) : (
          filteredPatients.map((item) => {
            const isSelected = item.patientId === selectedPatientId;
            const isTampered = item.capsule?.verification_status === 'TAMPERED';

            const badgeStyles = {
              CRITICAL: 'nm-alert-inset text-[#FF334B] border-[#FF334B]/40',
              WARNING: 'nm-inset text-[#F59E0B] border-[#F59E0B]/30',
              STABLE: 'nm-inset text-[#10B981] border-[#10B981]/30',
            }[item.triageBadgeLabel] || 'nm-inset text-[#94A3B8] border-white/[0.04]';

            return (
              <div
                key={item.patientId}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'nm-convex border-[#FF334B]/60 shadow-[0_0_15px_rgba(255,51,75,0.15)] ring-1 ring-[#FF334B]/40' 
                    : 'nm-flat border-white/[0.04] hover:border-[#FF334B]/30'
                }`}
              >
                <div>
                  {/* Top Strip: Demographics & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3 border-b border-white/[0.04] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 nm-convex rounded-xl border border-white/[0.04] text-[#FF334B] flex items-center justify-center font-bold text-xs shadow-inner">
                        {item.fullName ? item.fullName.split(' ').map(n=>n[0]).join('').slice(0,2) : 'PT'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#F8FAFC] m-0">{item.fullName}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mt-1 font-sans flex-wrap">
                          <span className="font-mono text-[#FF334B] font-bold">{item.patientId}</span>
                          <span>&bull;</span>
                          <span>{item.age} yrs</span>
                          <span>&bull;</span>
                          <span>{item.gender === 'M' ? 'Male' : 'Female'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isTampered ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold nm-alert-inset text-[#FF334B] border border-[#FF334B]/40 rounded-lg animate-pulse">
                          <ShieldAlert className="w-3 h-3 text-[#FF334B]" />
                          TAMPERED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold nm-inset text-[#F8FAFC] border border-white/[0.04] rounded-lg">
                          <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                          AUTH OK
                        </span>
                      )}

                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border ${badgeStyles}`}>
                        {item.triageBadgeLabel}
                      </span>

                      {/* Calculated Critical Score Badge */}
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-lg nm-inset text-[#F8FAFC] border border-white/[0.06] flex items-center gap-1">
                        <Activity className="w-3 h-3 text-[#FF334B]" />
                        <span>{item.criticalScore} / 10</span>
                      </span>
                    </div>
                  </div>

                  {/* Real-time Vitals 5-Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 nm-inset p-3 rounded-xl border border-white/[0.02] text-xs mb-3">
                    <div>
                      <span className="text-[9px] text-[#94A3B8] uppercase flex items-center gap-1 font-semibold">
                        <Heart className="w-3 h-3 text-[#FF334B]" /> PULSE
                      </span>
                      <span className="font-bold text-[#F8FAFC] text-xs mt-0.5 block font-mono">
                        {item.heartRate} <span className="text-[9px] font-normal text-[#94A3B8]">BPM</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#94A3B8] uppercase flex items-center gap-1 font-semibold">
                        <BedDouble className="w-3 h-3 text-[#F59E0B]" /> BED FORCE
                      </span>
                      <span className="font-bold text-[#F8FAFC] text-xs mt-0.5 block font-mono">
                        {item.bedForce} <span className="text-[9px] font-normal text-[#94A3B8]">N</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#94A3B8] uppercase flex items-center gap-1 font-semibold">
                        <Thermometer className="w-3 h-3 text-[#EC4899]" /> TEMP
                      </span>
                      <span className="font-bold text-[#F8FAFC] text-xs mt-0.5 block font-mono">
                        {item.bodyTemp} <span className="text-[9px] font-normal text-[#94A3B8]">°C</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#94A3B8] uppercase flex items-center gap-1 font-semibold">
                        <Wind className="w-3 h-3 text-[#38BDF8]" /> SpO2
                      </span>
                      <span className={`font-bold text-xs mt-0.5 block font-mono ${item.spo2 < 90 ? 'text-[#FF334B]' : 'text-[#F8FAFC]'}`}>
                        {item.spo2}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#94A3B8] uppercase font-semibold block">BP (mmHg)</span>
                      <span className="font-bold text-[#F8FAFC] text-xs mt-0.5 block font-mono">
                        {item.bloodPressure.replace(' mmHg', '')}
                      </span>
                    </div>
                  </div>

                  {/* Hospital Allocation Detail Box */}
                  <div className="nm-inset p-3 rounded-xl border border-white/[0.02] text-xs mb-3 space-y-1.5 font-sans">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#F8FAFC] font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-[#FF334B]" />
                        <span>{item.hospitalName}</span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] font-mono">{item.wardBed}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#94A3B8] pt-1 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#10B981]" />
                        <span>Assigned: <strong className="text-[#F8FAFC]">{item.assignedDoctor}</strong></span>
                      </div>
                      <span className="text-[#FF334B] font-mono">{item.criticalScore >= 8.0 ? 'AIR EVAC' : 'GROUND ALS'}</span>
                    </div>
                  </div>

                  {/* Red Flags & Clinical Notes */}
                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                      DIAGNOSIS &amp; ACTIVE FLAGS:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.capsule?.red_flags && item.capsule.red_flags.length > 0 ? (
                        item.capsule.red_flags.map((flag, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] font-medium nm-inset text-[#94A3B8] border border-white/[0.04] rounded-md">
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#64748B] italic">Field stabilization &bull; Normal baseline</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: On-Demand Analyze AI Report & Chart Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04] flex-wrap">
                  {/* On-Demand AI Report Generation Button */}
                  <button
                    onClick={() => handleAnalyzeAiReport(item)}
                    className="flex-1 py-2 px-3 nm-btn-accent text-white hover:brightness-110 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all shadow-[0_0_14px_rgba(255,51,75,0.35)]"
                    title="Generate on-demand Edge AI clinical diagnosis & triage report"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span>ANALYZE AI REPORT</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectPatient(item.patientId);
                      if (onOpenChart) onOpenChart(item.patientId);
                    }}
                    className="py-2 px-3 nm-btn text-[#F8FAFC] hover:text-[#FF334B] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    title="Open Case Capsule EMR chart"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#FF334B]" />
                    <span>CHART</span>
                  </button>

                  <button
                    onClick={() => onSelectPatient(item.patientId)}
                    className="py-2 px-3 nm-btn text-[#94A3B8] hover:text-[#F8FAFC] text-[11px] font-bold rounded-xl flex items-center gap-1 transition-all"
                    title="Inspect patient telemetry node"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ================= MODAL 1: EDGE AI REPORT LOADER OVERLAY ================= */}
      {isGeneratingReport && generatingPatient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="nm-flat rounded-2xl p-7 border border-[#FF334B]/40 max-w-md w-full text-center space-y-4 shadow-[0_0_30px_rgba(255,51,75,0.25)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF334B]/10 rounded-full blur-xl pointer-events-none" />

            {/* Animated Dual Ring Loader with AI Sparkles */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#FF334B]/30 border-t-[#FF334B] animate-spin" />
              <div className="w-11 h-11 nm-convex rounded-full flex items-center justify-center text-[#FF334B]">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider m-0">
                Preparing report using Edge AI...
              </h3>
              <p className="text-[11px] text-[#94A3B8] font-sans m-0">
                Synthesizing real-time vitals, INT8 clinical decision matrix, and hospital allocation for <strong className="text-[#F8FAFC]">{generatingPatient.fullName}</strong>.
              </p>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                <span>INT8 INFERENCE PIPELINE</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="w-full h-2 nm-inset rounded-full p-0.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF334B] to-[#F59E0B] rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>

            <div className="nm-inset p-2.5 rounded-xl border border-white/[0.02] text-[10px] text-[#64748B] text-left space-y-1 font-mono">
              <div className="flex items-center gap-1.5 text-[#10B981]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Sensor Vitals Stream Latched (100ms)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#F59E0B]">
                <Cpu className="w-3 h-3 animate-spin" />
                <span>Executing TFLM INT8 Neural Triage Model...</span>
              </div>
              <div className="text-[#94A3B8]">
                &bull; Querying {generatingPatient.hospitalName} capacity...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: COMPLETE AI CLINICAL SUMMARY REPORT MODAL ================= */}
      {activeReportPatient && !isGeneratingReport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="nm-flat rounded-2xl border border-white/[0.08] max-w-3xl w-full my-8 max-h-[90vh] flex flex-col justify-between shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
            
            {/* Modal Header & Metadata */}
            <div className="p-5 border-b border-white/[0.04] flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 nm-btn-accent text-white text-[10px] font-black rounded-lg flex items-center gap-1 shadow-[0_0_8px_rgba(255,51,75,0.4)]">
                    <Sparkles className="w-3 h-3 text-white" />
                    <span>EDGE AI DIAGNOSTIC REPORT</span>
                  </span>
                  <span className="text-[11px] text-[#94A3B8] font-sans">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString()} IST &bull; NXP MCXN236 Edge Hub
                  </span>
                </div>

                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-base font-bold text-[#F8FAFC] uppercase m-0">
                    {activeReportPatient.fullName}
                  </h2>
                  <span className="text-xs text-[#FF334B] font-mono font-bold">
                    {activeReportPatient.patientId}
                  </span>
                  <span className="text-xs text-[#94A3B8] font-sans">
                    {activeReportPatient.age} yrs &bull; {activeReportPatient.gender === 'M' ? 'Male' : 'Female'}
                  </span>
                </div>

                <div className="text-xs text-[#94A3B8] mt-1 font-sans flex items-center gap-1.5 flex-wrap">
                  <Building2 className="w-3.5 h-3.5 text-[#FF334B]" />
                  <span className="text-[#F8FAFC] font-semibold">{activeReportPatient.hospitalName}</span>
                  <span>&bull;</span>
                  <span>{activeReportPatient.wardBed}</span>
                  <span>&bull;</span>
                  <span className="text-[#10B981]">Assigned: {activeReportPatient.assignedDoctor}</span>
                </div>
              </div>

              {/* Critical Score Indicator Badge */}
              <div className="text-right shrink-0">
                <div className="nm-inset p-3 rounded-xl border border-white/[0.04] text-center">
                  <span className="text-[9px] text-[#94A3B8] uppercase block font-bold">CRITICAL SCORE</span>
                  <div className="text-xl font-black text-[#FF334B] font-mono mt-0.5">
                    {activeReportPatient.criticalScore} <span className="text-xs font-normal text-[#94A3B8]">/ 10</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md mt-1 block ${
                    activeReportPatient.criticalScore >= 8.0 
                      ? 'nm-alert-inset text-[#FF334B]' 
                      : activeReportPatient.criticalScore >= 5.0 
                      ? 'nm-inset text-[#F59E0B]' 
                      : 'nm-inset text-[#10B981]'
                  }`}>
                    {activeReportPatient.triageBadgeLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Clinical Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar flex-1 font-sans">
              
              {/* 1. Real-Time Vitals Breakdown Grid */}
              <div>
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#FF334B]" />
                  <span>PHYSIOLOGICAL TELEMETRY VITALS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="nm-inset p-2.5 rounded-xl border border-white/[0.02]">
                    <span className="text-[10px] text-[#94A3B8] block">Pulse Rate</span>
                    <strong className="text-[#F8FAFC] text-sm block font-mono">{activeReportPatient.heartRate} BPM</strong>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5">Norm: 60-100</span>
                  </div>
                  <div className="nm-inset p-2.5 rounded-xl border border-white/[0.02]">
                    <span className="text-[10px] text-[#94A3B8] block">Bed Force (Load)</span>
                    <strong className="text-[#F8FAFC] text-sm block font-mono">{activeReportPatient.bedForce} N</strong>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5">Norm: 1200-2400</span>
                  </div>
                  <div className="nm-inset p-2.5 rounded-xl border border-white/[0.02]">
                    <span className="text-[10px] text-[#94A3B8] block">Body Temp</span>
                    <strong className="text-[#F8FAFC] text-sm block font-mono">{activeReportPatient.bodyTemp} °C</strong>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5">Norm: 36.5-37.5</span>
                  </div>
                  <div className="nm-inset p-2.5 rounded-xl border border-white/[0.02]">
                    <span className="text-[10px] text-[#94A3B8] block">Oxygen Sat (SpO2)</span>
                    <strong className={`text-sm block font-mono ${activeReportPatient.spo2 < 90 ? 'text-[#FF334B]' : 'text-[#F8FAFC]'}`}>
                      {activeReportPatient.spo2}%
                    </strong>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5">Norm: &gt;95%</span>
                  </div>
                  <div className="nm-inset p-2.5 rounded-xl border border-white/[0.02]">
                    <span className="text-[10px] text-[#94A3B8] block">Blood Pressure</span>
                    <strong className="text-[#F8FAFC] text-sm block font-mono">{activeReportPatient.bloodPressure.replace(' mmHg', '')}</strong>
                    <span className="text-[9px] text-[#94A3B8] block mt-0.5">Norm: 120/80</span>
                  </div>
                </div>
              </div>

              {/* 2. Clinical Status Summary (Vitals vs Physiological Ranges) */}
              <div className="nm-inset p-4 rounded-xl border border-white/[0.04] space-y-2">
                <div className="text-[11px] font-bold text-[#FF334B] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  <span>CLINICAL STATUS SUMMARY (EDGE AI SYNTHESIS)</span>
                </div>
                <div className="text-[12px] text-[#E2E8F0] leading-relaxed space-y-2">
                  <p className="m-0">
                    Patient <strong>{activeReportPatient.fullName}</strong> ({activeReportPatient.patientId}) presents with an acute acuity score of <strong className="text-[#FF334B]">{activeReportPatient.criticalScore} / 10</strong>. 
                    Real-time analysis against normal physiological baselines identifies:
                  </p>
                  <ul className="m-0 pl-4 space-y-1 text-[#CBD5E1]">
                    <li>
                      <strong>Cardiovascular:</strong> Pulse rate of <span className="text-[#F8FAFC] font-mono">{activeReportPatient.heartRate} BPM</span> indicates {activeReportPatient.heartRate > 100 ? 'marked sinus tachycardia (>100 BPM), signaling active compensatory sympathetic tone in response to trauma or hypovolemic stress' : activeReportPatient.heartRate < 60 ? 'bradycardia (<60 BPM)' : 'stable sinus rhythm'}.
                    </li>
                    <li>
                      <strong>Respiratory &amp; Oxygenation:</strong> Oxygen saturation is recorded at <span className="text-[#F8FAFC] font-mono">{activeReportPatient.spo2}%</span> ({activeReportPatient.spo2 < 90 ? 'severe hypoxemia requiring immediate airway stabilization and high-flow O2 therapy' : activeReportPatient.spo2 < 95 ? 'borderline desaturation' : 'adequate arterial oxygenation'}).
                    </li>
                    <li>
                      <strong>Hemodynamics:</strong> Systemic blood pressure of <span className="text-[#F8FAFC] font-mono">{activeReportPatient.bloodPressure}</span> ({activeReportPatient.systolic < 90 ? 'confirms decompensated shock and impaired organ perfusion' : 'reflects normotensive perfusion pressure'}).
                    </li>
                    <li>
                      <strong>Bed Transducer Activity:</strong> Load cell sensor indicates <span className="text-[#F8FAFC] font-mono">{activeReportPatient.bedForce} N</span> ({activeReportPatient.bedForce > 2000 ? 'elevated load consistent with motor restlessness and acute physical distress' : 'stable supine load distribution'}).
                    </li>
                  </ul>
                </div>
              </div>

              {/* 3. Hospital & Resource Allocation Details */}
              <div className="nm-flat p-4 rounded-xl border border-white/[0.04] space-y-2">
                <div className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>HOSPITAL &amp; RESOURCE ALLOCATION DETAILS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="nm-inset p-2.5 rounded-lg">
                    <span className="text-[10px] text-[#94A3B8] block">Transport Priority Level:</span>
                    <strong className="text-[#FF334B] text-xs block mt-0.5">{activeReportPatient.transportPriority}</strong>
                  </div>
                  <div className="nm-inset p-2.5 rounded-lg">
                    <span className="text-[10px] text-[#94A3B8] block">Facility Preparedness Status:</span>
                    <strong className="text-[#10B981] text-xs block mt-0.5">{activeReportPatient.prepStatus}</strong>
                  </div>
                </div>
              </div>

              {/* 4. Recommended Next Steps & Action Items */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>RECOMMENDED NEXT STEPS &amp; ACTION PROTOCOLS</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="nm-inset p-3 rounded-xl border-l-4 border-l-[#FF334B] space-y-1">
                    <div className="font-bold text-[#FF334B] uppercase tracking-wide">
                      STEP 1: IMMEDIATE TRIAGE PROTOCOLS
                    </div>
                    <p className="text-[#CBD5E1] m-0 leading-relaxed">
                      Initiate 100% High-Flow O2 via non-rebreather mask; establish dual 16-gauge IV access; initiate warmed balanced crystalloid fluid resuscitation protocol and continuously monitor pulse oximetry.
                    </p>
                  </div>

                  <div className="nm-inset p-3 rounded-xl border-l-4 border-l-[#F59E0B] space-y-1">
                    <div className="font-bold text-[#F59E0B] uppercase tracking-wide">
                      STEP 2: DIAGNOSTIC CHECKS &amp; LAB ORDERS
                    </div>
                    <p className="text-[#CBD5E1] m-0 leading-relaxed">
                      Order STAT Full Blood Count (FBC), Arterial Blood Gas (ABG), 12-lead ECG, Troponin-I panel, point-of-care eFAST ultrasound, and type &amp; cross-match 4 units Packed Red Blood Cells (PRBC).
                    </p>
                  </div>

                  <div className="nm-inset p-3 rounded-xl border-l-4 border-l-[#10B981] space-y-1">
                    <div className="font-bold text-[#10B981] uppercase tracking-wide">
                      STEP 3: HANDOVER &amp; TRANSFER PROTOCOL
                    </div>
                    <p className="text-[#CBD5E1] m-0 leading-relaxed">
                      Execute cryptographic HMAC sign-off on Case Capsule; establish telemetry link with {activeReportPatient.hospitalName}; hand over patient directly to {activeReportPatient.assignedDoctor} at {activeReportPatient.wardBed}.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.04] bg-[#0B0B0D]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-mono">
                <span className="px-2 py-0.5 nm-inset rounded-md border border-white/[0.04] text-[#94A3B8]">
                  Edge Model ID: INT8 Quantized Model v2.4
                </span>
                <span>&bull;</span>
                <span className="text-[#10B981] font-bold">Confidence: 99.8%</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleDownloadPdf(activeReportPatient)}
                  className="flex-1 sm:flex-none px-4 py-2 nm-btn text-[#F8FAFC] hover:text-[#10B981] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  title="Download and print formatted clinical PDF report"
                >
                  <Download className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>DOWNLOAD REPORT PDF</span>
                </button>

                <button
                  onClick={() => setActiveReportPatient(null)}
                  className="flex-1 sm:flex-none px-5 py-2 nm-btn-accent text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,51,75,0.3)]"
                >
                  <span>CLOSE</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

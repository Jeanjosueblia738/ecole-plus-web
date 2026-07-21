import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface BulletinGrade {
  subject: string;
  value: number;
  coefficient: number;
  evalType?: string;
}

export interface BulletinData {
  schoolName: string;
  schoolCity: string;
  schoolCode: string;
  schoolPhone?: string;
  schoolAddress?: string;
  schoolStatus?: string; // Public / Privé
  drena?: string;
  studentName: string;
  studentRegistration: string;
  className: string;
  level: string;
  trimestre: string;
  year: string;
  grades: BulletinGrade[];
  moyenneGenerale: number;
  /** Rang dans la classe (1 = premier) */
  rang?: number;
  effectif?: number;
  classAverage?: number;
  classMin?: number;
  classMax?: number;
  gender?: 'MALE' | 'FEMALE' | string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  isRepeater?: boolean;
  photoUrl?: string;
  absencesHours?: number;
  absencesJustified?: number;
  absencesUnjustified?: number;
  appreciation?: string;
  directorName?: string;
  motto?: string;
  /** Décision conseil de classe (si saisie) */
  councilMention?: string;
  councilDecision?: string;
  councilAppreciation?: string;
}

type SubjectLine = {
  subject: string;
  moyenne: number;
  coefficient: number;
  total: number;
  rang?: number;
  appreciation: string;
};

const LETTERS = [
  'français', 'francais', 'anglais', 'allemand', 'espagnol',
  'histoire', 'géographie', 'geographie', 'histoire-géographie',
  'histoire-geographie', 'philosophie', 'littérature', 'litterature',
];
const SCIENCES = [
  'mathématiques', 'mathematiques', 'maths', 'physique', 'chimie',
  'physique-chimie', 'svt', 'sciences', 'sciences de la vie',
];

function normalizeSubject(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function subjectGroup(subject: string): 'LETTRES' | 'SCIENCES' | 'AUTRES' {
  const n = normalizeSubject(subject);
  if (LETTERS.some((k) => n.includes(normalizeSubject(k)))) return 'LETTRES';
  if (SCIENCES.some((k) => n.includes(normalizeSubject(k)))) return 'SCIENCES';
  return 'AUTRES';
}

function trimestreLabel(t: string): string {
  const map: Record<string, string> = {
    T1: '1er Trimestre',
    T2: '2ème Trimestre',
    T3: '3ème Trimestre',
    '1er': '1er Trimestre',
    '2ème': '2ème Trimestre',
    '3ème': '3ème Trimestre',
  };
  return map[t] || t;
}

function appreciation(note: number): string {
  if (note >= 16) return 'Très bien';
  if (note >= 14) return 'Bien';
  if (note >= 12) return 'Assez bien';
  if (note >= 10) return 'Passable';
  if (note >= 8) return 'Insuffisant';
  return 'Médiocre';
}

function councilMentionLabel(m?: string, fallbackMoy?: number): string {
  const map: Record<string, string> = {
    TRES_BIEN: 'Félicitations',
    BIEN: 'Tableau d\'Honneur',
    ASSEZ_BIEN: 'Encouragements',
    PASSABLE: 'À encourager',
    MEDIOCRE: 'Avertissement travail',
    NIL: '',
  };
  if (m && map[m]) return map[m];
  if (fallbackMoy != null) return mentionConseil(fallbackMoy);
  return '';
}

function councilDecisionLabel(d?: string): string {
  const map: Record<string, string> = {
    PASSAGE: 'Passage',
    REDOUBLEMENT: 'Redoublement',
    CONDITIONAL: 'Passage conditionnel',
  };
  return d ? map[d] || d : '';
}

/** Agrège les notes brutes en une ligne par matière */
export function aggregateSubjects(grades: BulletinGrade[]): SubjectLine[] {
  const bySubject = new Map<string, { sum: number; n: number; coef: number }>();
  for (const g of grades) {
    const key = g.subject.trim();
    if (!key) continue;
    const cur = bySubject.get(key) || { sum: 0, n: 0, coef: g.coefficient || 1 };
    cur.sum += g.value;
    cur.n += 1;
    cur.coef = g.coefficient || cur.coef;
    bySubject.set(key, cur);
  }
  return [...bySubject.entries()].map(([subject, v]) => {
    const moyenne = v.n ? v.sum / v.n : 0;
    return {
      subject,
      moyenne,
      coefficient: v.coef,
      total: moyenne * v.coef,
      appreciation: appreciation(moyenne),
    };
  });
}

function groupLines(lines: SubjectLine[]) {
  const lettres: SubjectLine[] = [];
  const sciences: SubjectLine[] = [];
  const autres: SubjectLine[] = [];
  for (const l of lines) {
    const g = subjectGroup(l.subject);
    if (g === 'LETTRES') lettres.push(l);
    else if (g === 'SCIENCES') sciences.push(l);
    else autres.push(l);
  }
  const sortFr = (a: SubjectLine, b: SubjectLine) =>
    a.subject.localeCompare(b.subject, 'fr');
  lettres.sort(sortFr);
  sciences.sort(sortFr);
  autres.sort(sortFr);
  return { lettres, sciences, autres };
}

function bilan(lines: SubjectLine[]) {
  const coef = lines.reduce((s, l) => s + l.coefficient, 0);
  const points = lines.reduce((s, l) => s + l.total, 0);
  const moyenne = coef > 0 ? points / coef : 0;
  return { coef, points, moyenne };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR');
}

function genderLabel(g?: string) {
  if (!g) return '—';
  const u = g.toUpperCase();
  if (u === 'FEMALE' || u === 'F') return 'F';
  if (u === 'MALE' || u === 'M') return 'M';
  return g;
}

/**
 * Bulletin trimestriel style MEN / lycée ivoirien (specimen type Bangolo).
 */
export function generateBulletin(data: BulletinData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const contentW = pageW - margin * 2;
  let y = 8;

  const black: [number, number, number] = [20, 20, 20];
  const gray: [number, number, number] = [80, 80, 80];

  // ── En-tête MEN ──────────────────────────────────────────
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    'MINISTÈRE DE L\'ÉDUCATION NATIONALE ET DE L\'ALPHABÉTISATION',
    pageW / 2,
    y,
    { align: 'center' },
  );
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    data.drena || `DRENA DE ${(data.schoolCity || '').toUpperCase() || '—'}`,
    pageW / 2,
    y,
    { align: 'center' },
  );
  y += 6;

  // Ligne école / code
  const leftX = margin;
  const rightX = pageW - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text((data.schoolName || 'ÉTABLISSEMENT').toUpperCase(), leftX, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Code : ${data.schoolCode || '—'}`, rightX - 42, y);
  doc.rect(rightX - 18, y - 10, 16, 16);
  doc.setFontSize(5.5);
  doc.text('QR', rightX - 10, y - 1, { align: 'center' });
  doc.text('CODE', rightX - 10, y + 2, { align: 'center' });

  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);
  if (data.schoolAddress) doc.text(data.schoolAddress, leftX, y);
  y += 3.5;
  const contact = [
    data.schoolCity,
    data.schoolPhone ? `Tél. ${data.schoolPhone}` : null,
  ]
    .filter(Boolean)
    .join(' — ');
  if (contact) doc.text(contact, leftX, y);
  doc.text(`Statut : ${data.schoolStatus || '—'}`, rightX - 42, y);

  y += 6;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // Titre
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    `BULLETIN TRIMESTRIEL DE NOTES — ${trimestreLabel(data.trimestre)}`,
    pageW / 2,
    y,
    { align: 'center' },
  );
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Année scolaire ${data.year}`, pageW / 2, y, { align: 'center' });
  y += 5;

  // ── Cadre identité élève ─────────────────────────────────
  const idH = 28;
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, idH);

  const photoW = 22;
  const photoH = 24;
  const photoX = pageW - margin - photoW - 2;
  const photoY = y + 2;
  doc.rect(photoX, photoY, photoW, photoH);
  doc.setFontSize(6);
  doc.setTextColor(...gray);
  doc.text('Photo', photoX + photoW / 2, photoY + photoH / 2, {
    align: 'center',
  });

  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text((data.studentName || '').toUpperCase(), margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const col1 = margin + 3;
  const col2 = margin + 72;
  let iy = y + 11;
  doc.text(`Matricule : ${data.studentRegistration || '—'}`, col1, iy);
  doc.text(`Sexe : ${genderLabel(data.gender)}`, col2, iy);
  iy += 4;
  doc.text(`Né(e) le : ${fmtDate(data.dateOfBirth)}`, col1, iy);
  doc.text(`Lieu : ${data.placeOfBirth || '—'}`, col2, iy);
  iy += 4;
  doc.text(`Nationalité : ${data.nationality || 'Ivoirienne'}`, col1, iy);
  doc.text(`Classe : ${data.className}`, col2, iy);
  iy += 4;
  doc.text(`Effectif : ${data.effectif ?? '—'}`, col1, iy);
  doc.text(
    `Redoublant : ${data.isRepeater ? 'Oui' : 'Non'}`,
    col2,
    iy,
  );

  y += idH + 4;

  // ── Tableau disciplines ──────────────────────────────────
  const lines = aggregateSubjects(data.grades || []);
  const { lettres, sciences, autres } = groupLines(lines);
  const bilLettres = bilan(lettres);
  const bilSciences = bilan(sciences);
  const totCoef = lines.reduce((s, l) => s + l.coefficient, 0);
  const totPoints = lines.reduce((s, l) => s + l.total, 0);

  const body: any[][] = [];

  const pushHeader = (title: string) => {
    body.push([
      {
        content: title,
        colSpan: 8,
        styles: {
          fillColor: [230, 230, 230],
          fontStyle: 'bold',
          fontSize: 7.5,
          textColor: [0, 0, 0],
          halign: 'left',
        },
      },
    ]);
  };

  const pushLine = (l: SubjectLine) => {
    body.push([
      l.subject,
      l.moyenne.toFixed(2),
      String(l.coefficient),
      l.total.toFixed(2),
      l.rang != null ? `${l.rang}e` : '—',
      l.appreciation,
      '',
      '',
    ]);
  };

  const pushBilan = (label: string, b: ReturnType<typeof bilan>) => {
    body.push([
      {
        content: label,
        styles: { fontStyle: 'bold', fillColor: [245, 245, 245] },
      },
      {
        content: b.moyenne ? b.moyenne.toFixed(2) : '—',
        styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'center' },
      },
      {
        content: String(b.coef || '—'),
        styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'center' },
      },
      {
        content: b.points ? b.points.toFixed(2) : '—',
        styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'center' },
      },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
    ]);
  };

  if (lettres.length) {
    pushHeader('BILAN LETTRES');
    lettres.forEach(pushLine);
    pushBilan('Sous-total Lettres', bilLettres);
  }
  if (sciences.length) {
    pushHeader('BILAN SCIENCES');
    sciences.forEach(pushLine);
    pushBilan('Sous-total Sciences', bilSciences);
  }
  if (autres.length) {
    pushHeader('AUTRES DISCIPLINES');
    autres.forEach(pushLine);
  }

  body.push([
    { content: 'TOTAUX', styles: { fontStyle: 'bold', fillColor: [210, 210, 210] } },
    {
      content: data.moyenneGenerale.toFixed(2),
      styles: { fontStyle: 'bold', fillColor: [210, 210, 210], halign: 'center' },
    },
    {
      content: String(totCoef),
      styles: { fontStyle: 'bold', fillColor: [210, 210, 210], halign: 'center' },
    },
    {
      content: totPoints.toFixed(2),
      styles: { fontStyle: 'bold', fillColor: [210, 210, 210], halign: 'center' },
    },
    { content: '', styles: { fillColor: [210, 210, 210] } },
    { content: '', styles: { fillColor: [210, 210, 210] } },
    { content: '', styles: { fillColor: [210, 210, 210] } },
    { content: '', styles: { fillColor: [210, 210, 210] } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[
      'Disciplines',
      'Moy.',
      'Coef.',
      'Total',
      'Rang',
      'Appréciations',
      'Professeurs',
      'Signature',
    ]],
    body,
    styles: {
      fontSize: 7,
      cellPadding: 1.2,
      textColor: [20, 20, 20],
      lineColor: [60, 60, 60],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 28 },
      6: { cellWidth: 30 },
      7: { cellWidth: 20 },
    },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ── Blocs résumé ─────────────────────────────────────────
  const boxH = 22;
  const gap = 3;
  const boxW = (contentW - gap * 2) / 3;

  // Assiduité
  doc.rect(margin, y, boxW, boxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ASSIDUITÉ', margin + boxW / 2, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    `Absences : ${data.absencesHours ?? 0} h`,
    margin + 2,
    y + 10,
  );
  doc.text(
    `Justifiées : ${data.absencesJustified ?? 0} h`,
    margin + 2,
    y + 14,
  );
  doc.text(
    `Non justifiées : ${data.absencesUnjustified ?? 0} h`,
    margin + 2,
    y + 18,
  );

  // Moyenne trimestrielle
  const mx = margin + boxW + gap;
  doc.rect(mx, y, boxW, boxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('MOYENNE TRIMESTRIELLE', mx + boxW / 2, y + 4.5, {
    align: 'center',
  });
  doc.setFontSize(14);
  doc.text(
    `${data.moyenneGenerale.toFixed(2)} / 20`,
    mx + boxW / 2,
    y + 12,
    { align: 'center' },
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const rangTxt =
    data.rang != null && data.effectif
      ? `Rang : ${data.rang}e / ${data.effectif}`
      : data.rang != null
        ? `Rang : ${data.rang}e`
        : 'Rang : —';
  doc.text(rangTxt, mx + boxW / 2, y + 18, { align: 'center' });

  // Résultats de classe
  const rx = mx + boxW + gap;
  doc.rect(rx, y, boxW, boxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('RÉSULTATS DE CLASSE', rx + boxW / 2, y + 4.5, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    `Moy. classe : ${data.classAverage != null ? data.classAverage.toFixed(2) : '—'}`,
    rx + 2,
    y + 10,
  );
  doc.text(
    `Moy. min : ${data.classMin != null ? data.classMin.toFixed(2) : '—'}`,
    rx + 2,
    y + 14,
  );
  doc.text(
    `Moy. max : ${data.classMax != null ? data.classMax.toFixed(2) : '—'}`,
    rx + 2,
    y + 18,
  );

  y += boxH + 4;

  // ── Mentions / Appréciations / Chef ──────────────────────
  const footH = 38;
  const fW = (contentW - gap * 2) / 3;

  doc.rect(margin, y, fW, footH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('MENTIONS DU CONSEIL', margin + fW / 2, y + 4, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const ment = councilMentionLabel(data.councilMention, data.moyenneGenerale);
  const checks = [
    'Tableau d\'Honneur',
    'Encouragements',
    'Félicitations',
    'Avertissement travail',
    'Blâme',
  ];
  let cy = y + 9;
  for (const c of checks) {
    const marked = c === ment || (ment === 'À encourager' && c === 'Encouragements');
    doc.rect(margin + 2, cy - 2.2, 2.5, 2.5);
    if (marked) {
      doc.setFont('helvetica', 'bold');
      doc.text('X', margin + 3.2, cy);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(c, margin + 6, cy);
    cy += 4.5;
  }
  const decisionLbl = councilDecisionLabel(data.councilDecision);
  if (decisionLbl) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(`Décision : ${decisionLbl}`, margin + 2, y + footH - 3);
    doc.setFont('helvetica', 'normal');
  }

  const ax = margin + fW + gap;
  doc.rect(ax, y, fW, footH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('APPRÉCIATIONS DU CONSEIL', ax + fW / 2, y + 4, {
    align: 'center',
  });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const apprec =
    data.councilAppreciation ||
    data.appreciation ||
    appreciation(data.moyenneGenerale);
  doc.text(apprec, ax + fW / 2, y + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Le professeur principal', ax + 2, y + 28);
  doc.line(ax + 2, y + 34, ax + fW - 2, y + 34);

  const dx = ax + fW + gap;
  doc.rect(dx, y, fW, footH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('LE CHEF D\'ÉTABLISSEMENT', dx + fW / 2, y + 4, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const city = data.schoolCity || '—';
  const today = new Date().toLocaleDateString('fr-FR');
  doc.text(`Fait à ${city}, le ${today}`, dx + 2, y + 12);
  if (data.directorName) {
    doc.setFont('helvetica', 'bold');
    doc.text(data.directorName, dx + fW / 2, y + 22, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.text('Signature et cachet', dx + fW / 2, y + 34, { align: 'center' });

  // Pied de page
  doc.setFontSize(6);
  doc.setTextColor(...gray);
  doc.text(
    data.motto || 'L\'excellence, notre ambition — Document généré par ECOLE+',
    pageW / 2,
    pageH - 6,
    { align: 'center' },
  );

  const filename = `bulletin_${data.studentRegistration || 'eleve'}_${data.trimestre}.pdf`;
  doc.save(filename);
}

export interface SchoolDocData {
  schoolName: string;
  schoolCity: string;
  schoolCode: string;
  schoolAddress?: string;
  schoolPhone?: string;
  directorName?: string;
  studentName: string;
  studentRegistration: string;
  className: string;
  level: string;
  year: string;
  gender?: string;
  dateOfBirth?: string;
  parentName?: string;
}

function schoolDocHeader(doc: jsPDF, data: SchoolDocData, title: string) {
  const pageW = 210;
  let y = 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MINISTÈRE DE L\'ÉDUCATION NATIONALE ET DE L\'ALPHABÉTISATION', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`DRENA DE ${(data.schoolCity || '').toUpperCase() || '—'}`, pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text((data.schoolName || 'ÉTABLISSEMENT').toUpperCase(), pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (data.schoolAddress) doc.text(data.schoolAddress, pageW / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Code MENA : ${data.schoolCode || '—'}`, pageW / 2, y, { align: 'center' });
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, pageW / 2, y, { align: 'center' });
  return y + 12;
}

/** Attestation de scolarité (inscription en cours). */
export function generateAttestationScolarite(data: SchoolDocData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  let y = schoolDocHeader(doc, data, 'ATTESTATION DE SCOLARITÉ');
  const city = data.schoolCity || '—';
  const today = new Date().toLocaleDateString('fr-FR');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const body = [
    `Je soussigné(e), Chef(fe) d'établissement de ${data.schoolName},`,
    `certifie que l'élève :`,
    ``,
    `    ${(data.studentName || '').toUpperCase()}`,
    `    Matricule : ${data.studentRegistration || '—'}`,
    `    Né(e) le : ${fmtDate(data.dateOfBirth)}`,
    ``,
    `est régulièrement inscrit(e) et scolarisé(e) en classe de ${data.className} (${data.level})`,
    `pour l'année scolaire ${data.year}.`,
    ``,
    `L'élève fréquente assidûment les cours depuis le début de l'année scolaire.`,
    ``,
    `La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.`,
  ];
  for (const line of body) {
    doc.text(line, margin, y, { maxWidth: 170 });
    y += line === '' ? 4 : 7;
  }

  y += 10;
  doc.text(`Fait à ${city}, le ${today}`, margin, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Le(La) Chef(fe) d\'établissement', 140, y);
  if (data.directorName) {
    doc.setFont('helvetica', 'normal');
    doc.text(data.directorName, 140, y + 10);
  }
  doc.save(`attestation_${data.studentRegistration || 'eleve'}.pdf`);
}

/** Certificat de scolarité (fin d'année / radiation). */
export function generateCertificatScolarite(data: SchoolDocData & { purpose?: string }): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  let y = schoolDocHeader(doc, data, 'CERTIFICAT DE SCOLARITÉ');
  const city = data.schoolCity || '—';
  const today = new Date().toLocaleDateString('fr-FR');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const lines = [
    `Certifie que l'élève ${(data.studentName || '').toUpperCase()}, matricule ${data.studentRegistration || '—'},`,
    `a été scolarisé(e) au sein de notre établissement en classe de ${data.className} (${data.level})`,
    `durant l'année scolaire ${data.year}.`,
    ``,
    data.purpose || `Ce certificat est délivré à la demande de la famille pour toutes fins utiles.`,
  ];
  for (const line of lines) {
    doc.text(line, margin, y, { maxWidth: 170 });
    y += line === '' ? 4 : 7;
  }

  y += 10;
  doc.text(`Fait à ${city}, le ${today}`, margin, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Le(La) Chef(fe) d\'établissement', 140, y);
  if (data.directorName) {
    doc.setFont('helvetica', 'normal');
    doc.text(data.directorName, 140, y + 10);
  }
  doc.save(`certificat_${data.studentRegistration || 'eleve'}.pdf`);
}

export interface ReleveNotesData extends SchoolDocData {
  trimestre: string;
  grades: BulletinGrade[];
  moyenneGenerale: number;
}

/** Relevé de notes trimestriel (simplifié). */
export function generateReleveNotes(data: ReleveNotesData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  let y = schoolDocHeader(doc, data, `RELEVÉ DE NOTES — ${trimestreLabel(data.trimestre)}`);
  y += 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Élève : ${data.studentName}`, margin, y);
  doc.text(`Matricule : ${data.studentRegistration}`, margin + 100, y);
  y += 6;
  doc.text(`Classe : ${data.className} (${data.level})`, margin, y);
  doc.text(`Année : ${data.year}`, margin + 100, y);
  y += 8;

  const lines = aggregateSubjects(data.grades || []);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Matière', 'Moyenne', 'Coef.', 'Appréciation']],
    body: lines.map((l) => [
      l.subject,
      l.moyenne.toFixed(2),
      String(l.coefficient),
      l.appreciation,
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [27, 58, 107], textColor: 255 },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Moyenne générale : ${data.moyenneGenerale.toFixed(2)} / 20`, margin, y);
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const city = data.schoolCity || '—';
  doc.text(`Fait à ${city}, le ${new Date().toLocaleDateString('fr-FR')}`, margin, y);

  doc.save(`releve_${data.studentRegistration || 'eleve'}_${data.trimestre}.pdf`);
}

export interface PaymentReceiptData {
  schoolName: string;
  schoolCity?: string;
  receiptNo: string;
  studentName: string;
  matricule?: string;
  className?: string;
  feeLabel: string;
  amountPaid: number;
  amountDue?: number;
  paymentMode?: string;
  paidAt?: string;
}

/** Reçu de paiement (aligné mobile). */
export function generatePaymentReceipt(data: PaymentReceiptData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const margin = 12;
  let y = 16;
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(27, 58, 107);
  doc.text(data.schoolName || 'ECOLE+', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  if (data.schoolCity) {
    doc.text(data.schoolCity, margin, y);
    y += 5;
  }
  doc.setDrawColor(27, 58, 107);
  doc.line(margin, y, 136, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('REÇU DE PAIEMENT', 74, y, { align: 'center' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const rows: [string, string][] = [
    ['N° reçu', data.receiptNo || '—'],
    ['Élève', data.studentName || '—'],
    ['Matricule', data.matricule || '—'],
    ['Classe', data.className || '—'],
    ['Frais', data.feeLabel || '—'],
    ['Montant payé', fmt(data.amountPaid)],
    ['Montant dû', data.amountDue != null ? fmt(data.amountDue) : '—'],
    ['Mode', (data.paymentMode || 'especes').replace(/_/g, ' ')],
    [
      'Date',
      data.paidAt
        ? new Date(data.paidAt).toLocaleDateString('fr-FR')
        : new Date().toLocaleDateString('fr-FR'),
    ],
  ];
  for (const [k, v] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${k} :`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(v), margin + 35, y);
    y += 6;
  }

  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Merci pour votre règlement.', margin, y);
  y += 10;
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Cachet / Signature', 95, y);

  doc.save(`recu_${data.receiptNo || 'paiement'}.pdf`);
}

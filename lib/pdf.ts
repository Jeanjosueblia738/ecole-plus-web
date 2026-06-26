import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Grade {
  subject: string;
  value: number;
  coefficient: number;
  evalType: string;
}

interface BulletinData {
  schoolName: string;
  schoolCity: string;
  schoolCode: string;
  studentName: string;
  studentRegistration: string;
  className: string;
  level: string;
  trimestre: string;
  year: string;
  grades: Grade[];
  moyenneGenerale: number;
  appreciation?: string;
}

export function generateBulletin(data: BulletinData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = margin;

  // ── Couleurs ──
  const bleu: [number, number, number] = [27, 58, 107];
  const orange: [number, number, number] = [230, 126, 34];
  const gris: [number, number, number] = [245, 245, 245];
  const blanc: [number, number, number] = [255, 255, 255];

  // ── En-tête bandeau bleu ──
  doc.setFillColor(...bleu);
  doc.rect(0, 0, pageW, 38, 'F');

  // Bande orange gauche
  doc.setFillColor(...orange);
  doc.rect(0, 0, 6, 38, 'F');

  // Nom école
  doc.setTextColor(...blanc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ECOLE+', margin + 4, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.schoolName, margin + 4, 22);
  doc.text(`${data.schoolCity} — Code: ${data.schoolCode}`, margin + 4, 29);

  // Titre bulletin (droite)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('BULLETIN DE NOTES', pageW - margin, 16, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année scolaire : ${data.year}`, pageW - margin, 24, { align: 'right' });
  doc.text(trimestreLabel(data.trimestre), pageW - margin, 31, { align: 'right' });

  y = 46;

  // ── Infos élève ──
  doc.setFillColor(...gris);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 3, 3, 'F');

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.studentName, margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Matricule : ${data.studentRegistration}`, margin + 6, y + 18);
  doc.text(`Classe : ${data.className} — Niveau : ${data.level}`, margin + 6, y + 24);

  y += 36;

  // ── Tableau des notes ──
  doc.setTextColor(...bleu);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Résultats par matière', margin, y);
  y += 6;

  const tableData = data.grades.map((g, i) => [
    i + 1,
    g.subject,
    g.evalType,
    g.coefficient,
    `${g.value}/20`,
    appreciation(g.value),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Matière', 'Type', 'Coef.', 'Note', 'Appréciation']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [50, 50, 50],
    },
    headStyles: {
      fillColor: bleu,
      textColor: blanc,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 28 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 35 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Moyenne générale ──
  const moyColor: [number, number, number] = data.moyenneGenerale >= 10
    ? [39, 174, 96] : [231, 76, 60];

  doc.setFillColor(...bleu);
  doc.roundedRect(margin, y, 85, 22, 3, 3, 'F');
  doc.setTextColor(...blanc);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Moyenne générale', margin + 6, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`${data.moyenneGenerale.toFixed(2)}/20`, margin + 6, y + 18);

  // Badge appréciation générale
  doc.setFillColor(...moyColor);
  doc.roundedRect(margin + 92, y, 60, 22, 3, 3, 'F');
  doc.setTextColor(...blanc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(appreciation(data.moyenneGenerale), margin + 122, y + 13, { align: 'center' });

  y += 32;

  // ── Appréciation du conseil ──
  if (data.appreciation) {
    doc.setFillColor(255, 248, 220);
    doc.roundedRect(margin, y, pageW - margin * 2, 20, 3, 3, 'F');
    doc.setTextColor(100, 80, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Appréciation du conseil de classe :', margin + 4, y + 7);
    doc.setFont('helvetica', 'italic');
    doc.text(data.appreciation, margin + 4, y + 14);
    y += 28;
  }

  // ── Signatures ──
  y = Math.max(y, 230);
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Signature directeur
  doc.line(margin, y + 18, margin + 60, y + 18);
  doc.text('Signature du Directeur', margin + 30, y + 24, { align: 'center' });

  // Signature parent
  doc.line(pageW - margin - 60, y + 18, pageW - margin, y + 18);
  doc.text('Signature du Parent', pageW - margin - 30, y + 24, { align: 'center' });

  // ── Pied de page ──
  doc.setFillColor(...bleu);
  doc.rect(0, 285, pageW, 12, 'F');
  doc.setFillColor(...orange);
  doc.rect(0, 285, 6, 12, 'F');
  doc.setTextColor(...blanc);
  doc.setFontSize(7);
  doc.text(`ECOLE+ — ${data.schoolName} — Bulletin généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageW / 2, 292, { align: 'center' });

  // Télécharger
  const filename = `bulletin_${data.studentRegistration}_${data.trimestre}.pdf`;
  doc.save(filename);
}

function trimestreLabel(t: string): string {
  const map: Record<string, string> = {
    T1: '1er Trimestre',
    T2: '2ème Trimestre',
    T3: '3ème Trimestre',
  };
  return map[t] || t;
}

function appreciation(note: number): string {
  if (note >= 16) return 'Très bien';
  if (note >= 14) return 'Bien';
  if (note >= 12) return 'Assez bien';
  if (note >= 10) return 'Passable';
  return 'Insuffisant';
}
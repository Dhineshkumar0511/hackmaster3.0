
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generateEvaluationPDF = (team, evaluation, useCase) => {
    const doc = new jsPDF();
    const primaryColor = [108, 99, 255]; // #6C63FF

    // Header
    doc.setFillColor(30, 30, 45);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("HACKMASTER 3.0", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("Healthcare AI Hackathon — Official Evaluation Report", 105, 25, { align: "center" });

    // Team Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Team ${team.team_number}: ${team.name}`, 14, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Use Case: ${useCase?.title || 'General'}`, 14, 57);
    doc.text(`Batch: ${team.batch}`, 14, 62);
    doc.text(`Evaluation Date: ${new Date(evaluation.evaluated_at).toLocaleDateString()}`, 160, 50);

    // Summary Score Box
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(14, 70, 182, 30);

    doc.setFontSize(10);
    doc.text("OVERALL SCORE", 20, 80);
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text(`${evaluation.total_score}/100`, 20, 92);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("CODE QUALITY", 80, 80);
    doc.text(`${evaluation.code_quality}%`, 80, 90);

    doc.text("REQUIREMENTS", 130, 80);
    doc.text(`${evaluation.requirements_met}/${evaluation.total_requirements}`, 130, 90);

    // Feedback Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE FEEDBACK", 14, 115);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitFeedback = doc.splitTextToSize(evaluation.feedback || "No feedback provided.", 182);
    doc.text(splitFeedback, 14, 122);

    // Detailed Metrics Table
    const reportData = JSON.parse(evaluation.detailed_report || "[]");
    if (reportData.length > 0) {
        doc.autoTable({
            startY: 140,
            head: [['Requirement', 'Status', 'Score', 'Technical Evidence']],
            body: reportData.map(r => [
                r.req,
                r.status,
                `${r.score}%`,
                r.explanation
            ]),
            headStyles: { fillColor: primaryColor },
            theme: 'striped'
        });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Sri Manakula Vinayagar Engineering College — Dept of AI & DS", 105, 285, { align: "center" });
    }

    doc.save(`Evaluation_Team_${team.team_number}_${team.name}.pdf`);
};

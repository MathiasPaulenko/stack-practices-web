import fs from 'fs';
import path from 'path';

const GENERIC_ES_PHRASES = [
  /\b(Documenta|Documente) [^.]+\./gi,
  /\b(Monitorea|Monitoree|Monitor) [^.]+\./gi,
  /\b(Alerta|Alerte|Alertar) (en|sobre)? [^.]+\./gi,
  /\b(Revisa|Revise|Revisar) [^.]+\./gi,
  /\b(Testea|Testee|Testar) [^.]+\./gi,
  /\b(Usa|Use|Utiliza|Utilice) [^.]+\./gi,
  /\b(Implementa|Implemente) [^.]+\./gi,
  /\b(Trackea|Trackear|Track) [^.]+\./gi,
  /\b(Mantén|Mantenga|Manten) [^.]+\./gi,
  /\b(Optimiza|Optimice) [^.]+\./gi,
  /\b(Mide|Mida|Medir) [^.]+\./gi,
  /\b(Mantén|Mantenga) [^.]+\./gi,
  /\b(Asegura|Asegure|Asegurar) [^.]+\./gi,
  /\b(Evita|Evite|Evitar) [^.]+\./gi,
  /\b(Actualiza|Actualice|Actualizar) [^.]+\./gi,
  /\b(Chequea|Chequee|Checar) [^.]+\./gi,
  /\b(Almacena|Almacene|Almacenar) [^.]+\./gi,
  /\b(Comparte|Comparta|Compartir) [^.]+\./gi,
  /\b(Reporta|Reporte|Reportar) [^.]+\./gi,
  /\b(Maneja|Maneje|Manejar) [^.]+\./gi,
  /\b(Agenda|Agende|Calendariza|Calendarice) [^.]+\./gi,
  /\b(Limpia|Limpie|Limpiar) [^.]+\./gi,
  /\b(Elimina|Elimine|Eliminar) [^.]+\./gi,
  /\b(Remueve|Remueva|Remover) [^.]+\./gi,
  /\b(Borra|Borre|Borrar) [^.]+\./gi,
  /\b(Configura|Configure) [^.]+\./gi,
  /\b(Automatiza|Automatice|Automatizar) [^.]+\./gi,
  /\b(Genera|Genere|Generar) [^.]+\./gi,
  /\b(Incluye|Incluya|Incluir) [^.]+\./gi,
  /\b(Compara|Compare|Comparar) [^.]+\./gi,
  /\b(Identifica|Identifique|Identificar) [^.]+\./gi,
  /\b(Investiga|Investigue|Investigar) [^.]+\./gi,
  /\b(Prioriza|Priorice|Priorizar) [^.]+\./gi,
  /\b(Minimiza|Minimice|Minimizar) [^.]+\./gi,
  /\b(Balancea|Balancee|Balancear) [^.]+\./gi,
  /\b(Right-sizea|Right-sizee|Right-sizear) [^.]+\./gi,
  /\bTrackea [^.]+\./g,
  /\bStorea [^.]+\./g,
  /\bSchedulea [^.]+\./g,
  /\bDeletea [^.]+\./g,
  /\bAddressea [^.]+\./g,
  /\bHighlighta [^.]+\./g,
  /\bComparte [^.]+\./g,
  /\bComunica [^.]+\./g,
  /\bEntrena [^.]+\./g,
  /\bProcesa [^.]+\./g,
  /\bStartea [^.]+\./g,
  /\bDeployea [^.]+\./g,
  /\bLoggea [^.]+\./g,
  /\bCorre [^.]+\./g,
];

function compressBulletPoint(line) {
  const match = line.match(/^(\s*-\s+\*\*[^*]+\*\*:\s*)(.+)$/);
  if (!match) return line;

  const prefix = match[1];
  let body = match[2];

  const sentences = body.match(/[^.!?]+[.!?]+/g) || [body];
  const filtered = sentences.filter((s) => {
    const trimmed = s.trim();
    if (GENERIC_ES_PHRASES.some((re) => re.test(trimmed))) {
      return false;
    }
    return true;
  });

  const result = filtered.length > 0 ? filtered.join(' ').trim() : sentences[0].trim();
  if (result !== body.trim()) {
    return prefix + result;
  }
  return line;
}

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full).forEach((x) => files.push(x));
    else if (f.endsWith('.es.md')) files.push(full);
  }
  return files;
}

const allFiles = walk('src/content');
let totalFiles = 0;
let totalBullets = 0;
let totalChars = 0;

for (const f of allFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*-\s+\*\*[^*]+\*\*:/)) {
      const compressed = compressBulletPoint(lines[i]);
      if (compressed !== lines[i]) {
        totalChars += lines[i].length - compressed.length;
        lines[i] = compressed;
        totalBullets++;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(f, lines.join('\n'));
    totalFiles++;
  }
}

console.log(`Compressed ${totalBullets} ES bullet points in ${totalFiles} files, removed ${totalChars} chars`);

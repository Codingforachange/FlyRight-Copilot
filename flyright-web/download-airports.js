const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(res.headers.location));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Standard CSV quote-aware regex splitter
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cleanValues[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

async function buildNationwideAirports() {
  console.log('1/2 Fetching master FAA aerodromes & runways datasets...');
  
  const [airportsRaw, runwaysRaw] = await Promise.all([
    fetchText('https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/airports.csv'),
    fetchText('https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/runways.csv')
  ]);

  console.log('2/2 Processing and joining primary runway geometry across all US airfields...');
  const airportRows = parseCSV(airportsRaw);
  const runwayRows = parseCSV(runwaysRaw);

  // Index the longest active runway for every airport by its internal ident
  const primaryRunways = new Map();
  for (const r of runwayRows) {
    if (!r.airport_ident) continue;
    const length = parseInt(r.length_ft) || 0;
    const heading = parseInt(r.le_heading_degT) || (r.le_ident ? parseInt(r.le_ident.replace(/\D/g, '')) * 10 : 90);
    
    const existing = primaryRunways.get(r.airport_ident);
    if (!existing || length > existing.lengthFt) {
      primaryRunways.set(r.airport_ident, {
        lengthFt: length > 500 ? length : 4500,
        headingDeg: (!isNaN(heading) && heading >= 0 && heading <= 360) ? heading : 90
      });
    }
  }

  const result = [];
  for (const a of airportRows) {
    if (a.iso_country !== 'US') continue;
    
    // Support ICAO (e.g. KBTP, KOSH) or local FAA LID (e.g. POV, 3G3)
    const code = (a.gps_code || a.ident || a.local_code || '').toUpperCase().trim();
    if (!code || code.length < 3) continue;

    const rwy = primaryRunways.get(a.ident) || { lengthFt: 4500, headingDeg: 90 };

    result.push({
      icao: code,
      name: a.name || `${code} Field`,
      city: a.municipality || '',
      state: (a.iso_region || '').replace('US-', ''),
      lat: parseFloat(a.latitude_deg),
      lng: parseFloat(a.longitude_deg),
      elevationFt: parseInt(a.elevation_ft) || 1000,
      runwayHeadingDeg: rwy.headingDeg,
      runwayLengthFt: rwy.lengthFt
    });
  }

  const outDir = path.join(__dirname, 'src', 'assets', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'us-airports.json');
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`Success! Complete US database compiled: ${result.length} aerodromes with true runway lengths and headings.`);
}

buildNationwideAirports().catch(err => console.error('Build failure:', err));

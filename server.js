const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Prevent crashes from unhandled errors
process.on('uncaughtException', (err) => {
    console.error('⚠ Uncaught exception (non-fatal):', err.message);
});
process.on('unhandledRejection', (err) => {
    console.error('⚠ Unhandled rejection (non-fatal):', err.message || err);
});

const app = express();
const PORT = 3000;
const EXAMS_DIR = path.join(__dirname, 'exams');

// Ensure exams directory exists
if (!fs.existsSync(EXAMS_DIR)) {
    fs.mkdirSync(EXAMS_DIR, { recursive: true });
}

// Clean up orphaned download metadata files from interrupted downloads
try {
    fs.readdirSync(EXAMS_DIR)
        .filter(f => f.startsWith('.dl-') && f.endsWith('.json'))
        .forEach(f => fs.unlinkSync(path.join(EXAMS_DIR, f)));
} catch {}

// Custom exam names (user renames) stored in a JSON map: filename -> custom name
const NAMES_FILE = path.join(EXAMS_DIR, '.custom-names.json');

function loadCustomNames() {
    try {
        return JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveCustomNames(names) {
    fs.writeFileSync(NAMES_FILE, JSON.stringify(names, null, 2));
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Known providers for matching
const PROVIDERS = [
    { id: 'amazon', name: 'Amazon (AWS)', keywords: ['aws', 'amazon'] },
    { id: 'cisco', name: 'Cisco', keywords: ['cisco'] },
    { id: 'comptia', name: 'CompTIA', keywords: ['comptia'] },
    { id: 'google', name: 'Google Cloud', keywords: ['google', 'gcp'] },
    { id: 'microsoft', name: 'Microsoft', keywords: ['microsoft', 'azure', 'ms'] },
    { id: 'isc2', name: 'ISC2', keywords: ['isc2', 'cissp'] },
    { id: 'salesforce', name: 'Salesforce', keywords: ['salesforce'] },
    { id: 'fortinet', name: 'Fortinet', keywords: ['fortinet', 'nse'] },
    { id: 'juniper', name: 'Juniper', keywords: ['juniper'] },
    { id: 'isaca', name: 'ISACA', keywords: ['isaca'] },
    { id: 'vmware', name: 'VMware', keywords: ['vmware'] },
    { id: 'servicenow', name: 'ServiceNow', keywords: ['servicenow'] },
    { id: 'ec-council', name: 'EC-Council', keywords: ['ec-council', 'ceh'] },
    { id: 'oracle', name: 'Oracle', keywords: ['oracle'] },
    { id: 'paloaltonetworks', name: 'Palo Alto Networks', keywords: ['paloalto', 'paloaltonetworks'] },
];

function detectProvider(filename, content) {
    const lower = filename.toLowerCase();
    for (const p of PROVIDERS) {
        for (const kw of p.keywords) {
            if (lower.includes(kw)) return p;
        }
    }
    // Try content
    if (content) {
        const contentLower = content.substring(0, 2000).toLowerCase();
        for (const p of PROVIDERS) {
            for (const kw of p.keywords) {
                if (contentLower.includes(kw)) return p;
            }
        }
    }
    return { id: 'other', name: 'Autre' };
}

// API: List downloaded exams (grouped by provider)
app.get('/api/exams', (req, res) => {
    try {
        const files = fs.readdirSync(EXAMS_DIR)
            .filter(f => f.endsWith('.md'))
            .map(f => {
                const filePath = path.join(EXAMS_DIR, f);
                const stats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                const questionCount = (content.match(/^-{3,}$/gm) || []).length - 1;
                // Try multiple header formats to extract the exam name
                let examMatch = content.match(/##\s*Exam\s+(.+?)\s+topic/i)       // "Exam X topic Y question"
                             || content.match(/##\s*Examtopics\s+(.+?)(?:_\d+)?\s+question/i)  // "Examtopics X_NN question"
                             || content.match(/Exam\s+(.+?)\s+topic/i);
                const provider = detectProvider(f, content);
                // Use the raw exam name from the file content, or fallback to filename
                let examName = examMatch ? examMatch[1].trim() : f.replace(/\.md$/, '').replace(/_/g, ' ');
                
                // Apply custom name if user renamed it
                const customNames = loadCustomNames();
                const displayName = customNames[f] || examName;
                return {
                    filename: f,
                    name: displayName,
                    originalName: examName,
                    isCustom: !!customNames[f],
                    provider: provider.id,
                    providerName: provider.name,
                    size: stats.size,
                    questions: Math.max(questionCount, 0),
                    downloadedAt: stats.mtime.toISOString(),
                };
            });
        
        // Group by provider
        const grouped = {};
        for (const exam of files) {
            if (!grouped[exam.provider]) {
                grouped[exam.provider] = {
                    id: exam.provider,
                    name: exam.providerName,
                    exams: []
                };
            }
            grouped[exam.provider].exams.push(exam);
        }

        res.json({ exams: files, grouped: Object.values(grouped) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Get exam content
app.get('/api/exams/:filename', (req, res) => {
    const filePath = path.join(EXAMS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Exam not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
});

// API: Delete an exam
app.delete('/api/exams/:filename', (req, res) => {
    const filePath = path.join(EXAMS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Exam not found' });
    }
    fs.unlinkSync(filePath);
    // Also remove any custom name entry
    const names = loadCustomNames();
    if (names[req.params.filename]) {
        delete names[req.params.filename];
        saveCustomNames(names);
    }
    res.json({ success: true });
});

// API: Rename an exam (custom display name)
app.put('/api/exams/:filename/rename', express.json(), (req, res) => {
    const filePath = path.join(EXAMS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Exam not found' });
    }
    const { name } = req.body;
    const names = loadCustomNames();
    if (name && name.trim()) {
        names[req.params.filename] = name.trim();
    } else {
        delete names[req.params.filename]; // empty = reset to original
    }
    saveCustomNames(names);
    res.json({ success: true });
});

// API: Upload an exam file
app.post('/api/exams/upload', express.text({ limit: '50mb' }), (req, res) => {
    const { filename, content } = JSON.parse(req.body);
    if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content required' });
    }
    const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const filePath = path.join(EXAMS_DIR, safeName.endsWith('.md') ? safeName : safeName + '.md');
    fs.writeFileSync(filePath, content);
    res.json({ success: true, filename: path.basename(filePath) });
});

// API: List available providers
app.get('/api/providers', (req, res) => {
    const providers = [
        { id: 'amazon', name: 'Amazon (AWS)', description: 'AWS Certifications' },
        { id: 'cisco', name: 'Cisco', description: 'CCNA, CCNP, etc.' },
        { id: 'comptia', name: 'CompTIA', description: 'A+, Security+, Network+, etc.' },
        { id: 'google', name: 'Google Cloud', description: 'GCP Certifications' },
        { id: 'microsoft', name: 'Microsoft', description: 'Azure, M365, etc.' },
        { id: 'isc2', name: 'ISC2', description: 'CISSP, CCSP, etc.' },
        { id: 'salesforce', name: 'Salesforce', description: 'Salesforce Certs' },
        { id: 'fortinet', name: 'Fortinet', description: 'NSE Certifications' },
        { id: 'juniper', name: 'Juniper', description: 'JNCIA, JNCIS, etc.' },
        { id: 'isaca', name: 'ISACA', description: 'CISA, CISM, etc.' },
        { id: 'vmware', name: 'VMware', description: 'VCP, VCAP, etc.' },
        { id: 'servicenow', name: 'ServiceNow', description: 'ServiceNow Certs' },
        { id: 'ec-council', name: 'EC-Council', description: 'CEH, etc.' },
        { id: 'oracle', name: 'Oracle', description: 'OCA, OCP, etc.' },
        { id: 'paloaltonetworks', name: 'Palo Alto Networks', description: 'PCNSA, PCNSE, etc.' },
    ];
    res.json({ providers });
});

// API: List available exams for a provider (runs docker quickly)
app.get('/api/providers/:id/exams', async (req, res) => {
    const provider = req.params.id;
    try {
        const result = execSync(
            `docker run --rm ghcr.io/thatonecodes/examtopics-downloader:latest -p ${provider} -exams`,
            { timeout: 30000, stdio: 'pipe' }
        ).toString();
        
        const urls = result.match(/https:\/\/www\.examtopics\.com\/exams\/[^\s]+/g) || [];
        const exams = urls.map(url => {
            const parts = url.replace(/\/$/, '').split('/');
            const slug = parts[parts.length - 1];
            // Make a readable name from slug
            const name = slug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
            return { slug, name, url };
        });
        
        res.json({ provider, exams });
    } catch (err) {
        res.status(500).json({ error: 'Impossible de lister les exams. Docker est-il démarré ?' });
    }
});

// API: Get exam info (last update date) by scraping the exam page
app.get('/api/providers/:id/exams/:slug/info', async (req, res) => {
    const { id: provider, slug } = req.params;
    const url = `https://www.examtopics.com/exams/${provider}/${slug}/`;
    
    try {
        const https = require('https');
        const html = await new Promise((resolve, reject) => {
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(data));
            }).on('error', reject);
        });
        
        // Try to find last updated date in the page
        const dateMatch = html.match(/Last Updated[:\s]*<[^>]*>([^<]+)</i) ||
                          html.match(/Updated[:\s]*([A-Z][a-z]+ \d+,? \d{4})/i) ||
                          html.match(/"dateModified"\s*:\s*"([^"]+)"/i) ||
                          html.match(/(\w+ \d+, \d{4})\s*<\/span>/);
        
        // Try to find question count
        const countMatch = html.match(/(\d+)\s*Questions/i);
        
        const lastUpdated = dateMatch ? dateMatch[1].trim() : null;
        const questionCount = countMatch ? parseInt(countMatch[1]) : null;
        
        res.json({ provider, slug, lastUpdated, questionCount, url });
    } catch (err) {
        res.json({ provider, slug, lastUpdated: null, questionCount: null, url, error: err.message });
    }
});

// API: Download exam using examtopics-downloader (Docker)
app.post('/api/download', (req, res) => {
    const { provider, search } = req.body;
    if (!provider || !search) {
        return res.status(400).json({ error: 'provider and search required' });
    }

    const outputFile = `${provider}_${search.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    const outputPath = path.join(EXAMS_DIR, outputFile);

    // Check if Docker is available
    try {
        execSync('docker --version', { stdio: 'pipe' });
    } catch {
        return res.status(500).json({ 
            error: 'Docker non trouvé. Installez Docker ou téléchargez manuellement.',
            manual: true 
        });
    }

    // Check if Docker daemon is running
    try {
        execSync('docker info', { stdio: 'pipe' });
    } catch {
        return res.status(500).json({
            error: 'Docker n\'est pas démarré. Lancez Docker Desktop d\'abord.',
            manual: true
        });
    }

    const containerName = `examtopics-dl-${Date.now()}`;
    
    // Store download metadata so status endpoint can read the exam name
    const metaFile = path.join(EXAMS_DIR, `.dl-${containerName}.json`);
    fs.writeFileSync(metaFile, JSON.stringify({ provider, search, startedAt: new Date().toISOString() }));
    
    res.json({ status: 'started', containerName, provider, search, message: `Téléchargement en cours: ${provider} / ${search}...` });
    
    // Run the download with -c flag to include comments/discussions, then copy, then cleanup
    const runCmd = `docker run --name ${containerName} ghcr.io/thatonecodes/examtopics-downloader:latest -p ${provider} -s "${search}" -c -save-links -o output.md`;
    
    exec(runCmd, { timeout: 600000 }, (error) => {
        // Copy the output file from the container
        exec(`docker cp ${containerName}:/app/output.md "${outputPath}"`, (cpErr) => {
            if (cpErr) {
                console.error(`✗ Failed to copy: ${outputFile}`);
            } else {
                console.log(`✓ Downloaded: ${outputFile}`);
                try {
                    const stat = fs.statSync(outputPath);
                    if (stat.size < 500) {
                        console.warn(`⚠ File ${outputFile} seems too small (${stat.size} bytes)`);
                    }
                } catch {}
            }
            // Cleanup container and metadata
            exec(`docker rm ${containerName}`, () => {});
            try { fs.unlinkSync(metaFile); } catch {}
        });
    });
});

// API: Check download status with progress and logs (supports multiple downloads)
app.get('/api/download/status', (req, res) => {
    try {
        const running = execSync('docker ps --filter "name=examtopics-dl" --format "{{.Names}}"', { stdio: 'pipe' }).toString().trim();
        const containers = running ? running.split('\n').filter(c => c) : [];
        
        if (containers.length === 0) {
            return res.json({ downloading: false, downloads: [] });
        }
        
        const downloads = containers.map(name => {
            try {
                const logs = execSync(`docker logs ${name} 2>&1 | tail -c 5000`, { stdio: 'pipe', timeout: 5000 }).toString();
                
                const allMatches = [...logs.matchAll(/(\d+)\s*\/\s*(\d+)\s*\[[^\]]*\]\s*([\d.]+)%(?:\s*([\d.]+)\s*p\/s)?/g)];
                let progress = null;
                if (allMatches.length > 0) {
                    const last = allMatches[allMatches.length - 1];
                    const current = parseInt(last[1]);
                    const total = parseInt(last[2]);
                    const speed = last[4] ? parseFloat(last[4]) : null;
                    const remaining = speed && speed > 0 ? Math.round((total - current) / speed) : null;
                    progress = {
                        current, total,
                        percent: parseFloat(last[3]),
                        speed,
                        etaSeconds: remaining
                    };
                }

                const completedPasses = (logs.match(/100\.00%/g) || []).length;
                let step = 1, stepLabel = 'Récupération des liens...';
                if (completedPasses >= 2) { step = 3; stepLabel = 'Extraction des commentaires...'; }
                else if (completedPasses >= 1) { step = 2; stepLabel = 'Téléchargement des questions...'; }

                // Read exam name from metadata file
                let examName = '';
                const metaFile = path.join(EXAMS_DIR, `.dl-${name}.json`);
                try {
                    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
                    examName = `${meta.provider} / ${meta.search}`;
                } catch {
                    const providerMatch = logs.match(/Fetching \d+ pages for provider '(\w+)'/);
                    examName = providerMatch ? providerMatch[1] : name;
                }

                const logLines = logs.split(/[\r\n]+/)
                    .map(l => l.trim())
                    .filter(l => l.length > 3)
                    .filter(l => !l.match(/\d+\s*\/\s*\d+\s*\[/))   // remove progress bars
                    .filter(l => !l.match(/p\/s$/))
                    .filter(l => !l.match(/^\d+\.\d+%/))
                    .filter(l => !l.match(/^[\s\-\>\_\#\|\[\]]+$/)) // remove visual noise
                    .map(l => {
                        // Make log lines more readable
                        if (l.match(/cached data failed/i)) return '⚙ Cache GitHub indisponible, passage en scraping direct';
                        if (l.match(/Fetching (\d+) pages for provider '(\w+)'/i)) {
                            const m = l.match(/Fetching (\d+) pages for provider '(\w+)'/i);
                            return `🔍 Scraping de ${m[1]} pages (provider: ${m[2]})`;
                        }
                        if (l.match(/status code: 403/i)) return '⚠ HTTP 403 (rate-limit ponctuel, retry auto)';
                        if (l.match(/status code: 429/i)) return '⚠ HTTP 429 (trop de requêtes, ralentissement)';
                        if (l.match(/timeout/i)) return '⏱ Timeout réseau sur une page (retry auto)';
                        if (l.match(/Retry attempt (\d+)/i)) {
                            const m = l.match(/Retry attempt (\d+) for URL: (\S+)/i);
                            return m ? `🔄 Nouvelle tentative #${m[1]}` : '🔄 Nouvelle tentative';
                        }
                        if (l.match(/Successfully saved/i)) return '💾 Sauvegarde du fichier...';
                        if (l.match(/response body was nil/i)) return '⚠ Réponse vide (ignorée)';
                        if (l.match(/failed to fetch/i)) return '⚠ Échec de récupération (retry auto)';
                        if (l.match(/Failed to parse HTML/i)) return '⚠ Page non parsable (ignorée)';
                        return l;
                    })
                    .slice(-6);

                return { name, progress, step, stepLabel, examName, logLines };
            } catch {
                return { name, progress: null, step: 1, stepLabel: 'Démarrage...', examName: name, logLines: [] };
            }
        });

        res.json({ downloading: true, downloads });
    } catch {
        res.json({ downloading: false, downloads: [] });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n  🎓 ExamTopics Practice`);
    console.log(`  ─────────────────────`);
    console.log(`  → http://localhost:${PORT}\n`);
    console.log(`  Exams stockés dans: ${EXAMS_DIR}`);
    console.log(`  ${fs.readdirSync(EXAMS_DIR).filter(f => f.endsWith('.md')).length} exam(s) disponible(s)\n`);
});

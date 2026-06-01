const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const app = express();
const PORT = 3000;
const EXAMS_DIR = path.join(__dirname, 'exams');

// Ensure exams directory exists
if (!fs.existsSync(EXAMS_DIR)) {
    fs.mkdirSync(EXAMS_DIR, { recursive: true });
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
                const examMatch = content.match(/Exam\s+([\w\-]+)\s+topic/i);
                const examName = examMatch ? examMatch[1] : f.replace('.md', '').replace(/_/g, ' ');
                const provider = detectProvider(f, content);
                return {
                    filename: f,
                    name: examName,
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
    
    res.json({ status: 'started', containerName, message: `Téléchargement en cours: ${provider} / ${search}...` });
    
    // Run the download with -c flag to include comments/discussions, then copy, then cleanup
    const script = `
        docker run --name ${containerName} ghcr.io/thatonecodes/examtopics-downloader:latest -p ${provider} -s "${search}" -c -save-links -o output.md
        docker cp ${containerName}:/app/output.md "${outputPath}"
        docker rm ${containerName}
    `;
    
    exec(`/bin/sh -c '${script.replace(/'/g, "'\\''")}'`, { timeout: 600000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Download error for ${outputFile}: ${error.message}`);
            // Try to copy anyway in case the run succeeded but something else failed
            try {
                execSync(`docker cp ${containerName}:/app/output.md "${outputPath}"`, { stdio: 'pipe' });
                execSync(`docker rm ${containerName}`, { stdio: 'pipe' });
                console.log(`Recovered file: ${outputFile}`);
            } catch {
                // Cleanup
                try { execSync(`docker rm ${containerName} 2>/dev/null`, { stdio: 'pipe' }); } catch {}
            }
        } else {
            console.log(`✓ Downloaded: ${outputFile}`);
        }
        
        // Verify the file is valid (more than just a header)
        try {
            const content = fs.readFileSync(outputPath, 'utf8');
            if (content.length < 500) {
                console.warn(`⚠ File ${outputFile} seems too small (${content.length} bytes). Search term may not match any exam.`);
            }
        } catch {}
    });
});

// API: Check download status with progress
app.get('/api/download/status', (req, res) => {
    try {
        // Get running containers
        const running = execSync('docker ps --filter "name=examtopics-dl" --format "{{.Names}}"', { stdio: 'pipe' }).toString().trim();
        const containers = running ? running.split('\n') : [];
        
        if (containers.length === 0) {
            return res.json({ downloading: false, containers: [] });
        }
        
        // Get progress from logs of the first container
        const logs = execSync(`docker logs ${containers[0]} 2>&1 | tail -5`, { stdio: 'pipe', timeout: 5000 }).toString();
        
        // Parse progress: "150 / 599 [...] 25.04% 2 p/s"
        const progressMatch = logs.match(/(\d+)\s*\/\s*(\d+)\s*\[.*?\]\s*([\d.]+)%/);
        let progress = null;
        if (progressMatch) {
            progress = {
                current: parseInt(progressMatch[1]),
                total: parseInt(progressMatch[2]),
                percent: parseFloat(progressMatch[3])
            };
        }
        
        res.json({ downloading: true, containers, progress });
    } catch {
        res.json({ downloading: false, containers: [] });
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

/**
 * ExamTopics Practice - Main Application
 */
(function () {
    'use strict';

    // ─── State ───────────────────────────────────────────────────────────
    let allQuestions = [];
    let currentQuestions = [];
    let currentIndex = 0;
    let userAnswers = {};
    let mode = '';
    let timerInterval = null;
    let timeRemaining = 0;
    let trainCorrect = 0;
    let trainTotal = 0;
    let currentExamName = '';

    // ─── DOM ─────────────────────────────────────────────────────────────
    const screens = {
        home: document.getElementById('homeScreen'),
        modeSelect: document.getElementById('modeSelect'),
        exam: document.getElementById('examScreen'),
        training: document.getElementById('trainingScreen'),
        results: document.getElementById('resultsScreen')
    };

    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[name].classList.add('active');
        window.scrollTo(0, 0);
    }

    // ─── Home: Load Exam Library ─────────────────────────────────────────
    async function loadLibrary() {
        const container = document.getElementById('examLibrary');
        try {
            const res = await fetch('/api/exams');
            const data = await res.json();
            
            if (data.exams.length === 0) {
                container.innerHTML = `
                    <div class="empty-library">
                        <div class="empty-icon">📭</div>
                        <p>Aucune certification téléchargée</p>
                        <p style="font-size:0.85rem;margin-top:0.5rem">Importez un fichier .md ou téléchargez depuis ExamTopics</p>
                    </div>`;
                return;
            }

            // Render grouped by provider
            let html = '';
            for (const group of data.grouped) {
                html += `<div class="provider-group">
                    <h3 class="provider-title">${group.name} <span class="provider-count">(${group.exams.length})</span></h3>
                    <div class="provider-exams">`;
                for (const exam of group.exams) {
                    html += `
                        <div class="exam-card" data-filename="${exam.filename}">
                            <button class="exam-card-delete" data-filename="${exam.filename}" title="Supprimer">🗑️</button>
                            <div class="exam-card-title">${escapeHTML(exam.name)}</div>
                            <div class="exam-card-meta">
                                <span>📝 ${exam.questions} questions</span>
                                <span>📅 ${new Date(exam.downloadedAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                        </div>`;
                }
                html += `</div></div>`;
            }
            container.innerHTML = html;

            // Bind card clicks
            container.querySelectorAll('.exam-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('exam-card-delete')) return;
                    loadExam(card.dataset.filename);
                });
            });

            // Bind delete buttons
            container.querySelectorAll('.exam-card-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const filename = btn.dataset.filename;
                    if (confirm(`Supprimer "${filename}" ?`)) {
                        await fetch(`/api/exams/${filename}`, { method: 'DELETE' });
                        loadLibrary();
                    }
                });
            });
        } catch (err) {
            container.innerHTML = `<div class="empty-library"><p>Erreur de chargement: ${err.message}</p></div>`;
        }
    }

    async function loadExam(filename) {
        try {
            const res = await fetch(`/api/exams/${filename}`);
            const data = await res.json();
            allQuestions = parseExamTopicsMarkdown(data.content);
            
            if (allQuestions.length === 0) {
                alert('Aucune question trouvée dans ce fichier.');
                return;
            }

            currentExamName = filename.replace('.md', '').replace(/_/g, ' ');
            showModeSelect();
        } catch (err) {
            alert(`Erreur: ${err.message}`);
        }
    }

    // ─── Import File ─────────────────────────────────────────────────────
    const fileInput = document.getElementById('fileInput');
    
    document.getElementById('btnImport').addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const content = await file.text();
        const questions = parseExamTopicsMarkdown(content);
        
        if (questions.length === 0) {
            alert('Aucune question trouvée dans ce fichier. Vérifiez le format.');
            return;
        }

        // Save to server
        const filename = file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        await fetch('/api/exams/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ filename, content })
        });

        // Reload library and open the exam
        await loadLibrary();
        allQuestions = questions;
        currentExamName = filename.replace('.md', '').replace(/_/g, ' ');
        showModeSelect();
        
        fileInput.value = '';
    });

    // ─── Download Modal ──────────────────────────────────────────────────
    const downloadModal = document.getElementById('downloadModal');
    
    document.getElementById('btnDownload').addEventListener('click', async () => {
        downloadModal.classList.remove('hidden');
        await loadProviders();
    });

    document.getElementById('closeDownloadModal').addEventListener('click', () => {
        downloadModal.classList.add('hidden');
    });

    downloadModal.addEventListener('click', (e) => {
        if (e.target === downloadModal) downloadModal.classList.add('hidden');
    });

    async function loadProviders() {
        const select = document.getElementById('dlProvider');
        if (select.options.length > 1) return; // Already loaded
        
        try {
            const res = await fetch('/api/providers');
            const data = await res.json();
            select.innerHTML = '<option value="">— Choisissez un provider —</option>' +
                data.providers.map(p => 
                    `<option value="${p.id}">${p.name} — ${p.description}</option>`
                ).join('');
        } catch (err) {
            select.innerHTML = '<option>Erreur de chargement</option>';
        }
    }

    document.getElementById('dlProvider').addEventListener('change', loadProviderExams);

    async function loadProviderExams() {
        const provider = document.getElementById('dlProvider').value;
        const examSelect = document.getElementById('dlExamSelect');
        const hint = document.getElementById('dlExamHint');
        const infoBox = document.getElementById('dlExamInfo');
        
        infoBox.classList.add('hidden');
        
        if (!provider) {
            examSelect.innerHTML = '<option value="">— Sélectionnez un provider d\'abord —</option>';
            hint.textContent = '💡 Sélectionnez un provider pour charger la liste des exams disponibles';
            return;
        }
        
        examSelect.innerHTML = '<option value="">⏳ Chargement des exams...</option>';
        hint.textContent = '💡 Chargement en cours...';
        
        try {
            const res = await fetch(`/api/providers/${provider}/exams`);
            const data = await res.json();
            
            if (data.error) {
                examSelect.innerHTML = '<option value="">❌ Erreur - Docker non disponible</option>';
                hint.textContent = '⚠️ Lancez Docker Desktop puis réessayez';
                return;
            }
            
            examSelect.innerHTML = '<option value="">— Choisissez un examen —</option>' +
                data.exams.map(e => `<option value="${e.slug}">${e.name}</option>`).join('');
            hint.textContent = `✓ ${data.exams.length} exams disponibles`;
            updateDownloadCommand();
        } catch (err) {
            examSelect.innerHTML = '<option value="">❌ Erreur de chargement</option>';
            hint.textContent = '⚠️ Vérifiez que Docker est démarré';
        }
    }

    document.getElementById('dlExamSelect').addEventListener('change', async () => {
        updateDownloadCommand();
        const provider = document.getElementById('dlProvider').value;
        const slug = document.getElementById('dlExamSelect').value;
        const infoBox = document.getElementById('dlExamInfo');
        const infoText = document.getElementById('dlExamInfoText');
        
        if (!slug) {
            infoBox.classList.add('hidden');
            return;
        }
        
        infoBox.classList.remove('hidden');
        infoText.innerHTML = '⏳ Récupération des infos...';
        
        try {
            const res = await fetch(`/api/providers/${provider}/exams/${slug}/info`);
            const data = await res.json();
            
            let html = `<a href="${data.url}" target="_blank">🔗 Voir sur ExamTopics</a>`;
            if (data.lastUpdated) {
                html += ` &nbsp;|&nbsp; 📅 Dernière mise à jour : <strong>${data.lastUpdated}</strong>`;
            }
            if (data.questionCount) {
                html += ` &nbsp;|&nbsp; 📝 ${data.questionCount} questions`;
            }
            if (!data.lastUpdated && !data.questionCount) {
                html += ` &nbsp;|&nbsp; <span style="color:var(--text-muted)">Infos non disponibles</span>`;
            }
            infoText.innerHTML = html;
        } catch {
            infoText.innerHTML = '⚠️ Impossible de récupérer les infos';
        }
    });

    function updateDownloadCommand() {
        const provider = document.getElementById('dlProvider').value || 'cisco';
        const search = document.getElementById('dlExamSelect').value || '200-301';
        const safeName = `${provider}_${search.replace(/[^a-zA-Z0-9]/g, '_')}`;
        document.getElementById('dlCommand').textContent = 
            `docker run --name examtopics-dl ghcr.io/thatonecodes/examtopics-downloader:latest -p ${provider} -s "${search}" -c -save-links -o output.md && docker cp examtopics-dl:/app/output.md ./exams/${safeName}.md && docker rm examtopics-dl`;
    }

    // Copy command button
    document.getElementById('btnCopyCmd').addEventListener('click', () => {
        const cmd = document.getElementById('dlCommand').textContent;
        navigator.clipboard.writeText(cmd).then(() => {
            const btn = document.getElementById('btnCopyCmd');
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = '📋', 1500);
        });
    });

    document.getElementById('btnStartDownload').addEventListener('click', async () => {
        const provider = document.getElementById('dlProvider').value;
        const search = document.getElementById('dlExamSelect').value;
        const status = document.getElementById('dlStatus');

        if (!search) {
            status.textContent = 'Sélectionnez un examen dans la liste';
            status.className = 'dl-status error';
            status.classList.remove('hidden');
            return;
        }

        status.textContent = '⏳ Téléchargement lancé... Cela peut prendre quelques minutes.';
        status.className = 'dl-status info';
        status.classList.remove('hidden');

        try {
            const res = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, search })
            });
            const data = await res.json();
            
            if (data.error) {
                status.textContent = data.error;
                status.className = 'dl-status error';
                if (data.manual) {
                    status.textContent += '\n\nCopiez la commande ci-dessous et exécutez-la dans votre terminal.';
                }
            } else {
                status.textContent = '✓ Téléchargement lancé ! Rafraîchissez la page dans quelques minutes.';
                status.className = 'dl-status success';
                // Poll for completion
                pollDownloadStatus();
            }
        } catch (err) {
            status.textContent = `Erreur: ${err.message}`;
            status.className = 'dl-status error';
        }
    });

    function pollDownloadStatus() {
        const progressBox = document.getElementById('dlProgress');
        const progressText = document.getElementById('dlProgressText');
        const progressPercent = document.getElementById('dlProgressPercent');
        const progressFill = document.getElementById('dlProgressFill');
        const progressDetail = document.getElementById('dlProgressDetail');
        
        progressBox.classList.remove('hidden');
        progressText.textContent = 'Scraping en cours...';
        progressPercent.textContent = '0%';
        progressFill.style.width = '0%';
        progressDetail.textContent = 'Connexion au serveur ExamTopics...';
        
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/download/status');
                const data = await res.json();
                
                if (!data.downloading) {
                    clearInterval(interval);
                    progressText.textContent = '✓ Terminé !';
                    progressPercent.textContent = '100%';
                    progressFill.style.width = '100%';
                    progressDetail.textContent = 'Fichier sauvegardé. Rafraîchissez la bibliothèque.';
                    
                    const status = document.getElementById('dlStatus');
                    status.textContent = '✓ Téléchargement terminé ! Fermez cette fenêtre pour voir le résultat.';
                    status.className = 'dl-status success';
                    status.classList.remove('hidden');
                    
                    loadLibrary();
                    return;
                }
                
                if (data.progress) {
                    const p = data.progress;
                    progressText.textContent = `Scraping en cours...`;
                    progressPercent.textContent = `${p.percent.toFixed(1)}%`;
                    progressFill.style.width = `${p.percent}%`;
                    progressDetail.textContent = `${p.current} / ${p.total} questions récupérées`;
                }
            } catch {
                // Silently continue polling
            }
        }, 3000);
    }

    // ─── Mode Selection ──────────────────────────────────────────────────
    function showModeSelect() {
        document.getElementById('selectedExamTitle').textContent = currentExamName;
        document.getElementById('examInfo').innerHTML = `<strong>${allQuestions.length}</strong> questions disponibles`;
        
        const examCount = document.getElementById('examCount');
        const trainCount = document.getElementById('trainCount');
        examCount.max = allQuestions.length;
        trainCount.max = allQuestions.length;
        if (allQuestions.length < 20) examCount.value = allQuestions.length;
        if (allQuestions.length < 10) trainCount.value = allQuestions.length;

        // Setup range selector
        document.getElementById('rangeTo').max = allQuestions.length;
        document.getElementById('rangeTo').value = Math.min(50, allQuestions.length);
        document.getElementById('rangeFrom').max = allQuestions.length;
        document.getElementById('rangeN').max = allQuestions.length;
        document.getElementById('rangeN').value = Math.min(50, allQuestions.length);
        updateRangePreview();

        showScreen('modeSelect');
    }

    // Range selector logic
    document.querySelectorAll('input[name="questionRange"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const value = document.querySelector('input[name="questionRange"]:checked').value;
            const inputsBox = document.getElementById('rangeInputs');
            const customBox = document.getElementById('rangeCustom');
            const countBox = document.getElementById('rangeCount');
            
            if (value === 'all') {
                inputsBox.classList.add('hidden');
            } else {
                inputsBox.classList.remove('hidden');
                if (value === 'range') {
                    customBox.classList.remove('hidden');
                    countBox.classList.add('hidden');
                } else {
                    customBox.classList.add('hidden');
                    countBox.classList.remove('hidden');
                }
            }
            updateRangePreview();
            syncCountFields();
        });
    });

    document.getElementById('rangeFrom').addEventListener('input', () => { updateRangePreview(); syncCountFields(); });
    document.getElementById('rangeTo').addEventListener('input', () => { updateRangePreview(); syncCountFields(); });
    document.getElementById('rangeN').addEventListener('input', () => { updateRangePreview(); syncCountFields(); });

    function updateRangePreview() {
        const pool = getFilteredPool();
        const preview = document.getElementById('rangePreview');
        preview.textContent = `→ ${pool.length} questions dans la sélection`;
    }

    function syncCountFields() {
        const pool = getFilteredPool();
        // Auto-adjust the exam/training count fields to match the pool size
        const examCount = document.getElementById('examCount');
        const trainCount = document.getElementById('trainCount');
        examCount.max = pool.length;
        trainCount.max = pool.length;
        // If current value exceeds pool, adjust it
        if (parseInt(examCount.value) > pool.length) examCount.value = pool.length;
        if (parseInt(trainCount.value) > pool.length) trainCount.value = pool.length;
    }

    function getFilteredPool() {
        const rangeType = document.querySelector('input[name="questionRange"]:checked').value;
        
        // Sort by question number for range operations
        const sorted = [...allQuestions].sort((a, b) => parseInt(a.number) - parseInt(b.number));
        
        switch (rangeType) {
            case 'all':
                return allQuestions;
            case 'range': {
                const from = Math.max(1, parseInt(document.getElementById('rangeFrom').value) || 1);
                const to = Math.min(sorted.length, parseInt(document.getElementById('rangeTo').value) || sorted.length);
                // Filter by question number (not array index)
                return sorted.filter(q => {
                    const num = parseInt(q.number);
                    return num >= from && num <= to;
                });
            }
            case 'last': {
                const n = Math.min(sorted.length, parseInt(document.getElementById('rangeN').value) || 50);
                return sorted.slice(-n);
            }
            case 'first': {
                const n = Math.min(sorted.length, parseInt(document.getElementById('rangeN').value) || 50);
                return sorted.slice(0, n);
            }
            default:
                return allQuestions;
        }
    }

    document.getElementById('backToHome').addEventListener('click', () => {
        showScreen('home');
        loadLibrary();
        renderHistory();
    });

    // ─── Start Exam ──────────────────────────────────────────────────────
    document.getElementById('startExam').addEventListener('click', () => {
        const pool = getFilteredPool();
        if (pool.length === 0) {
            alert('Aucune question dans la sélection. Ajustez la plage.');
            return;
        }
        const count = Math.min(parseInt(document.getElementById('examCount').value) || 20, pool.length);
        const minutes = parseInt(document.getElementById('examTime').value) || 30;
        const shuffle = document.getElementById('examShuffle').checked;

        mode = 'exam';
        currentQuestions = selectQuestions(count, shuffle);
        currentIndex = 0;
        userAnswers = {};
        timeRemaining = minutes * 60;

        showScreen('exam');
        renderExamQuestion();
        startTimer();
    });

    // ─── Start Training ──────────────────────────────────────────────────
    document.getElementById('startTraining').addEventListener('click', () => {
        const pool = getFilteredPool();
        if (pool.length === 0) {
            alert('Aucune question dans la sélection. Ajustez la plage.');
            return;
        }
        const count = Math.min(parseInt(document.getElementById('trainCount').value) || 10, pool.length);
        const shuffle = document.getElementById('trainShuffle').checked;

        mode = 'training';
        currentQuestions = selectQuestions(count, shuffle);
        currentIndex = 0;
        userAnswers = {};
        trainCorrect = 0;
        trainTotal = 0;

        showScreen('training');
        renderTrainingQuestion();
    });

    // ─── Helpers ─────────────────────────────────────────────────────────
    function selectQuestions(count, shuffle) {
        let pool = [...getFilteredPool()];
        if (shuffle) {
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
        }
        return pool.slice(0, count);
    }

    // ─── Timer ───────────────────────────────────────────────────────────
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                finishExam();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const timer = document.getElementById('examTimer');
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        timer.classList.remove('warning', 'danger');
        if (timeRemaining <= 60) timer.classList.add('danger');
        else if (timeRemaining <= 300) timer.classList.add('warning');
    }

    // ─── Exam Mode ───────────────────────────────────────────────────────
    function renderExamQuestion() {
        const q = currentQuestions[currentIndex];
        const container = document.getElementById('examQuestion');
        container.innerHTML = buildQuestionHTML(q, userAnswers[currentIndex], false);
        
        document.getElementById('examProgress').textContent = `${currentIndex + 1}/${currentQuestions.length}`;
        document.getElementById('examProgressBar').style.width = `${((currentIndex + 1) / currentQuestions.length) * 100}%`;

        // Question dots
        const dotsContainer = document.getElementById('examQuestionDots');
        if (currentQuestions.length <= 50) {
            dotsContainer.innerHTML = currentQuestions.map((_, i) => {
                let cls = 'question-dot';
                if (i === currentIndex) cls += ' current';
                else if (userAnswers[i]) cls += ' answered';
                return `<span class="${cls}" data-idx="${i}"></span>`;
            }).join('');
            dotsContainer.querySelectorAll('.question-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    currentIndex = parseInt(dot.dataset.idx);
                    renderExamQuestion();
                });
            });
        } else {
            dotsContainer.innerHTML = '';
        }

        bindChoiceClicks(container, (letter) => {
            if (q.multiAnswer) {
                let current = userAnswers[currentIndex] || [];
                if (!Array.isArray(current)) current = [current];
                if (current.includes(letter)) {
                    current = current.filter(l => l !== letter);
                } else {
                    current.push(letter);
                    current.sort();
                }
                userAnswers[currentIndex] = current.length > 0 ? current : undefined;
            } else {
                userAnswers[currentIndex] = letter;
            }
            saveSession();
            renderExamQuestion();
        });

        document.getElementById('examPrev').disabled = currentIndex === 0;
    }

    document.getElementById('examPrev').addEventListener('click', () => {
        if (currentIndex > 0) { currentIndex--; saveSession(); renderExamQuestion(); }
    });

    document.getElementById('examNext').addEventListener('click', () => {
        if (currentIndex < currentQuestions.length - 1) { currentIndex++; saveSession(); renderExamQuestion(); }
    });

    document.getElementById('examSubmit').addEventListener('click', () => {
        const answered = Object.keys(userAnswers).length;
        if (answered < currentQuestions.length) {
            if (!confirm(`Vous avez répondu à ${answered}/${currentQuestions.length} questions. Terminer quand même ?`)) return;
        }
        finishExam();
    });

    function finishExam() {
        clearInterval(timerInterval);
        clearSession();
        showResults();
    }

    // ─── Training Mode ───────────────────────────────────────────────────
    let trainingRevealed = false;

    function renderTrainingQuestion() {
        trainingRevealed = false;
        const q = currentQuestions[currentIndex];
        const container = document.getElementById('trainQuestion');
        container.innerHTML = buildQuestionHTML(q, userAnswers[currentIndex], false);
        
        document.getElementById('trainProgress').textContent = `${currentIndex + 1}/${currentQuestions.length}`;
        document.getElementById('trainProgressBar').style.width = `${((currentIndex + 1) / currentQuestions.length) * 100}%`;
        document.getElementById('trainScore').textContent = trainTotal > 0 ? `Score: ${trainCorrect}/${trainTotal} (${Math.round((trainCorrect/trainTotal)*100)}%)` : `Score: 0/0`;

        const feedback = document.getElementById('trainFeedback');
        feedback.classList.add('hidden');
        feedback.className = 'feedback hidden';

        document.getElementById('trainCheck').disabled = false;
        document.getElementById('trainCheck').classList.remove('hidden');
        document.getElementById('trainNext').disabled = true;
        document.getElementById('trainNext').textContent = 'Suivant →';

        bindChoiceClicks(container, (letter) => {
            if (trainingRevealed) return;
            if (q.multiAnswer) {
                let current = userAnswers[currentIndex] || [];
                if (!Array.isArray(current)) current = [current];
                if (current.includes(letter)) {
                    current = current.filter(l => l !== letter);
                } else {
                    current.push(letter);
                    current.sort();
                }
                userAnswers[currentIndex] = current.length > 0 ? current : undefined;
            } else {
                userAnswers[currentIndex] = letter;
            }
            saveSession();
            // Re-render choices state
            const selectedLetters = Array.isArray(userAnswers[currentIndex]) ? userAnswers[currentIndex] : (userAnswers[currentIndex] ? [userAnswers[currentIndex]] : []);
            container.querySelectorAll('.choice').forEach(el => {
                el.classList.toggle('selected', selectedLetters.includes(el.dataset.letter));
            });
        });
    }

    document.getElementById('trainCheck').addEventListener('click', () => {
        if (userAnswers[currentIndex] === undefined) {
            alert('Sélectionnez une réponse d\'abord.');
            return;
        }
        revealTrainingAnswer();
    });

    function revealTrainingAnswer() {
        trainingRevealed = true;
        trainTotal++;
        const q = currentQuestions[currentIndex];
        const userAnswer = userAnswers[currentIndex];
        const userLetters = Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []);
        const correctLetters = q.correctAnswer ? q.correctAnswer.split('') : [];
        const isCorrect = userLetters.length === correctLetters.length && userLetters.every(l => correctLetters.includes(l));
        if (isCorrect) trainCorrect++;

        document.getElementById('trainScore').textContent = `Score: ${trainCorrect}/${trainTotal} (${Math.round((trainCorrect/trainTotal)*100)}%)`;

        const container = document.getElementById('trainQuestion');
        container.querySelectorAll('.choice').forEach(el => {
            el.style.pointerEvents = 'none';
            if (correctLetters.includes(el.dataset.letter)) el.classList.add('correct');
            if (userLetters.includes(el.dataset.letter) && !correctLetters.includes(el.dataset.letter)) el.classList.add('incorrect');
        });

        const feedback = document.getElementById('trainFeedback');
        feedback.classList.remove('hidden');
        feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        let html = `<div class="feedback-title">${isCorrect ? '✓ Correct !' : '✗ Incorrect'}</div>`;
        if (!isCorrect && q.correctAnswer) {
            html += `<div class="feedback-explanation">La bonne réponse est <strong>${q.correctAnswer}</strong>`;
            if (q.multiAnswer) {
                const correctTexts = correctLetters.map(l => {
                    const c = q.choices.find(ch => ch.letter === l);
                    return c ? `${l}. ${c.text}` : l;
                });
                html += `<ul style="margin-top:0.5rem;padding-left:1.2rem">${correctTexts.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>`;
            } else {
                const correctChoice = q.choices.find(c => c.letter === q.correctAnswer);
                if (correctChoice) html += ` : ${escapeHTML(correctChoice.text)}`;
            }
            html += `</div>`;
        } else if (!isCorrect && !q.correctAnswer) {
            html += `<div class="feedback-explanation">⚠️ Pas de réponse officielle disponible pour cette question. Consultez la discussion sur ExamTopics.</div>`;
        }
        
        // Show discussions
        if (q.explanation) {
            html += `<div class="feedback-discussion"><strong>💬 Discussion :</strong><p>${escapeHTML(q.explanation)}</p></div>`;
        } else if (q.discussions && q.discussions.length > 0) {
            html += `<div class="feedback-discussion"><strong>💬 Discussions :</strong>`;
            for (const d of q.discussions.slice(0, 3)) {
                html += `<div class="discussion-entry">`;
                if (d.user) html += `<span class="discussion-user">${escapeHTML(d.user)}</span> `;
                if (d.time) html += `<span class="discussion-time">${escapeHTML(d.time)}</span>`;
                html += `<p>${escapeHTML(d.text)}</p></div>`;
            }
            html += `</div>`;
        } else {
            html += `<div class="feedback-discussion"><em>Pas de discussion disponible. Relancez le téléchargement avec les commentaires (-c) pour les obtenir.</em></div>`;
        }
        
        if (q.link) {
            html += `<div style="margin-top:0.75rem"><a href="${q.link}" target="_blank" style="color:var(--primary)">🔗 Voir la discussion complète sur ExamTopics →</a></div>`;
        }
        feedback.innerHTML = html;

        document.getElementById('trainCheck').classList.add('hidden');
        document.getElementById('trainNext').disabled = false;
        if (currentIndex >= currentQuestions.length - 1) {
            document.getElementById('trainNext').textContent = 'Voir les résultats';
        }
    }

    document.getElementById('trainNext').addEventListener('click', () => {
        if (currentIndex < currentQuestions.length - 1) {
            currentIndex++;
            saveSession();
            renderTrainingQuestion();
        } else {
            showResults();
        }
    });

    document.getElementById('trainQuit').addEventListener('click', () => {
        if (confirm('Quitter l\'entraînement ?')) showResults();
    });

    // ─── Question HTML ───────────────────────────────────────────────────
    function buildQuestionHTML(question, selectedAnswer, showCorrect) {
        const isMulti = question.multiAnswer;
        const selectedLetters = Array.isArray(selectedAnswer) ? selectedAnswer : (selectedAnswer ? [selectedAnswer] : []);
        const correctLetters = question.correctAnswer ? question.correctAnswer.split('') : [];
        
        let html = `<div class="question-meta">
            <span class="question-id">Topic ${question.topic} — Question #${question.number}</span>`;
        if (question.link) {
            html += `<span class="question-link"><a href="${question.link}" target="_blank">🔗 Voir sur ExamTopics</a></span>`;
        }
        html += `</div>`;
        if (isMulti) {
            html += `<div class="multi-answer-hint">⚠️ Sélectionnez ${question.expectedCount} réponses</div>`;
        }
        html += `<div class="question-text">${escapeHTML(question.text)}</div>`;
        html += `<div class="choices">`;
        
        for (const choice of question.choices) {
            let classes = 'choice';
            if (selectedLetters.includes(choice.letter)) classes += ' selected';
            if (showCorrect && correctLetters.includes(choice.letter)) classes += ' correct';
            if (showCorrect && selectedLetters.includes(choice.letter) && !correctLetters.includes(choice.letter)) classes += ' incorrect';
            
            html += `<div class="${classes}" data-letter="${choice.letter}">
                <span class="choice-letter">${choice.letter}</span>
                <span class="choice-text">${escapeHTML(choice.text)}</span>
            </div>`;
        }
        html += `</div>`;
        return html;
    }

    function bindChoiceClicks(container, callback) {
        container.querySelectorAll('.choice').forEach(el => {
            el.addEventListener('click', () => callback(el.dataset.letter));
        });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── History ───────────────────────────────────────────────────────────
    function saveToHistory(correct, incorrect, unanswered, total, score) {
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        const rangeType = document.querySelector('input[name="questionRange"]:checked')?.value || 'all';
        
        let rangeDesc = 'Toutes';
        if (rangeType === 'last') rangeDesc = `${document.getElementById('rangeN')?.value || '?'} dernières`;
        else if (rangeType === 'first') rangeDesc = `${document.getElementById('rangeN')?.value || '?'} premières`;
        else if (rangeType === 'range') rangeDesc = `Q${document.getElementById('rangeFrom')?.value || '?'}–${document.getElementById('rangeTo')?.value || '?'}`;

        history.unshift({
            date: new Date().toISOString(),
            exam: currentExamName,
            mode: mode === 'exam' ? 'Examen' : 'Entraînement',
            total,
            correct,
            incorrect,
            unanswered,
            score,
            range: rangeDesc,
            shuffled: mode === 'exam' ? document.getElementById('examShuffle')?.checked : document.getElementById('trainShuffle')?.checked
        });

        // Keep last 50 entries
        if (history.length > 50) history.length = 50;
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    function renderHistory() {
        const container = document.getElementById('historyList');
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');

        if (history.length === 0) {
            container.innerHTML = '<p class="history-empty">Aucune session enregistrée. Lancez un quiz pour commencer !</p>';
            return;
        }

        let html = `<div class="history-header-row">
            <span>Date</span><span>Exam</span><span>Mode</span><span>Questions</span><span>Score</span><span>Plage</span>
        </div>`;

        for (const entry of history.slice(0, 20)) {
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const scoreClass = entry.score >= 80 ? 'good' : entry.score >= 60 ? 'medium' : 'bad';
            
            html += `<div class="history-row">
                <span class="history-date">${dateStr} ${timeStr}</span>
                <span class="history-exam">${escapeHTML(entry.exam)}</span>
                <span class="history-mode">${entry.mode}</span>
                <span class="history-questions">${entry.correct}/${entry.total} ${entry.shuffled ? '🔀' : ''}</span>
                <span class="history-score ${scoreClass}">${entry.score}%</span>
                <span class="history-range">${entry.range}</span>
            </div>`;
        }

        if (history.length > 0) {
            html += `<button class="btn btn-sm btn-link" id="clearHistory">🗑️ Effacer l'historique</button>`;
        }

        container.innerHTML = html;

        document.getElementById('clearHistory')?.addEventListener('click', () => {
            if (confirm('Effacer tout l\'historique ?')) {
                localStorage.removeItem('quizHistory');
                renderHistory();
            }
        });
    }

    // ─── Results ─────────────────────────────────────────────────────────
    function showResults() {
        clearInterval(timerInterval);
        clearSession();
        
        let correct = 0, incorrect = 0, unanswered = 0;
        currentQuestions.forEach((q, i) => {
            const answer = userAnswers[i];
            const userLetters = Array.isArray(answer) ? answer : (answer ? [answer] : []);
            const correctLetters = q.correctAnswer ? q.correctAnswer.split('') : [];
            if (userLetters.length === 0) unanswered++;
            else if (userLetters.length === correctLetters.length && userLetters.every(l => correctLetters.includes(l))) correct++;
            else incorrect++;
        });

        const total = currentQuestions.length;
        const score = Math.round((correct / total) * 100);

        // Save to history
        saveToHistory(correct, incorrect, unanswered, total, score);

        document.getElementById('resultsTitle').textContent = mode === 'exam' ? '📊 Résultats de l\'examen' : '📊 Résultats de l\'entraînement';
        
        document.getElementById('resultsSummary').innerHTML = `
            <div class="result-card score"><div class="value">${score}%</div><div class="label">Score</div></div>
            <div class="result-card correct-count"><div class="value">${correct}</div><div class="label">Correctes</div></div>
            <div class="result-card incorrect-count"><div class="value">${incorrect}</div><div class="label">Incorrectes</div></div>
            <div class="result-card"><div class="value">${unanswered}</div><div class="label">Sans réponse</div></div>
        `;

        document.getElementById('resultsDetails').innerHTML = `
            <h2>Détail des questions</h2>
            <div class="filter-tabs">
                <button class="filter-tab active" data-filter="all">Toutes (${total})</button>
                <button class="filter-tab" data-filter="correct">Correctes (${correct})</button>
                <button class="filter-tab" data-filter="incorrect">Incorrectes (${incorrect + unanswered})</button>
            </div>
            <div id="resultsList"></div>
        `;

        renderResultsList('all');

        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderResultsList(tab.dataset.filter);
            });
        });

        showScreen('results');
    }

    function renderResultsList(filter) {
        const list = document.getElementById('resultsList');
        let html = '';

        currentQuestions.forEach((q, i) => {
            const answer = userAnswers[i];
            const userLetters = Array.isArray(answer) ? answer : (answer ? [answer] : []);
            const correctLetters = q.correctAnswer ? q.correctAnswer.split('') : [];
            const isCorrect = userLetters.length === correctLetters.length && userLetters.every(l => correctLetters.includes(l));
            if (filter === 'correct' && !isCorrect) return;
            if (filter === 'incorrect' && isCorrect) return;

            // Full question text
            html += `<div class="result-question ${isCorrect ? 'is-correct' : 'is-incorrect'}">
                <div class="result-question-header">
                    <span>Topic ${q.topic} — Question #${q.number}</span>
                    <span class="badge ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                </div>
                <div class="result-question-text-full">${escapeHTML(q.text)}</div>
                <div class="result-choices">`;
            
            // Show all choices with correct/incorrect highlighting
            for (const choice of q.choices) {
                let cls = 'result-choice';
                if (correctLetters.includes(choice.letter)) cls += ' correct';
                if (userLetters.includes(choice.letter) && !correctLetters.includes(choice.letter)) cls += ' incorrect';
                if (userLetters.includes(choice.letter) && correctLetters.includes(choice.letter)) cls += ' correct';
                const isUserPick = userLetters.includes(choice.letter);
                html += `<div class="${cls}">
                    <span class="result-choice-letter">${choice.letter}</span>
                    <span class="result-choice-text">${escapeHTML(choice.text)}</span>
                    ${isUserPick ? '<span class="result-choice-tag your-pick">← Votre réponse</span>' : ''}
                    ${correctLetters.includes(choice.letter) && !isUserPick ? '<span class="result-choice-tag correct-tag">← Bonne réponse</span>' : ''}
                </div>`;
            }
            html += `</div>`;

            if (q.explanation) html += `<div class="result-explanation">${escapeHTML(q.explanation.substring(0, 500))}${q.explanation.length > 500 ? '...' : ''}</div>`;
            if (q.link) html += `<div class="result-link"><a href="${q.link}" target="_blank">🔗 Voir la discussion sur ExamTopics</a></div>`;
            html += `</div>`;
        });

        list.innerHTML = html || '<p style="color:var(--text-muted);text-align:center;">Aucune question dans cette catégorie.</p>';
    }

    function getChoiceText(question, letter) {
        const choice = question.choices.find(c => c.letter === letter);
        return choice ? choice.text : '';
    }

    // ─── Results Actions ─────────────────────────────────────────────────
    document.getElementById('backToMenu').addEventListener('click', () => showModeSelect());
    document.getElementById('backToMenuTop').addEventListener('click', () => showModeSelect());

    document.getElementById('retryExam').addEventListener('click', () => {
        userAnswers = {};
        currentIndex = 0;
        trainCorrect = 0;
        trainTotal = 0;
        if (mode === 'exam') {
            timeRemaining = (parseInt(document.getElementById('examTime').value) || 30) * 60;
            showScreen('exam');
            renderExamQuestion();
            startTimer();
        } else {
            showScreen('training');
            renderTrainingQuestion();
        }
    });

    // ─── Keyboard shortcuts ──────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        // Exam mode shortcuts
        if (screens.exam.classList.contains('active')) {
            if (e.key === 'ArrowRight') document.getElementById('examNext').click();
            if (e.key === 'ArrowLeft') document.getElementById('examPrev').click();
            if (['a','b','c','d','e','f'].includes(e.key.toLowerCase())) {
                const letter = e.key.toUpperCase();
                const choice = document.querySelector(`#examQuestion .choice[data-letter="${letter}"]`);
                if (choice) choice.click();
            }
        }
        // Training mode shortcuts
        if (screens.training.classList.contains('active')) {
            if (e.key === 'Enter') {
                if (!trainingRevealed) document.getElementById('trainCheck').click();
                else document.getElementById('trainNext').click();
            }
            if (['a','b','c','d','e','f'].includes(e.key.toLowerCase()) && !trainingRevealed) {
                const letter = e.key.toUpperCase();
                const choice = document.querySelector(`#trainQuestion .choice[data-letter="${letter}"]`);
                if (choice) choice.click();
            }
        }
    });

    // ─── Session Persistence ─────────────────────────────────────────────
    function saveSession() {
        const state = {
            mode,
            currentQuestions,
            currentIndex,
            userAnswers,
            timeRemaining,
            trainCorrect,
            trainTotal,
            currentExamName,
            allQuestions
        };
        sessionStorage.setItem('examSession', JSON.stringify(state));
    }

    function clearSession() {
        sessionStorage.removeItem('examSession');
    }

    function restoreSession() {
        const saved = sessionStorage.getItem('examSession');
        if (!saved) return false;

        try {
            const state = JSON.parse(saved);
            if (!state.mode || !state.currentQuestions || state.currentQuestions.length === 0) return false;

            mode = state.mode;
            currentQuestions = state.currentQuestions;
            currentIndex = state.currentIndex;
            userAnswers = state.userAnswers;
            timeRemaining = state.timeRemaining;
            trainCorrect = state.trainCorrect;
            trainTotal = state.trainTotal;
            currentExamName = state.currentExamName;
            allQuestions = state.allQuestions;

            if (mode === 'exam') {
                showScreen('exam');
                renderExamQuestion();
                startTimer();
            } else if (mode === 'training') {
                showScreen('training');
                renderTrainingQuestion();
            }
            return true;
        } catch {
            clearSession();
            return false;
        }
    }

    // ─── Init ────────────────────────────────────────────────────────────
    if (!restoreSession()) {
        loadLibrary();
        renderHistory();
    }

})();

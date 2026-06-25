/**
 * Parser for examtopics-downloader markdown output.
 * Handles both legacy and new formats produced by
 * https://github.com/thatonecodes/examtopics-downloader
 *
 * Legacy format:
 *   ## Exam X topic 1 question 5 discussion
 *   Question #: 5  /  Topic #: 1
 *   A. choice text
 *   **Answer: C**
 *
 * New format:
 *   ## Examtopics X_NN question #1
 *   **A:** choice text
 *   **Answer: C**
 *   Comments: [user] Selected Answer: C ...
 */

function parseExamTopicsMarkdown(content) {
    const questions = [];
    const blocks = content.split(/^-{3,}$/m).filter(b => b.trim());
    for (const block of blocks) {
        const q = parseQuestionBlock(block.trim());
        if (q) questions.push(q);
    }
    return questions;
}

function parseQuestionBlock(block) {
    const lines = block.split('\n');

    // ─── Question & topic numbers (both formats) ──────────────────────
    const questionNumMatch =
        block.match(/Question\s*#:\s*(\d+)/i) ||      // legacy
        block.match(/question\s*#\s*(\d+)/i);          // new "question #1"
    const topicNumMatch = block.match(/Topic\s*#:\s*(\d+)/i);
    const headerMatch = block.match(/##\s*(.+?)(?:\n|$)/);

    // ─── Extract choices (both formats) ───────────────────────────────
    // Legacy: "A. text"   New: "**A:** text"
    const choices = [];
    let firstChoiceIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const m = line.match(/^\*\*([A-F])[.:]?\*\*[:.]?\s*(.+)/) ||  // **A:** **A.** **A**
                  line.match(/^([A-F])[.:]\s+(.+)/);                   // A. or A:
        if (m) {
            choices.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
            if (firstChoiceIdx === -1) firstChoiceIdx = i;
        }
    }

    if (choices.length === 0) return null;

    // ─── Question text (everything before the first choice) ───────────
    let questionStartIdx = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^\[All\s+.*Questions\]/i)) { questionStartIdx = i + 1; break; }
        if (line.match(/Topic\s*#:\s*\d+/i)) { questionStartIdx = i + 1; }
        if (line.match(/^##\s*Examtopics/i)) { questionStartIdx = i + 1; }
    }

    let questionText = '';
    if (firstChoiceIdx > questionStartIdx) {
        questionText = lines.slice(questionStartIdx, firstChoiceIdx)
            .map(l => l.trim())
            .filter(l => l &&
                !l.match(/^Suggested Answer:/i) &&
                !l.match(/^🗳️$/) &&
                !l.match(/^\*\*Answer:/i) &&
                !l.match(/^Question\s*#/i) &&
                !l.match(/^Topic\s*#/i))
            .join('\n').trim();
    }
    questionText = questionText.replace(/Suggested Answer:\s*[A-F]+\s*🗳️?\s*/gi, '').trim();

    // ─── Correct answer ───────────────────────────────────────────────
    let correctAnswer = '';
    let answerConfidence = 0; // 0=unknown, 1=low(community few votes), 2=high(official or many votes)

    const answerMatch =
        block.match(/\*\*Answer:\s*([A-F]+)\*\*/i) ||
        block.match(/Suggested Answer:\s*([A-F]+)/i);
    if (answerMatch) {
        correctAnswer = answerMatch[1].toUpperCase();
        answerConfidence = 2; // official
    }

    // Fallback: community consensus - the answer whose single most-upvoted comment wins
    if (!correctAnswer) {
        // Track the MAX upvotes of any single comment per answer (ExamTopics convention:
        // the "Highly Voted" comment indicates the answer, not the sum across comments)
        const maxVotes = {};   // answer -> highest single-comment upvotes
        const commentCount = {}; // answer -> number of comments (tiebreaker)
        const legacyVotes = [...block.matchAll(/Selected Answer:\s*([A-F]+)[^]*?upvoted\s+(\d+)\s+times/gi)];
        for (const m of legacyVotes) {
            const ans = m[1].toUpperCase();
            const v = parseInt(m[2]);
            maxVotes[ans] = Math.max(maxVotes[ans] || 0, v);
            commentCount[ans] = (commentCount[ans] || 0) + 1;
        }

        // New format without vote counts: just count occurrences
        if (Object.keys(maxVotes).length === 0) {
            const simpleSelections = [...block.matchAll(/Selected Answer:\s*([A-F]+)/gi)];
            for (const m of simpleSelections) {
                const ans = m[1].toUpperCase();
                commentCount[ans] = (commentCount[ans] || 0) + 1;
                maxVotes[ans] = 0;
            }
        }

        if (Object.keys(maxVotes).length > 0) {
            // Sort by: highest single-comment upvotes, then by comment count
            const sorted = Object.keys(maxVotes).sort((a, b) => {
                if (maxVotes[b] !== maxVotes[a]) return maxVotes[b] - maxVotes[a];
                return (commentCount[b] || 0) - (commentCount[a] || 0);
            });
            correctAnswer = sorted[0];
            const topVotes = maxVotes[correctAnswer];
            answerConfidence = topVotes >= 5 ? 2 : 1;
        }

        if (!correctAnswer) {
            const m = block.match(/(?:correct answer|the answer)\s*(?:is|should be|:)\s*([A-F]+)\b/i);
            if (m) { correctAnswer = m[1].toUpperCase(); answerConfidence = 1; }
        }
    }

    // ─── Multi-answer detection ───────────────────────────────────────
    // 1) From the question text: "(Choose two.)" "(Choose three.)" etc.
    const chooseMatch = questionText.match(/\(Choose\s+(\w+)\.?\)/i);
    let expectedCount = 1;
    if (chooseMatch) {
        const words = { two: 2, three: 3, four: 4, five: 5, '2': 2, '3': 3, '4': 4 };
        expectedCount = words[chooseMatch[1].toLowerCase()] || parseInt(chooseMatch[1]) || 1;
    } else if (correctAnswer.length > 1) {
        expectedCount = correctAnswer.length;
    }
    const multiAnswer = expectedCount > 1;

    // ─── ExamTopics link ──────────────────────────────────────────────
    let link = '';
    const linkMatch =
        block.match(/\[View on ExamTopics\]\((https:\/\/[^\)]+)\)/) ||
        block.match(/(https:\/\/www\.examtopics\.com\/discussions\/[^\s\)]+)/);
    if (linkMatch) link = linkMatch[1];

    // ─── Timestamp ────────────────────────────────────────────────────
    let timestamp = '';
    const tsMatch = block.match(/\*\*Timestamp:\s*(.+?)\*\*/);
    if (tsMatch) timestamp = tsMatch[1].trim();

    // ─── Discussions / comments ───────────────────────────────────────
    let discussions = [];
    let explanation = '';

    const commentsMatch = block.match(/Comments:\s*([\s\S]+?)(?=\n-{3,}|$)/i);
    if (commentsMatch) {
        const txt = commentsMatch[1];

        // New format: "[user] Selected Answer: C explanation text [user2] ..."
        const newComments = [...txt.matchAll(/\[([^\]]+)\]\s*(?:Selected Answer:\s*([A-F]+))?\s*([^\[]*)/g)];
        for (const c of newComments) {
            const user = c[1];
            const sel = c[2] ? c[2].toUpperCase() : '';
            const body = (c[3] || '').trim();
            if (body.length > 10 || sel) {
                discussions.push({
                    user,
                    selectedAnswer: sel,
                    text: (sel ? `Réponse ${sel}. ` : '') + body.substring(0, 600)
                });
            }
        }

        // Legacy format: "user Highly Voted ... Selected Answer: C ... upvoted N times"
        if (discussions.length === 0) {
            const saRegex = /(\w+)\s+(?:Highly Voted|Most Recent)?\s*([\d]+\s+\w+(?:,\s*\d+\s+\w+)?\s+ago)\s*(?:Selected Answer:\s*([A-F]+))?\s*([\s\S]*?)upvoted\s+(\d+)\s+times/gi;
            let m;
            while ((m = saRegex.exec(txt)) !== null) {
                discussions.push({
                    user: m[1],
                    time: m[2].trim(),
                    selectedAnswer: m[3] ? m[3].toUpperCase() : '',
                    text: `${m[3] ? 'Réponse ' + m[3] + '. ' : ''}${m[4].trim()}`.substring(0, 600),
                    votes: parseInt(m[5])
                });
            }
            discussions.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        }

        if (discussions.length > 0) explanation = discussions[0].text;
    }

    const topicNum = topicNumMatch ? topicNumMatch[1] : '1';
    const questionNum = questionNumMatch ? questionNumMatch[1] : '?';
    const title = headerMatch ? headerMatch[1].trim() : `Question ${questionNum}`;

    return {
        id: `t${topicNum}q${questionNum}`,
        title,
        topic: topicNum,
        number: questionNum,
        text: questionText || title,
        choices,
        correctAnswer,
        answerConfidence,
        multiAnswer,
        expectedCount,
        link,
        timestamp,
        explanation,
        discussions
    };
}
